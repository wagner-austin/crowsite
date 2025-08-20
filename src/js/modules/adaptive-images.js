/**
 * Adaptive Images Module
 *
 * Automatically swaps images based on device type and screen size
 * Provides smooth transitions without layout shift or flicker
 *
 * Features:
 * - Device-based image selection (mobile-portrait, mobile-landscape, desktop)
 * - Smooth fade transitions during image swaps
 * - Debounced resize handling for performance
 * - Respects page visibility to avoid unnecessary swaps
 *
 * Usage:
 * Add data-adaptive-src attribute to img elements with JSON config:
 * data-adaptive-src='{
 *   "desktop": "path/to/desktop.png",
 *   "mobile-portrait": "path/to/mobile-portrait.png",
 *   "mobile-landscape": "path/to/mobile-landscape.png"
 * }'
 *
 * @module adaptive-images
 */

// src/js/modules/adaptive-images.js
// Adaptive image system for responsive breakpoints with jank-free swaps
export function initAdaptiveImages({
    mobileBreakpoint = 768,
    selector = '[data-adaptive-src], [data-src-desktop]',
} = {}) {
    let current = '';
    let paused = false;
    let resizeT = 0;

    /**
     * Determine current device type based on viewport width and orientation
     * @returns {string} 'mobile-portrait' | 'mobile-landscape' | 'desktop'
     */
    const getDeviceType = () => {
        const w = window.innerWidth;
        if (w <= mobileBreakpoint) {
            return window.innerHeight > window.innerWidth ? 'mobile-portrait' : 'mobile-landscape';
        }
        return 'desktop';
    };

    const getImages = () => document.querySelectorAll(selector);

    /**
     * Swap image source with fade transition
     * Only swaps if URL has changed to avoid unnecessary reloads
     * @param {HTMLImageElement} img - The image element
     * @param {string} url - The new image URL
     */
    const swap = (img, url) => {
        if (!url || img.src.endsWith(url)) {
            return;
        }

        function onLoad() {
            img.style.opacity = '1';
        }

        function onError() {
            img.style.opacity = '1';
        }

        // simple fade to avoid pop-in (optional)
        img.style.transition = 'opacity 120ms';
        img.style.opacity = '0';
        img.addEventListener('load', onLoad, { once: true });
        img.addEventListener('error', onError, { once: true });
        img.src = url;
    };

    /**
     * Check device type and update all adaptive images if needed
     * Updates body classes and html data-device attribute for CSS hooks
     * Skips when paused (e.g., during zoom animations)
     */
    const update = () => {
        if (paused) {
            return;
        }
        const next = getDeviceType();
        if (next === current) {
            return;
        }
        current = next;

        // Body classes + html data attr
        document.body.classList.remove(
            'device-mobile-portrait',
            'device-mobile-landscape',
            'device-desktop'
        );
        document.body.classList.add(`device-${next}`);
        document.documentElement.setAttribute('data-device', next);

        getImages().forEach(img => {
            // Support both formats: JSON (data-adaptive-src) and separate attributes (data-src-*)
            let sources = {};
            const json = img.getAttribute('data-adaptive-src');
            if (json) {
                try {
                    sources = JSON.parse(json);
                } catch {
                    sources = {};
                }
            } else {
                const { srcDesktop, srcMl, srcMp } = img.dataset;
                sources = {
                    desktop: srcDesktop,
                    'mobile-landscape': srcMl,
                    'mobile-portrait': srcMp,
                };
            }
            const wanted =
                sources[next] ||
                sources.desktop ||
                sources['mobile-portrait'] ||
                Object.values(sources)[0];

            swap(img, wanted);
        });
    };

    /**
     * Schedule an update with debouncing
     * Prevents excessive updates during resize
     * @param {number} delay - Milliseconds to delay (default 80ms)
     */
    const scheduleUpdate = (delay = 80) => {
        clearTimeout(resizeT);
        resizeT = setTimeout(update, delay);
    };

    const onResize = () => scheduleUpdate(80);
    const onOrientationChange = () => scheduleUpdate(0);
    const onVis = () => {
        paused = document.hidden;
        if (!paused) {
            scheduleUpdate(0);
        }
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onOrientationChange, { passive: true });
    document.addEventListener('visibilitychange', onVis);

    // initial run
    scheduleUpdate(0);

    return {
        update,
        getDeviceType,
        destroy() {
            clearTimeout(resizeT);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onOrientationChange);
            document.removeEventListener('visibilitychange', onVis);
        },
    };
}
