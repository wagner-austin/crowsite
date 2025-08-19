# 🦇 Retro Dev Portfolio - Poe Theme Edition

A minimalist developer portfolio featuring an atmospheric Poe theme with
parallax effects, built with vanilla HTML, CSS, and JavaScript.

![Version](https://img.shields.io/badge/version-1.0.0-00ffcc)
![License](https://img.shields.io/badge/license-MIT-ff00ff)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-ffff00)

## ✨ Features

### 🎨 Visual Design

- **Poe Theme**: Gothic atmosphere with light and dark variants
- **Poe Theme Features**: Multi-layer parallax, flying crows, falling feathers,
  zoom animations
- **Mobile Support**: Gyroscope-based parallax on mobile devices
- **Glitch Effects**: Authentic retro-futuristic animations
- **Neon Aesthetics**: Dynamic glow effects and color schemes
- **Matrix Rain**: Animated background effects
- **Scanlines & Noise**: CRT monitor simulation

### 🎭 Interactive Features

- **Click-to-Zoom**: Interactive parallax scene exploration
- **Mobile Tilt**: Gyroscope-based parallax on mobile devices
- **Adaptive Images**: Responsive images for all screen sizes
- **Atmospheric Effects**: Flying crows and falling feathers

### 🏗️ Architecture

- **Modular CSS**: BEM methodology with utility classes
- **ES6 Modules**: Clean JavaScript architecture
- **Logger System**: Comprehensive debugging with multiple log levels
- **Debug Panel**: Built-in developer tools
- **Theme Engine**: Dynamic theme switching with localStorage persistence

### 🎮 Interactive Features

- **Sound Effects**: 8-bit audio feedback
- **Animations**: 15+ animation types
- **Particle Effects**: Dynamic visual effects
- **Easter Eggs**: Hidden features and games

## 🚀 Quick Start

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/wagner-austin/retro-dev-portfolio.git
cd retro-dev-portfolio
```

2. Open with a local server (any of these methods):

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Using VS Code Live Server
# Right-click index.html -> "Open with Live Server"
```

3. Navigate to `http://localhost:8000`

### GitHub Pages Deployment

1. Push to GitHub repository
2. Go to Settings → Pages
3. Select "Deploy from a branch"
4. Choose `main` branch and `/ (root)` folder
5. Your site will be available at
   `https://yourusername.github.io/retro-dev-portfolio`

## 📁 Project Structure

```
retro-dev-portfolio/
├── index.html                 # Main HTML file
├── 404.html                  # Custom 404 page
├── robots.txt               # SEO configuration
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages CI/CD
├── src/
│   ├── styles/
│   │   ├── main.css       # Main stylesheet entry
│   │   ├── base/          # Reset, variables, typography
│   │   ├── components/    # Component-specific styles
│   │   ├── layouts/       # Layout patterns
│   │   └── themes/        # Theme variations
│   ├── js/
│   │   ├── main.js        # Application entry point
│   │   ├── core/          # Core utilities (logger, debugger, config)
│   │   ├── modules/       # Feature modules
│   │   └── utils/         # Helper functions
│   └── assets/
│       ├── fonts/         # Custom fonts
│       ├── images/        # Images and icons
│       └── sounds/        # Sound effects
└── docs/
    └── README.md          # Documentation
```

## 🎮 Interactions

- **Click on Town**: Zoom into the parallax scene
- **Escape Key**: Exit zoom mode
- **Mobile Tilt**: Tilt your phone to move the parallax layers
- **Theme Toggle**: Switch between light and dark Gothic themes

## 🛠️ Customization

### Theme Configuration

The Poe theme comes in two variants:

- **poe-light**: Light Gothic atmosphere
- **poe-dark**: Dark Gothic atmosphere

Themes are managed in `src/js/modules/theme.js` and styled in:

- `src/styles/themes/poe-theme-system.css` - Color definitions
- `src/styles/themes/poe.css` - Layout and structure
- `src/styles/themes/poe-animations.css` - Animation states
- `src/styles/themes/poe-responsive.css` - Mobile optimizations

### Modifying Animations

In `src/js/modules/animations.js`:

```javascript
const animations = {
    yourAnimation: [
        {
            /* keyframe 1 */
        },
        {
            /* keyframe 2 */
        },
    ],
};
```

## 🔧 Configuration

### Debug Mode

Enable debug mode by adding `?debug=true` to the URL or pressing `Ctrl+Shift+D`

### Keyboard Shortcuts

- `Ctrl + T` - Toggle theme
- `Ctrl + Shift + D` - Toggle debug panel
- `Ctrl + Shift + G` - Toggle grid overlay
- `Ctrl + Shift + S` - Show performance stats

## 📊 Performance

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **Load Time**: < 2s on 3G
- **Bundle Size**: < 100KB (no dependencies)
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for
details.

## 🙏 Acknowledgments

- Inspired by Gothic literature and atmospheric design
- Built with vanilla JavaScript for maximum performance
- No frameworks, no dependencies, just pure web technologies

## 📧 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Portfolio:
  [https://yourusername.github.io/retro-dev-portfolio](https://yourusername.github.io/retro-dev-portfolio)

---

**Built with 💚 and JavaScript** | **[DEV_TERMINAL v1.0]**
