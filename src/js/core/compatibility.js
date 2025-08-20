/**
 * Browser Compatibility and Feature Detection Module
 * Ensures cross-browser compatibility and provides polyfills
 */

import { Logger } from './logger.js';
import ErrorHandler from './errorHandler.js';

export class Compatibility {
    constructor() {
        this.logger = new Logger('Compatibility');
        this.features = this.detectFeatures();
        this.browser = this.detectBrowser();
        this.os = this.detectOS();
        this.isTouch = this.detectTouch();
        this.isMobile = this.detectMobile();
        this.performanceMode = this.determinePerformanceMode();
    }

    /**
     * Detect browser features
     */
    detectFeatures() {
        return {
            // JavaScript APIs
            promises: typeof Promise !== 'undefined',
            async: this.checkAsyncSupport(),
            modules: 'noModule' in HTMLScriptElement.prototype,
            proxy: typeof Proxy !== 'undefined',
            symbols: typeof Symbol !== 'undefined',
            weakMap: typeof WeakMap !== 'undefined',
            weakSet: typeof WeakSet !== 'undefined',

            // DOM APIs
            intersectionObserver: 'IntersectionObserver' in window,
            mutationObserver: 'MutationObserver' in window,
            resizeObserver: 'ResizeObserver' in window,
            customElements: 'customElements' in window,
            shadowDOM: 'attachShadow' in Element.prototype,
            webComponents: 'registerElement' in document || 'customElements' in window,

            // CSS Features
            cssGrid: CSS.supports('display', 'grid'),
            cssFlexbox: CSS.supports('display', 'flex'),
            cssVariables: CSS.supports('--test', '0'),
            cssBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
            cssClipPath: CSS.supports('clip-path', 'circle(50%)'),
            cssMixBlendMode: CSS.supports('mix-blend-mode', 'multiply'),
            cssFilter: CSS.supports('filter', 'blur(10px)'),
            cssAnimation: CSS.supports('animation', 'test 1s'),
            cssTransform: CSS.supports('transform', 'rotate(45deg)'),
            cssTransform3d: CSS.supports('transform', 'translateZ(1px)'),

            // Media APIs
            webGL: this.checkWebGL(),
            webGL2: this.checkWebGL2(),
            webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
            webRTC: 'RTCPeerConnection' in window,
            mediaDevices: 'mediaDevices' in navigator,

            // Storage APIs
            localStorage: this.checkLocalStorage(),
            sessionStorage: this.checkSessionStorage(),
            indexedDB: 'indexedDB' in window,
            webSQL: 'openDatabase' in window,
            cookies: navigator.cookieEnabled,

            // Network APIs
            serviceWorker: 'serviceWorker' in navigator,
            webWorker: typeof Worker !== 'undefined',
            sharedWorker: typeof SharedWorker !== 'undefined',
            webSocket: 'WebSocket' in window,
            fetch: 'fetch' in window,
            beacon: 'sendBeacon' in navigator,

            // Performance APIs
            performanceObserver: 'PerformanceObserver' in window,
            performanceTiming: 'performance' in window && 'timing' in performance,
            requestIdleCallback: 'requestIdleCallback' in window,
            requestAnimationFrame: 'requestAnimationFrame' in window,

            // Misc APIs
            notifications: 'Notification' in window,
            vibration: 'vibrate' in navigator,
            bluetooth: 'bluetooth' in navigator,
            clipboard: 'clipboard' in navigator,
            share: 'share' in navigator,
            wakeLock: 'wakeLock' in navigator,
            geolocation: 'geolocation' in navigator,
            deviceOrientation: 'DeviceOrientationEvent' in window,
            pointerEvents: 'PointerEvent' in window,
            touchEvents: 'TouchEvent' in window,
        };
    }

    /**
     * Check async/await support
     */
    checkAsyncSupport() {
        try {
            // Check for async function support without eval
            const AsyncFunction = async function () {
                await Promise.resolve(1);
                return undefined;
            }.constructor;
            return typeof AsyncFunction === 'function';
        } catch (error) {
            this.logger.debug('Feature check failed', error);
            return false;
        }
    }

