import { Logger } from '../core/logger.js';

export class ThemeManager {
    constructor() {
        this.logger = new Logger('ThemeManager');
        this.themes = ['cyberpunk', 'synthwave', 'matrix', 'vaporwave'];
        this.currentTheme = this.loadTheme();
        this.observers = [];
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.attachEventListeners();
        this.logger.info('Theme manager initialized with theme:', this.currentTheme);
    }

    loadTheme() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (saved && this.themes.includes(saved)) {
            return saved;
        }

        return prefersDark ? 'cyberpunk' : 'synthwave';
    }

    saveTheme(theme) {
        localStorage.setItem('theme', theme);
        this.logger.info('Theme saved:', theme);
    }

    applyTheme(theme) {
        if (!this.themes.includes(theme)) {
            this.logger.warn('Invalid theme:', theme);
            return;
        }

        document.documentElement.dataset.theme = theme;
        this.currentTheme = theme;
        this.saveTheme(theme);

        this.notifyObservers(theme);
        this.applyThemeEffects(theme);
    }

    toggleTheme() {
        const currentIndex = this.themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        const nextTheme = this.themes[nextIndex];

        this.applyTheme(nextTheme);
        this.logger.info('Theme toggled to:', nextTheme);
    }

    setTheme(theme) {
        this.applyTheme(theme);
    }

    getTheme() {
        return this.currentTheme;
    }

    getAvailableThemes() {
        return [...this.themes];
    }

    attachEventListeners() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', e => {
            this.logger.info('System theme preference changed:', e.matches ? 'dark' : 'light');
        });

        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    applyThemeEffects(theme) {
        const effects = {
            cyberpunk: () => {
                this.setCSSVariables({
                    '--color-primary': '#00ffcc',
                    '--color-secondary': '#ff00ff',
                    '--color-accent': '#ffff00',
                    '--color-bg-primary': '#0a0a0a',
                    '--color-bg-secondary': '#1a1a1a',
                });
                this.applyGlitchEffect();
            },
            synthwave: () => {
                this.setCSSVariables({
                    '--color-primary': '#ff6ec7',
                    '--color-secondary': '#7c4dff',
                    '--color-accent': '#18ffff',
                    '--color-bg-primary': '#0f0817',
                    '--color-bg-secondary': '#1a0f2e',
                });
                this.applyNeonEffect();
            },
            matrix: () => {
                this.setCSSVariables({
                    '--color-primary': '#00ff41',
                    '--color-secondary': '#008f11',
                    '--color-accent': '#00ff41',
                    '--color-bg-primary': '#000000',
                    '--color-bg-secondary': '#001100',
                });
                this.applyMatrixEffect();
            },
            vaporwave: () => {
                this.setCSSVariables({
                    '--color-primary': '#ff71ce',
                    '--color-secondary': '#01cdfe',
                    '--color-accent': '#b967ff',
                    '--color-bg-primary': '#1a0033',
                    '--color-bg-secondary': '#2d1b69',
                });
                this.applyVaporwaveEffect();
            },
        };

        const effect = effects[theme];
        if (effect) {
            effect();
        }
    }

    setCSSVariables(variables) {
        const root = document.documentElement;
        Object.entries(variables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }

    applyGlitchEffect() {
        const glitchElements = document.querySelectorAll('.glitch');
        glitchElements.forEach(element => {
            if (!element.dataset.text) {
                element.dataset.text = element.textContent;
            }
        });
    }

    applyNeonEffect() {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.style.textShadow = '0 0 10px currentColor';
        });
    }

    applyMatrixEffect() {
        const terminal = document.querySelector('.terminal-wrapper');
        if (terminal) {
            terminal.style.borderColor = '#00ff41';
            terminal.style.boxShadow = '0 0 30px rgba(0, 255, 65, 0.6)';
        }
    }

    applyVaporwaveEffect() {
        const hero = document.querySelector('.hero-section');
        if (hero) {
            hero.style.background = `
                linear-gradient(135deg, #1a0033 0%, #2d1b69 100%),
                repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(255, 113, 206, 0.03) 2px,
                    rgba(255, 113, 206, 0.03) 4px
                )
            `;
        }
    }

    observe(callback) {
        this.observers.push(callback);
        return () => {
            const index = this.observers.indexOf(callback);
            if (index > -1) {
                this.observers.splice(index, 1);
            }
        };
    }

    notifyObservers(theme) {
        this.observers.forEach(callback => {
            callback(theme);
        });
    }

    createThemePicker() {
        const picker = document.createElement('div');
        picker.className = 'theme-picker';
        picker.innerHTML = `
            <h3>Choose Theme</h3>
            <div class="theme-options">
                ${this.themes
                    .map(
                        theme => `
                    <button class="theme-option" data-theme="${theme}">
                        <span class="theme-preview ${theme}"></span>
                        <span class="theme-name">${theme}</span>
                    </button>
                `
                    )
                    .join('')}
            </div>
        `;

        picker.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', e => {
                const { theme } = e.currentTarget.dataset;
                this.applyTheme(theme);
                picker.remove();
            });
        });

        return picker;
    }

    showThemePicker() {
        const existing = document.querySelector('.theme-picker');
        if (existing) {
            existing.remove();
            return;
        }

        const picker = this.createThemePicker();
        document.body.appendChild(picker);
    }

    exportTheme() {
        const styles = getComputedStyle(document.documentElement);
        const variables = {};

        for (let i = 0; i < styles.length; i++) {
            const property = styles[i];
            if (property.startsWith('--')) {
                variables[property] = styles.getPropertyValue(property);
            }
        }

        return {
            name: this.currentTheme,
            variables,
        };
    }

    importTheme(themeData) {
        if (themeData.variables) {
            this.setCSSVariables(themeData.variables);
        }

        if (themeData.name) {
            this.currentTheme = themeData.name;
            document.documentElement.dataset.theme = themeData.name;
        }

        this.logger.info('Theme imported:', themeData.name);
    }
}
