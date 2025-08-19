# 🛠️ Development Guide

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Development Workflow](#development-workflow)
- [Code Quality](#code-quality)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)

## 📦 Prerequisites

### Required Software

- **Node.js** >= 18.0.0 (with npm >= 9.0.0)
- **Python** >= 3.9 (for Poetry and linting tools)
- **Git** >= 2.30.0
- **Poetry** (Python dependency manager)

### Optional but Recommended

- **VS Code** with extensions:
    - ESLint
    - Stylelint
    - Prettier
    - Live Server
    - GitLens

## 🚀 Setup

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/wagner-austin/retro-dev-portfolio.git
cd retro-dev-portfolio

# Install all dependencies (npm + poetry)
make install

# Or manually:
npm install
poetry install
npx husky install
```

### Quick Start

```bash
# Start development server with auto-open browser
make serve

# Or run in development mode with file watching
make dev
```

## 💻 Development Workflow

### Available Make Commands

```bash
make help        # Show all available commands
make serve       # Start server with browser auto-open (graceful shutdown)
make dev         # Development mode with file watching
make lint        # Auto-fix all linting issues
make test        # Run test suite
make validate    # Full validation (lint + test + check)
make clean       # Remove generated files
```

### Server Management

The development server includes:

- **Automatic browser opening** when server starts
- **Graceful shutdown** on Ctrl+C
- **Port configuration**: `make serve PORT=8080`
- **Colored output** for better readability

### File Watching

In development mode (`make dev`), the server will:

- Auto-reload on file changes
- Show detailed logging
- Enable debug mode features

## 🧹 Code Quality

### Linting Tools

#### JavaScript (ESLint)

```bash
# Auto-fix issues
npm run lint:js

# Check only
npx eslint src/**/*.js
```

**Key Rules:**

- ES6+ modules required
- Max 100 lines per function
- Max nesting depth: 4
- No console.log in production
- Strict equality (`===`)

#### CSS (Stylelint)

```bash
# Auto-fix issues
npm run lint:css

# Check only
npx stylelint src/**/*.css
```

**Key Rules:**

- BEM naming convention
- Property order enforced
- Max nesting: 4 levels
- No vendor prefixes
- Color format: hex long (#ffffff)

#### HTML (HTMLHint)

```bash
# Check HTML files
npx htmlhint *.html
```

### Code Formatting (Prettier)

```bash
# Format all files
make format
# or
npm run format

# Check formatting
npm run format:check
```

**Configuration:**

- Print width: 100
- Tab width: 4
- Single quotes for JS
- Trailing commas (ES5)

### Pre-commit Hooks

Automatically runs on `git commit`:

1. Lint-staged (format changed files)
2. ESLint fixes
3. Stylelint fixes
4. Prettier formatting
5. HTML validation

To bypass (emergency only):

```bash
git commit --no-verify
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests with coverage
make test

# Watch mode
npm run test:watch

# Specific test file
npx jest tests/logger.test.js
```

### Test Structure

```
tests/
├── setup.js           # Jest configuration
├── __mocks__/         # Mock files
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

### Writing Tests

```javascript
// Example test
import { Logger } from '../src/js/core/logger.js';

describe('Logger', () => {
    it('should log messages', () => {
        const logger = new Logger('Test');
        expect(logger.context).toBe('Test');
    });
});
```

### Coverage Requirements

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## 📁 Project Structure

```
retro-dev-portfolio/
├── src/
│   ├── js/
│   │   ├── core/         # Core utilities
│   │   │   ├── logger.js     # Logging system
│   │   │   ├── debugger.js   # Debug utilities
│   │   │   └── config.js     # Configuration
│   │   ├── modules/      # Feature modules
│   │   │   ├── terminal.js   # Terminal emulator
│   │   │   ├── theme.js      # Theme manager
│   │   │   ├── audio.js      # Sound system
│   │   │   └── animations.js # Animation engine
│   │   ├── utils/        # Helper functions
│   │   └── main.js       # Entry point
│   └── styles/
│       ├── base/         # Reset, variables
│       ├── components/   # Component styles
│       ├── layouts/      # Layout patterns
│       └── themes/       # Theme variations
├── tests/                # Test files
├── docs/                 # Documentation
└── .github/             # GitHub Actions
```

## 🐛 Debugging

### Debug Mode

Enable debug mode in multiple ways:

1. **URL Parameter**: `http://localhost:3000?debug=true`
2. **Keyboard Shortcut**: `Ctrl+Shift+D`
3. **Console**: `app.debugger.enable()`

### Debug Features

- Performance stats overlay
- Console logging panel
- Network monitoring
- Memory usage tracking
- Element inspector
- Grid overlay (`Ctrl+Shift+G`)

### Browser DevTools

```javascript
// Access app instance
window.app;

// Enable verbose logging
app.logger.setLogLevel('trace');

// Check configuration
app.config.get('theme');

// Trigger animations
app.animations.glitch('.hero-title');

// Terminal commands
app.terminal.execute('help');
```

### Performance Monitoring

```bash
# Run Lighthouse audit
make lighthouse

# Check bundle size
npm run build
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Stop all servers
make stop

# Or manually kill process
lsof -i :3000  # Find process
kill -9 <PID>  # Kill process
```

#### Dependencies Not Installing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### ESLint Not Working

```bash
# Use flat config (ESLint 9+)
npx eslint --config eslint.config.js src/**/*.js
```

#### Poetry Not Found

```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Or with pip
pip install poetry
```

### Windows-Specific Issues

#### Git Bash Required

The Makefile requires Git Bash on Windows. Install Git for Windows or use WSL.

#### Line Endings

```bash
# Configure Git for LF endings
git config --global core.autocrlf false
```

#### Python Path

Ensure Python is in PATH:

```bash
where python
# or
which python3
```

## 📝 Best Practices

### Code Style

1. **Use ES6+ features**: Arrow functions, destructuring, template literals
2. **Async/Await**: Prefer over promises chains
3. **Error Handling**: Always catch and log errors
4. **Comments**: JSDoc for functions, inline for complex logic

### CSS Organization

1. **Variables First**: Define all CSS variables at root
2. **Component Isolation**: One component per file
3. **BEM Naming**: Block\_\_Element--Modifier
4. **Mobile-First**: Start with mobile styles

### Performance

1. **Lazy Loading**: Load assets on demand
2. **Debounce/Throttle**: For scroll/resize handlers
3. **RequestAnimationFrame**: For animations
4. **Code Splitting**: Separate vendor code

### Security

1. **No Secrets**: Never commit API keys
2. **Input Validation**: Sanitize user input
3. **Content Security Policy**: Configure CSP headers
4. **HTTPS Only**: Use secure connections

## 🚢 Deployment

### GitHub Pages

```bash
# Automatic deployment on push to main
git push origin main

# Manual deployment
npm run build
git add .
git commit -m "Build for production"
git push
```

### Custom Domain

1. Create `CNAME` file with your domain
2. Configure DNS settings with provider
3. Enable HTTPS in GitHub Pages settings

## 📚 Resources

- [Project README](README.md)
- [ESLint Documentation](https://eslint.org/)
- [Stylelint Documentation](https://stylelint.io/)
- [Jest Documentation](https://jestjs.io/)
- [Poetry Documentation](https://python-poetry.org/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Make changes and test (`make validate`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push branch (`git push origin feature/amazing`)
6. Open Pull Request

---

**Need Help?** Open an issue on GitHub or check the
[troubleshooting](#troubleshooting) section.