    /**
     * Check WebGL support
     */
    checkWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return Boolean(
                window.WebGLRenderingContext &&
                    (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch (error) {
            this.logger.debug('Feature check failed', error);
            return false;
        }
    }

    /**
     * Check WebGL2 support
     */
    checkWebGL2() {
        try {
            const canvas = document.createElement('canvas');
            return Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
        } catch (error) {
            this.logger.debug('Feature check failed', error);
            return false;
        }
    }

    /**
     * Check localStorage support
     */
    checkLocalStorage() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            this.logger.debug('Feature check failed', error);
            return false;
        }
    }

    /**
     * Check sessionStorage support
     */
    checkSessionStorage() {
        try {
            const test = '__sessionStorage_test__';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch (error) {
            this.logger.debug('Feature check failed', error);
            return false;
        }
    }

    /**
     * Detect browser
     */
    detectBrowser() {
        const ua = navigator.userAgent;
        const { vendor } = navigator;

        let name = 'Unknown';
        let version = '';
        let engine = '';

        // Detect browser name and version
        if (/Edge\/(\d+)/.test(ua)) {
            name = 'Edge Legacy';
            version = RegExp.$1;
            engine = 'EdgeHTML';
        } else if (/Edg\/(\d+)/.test(ua)) {
            name = 'Edge';
            version = RegExp.$1;
            engine = 'Blink';
        } else if (/Chrome\/(\d+)/.test(ua) && vendor === 'Google Inc.') {
            name = 'Chrome';
            version = RegExp.$1;
            engine = 'Blink';
        } else if (/Safari\/(\d+)/.test(ua) && vendor === 'Apple Computer, Inc.') {
            name = 'Safari';
            version = ua.match(/Version\/(\d+)/)?.[1] || '';
            engine = 'WebKit';
        } else if (/Firefox\/(\d+)/.test(ua)) {
            name = 'Firefox';
            version = RegExp.$1;
            engine = 'Gecko';
        } else if (/Opera|OPR\/(\d+)/.test(ua)) {
            name = 'Opera';
            version = ua.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || '';
            engine = 'Blink';
        } else if (/Trident\/(\d+)/.test(ua)) {
            name = 'Internet Explorer';
            version = ua.match(/rv:(\d+)/)?.[1] || '';
            engine = 'Trident';
        }

        return {
            name,
            version: parseInt(version, 10) || 0,
            engine,
            ua,
            vendor,
            // Feature flags
            isChrome: name === 'Chrome',
            isFirefox: name === 'Firefox',
            isSafari: name === 'Safari',
            isEdge: name === 'Edge' || name === 'Edge Legacy',
            isOpera: name === 'Opera',
            isIE: name === 'Internet Explorer',
            // Engine flags
            isBlink: engine === 'Blink',
            isGecko: engine === 'Gecko',
            isWebKit: engine === 'WebKit',
            isTrident: engine === 'Trident',
        };
    }

    /**
     * Detect operating system
     */
    detectOS() {
        const ua = navigator.userAgent;
        const { platform } = navigator;

        let name = 'Unknown';
        let version = '';

        if (/Windows NT (\d+\.\d+)/.test(ua)) {
            name = 'Windows';
            version = RegExp.$1;
        } else if (/Mac OS X (\d+[._]\d+)/.test(ua)) {
            name = 'macOS';
            version = RegExp.$1.replace('_', '.');
        } else if (/iPhone OS (\d+[._]\d+)/.test(ua)) {
            name = 'iOS';
            version = RegExp.$1.replace('_', '.');
        } else if (/iPad.*OS (\d+[._]\d+)/.test(ua)) {
            name = 'iPadOS';
            version = RegExp.$1.replace('_', '.');
        } else if (/Android (\d+\.\d+)/.test(ua)) {
            name = 'Android';
            version = RegExp.$1;
        } else if (/Linux/.test(platform)) {
            name = 'Linux';
        }

        return {
            name,
            version,
            platform,
            isWindows: name === 'Windows',
            isMac: name === 'macOS',
            isLinux: name === 'Linux',
            isIOS: name === 'iOS' || name === 'iPadOS',
            isAndroid: name === 'Android',
            isMobile: /Android|iPhone|iPad|iPod/i.test(ua),
            isDesktop: !/Android|iPhone|iPad|iPod/i.test(ua),
        };
    }

    /**
     * Detect touch capability
     */
    detectTouch() {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    }

    /**
     * Detect mobile device
     */
    detectMobile() {
        const ua = navigator.userAgent;
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    }

    /**
     * Determine performance mode based on device capabilities
     */
    determinePerformanceMode() {
        const cpu = navigator.hardwareConcurrency || 4;
        const memory = (navigator.deviceMemory || 4) * 1024; // Convert to MB
        const connection = navigator.connection?.effectiveType || '4g';

        // Calculate performance score
        let score = 0;

        // CPU score
        if (cpu >= 8) {
            score += 3;
        } else if (cpu >= 4) {
            score += 2;
        } else {
            score += 1;
        }

        // Memory score
        if (memory >= 8192) {
            score += 3;
        } else if (memory >= 4096) {
            score += 2;
        } else {
            score += 1;
        }

        // Connection score
        if (connection === '4g') {
            score += 3;
        } else if (connection === '3g') {
            score += 2;
        } else {
            score += 1;
        }

        // Feature score
        if (this.features.webGL2) {
            score += 2;
        } else if (this.features.webGL) {
            score += 1;
        }

        if (this.features.webWorker) {
            score += 1;
        }
        if (this.features.serviceWorker) {
            score += 1;
        }

        // Determine mode
        if (score >= 10) {
            return 'high';
        }
        if (score >= 6) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Apply polyfills for missing features
     */
    applyPolyfills() {
        // RequestAnimationFrame polyfill
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = callback => window.setTimeout(callback, 1000 / 60);
            window.cancelAnimationFrame = id => {
                clearTimeout(id);
            };
        }

        // Performance.now polyfill
        if (!window.performance || !window.performance.now) {
            window.performance = window.performance || {};
            window.performance.now = () => Date.now();
        }

        // CustomEvent polyfill
        if (typeof window.CustomEvent !== 'function') {
            window.CustomEvent = function (event, params) {
                const eventParams = params || { bubbles: false, cancelable: false, detail: null };
                const evt = document.createEvent('CustomEvent');
                evt.initCustomEvent(
                    event,
                    eventParams.bubbles,
                    eventParams.cancelable,
                    eventParams.detail
                );
                return evt;
            };
        }

        // Array.from polyfill
        if (!Array.from) {
            Array.from = function (arrayLike) {
                return Array.prototype.slice.call(arrayLike);
            };
        }

        // Object.assign polyfill
        if (!Object.assign) {
            Object.assign = function (target, ...sources) {
                sources.forEach(source => {
                    if (source !== null && source !== undefined) {
                        for (const key in source) {
                            if (Object.prototype.hasOwnProperty.call(source, key)) {
                                target[key] = source[key];
                            }
                        }
                    }
                });
                return target;
            };
        }

        // String.includes polyfill
        if (!String.prototype.includes) {
            Object.defineProperty(String.prototype, 'includes', {
                value(search, start) {
                    return this.indexOf(search, start) !== -1;
                },
                writable: true,
                configurable: true,
            });
        }

        // Array.includes polyfill
        if (!Array.prototype.includes) {
            Object.defineProperty(Array.prototype, 'includes', {
                value(searchElement, fromIndex) {
                    return this.indexOf(searchElement, fromIndex) !== -1;
                },
                writable: true,
                configurable: true,
            });
        }

        // Promise polyfill (basic)
        if (!window.Promise) {
            this.logger.warn('Promise not supported. Consider adding a Promise polyfill.');
        }

        // Fetch polyfill check
        if (!window.fetch) {
            this.logger.warn('Fetch API not supported. Consider adding a fetch polyfill.');
        }
    }

    /**
     * Get compatibility report
     */
    getReport() {
        return {
            browser: this.browser,
            os: this.os,
            features: this.features,
            performanceMode: this.performanceMode,
            isTouch: this.isTouch,
            isMobile: this.isMobile,
            support: {
                modern: this.isModernBrowser(),
                legacy: this.isLegacyBrowser(),
                recommended: this.meetsRecommendedRequirements(),
            },
        };
    }

    /**
     * Check if browser is modern
     */
    isModernBrowser() {
        return (
            this.features.modules &&
            this.features.cssGrid &&
            this.features.promises &&
            this.features.fetch
        );
    }

    /**
     * Check if browser is legacy
     */
    isLegacyBrowser() {
        return (
            this.browser.isIE ||
            (this.browser.isEdge && this.browser.engine === 'EdgeHTML') ||
            (this.browser.isChrome && this.browser.version < 80) ||
            (this.browser.isFirefox && this.browser.version < 75) ||
            (this.browser.isSafari && this.browser.version < 13)
        );
    }

    /**
     * Check if browser meets recommended requirements
     */
    meetsRecommendedRequirements() {
        return (
            this.features.intersectionObserver &&
            this.features.cssVariables &&
            this.features.webGL &&
            this.features.localStorage &&
            this.features.fetch
        );
    }

    /**
     * Get feature support percentage
     */
    getFeatureSupportPercentage() {
        const total = Object.keys(this.features).length;
        const supported = Object.values(this.features).filter(Boolean).length;
        return Math.round((supported / total) * 100);
    }

    /**
     * Show compatibility warning if needed
     */
    showWarningIfNeeded() {
        if (this.isLegacyBrowser()) {
            this.logger.warn(
                'You are using a legacy browser. Some features may not work correctly.'
            );

            if (this.browser.isIE) {
                this.logger.error(
                    'Internet Explorer is not supported. Please use a modern browser.'
                );
                ErrorHandler.handleError({
                    type: 'compatibility',
                    message: 'Internet Explorer is not supported',
                    severity: 'critical',
                });
                this.showBrowserWarning();
            }
        }

        if (!this.meetsRecommendedRequirements()) {
            this.logger.warn('Your browser does not meet all recommended requirements.');
        }
    }

    /**
     * Show browser warning UI
     */
    showBrowserWarning() {
        const warning = document.createElement('div');
        warning.className = 'browser-warning';
        warning.innerHTML = `
            <div class="browser-warning-content">
                <h2>Browser Not Supported</h2>
                <p>Your browser does not support the features required for this application.</p>
                <p>Please upgrade to a modern browser such as:</p>
                <ul>
                    <li>Chrome 90+</li>
                    <li>Firefox 88+</li>
                    <li>Safari 14+</li>
                    <li>Edge 90+</li>
                </ul>
                <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        `;
        warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        document.body.appendChild(warning);
    }
}

export default new Compatibility();
