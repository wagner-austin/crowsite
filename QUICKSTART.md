# 🚀 Quick Start Guide

## First Time Setup (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Install Python dependencies
poetry install

# 3. Start the server
make serve
```

Your browser will automatically open to `http://localhost:3000` 🎉

## Essential Commands

| Command      | Description                             |
| ------------ | --------------------------------------- |
| `make serve` | Start dev server with auto-browser open |
| `make stop`  | Gracefully stop the server              |
| `make lint`  | Auto-fix all code issues                |
| `make check` | Verify project setup                    |
| `make help`  | Show all available commands             |

## Project Features

✅ **Complete Setup**

- Poetry for Python dependency management
- ESLint, Stylelint, Prettier for code quality
- Jest for testing
- Husky for pre-commit hooks
- Cross-platform server scripts (Windows/Mac/Linux)
- Graceful shutdown with Ctrl+C
- Automatic browser opening

✅ **Development Tools**

- Comprehensive logging system
- Built-in debugger with performance monitoring
- 4 retro themes (Cyberpunk, Synthwave, Matrix, Vaporwave)
- Interactive terminal with 30+ commands
- Sound effects system
- Animation engine

✅ **Best Practices**

- Modular architecture (ES6 modules)
- BEM CSS methodology
- Zero dependencies (pure vanilla JS)
- Performance optimized (< 100KB)
- Fully responsive
- Accessibility compliant

## File Structure

```
retro-dev-portfolio/
├── src/js/          # JavaScript modules
├── src/styles/      # CSS architecture
├── scripts/         # Build & serve scripts
├── tests/           # Test files
├── Makefile         # All commands
└── index.html       # Main entry
```

## Troubleshooting

**Server won't start?**

```bash
make stop      # Stop any running servers
make serve     # Try again
```

**Dependencies missing?**

```bash
make install   # Install everything at once
```

**Want to check setup?**

```bash
make check     # Run comprehensive verification
```

## Next Steps

1. **Customize content**: Edit `index.html` for portfolio content
2. **Modify theme**: Adjust Poe theme colors in
   `src/styles/themes/poe-theme-system.css`
3. **Add features**: Extend modules in `src/js/modules/`
4. **Deploy**: Push to GitHub and enable Pages

---

**Ready to code!** The server is configured with graceful shutdown, automatic
browser opening, and full development tooling. Happy coding! 🎮✨
