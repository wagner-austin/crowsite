/**
 * Theme Manager Module
 *
 * Manages theme switching between Poe light and dark variants
 * Handles theme persistence, transitions, and observer notifications
 *
 * Features:
 * - LocalStorage persistence for user preference
 * - Smooth theme transitions
 * - Observer pattern for theme change notifications
 * - System dark mode detection
 *
 * @module theme
 */

import { Logger } from '../core/logger.js';

/**
 * Manages application themes with persistence and notifications
 */
export class ThemeManager {
    constructor() {
        this.logger = new Logger('ThemeManager');
        this.themes = ['poe-light', 'poe-dark']; // Only light and dark variants
        this.currentTheme = this.loadTheme();
        this.observers = [];
    }

    /**
     * Initialize theme manager
     * Applies saved theme and sets up event listeners
     */
    init() {
        this.applyTheme(this.currentTheme);
        this.attachEventListeners();
        this.logger.info('Theme manager initialized with theme:', this.currentTheme);
    }

    /**
     * Load theme from HTML, localStorage, or system preference
     * Priority: HTML data-theme > localStorage > system preference > default
     * @returns {string} Theme name to apply
     */
    loadTheme() {
        // Check current HTML theme
        const htmlTheme = document.documentElement.dataset.theme;
        if (htmlTheme && this.themes.includes(htmlTheme)) {
            this.logger.debug('Using HTML theme:', htmlTheme);
            return htmlTheme;
        }

        // Check saved preference
        const saved = localStorage.getItem('theme');
        if (saved && this.themes.includes(saved)) {
            this.logger.debug('Using saved theme:', saved);
            return saved;
        }

        // Default to poe-light
        this.logger.debug('Using default theme: poe-light');
        return 'poe-light';
    }

    saveTheme(theme) {
        localStorage.setItem('theme', theme);
        this.logger.info('Theme saved:', theme);
    }

    /**
     * Apply theme to document and notify observers
     * @param {string} theme - Theme name (poe-light or poe-dark)
     */
    applyTheme(theme) {
        if (!this.themes.includes(theme)) {
            this.logger.warn('Invalid theme:', theme);
            return;
        }

        // Only update if theme actually changed
        if (document.documentElement.dataset.theme !== theme) {
            document.documentElement.dataset.theme = theme;
        }
        this.currentTheme = theme;
        this.saveTheme(theme);

        this.notifyObservers(theme);
        this.applyThemeEffects(theme);
    }

    toggleTheme() {
        // Simple toggle between light and dark
        const newTheme = this.currentTheme === 'poe-light' ? 'poe-dark' : 'poe-light';
        this.applyTheme(newTheme);
        this.logger.info('Theme toggled to:', newTheme);
    }

    setTheme(theme) {
        this.applyTheme(theme);
    }

    // Set theme variant (light/dark)
    setThemeVariant(variant) {
        const newTheme = `poe-${variant === 'light' ? 'light' : 'dark'}`;
        this.applyTheme(newTheme);
        this.logger.info('Theme variant set to:', newTheme);
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

        // Log system theme preference changes for debugging
    }

    applyThemeEffects(theme) {
        // Clean up any inline styles
        this.cleanupInlineStyles();

        // All styling handled by CSS variables
        this.logger.debug('Theme effects applied:', theme);
    }

    cleanupInlineStyles() {
        // Remove root inline styles
        const root = document.documentElement;
        const rootStyle = root.style;
        for (let i = rootStyle.length - 1; i >= 0; i--) {
            const prop = rootStyle[i];
            rootStyle.removeProperty(prop);
        }
        this.logger.debug('Cleaned up inline styles');
    }

    setCSSVariables(variables) {
        const root = document.documentElement;
        Object.entries(variables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
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
