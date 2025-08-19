/* eslint-env browser */

/**
 * Poe Parallax Module
 * 
 * Provides multi-layer parallax effects for the Poe theme including:
 * - Mouse/pointer-based parallax on desktop
 * - Gyroscope/tilt-based parallax on mobile devices
 * - Scroll-based parallax for all devices
 * - Smooth zoom animations with proper state management
 * 
 * Features:
 * - Cross-browser support (Chrome, Firefox, Edge, Safari on both Android and iOS)
 * - Automatic permission handling for iOS motion sensors
 * - Respects user's reduced motion preferences
 * - Smooth easing and dead zones for natural movement
 * - Proper cleanup and memory management
 */

// 1x1 transparent PNG (prevents broken-image icons)
const TRANSPARENT_PX =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1C8S0AAAAASUVORK5CYII=';

function markLoaded(img) {
    img.classList.remove('is-loading');
    img.classList.remove('is-error');
    img.classList.add('is-loaded');
}

function useFallback(img, src) {
    img.src = src;
    img.classList.remove('is-loading');
    img.classList.add('is-error');
}

function wireSprite(img, { timeoutMs = 8000, fallback = TRANSPARENT_PX } = {}) {
    img.classList.add('is-loading');

    if (img.complete && img.naturalWidth > 0) {
        markLoaded(img);
        return;
    }

    let done = false;
    const onLoad = () => {
        if (done) {
            return;
        }
        done = true;
        markLoaded(img);
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
    };
    const onError = () => {
        if (done) {
            return;
        }
        done = true;
        useFallback(img, fallback);
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
    };

    const t = window.setTimeout(() => {
        if (done) {
            return;
        }
        onError();
    }, timeoutMs);

    img.addEventListener('load', () => {
        window.clearTimeout(t);
        onLoad();
    });
    img.addEventListener('error', () => {
        window.clearTimeout(t);
        onError();
    });
}

function wireParallaxSprites() {
    const sprites = document.querySelectorAll('.parallax-container img.parallax-sprite');
    for (let i = 0; i < sprites.length; i += 1) {
        wireSprite(sprites[i], { timeoutMs: 10000, fallback: TRANSPARENT_PX });
    }
}

