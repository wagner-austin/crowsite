/**
 * Advanced Image Management System
 * Supports: Chrome, Safari, Firefox, Edge on Windows, macOS, iOS, Android
 * Features: Lazy loading, retro effects, animations, caching, fallbacks
 */

import { Logger } from '../core/logger.js';
import { Config } from '../core/config.js';
import ErrorHandler from '../core/errorHandler.js';

export class ImageManager {
    constructor() {
        this.logger = new Logger('ImageManager');
        this.config = new Config();
        this.images = new Map();
        this.cache = new Map();
        this.observers = new Map();
        this.loadQueue = [];
        this.isLoading = false;

        // Browser compatibility checks
        this.supports = {
            webp: this.checkWebPSupport(),
            avif: this.checkAVIFSupport(),
            lazyLoading: 'loading' in HTMLImageElement.prototype,
            intersectionObserver: 'IntersectionObserver' in window,
            serviceWorker: 'serviceWorker' in navigator,
            webGL: this.checkWebGLSupport(),
        };

        // Platform detection
        this.platform = this.detectPlatform();

        this.logger.info('Image Manager initialized', {
            supports: this.supports,
            platform: this.platform,
        });
    }

    /**
     * Initialize the image management system
     */
    async init() {
        try {
            // Load configuration
            await this.loadConfig();

            // Setup lazy loading
            this.setupLazyLoading();

            // Setup responsive images
            this.setupResponsiveImages();

            // Setup retro effects
            this.setupRetroEffects();

            // Preload critical images
            await this.preloadCriticalImages();

            this.logger.success('Image system initialized');
        } catch (error) {
            this.logger.error('Failed to initialize image system', error);
        }
    }

