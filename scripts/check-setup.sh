#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         RETRO DEV PORTFOLIO - Setup Verification            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to check command existence
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2 found: $(command -v $1)"
        return 0
    else
        echo -e "${RED}✗${NC} $2 not found"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check file existence
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $2 missing"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check directory existence
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $2 missing"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

echo -e "${YELLOW}Checking System Requirements...${NC}"
echo "================================"

# Check for required commands
check_command "node" "Node.js"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  Version: $NODE_VERSION"
    # Check if version is >= 18
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1 | cut -dv -f2)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo -e "  ${YELLOW}⚠ Node.js version should be >= 18.0.0${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

check_command "npm" "npm"
if command -v npm &> /dev/null; then
    echo "  Version: $(npm --version)"
fi

check_command "python" "Python" || check_command "python3" "Python3"
if command -v python &> /dev/null || command -v python3 &> /dev/null; then
    PYTHON_CMD=$(command -v python3 || command -v python)
    echo "  Version: $($PYTHON_CMD --version)"
fi

check_command "git" "Git"
if command -v git &> /dev/null; then
    echo "  Version: $(git --version)"
fi

check_command "poetry" "Poetry (optional)"
if ! command -v poetry &> /dev/null; then
    echo -e "  ${YELLOW}ℹ Install with: curl -sSL https://install.python-poetry.org | python3 -${NC}"
fi

echo ""
echo -e "${YELLOW}Checking Project Structure...${NC}"
echo "=============================="

# Check critical files
check_file "index.html" "Main HTML file"
check_file "404.html" "404 page"
check_file "package.json" "NPM configuration"
check_file "pyproject.toml" "Poetry configuration"
check_file "Makefile" "Build configuration"
check_file "README.md" "Documentation"
check_file "DEVELOPMENT.md" "Dev documentation"
check_file ".gitignore" "Git ignore file"

# Check configuration files
echo ""
echo -e "${YELLOW}Checking Configuration Files...${NC}"
echo "================================"
check_file "eslint.config.js" "ESLint config"
check_file ".stylelintrc.json" "Stylelint config"
check_file ".prettierrc.json" "Prettier config"
check_file ".htmlhintrc" "HTMLHint config"
check_file ".editorconfig" "Editor config"
check_file "jest.config.js" "Jest config"

# Check directories
echo ""
echo -e "${YELLOW}Checking Directory Structure...${NC}"
echo "================================"
check_dir "src" "Source directory"
check_dir "src/js" "JavaScript directory"
check_dir "src/js/core" "Core modules"
check_dir "src/js/modules" "Feature modules"
check_dir "src/js/utils" "Utilities"
check_dir "src/styles" "Styles directory"
check_dir "src/styles/base" "Base styles"
check_dir "src/styles/components" "Component styles"
check_dir "src/styles/themes" "Theme styles"
check_dir "scripts" "Scripts directory"
check_dir "tests" "Tests directory"

# Check key source files
echo ""
echo -e "${YELLOW}Checking Key Source Files...${NC}"
echo "============================="
check_file "src/js/main.js" "Main JavaScript"
check_file "src/js/core/logger.js" "Logger module"
check_file "src/js/core/config.js" "Config module"
check_file "src/js/modules/terminal.js" "Terminal module"
check_file "src/styles/main.css" "Main stylesheet"

# Check if dependencies are installed
echo ""
echo -e "${YELLOW}Checking Dependencies...${NC}"
echo "========================"

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Node modules installed"
    # Count packages
    if [ -f "package-lock.json" ]; then
        PACKAGE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
        echo "  Packages: ~$PACKAGE_COUNT"
    fi
else
    echo -e "${YELLOW}⚠${NC} Node modules not installed"
    echo -e "  Run: ${CYAN}npm install${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f "poetry.lock" ]; then
    echo -e "${GREEN}✓${NC} Poetry lock file exists"
else
    echo -e "${YELLOW}⚠${NC} Poetry not initialized"
    echo -e "  Run: ${CYAN}poetry install${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check Git hooks
echo ""
echo -e "${YELLOW}Checking Git Hooks...${NC}"
echo "===================="
if [ -d ".husky" ]; then
    echo -e "${GREEN}✓${NC} Husky directory exists"
    if [ -f ".husky/pre-commit" ]; then
        echo -e "${GREEN}✓${NC} Pre-commit hook configured"
    else
        echo -e "${YELLOW}⚠${NC} Pre-commit hook missing"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} Husky not initialized"
    echo -e "  Run: ${CYAN}npx husky install${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Test server scripts
echo ""
echo -e "${YELLOW}Checking Server Scripts...${NC}"
echo "========================="
check_file "scripts/serve.sh" "Unix serve script"
check_file "scripts/serve.ps1" "Windows serve script"

# Check if scripts are executable
if [ -f "scripts/serve.sh" ]; then
    if [ -x "scripts/serve.sh" ]; then
        echo -e "${GREEN}✓${NC} serve.sh is executable"
    else
        echo -e "${YELLOW}⚠${NC} serve.sh is not executable"
        echo -e "  Run: ${CYAN}chmod +x scripts/serve.sh${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Summary
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                          SUMMARY                            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Your setup is complete.${NC}"
    echo ""
    echo -e "${CYAN}Quick Start Commands:${NC}"
    echo -e "  ${GREEN}make serve${NC}     - Start development server"
    echo -e "  ${GREEN}make lint${NC}      - Fix code issues"
    echo -e "  ${GREEN}make test${NC}      - Run tests"
    echo -e "  ${GREEN}make help${NC}      - Show all commands"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Setup complete with $WARNINGS warning(s)${NC}"
    echo ""
    echo -e "${CYAN}Recommended Actions:${NC}"
    if [ ! -d "node_modules" ]; then
        echo -e "  1. Run: ${GREEN}npm install${NC}"
    fi
    if [ ! -f "poetry.lock" ]; then
        echo -e "  2. Run: ${GREEN}poetry install${NC}"
    fi
    if [ ! -d ".husky" ]; then
        echo -e "  3. Run: ${GREEN}npx husky install${NC}"
    fi
else
    echo -e "${RED}✗ Setup incomplete: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo ""
    echo -e "${CYAN}Please fix the errors and run this check again.${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}Project: Retro Dev Portfolio v1.0.0${NC}"
echo -e "${CYAN}Ready to start developing! 🚀${NC}"