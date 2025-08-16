# Code Style Guide

## 📐 Overview

This document defines the coding standards and best practices for the
retro-dev-portfolio project. All contributors should follow these guidelines to
maintain consistency and quality.

## 🎯 Core Principles

1. **Clarity over Cleverness** - Write code that is easy to understand
2. **Consistency** - Follow established patterns throughout the codebase
3. **Modularity** - Keep components small and focused
4. **Performance** - Optimize for user experience
5. **Accessibility** - Ensure inclusive design

## 📝 JavaScript Standards

### File Structure

```javascript
/**
 * Module Description
 * Additional details about the module
 */

// Imports - grouped and ordered
import { CoreModule } from './core/module.js';
import { CONSTANTS } from './core/constants.js';
import { Helper } from './utils/helper.js';

// Class definition
export class ModuleName {
    constructor() {
        // Initialize properties
    }

    // Public methods first
    publicMethod() {}

    // Private methods last (prefixed with _)
    _privateMethod() {}
}

// Export singleton if applicable
export default new ModuleName();
```

### Naming Conventions

```javascript
// Classes - PascalCase
class UserManager {}

// Constants - UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_ENDPOINT = '/api/v1';

// Variables and functions - camelCase
const userCount = 0;
function calculateTotal() {}

// Private properties/methods - prefix with underscore
this._privateProperty = value;
_privateMethod() {}

// Boolean variables - prefix with is/has/should
const isLoading = true;
const hasPermission = false;
const shouldUpdate = true;

// Event handlers - prefix with handle
handleClick() {}
handleSubmit() {}

// Files - kebab-case
'user-manager.js'
'error-handler.js'
```

### ES6+ Features

```javascript
// Use const/let, never var
const immutableValue = 42;
let mutableValue = 'hello';

// Use arrow functions for callbacks
array.map(item => item * 2);

// Use template literals
const message = `Hello, ${userName}!`;

// Use destructuring
const { name, age } = user;
const [first, second] = array;

// Use spread operator
const newArray = [...oldArray, newItem];
const newObject = { ...oldObject, newProperty };

// Use async/await over promises
async function fetchData() {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        handleError(error);
    }
}

// Use default parameters
function greet(name = 'Guest') {
    return `Hello, ${name}!`;
}
```

### Error Handling

```javascript
// Always use try-catch for async operations
async function riskyOperation() {
    try {
        const result = await someAsyncTask();
        return result;
    } catch (error) {
        // Use centralized error handler
        ErrorHandler.handle(error, {
            context: 'riskyOperation',
            severity: 'error',
        });

        // Re-throw if needed
        throw error;
    }
}

// Use specific error messages
throw new Error('User authentication failed: Invalid credentials');

// Always log errors with context
this.logger.error('Operation failed', {
    operation: 'fetchUser',
    userId: id,
    error: error.message,
});
```

### Module Pattern

```javascript
// Use ES6 modules
export class MyClass {}
export const myFunction = () => {};
export default myDefaultExport;

// Import everything from constants
import { TIMING, PERFORMANCE, ERROR_MESSAGES } from './core/constants.js';

// Never use global variables
// Bad: window.myGlobal = value;
// Good: export const myValue = value;
```

### Comments and Documentation

```javascript
/**
 * Calculate the total price including tax
 * @param {number} price - Base price
 * @param {number} taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @returns {number} Total price with tax
 */
function calculateTotal(price, taxRate) {
    return price * (1 + taxRate);
}

// Use single-line comments for clarification
const result = value * 1.5; // Apply 50% markup

// TODO: Add feature (include ticket number if applicable)
// FIXME: Known issue that needs attention
// NOTE: Important information for other developers
```

## 🎨 CSS Standards

### File Organization

```css
/* Component Name
   ========================================================================== */

/* Base styles */
.component {
    /* Positioning */
    position: relative;
    top: 0;

    /* Box Model */
    display: flex;
    width: 100%;
    padding: 1rem;
    margin: 0;

    /* Typography */
    font-family: var(--font-primary);
    font-size: 1rem;

    /* Visual */
    background: var(--color-background);
    border: 1px solid var(--color-border);

    /* Animation */
    transition: all var(--transition-default);
}

/* Modifiers */
.component--large {
}
.component--active {
}

/* Child elements */
.component__header {
}
.component__body {
}
```

### Naming Conventions (BEM)

```css
/* Block */
.card {
}

/* Element */
.card__header {
}
.card__body {
}
.card__footer {
}

/* Modifier */
.card--featured {
}
.card--disabled {
}

/* State classes */
.is-active {
}
.is-loading {
}
.has-error {
}
```

