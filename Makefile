# Retro Dev Portfolio - Makefile
# Cross-platform build commands with graceful shutdown

# Force bash for shell commands (needed for conditionals on Windows)
SHELL := bash
.SHELLFLAGS := -c

# Variables (override like: make PORT=3000 serve)
PORT ?= 3000
BROWSER ?= default
NODE_ENV ?= development

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
WHITE := \033[1;37m
NC := \033[0m # No Color

.PHONY: help serve serve-https stop dev build lint lint-fix lint-check format test clean install deps check audit lighthouse validate all debug

# Default target
.DEFAULT_GOAL := help

help:
	@echo "$(CYAN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║$(WHITE)         RETRO DEV PORTFOLIO - Development Commands          $(CYAN)║$(NC)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)📦 Setup & Dependencies:$(NC)"
	@echo "  $(GREEN)make install$(NC)     - Install all dependencies (npm + poetry)"
	@echo "  $(GREEN)make deps$(NC)        - Quick dependency check and install"
	@echo ""
	@echo "$(YELLOW)🚀 Development:$(NC)"
	@echo "  $(GREEN)make serve$(NC)       - Start HTTPS dev server (PORT=$(PORT))"
	@echo "  $(GREEN)make serve-https$(NC) - Start HTTPS dev server (for mobile testing)"
	@echo "  $(GREEN)make debug$(NC)       - Start server with debug mode enabled"
	@echo "  $(GREEN)make dev$(NC)         - Start server in background (PORT=$(PORT))"
	@echo "  $(GREEN)make stop$(NC)        - Stop the background server"
	@echo "  $(GREEN)make status$(NC)      - Check if server is running"
	@echo ""
	@echo "$(YELLOW)🧹 Code Quality:$(NC)"
	@echo "  $(GREEN)make lint$(NC)        - Run all linters and auto-fix issues"
	@echo "  $(GREEN)make lint-check$(NC)  - Check code without fixing (for CI)"
	@echo "  $(GREEN)make format$(NC)      - Format all code with Prettier"
	@echo "  $(GREEN)make validate$(NC)    - Run full validation suite"
	@echo ""
	@echo "$(YELLOW)🧪 Testing:$(NC)"
	@echo "  $(GREEN)make test$(NC)        - Run all tests with coverage"
	@echo "  $(GREEN)make check$(NC)       - Quick file structure check"
	@echo "  $(GREEN)make lighthouse$(NC)  - Run Lighthouse performance audit"
	@echo "  $(GREEN)make audit$(NC)       - Security audit of dependencies"
	@echo ""
	@echo "$(YELLOW)🏗️ Build & Deploy:$(NC)"
	@echo "  $(GREEN)make build$(NC)       - Production build"
	@echo "  $(GREEN)make clean$(NC)       - Remove generated files"
	@echo ""
	@echo "$(CYAN)Options:$(NC)"
	@echo "  PORT=3000        - Server port (default: 3000)"
	@echo "  BROWSER=chrome   - Browser to open (default/chrome/firefox)"
	@echo ""

# ==================== SETUP ====================

install:
	@echo "$(YELLOW)Installing all dependencies...$(NC)"
	@# Check for Node.js
	@if ! command -v node &> /dev/null; then \
		echo "$(RED)❌ Node.js is not installed. Please install Node.js first.$(NC)"; \
		exit 1; \
	fi
	@# Check for Python
	@if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then \
		echo "$(RED)❌ Python is not installed. Please install Python first.$(NC)"; \
		exit 1; \
	fi
	@# Install npm dependencies
	@echo "$(CYAN)📦 Installing npm dependencies...$(NC)"
	@npm install
	@# Check for Poetry and install if needed
	@if ! command -v poetry &> /dev/null; then \
		echo "$(CYAN)📦 Installing Poetry...$(NC)"; \
		curl -sSL https://install.python-poetry.org | python3 - || \
		pip install poetry; \
	fi
	@# Install Python dependencies
	@echo "$(CYAN)📦 Installing Python dependencies...$(NC)"
	@poetry install
	@# Install husky hooks
	@echo "$(CYAN)🪝 Setting up Git hooks...$(NC)"
	@npx husky install
	@echo "$(GREEN)✅ All dependencies installed successfully!$(NC)"

deps:
	@echo "$(YELLOW)Checking dependencies...$(NC)"
	@if [ ! -d "node_modules" ]; then \
		echo "$(CYAN)Installing npm packages...$(NC)"; \
		npm install; \
	else \
		echo "$(GREEN)✓ npm packages already installed$(NC)"; \
	fi
	@if [ ! -f "poetry.lock" ]; then \
		echo "$(CYAN)Installing Python packages...$(NC)"; \
		poetry install; \
	else \
		echo "$(GREEN)✓ Python packages already installed$(NC)"; \
	fi

# ==================== DEVELOPMENT ====================

serve:
	@python scripts/https_server.py --port $(PORT)

debug:
	@echo "Starting server in debug mode at http://localhost:$(PORT)?debug=true..."
	@python -c "import webbrowser; webbrowser.open('http://localhost:$(PORT)?debug=true')"
	@python -m http.server $(PORT)

dev:
	@echo "Starting server in background at http://localhost:$(PORT)..."
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts\serve.ps1 start $(PORT)

stop:
	@echo "Stopping server..."
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts\serve.ps1 stop

status:
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts\serve.ps1 status

# ==================== CODE QUALITY ====================

lint: lint-fix
	@echo "$(GREEN)✅ Linting complete!$(NC)"

lint-fix:
	@echo "$(YELLOW)🧹 Running linters and auto-fixing issues...$(NC)"
	@echo ""
	@echo "$(CYAN)1) ESLint - JavaScript...$(NC)"
	@-npx eslint 'src/**/*.js' --fix
	@echo ""
	@echo "$(CYAN)2) Stylelint - CSS...$(NC)"
	@-npx stylelint 'src/**/*.css' --fix
	@echo ""
	@echo "$(CYAN)3) Prettier - Formatting...$(NC)"
	@npx prettier --write .
	@echo ""
	@echo "$(CYAN)4) HTMLHint - HTML validation...$(NC)"
	@-npx htmlhint '*.html'

lint-check:
	@echo "$(YELLOW)🔍 Checking code quality (no auto-fix)...$(NC)"
	@npx eslint 'src/**/*.js'
	@npx stylelint 'src/**/*.css'
	@npx prettier --check .
	@npx htmlhint '*.html'

format:
	@echo "$(YELLOW)💅 Formatting all code...$(NC)"
	@npx prettier --write .
	@echo "$(GREEN)✅ Formatting complete!$(NC)"

# ==================== TESTING ====================

test:
	@echo "$(YELLOW)🧪 Running tests...$(NC)"
	@if [ -f "jest.config.js" ]; then \
		npm test; \
	else \
		echo "$(YELLOW)⚠️  No tests configured yet$(NC)"; \
	fi

check:
	@echo "$(YELLOW)🔍 Running comprehensive project check...$(NC)"
	@if [ -f scripts/check-setup.sh ]; then \
		bash scripts/check-setup.sh; \
	else \
		echo "$(YELLOW)Using basic checks...$(NC)"; \
		test -f index.html || (echo "$(RED)❌ Missing: index.html$(NC)" && exit 1); \
		test -f 404.html || (echo "$(RED)❌ Missing: 404.html$(NC)" && exit 1); \
		test -d src/styles || (echo "$(RED)❌ Missing: src/styles/$(NC)" && exit 1); \
		test -f src/styles/main.css || (echo "$(RED)❌ Missing: src/styles/main.css$(NC)" && exit 1); \
		test -d src/js || (echo "$(RED)❌ Missing: src/js/$(NC)" && exit 1); \
		test -f src/js/main.js || (echo "$(RED)❌ Missing: src/js/main.js$(NC)" && exit 1); \
		test -f package.json || (echo "$(RED)❌ Missing: package.json$(NC)" && exit 1); \
		test -f eslint.config.js || (echo "$(RED)❌ Missing: eslint.config.js$(NC)" && exit 1); \
		echo "$(GREEN)✅ Basic checks passed$(NC)"; \
	fi

lighthouse:
	@echo "$(YELLOW)🏃 Running Lighthouse audit...$(NC)"
	@echo "$(CYAN)Starting temporary server for audit...$(NC)"
	@# Start server in background
	@python -m http.server $(PORT) > /dev/null 2>&1 &
	@SERVER_PID=$$!; \
	sleep 2; \
	echo "$(CYAN)Running Lighthouse...$(NC)"; \
	npx lighthouse http://localhost:$(PORT) \
		--output html \
		--output-path ./lighthouse-report.html \
		--chrome-flags="--headless" || true; \
	kill $$SERVER_PID 2>/dev/null || true
	@echo "$(GREEN)✅ Report saved to lighthouse-report.html$(NC)"

audit:
	@echo "$(YELLOW)🔒 Running security audit...$(NC)"
	@npm audit
	@echo ""
	@echo "$(CYAN)Checking Python dependencies...$(NC)"
	@poetry run pip-audit || echo "$(YELLOW)Install pip-audit: poetry add --group dev pip-audit$(NC)"

# ==================== BUILD & DEPLOY ====================

build:
	@echo "$(YELLOW)🏗️  Building for production...$(NC)"
	@# Run validation first
	@$(MAKE) validate
	@# Minify if tools are available
	@if command -v terser &> /dev/null; then \
		echo "$(CYAN)Minifying JavaScript...$(NC)"; \
		for file in src/js/**/*.js; do \
			terser "$$file" -o "$$file" --compress --mangle; \
		done; \
	fi
	@echo "$(GREEN)✅ Build complete!$(NC)"

clean:
	@echo "$(YELLOW)🧹 Cleaning generated files...$(NC)"
	@rm -rf node_modules
	@rm -rf .pytest_cache
	@rm -rf coverage
	@rm -rf lighthouse-report.html
	@rm -f .DS_Store
	@find . -name "*.pyc" -delete 2>/dev/null || true
	@find . -name "__pycache__" -type d -delete 2>/dev/null || true
	@find . -name ".DS_Store" -delete 2>/dev/null || true
	@find . -name "Thumbs.db" -delete 2>/dev/null || true
	@echo "$(GREEN)✅ Cleaned successfully$(NC)"

# ==================== VALIDATION ====================

validate: deps
	@echo "$(YELLOW)✨ Running full validation suite...$(NC)"
	@echo ""
	@$(MAKE) check
	@echo ""
	@$(MAKE) lint-check
	@echo ""
	@$(MAKE) test
	@echo ""
	@echo "$(GREEN)✅ All validations passed!$(NC)"

# ==================== COMPOUND COMMANDS ====================

all: install validate serve
	@echo "$(GREEN)✅ Full setup and launch complete!$(NC)"

# ==================== QUICK ALIASES ====================

s: serve
d: dev
l: lint
t: test
c: clean
v: validate