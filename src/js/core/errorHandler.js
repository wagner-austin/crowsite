/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 */

import { Logger } from './logger.js';
import { ERROR_MESSAGES } from './constants.js';

export class ErrorHandler {
    constructor() {
        this.logger = new Logger('ErrorHandler');
        this.errorCallbacks = new Set();
        this.errorHistory = [];
        this.maxHistorySize = 100;

        this.setupGlobalErrorHandling();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', event => {
            this.handleError({
                type: 'uncaught',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error,
            });

            // Prevent default browser error handling
            event.preventDefault();
        });

        // Handle promise rejections
        window.addEventListener('unhandledrejection', event => {
            this.handleError({
                type: 'unhandledRejection',
                reason: event.reason,
                promise: event.promise,
            });

            // Prevent default browser error handling
            event.preventDefault();
        });
    }

    /**
     * Main error handler
     */
    handleError(errorInfo) {
        // Create error object
        const error = this.normalizeError(errorInfo);

        // Log error
        this.logError(error);

        // Store in history
        this.addToHistory(error);

        // Notify callbacks
        this.notifyCallbacks(error);

        // Show user-friendly message if needed
        if (error.severity === 'critical') {
            this.showUserMessage(error);
        }

        // Report to monitoring service (if configured)
        this.reportError(error);

        return error;
    }

    /**
     * Normalize error information
     */
    normalizeError(errorInfo) {
        const error = {
            id: this.generateErrorId(),
            timestamp: Date.now(),
            type: 'unknown',
            message: ERROR_MESSAGES.GENERIC,
            details: {},
            stack: null,
            severity: 'error',
            context: this.getErrorContext(),
            ...errorInfo,
        };

        // Extract message and stack from Error objects
        if (errorInfo instanceof Error) {
            error.message = errorInfo.message;
            error.stack = errorInfo.stack;
            error.type = errorInfo.constructor.name;
        } else if (errorInfo.error instanceof Error) {
            error.message = errorInfo.error.message;
            error.stack = errorInfo.error.stack;
        }

        // Determine severity
        error.severity = this.determineSeverity(error);

        // Sanitize error for display
        error.userMessage = this.getUserMessage(error);

        return error;
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get error context
     */
    getErrorContext() {
        return {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height,
            },
        };
    }

    /**
     * Determine error severity
     */
    determineSeverity(error) {
        // Critical errors
        if (
            error.type === 'SecurityError' ||
            error.type === 'NetworkError' ||
            error.message?.includes('CRITICAL')
        ) {
            return 'critical';
        }

        // Warnings
        if (
            error.type === 'warning' ||
            error.message?.includes('deprecated') ||
            error.message?.includes('performance')
        ) {
            return 'warning';
        }

        // Info
        if (error.type === 'info' || error.message?.includes('info')) {
            return 'info';
        }

        // Default to error
        return 'error';
    }

    /**
     * Get user-friendly error message
     */
    getUserMessage(error) {
        // Network errors
        if (
            error.type === 'NetworkError' ||
            error.message?.includes('fetch') ||
            error.message?.includes('network')
        ) {
            return ERROR_MESSAGES.NETWORK;
        }

        // Browser compatibility
        if (
            error.message?.includes('not supported') ||
            error.message?.includes('undefined is not')
        ) {
            return ERROR_MESSAGES.FEATURE_NOT_SUPPORTED;
        }

        // Module loading
        if (error.message?.includes('import') || error.message?.includes('module')) {
            return ERROR_MESSAGES.MODULE_LOAD_FAILED;
        }

        // Timeout
        if (error.message?.includes('timeout')) {
            return ERROR_MESSAGES.TIMEOUT;
        }

        // Default
        return ERROR_MESSAGES.GENERIC;
    }

    /**
     * Log error using logger
     */
    logError(error) {
        const logMethod =
            {
                critical: 'error',
                error: 'error',
                warning: 'warn',
                info: 'info',
            }[error.severity] || 'error';

        this.logger[logMethod](`[${error.type}] ${error.message}`, {
            id: error.id,
            details: error.details,
            stack: error.stack,
        });
    }

    /**
     * Add error to history
     */
    addToHistory(error) {
        this.errorHistory.push(error);

        // Limit history size
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }

    /**
     * Notify registered callbacks
     */
    notifyCallbacks(error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (e) {
                this.logger.error('Error in error callback', e);
            }
        });
    }

    /**
     * Show user-friendly error message
     */
    showUserMessage(error) {
        // Check if terminal is available
        const terminal = window.app?.terminal;
        if (terminal) {
            terminal.addLine(error.userMessage, 'error');
        } else {
            // Fallback to console
            console.error(error.userMessage);
        }
    }

    /**
     * Report error to monitoring service
     */
    reportError(error) {
        // Only report in production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return;
        }

        // Would send to monitoring service like Sentry
        // For now, just log that we would report it
        this.logger.debug('Would report error to monitoring', error.id);
    }

    /**
     * Register error callback
     */
    onError(callback) {
        this.errorCallbacks.add(callback);

        // Return unsubscribe function
        return () => {
            this.errorCallbacks.delete(callback);
        };
    }

    /**
     * Try-catch wrapper with error handling
     */
    async tryAsync(fn, context = {}) {
        try {
            return await fn();
        } catch (error) {
            this.handleError({
                ...context,
                error,
            });
            throw error;
        }
    }

    /**
     * Try-catch wrapper for sync functions
     */
    try(fn, context = {}) {
        try {
            return fn();
        } catch (error) {
            this.handleError({
                ...context,
                error,
            });
            throw error;
        }
    }

    /**
     * Create error boundary for class methods
     */
    wrapMethod(target, methodName, context = {}) {
        const original = target[methodName];

        target[methodName] = async function (...args) {
            try {
                const result = await original.apply(this, args);
                return result;
            } catch (error) {
                this.handleError({
                    ...context,
                    method: methodName,
                    args,
                    error,
                });
                throw error;
            }
        };
    }

    /**
     * Get error history
     */
    getHistory(filter = {}) {
        let history = [...this.errorHistory];

        // Filter by severity
        if (filter.severity) {
            history = history.filter(e => e.severity === filter.severity);
        }

        // Filter by type
        if (filter.type) {
            history = history.filter(e => e.type === filter.type);
        }

        // Filter by time range
        if (filter.since) {
            const since = filter.since instanceof Date ? filter.since.getTime() : filter.since;
            history = history.filter(e => e.timestamp >= since);
        }

        return history;
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
        this.logger.info('Error history cleared');
    }

    /**
     * Get error statistics
     */
    getStatistics() {
        const stats = {
            total: this.errorHistory.length,
            bySeverity: {},
            byType: {},
            recent: [],
            rate: 0,
        };

        // Count by severity
        this.errorHistory.forEach(error => {
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });

        // Get recent errors (last 5 minutes)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        stats.recent = this.errorHistory.filter(e => e.timestamp >= fiveMinutesAgo);

        // Calculate error rate
        if (stats.recent.length > 0) {
            const timeSpan = Date.now() - stats.recent[0].timestamp;
            stats.rate = (stats.recent.length / timeSpan) * (1000 * 60); // errors per minute
        }

        return stats;
    }

    /**
     * Export error report
     */
    exportReport() {
        const report = {
            generated: new Date().toISOString(),
            statistics: this.getStatistics(),
            errors: this.errorHistory,
            context: this.getErrorContext(),
        };

        return JSON.stringify(report, null, 2);
    }
}

// Export singleton instance
export default new ErrorHandler();