export function initPoeParallax() {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme');
    if (!theme || !theme.startsWith('poe')) {
        return () => {};
    }
    const container = document.querySelector('.parallax-container');
    if (!container) {
        return () => {};
    }

    const layers = [...container.querySelectorAll('.parallax-layer')];
    if (!layers.length) {
        return () => {};
    }

    // Wire up sprite loading with fallbacks
    wireParallaxSprites();

    // Tag sun's parent with has-sun class for CSS (avoids expensive :has selector)
    document.querySelectorAll('.sun-element').forEach(sun => {
        const parent = sun.closest('.parallax-far-back');
        if (parent) {
            parent.classList.add('has-sun');
        }
    });

    // Force animations even with reduced motion enabled
    document.documentElement.setAttribute('data-motion', 'force');

    // Mobile optimization - reduce or disable parallax on small/touch devices
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const POINTER_MULT = (isMobile || isCoarse) ? 0 : 1;    // no pointer sway on phones
    const SCROLL_MULT = isMobile ? 0.3 : 1;                 // gentler scroll parallax on phones

    const MAX_X = 12;
    const MAX_Y = 10;
    const DEAD_ZONE = 0.08; // 8% dead zone from center (16% total diameter)
    let mx = 0;
    let my = 0; // current
    let tx = 0;
    let ty = 0; // target
    let lastClientX = window.innerWidth / 2;
    let lastClientY = window.innerHeight / 2;
    let running = true; // Always run, ignore reduced motion
    // pointer influence ramps 0→1 to prevent initial jump
    let influence = 0;
    let influenceTarget = 0; // 0 at load; set to 1 after first input

    // Apply dead zone with smooth transition
    const applyDeadZone = (value, deadZone) => {
        const abs = Math.abs(value);
        if (abs < deadZone) {
            // Inside dead zone - smooth quadratic ease to 0
            return value * Math.pow(abs / deadZone, 2);
        }
        // Outside dead zone - remap to full range
        const sign = value < 0 ? -1 : 1;
        const remapped = ((abs - deadZone) / (0.5 - deadZone)) * 0.5;
        return sign * remapped;
    };

    const setTargetsFromLastPointer = () => {
        // Normalize to -0.5 to 0.5 range
        const nx = lastClientX / window.innerWidth - 0.5;
        const ny = lastClientY / window.innerHeight - 0.5;

        const dx = applyDeadZone(nx, DEAD_ZONE);
        const dy = applyDeadZone(ny, DEAD_ZONE);

        tx = dx * MAX_X;
        ty = dy * MAX_Y;
    };

    // ===== Mobile tilt (Android + iOS) ==========================================
    // Motion sensors require HTTPS on modern browsers for security
    const mqlReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const SECURE = window.isSecureContext; // HTTPS required by Chrome/Edge/Firefox
    const HAS_TILT =
        typeof DeviceOrientationEvent !== 'undefined' ||
        typeof DeviceMotionEvent !== 'undefined';

    let tiltZero = null; // Calibration baseline - first reading becomes "center"

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    /**
     * Get current screen rotation angle
     * Handles both modern screen.orientation API and legacy window.orientation
     */
    function screenAngle() {
        if (screen?.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
        if (typeof window.orientation === 'number') return window.orientation;
        return 0;
    }
    
    /**
     * Detect if device is in landscape orientation
     * Uses multiple methods for compatibility across browsers
     */
    function isLandscape() {
        const t = screen?.orientation?.type || '';
        return t.includes('landscape') || Math.abs(screenAngle()) === 90 || (innerWidth > innerHeight);
    }

    /**
     * Handle device tilt events (gyroscope/accelerometer)
     * Maps device orientation to parallax movement
     * @param {DeviceOrientationEvent} e - The device orientation event
     */
    function onTilt(e) {
        // Skip during animations, zoom state, hidden tabs, or if user prefers reduced motion
        if (document.documentElement.classList.contains('animating') ||
            document.documentElement.classList.contains('zoomed') ||
            document.hidden || mqlReduced.matches) return;

        const beta  = e.beta  ?? 0; // front/back tilt
        const gamma = e.gamma ?? 0; // left/right tilt

        // Map axes depending on orientation
        let gx, gy;
        if (isLandscape()) {
            gx = beta;    // forward/back controls horizontal in landscape
            gy = -gamma;  // flip so left tilt moves content left
        } else {
            gx = gamma;   // left/right
            gy = beta;    // forward/back
        }

        // First reading becomes baseline (calibration)
        if (!tiltZero) tiltZero = { gx, gy };

        const dx = gx - tiltZero.gx;
        const dy = gy - tiltZero.gy;

        // Match mouse ranges; tune sensitivity instead
        const SENS_X = 35, SENS_Y = 35; // higher = less sensitive
        const txTilt = clamp((dx / SENS_X) * MAX_X, -MAX_X, MAX_X);
        const tyTilt = clamp((dy / SENS_Y) * MAX_Y, -MAX_Y, MAX_Y);

        // Feed the same targets your tick() eases toward
        tx = txTilt;
        ty = tyTilt;
        influenceTarget = 1; // Wake up influence for tilt
    }

    /**
     * Reset tilt calibration baseline
     * Called when device orientation changes or tab regains focus
     */
    function resetTiltBaseline() { tiltZero = null; }

    function attachTiltListeners() {
        const opts = { passive: true, signal: ctrl.signal };
        // Many browsers fire only 'deviceorientation'; some support 'deviceorientationabsolute'.
        // Listening to both is harmless; whichever fires will drive updates.
        window.addEventListener('deviceorientation', onTilt, opts);
        window.addEventListener('deviceorientationabsolute', onTilt, opts);
        window.addEventListener('orientationchange', resetTiltBaseline, opts);
    }

    /**
     * Show permission button for iOS devices
     * iOS requires user gesture to grant motion sensor access
     * All iOS browsers (Safari/Chrome/Edge/Firefox) use WebKit and need this
     */
    function showIOSMotionButton() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Enable Motion Effects';
        btn.style.cssText =
            'position:fixed;bottom:12px;right:12px;z-index:9999;padding:.5rem .75rem;border-radius:10px;' +
            'border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.55);color:#fff;' +
            'backdrop-filter:blur(6px);font:600 14px system-ui;cursor:pointer';
        btn.addEventListener('click', async () => {
            try {
                const res = await DeviceOrientationEvent.requestPermission();
                if (res === 'granted') {
                    attachTiltListeners();
                    btn.remove();
                } else {
                    btn.textContent = 'Motion blocked in iOS settings';
                }
            } catch {
                btn.textContent = 'Motion not available';
            }
        }, { passive: true, signal: ctrl.signal });
        document.body.appendChild(btn);
    }

    // Debug logging state
    let lastDebugTime = 0;
    const DEBUG_THROTTLE = 1000; // Log at most once per second
    
    /**
     * Apply current parallax values to all layers
     * Updates CSS custom properties for transform values
     * Skips during animations or when tab is hidden
     */
    const apply = () => {
        // Skip during animation or when hidden
        if (document.documentElement.classList.contains('animating') || document.hidden) {
            return;
        }
        
        const sy = window.scrollY || 0;

        // Reduce parallax when zoomed in for subtle movement
        const isZoomed = document.documentElement.classList.contains('zoomed');
        const zoomDamping = isZoomed ? 0.5 : 1;

        // Check if debug mode is active via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug') === 'true';

        // Prepare debug info if needed
        let debugInfo = null;
        if (debugMode && isZoomed && Math.abs(mx) > 1) {
            const now = Date.now();
            if (now - lastDebugTime > DEBUG_THROTTLE) {
                lastDebugTime = now;
                debugInfo = [];
            }
        }

        layers.forEach((el, i) => {
            const s = parseFloat(el.dataset.speed || '0') * zoomDamping * influence * POINTER_MULT;
            const sc = parseFloat(el.dataset.scroll || '0') * zoomDamping * influence * SCROLL_MULT;
            const dx = mx * s;
            const dy = my * s;
            el.style.setProperty('--dx', `${dx}px`);
            el.style.setProperty('--dy', `${dy}px`);
            el.style.setProperty('--sy', `${sy * sc}px`);

            // Collect debug info if enabled
            if (debugInfo) {
                debugInfo.push(`L${i}[${el.dataset.speed}]: ${dx.toFixed(1)},${dy.toFixed(1)}`);
            }
        });

        // Log consolidated debug info
        if (debugInfo) {
            console.log(`[Parallax] mx:${mx.toFixed(1)} my:${my.toFixed(1)} | ${debugInfo.join(' | ')}`);
        }
    };

    /**
     * Main animation loop - smoothly interpolates to target positions
     * Uses exponential easing for natural movement
     * Automatically pauses during zoom animations
     */
    const tick = () => {
        if (!running) {
            return;
        }
        // Skip updates during zoom animation or when hidden
        if (document.documentElement.classList.contains('animating') || document.hidden) {
            // Reset to neutral during zoom
            mx = 0;
            my = 0;
            tx = 0;
            ty = 0;
            window.requestAnimationFrame(tick);
            return;
        }
        // Use slower smoothing when zoomed in
        const isZoomed = document.documentElement.classList.contains('zoomed');
        const k = isZoomed ? 0.03 : 0.06; // position smoothing - extra slow when zoomed
        const r = 0.02; // influence ramp smoothing - extra slow for smooth resume after zoom
        mx += (tx - mx) * k;
        my += (ty - my) * k;
        influence += (influenceTarget - influence) * r;
        apply();
        window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);

    /**
     * Handle pointer/mouse movement
     * Maps pointer position to parallax targets with dead zone
     * Activates influence on first movement
     */
    const onPointer = e => {
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        // Skip during zoom animation or when hidden
        if (document.documentElement.classList.contains('animating') || document.hidden) {
            return;
        }
        influenceTarget = 1;
        setTargetsFromLastPointer();
    };

    const onLeave = () => {
        tx = 0;
        ty = 0;
        influenceTarget = 0; // ease back to neutral
    };

    const onVisibility = () => {
        running = !document.hidden; // Ignore reduced motion
        if (running) {
            window.requestAnimationFrame(tick);
        }
    };

    // Old onMotion removed - replaced with better tilt handling above

    // Listen for zoom events to sync values
    document.documentElement.addEventListener('zoom:start', () => {
        // freeze influence immediately and reset CSS variables once
        influenceTarget = 0;
        // Set to 0 once at start instead of every frame
        layers.forEach(el => {
            el.style.setProperty('--dx', '0px');
            el.style.setProperty('--dy', '0px');
            el.style.setProperty('--sy', '0px');
        });
    });

    document.documentElement.addEventListener('zoom:end', () => {
        // exact sync: no delta = no jump
        setTargetsFromLastPointer();
        mx = tx;
        my = ty;
        // Wait a bit longer before ramping influence back up
        setTimeout(() => {
            influenceTarget = 1;
        }, 300); // 300ms delay before starting to ease back to mouse
    });

    const ctrl = new window.AbortController();
    const opts = { passive: true, signal: ctrl.signal };

    window.addEventListener('pointermove', onPointer, opts);
    window.addEventListener('pointerleave', onLeave, opts);
    window.addEventListener('scroll', apply, opts); // recompute on scroll
    document.addEventListener('visibilitychange', onVisibility, { signal: ctrl.signal });

    /**
     * Initialize tilt input for mobile devices
     * Handles both Android (automatic) and iOS (requires permission)
     * Sets up visibility/focus listeners for recalibration
     */
    (function initTilt() {
        if (!HAS_TILT) return;

        const needsIOSPerm =
            typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function';

        if (!SECURE) {
            console.warn('[Parallax] Motion sensors require HTTPS; tilt disabled.');
            return;
        }
        if (needsIOSPerm) {
            showIOSMotionButton();      // adds the enable button and wires listeners on grant
        } else {
            attachTiltListeners();      // Android + desktop browsers that allow without prompt
        }

        // Nice-to-have: rebaseline on visibility/focus
        const opts = { passive: true, signal: ctrl.signal };
        window.addEventListener('focus', resetTiltBaseline, opts);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) resetTiltBaseline();
        }, { signal: ctrl.signal });
    })();

    // Start perfectly centered; we won't react to pointer until it moves (or device motion fires)
    apply();
    // Optional: on touch devices, "auto-wake" pointer influence after a brief delay so the scene isn't static
    if (isCoarse) {
        setTimeout(() => {
            influenceTarget = 1;
        }, 250);
    }

    return () => {
        ctrl.abort();
        // Reset layer offsets on cleanup
        layers.forEach(el => {
            el.style.setProperty('--dx', '0px');
            el.style.setProperty('--dy', '0px');
            el.style.setProperty('--sy', '0px');
        });
    };
}
