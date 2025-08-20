/**
 * Performance Optimization Module
 * Monitors and optimizes application performance
 */

import { Logger } from './logger.js';
import ErrorHandler from './errorHandler.js';
import ObservabilityManager from './observability.js';

export class Performance {
    constructor() {
        this.logger = new Logger('Performance');
        this.metrics = {
            fps: 0,
            memory: 0,
            loadTime: 0,
            renderTime: 0,
            scriptTime: 0,
            layoutTime: 0,
            paintTime: 0,
        };

        this.observers = {};
        this.rafCallbacks = new Set();
        this.idleCallbacks = new Set();
        this.intersectionTargets = new Map();
        this.resizeTargets = new Map();

        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.isMonitoring = false;
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        // Setup performance observer
        this.setupPerformanceObserver();

        // Setup FPS monitoring
        this.startFPSMonitoring();

        // Setup memory monitoring
        this.setupMemoryMonitoring();

        // Setup lazy loading
        this.setupLazyLoading();

        // Setup resize observer
        this.setupResizeObserver();

        // Optimize images
        this.optimizeImages();

        // Optimize animations
        this.optimizeAnimations();

        // Setup resource hints
        this.setupResourceHints();
    }

    /**
     * Setup performance observer
     */
    setupPerformanceObserver() {
        if (!('PerformanceObserver' in window)) {
            return;
        }

        try {
            // Observe paint timing
            const paintObserver = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    if (entry.name === 'first-contentful-paint') {
                        this.metrics.paintTime = entry.startTime;
                    }
                }
            });
            paintObserver.observe({ entryTypes: ['paint'] });

            // Observe layout shifts
            const layoutObserver = new PerformanceObserver(list => {
                let cls = 0;
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        cls += entry.value;
                    }
                }
                this.metrics.layoutShift = cls;
            });
            layoutObserver.observe({ entryTypes: ['layout-shift'] });

            // Observe long tasks
            const taskObserver = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    // Commented out to reduce log spam - uncomment if debugging performance
                    // this.logger.warn('Long task detected', {
                    //     duration: entry.duration,
                    //     startTime: entry.startTime,
                    // });
                    ObservabilityManager.recordEvent('performance.longTask', {
                        duration: entry.duration,
                        startTime: entry.startTime,
                    });
                }
            });
            taskObserver.observe({ entryTypes: ['longtask'] });
        } catch (error) {
            this.logger.warn('Performance Observer setup failed', error);
            ErrorHandler.handleError({
                type: 'performance',
                message: 'Performance Observer setup failed',
                error,
            });
        }
    }

    /**
     * Start FPS monitoring
     */
    startFPSMonitoring() {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        const measureFPS = currentTime => {
            this.frameCount += 1;

            if (currentTime >= this.lastFrameTime + 1000) {
                this.metrics.fps = Math.round(
                    (this.frameCount * 1000) / (currentTime - this.lastFrameTime)
                );
                this.frameCount = 0;
                this.lastFrameTime = currentTime;
            }

            if (this.isMonitoring) {
                requestAnimationFrame(measureFPS);
            }
        };

        requestAnimationFrame(measureFPS);
    }

    /**
     * Setup memory monitoring
     */
    setupMemoryMonitoring() {
        if (!performance.memory) {
            return;
        }

        setInterval(() => {
            const { memory } = performance;
            this.metrics.memory = {
                used: Math.round(memory.usedJSHeapSize / 1048576),
                total: Math.round(memory.totalJSHeapSize / 1048576),
                limit: Math.round(memory.jsHeapSizeLimit / 1048576),
            };

            // Warn if memory usage is high
            const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            if (usage > 90) {
                this.logger.warn('High memory usage detected', { usage: `${usage.toFixed(2)}%` });
                ObservabilityManager.recordEvent('performance.highMemory', {
                    usage: usage.toFixed(2),
                    memory: this.metrics.memory,
                });
            }
        }, 5000);
    }

    /**
     * Setup lazy loading for images and iframes
     */
    setupLazyLoading() {
        if (!('IntersectionObserver' in window)) {
            // Fallback for older browsers
            this.loadAllLazyElements();
            return;
        }

        const lazyImageObserver = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;

                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            delete img.dataset.src;
                        }

                        if (img.dataset.srcset) {
                            img.srcset = img.dataset.srcset;
                            delete img.dataset.srcset;
                        }

                        img.classList.add('loaded');
                        lazyImageObserver.unobserve(img);
                    }
                });
            },
            {
                rootMargin: '50px',
            }
        );

        // Observe all lazy images
        document.querySelectorAll('img[data-src], img[data-srcset]').forEach(img => {
            lazyImageObserver.observe(img);
        });

        this.observers.lazyImage = lazyImageObserver;
    }

    /**
     * Fallback for browsers without IntersectionObserver
     */
    loadAllLazyElements() {
        document.querySelectorAll('img[data-src], img[data-srcset]').forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                delete img.dataset.src;
            }

            if (img.dataset.srcset) {
                img.srcset = img.dataset.srcset;
                delete img.dataset.srcset;
            }
        });
    }

    /**
     * Setup resize observer for responsive elements
     */
    setupResizeObserver() {
        if (!('ResizeObserver' in window)) {
            return;
        }

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const callback = this.resizeTargets.get(entry.target);
                if (callback) {
                    callback(entry);
                }
            }
        });

        this.observers.resize = resizeObserver;
    }

    /**
     * Optimize images
     */
    optimizeImages() {
        const images = document.querySelectorAll('img');

        images.forEach(img => {
            // Add loading attribute for native lazy loading
            if (!img.loading) {
                img.loading = 'lazy';
            }

            // Add decoding attribute for async decoding
            if (!img.decoding) {
                img.decoding = 'async';
            }

            // Add error handling
            img.addEventListener(
                'error',
                () => {
                    this.logger.warn('Image failed to load', { src: img.src });
                    ObservabilityManager.incrementCounter('images.loadError');
                    // Set fallback image if available
                    if (img.dataset.fallback) {
                        img.src = img.dataset.fallback;
                    }
                },
                { once: true }
            );
        });
    }

    /**
     * Optimize animations
     */
    optimizeAnimations() {
        // Pause animations when tab is not visible
        document.addEventListener('visibilitychange', () => {
            const animations = document.getAnimations ? document.getAnimations() : [];

            if (document.hidden) {
                animations.forEach(animation => {
                    if (animation.playState === 'running') {
                        animation.pause();
                        animation.dataset.wasPlaying = 'true';
                    }
                });
            } else {
                animations.forEach(animation => {
                    if (animation.dataset.wasPlaying === 'true') {
                        animation.play();
                        delete animation.dataset.wasPlaying;
                    }
                });
            }
        });

        // Use will-change for animated elements
        document.querySelectorAll('[data-animate]').forEach(element => {
            element.style.willChange = 'transform, opacity';

            // Remove will-change after animation
            element.addEventListener(
                'animationend',
                () => {
                    element.style.willChange = 'auto';
                },
                { once: true }
            );
        });
    }

    /**
     * Setup resource hints
     */
    setupResourceHints() {
        // Preconnect to external domains
        const preconnectDomains = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

        preconnectDomains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = domain;
            link.crossOrigin = '';
            document.head.appendChild(link);
        });

        // Prefetch next page resources
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.prefetchResources();
            });
        }
    }

    /**
     * Prefetch resources for next navigation
     */
    prefetchResources() {
        const links = document.querySelectorAll('a[href^="/"], a[href^="./"]');

        links.forEach(link => {
            link.addEventListener(
                'mouseenter',
                () => {
                    const url = new URL(link.href);

                    // Create prefetch link
                    const prefetchLink = document.createElement('link');
                    prefetchLink.rel = 'prefetch';
                    prefetchLink.href = url.pathname;

                    // Check if already prefetched
                    if (!document.querySelector(`link[rel="prefetch"][href="${url.pathname}"]`)) {
                        document.head.appendChild(prefetchLink);
                    }
                },
                { once: true }
            );
        });
    }

    /**
     * Request animation frame with fallback
     */
    requestAnimationFrame(callback) {
        if ('requestAnimationFrame' in window) {
            return window.requestAnimationFrame(callback);
        }

        return setTimeout(callback, 16);
    }

    /**
     * Cancel animation frame with fallback
     */
    cancelAnimationFrame(id) {
        if ('cancelAnimationFrame' in window) {
            return window.cancelAnimationFrame(id);
        }

        return clearTimeout(id);
    }

    /**
     * Request idle callback with fallback
     */
    requestIdleCallback(callback, options) {
        if ('requestIdleCallback' in window) {
            return window.requestIdleCallback(callback, options);
        }

        // Fallback using setTimeout
        const start = Date.now();
        return setTimeout(() => {
            callback({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
            });
        }, 1);
    }

    /**
     * Cancel idle callback with fallback
     */
    cancelIdleCallback(id) {
        if ('cancelIdleCallback' in window) {
            return window.cancelIdleCallback(id);
        }

        return clearTimeout(id);
    }

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout = null;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle = false;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const [navigation] = performance.getEntriesByType('navigation');

        return {
            ...this.metrics,
            loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
            domContentLoaded: navigation
                ? navigation.domContentLoadedEventEnd - navigation.fetchStart
                : 0,
            resources: performance.getEntriesByType('resource').length,
            ...this.getWebVitals(),
        };
    }

    /**
     * Get Web Vitals metrics
     */
    getWebVitals() {
        const vitals = {};

        // First Contentful Paint (FCP)
        const [fcpEntry] = performance.getEntriesByName('first-contentful-paint');
        if (fcpEntry) {
            vitals.fcp = fcpEntry.startTime;
        }

        // Largest Contentful Paint (LCP)
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
            vitals.lcp = lcpEntries[lcpEntries.length - 1].startTime;
        }

        // Time to Interactive (TTI) - simplified calculation
        vitals.tti = performance.timing.domInteractive - performance.timing.fetchStart;

        return vitals;
    }

    /**
     * Log performance report
     */
    logReport() {
        const metrics = this.getMetrics();

        this.logger.group('Performance Report');
        this.logger.info('Performance Metrics', {
            fps: metrics.fps,
            memory: metrics.memory,
            loadTime: `${metrics.loadTime}ms`,
            domContentLoaded: `${metrics.domContentLoaded}ms`,
            fcp: `${metrics.fcp}ms`,
            lcp: `${metrics.lcp}ms`,
            tti: `${metrics.tti}ms`,
            resources: metrics.resources,
        });

        // Record metrics in observability system
        ObservabilityManager.recordMetric('performance.fps', metrics.fps);
        ObservabilityManager.recordMetric('performance.loadTime', metrics.loadTime);
        ObservabilityManager.recordMetric('performance.fcp', metrics.fcp);
        ObservabilityManager.recordMetric('performance.lcp', metrics.lcp);
        ObservabilityManager.recordMetric('performance.tti', metrics.tti);
        this.logger.groupEnd();
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.isMonitoring = false;

        // Disconnect observers
        Object.values(this.observers).forEach(observer => {
            if (observer.disconnect) {
                observer.disconnect();
            }
        });

        // Clear callbacks
        this.rafCallbacks.clear();
        this.idleCallbacks.clear();
        this.intersectionTargets.clear();
        this.resizeTargets.clear();
    }
}

export default new Performance();
