import { Logger } from './logger.js';
import ObservabilityManager from './observability.js';

export class Debugger {
    constructor() {
        this.logger = new Logger('Debugger');
        this.enabled = this.isDebugMode();
        this.stats = null;
        this.monitors = new Map();
        this.breakpoints = new Set();
        this.watches = new Map();

        if (this.enabled) {
            this.init();
        }
    }

    isDebugMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('debug') === 'true' || localStorage.getItem('debugMode') === 'true';
    }

    enable() {
        this.enabled = true;
        localStorage.setItem('debugMode', 'true');
        this.init();
        this.logger.info('🐛 Debug mode enabled');
        ObservabilityManager.recordEvent('debug.enabled');
    }

    disable() {
        this.enabled = false;
        localStorage.setItem('debugMode', 'false');
        this.cleanup();
        this.logger.info('🐛 Debug mode disabled');
        ObservabilityManager.recordEvent('debug.disabled');
    }

    init() {
        this.createDebugPanel();
        this.attachKeyboardShortcuts();
        this.startPerformanceMonitoring();
        this.injectDebugStyles();

        window.debugger = this;

        window.addEventListener('error', this.handleError.bind(this));
        window.addEventListener('unhandledrejection', this.handleRejection.bind(this));
    }

    cleanup() {
        if (this.stats) {
            document.body.removeChild(this.stats);
            this.stats = null;
        }

        const panel = document.getElementById('debug-panel');
        if (panel) {
            document.body.removeChild(panel);
        }

        this.monitors.clear();
        this.breakpoints.clear();
        this.watches.clear();
    }

    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div class="debug-header">
                <span>🐛 Debug Panel</span>
                <button class="debug-close">×</button>
            </div>
            <div class="debug-content">
                <div class="debug-section">
                    <h4>Performance</h4>
                    <div id="debug-performance"></div>
                </div>
                <div class="debug-section">
                    <h4>Network</h4>
                    <div id="debug-network"></div>
                </div>
                <div class="debug-section">
                    <h4>Console</h4>
                    <div id="debug-console"></div>
                </div>
                <div class="debug-section">
                    <h4>Watches</h4>
                    <div id="debug-watches"></div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        panel.querySelector('.debug-close').addEventListener('click', () => {
            panel.style.display = 'none';
        });
    }

    injectDebugStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #debug-panel {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 300px;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid #00ffcc;
                border-radius: 8px;
                color: #00ffcc;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                display: none;
            }
            
            #debug-panel.active {
                display: block;
            }
            
            .debug-header {
                padding: 10px;
                background: rgba(0, 255, 204, 0.1);
                border-bottom: 1px solid #00ffcc;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .debug-close {
                background: none;
                border: none;
                color: #00ffcc;
                font-size: 20px;
                cursor: pointer;
            }
            
            .debug-content {
                padding: 10px;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .debug-section {
                margin-bottom: 15px;
            }
            
            .debug-section h4 {
                margin-bottom: 5px;
                color: #ffaa00;
            }
            
            .debug-stat {
                display: flex;
                justify-content: space-between;
                margin-bottom: 3px;
            }
            
            .debug-highlight {
                outline: 2px dashed #ff00ff !important;
                outline-offset: 2px;
            }
            
            .debug-grid-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 9999;
                background-image: 
                    repeating-linear-gradient(
                        0deg,
                        rgba(255, 0, 255, 0.1) 0px,
                        transparent 1px,
                        transparent 20px,
                        rgba(255, 0, 255, 0.1) 21px
                    ),
                    repeating-linear-gradient(
                        90deg,
                        rgba(255, 0, 255, 0.1) 0px,
                        transparent 1px,
                        transparent 20px,
                        rgba(255, 0, 255, 0.1) 21px
                    );
            }
        `;

        document.head.appendChild(style);
    }

    attachKeyboardShortcuts() {
        document.addEventListener('keydown', e => {
            if (!this.enabled) {
                return;
            }

            if (e.ctrlKey && e.shiftKey) {
                switch (e.key) {
                    case 'D':
                        e.preventDefault();
                        this.togglePanel();
                        break;
                    case 'G':
                        e.preventDefault();
                        this.toggleGrid();
                        break;
                    case 'H':
                        e.preventDefault();
                        this.toggleHighlight();
                        break;
                    case 'S':
                        e.preventDefault();
                        this.showStats();
                        break;
                    case 'C':
                        e.preventDefault();
                        this.clearConsole();
                        break;
                    case 'E':
                        e.preventDefault();
                        this.exportDebugData();
                        break;
                    default:
                        // No action for other keys
                        break;
                }
            }
        });
    }

    togglePanel() {
        const panel = document.getElementById('debug-panel');
        if (panel) {
            panel.classList.toggle('active');
        }
    }

    toggleGrid() {
        let grid = document.querySelector('.debug-grid-overlay');
        if (grid) {
            grid.remove();
        } else {
            grid = document.createElement('div');
            grid.className = 'debug-grid-overlay';
            document.body.appendChild(grid);
        }
    }

    toggleHighlight() {
        document.addEventListener('mouseover', this.highlightElement);
        document.addEventListener('mouseout', this.removeHighlight);
        document.addEventListener('click', this.inspectElement);
    }

    highlightElement(e) {
        e.target.classList.add('debug-highlight');
    }

    removeHighlight(e) {
        e.target.classList.remove('debug-highlight');
    }

    inspectElement(e) {
        e.preventDefault();
        e.stopPropagation();
        this.logger.info('Element inspected', {
            element: e.target,
            classes: e.target.classList.toString(),
            computedStyles: window.getComputedStyle(e.target),
        });

        document.removeEventListener('mouseover', this.highlightElement);
        document.removeEventListener('mouseout', this.removeHighlight);
        document.removeEventListener('click', this.inspectElement);
    }

    showStats() {
        if (!this.stats) {
            this.stats = document.createElement('div');
            this.stats.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                padding: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                border: 1px solid #00ff00;
                border-radius: 4px;
            `;
            document.body.appendChild(this.stats);
        }

        const updateStats = () => {
            if (!this.stats) {
                return;
            }

            const memory = performance.memory
                ? {
                      used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
                      total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
                  }
                : { used: 'N/A', total: 'N/A' };

            const fps = this.calculateFPS();

            this.stats.innerHTML = `
                <div>FPS: ${fps}</div>
                <div>Memory: ${memory.used} / ${memory.total} MB</div>
                <div>DOM Nodes: ${document.querySelectorAll('*').length}</div>
                <div>Event Listeners: ${this.countEventListeners()}</div>
                <div>Screen: ${window.innerWidth}x${window.innerHeight}</div>
            `;

            requestAnimationFrame(updateStats);
        };

        updateStats();
    }

    calculateFPS() {
        if (!this.lastFrameTime) {
            this.lastFrameTime = performance.now();
            this.fps = 0;
        }

        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.fps = Math.round(1000 / delta);
        this.lastFrameTime = now;

        return this.fps;
    }

    countEventListeners() {
        const allElements = document.querySelectorAll('*');
        let count = 0;

        allElements.forEach(element => {
            const listeners = getEventListeners ? getEventListeners(element) : {};
            Object.keys(listeners).forEach(event => {
                count += listeners[event].length;
            });
        });

        return count;
    }

    startPerformanceMonitoring() {
        const observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'measure') {
                    this.logger.debug(`Performance: ${entry.name}`, {
                        duration: `${entry.duration.toFixed(2)}ms`,
                    });
                }
            }
        });

        observer.observe({ entryTypes: ['measure'] });
    }

    measure(name, fn) {
        if (!this.enabled) {
            return fn();
        }

        const startMark = `${name}-start`;
        const endMark = `${name}-end`;

        performance.mark(startMark);
        const result = fn();
        performance.mark(endMark);
        performance.measure(name, startMark, endMark);

        return result;
    }

    async measureAsync(name, fn) {
        if (!this.enabled) {
            return fn();
        }

        const startMark = `${name}-start`;
        const endMark = `${name}-end`;

        performance.mark(startMark);
        const result = await fn();
        performance.mark(endMark);
        performance.measure(name, startMark, endMark);

        return result;
    }

    watch(name, getter) {
        if (!this.enabled) {
            return;
        }

        this.watches.set(name, getter);
        this.updateWatches();
    }

    unwatch(name) {
        this.watches.delete(name);
        this.updateWatches();
    }

    updateWatches() {
        const watchesDiv = document.getElementById('debug-watches');
        if (!watchesDiv) {
            return;
        }

        let html = '';
        this.watches.forEach((getter, name) => {
            try {
                const value = getter();
                html += `<div class="debug-stat">
                    <span>${name}:</span>
                    <span>${JSON.stringify(value)}</span>
                </div>`;
            } catch {
                html += `<div class="debug-stat">
                    <span>${name}:</span>
                    <span style="color: #ff0066;">Error</span>
                </div>`;
            }
        });

        watchesDiv.innerHTML = html;
    }

    breakpoint(condition, message) {
        if (!this.enabled) {
            return;
        }

        if (condition) {
            // debugger; // Uncomment to debug
            this.logger.info(`🔴 Breakpoint: ${message}`);
            ObservabilityManager.recordEvent('debug.breakpoint', { message });
        }
    }

    trace() {
        if (!this.enabled) {
            return;
        }

        console.trace('Debug trace'); // eslint-disable-line no-console
    }

    handleError(event) {
        this.logger.error('⚠ Runtime Error', {
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
            stack: event.error?.stack,
        });
        ObservabilityManager.recordError({
            type: 'runtime',
            message: event.message,
            stack: event.error?.stack,
        });

        this.logToPanel('error', event.message);
    }

    handleRejection(event) {
        this.logger.error('⚠ Unhandled Promise Rejection', {
            reason: event.reason,
        });
        ObservabilityManager.recordError({
            type: 'unhandledRejection',
            message: 'Unhandled Promise Rejection',
            reason: event.reason,
        });

        this.logToPanel('error', `Promise rejected: ${event.reason}`);
    }

    logToPanel(type, message) {
        const consoleDiv = document.getElementById('debug-console');
        if (!consoleDiv) {
            return;
        }

        const entry = document.createElement('div');
        entry.style.color = type === 'error' ? '#ff0066' : '#00ffcc';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

        consoleDiv.appendChild(entry);

        if (consoleDiv.children.length > 10) {
            consoleDiv.removeChild(consoleDiv.firstChild);
        }
    }

    clearConsole() {
        console.clear(); // eslint-disable-line no-console
        const consoleDiv = document.getElementById('debug-console');
        if (consoleDiv) {
            consoleDiv.innerHTML = '';
        }
    }

    exportDebugData() {
        const data = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                availWidth: window.screen.availWidth,
                availHeight: window.screen.availHeight,
                colorDepth: window.screen.colorDepth,
                pixelDepth: window.screen.pixelDepth,
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            performance: performance.getEntriesByType('navigation')[0],
            memory: performance.memory || {},
            timing: performance.timing,
            localStorage: { ...localStorage },
            sessionStorage: { ...sessionStorage },
            cookies: document.cookie,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.logger.info('📁 Debug data exported');
        ObservabilityManager.recordEvent('debug.exported');
    }
}
