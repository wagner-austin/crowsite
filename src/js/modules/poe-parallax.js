/* eslint-env browser */

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
    document.querySelectorAll('.sun-element').forEach((sun) => {
        const parent = sun.closest('.parallax-far-back');
        if (parent) parent.classList.add('has-sun');
    });

    // Force animations even with reduced motion enabled
    document.documentElement.setAttribute('data-motion', 'force');
    
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const MAX_X = 12;
    const MAX_Y = 10;
    const DEAD_ZONE = 0.08;    // 8% dead zone from center (16% total diameter)
    let mx = 0, my = 0;        // current
    let tx = 0, ty = 0;        // target
    let lastClientX = window.innerWidth / 2;
    let lastClientY = window.innerHeight / 2;
    let running = true;  // Always run, ignore reduced motion
    // pointer influence ramps 0→1 to prevent initial jump
    let influence = 0;
    let influenceTarget = 0;   // 0 at load; set to 1 after first input
    
    // Apply dead zone with smooth transition
    const applyDeadZone = (value, deadZone) => {
        const abs = Math.abs(value);
        if (abs < deadZone) {
            // Inside dead zone - smooth quadratic ease to 0
            return value * Math.pow(abs / deadZone, 2);
        }
        // Outside dead zone - remap to full range
        const sign = value < 0 ? -1 : 1;
        const remapped = (abs - deadZone) / (0.5 - deadZone) * 0.5;
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

    const apply = () => {
        const sy = window.scrollY || 0;
        const isAnimating = document.documentElement.classList.contains('animating');
        
        // Skip entirely during zoom animation - values already set in zoom:start
        if (isAnimating) {
            return;
        }
        
        // Reduce parallax when zoomed in for subtle movement
        const isZoomed = document.documentElement.classList.contains('zoomed');
        const zoomDamping = isZoomed ? 0.5 : 1;
        
        layers.forEach((el, i) => {
            const s = parseFloat(el.dataset.speed || '0') * zoomDamping * influence;
            const sc = parseFloat(el.dataset.scroll || '0') * zoomDamping * influence;
            const dx = mx * s;
            const dy = my * s;
            el.style.setProperty('--dx', `${dx}px`);
            el.style.setProperty('--dy', `${dy}px`);
            el.style.setProperty('--sy', `${sy * sc}px`);
            
            // Debug all layers when zoomed
            if (isZoomed && Math.abs(mx) > 1) {
                console.log(`Layer ${i}:`, { 
                    class: el.className,
                    speed: el.dataset.speed, 
                    dx: dx.toFixed(1), 
                    dy: dy.toFixed(1) 
                });
            }
        });
    };

    const tick = () => {
        if (!running) return;
        // Skip updates during zoom animation
        if (document.documentElement.classList.contains('animating')) {
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
        const k = isZoomed ? 0.03 : 0.06;    // position smoothing - extra slow when zoomed
        const r = 0.02;    // influence ramp smoothing - extra slow for smooth resume after zoom
        mx += (tx - mx) * k;
        my += (ty - my) * k;
        influence += (influenceTarget - influence) * r;
        apply();
        window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);

    const onPointer = e => {
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        // Skip only during zoom animation, allow when zoomed in
        if (document.documentElement.classList.contains('animating')) return;
        influenceTarget = 1;
        setTargetsFromLastPointer();
    };

    const onLeave = () => {
        tx = 0; ty = 0;
        influenceTarget = 0; // ease back to neutral
    };

    const onVisibility = () => {
        running = !document.hidden;  // Ignore reduced motion
        if (running) {
            window.requestAnimationFrame(tick);
        }
    };


    const onMotion = e => {
        if (!coarse) return;  // Ignore reduced motion, only check for touch device
        const gx = e.gamma ?? 0;
        const gy = e.beta ?? 0;
        
        // Normalize device tilt to -0.5 to 0.5 range
        const nx = Math.max(-0.5, Math.min(0.5, gx / 90));
        const ny = Math.max(-0.5, Math.min(0.5, gy / 90));
        
        const dx = applyDeadZone(nx, DEAD_ZONE);
        const dy = applyDeadZone(ny, DEAD_ZONE);
        
        influenceTarget = 1;
        tx = dx * MAX_X;
        ty = dy * MAX_Y;
    };

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
        }, 300);  // 300ms delay before starting to ease back to mouse
    });

    const ctrl = new window.AbortController();
    const opts = { passive: true, signal: ctrl.signal };

    window.addEventListener('pointermove', onPointer, opts);
    window.addEventListener('pointerleave', onLeave, opts);
    window.addEventListener('scroll', apply, opts); // recompute on scroll
    document.addEventListener('visibilitychange', onVisibility, { signal: ctrl.signal });


    if ('DeviceOrientationEvent' in window) {
        window.addEventListener('deviceorientation', onMotion, opts);
    }

    // iOS permission gate for device orientation
    if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
        window.addEventListener(
            'click',
            async function askMotionOnce() {
                try {
                    await DeviceOrientationEvent.requestPermission().catch(() => {});
                } finally {
                    window.removeEventListener('click', askMotionOnce);
                }
            },
            { once: true, passive: true, signal: ctrl.signal }
        );
    }

    // Start perfectly centered; we won't react to pointer until it moves (or device motion fires)
    apply();
    // Optional: on touch devices, "auto-wake" pointer influence after a brief delay so the scene isn't static
    if (coarse) setTimeout(() => { influenceTarget = 1; }, 250);

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
