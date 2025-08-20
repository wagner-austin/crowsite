/**
 * Observability Module
 * Provides comprehensive monitoring, metrics, and tracing capabilities
 */

import { Logger } from './logger.js';
import ErrorHandler from './errorHandler.js';
import EventBus from './eventBus.js';
import { PERFORMANCE } from './constants.js';

export class ObservabilityManager {
    constructor() {
        this.logger = new Logger('Observability');
        this.metrics = new Map();
        this.traces = new Map();
        this.spans = new Map();
        this.counters = new Map();
        this.gauges = new Map();
        this.histograms = new Map();
        this.activeTransactions = new Map();

        // Configuration
        this.config = {
            enabled: true,
            samplingRate: 1.0,
            maxTraceDepth: 10,
            metricsInterval: 60000, // 1 minute
            flushInterval: 30000, // 30 seconds
            maxStoredMetrics: 1000,
            enableAutoInstrumentation: true,
        };

        // Initialize subsystems
        this.initializeMetrics();
        this.initializeTracing();
        this.initializeMonitoring();

        if (this.config.enableAutoInstrumentation) {
            this.autoInstrument();
        }
    }

    /**
     * Initialize metrics collection
     */
    initializeMetrics() {
        // Core web vitals
        this.registerGauge('performance.fps', () => this.calculateFPS());
        this.registerGauge('performance.memory', () => this.getMemoryUsage());
        this.registerGauge('performance.cpu', () => this.getCPUUsage());

        // Application metrics
        this.registerCounter('errors.total');
        this.registerCounter('errors.unhandled');
        this.registerCounter('api.requests');
        this.registerCounter('api.errors');

        // Timing metrics
        this.registerHistogram('api.duration');
        this.registerHistogram('render.duration');
        this.registerHistogram('module.load.duration');

        // Start periodic metrics collection
        this.metricsInterval = setInterval(() => {
            this.collectMetrics();
        }, this.config.metricsInterval);

        // Start periodic flush
        this.flushInterval = setInterval(() => {
            this.flush();
        }, this.config.flushInterval);
    }

    /**
     * Initialize distributed tracing
     */
    initializeTracing() {
        this.traceIdGenerator = this.createIdGenerator('trace');
        this.spanIdGenerator = this.createIdGenerator('span');

        // Root trace for the application
        this.rootTrace = this.startTrace('application.lifecycle');
    }

    /**
     * Initialize monitoring hooks
     */
    initializeMonitoring() {
        // Monitor errors
        ErrorHandler.onError(error => {
            this.incrementCounter('errors.total');
            this.recordError(error);

            if (error.type === 'uncaught' || error.type === 'unhandledRejection') {
                this.incrementCounter('errors.unhandled');
            }
        });

        // Monitor navigation
        if (typeof window !== 'undefined') {
            // Page visibility
            document.addEventListener('visibilitychange', () => {
                this.recordEvent('page.visibility', {
                    hidden: document.hidden,
                    visibilityState: document.visibilityState,
                });
            });

            // Performance Observer
            if ('PerformanceObserver' in window) {
                this.setupPerformanceObserver();
            }
        }

        // Monitor EventBus
        const originalEmit = EventBus.emit.bind(EventBus);
        EventBus.emit = (eventName, data, options) => {
            const span = this.startSpan(`event.${eventName}`);
            try {
                const result = originalEmit(eventName, data, options);
                span.setStatus('ok');
                return result;
            } catch (error) {
                span.setStatus('error');
                span.recordException(error);
                throw error;
            } finally {
                span.end();
            }
        };
    }

    /**
     * Auto-instrument common operations
     */
    autoInstrument() {
        // Instrument fetch
        if (typeof window !== 'undefined' && window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const span = this.startSpan('http.fetch');
                const url = args[0]?.url || args[0];

                span.setAttributes({
                    'http.url': url,
                    'http.method': args[1]?.method || 'GET',
                });

                const startTime = performance.now();

                try {
                    const response = await originalFetch(...args);
                    const duration = performance.now() - startTime;

                    span.setAttributes({
                        'http.status_code': response.status,
                        'http.duration': duration,
                    });

                    this.incrementCounter('api.requests');
                    this.recordHistogram('api.duration', duration);

                    if (!response.ok) {
                        this.incrementCounter('api.errors');
                        span.setStatus('error');
                    } else {
                        span.setStatus('ok');
                    }

                    return response;
                } catch (error) {
                    span.recordException(error);
                    span.setStatus('error');
                    this.incrementCounter('api.errors');
                    throw error;
                } finally {
                    span.end();
                }
            };
        }

