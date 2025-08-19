/**
 * Main Application Entry Point
 *
 * Orchestrates the initialization of all modules and manages the application lifecycle.
 * Handles theme-specific module loading, error management, and performance monitoring.
 *
 * Features:
 * - Lazy loading of theme-specific modules
 * - Comprehensive error handling and observability
 * - Performance monitoring and optimization
 * - Responsive design support with adaptive images
 * - Clean module lifecycle management
 *
 * @module main
 */

import { Logger } from './core/logger.js';
import { Debugger } from './core/debugger.js';
import { Config } from './core/config.js';
import Compatibility from './core/compatibility.js';
// import Performance from './core/performance.js'; // Not used directly, available via compatibility
import ErrorHandler from './core/errorHandler.js';
import ObservabilityManager from './core/observability.js';
// import { wrapAsync, wrapAsyncMethod } from './core/asyncWrapper.js'; // For future use
import EventBus from './core/eventBus.js';
import {
    // PERFORMANCE as PERF_CONSTANTS, // For future use
    // STORAGE_KEYS, // For future use
    // SUCCESS_MESSAGES, // For future use
    TIMING,
} from './core/constants.js';
// Terminal module removed - not needed for minimal setup
import { Animations } from './modules/animations.js';
import { ThemeManager } from './modules/theme.js';
// AudioManager removed for now - can be added back later
// import { AudioManager } from './modules/audio.js';
import ImageLoader from './modules/imageLoader.js';
import { DOM } from './utils/dom.js';
import { debounce, throttle } from './utils/helpers.js';
import { enablePoeTheme } from './modules/theme-poe.js';
import { initPoeParallax } from './modules/poe-parallax.js';
import { initPoeDecor } from './modules/poe-decor.js';
import { initSceneAnimations } from './modules/scene-animations.js';
import { initAdaptiveImages } from './modules/adaptive-images.js';

/**
 * Main application controller
 * Manages initialization, module lifecycle, and error handling
 */
class App {
    constructor() {
        this.logger = new Logger('App');
        this.debugger = new Debugger();
        this.config = new Config();
        this.compatibility = Compatibility;
        this.isInitialized = false;
        this.modules = {};

        // Initialize observability
        this.observability = ObservabilityManager;
        this.errorHandler = ErrorHandler;
        this.eventBus = EventBus;

        // Check browser compatibility
        this.checkCompatibility();

        this.logger.info('Application constructor initialized');
    }

    checkCompatibility() {
        // Apply polyfills
        this.compatibility.applyPolyfills();

        // Show warning if needed
        this.compatibility.showWarningIfNeeded();

        // Log compatibility report
        const report = this.compatibility.getReport();
        this.logger.info('Browser Compatibility Report', {
            browser: `${report.browser.name} ${report.browser.version}`,
            os: `${report.os.name} ${report.os.version}`,
            performanceMode: report.performanceMode,
            featureSupport: `${this.compatibility.getFeatureSupportPercentage()}%`,
            isModern: report.support.modern,
        });

        // Adjust config based on performance mode
        if (report.performanceMode === 'low') {
            this.config.set('animations', false);
            this.config.set('effects', 'minimal');
            this.logger.warn('Running in low performance mode');
        }
    }

    /**
     * Initialize Poe theme specific modules
     * Sets up parallax, decorations, zoom animations, and adaptive images
     */
    initializePoeTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');

        // Clean up function for Poe theme modules
        if (this.poeCleanup) {
            this.poeCleanup();
            this.poeCleanup = null;
        }

