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

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const MAX_X = 12;
    const MAX_Y = 10;
    let mx = 0, my = 0;        // current
    let tx = 0, ty = 0;        // target
    let lastClientX = window.innerWidth / 2;
    let lastClientY = window.innerHeight / 2;
    let running = !mql.matches;
    // pointer influence ramps 0→1 to prevent initial jump
    let influence = 0;
    let influenceTarget = 0;   // 0 at load; set to 1 after first input
    
    const setTargetsFromLastPointer = () => {
        const nx = lastClientX / window.innerWidth - 0.5;
        const ny = lastClientY / window.innerHeight - 0.5;
        tx = nx * MAX_X;
        ty = ny * MAX_Y;
    };

    const apply = () => {
        const sy = window.scrollY || 0;
        const isZooming = document.documentElement.classList.contains('is-zooming');
        const isSettling = document.documentElement.classList.contains('zoom-settling');
        
        if (isZooming || isSettling) {
            // Reset all parallax values during zoom to prevent jump
            layers.forEach(el => {
                el.style.setProperty('--dx', '0px');
                el.style.setProperty('--dy', '0px');
                el.style.setProperty('--sy', '0px');
            });
            return;
        }
        
        const freeze = document.documentElement.classList.contains('zoomed-in') ? 0 : 1;
        layers.forEach(el => {
            const s = parseFloat(el.dataset.speed || '0') * freeze * influence; // Apply influence for smooth ramp
            const sc = parseFloat(el.dataset.scroll || '0') * freeze * influence;
            el.style.setProperty('--dx', `${mx * s}px`);
            el.style.setProperty('--dy', `${my * s}px`);
            el.style.setProperty('--sy', `${sy * sc}px`);
        });
    };

    const tick = () => {
        if (!running) return;
        // Skip updates during zoom animation AND settling
        if (document.documentElement.classList.contains('is-zooming') ||
            document.documentElement.classList.contains('zoom-settling')) {
            // Reset to neutral during zoom
            mx = 0;
            my = 0;
            tx = 0;
            ty = 0;
            window.requestAnimationFrame(tick);
            return;
        }
        const k = 0.06;    // position smoothing - reduced for slower movement
        const r = 0.02;    // influence ramp smoothing - extra slow for smooth resume after zoom
        mx += (tx - mx) * k;
        my += (ty - my) * k;
        influence += (influenceTarget - influence) * r;
        apply();
        window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);

    const onPointer = e => {
        if (mql.matches) return;
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        // During zoom, we *record* pointer but skip applying targets
        if (document.documentElement.classList.contains('is-zooming') ||
            document.documentElement.classList.contains('zoomed-in')) return;
        influenceTarget = 1;
        setTargetsFromLastPointer();
    };

    const onLeave = () => {
        tx = 0; ty = 0;
        influenceTarget = 0; // ease back to neutral
    };

    const onVisibility = () => {
        running = !document.hidden && !mql.matches;
        if (running) {
            window.requestAnimationFrame(tick);
        }
    };

    const onMqlChange = () => onVisibility();

    const onMotion = e => {
        if (mql.matches || !coarse) return;
        const gx = e.gamma ?? 0;
        const gy = e.beta ?? 0;
        influenceTarget = 1;
        tx = (gx / 45) * MAX_X;
        ty = (gy / 45) * MAX_Y;
    };

    // Listen for zoom events to sync values
    document.documentElement.addEventListener('zoom:start', () => {
        // freeze influence immediately, and keep applying 0 deltas
        influenceTarget = 0;
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

    if (mql.addEventListener) {
        mql.addEventListener('change', onMqlChange, { signal: ctrl.signal });
    } else if (mql.addListener) {
        mql.addListener(onMqlChange);
    }

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
        if (mql.removeEventListener) {
            mql.removeEventListener('change', onMqlChange);
        } else if (mql.removeListener) {
            mql.removeListener(onMqlChange);
        }
        // Reset layer offsets on cleanup
        layers.forEach(el => {
            el.style.setProperty('--dx', '0px');
            el.style.setProperty('--dy', '0px');
            el.style.setProperty('--sy', '0px');
        });
    };
}
