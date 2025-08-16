import { Logger } from '../src/js/core/logger.js';

describe('Logger', () => {
    let logger;
    let consoleSpy;

    beforeEach(() => {
        logger = new Logger('TestContext');
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        localStorage.clear();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('initialization', () => {
        it('should create logger with context', () => {
            expect(logger.context).toBe('TestContext');
        });

        it('should set default log level', () => {
            expect(logger.logLevel).toBe(2); // info level
        });

        it('should initialize with empty history', () => {
            expect(logger.history).toEqual([]);
        });
    });

    describe('log levels', () => {
        it('should log info messages', () => {
            logger.info('Test message');
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should log error messages', () => {
            const errorSpy = jest.spyOn(console, 'trace').mockImplementation();
            logger.error('Error message', new Error('Test error'));
            expect(consoleSpy).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        it('should respect log level settings', () => {
            logger.setLogLevel('error');
            logger.info('Should not appear');
            expect(consoleSpy).not.toHaveBeenCalled();

            logger.error('Should appear');
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('history management', () => {
        it('should add entries to history', () => {
            logger.info('Test entry');
            expect(logger.history.length).toBe(1);
            expect(logger.history[0].message).toBe('Test entry');
        });

        it('should limit history size', () => {
            logger.maxHistorySize = 5;
            for (let i = 0; i < 10; i++) {
                logger.info(`Message ${i}`);
            }
            expect(logger.history.length).toBe(5);
        });
    });

    describe('performance timing', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should measure performance with time/timeEnd', () => {
            logger.time('test-timer');
            jest.advanceTimersByTime(1000);
            logger.timeEnd('test-timer');
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('utility methods', () => {
        it('should clear console', () => {
            const clearSpy = jest.spyOn(console, 'clear').mockImplementation();
            logger.clear();
            expect(clearSpy).toHaveBeenCalled();
            clearSpy.mockRestore();
        });

        it('should format messages correctly', () => {
            const formatted = logger.formatMessage('info', 'Test', {});
            expect(formatted).toContain('[TestContext]');
            expect(formatted).toContain('[INFO]');
            expect(formatted).toContain('Test');
        });

        it('should filter history by level', () => {
            logger.info('Info message');
            logger.error('Error message');

            const errors = logger.getHistory({ level: 'error' });
            expect(errors.length).toBe(1);
            expect(errors[0].level).toBe('error');
        });
    });
});
