/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers
 */

// Timing Constants (in milliseconds)
export const TIMING = {
    ANIMATION_DURATION: 500,
    ANIMATION_FAST: 200,
    ANIMATION_SLOW: 1000,
    TRANSITION_FAST: 200,
    TRANSITION_DEFAULT: 300,
    TRANSITION_SLOW: 500,
    DEBOUNCE_DELAY: 250,
    THROTTLE_DELAY: 100,
    IDLE_CALLBACK_TIMEOUT: 1,
    LOADING_SCREEN_MIN_DURATION: 1000,
    LOADING_SCREEN_FADE_DURATION: 500,
    NUMBER_ANIMATION_STEP: 30,
    NUMBER_ANIMATION_INCREMENT_DIVISOR: 50,
    TYPEWRITER_SPEED: 50,
    FPS_SAMPLE_INTERVAL: 1000,
    MEMORY_CHECK_INTERVAL: 5000,
};

// Performance Thresholds
export const PERFORMANCE = {
    MEMORY_WARNING_THRESHOLD: 90,
    HIGH_PERFORMANCE_MIN_SCORE: 10,
    MEDIUM_PERFORMANCE_MIN_SCORE: 6,
    HIGH_CPU_CORES: 8,
    MEDIUM_CPU_CORES: 4,
    HIGH_MEMORY_MB: 8192,
    MEDIUM_MEMORY_MB: 4096,
    TARGET_FPS: 60,
    MIN_FPS: 30,
    FRAME_TIME_MS: 16, // 1000ms / 60fps
    LONG_TASK_THRESHOLD: 50,
    INTERACTION_DELAY_MAX: 100,
    LAYOUT_SHIFT_THRESHOLD: 0.1,
};

// Audio Configuration
export const AUDIO = {
    MASTER_VOLUME: 0.5,
    EFFECT_VOLUME: 0.3,
    CLICK_VOLUME: 0.2,
    DEFAULT_FREQUENCY: 440,
    DEFAULT_DURATION: 100,
    WAVE_TYPE: 'sine',
    NOTES: {
        C4: 261.63,
        D4: 293.66,
        E4: 329.63,
        F4: 349.23,
        G4: 392.0,
        A4: 440.0,
        B4: 493.88,
        C5: 523.25,
    },
    SEQUENCES: {
        POWER_UP: [261.63, 329.63, 392.0, 523.25],
        SUCCESS: [329.63, 392.0, 523.25],
        ERROR: [220.0, 196.0, 174.61],
        CLICK: [440.0],
        NAV: [349.23, 392.0],
    },
};

// Viewport Breakpoints (in pixels)
export const BREAKPOINTS = {
    MOBILE_MIN: 320,
    MOBILE_MAX: 480,
    TABLET_MIN: 481,
    TABLET_MAX: 768,
    LAPTOP_MIN: 769,
    LAPTOP_MAX: 1024,
    DESKTOP_MIN: 1025,
    DESKTOP_MAX: 1200,
    LARGE_DESKTOP_MIN: 1201,
    WIDE_MIN: 1920,
    ULTRA_WIDE_MIN: 2560,
};

// Z-Index Layers
export const Z_INDEX = {
    BACKGROUND: -1,
    BASE: 0,
    CONTENT: 1,
    ELEVATED: 10,
    STICKY: 100,
    DROPDOWN: 200,
    OVERLAY: 300,
    MODAL: 400,
    POPOVER: 500,
    TOOLTIP: 600,
    TOAST: 700,
    LOADING: 800,
    NOTIFICATION: 900,
    CRITICAL: 1000,
    DEBUG: 9999,
};

// Image Configuration
export const IMAGE = {
    LAZY_LOAD_OFFSET: 100,
    PLACEHOLDER_QUALITY: 10,
    THUMBNAIL_SIZE: 400,
    MAX_WIDTH: 1920,
    QUALITY: {
        HIGH: 95,
        MEDIUM: 85,
        LOW: 70,
        THUMBNAIL: 60,
    },
    FORMATS: ['webp', 'avif', 'jpg', 'png'],
    BREAKPOINTS: [640, 1024, 1920, 3840],
    CACHE_MAX_SIZE: 50,
    CACHE_TTL: 3600000, // 1 hour
    BLUR_RADIUS: 20,
    EFFECT_OPACITY: 0.03,
};

