/**
 * Async Operation Wrapper
 * Provides consistent error handling for all async operations
 */

import { Logger } from './logger.js';
import ErrorHandler from './errorHandler.js';
import ObservabilityManager from './observability.js';

// Helper functions
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (promise, ms) => {
    if (ms > 0) {
        return Promise.race([
            promise,
            new Promise((_, rej) =>
                setTimeout(() => rej(new Error(`Operation timed out after ${ms}ms`)), ms)
            ),
        ]);
    }
    return promise;
};

function markOk(span, tx) {
    span.setStatus('ok');
    tx.setStatus('success');
    ObservabilityManager.incrementCounter('async.success');
}

function logAndRecordFailure({ logger, span, opName, context, attempt, error }) {
    logger.error(`Async operation failed: ${opName}`, {
        attempt,
        error: error.message,
        stack: error.stack,
        context,
    });
    span.recordException(error);
    ObservabilityManager.incrementCounter('async.error');
    ObservabilityManager.recordError({ type: 'async', operation: opName, attempt, error });
}

function finalizeWithFallbackOrThrow({ tx, name, context, critical, fallback, error, args }) {
    tx.setStatus('failed');
    ErrorHandler.handleError({
        type: 'async',
        operation: name,
        message: `Async operation failed after ${args._attempt} attempts: ${error.message}`,
        error,
        context,
        severity: critical ? 'critical' : 'error',
    });

    if (fallback !== null) {
        const logger = new Logger(context.module || 'AsyncWrapper');
        logger.warn(`Using fallback for ${name}`);
        ObservabilityManager.incrementCounter('async.fallback');
        return typeof fallback === 'function' ? fallback(error, ...args) : fallback;
    }

    throw error;
}

/**
 * Wrap an async function with error handling and observability
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Configuration options
 * @returns {Function} Wrapped async function
 */
export function wrapAsync(fn, options = {}) {
    const {
        name = fn.name || 'anonymous',
        context = {},
        retryCount = 0,
        retryDelay = 1000,
        timeout = 0,
        fallback = null,
        critical = false,
    } = options;

    return async function (...args) {
        const tx = ObservabilityManager.startTransaction(`async.${name}`);
        let attempt = 0;
        let lastError = null;

        try {
            while (attempt <= retryCount) {
                const span = ObservabilityManager.startSpan(`async.${name}.attempt.${attempt}`);
                try {
                    const result = await withTimeout(fn.apply(this, args), timeout);
                    markOk(span, tx);
                    return result;
                } catch (error) {
                    lastError = error;
                    attempt += 1;

                    const logger = new Logger(context.module || 'AsyncWrapper');
                    logAndRecordFailure({ logger, span, opName: name, context, attempt, error });

                    if (attempt <= retryCount) {
                        logger.info(`Retrying ${name} (attempt ${attempt}/${retryCount})...`);
                        ObservabilityManager.incrementCounter('async.retry');
                        await sleep(retryDelay * attempt);
                    } else {
                        // Pass attempt via args so we can include it in the message
                        return finalizeWithFallbackOrThrow({
                            tx,
                            name,
                            context,
                            critical,
                            fallback,
                            error,
                            args: { _attempt: attempt, ...args },
                        });
                    }
                } finally {
                    span.end();
                }
            }

            throw lastError;
        } finally {
            tx.end();
        }
    };
}

/**
 * Wrap a class method with async error handling
 * @param {Object} target - Target object/class
 * @param {string} methodName - Method name to wrap
 * @param {Object} options - Configuration options
 */
export function wrapAsyncMethod(target, methodName, options = {}) {
    const original = target[methodName];

    if (typeof original !== 'function') {
        throw new Error(`${methodName} is not a function`);
    }

    target[methodName] = wrapAsync(original, {
        name: `${target.constructor.name}.${methodName}`,
        context: { class: target.constructor.name, method: methodName },
        ...options,
    });
}

/**
 * Decorator for async methods
 * @param {Object} options - Configuration options
 */
export function AsyncErrorHandler(options = {}) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = wrapAsync(originalMethod, {
            name: `${target.constructor.name}.${propertyKey}`,
            context: { class: target.constructor.name, method: propertyKey },
            ...options,
        });

        return descriptor;
    };
}

/**
 * Execute multiple async operations in parallel with error handling
 * @param {Array} operations - Array of async operations
 * @param {Object} options - Configuration options
 */