        // Instrument setTimeout/setInterval
        this.instrumentTimers();

        // Instrument Promise rejections
        this.instrumentPromises();
    }

    /**
     * Instrument timer functions
     */
    instrumentTimers() {
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;

        window.setTimeout = (callback, delay, ...args) => {
            const wrappedCallback = () => {
                const span = this.startSpan('timer.timeout');
                span.setAttributes({ delay });

                try {
                    const result = callback(...args);
                    span.setStatus('ok');
                    return result;
                } catch (error) {
                    span.recordException(error);
                    span.setStatus('error');
                    throw error;
                } finally {
                    span.end();
                }
            };

            return originalSetTimeout(wrappedCallback, delay);
        };

        window.setInterval = (callback, delay, ...args) => {
            const wrappedCallback = () => {
                const span = this.startSpan('timer.interval');
                span.setAttributes({ delay });

                try {
                    const result = callback(...args);
                    span.setStatus('ok');
                    return result;
                } catch (error) {
                    span.recordException(error);
                    span.setStatus('error');
                    throw error;
                } finally {
                    span.end();
                }
            };

            return originalSetInterval(wrappedCallback, delay);
        };
    }

    /**
     * Instrument Promise handling
     */
    instrumentPromises() {
        const OriginalPromise = window.Promise;

        class InstrumentedPromise extends OriginalPromise {
            constructor(executor) {
                const span = ObservabilityManager.instance.startSpan('promise.execution');

                super((resolve, reject) => {
                    const instrumentedResolve = value => {
                        span.setStatus('ok');
                        span.end();
                        resolve(value);
                    };

                    const instrumentedReject = reason => {
                        span.setStatus('error');
                        span.recordException(reason);
                        span.end();
                        reject(reason);
                    };

                    try {
                        executor(instrumentedResolve, instrumentedReject);
                    } catch (error) {
                        span.setStatus('error');
                        span.recordException(error);
                        span.end();
                        reject(error);
                    }
                });
            }
        }

        // Preserve static methods
        Object.setPrototypeOf(InstrumentedPromise, OriginalPromise);
        window.Promise = InstrumentedPromise;
    }

    /**
     * Setup Performance Observer
     */
    setupPerformanceObserver() {
        try {
            // Observe long tasks
            const longTaskObserver = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > PERFORMANCE.LONG_TASK_THRESHOLD) {
                        this.recordEvent('performance.longTask', {
                            duration: entry.duration,
                            startTime: entry.startTime,
                            name: entry.name,
                        });
                    }
                }
            });

            longTaskObserver.observe({ entryTypes: ['longtask'] });

            // Observe layout shifts
            const layoutShiftObserver = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        this.recordEvent('performance.layoutShift', {
                            value: entry.value,
                            startTime: entry.startTime,
                        });
                    }
                }
            });

            layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });

            // Observe largest contentful paint
            const lcpObserver = new PerformanceObserver(list => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];

                this.recordMetric('performance.lcp', lastEntry.renderTime || lastEntry.loadTime);
            });

            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (error) {
            this.logger.warn('Failed to setup Performance Observer', error);
        }
    }

    /**
     * Start a new trace
     */
    startTrace(name, attributes = {}) {
        const traceId = this.traceIdGenerator();

        const trace = {
            id: traceId,
            name,
            startTime: performance.now(),
            attributes,
            spans: [],
            status: 'active',
        };

        this.traces.set(traceId, trace);

        return {
            traceId,
            end: () => this.endTrace(traceId),
            addSpan: span => trace.spans.push(span),
        };
    }

    /**
     * End a trace
     */
    endTrace(traceId) {
        const trace = this.traces.get(traceId);
        if (!trace) {
            return;
        }

        trace.endTime = performance.now();
        trace.duration = trace.endTime - trace.startTime;
        trace.status = 'completed';

        this.logger.debug(`Trace completed: ${trace.name}`, {
            duration: trace.duration,
            spanCount: trace.spans.length,
        });
    }

    /**
     * Start a new span
     */
    startSpan(name, options = {}) {
        const spanId = this.spanIdGenerator();
        const parentSpan = options.parent || this.getCurrentSpan();

        const span = {
            id: spanId,
            name,
            traceId: options.traceId || parentSpan?.traceId || this.rootTrace?.traceId,
            parentId: parentSpan?.id,
            startTime: performance.now(),
            attributes: {},
            events: [],
            status: 'active',
        };

        this.spans.set(spanId, span);

        return {
            spanId,
            setAttributes: attrs => Object.assign(span.attributes, attrs),
            addEvent: (eventName, attrs) =>
                span.events.push({ name: eventName, attrs, time: performance.now() }),
            setStatus: status => (span.status = status),
            recordException: error => {
                span.events.push({
                    name: 'exception',
                    attributes: {
                        'exception.type': error.name || 'Error',
                        'exception.message': error.message,
                        'exception.stacktrace': error.stack,
                    },
                    time: performance.now(),
                });
            },
            end: () => this.endSpan(spanId),
        };
    }

    /**
     * End a span
     */
    endSpan(spanId) {
        const span = this.spans.get(spanId);
        if (!span) {
            return;
        }

        span.endTime = performance.now();
        span.duration = span.endTime - span.startTime;

        if (span.status === 'active') {
            span.status = 'ok';
        }

        // Add to parent trace if exists
        if (span.traceId) {
            const trace = this.traces.get(span.traceId);
            if (trace) {
                trace.spans.push(span);
            }
        }
    }

    /**
     * Get current active span
     */
    getCurrentSpan() {
        for (const span of this.spans.values()) {
            if (span.status === 'active') {
                return span;
            }
        }
        return null;
    }

    /**
     * Register a counter metric
     */
    registerCounter(name, tags = {}) {
        this.counters.set(name, {
            name,
            tags,
            value: 0,
            created: Date.now(),
        });
    }

    /**
     * Increment a counter
     */
    incrementCounter(name, value = 1, tags = {}) {
        const counter = this.counters.get(name);
        if (counter) {
            counter.value += value;
            counter.lastUpdated = Date.now();

            this.recordMetric(name, counter.value, { ...counter.tags, ...tags });
        }
    }

    /**
     * Register a gauge metric
     */
    registerGauge(name, callback, tags = {}) {
        this.gauges.set(name, {
            name,
            tags,
            callback,
            created: Date.now(),
        });
    }

    /**
     * Update a gauge value
     */
    updateGauge(name, value, tags = {}) {
        const gauge = this.gauges.get(name);
        if (gauge) {
            gauge.value = value;
            gauge.lastUpdated = Date.now();

            this.recordMetric(name, value, { ...gauge.tags, ...tags });
        }
    }

    /**
     * Register a histogram metric
     */
    registerHistogram(name, buckets = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000], tags = {}) {
        this.histograms.set(name, {
            name,
            tags,
            buckets,
            values: [],
            created: Date.now(),
        });
    }

    /**
     * Record a histogram value
     */
    recordHistogram(name, value, tags = {}) {
        const histogram = this.histograms.get(name);
        if (histogram) {
            histogram.values.push(value);
            histogram.lastUpdated = Date.now();

            // Keep only last 1000 values
            if (histogram.values.length > 1000) {
                histogram.values = histogram.values.slice(-1000);
            }

            this.recordMetric(name, value, { ...histogram.tags, ...tags });
        }
    }

    /**
     * Record a generic metric
     */
    recordMetric(name, value, tags = {}) {
        const metric = {
            name,
            value,
            tags,
            timestamp: Date.now(),
        };

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const metricList = this.metrics.get(name);
        metricList.push(metric);

        // Limit stored metrics
        if (metricList.length > this.config.maxStoredMetrics) {
            metricList.shift();
        }

        this.logger.debug(`Metric recorded: ${name}`, { value, tags });
    }

    /**
     * Record an event
     */
    recordEvent(name, attributes = {}) {
        const event = {
            name,
            attributes,
            timestamp: Date.now(),
        };

        // Commented out to reduce log spam - uncomment if debugging events
        // this.logger.info(`Event: ${name}`, attributes);

        // Emit to EventBus for other components
        EventBus.emit('observability:event', event);

        return event;
    }

    /**
     * Record an error
     */
    recordError(error) {
        const errorEvent = {
            type: 'error',
            message: error.message || error.userMessage,
            stack: error.stack,
            severity: error.severity,
            context: error.context,
            timestamp: Date.now(),
        };

        this.recordEvent('error.occurred', errorEvent);

        // Add to current span if exists
        const currentSpan = this.getCurrentSpan();
        if (currentSpan) {
            currentSpan.recordException(error);
        }
    }

    /**
     * Start a transaction
     */
    startTransaction(name, type = 'custom') {
        const transactionId = this.createIdGenerator('transaction')();

        const transaction = {
            id: transactionId,
            name,
            type,
            startTime: performance.now(),
            trace: this.startTrace(`transaction.${name}`),
            spans: [],
            metrics: new Map(),
        };

        this.activeTransactions.set(transactionId, transaction);

        return {
            id: transactionId,
            addMetric: (metricName, value) => transaction.metrics.set(metricName, value),
            setStatus: status => (transaction.status = status),
            end: () => this.endTransaction(transactionId),
        };
    }

    /**
     * End a transaction
     */
    endTransaction(transactionId) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            return;
        }

        transaction.endTime = performance.now();
        transaction.duration = transaction.endTime - transaction.startTime;
        transaction.trace.end();

        // Record transaction metrics
        this.recordHistogram(`transaction.${transaction.type}.duration`, transaction.duration);

        this.activeTransactions.delete(transactionId);

        this.logger.info(`Transaction completed: ${transaction.name}`, {
            duration: transaction.duration,
            metrics: Array.from(transaction.metrics.entries()),
        });
    }

    /**
     * Collect periodic metrics
     */
    collectMetrics() {
        // Collect gauge values
        for (const [name, gauge] of this.gauges) {
            if (gauge.callback) {
                try {
                    const value = gauge.callback();
                    this.updateGauge(name, value);
                } catch (error) {
                    this.logger.error(`Failed to collect gauge: ${name}`, error);
                }
            }
        }

        // Collect performance metrics
        this.collectPerformanceMetrics();
    }

    /**
     * Collect performance metrics
     */
    collectPerformanceMetrics() {
        if (typeof window === 'undefined') {
            return;
        }

        // Memory usage
        if (performance.memory) {
            this.recordMetric('browser.memory.used', performance.memory.usedJSHeapSize);
            this.recordMetric('browser.memory.total', performance.memory.totalJSHeapSize);
            this.recordMetric('browser.memory.limit', performance.memory.jsHeapSizeLimit);
        }

        // Navigation timing
        if (performance.timing) {
            const { timing } = performance;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            const domContentLoadedTime = timing.domContentLoadedEventEnd - timing.navigationStart;

            this.recordMetric('browser.navigation.loadTime', loadTime);
            this.recordMetric('browser.navigation.domContentLoaded', domContentLoadedTime);
        }

        // Resource timing
        const resources = performance.getEntriesByType('resource');
        const resourceCount = resources.length;
        const totalResourceTime = resources.reduce((sum, r) => sum + r.duration, 0);

        this.recordMetric('browser.resources.count', resourceCount);
        this.recordMetric('browser.resources.totalDuration', totalResourceTime);
    }

    /**
     * Calculate current FPS
     */
    calculateFPS() {
        if (!this.fpsFrames) {
            this.fpsFrames = [];
            this.lastFrameTime = performance.now();

            const measureFPS = () => {
                const now = performance.now();
                const delta = now - this.lastFrameTime;
                this.lastFrameTime = now;

                this.fpsFrames.push(1000 / delta);
                if (this.fpsFrames.length > 60) {
                    this.fpsFrames.shift();
                }

                requestAnimationFrame(measureFPS);
            };

            requestAnimationFrame(measureFPS);
        }

        if (this.fpsFrames.length === 0) {
            return 0;
        }

        const avgFPS = this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length;
        return Math.round(avgFPS);
    }

    /**
     * Get memory usage percentage
     */
    getMemoryUsage() {
        if (!performance.memory) {
            return 0;
        }

        const used = performance.memory.usedJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;

        return (used / limit) * 100;
    }

    /**
     * Estimate CPU usage
     */
    getCPUUsage() {
        // This is an estimation based on main thread blocking
        // Real CPU usage would require native APIs
        if (!this.cpuMeasurements) {
            this.cpuMeasurements = [];

            setInterval(() => {
                const start = performance.now();
                // Busy wait for 10ms - intentional spin to sample blocking
                for (; performance.now() - start < 10; ) {
                    // Intentional busy-wait to sample main-thread blocking
                }
                const actualTime = performance.now() - start;

                // If it took longer than 10ms, the thread was blocked
                const usage = Math.min(100, (actualTime / 10 - 1) * 100);
                this.cpuMeasurements.push(usage);

                if (this.cpuMeasurements.length > 10) {
                    this.cpuMeasurements.shift();
                }
            }, 1000);
        }

        if (this.cpuMeasurements.length === 0) {
            return 0;
        }

        return this.cpuMeasurements.reduce((a, b) => a + b, 0) / this.cpuMeasurements.length;
    }

    /**
     * Create ID generator
     */
    createIdGenerator(prefix) {
        let counter = 0;
        return () =>
            `${prefix}_${Date.now()}_${(counter += 1)}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Flush metrics to backend
     */
    flush() {
        const metricsToSend = [];

        // Gather all metrics
        for (const values of this.metrics.values()) {
            metricsToSend.push(...values);
        }

        if (metricsToSend.length === 0) {
            return;
        }

        // In production, this would send to a metrics backend
        this.logger.debug(`Flushing ${metricsToSend.length} metrics`);

        // Clear old metrics
        for (const [name, values] of this.metrics) {
            const cutoff = Date.now() - 5 * 60 * 1000; // Keep last 5 minutes
            this.metrics.set(
                name,
                values.filter(m => m.timestamp > cutoff)
            );
        }
    }

    /**
     * Get observability report
     */
    getReport() {
        const report = {
            metrics: {},
            traces: [],
            counters: {},
            gauges: {},
            histograms: {},
            activeTransactions: this.activeTransactions.size,
            timestamp: Date.now(),
        };

        // Add metrics
        for (const [name, values] of this.metrics) {
            report.metrics[name] = {
                count: values.length,
                latest: values[values.length - 1]?.value,
                values: values.slice(-10), // Last 10 values
            };
        }

        // Add counters
        for (const [name, counter] of this.counters) {
            report.counters[name] = counter.value;
        }

        // Add gauges
        for (const [name, gauge] of this.gauges) {
            report.gauges[name] = gauge.value || (gauge.callback ? gauge.callback() : 0);
        }

        // Add histogram summaries
        for (const [name, histogram] of this.histograms) {
            if (histogram.values.length > 0) {
                const sorted = [...histogram.values].sort((a, b) => a - b);
                report.histograms[name] = {
                    count: sorted.length,
                    min: sorted[0],
                    max: sorted[sorted.length - 1],
                    p50: sorted[Math.floor(sorted.length * 0.5)],
                    p95: sorted[Math.floor(sorted.length * 0.95)],
                    p99: sorted[Math.floor(sorted.length * 0.99)],
                };
            }
        }

        // Add recent traces
        for (const [id, trace] of this.traces) {
            if (trace.status === 'completed' && trace.endTime > Date.now() - 60000) {
                report.traces.push({
                    id,
                    name: trace.name,
                    duration: trace.duration,
                    spanCount: trace.spans.length,
                });
            }
        }

        return report;
    }

    /**
     * Export data for debugging
     */
    exportDebugData() {
        return {
            report: this.getReport(),
            config: this.config,
            traces: Array.from(this.traces.values()),
            spans: Array.from(this.spans.values()),
            metrics: Object.fromEntries(this.metrics),
            timestamp: Date.now(),
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }

        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }

        this.flush();

        this.metrics.clear();
        this.traces.clear();
        this.spans.clear();
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.activeTransactions.clear();
    }
}

// Create singleton instance
ObservabilityManager.instance = new ObservabilityManager();

// Export singleton
export default ObservabilityManager.instance;
