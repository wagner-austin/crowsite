/**
 * Centralized Event Bus
 * Provides a unified event system for the application
 */

import { Logger } from './logger.js';

export class EventBus {
    constructor() {
        this.logger = new Logger('EventBus');
        this.events = new Map();
        this.history = [];
        this.maxHistorySize = 100;
        this.wildcardHandlers = new Set();
    }

    /**
     * Subscribe to an event
     */
    on(eventName, handler, options = {}) {
        if (typeof handler !== 'function') {
            throw new TypeError('Handler must be a function');
        }

        // Handle wildcard subscriptions
        if (eventName === '*') {
            this.wildcardHandlers.add(handler);
            return () => this.wildcardHandlers.delete(handler);
        }

        // Get or create event handlers array
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        // Create handler wrapper with options
        const handlerWrapper = {
            handler,
            once: options.once || false,
            priority: options.priority || 0,
            id: this.generateHandlerId(),
        };

        // Add handler
        this.events.get(eventName).add(handlerWrapper);

        this.logger.debug(`Subscribed to event: ${eventName}`, { id: handlerWrapper.id });

        // Return unsubscribe function
        return () => this.off(eventName, handlerWrapper.id);
    }

    /**
     * Subscribe to an event once
     */
    once(eventName, handler, options = {}) {
        return this.on(eventName, handler, { ...options, once: true });
    }

    /**
     * Unsubscribe from an event
     */
    off(eventName, handlerId) {
        if (!this.events.has(eventName)) {
            return false;
        }

        const handlers = this.events.get(eventName);

        // Find and remove handler by ID
        for (const wrapper of handlers) {
            if (wrapper.id === handlerId) {
                handlers.delete(wrapper);
                this.logger.debug(`Unsubscribed from event: ${eventName}`, { id: handlerId });

                // Clean up empty event arrays
                if (handlers.size === 0) {
                    this.events.delete(eventName);
                }

                return true;
            }
        }

        return false;
    }

    /**
     * Emit an event
     */
    emit(eventName, data = {}, options = {}) {
        const event = {
            name: eventName,
            data,
            timestamp: Date.now(),
            id: this.generateEventId(),
            canceled: false,
            defaultPrevented: false,
        };

        // Add to history
        this.addToHistory(event);

        // Log event
        this.logger.debug(`Event emitted: ${eventName}`, { id: event.id, data });

        // Notify wildcard handlers first
        for (const handler of this.wildcardHandlers) {
            try {
                handler(event);
            } catch (error) {
                this.logger.error(`Error in wildcard handler for ${eventName}`, error);
            }
        }

        // Get handlers for this event
        if (!this.events.has(eventName)) {
            return event;
        }

        const handlers = Array.from(this.events.get(eventName));

        // Sort by priority (higher priority first)
        handlers.sort((a, b) => b.priority - a.priority);

        // Execute handlers
        for (const wrapper of handlers) {
            if (event.canceled && !options.force) {
                break;
            }

            try {
                const result = wrapper.handler(event);

                // Handle async handlers
                if (result instanceof Promise && options.await) {
                    result.catch(error => {
                        this.logger.error(`Error in async handler for ${eventName}`, error);
                    });
                }

                // Remove one-time handlers
                if (wrapper.once) {
                    this.off(eventName, wrapper.id);
                }
            } catch (error) {
                this.logger.error(`Error in handler for ${eventName}`, error);

                if (options.throwOnError) {
                    throw error;
                }
            }
        }

        return event;
    }

