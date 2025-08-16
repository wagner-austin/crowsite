import { Logger } from './logger.js';
import ErrorHandler from './errorHandler.js';

export class Config {
    constructor() {
        this.logger = new Logger('Config');
        this.defaults = {
            appName: 'DEV_TERMINAL',
            version: '1.0.0',
            debug: false,
            logLevel: 'info',
            theme: 'cyberpunk',
            soundEnabled: true,
            soundVolume: 0.5,
            animationsEnabled: true,
            particlesEnabled: true,
            autoSave: true,
            autoSaveInterval: 30000,
            language: 'en',
            fontSize: 'medium',
            highContrast: false,
            reducedMotion: false,
            apiEndpoint: '',
            apiKey: '',
            features: {
                terminal: true,
                animations: true,
                sound: true,
                themes: true,
                particles: true,
                easter_eggs: true,
            },
            terminal: {
                historySize: 100,
                prompt: '$',
                welcomeMessage: 'Welcome to DEV_TERMINAL v1.0\\nType "help" for available commands',
                commands: {
                    custom: {},
                },
            },
            performance: {
                throttleScroll: 100,
                debounceResize: 250,
                lazyLoadOffset: 100,
                maxParticles: 100,
            },
            storage: {
                prefix: 'devterm_',
                type: 'localStorage',
            },
        };

        this.config = this.load();
        this.observers = new Map();
    }

    load() {
        const stored = this.getFromStorage('config');
        if (stored) {
            return this.merge(this.defaults, stored);
        }
        return { ...this.defaults };
    }

    save() {
        this.setToStorage('config', this.config);
        this.notify('save', this.config);
    }

    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.config;

        for (const key of keys) {
            if (!(key in target) || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }

        const oldValue = target[lastKey];
        target[lastKey] = value;

        this.save();
        this.notify(path, value, oldValue);

        return this;
    }

    update(updates) {
        this.config = this.merge(this.config, updates);
        this.save();
        this.notify('update', this.config);
        return this;
    }

    reset(path = null) {
        if (path) {
            const defaultValue = this.get(path, undefined);
            if (defaultValue !== undefined) {
                this.set(path, defaultValue);
            }
        } else {
            this.config = { ...this.defaults };
            this.save();
            this.notify('reset', this.config);
        }
        return this;
    }

    merge(target, source) {
        const output = { ...target };

        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    output[key] = this.merge(target[key] || {}, source[key]);
                } else {
                    output[key] = source[key];
                }
            }
        }

        return output;
    }

    observe(path, callback) {
        if (!this.observers.has(path)) {
            this.observers.set(path, new Set());
        }
        this.observers.get(path).add(callback);

        return () => {
            const observers = this.observers.get(path);
            if (observers) {
                observers.delete(callback);
                if (observers.size === 0) {
                    this.observers.delete(path);
                }
            }
        };
    }

    notify(path, newValue, oldValue) {
        const observers = this.observers.get(path);
        if (observers) {
            observers.forEach(callback => {
                callback(newValue, oldValue, path);
            });
        }

        const globalObservers = this.observers.get('*');
        if (globalObservers) {
            globalObservers.forEach(callback => {
                callback(this.config, path);
            });
        }
    }

    validate(schema) {
        const errors = [];

        const validateValue = (value, schemaItem, path = '') => {
            if (schemaItem.required && value === undefined) {
                errors.push(`${path} is required`);
                return;
            }

            if (value === undefined) {
                return;
            }

            if (schemaItem.type) {
                const type = Array.isArray(value) ? 'array' : typeof value;
                if (type !== schemaItem.type) {
                    errors.push(`${path} must be of type ${schemaItem.type}`);
                }
            }

            if (schemaItem.min !== undefined && value < schemaItem.min) {
                errors.push(`${path} must be at least ${schemaItem.min}`);
            }

            if (schemaItem.max !== undefined && value > schemaItem.max) {
                errors.push(`${path} must be at most ${schemaItem.max}`);
            }

            if (schemaItem.enum && !schemaItem.enum.includes(value)) {
                errors.push(`${path} must be one of: ${schemaItem.enum.join(', ')}`);
            }

            if (schemaItem.pattern && !schemaItem.pattern.test(value)) {
                errors.push(`${path} does not match required pattern`);
            }

            if (schemaItem.properties && typeof value === 'object') {
                for (const key in schemaItem.properties) {
                    if (Object.prototype.hasOwnProperty.call(schemaItem.properties, key)) {
                        validateValue(
                            value[key],
                            schemaItem.properties[key],
                            path ? `${path}.${key}` : key
                        );
                    }
                }
            }
        };

        validateValue(this.config, schema);

        return errors.length === 0 ? { valid: true } : { valid: false, errors };
    }

    export() {
        return JSON.stringify(this.config, null, 2);
    }

    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.config = this.merge(this.defaults, imported);
            this.save();
            this.notify('import', this.config);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getFromStorage(key) {
        const storageKey = `${this.get('storage.prefix')}${key}`;
        const storageType = this.get('storage.type');

        try {
            const storage = storageType === 'sessionStorage' ? sessionStorage : localStorage;
            const item = storage.getItem(storageKey);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            this.logger.error('Failed to get from storage:', error);
            ErrorHandler.handleError({
                type: 'storage',
                message: 'Failed to get from storage',
                error,
            });
            return null;
        }
    }

    setToStorage(key, value) {
        const storageKey = `${this.get('storage.prefix')}${key}`;
        const storageType = this.get('storage.type');

        try {
            const storage = storageType === 'sessionStorage' ? sessionStorage : localStorage;
            storage.setItem(storageKey, JSON.stringify(value));
            return true;
        } catch (error) {
            this.logger.error('Failed to set to storage:', error);
            ErrorHandler.handleError({
                type: 'storage',
                message: 'Failed to set to storage',
                error,
            });
            return false;
        }
    }

    clearStorage() {
        const prefix = this.get('storage.prefix');
        const storageType = this.get('storage.type');
        const storage = storageType === 'sessionStorage' ? sessionStorage : localStorage;

        const keys = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key.startsWith(prefix)) {
                keys.push(key);
            }
        }

        keys.forEach(key => storage.removeItem(key));
    }

    getEnvironment() {
        return {
            isDevelopment:
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1',
            isProduction: window.location.protocol === 'https:',
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            ),
            isTablet:
                /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent),
            isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            ),
            browser: this.detectBrowser(),
            os: this.detectOS(),
        };
    }

    detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.indexOf('Firefox') > -1) {
            return 'firefox';
        }
        if (ua.indexOf('Chrome') > -1) {
            return 'chrome';
        }
        if (ua.indexOf('Safari') > -1) {
            return 'safari';
        }
        if (ua.indexOf('Edge') > -1) {
            return 'edge';
        }
        if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
            return 'opera';
        }
        return 'unknown';
    }

    detectOS() {
        const ua = navigator.userAgent;
        if (ua.indexOf('Win') > -1) {
            return 'windows';
        }
        if (ua.indexOf('Mac') > -1) {
            return 'macos';
        }
        if (ua.indexOf('Linux') > -1) {
            return 'linux';
        }
        if (ua.indexOf('Android') > -1) {
            return 'android';
        }
        if (ua.indexOf('iOS') > -1) {
            return 'ios';
        }
        return 'unknown';
    }
}
