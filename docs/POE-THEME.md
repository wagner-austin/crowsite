# Poe Theme Documentation

## Overview

The Poe theme is an atmospheric, Gothic-inspired theme featuring multi-layer parallax effects, animated decorative elements, and responsive image handling. It creates an immersive experience with flying crows, falling feathers, and a mysterious abandoned town scene.

## Architecture

The theme consists of four main JavaScript modules and supporting CSS:

### JavaScript Modules

#### 1. `poe-parallax.js`
**Purpose**: Manages multi-layer parallax effects

**Features**:
- **Desktop**: Mouse/pointer-based parallax with dead zones for natural movement
- **Mobile**: Gyroscope/tilt-based parallax using device orientation APIs
- **All devices**: Smooth scroll-based parallax
- **Cross-browser**: Full support for Chrome, Firefox, Edge, Safari (Android & iOS)

**Key Functions**:
- `initPoeParallax()` - Initialize parallax system, returns cleanup function
- Handles zoom state transitions (`animating`, `zoomed`)
- Automatic iOS permission handling for motion sensors
- Respects user's reduced motion preferences

**Requirements**:
- HTTPS required for motion sensors on mobile browsers
- iOS requires user gesture to grant motion permission

#### 2. `poe-decor.js`
**Purpose**: Adds atmospheric decorative elements

**Features**:
- **Crow animations**: Flying across screen at intervals
- **Feather physics**: Realistic falling with rotation and drift
- **Particle effects**: Ambient floating particles
- **Performance aware**: Adjusts based on device capabilities

**Key Functions**:
- `initPoeDecor()` - Initialize all decorations, returns cleanup function
- `spawnCrow()` - Limited to 1 crow at a time
- `spawnFeather()` - Limited to 8 concurrent feathers
- Uses `visualViewport` API for accurate mobile positioning

#### 3. `scene-animations.js`
**Purpose**: Handles zoom in/out animations

**Features**:
- Click-to-zoom on designated trigger elements
- Keyboard support (Enter/Space to activate, Escape to exit)
- Finds triggers even when behind other elements
- Smooth camera movement with GPU acceleration

**Animation States**:
- **Default**: Normal parallax view
- **`animating`**: Transition in progress (parallax paused)
- **`zoomed`**: Zoomed in state (parallax dampened)

**Key Functions**:
- `initSceneAnimations()` - Initialize zoom system, returns cleanup object
- Dispatches events for module coordination

#### 4. `adaptive-images.js`
**Purpose**: Responsive image loading based on device type

**Features**:
- Automatic image swapping based on screen size
- Smooth fade transitions without layout shift
- Device detection: `mobile-portrait`, `mobile-landscape`, `desktop`

**Usage**:
```html
<img src="default.png" 
     data-adaptive-src='{
       "desktop": "images/desktop.png",
       "mobile-portrait": "images/mobile-portrait.png",
       "mobile-landscape": "images/mobile-landscape.png"
     }'>
```

### CSS Files

#### `poe.css`
- Base theme structure and layout
- Z-index stacking order management
- Typography and base styles

#### `poe-theme-system.css`
- CSS custom properties for colors
- Light/dark theme variants
- Filter effects for decorative elements

#### `poe-animations.css`
- Zoom animation transitions
- Transform values for each zoom state
- Timing functions and durations

#### `poe-responsive.css`
- Mobile-first responsive breakpoints
- Tree sizing adjustments for different screens
- Performance optimizations for mobile

## Implementation Guide

### Basic Setup

1. **Initialize in main.js**:
```javascript
import { initPoeParallax } from './modules/poe-parallax.js';
import { initPoeDecor } from './modules/poe-decor.js';
import { initSceneAnimations } from './modules/scene-animations.js';
import { initAdaptiveImages } from './modules/adaptive-images.js';

// Initialize when Poe theme is active
if (theme.startsWith('poe')) {
    const parallaxCleanup = initPoeParallax();
    const decorCleanup = initPoeDecor();
    const sceneCleanup = initSceneAnimations();
    const adaptiveImages = initAdaptiveImages({ mobileBreakpoint: 768 });
    
    // Store cleanups for theme switching
    this.cleanups = { parallaxCleanup, decorCleanup, sceneCleanup, adaptiveImages };
}
```