        // Initialize Poe theme modules if active (works for both poe-light and poe-dark)
        if (currentTheme && currentTheme.startsWith('poe')) {
            enablePoeTheme();
            const stopParallax = initPoeParallax();
            const stopDecor = initPoeDecor();
            this.poeCleanup = () => {
                stopParallax?.();
                stopDecor?.();
            };
            this.logger.info('Poe theme modules initialized for:', currentTheme);
        }
    }

    observeThemeChanges() {
        // Observe theme changes for dynamic Poe theme initialization
        const observer = new MutationObserver(records => {
            for (const record of records) {
                if (record.type === 'attributes' && record.attributeName === 'data-theme') {
                    this.initializePoeTheme();
                }
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        this.themeObserver = observer;
    }

    /**
     * Initialize the application
     * Performs compatibility checks, initializes modules, and sets up event listeners
     * @async
     */
    async init() {
        try {
            this.logger.group('Application Initialization');
            this.logger.time('init');

            // Check if browser meets minimum requirements
            if (!this.compatibility.meetsRecommendedRequirements()) {
                this.logger.warn('Browser does not meet recommended requirements');
            }

            await this.showLoadingScreen();

            await this.initializeModules();

            this.attachEventListeners();

            await this.initializeComponents();

            await this.hideLoadingScreen();

            this.isInitialized = true;
            this.logger.success('Application initialized successfully');
            this.logger.timeEnd('init');
            this.logger.groupEnd();

            if (this.config.get('debug')) {
                this.debugger.showStats();
            }
        } catch (error) {
            this.logger.error('Failed to initialize application', error);
            ErrorHandler.handleError({
                type: 'initialization',
                message: 'Application initialization failed',
                error,
                severity: 'critical',
            });
            this.handleError(error);
        }
    }

    /**
     * Initialize core modules that are theme-independent
     * Sets up animations, theme manager, and image loader
     * @async
     */
    async initializeModules() {
        this.logger.info('Initializing modules...');

        try {
            // Terminal removed - clean slate for new content

            // Initialize animations based on performance
            if (this.config.get('animations') !== false) {
                this.animations = new Animations();
                this.animations.init();
                this.modules.animations = this.animations;
            }

            // Initialize theme manager
            this.themeManager = new ThemeManager();
            this.themeManager.init();
            this.modules.themeManager = this.themeManager;

            // Initialize Poe theme if active
            this.initializePoeTheme();

            // Subscribe to theme changes from ThemeManager
            this.themeManager.observe(() => this.initializePoeTheme());

            // Start watching for theme changes
            this.observeThemeChanges();

            // Click-to-zoom scene animations
            this.sceneAnimationsCleanup = initSceneAnimations();

            // Adaptive images for responsive breakpoints
            this.adaptiveImages = initAdaptiveImages({
                mobileBreakpoint: 768,
            });
            this.modules.adaptiveImages = this.adaptiveImages;

            // Audio manager removed for now - can be added back later

            // Initialize image loader
            if (this.compatibility.features.intersectionObserver) {
                this.imageLoader = ImageLoader;
                await this.imageLoader.init();
                this.modules.imageLoader = this.imageLoader;
            }

            this.logger.success('All modules initialized');
        } catch (error) {
            this.logger.error('Module initialization failed', error);
            // Continue with degraded functionality
        }
    }

    attachEventListeners() {
        this.logger.info('Attaching event listeners...');

        // Event listeners removed for sections that no longer exist
        // Clean slate for new interactive elements

        const handleScroll = throttle(() => {
            this.handleScrollEffects();
        }, TIMING.THROTTLE_DELAY);

        window.addEventListener('scroll', handleScroll);

        const handleResize = debounce(() => {
            this.handleResize();
        }, TIMING.DEBOUNCE_DELAY);

        window.addEventListener('resize', handleResize);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logger.info('Application paused (tab hidden)');
            } else {
                this.logger.info('Application resumed (tab visible)');
            }
        });

        this.logger.success('Event listeners attached');
    }

    initializeComponents() {
        this.logger.info('Initializing components...');

        // Sections removed - clean slate for new content
        this.logger.info('Ready for new content implementation');

        // Matrix rain removed - not needed in minimalist theme

        this.logger.success('Components initialized');
    }

    // Section initialization methods removed - clean slate for new content

    // Matrix rain removed - not used in minimalist theme

    // Navigation and form handlers removed - clean slate for new interactions

    handleScrollEffects() {
        // Scroll effects placeholder - will add new effects here

        const elements = DOM.selectAll('.fade-in, .slide-up, .zoom-in');
        elements.forEach(element => {
            if (this.isInViewport(element)) {
                element.classList.add('visible');
            }
        });
    }

    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    handleResize() {
        this.logger.info('Window resized', {
            width: window.innerWidth,
            height: window.innerHeight,
        });
    }

    async showLoadingScreen() {
        const loadingScreen = DOM.select('#loading-screen');
        if (loadingScreen) {
            DOM.removeClass(loadingScreen, 'hidden');
            await this.sleep(TIMING.LOADING_SCREEN_MIN_DURATION);
        }
    }

    async hideLoadingScreen() {
        const loadingScreen = DOM.select('#loading-screen');
        if (loadingScreen) {
            DOM.addClass(loadingScreen, 'hidden');
            await this.sleep(TIMING.LOADING_SCREEN_FADE_DURATION);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    handleError(error) {
        // Use centralized error handler
        const errorInfo = ErrorHandler.handleError({
            type: 'application',
            message: error.message || 'An unexpected error occurred',
            error,
            context: {
                isInitialized: this.isInitialized,
                modules: Object.keys(this.modules),
            },
        });

        // Display error to user (terminal removed, using console for now)
        console.error(`ERROR: ${errorInfo.userMessage || error.message}`);

        // Emit error event
        EventBus.emit('app:error', errorInfo);

        // Log for debugging
        this.logger.error('Application error handled', {
            id: errorInfo.id,
            message: errorInfo.message,
            severity: errorInfo.severity,
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

    window.app = app;
});
