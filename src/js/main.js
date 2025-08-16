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
    SUCCESS_MESSAGES,
    TIMING,
} from './core/constants.js';
import { Terminal } from './modules/terminal.js';
import { Animations } from './modules/animations.js';
import { ThemeManager } from './modules/theme.js';
import { AudioManager } from './modules/audio.js';
import ImageLoader from './modules/imageLoader.js';
import { DOM } from './utils/dom.js';
import { debounce, formatNumber, throttle } from './utils/helpers.js';

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

    async initializeModules() {
        this.logger.info('Initializing modules...');

        try {
            // Initialize terminal with error handling
            this.terminal = new Terminal('#terminal-output', '#terminal-input');
            this.terminal.init();
            this.modules.terminal = this.terminal;

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

            // Initialize audio if supported and enabled
            if (this.compatibility.features.webAudio && this.config.get('soundEnabled')) {
                this.audioManager = new AudioManager();
                this.audioManager.init();
                this.modules.audioManager = this.audioManager;
            }

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

        DOM.on('.nav-link', 'click', this.handleNavClick.bind(this));

        DOM.on('.btn-primary', 'click', () => {
            this.audioManager.play('click');
            this.animations.glitch('.hero-title');
        });

        DOM.on('.theme-toggle', 'click', () => {
            this.themeManager.toggleTheme();
            this.audioManager.play('switch');
        });

        DOM.on('.sound-toggle', 'click', () => {
            this.audioManager.toggle();
            DOM.toggleClass('.sound-toggle', 'sound-muted');
        });

        DOM.on('#contact-form', 'submit', this.handleContactSubmit.bind(this));

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

        this.initializeStats();
        this.initializeProjects();
        this.initializeSkills();
        this.initializeMatrixRain();

        this.logger.success('Components initialized');
    }

    initializeStats() {
        const stats = DOM.selectAll('.stat-number');
        stats.forEach(stat => {
            const target = parseInt(stat.dataset.count, 10);
            this.animateNumber(stat, target);
        });
    }

    animateNumber(element, target) {
        let current = 0;
        const increment = target / TIMING.NUMBER_ANIMATION_INCREMENT_DIVISOR;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = formatNumber(Math.floor(current));
        }, TIMING.NUMBER_ANIMATION_STEP);
    }

    initializeProjects() {
        const projectsData = [
            {
                title: 'Neural Network Visualizer',
                description: 'Interactive 3D visualization of neural networks',
                image: 'https://via.placeholder.com/400x200',
                tags: ['JavaScript', 'WebGL', 'AI'],
                link: '#',
            },
            {
                title: 'Quantum Computing Sim',
                description: 'Browser-based quantum computer simulator',
                image: 'https://via.placeholder.com/400x200',
                tags: ['TypeScript', 'React', 'Quantum'],
                link: '#',
            },
            {
                title: 'Blockchain Explorer',
                description: 'Real-time blockchain transaction explorer',
                image: 'https://via.placeholder.com/400x200',
                tags: ['Node.js', 'Web3', 'MongoDB'],
                link: '#',
            },
        ];

        const container = DOM.select('#projects-grid');
        if (container) {
            projectsData.forEach(project => {
                const card = this.createProjectCard(project);
                container.appendChild(card);
            });
        }
    }

    createProjectCard(project) {
        const card = DOM.create('div', 'card project-card fade-in');
        card.innerHTML = `
            <img src="${project.image}" alt="${project.title}" class="project-image">
            <div class="card-header">
                <h3 class="card-title">${project.title}</h3>
            </div>
            <div class="card-body">
                <p>${project.description}</p>
                <div class="project-tags">
                    ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
            <div class="card-footer">
                <a href="${project.link}" class="btn btn-sm btn-secondary">VIEW PROJECT</a>
            </div>
        `;
        return card;
    }

    initializeSkills() {
        const skillsData = [
            { name: 'JavaScript', level: 95, icon: '⚡' },
            { name: 'TypeScript', level: 90, icon: '🔷' },
            { name: 'React', level: 85, icon: '⚛️' },
            { name: 'Node.js', level: 88, icon: '🟢' },
            { name: 'Python', level: 80, icon: '🐍' },
            { name: 'Rust', level: 70, icon: '🦀' },
        ];

        const container = DOM.select('#skills-grid');
        if (container) {
            skillsData.forEach(skill => {
                const card = this.createSkillCard(skill);
                container.appendChild(card);
            });
        }
    }

    createSkillCard(skill) {
        const card = DOM.create('div', 'card skill-card zoom-in');
        card.innerHTML = `
            <div class="skill-icon">${skill.icon}</div>
            <div class="skill-name">${skill.name}</div>
            <div class="skill-level">
                <div class="skill-bar">
                    <div class="skill-progress" style="width: ${skill.level}%"></div>
                </div>
                <span class="text-sm text-muted">${skill.level}%</span>
            </div>
        `;
        return card;
    }

    initializeMatrixRain() {
        const canvas = DOM.create('canvas');
        const matrixContainer = DOM.select('.matrix-rain');
        if (!matrixContainer) {
            return;
        }

        matrixContainer.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        canvas.width = matrixContainer.offsetWidth;
        canvas.height = matrixContainer.offsetHeight;

        const matrix = '01';
        const matrixArray = matrix.split('');
        const fontSize = 10;
        const columns = canvas.width / fontSize;
        const drops = [];

        for (let i = 0; i < columns; i++) {
            drops[i] = 1;
        }

        const drawMatrix = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#00ff41';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i] += 1;
            }
        };

        setInterval(drawMatrix, TIMING.MATRIX_RAIN_INTERVAL);
    }

    handleNavClick(event) {
        event.preventDefault();
        const target = event.target.getAttribute('href');
        const section = DOM.select(target);

        if (section) {
            this.audioManager.play('nav');
            section.scrollIntoView({ behavior: 'smooth' });

            DOM.removeClass('.nav-link', 'active');
            event.target.classList.add('active');
        }
    }

    handleContactSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        this.logger.info('Contact form submitted', data);
        this.audioManager.play('success');

        this.terminal.addLine(SUCCESS_MESSAGES.MESSAGE_SENT, 'success');
        event.target.reset();
    }

    handleScrollEffects() {
        const { scrollY } = window;
        const header = DOM.select('.main-header');

        if (scrollY > 100) {
            DOM.addClass(header, 'scrolled');
        } else {
            DOM.removeClass(header, 'scrolled');
        }

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

        // Display error to user
        const errorMessage = `ERROR: ${errorInfo.userMessage || error.message}`;
        this.terminal?.addLine(errorMessage, 'error');

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