2. **HTML Structure**:
```html
<div class="parallax-container">
    <!-- Far background layer -->
    <div class="parallax-layer parallax-far-back" data-speed="-5" data-scroll="-0.03">
        <img class="parallax-sprite sun-element" src="assets/poe/backgrounds/sun.png">
    </div>
    
    <!-- Town background -->
    <div class="parallax-layer parallax-back" data-speed="-3" data-scroll="-0.02">
        <img class="parallax-sprite town-background" 
             data-zoom-trigger 
             src="assets/poe/backgrounds/town.png">
    </div>
    
    <!-- Foreground trees -->
    <div class="parallax-layer parallax-front" data-speed="2" data-scroll="0.01">
        <img class="parallax-sprite tree-close-left" src="assets/poe/foreground/tree-left.png">
        <img class="parallax-sprite tree-close-right" src="assets/poe/foreground/tree-right.png">
    </div>
</div>
```

### Configuration

#### Parallax Speed
- `data-speed`: Mouse/tilt parallax multiplier (negative = opposite direction)
- `data-scroll`: Scroll parallax multiplier

#### Zoom Triggers
- Add `data-zoom-trigger` to any element to make it clickable for zoom

#### Adaptive Images
- Use `data-adaptive-src` with JSON configuration
- Images swap automatically at 768px breakpoint

### Mobile Considerations

#### iOS Motion Permissions
- Users see "Enable Motion Effects" button on first visit
- Tapping grants permission for gyroscope access
- Permission persists for the session

#### Performance
- Parallax automatically reduces on mobile
- Particle effects adjust based on device memory
- Images swap to mobile-optimized versions

### Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ Full | ✅ Full |
| Firefox | ✅ Full | ✅ Full |
| Edge | ✅ Full | ✅ Full |
| Safari | ✅ Full | ✅ Full (iOS requires permission) |

### Debugging

Enable verbose logging by keeping console.log statements active. Key log prefixes:
- `[SceneAnimations]` - Zoom state changes
- `[Parallax]` - Motion sensor status
- `[AdaptiveImages]` - Device type detection

### Performance Tips

1. **Image Optimization**:
   - Use appropriate image sizes for each breakpoint
   - Consider WebP format with fallbacks
   - Preload critical images

2. **Parallax Tuning**:
   - Adjust `SENS_X` and `SENS_Y` in poe-parallax.js for tilt sensitivity
   - Modify `MAX_X` and `MAX_Y` for parallax range
   - Use `DEAD_ZONE` to prevent micro-movements

3. **Animation Performance**:
   - Transitions use CSS transforms for GPU acceleration
   - RequestAnimationFrame for smooth updates
   - Automatic pausing when tab is hidden

## Troubleshooting

### Common Issues

**Parallax not working on mobile**:
- Ensure site is served over HTTPS
- Check if motion sensors are enabled in device settings
- iOS: User must tap "Enable Motion Effects" button

**Images not swapping**:
- Verify `data-adaptive-src` JSON is valid
- Check browser console for parsing errors
- Ensure image paths are correct

**Zoom animation jumpy**:
- Check for conflicting CSS transitions
- Verify all modules are initialized
- Ensure proper class names (`animating`, `zoomed`)

**Performance issues**:
- Reduce particle count in poe-decor.js
- Optimize image sizes
- Check device memory constraints

## Future Enhancements

Potential improvements tracked in TODO_FUTURE.md:
- Additional weather effects (rain, fog)
- Day/night cycle transitions
- Sound effects integration
- More interactive elements