    /**
     * Emit an event and wait for all handlers
     */
    async emitAsync(eventName, data = {}, options = {}) {
        const event = {
            name: eventName,
            data,
            timestamp: Date.now(),
            id: this.generateEventId(),
            canceled: false,
            defaultPrevented: false,
        };

        // Add to history
        this.addToHistory(event);

        // Log event
        this.logger.debug(`Event emitted (async): ${eventName}`, { id: event.id, data });

        // Notify wildcard handlers
        const wildcardPromises = [];
        for (const handler of this.wildcardHandlers) {
            wildcardPromises.push(
                Promise.resolve(handler(event)).catch(error => {
                    this.logger.error(`Error in wildcard handler for ${eventName}`, error);
                })
            );
        }

        // Get handlers for this event
        if (!this.events.has(eventName)) {
            await Promise.all(wildcardPromises);
            return event;
        }

        const handlers = Array.from(this.events.get(eventName));

        // Sort by priority
        handlers.sort((a, b) => b.priority - a.priority);

        // Execute handlers
        const promises = [];
        for (const wrapper of handlers) {
            if (event.canceled && !options.force) {
                break;
            }

            promises.push(
                Promise.resolve(wrapper.handler(event))
                    .then(() => {
                        if (wrapper.once) {
                            this.off(eventName, wrapper.id);
                        }
                    })
                    .catch(error => {
                        this.logger.error(`Error in async handler for ${eventName}`, error);
                        if (options.throwOnError) {
                            throw error;
                        }
                    })
            );
        }

        // Wait for all handlers
        await Promise.all([...wildcardPromises, ...promises]);

        return event;
    }

    /**
     * Clear all handlers for an event
     */
    clear(eventName) {
        if (eventName) {
            const had = this.events.has(eventName);
            this.events.delete(eventName);

            if (had) {
                this.logger.debug(`Cleared all handlers for: ${eventName}`);
            }

            return had;
        }

        // Clear all events
        const count = this.events.size;
        this.events.clear();
        this.wildcardHandlers.clear();

        this.logger.debug(`Cleared all event handlers (${count} events)`);

        return count;
    }

    /**
     * Check if event has handlers
     */
    hasListeners(eventName) {
        return this.events.has(eventName) && this.events.get(eventName).size > 0;
    }

    /**
     * Get listener count for an event
     */
    listenerCount(eventName) {
        if (!eventName) {
            // Return total count
            let total = this.wildcardHandlers.size;
            for (const handlers of this.events.values()) {
                total += handlers.size;
            }
            return total;
        }

        return this.events.get(eventName)?.size || 0;
    }

    /**
     * Create a namespaced event emitter
     */
    namespace(prefix) {
        const self = this;

        return {
            on: (event, handler, options) => self.on(`${prefix}:${event}`, handler, options),

            once: (event, handler, options) => self.once(`${prefix}:${event}`, handler, options),

            off: (event, handlerId) => self.off(`${prefix}:${event}`, handlerId),

            emit: (event, data, options) => self.emit(`${prefix}:${event}`, data, options),

            emitAsync: (event, data, options) =>
                self.emitAsync(`${prefix}:${event}`, data, options),

            clear: event => self.clear(event ? `${prefix}:${event}` : null),

            hasListeners: event => self.hasListeners(`${prefix}:${event}`),

            listenerCount: event => self.listenerCount(event ? `${prefix}:${event}` : null),
        };
    }

    /**
     * Wait for an event
     */
    waitFor(eventName, timeout = 0) {
        return new Promise((resolve, reject) => {
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            };

            // Subscribe to event
            const unsubscribe = this.once(eventName, event => {
                cleanup();
                resolve(event);
            });

            // Setup timeout if specified
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    unsubscribe();
                    reject(new Error(`Timeout waiting for event: ${eventName}`));
                }, timeout);
            }
        });
    }

    /**
     * Generate unique handler ID
     */
    generateHandlerId() {
        return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add event to history
     */
    addToHistory(event) {
        this.history.push(event);

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Get event history
     */
    getHistory(filter = {}) {
        let history = [...this.history];

        // Filter by event name
        if (filter.name) {
            history = history.filter(e => e.name === filter.name);
        }

        // Filter by time range
        if (filter.since) {
            const since = filter.since instanceof Date ? filter.since.getTime() : filter.since;
            history = history.filter(e => e.timestamp >= since);
        }

        return history;
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.history = [];
        this.logger.debug('Event history cleared');
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        const info = {
            eventCount: this.events.size,
            totalListeners: this.listenerCount(),
            wildcardListeners: this.wildcardHandlers.size,
            historySize: this.history.length,
            events: {},
        };

        // Add event details
        for (const [name, handlers] of this.events) {
            info.events[name] = {
                listeners: handlers.size,
                priorities: Array.from(handlers).map(h => h.priority),
            };
        }

        return info;
    }
}

// Export singleton instance
export default new EventBus();