// Theme Configuration
export const THEME = {
    DEFAULT: 'poe-light',
    STORAGE_KEY: 'theme-preference',
    TRANSITION_DURATION: 300,
    AVAILABLE_THEMES: ['poe-light', 'poe-dark'],
    AUTO_SAVE: true,
};

// Storage Keys
export const STORAGE_KEYS = {
    THEME: 'theme-preference',
    SOUND_ENABLED: 'sound-enabled',
    PERFORMANCE_MODE: 'performance-mode',
    USER_PREFERENCES: 'user-preferences',
    DEBUG_ENABLED: 'debug-enabled',
    ANIMATION_ENABLED: 'animation-enabled',
};

// Error Messages
export const ERROR_MESSAGES = {
    GENERIC: 'An error occurred. Please try again.',
    NETWORK: 'Network error. Please check your connection.',
    BROWSER_NOT_SUPPORTED: 'Your browser is not supported. Please upgrade to a modern browser.',
    FEATURE_NOT_SUPPORTED: 'This feature is not supported in your browser.',
    MODULE_LOAD_FAILED: 'Failed to load module',
    AUDIO_LOAD_FAILED: 'Failed to load audio',
    IMAGE_LOAD_FAILED: 'Failed to load image',
    INVALID_COMMAND: 'Command not recognized',
    PERMISSION_DENIED: 'Permission denied',
    TIMEOUT: 'Operation timed out',
};

// Success Messages
export const SUCCESS_MESSAGES = {
    INITIALIZED: 'System initialized successfully',
    SAVED: 'Changes saved successfully',
    COPIED: 'Copied to clipboard',
    MESSAGE_SENT: 'Message transmitted successfully',
    THEME_CHANGED: 'Theme updated',
    SOUND_TOGGLED: 'Sound toggled',
};

// Animation Easing Functions
export const EASING = {
    LINEAR: 'linear',
    EASE: 'ease',
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
    CUBIC_BEZIER: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// Regular Expressions
export const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\\/\w .-]*)*\/?$/,
    COMMAND: /^[a-zA-Z0-9_-]+$/,
    WHITESPACE: /\s+/g,
    SPECIAL_CHARS: /[^a-zA-Z0-9]/g,
};

// API Endpoints (if needed in future)
export const API = {
    BASE_URL: '',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
};

// Feature Flags
export const FEATURES = {
    WEBGL_EFFECTS: true,
    PARTICLE_SYSTEM: true,
    SOUND_EFFECTS: true,
    TERMINAL_GAMES: false,
    ADVANCED_ANIMATIONS: true,
    DEBUG_MODE: false,
};

// Color Palette (for reference)
export const COLORS = {
    PRIMARY: '#00ffcc',
    SECONDARY: '#ff00ff',
    SUCCESS: '#00ff00',
    ERROR: '#ff0044',
    WARNING: '#ffaa00',
    INFO: '#00aaff',
    BACKGROUND: '#0a0a0a',
    SURFACE: '#1a1a1a',
    TEXT: '#e0e0e0',
    TEXT_SECONDARY: '#999999',
};

// Accessibility
export const A11Y = {
    FOCUS_VISIBLE_OUTLINE: '2px solid #00ffcc',
    MIN_CONTRAST_RATIO: 4.5,
    LARGE_TEXT_SIZE: 18,
    SKIP_LINK_OFFSET: -9999,
    ANNOUNCE_DELAY: 100,
};

// Export all constants as default
export default {
    TIMING,
    PERFORMANCE,
    AUDIO,
    BREAKPOINTS,
    Z_INDEX,
    IMAGE,
    THEME,
    STORAGE_KEYS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    EASING,
    REGEX,
    API,
    FEATURES,
    COLORS,
    A11Y,
};