export async function parallelAsync(operations, options = {}) {
    const { failFast = false, timeout = 0, maxConcurrency = Infinity } = options;

    const logger = new Logger('AsyncWrapper');
    const transaction = ObservabilityManager.startTransaction('async.parallel');

    try {
        // Handle max concurrency
        if (maxConcurrency < operations.length) {
            const results = [];
            const chunks = [];

            for (let i = 0; i < operations.length; i += maxConcurrency) {
                chunks.push(operations.slice(i, i + maxConcurrency));
            }

            for (const chunk of chunks) {
                const chunkResults = failFast
                    ? await Promise.all(chunk.map(op => wrapAsync(op, { timeout })()))
                    : await Promise.allSettled(chunk.map(op => wrapAsync(op, { timeout })()));

                results.push(...chunkResults);
            }

            transaction.setStatus('success');
            return results;
        }

        // Execute all operations
        const wrappedOps = operations.map(op => wrapAsync(op, { timeout })());

        const results = failFast
            ? await Promise.all(wrappedOps)
            : await Promise.allSettled(wrappedOps);

        // Check for failures in allSettled mode
        if (!failFast) {
            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0) {
                logger.warn(`${failures.length} of ${operations.length} operations failed`);
                ObservabilityManager.recordMetric('async.parallel.failures', failures.length);
            }
        }

        transaction.setStatus('success');
        return results;
    } catch (error) {
        transaction.setStatus('failed');
        ErrorHandler.handleError({
            type: 'async.parallel',
            message: 'Parallel async operations failed',
            error,
        });
        throw error;
    } finally {
        transaction.end();
    }
}

/**
 * Execute async operations in sequence with error handling
 * @param {Array} operations - Array of async operations
 * @param {Object} options - Configuration options
 */
export async function sequentialAsync(operations, options = {}) {
    const { stopOnError = true, timeout = 0 } = options;

    const logger = new Logger('AsyncWrapper');
    const transaction = ObservabilityManager.startTransaction('async.sequential');
    const results = [];

    try {
        for (let i = 0; i < operations.length; i++) {
            const span = ObservabilityManager.startSpan(`async.sequential.op${i}`);

            try {
                const wrapped = wrapAsync(operations[i], { timeout });
                const result = await wrapped();
                results.push({ status: 'fulfilled', value: result });
                span.setStatus('ok');
            } catch (error) {
                span.setStatus('error');
                span.recordException(error);
                results.push({ status: 'rejected', reason: error });

                if (stopOnError) {
                    transaction.setStatus('failed');
                    throw error;
                }

                logger.warn(`Operation ${i} failed, continuing...`, error);
            } finally {
                span.end();
            }
        }

        transaction.setStatus('success');
        return results;
    } catch (error) {
        transaction.setStatus('failed');
        ErrorHandler.handleError({
            type: 'async.sequential',
            message: 'Sequential async operations failed',
            error,
        });
        throw error;
    } finally {
        transaction.end();
    }
}

/**
 * Create a debounced async function
 * @param {Function} fn - Async function to debounce
 * @param {number} delay - Debounce delay in ms
 * @param {Object} options - Configuration options
 */
export function debounceAsync(fn, delay, options = {}) {
    let timeoutId = null;
    let lastPromise = null;

    const wrapped = wrapAsync(fn, options);

    return function (...args) {
        clearTimeout(timeoutId);

        return new Promise((resolve, reject) => {
            timeoutId = setTimeout(async () => {
                try {
                    lastPromise = wrapped.apply(this, args);
                    const result = await lastPromise;
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }, delay);
        });
    };
}

/**
 * Create a throttled async function
 * @param {Function} fn - Async function to throttle
 * @param {number} limit - Throttle limit in ms
 * @param {Object} options - Configuration options
 */
export function throttleAsync(fn, limit, options = {}) {
    let inThrottle = false;
    let lastResult = null;

    const wrapped = wrapAsync(fn, options);

    return async function (...args) {
        if (!inThrottle) {
            inThrottle = true;

            try {
                lastResult = await wrapped.apply(this, args);
            } finally {
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        }

        return lastResult;
    };
}

/**
 * Create a memoized async function
 * @param {Function} fn - Async function to memoize
 * @param {Object} options - Configuration options
 */
export function memoizeAsync(fn, options = {}) {
    const {
        maxCacheSize = 100,
        ttl = 0, // Time to live in ms (0 = no expiration)
        keyGenerator = (...args) => JSON.stringify(args),
    } = options;

    const cache = new Map();
    const wrapped = wrapAsync(fn, options);

    return async function (...args) {
        const key = keyGenerator(...args);

        // Check cache
        if (cache.has(key)) {
            const cached = cache.get(key);

            // Check TTL
            if (ttl === 0 || Date.now() - cached.timestamp < ttl) {
                ObservabilityManager.incrementCounter('async.cache.hit');
                return cached.value;
            }

            // Expired
            cache.delete(key);
        }

        ObservabilityManager.incrementCounter('async.cache.miss');

        // Execute function
        const result = await wrapped.apply(this, args);

        // Store in cache
        cache.set(key, {
            value: result,
            timestamp: Date.now(),
        });

        // Limit cache size
        if (cache.size > maxCacheSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }

        return result;
    };
}

// Export default wrapper
export default wrapAsync;
