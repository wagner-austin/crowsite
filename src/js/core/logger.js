export class Logger {
    constructor(context = 'App') {
        this.context = context;
        this.logLevel = this.getLogLevel();
        this.colors = {
            info: '#00ffcc',
            success: '#00ff00',
            warning: '#ffaa00',
            error: '#ff0066',
            debug: '#7c4dff',
            trace: '#888888',
        };
        this.history = [];
        this.maxHistorySize = 1000;
        this.performanceMarks = new Map();
    }

    getLogLevel() {
        const levels = {
            trace: 0,
            debug: 1,
            info: 2,
            warning: 3,
            error: 4,
            none: 5,
        };

        const level = localStorage.getItem('logLevel') || 'info';
        return levels[level] || 2;
    }

    setLogLevel(level) {
        localStorage.setItem('logLevel', level);
        this.logLevel = this.getLogLevel();
    }

    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [${this.context}] [${level.toUpperCase()}] ${message}`;

        this.addToHistory({
            timestamp,
            context: this.context,
            level,
            message,
            data,
        });

        return formatted;
    }

    addToHistory(entry) {
        this.history.push(entry);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    log(level, message, ...data) {
        const levels = {
            trace: 0,
            debug: 1,
            info: 2,
            warning: 3,
            error: 4,
        };

        if (levels[level] < this.logLevel) {
            return;
        }

        const formatted = this.formatMessage(level, message, data);
        const color = this.colors[level];

        const style = `color: ${color}; font-weight: bold;`;

        if (data.length > 0) {
            console.log(`%c${formatted}`, style, ...data);
        } else {
            console.log(`%c${formatted}`, style);
        }

        if (level === 'error' && data[0] instanceof Error) {
            console.trace(data[0]);
        }
    }

    trace(message, ...data) {
        this.log('trace', message, ...data);
    }

    debug(message, ...data) {
        this.log('debug', message, ...data);
    }

    info(message, ...data) {
        this.log('info', message, ...data);
    }

    success(message, ...data) {
        const formatted = this.formatMessage('success', message, data);
        const style = `color: ${this.colors.success}; font-weight: bold;`;

        if (data.length > 0) {
            console.log(`%c✓ ${formatted}`, style, ...data);
        } else {
            console.log(`%c✓ ${formatted}`, style);
        }
    }

    warning(message, ...data) {
        this.log('warning', message, ...data);
    }

    warn(message, ...data) {
        this.warning(message, ...data);
    }

    error(message, ...data) {
        this.log('error', message, ...data);
    }

    group(label) {
        console.group(`%c${label}`, `color: ${this.colors.info}; font-weight: bold;`);
    }

    groupCollapsed(label) {
        console.groupCollapsed(`%c${label}`, `color: ${this.colors.info}; font-weight: bold;`);
    }

    groupEnd() {
        console.groupEnd();
    }

    table(data, columns) {
        console.table(data, columns);
    }

    time(label) {
        const key = `${this.context}:${label}`;
        this.performanceMarks.set(key, performance.now());
        console.time(key);
    }

    timeEnd(label) {
        const key = `${this.context}:${label}`;
        const startTime = this.performanceMarks.get(key);

        if (startTime) {
            const duration = performance.now() - startTime;
            this.performanceMarks.delete(key);

            const formatted = `${key}: ${duration.toFixed(2)}ms`;
            console.log(`%c⏱ ${formatted}`, `color: ${this.colors.debug};`);

            this.addToHistory({
                timestamp: new Date().toISOString(),
                context: this.context,
                level: 'performance',
                message: `Timer ${label}`,
                data: { duration },
            });
        } else {
            console.timeEnd(key);
        }
    }

    clear() {
        console.clear();
        this.info('Console cleared');
    }

    count(label = 'default') {
        console.count(`${this.context}:${label}`);
    }

    assert(condition, message, ...data) {
        if (!condition) {
            this.error(`Assertion failed: ${message}`, ...data);
        }
    }

    dir(object, options) {
        console.dir(object, options);
    }

    profile(label) {
        if (console.profile) {
            console.profile(label);
        }
    }

    profileEnd(label) {
        if (console.profileEnd) {
            console.profileEnd(label);
        }
    }

    memory() {
        if (performance.memory) {
            const { memory } = performance;
            this.info('Memory Usage', {
                used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
                limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
            });
        }
    }

    getHistory(filter = {}) {
        let filtered = [...this.history];

        if (filter.level) {
            filtered = filtered.filter(entry => entry.level === filter.level);
        }

        if (filter.context) {
            filtered = filtered.filter(entry => entry.context === filter.context);
        }

        if (filter.since) {
            const sinceTime = new Date(filter.since).getTime();
            filtered = filtered.filter(entry => new Date(entry.timestamp).getTime() >= sinceTime);
        }

        return filtered;
    }

    exportHistory() {
        const data = JSON.stringify(this.history, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `log-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.info('Log history exported');
    }

    remote(endpoint, data) {
        if (!endpoint) {
            return;
        }

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...data,
                context: this.context,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
            }),
        }).catch(error => {
            console.error('Failed to send remote log:', error);
        });
    }
}