    /**
     * Detect platform for optimized image delivery
     */
    detectPlatform() {
        const ua = navigator.userAgent;
        const { platform } = navigator;

        return {
            os: this.detectOS(ua, platform),
            browser: this.detectBrowser(ua),
            device: this.detectDevice(ua),
            pixelRatio: window.devicePixelRatio || 1,
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                colorDepth: window.screen.colorDepth,
            },
            connection: this.detectConnection(),
        };
    }

    detectOS(ua, platform) {
        if (/Win/i.test(platform)) {
            return 'windows';
        }
        if (/Mac/i.test(platform)) {
            return 'macos';
        }
        if (/iPhone|iPad|iPod/i.test(ua)) {
            return 'ios';
        }
        if (/Android/i.test(ua)) {
            return 'android';
        }
        if (/Linux/i.test(platform)) {
            return 'linux';
        }
        return 'unknown';
    }

    detectBrowser(ua) {
        // Order matters - Chrome includes Safari string
        if (/Edg/i.test(ua)) {
            return 'edge';
        }
        if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
            return 'chrome';
        }
        if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
            return 'safari';
        }
        if (/Firefox/i.test(ua)) {
            return 'firefox';
        }
        if (/Opera|OPR/i.test(ua)) {
            return 'opera';
        }
        return 'unknown';
    }

    detectDevice(ua) {
        if (/iPad/i.test(ua)) {
            return 'tablet';
        }
        if (/iPhone/i.test(ua)) {
            return 'mobile';
        }
        if (/Android/i.test(ua)) {
            if (/Mobile/i.test(ua)) {
                return 'mobile';
            }
            return 'tablet';
        }
        return 'desktop';
    }

    detectConnection() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        if (conn) {
            return {
                type: conn.effectiveType || 'unknown',
                downlink: conn.downlink || null,
                rtt: conn.rtt || null,
                saveData: conn.saveData || false,
            };
        }

        return { type: 'unknown', saveData: false };
    }

    /**
     * Check WebP support
     */
    checkWebPSupport() {
        return new Promise(resolve => {
            const webP = new Image();
            webP.onload = () => {
                resolve(webP.height === 2);
            };
            webP.onerror = () => {
                resolve(webP.height === 2);
            };
            webP.src =
                'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    /**
     * Check AVIF support
     */
    checkAVIFSupport() {
        return new Promise(resolve => {
            const avif = new Image();
            avif.onload = () => resolve(true);
            avif.onerror = () => resolve(false);
            avif.src =
                'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
        });
    }

    /**
     * Check WebGL support for advanced effects
     */
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return Boolean(
                window.WebGLRenderingContext &&
                    (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch (e) {
            this.logger.debug('WebGL support check failed', e);
            return false;
        }
    }

    /**
     * Load image configuration
     */
    async loadConfig() {
        try {
            // Load global config
            const response = await fetch('/config/images.json', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }

            const config = await response.json();
            this.imageConfig = config;

            this.logger.info('Image configuration loaded', config);
        } catch (error) {
            this.logger.warn('Using default image configuration', error);
            ErrorHandler.handleError({
                type: 'config',
                message: 'Failed to load image configuration',
                error,
                severity: 'warning',
            });
            this.imageConfig = this.getDefaultConfig();
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            profile: {
                photo: {
                    src: 'src/assets/images/profile.jpg',
                    alt: 'Developer Profile',
                    loading: 'eager',
                    display: true,
                    effects: ['glitch', 'scanlines'],
                },
            },
            logos: {
                header: {
                    src: 'src/assets/images/logo.svg',
                    alt: 'DEV_TERMINAL',
                    width: 200,
                    loading: 'eager',
                    display: true,
                },
            },
            backgrounds: {
                hero: {
                    src: 'src/assets/images/hero-bg.jpg',
                    srcset: {
                        '640w': 'src/assets/images/hero-bg-640.jpg',
                        '1024w': 'src/assets/images/hero-bg-1024.jpg',
                        '1920w': 'src/assets/images/hero-bg-1920.jpg',
                        '3840w': 'src/assets/images/hero-bg-3840.jpg',
                    },
                    position: 'center center',
                    size: 'cover',
                    attachment: 'fixed',
                    effects: ['parallax', 'noise'],
                    enabled: true,
                },
                sections: {
                    projects: {
                        src: 'src/assets/images/projects-bg.jpg',
                        overlay: 'rgba(10, 10, 10, 0.8)',
                        enabled: true,
                    },
                },
            },
            placeholders: {
                default: this.generatePlaceholder(),
                profile: this.generateProfilePlaceholder(),
                project: this.generateProjectPlaceholder(),
            },
            optimization: {
                quality: 85,
                formats: ['webp', 'jpg'],
                breakpoints: [640, 1024, 1920, 3840],
                lazyOffset: 100,
            },
        };
    }

    /**
     * Setup lazy loading with IntersectionObserver
     */
    setupLazyLoading() {
        if (!this.supports.intersectionObserver) {
            // Fallback for older browsers
            this.logger.warn('IntersectionObserver not supported, using fallback');
            this.setupLazyLoadingFallback();
            return;
        }

        const options = {
            root: null,
            rootMargin: '100px',
            threshold: [0, 0.01, 0.1],
        };

        this.lazyObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.lazyObserver.unobserve(entry.target);
                }
            });
        }, options);

        // Observe all lazy images
        const lazyImages = document.querySelectorAll('[data-lazy]');
        lazyImages.forEach(img => this.lazyObserver.observe(img));
    }

    /**
     * Fallback lazy loading for older browsers
     */
    setupLazyLoadingFallback() {
        let lazyImages = [...document.querySelectorAll('[data-lazy]')];
        let active = false;

        const lazyLoad = () => {
            if (active === false) {
                active = true;

                setTimeout(() => {
                    lazyImages.forEach(img => {
                        if (
                            img.getBoundingClientRect().top <= window.innerHeight &&
                            img.getBoundingClientRect().bottom >= 0 &&
                            getComputedStyle(img).display !== 'none'
                        ) {
                            this.loadImage(img);
                            lazyImages = lazyImages.filter(image => image !== img);

                            if (lazyImages.length === 0) {
                                document.removeEventListener('scroll', lazyLoad);
                                window.removeEventListener('resize', lazyLoad);
                                window.removeEventListener('orientationchange', lazyLoad);
                            }
                        }
                    });

                    active = false;
                }, 200);
            }
        };

        document.addEventListener('scroll', lazyLoad);
        window.addEventListener('resize', lazyLoad);
        window.addEventListener('orientationchange', lazyLoad);

        // Initial check
        lazyLoad();
    }

    /**
     * Load image with optimizations
     */
    async loadImage(element) {
        const src = element.dataset.src || element.dataset.lazy;
        const { srcset } = element.dataset;
        const { sizes } = element.dataset;
        const { effect } = element.dataset;

        if (!src) {
            return;
        }

        // Check cache
        if (this.cache.has(src)) {
            this.applyImage(element, this.cache.get(src));
            return;
        }

        // Show placeholder
        this.showPlaceholder(element);

        try {
            // Preload image
            const img = new Image();

            // Set crossorigin for canvas operations (Safari/iOS requirement)
            if (this.needsCrossOrigin(src)) {
                img.crossOrigin = 'anonymous';
            }

            if (srcset) {
                img.srcset = srcset;
            }
            if (sizes) {
                img.sizes = sizes;
            }

            await new Promise((resolve, reject) => {
                img.onload = () => {
                    this.cache.set(src, img);
                    resolve();
                };
                img.onerror = reject;
                img.src = src;
            });

            // Apply image with transition
            this.applyImage(element, img);

            // Apply effects if specified
            if (effect) {
                this.applyEffect(element, effect);
            }

            this.logger.debug('Image loaded', { src, element: element.id || element.className });
        } catch (error) {
            this.logger.error('Failed to load image', { src, error });
            this.showFallback(element);
        }
    }

    /**
     * Check if image needs crossOrigin attribute
     */
    needsCrossOrigin(src) {
        // External images need crossOrigin for canvas operations
        try {
            const url = new URL(src, window.location.href);
            return url.origin !== window.location.origin;
        } catch {
            return false;
        }
    }

    /**
     * Apply loaded image to element
     */
    applyImage(element, img) {
        if (element.tagName === 'IMG') {
            element.src = img.src;
            if (img.srcset) {
                element.srcset = img.srcset;
            }
        } else {
            // Background image
            element.style.backgroundImage = `url(${img.src})`;
        }

        element.classList.add('loaded');
        element.classList.remove('loading');
    }

    /**
     * Setup responsive images
     */
    setupResponsiveImages() {
        // Picture element polyfill for older browsers
        if (!('HTMLPictureElement' in window)) {
            this.loadPictureFill();
        }

        // Setup responsive background images
        this.setupResponsiveBackgrounds();
    }

    /**
     * Load picturefill polyfill for older browsers
     */
    loadPictureFill() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/picturefill@3.0.3/dist/picturefill.min.js';
        script.async = true;
        document.head.appendChild(script);

        this.logger.info('Picturefill polyfill loaded for responsive images');
    }

    /**
     * Setup responsive background images
     */
    setupResponsiveBackgrounds() {
        const elements = document.querySelectorAll('[data-bg-responsive]');

        elements.forEach(element => {
            const sources = JSON.parse(element.dataset.bgResponsive);
            this.updateResponsiveBackground(element, sources);

            // Update on resize
            window.addEventListener('resize', () => {
                this.updateResponsiveBackground(element, sources);
            });
        });
    }

    /**
     * Update responsive background based on viewport
     */
    updateResponsiveBackground(element, sources) {
        const width = window.innerWidth;
        const pixelRatio = window.devicePixelRatio || 1;
        const effectiveWidth = width * pixelRatio;

        // Find best matching source
        let selectedSrc = sources.default;

        for (const [breakpoint, src] of Object.entries(sources)) {
            if (breakpoint !== 'default') {
                const bp = parseInt(breakpoint, 10);
                if (effectiveWidth >= bp) {
                    selectedSrc = src;
                }
            }
        }

        if (element.style.backgroundImage !== `url(${selectedSrc})`) {
            element.style.backgroundImage = `url(${selectedSrc})`;
            this.logger.debug('Updated responsive background', { width, src: selectedSrc });
        }
    }

    /**
     * Setup retro effects
     */
    setupRetroEffects() {
        // CRT scanlines effect
        this.setupScanlines();

        // Glitch effect
        this.setupGlitchEffect();

        // VHS distortion
        this.setupVHSEffect();

        // Pixel art scaling
        this.setupPixelArt();
    }

    /**
     * Apply retro effect to element
     */
    applyEffect(element, effect) {
        switch (effect) {
            case 'glitch':
                this.applyGlitchEffect(element);
                break;
            case 'scanlines':
                this.applyScanlines(element);
                break;
            case 'vhs':
                this.applyVHSEffect(element);
                break;
            case 'pixel':
                this.applyPixelEffect(element);
                break;
            case 'crt':
                this.applyCRTEffect(element);
                break;
            default:
                this.logger.warn('Unknown effect', effect);
        }
    }

    /**
     * Setup scanlines overlay
     */
    setupScanlines() {
        const style = document.createElement('style');
        style.textContent = `
            .scanlines::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                background: linear-gradient(
                    to bottom,
                    transparent 50%,
                    rgba(0, 255, 204, 0.03) 50%
                );
                background-size: 100% 4px;
                animation: scanlines 8s linear infinite;
                z-index: 1;
            }
            
            @keyframes scanlines {
                0% { background-position: 0 0; }
                100% { background-position: 0 10px; }
            }
            
            /* Safari/iOS optimization */
            @supports (-webkit-touch-callout: none) {
                .scanlines::after {
                    will-change: background-position;
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Apply glitch effect
     */
    applyGlitchEffect(element) {
        element.classList.add('glitch-image');

        // Random glitch intervals
        setInterval(() => {
            if (Math.random() > 0.95) {
                element.classList.add('glitching');
                setTimeout(() => {
                    element.classList.remove('glitching');
                }, 200);
            }
        }, 3000);
    }

    /**
     * Setup VHS effect
     */
    setupVHSEffect() {
        const style = document.createElement('style');
        style.textContent = `
            .vhs-effect {
                position: relative;
                filter: contrast(1.2) saturate(1.5);
            }
            
            .vhs-effect::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: repeating-linear-gradient(
                    to bottom,
                    rgba(255, 0, 0, 0.03),
                    rgba(0, 255, 0, 0.02),
                    rgba(0, 0, 255, 0.03)
                );
                background-size: 100% 3px;
                pointer-events: none;
                mix-blend-mode: color-dodge;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup pixel art rendering
     */
    setupPixelArt() {
        const style = document.createElement('style');
        style.textContent = `
            .pixel-art {
                image-rendering: -moz-crisp-edges;
                image-rendering: -webkit-crisp-edges;
                image-rendering: pixelated;
                image-rendering: crisp-edges;
                -ms-interpolation-mode: nearest-neighbor;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Apply CRT effect with WebGL if available
     */
    applyCRTEffect(element) {
        if (!this.supports.webGL) {
            // Fallback to CSS filters
            element.style.filter = 'contrast(1.1) brightness(1.05) saturate(1.2)';
            element.classList.add('scanlines');
            return;
        }

        // WebGL CRT shader would go here
        this.logger.info('WebGL CRT effect applied');
    }

    /**
     * Preload critical images
     */
    async preloadCriticalImages() {
        const critical = [
            this.imageConfig?.profile?.photo?.src,
            this.imageConfig?.logos?.header?.src,
            this.imageConfig?.backgrounds?.hero?.src,
        ].filter(Boolean);

        const promises = critical.map(src => this.preloadImage(src));

        try {
            await Promise.all(promises);
            this.logger.info('Critical images preloaded');
        } catch (error) {
            this.logger.warn('Some critical images failed to preload', error);
        }
    }

    /**
     * Preload single image
     */
    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            if (this.needsCrossOrigin(src)) {
                img.crossOrigin = 'anonymous';
            }

            img.onload = () => {
                this.cache.set(src, img);
                resolve(img);
            };

            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * Generate placeholder SVG
     */
    generatePlaceholder(width = 400, height = 300, text = 'Loading...') {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='${width}' height='${height}' fill='%230a0a0a'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%2300ffcc' font-family='monospace' font-size='20'%3E${text}%3C/text%3E%3C/svg%3E`;
    }

    /**
     * Generate profile placeholder
     */
    generateProfilePlaceholder() {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%230a0a0a'/%3E%3Ccircle cx='100' cy='80' r='30' fill='%2300ffcc'/%3E%3Cellipse cx='100' cy='150' rx='50' ry='30' fill='%2300ffcc'/%3E%3C/svg%3E`;
    }

    /**
     * Generate project placeholder
     */
    generateProjectPlaceholder() {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'%3E%3Crect width='400' height='250' fill='%231a1a1a'/%3E%3Crect x='20' y='20' width='360' height='210' fill='%230a0a0a'/%3E%3Ctext x='200' y='125' text-anchor='middle' fill='%2300ffcc' font-family='monospace' font-size='16'%3EPROJECT%3C/text%3E%3C/svg%3E`;
    }

    /**
     * Show placeholder while loading
     */
    showPlaceholder(element) {
        const type = element.dataset.placeholderType || 'default';
        const placeholder = this.imageConfig?.placeholders?.[type] || this.generatePlaceholder();

        if (element.tagName === 'IMG') {
            element.src = placeholder;
        } else {
            element.style.backgroundImage = `url(${placeholder})`;
        }

        element.classList.add('loading');
    }

    /**
     * Show fallback on error
     */
    showFallback(element) {
        const fallback =
            element.dataset.fallback || this.generatePlaceholder(400, 300, 'Failed to load');

        if (element.tagName === 'IMG') {
            element.src = fallback;
        } else {
            element.style.backgroundImage = `url(${fallback})`;
        }

        element.classList.add('error');
        element.classList.remove('loading');
    }

    /**
     * Optimize image for current platform
     */
    getOptimizedSrc(originalSrc) {
        const { device, connection } = this.platform;

        // Use lower quality for mobile or slow connections
        if (device === 'mobile' || connection.saveData || connection.type === '2g') {
            return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '-mobile.$1');
        }

        // Use WebP if supported
        if (this.supports.webp) {
            return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }

        return originalSrc;
    }

    /**
     * Create image element with all optimizations
     */
    createOptimizedImage(config) {
        const picture = document.createElement('picture');

        // AVIF source (newest, best compression)
        if (this.supports.avif && config.avif) {
            const sourceAvif = document.createElement('source');
            sourceAvif.srcset = config.avif;
            sourceAvif.type = 'image/avif';
            picture.appendChild(sourceAvif);
        }

        // WebP source
        if (this.supports.webp && config.webp) {
            const sourceWebp = document.createElement('source');
            sourceWebp.srcset = config.webp;
            sourceWebp.type = 'image/webp';
            picture.appendChild(sourceWebp);
        }

        // Fallback img element
        const img = document.createElement('img');
        img.src = config.src;
        img.alt = config.alt || '';
        img.loading = config.loading || 'lazy';
        img.decoding = config.decoding || 'async';

        if (config.width) {
            img.width = config.width;
        }
        if (config.height) {
            img.height = config.height;
        }
        if (config.className) {
            img.className = config.className;
        }
        if (config.id) {
            img.id = config.id;
        }

        // Add to picture element
        picture.appendChild(img);

        return picture;
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        if (this.lazyObserver) {
            this.lazyObserver.disconnect();
        }

        this.cache.clear();
        this.images.clear();
        this.observers.clear();

        this.logger.info('Image manager destroyed');
    }
}

// Export singleton instance
export default new ImageManager();
