/**
 * Scene Animations Module
 *
 * Handles zoom in/out animations for the Poe theme parallax scene
 * Manages state transitions and coordinates with parallax module
 *
 * Features:
 * - Click-to-zoom on designated trigger elements
 * - Smooth camera movement animations
 * - Keyboard support (Enter/Space to activate, Escape to exit)
 * - Finds triggers even when behind other elements
 * - Proper state management to prevent animation conflicts
 *
 * Animation States:
 * - Default: Normal parallax view
 * - animating: Transition in progress (parallax paused)
 * - zoomed: Zoomed in state (parallax dampened)
 *
 * @module scene-animations
 */

// src/js/modules/scene-animations.js
import EventBus from '../core/eventBus.js';
import { Logger } from '../core/logger.js';

const logger = new Logger('SceneAnimations');

export function initSceneAnimations({
    triggerSelector = '[data-zoom-trigger]',
    rootSelector = ':root',
    parallaxPauseClass = 'zoomed',
    ignoreReducedMotion = true,
} = {}) {
    logger.info('Initializing with selector:', triggerSelector);

    const root = document.documentElement.matches(rootSelector)
        ? document.documentElement
        : document.querySelector(rootSelector);
    if (!root) {
        logger.warn('Root element not found');
        return {
            destroy() {
                // No-op when root element not found
            },
        };
    }

    // Force animations even when OS has reduced motion enabled
    if (ignoreReducedMotion) {
        root.setAttribute('data-motion', 'force');
    }

    // Read CSS custom properties for timing (fallback to 2500/2000ms)
    const msFromVar = (name, fallback) => {
        const v = getComputedStyle(root).getPropertyValue(name).trim();
        if (!v) {
            return fallback;
        }
        // accepts "1500ms" or "1.5s"
        if (v.endsWith('ms')) {
            return parseFloat(v);
        }
        if (v.endsWith('s')) {
            return parseFloat(v) * 1000;
        }
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };
    // Always use full animation timing, ignore reduced motion preference
    const zoomInMs = msFromVar('--scene-zoom-ms', 2500);
    const zoomOutMs = msFromVar('--scene-zoom-out-ms', 2000);

    let locked = false;

    // Keep aria-pressed in sync for all triggers in the DOM
    const setPressed = pressed => {
        document.querySelectorAll(triggerSelector).forEach(el => {
            el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        });
    };

    /**
     * Animate zoom in to the scene
     * Adds 'animating' class during transition, then 'zoomed' when complete
     * Dispatches events for other modules to coordinate
     */
    const zoomIn = () => {
        logger.info('🔍 Zoom in called, locked:', locked);
        if (locked) {
            return;
        }
        locked = true;
        root.classList.add('animating'); // 1) enable transitions
        logger.info('🎬 State: animating');
        root.getBoundingClientRect(); // arm transitions for Android
        document.documentElement.dispatchEvent(
            new (window.CustomEvent || window.Event)('zoom:start')
        );
        // Add delay for mobile to prepare GPU acceleration
        const isMobile =
            window.matchMedia('(max-width: 768px)').matches ||
            window.matchMedia('(pointer: coarse)').matches;
        const prepDelay = isMobile ? 50 : 0; // 50ms prep time for mobile

        window.setTimeout(() => {
            requestAnimationFrame(() => {
                // 2) next frame, change state
                logger.info('🎬 Adding class:', parallaxPauseClass);
                root.classList.add(parallaxPauseClass); // adds .zoomed
                logger.info('🎬 State: zoomed');
                setPressed(true);
                EventBus.emit('scene:zoom', { state: 'in' });
                window.setTimeout(() => {
                    root.classList.remove('animating'); // 3) clean up
                    logger.info('🎬 Animation complete: zoomed in');
                    document.documentElement.dispatchEvent(
                        new (window.CustomEvent || window.Event)('zoom:end', {
                            detail: { direction: 'in' },
                        })
                    );
                    locked = false;
                    logger.debug('Zoom in complete');
                }, zoomInMs + 100);
            });
        }, prepDelay);
    };

    /**
     * Animate zoom out from the scene
     * Removes 'zoomed' class and restores normal parallax
     * Includes mobile-specific GPU acceleration prep time
     */
    const zoomOut = () => {
        logger.info('🔍 Zoom out called, locked:', locked);
        if (locked) {
            return;
        }
        locked = true;
        root.classList.add('animating');
        root.getBoundingClientRect(); // arm transitions for Android
        document.documentElement.dispatchEvent(
            new (window.CustomEvent || window.Event)('zoom:start')
        );
        // Add delay for mobile to prepare GPU acceleration
        const isMobile =
            window.matchMedia('(max-width: 768px)').matches ||
            window.matchMedia('(pointer: coarse)').matches;
        const prepDelay = isMobile ? 50 : 0; // 50ms prep time for mobile

        window.setTimeout(() => {
            requestAnimationFrame(() => {
                logger.debug('Removing class:', parallaxPauseClass);
                root.classList.remove(parallaxPauseClass); // removes .zoomed
                setPressed(false);
                EventBus.emit('scene:zoom', { state: 'out' });
                window.setTimeout(() => {
                    root.classList.remove('animating');
                    document.documentElement.dispatchEvent(
                        new (window.CustomEvent || window.Event)('zoom:end', {
                            detail: { direction: 'out' },
                        })
                    );
                    locked = false;
                    logger.debug('Zoom out complete');
                }, zoomOutMs + 100);
            });
        }, prepDelay);
    };

    const toggleZoom = () => {
        const isZoomed = root.classList.contains(parallaxPauseClass);
        logger.info('🔍 Toggle zoom, currently zoomed:', isZoomed);
        if (isZoomed) {
            zoomOut();
        } else {
            zoomIn();
        }
    };

    /**
     * Find trigger element under pointer coordinates
     * Temporarily disables pointer-events on overlapping elements
     * to find triggers that may be visually behind other content
     * @param {number} x - Client X coordinate
     * @param {number} y - Client Y coordinate
     * @returns {Element|null} The trigger element if found
     */
    const findTriggerUnderPointer = (x, y) => {
        // 1) Exact stack under pointer (modern browsers)
        if (document.elementsFromPoint) {
            const stack = document.elementsFromPoint(x, y);
            for (const el of stack) {
                if (el.matches?.(triggerSelector)) {
                    return el;
                }
                const anc = el.closest?.(triggerSelector);
                if (anc) {
                    return anc;
                }
            }
        }

        // 2) Geometry fallback: any trigger whose rect contains the point
        const candidates = document.querySelectorAll(triggerSelector);
        for (const el of candidates) {
            const r = el.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
                return el;
            }
        }
        return null;
    };

    /**
     * Handle global click events
     * Uses findTriggerUnderPointer to work even when triggers are behind other elements
     * Makes triggers accessible by adding ARIA attributes
     */
    const onClick = e => {
        const trigger = findTriggerUnderPointer(e.clientX, e.clientY);
        if (!trigger) {
            return;
        }
        e.preventDefault();
        // Make anything a11y-pressable
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
        toggleZoom();
    };

    const onKey = e => {
        const t = e.target.closest(triggerSelector);
        if (!t) {
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleZoom();
        }
    };

    // Escape to exit
    const onEsc = e => {
        if (e.key === 'Escape' && root.classList.contains(parallaxPauseClass)) {
            zoomOut();
        }
    };

    document.addEventListener('click', onClick, { passive: false });
    document.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onEsc);

    // Check if any triggers exist at init time
    const triggers = document.querySelectorAll(triggerSelector);
    logger.info(`Found ${triggers.length} trigger elements at init`);
    triggers.forEach((el, i) => {
        logger.debug(`Trigger ${i}:`, el);
    });

    // If theme changes away from Poe, clear zoom state
    const themeObserver = new MutationObserver(recs => {
        for (const r of recs) {
            if (r.type === 'attributes' && r.attributeName === 'data-theme') {
                const th = root.getAttribute('data-theme') || '';
                if (!/^poe/.test(th)) {
                    root.classList.remove(parallaxPauseClass, 'animating');
                    setPressed(false);
                }
            }
        }
    });
    themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return {
        zoomIn,
        zoomOut,
        toggleZoom,
        destroy() {
            document.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('keydown', onEsc);
            themeObserver.disconnect();
        },
    };
}