### CSS Variables

```css
/* Define in :root */
:root {
    /* Colors */
    --color-primary: #00ffcc;
    --color-secondary: #ff00ff;

    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;

    /* Typography */
    --font-primary: 'Courier New', monospace;
    --font-size-base: 16px;

    /* Transitions */
    --transition-fast: 200ms ease;
}

/* Use throughout */
.element {
    color: var(--color-primary);
    padding: var(--spacing-sm);
}
```

### Responsive Design

```css
/* Mobile-first approach */
.element {
    /* Mobile styles (default) */
    width: 100%;
}

/* Tablet and up */
@media (min-width: 768px) {
    .element {
        width: 50%;
    }
}

/* Desktop and up */
@media (min-width: 1024px) {
    .element {
        width: 33.333%;
    }
}

/* Use constants for breakpoints */
@media (min-width: var(--breakpoint-tablet)) {
}
```

## 📁 Project Structure

```
retro-dev-portfolio/
├── src/
│   ├── js/
│   │   ├── core/           # Core utilities (logger, config, etc.)
│   │   ├── modules/         # Feature modules
│   │   └── utils/           # Helper utilities
│   ├── styles/
│   │   ├── base/           # Reset, variables, typography
│   │   ├── components/     # Component styles
│   │   ├── layouts/        # Layout styles
│   │   └── themes/         # Theme variations
│   └── assets/
│       ├── images/         # Image assets
│       ├── fonts/          # Custom fonts
│       └── sounds/         # Audio files
├── tests/                  # Test files
├── scripts/               # Build/deployment scripts
└── config/                # Configuration files
```

## ✅ Code Review Checklist

Before submitting code:

- [ ] No ESLint errors or warnings
- [ ] No console.log statements (use Logger)
- [ ] No magic numbers (use constants)
- [ ] No commented-out code
- [ ] All functions have JSDoc comments
- [ ] Error handling is in place
- [ ] Code follows naming conventions
- [ ] Tests are passing
- [ ] Performance impact considered
- [ ] Accessibility checked

## 🚫 Anti-Patterns to Avoid

```javascript
// ❌ Don't use var
var oldVariable = 'bad';

// ❌ Don't pollute global scope
window.myGlobal = 'bad';

// ❌ Don't use == for comparison
if (value == '5') {
}

// ❌ Don't ignore errors
try {
    riskyOperation();
} catch (e) {
    // Silent fail
}

// ❌ Don't use magic numbers
setTimeout(fn, 3000);

// ❌ Don't create huge functions
function doEverything() {
    // 200 lines of code
}

// ❌ Don't mix concerns
class UserManagerAndValidator {
    // Does too much
}
```

## ✨ Best Practices

```javascript
// ✅ Use constants for configuration
import { TIMING } from './constants.js';
setTimeout(fn, TIMING.ANIMATION_DURATION);

// ✅ Use early returns
function process(value) {
    if (!value) return null;
    if (value < 0) return 0;
    return value * 2;
}

// ✅ Use descriptive names
const userAuthenticationToken = getToken();

// ✅ Handle edge cases
function divide(a, b) {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}

// ✅ Use centralized error handling
try {
    await operation();
} catch (error) {
    ErrorHandler.handle(error);
}

// ✅ Keep functions small and focused
function validateEmail(email) {
    return REGEX.EMAIL.test(email);
}

// ✅ Use async/await with proper error handling
async function fetchUser(id) {
    try {
        const response = await api.get(`/users/${id}`);
        return response.data;
    } catch (error) {
        logger.error('Failed to fetch user', { id, error });
        throw error;
    }
}
```

## 🔧 Development Tools

### Required Extensions (VS Code)

- ESLint
- Prettier
- Stylelint
- GitLens
- Better Comments

### NPM Scripts

```bash
npm run lint        # Run all linters
npm run lint:js     # Lint JavaScript
npm run lint:css    # Lint CSS
npm run format      # Format code
npm run test        # Run tests
npm run build       # Build for production
```

## 📚 Resources

- [MDN Web Docs](https://developer.mozilla.org)
- [Can I Use](https://caniuse.com)
- [Web.dev](https://web.dev)
- [A11y Project](https://www.a11yproject.com)

## 🤝 Contributing

1. Follow this style guide
2. Write clean, readable code
3. Add tests for new features
4. Update documentation
5. Request code review

Remember: **Code is written once but read many times. Optimize for
readability!**
