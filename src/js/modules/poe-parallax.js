/* eslint-env browser */

import { createMobileDebugPanel } from './mobile-debug-fixed.js';

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
    let t = null;

    function onLoad() {
        if (done) {
            return;
        }
        done = true;
        if (t) {
            window.clearTimeout(t);
        }
        markLoaded(img);
    }

    function onError() {
        if (done) {
            return;
        }
        done = true;
        if (t) {
            window.clearTimeout(t);
        }
        useFallback(img, fallback);
    }

    t = window.setTimeout(() => {
        if (!done) {
            onError();
        }
    }, timeoutMs);

    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
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
        return () => undefined;
    }
    const container = document.querySelector('.parallax-container');
    if (!container) {
        return () => undefined;
    }

    const layers = [...container.querySelectorAll('.parallax-layer')];
    if (!layers.length) {
        return () => undefined;
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
    const hasFinePointer = window.matchMedia('(any-pointer: fine)').matches;
    const POINTER_MULT = 1; // Always allow parallax (tilt on mobile, mouse on desktop)
    const SCROLL_MULT = isMobile ? 0.3 : 1; // gentler scroll parallax on phones

    const MAX_X = 12;
    const MAX_Y = 10;
    const DEAD_ZONE = 0.08; // 8% dead zone from center (16% total diameter)
    let mx = 0;
    let my = 0; // current
    let tx = 0;
    let ty = 0; // target
    let lastClientX = (typeof window !== 'undefined' ? window.innerWidth : 0) / 2;
    let lastClientY = (typeof window !== 'undefined' ? window.innerHeight : 0) / 2;
    let running = true; // Always run, ignore reduced motion
    // pointer influence ramps 0→1 to prevent initial jump
    let influence = 0;
    let influenceTarget = 0; // 0 at load; set to 1 after first input
    let sceneActive = true; // visible on screen?
    let hovered = false; // pointer is over the scene?

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
        const nx = lastClientX / (typeof window !== 'undefined' ? window.innerWidth : 1) - 0.5;
        const ny = lastClientY / (typeof window !== 'undefined' ? window.innerHeight : 1) - 0.5;

        const dx = applyDeadZone(nx, DEAD_ZONE);
        const dy = applyDeadZone(ny, DEAD_ZONE);

        tx = dx * MAX_X;
        ty = dy * MAX_Y;
    };

    // Create abort controller for event cleanup
    const ctrl = 'AbortController' in window ? new window.AbortController() : null;

    // Create debug panel for mobile (remove this in production)
    const debugPanel = createMobileDebugPanel({ isMobile, hasFinePointer, POINTER_MULT });
    const debugLog = debugPanel.log;

    // ===== Mobile tilt (Android + iOS) ==========================================
    // Motion sensors require HTTPS on modern browsers for security
    const SECURE = window.isSecureContext; // HTTPS required by Chrome/Edge/Firefox
    const HAS_TILT =
        window.DeviceOrientationEvent !== undefined || window.DeviceMotionEvent !== undefined;

    let tiltZero = null; // Calibration baseline - first reading becomes "center"

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    /**
     * Get current screen rotation angle
     * Handles both modern screen.orientation API and legacy window.orientation
     */
    function screenAngle() {
        const so =
            typeof window !== 'undefined' && window.screen && window.screen.orientation
                ? window.screen.orientation
                : null;
        if (so && typeof so.angle === 'number') {
            return so.angle;
        }
        if (typeof window.orientation === 'number') {
            return window.orientation;
        }
        return 0;
    }

    /**
     * Detect if device is in landscape orientation
     * Uses multiple methods for compatibility across browsers
     */
    function isLandscape() {
        const so =
            typeof window !== 'undefined' && window.screen && window.screen.orientation
                ? window.screen.orientation
                : null;
        const t = so && typeof so.type === 'string' ? so.type : '';
        return (
            t.indexOf('landscape') !== -1 ||
            Math.abs(screenAngle()) === 90 ||
            (typeof window !== 'undefined' ? window.innerWidth : 0) >
                (typeof window !== 'undefined' ? window.innerHeight : 0)
        );
    }

    /**
     * Handle device tilt events (gyroscope/accelerometer)
     * Maps device orientation to parallax movement
     * @param {DeviceOrientationEvent} e - The device orientation event
     */
    function onTilt(e) {
        // Skip during animations, hidden tabs, or when scene not visible
        // Note: We allow tilt when zoomed (parallax still works, just dampened)
        if (
            document.documentElement.classList.contains('animating') ||
            document.hidden ||
            !sceneActive
        ) {
            return;
        }

        const beta = e && typeof e.beta === 'number' ? e.beta : 0; // front/back tilt
        const gamma = e && typeof e.gamma === 'number' ? e.gamma : 0; // left/right tilt

        // Debug log first tilt event
        if (!tiltZero) {
            debugLog(`[Parallax] Tilt: β${beta.toFixed(1)} γ${gamma.toFixed(1)}`);
            debugPanel.updateTilt(beta, gamma);
        }

        // Map axes depending on orientation
        let gx = 0;
        let gy = 0;
        if (isLandscape()) {
            gx = beta; // forward/back controls horizontal in landscape
            gy = -gamma; // flip so left tilt moves content left
        } else {
            gx = gamma; // left/right
            gy = beta; // forward/back
        }

        // First reading becomes baseline (calibration)
        if (!tiltZero) {
            tiltZero = { gx, gy };
        }

        const dx = gx - tiltZero.gx;
        const dy = gy - tiltZero.gy;

        // Match mouse ranges; tune sensitivity instead
        const SENS_X = 35;
        const SENS_Y = 35; // higher = less sensitive
        const txTilt = clamp((dx / SENS_X) * MAX_X, -MAX_X, MAX_X);
        const tyTilt = clamp((dy / SENS_Y) * MAX_Y, -MAX_Y, MAX_Y);

        // Feed the same targets your tick() eases toward
        tx = txTilt;
        ty = tyTilt;
        influenceTarget = 1; // Wake up influence for tilt

        // Update debug panel with parallax values
        if (debugPanel && debugPanel.updateParallax) {
            debugPanel.updateParallax({ tx, ty, mx, my, influence });
        }
    }

    /**
     * Reset tilt calibration baseline
     * Called when device orientation changes or tab regains focus
     */
    function resetTiltBaseline() {
        tiltZero = null;
    }

    function attachTiltListeners() {
        const opts = ctrl ? { passive: true, signal: ctrl.signal } : { passive: true };
        // Many browsers fire only 'deviceorientation'; some support 'deviceorientationabsolute'.
        // Listening to both is harmless; whichever fires will drive updates.
        window.addEventListener('deviceorientation', onTilt, opts);
        window.addEventListener('deviceorientationabsolute', onTilt, opts);
        window.addEventListener('orientationchange', resetTiltBaseline, opts);

        debugLog('[Parallax] Tilt listeners attached');
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
        btn.addEventListener(
            'click',
            () => {
                if (
                    typeof window !== 'undefined' &&
                    window.DeviceOrientationEvent &&
                    window.DeviceOrientationEvent.requestPermission
                ) {
                    window.DeviceOrientationEvent.requestPermission()
                        .then(res => {
                            if (res === 'granted') {
                                attachTiltListeners();
                                btn.remove();
                            } else {
                                btn.textContent = 'Motion blocked in iOS settings';
                            }
                        })
                        .catch(() => {
                            btn.textContent = 'Motion not available';
                        });
                }
            },
            ctrl ? { passive: true, signal: ctrl.signal } : { passive: true }
        );
        document.body.appendChild(btn);
    }

    // Debug logging state
    let lastDebugTime = 0;
    const DEBUG_THROTTLE = 1000; // Log at most once per second

    /**
     * Apply current parallax values to all layers
     * Updates CSS custom properties for transform values
     * Skips during animations, when tab is hidden, or scene is not active
     */
    const apply = () => {
        // Skip during animation, when hidden, or not active
        if (
            document.documentElement.classList.contains('animating') ||
            document.hidden ||
            !sceneActive
        ) {
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
            debugLog(
                `[Parallax] mx:${mx.toFixed(1)} my:${my.toFixed(1)} | ${debugInfo.join(' | ')}`
            );
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

        // Update debug panel periodically
        if (debugPanel && debugPanel.updateParallax && isMobile) {
            debugPanel.updateParallax({ tx, ty, mx, my, influence });
        }

        apply();
        window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);

    /**
     * Handle pointer/mouse movement
     * Maps pointer position to parallax targets with dead zone
     * Only processes when scene is active, hovered, and not animating
     */
    const onPointer = e => {
        // Ignore touch events for parallax (let gyro handle mobile)
        // pointerType is 'mouse', 'pen', or 'touch'
        if (e.pointerType === 'touch') {
            return; // Don't process touch for parallax movement
        }

        // Self-heal if pointer is over container but hover wasn't detected
        if (!hovered) {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && container.contains(el)) {
                hovered = true;
            }
        }

        // Only react when scene is visible, hovered, and not animating/hidden
        if (
            !sceneActive ||
            !hovered ||
            document.documentElement.classList.contains('animating') ||
            document.hidden
        ) {
            return;
        }
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        influenceTarget = 1;
        setTargetsFromLastPointer();
    };

    const onLeave = () => {
        tx = 0;
        ty = 0;
        influenceTarget = 0; // ease back to neutral
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
        // Deterministic rebase: keep mx/my as-is (near 0), set new targets,
        // force amplitude to 0, then ramp back in on the next frames.
        setTargetsFromLastPointer();
        influence = 0;
        influenceTarget = 0;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                influenceTarget = 1;
            });
        });
    });

    const opts = ctrl ? { passive: true, signal: ctrl.signal } : { passive: true };

    // IntersectionObserver for visibility tracking (with guard for older browsers)
    let io = null;
    if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(
            entries => {
                sceneActive = Boolean(entries && entries[0] && entries[0].isIntersecting);
                if (!sceneActive) {
                    // Park the scene
                    tx = 0;
                    ty = 0;
                    influenceTarget = 0;
                }
            },
            { threshold: 0.1 }
        );
        io.observe(container);
    }

    // Check initial hover state (for when container is full viewport)
    const checkInitialHover = () => {
        const rect = container.getBoundingClientRect();
        const x = lastClientX;
        const y = lastClientY;
        hovered = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };
    checkInitialHover();

    // Pointer hover gates "live" input
    container.addEventListener(
        'pointerenter',
        e => {
            hovered = true;
            // Update coords from event to avoid stale values
            lastClientX = e.clientX;
            lastClientY = e.clientY;
            // Rebase and fade-in when the pointer actually matters
            setTargetsFromLastPointer();
            influence = 0;
            influenceTarget = 1;
        },
        opts
    );

    container.addEventListener(
        'pointerleave',
        () => {
            hovered = false;
            onLeave(); // existing neutral-ease
        },
        opts
    );

    // Rebase on tab return/focus (covers "moved mouse while away")
    const syncAndRamp = () => {
        if (!sceneActive) {
            return;
        }
        setTargetsFromLastPointer();
        influence = 0;
        influenceTarget = 1; // fade in on next frames
    };

    window.addEventListener('pointermove', onPointer, opts);
    window.addEventListener('scroll', apply, opts); // recompute on scroll
    document.addEventListener(
        'visibilitychange',
        () => {
            if (!document.hidden) {
                running = true;
                syncAndRamp();
                window.requestAnimationFrame(tick);
            } else {
                running = false;
            }
        },
        ctrl ? { signal: ctrl.signal } : {}
    );
    window.addEventListener('focus', syncAndRamp, opts);

    /**
     * Initialize tilt input for mobile devices
     * Handles both Android (automatic) and iOS (requires permission)
     * Sets up visibility/focus listeners for recalibration
     */
    (function () {
        if (!HAS_TILT) {
            return;
        }

        const needsIOSPerm =
            typeof window !== 'undefined' &&
            window.DeviceOrientationEvent &&
            typeof window.DeviceOrientationEvent.requestPermission === 'function';

        if (!SECURE) {
            debugLog('[Parallax] Need HTTPS for tilt!');
            return;
        }

        debugLog(`[Parallax] iOS perm: ${needsIOSPerm}`);

        if (needsIOSPerm) {
            debugLog('[Parallax] Showing iOS button');
            showIOSMotionButton(); // adds the enable button and wires listeners on grant
        } else {
            debugLog('[Parallax] Attaching Android tilt');
            attachTiltListeners(); // Android + desktop browsers that allow without prompt
        }

        // Nice-to-have: rebaseline on visibility/focus
        const tiltOpts = ctrl ? { passive: true, signal: ctrl.signal } : { passive: true };
        window.addEventListener('focus', resetTiltBaseline, tiltOpts);
        document.addEventListener(
            'visibilitychange',
            () => {
                if (!document.hidden) {
                    resetTiltBaseline();
                }
            },
            ctrl ? { signal: ctrl.signal } : {}
        );
    })();

    // Start perfectly centered; we won't react to pointer until it moves (or device motion fires)
    apply();
    // Optional: on touch devices, "auto-wake" pointer influence after a brief delay so the scene isn't static
    if (!hasFinePointer) {
        setTimeout(() => {
            influenceTarget = 1;
        }, 250);
    }

    return () => {
        if (ctrl && typeof ctrl.abort === 'function') {
            ctrl.abort();
        }
        if (io && typeof io.disconnect === 'function') {
            io.disconnect();
        }
        if (debugPanel && typeof debugPanel.destroy === 'function') {
            debugPanel.destroy();
        }
        // Reset layer offsets on cleanup
        layers.forEach(el => {
            el.style.setProperty('--dx', '0px');
            el.style.setProperty('--dy', '0px');
            el.style.setProperty('--sy', '0px');
        });
    };
}
