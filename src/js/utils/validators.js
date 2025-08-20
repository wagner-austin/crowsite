/**
 * Validation Utilities
 * Provides common validation functions
 */

import { REGEX } from '../core/constants.js';

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
    return REGEX.EMAIL.test(email);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidURL(url) {
    return REGEX.URL.test(url);
}

/**
 * Validate command format
 * @param {string} command - Command to validate
 * @returns {boolean} True if valid command
 */
export function isValidCommand(command) {
    return REGEX.COMMAND.test(command);
}

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim().length === 0;
    }
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }
    return false;
}

/**
 * Check if value is a number
 * @param {*} value - Value to check
 * @returns {boolean} True if number
 */
export function isNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is in range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if in range
 */
export function isInRange(value, min, max) {
    return isNumber(value) && value >= min && value <= max;
}

/**
 * Validate form data
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result with errors
 */
function validateField(field, value, fieldRules, data) {
    // Required validation
    if (fieldRules.required && isEmpty(value)) {
        return `${field} is required`;
    }

    // Skip other validations if empty and not required
    if (isEmpty(value) && !fieldRules.required) {
        return null;
    }

    // Email validation
    if (fieldRules.email && !isValidEmail(value)) {
        return 'Invalid email address';
    }

    // URL validation
    if (fieldRules.url && !isValidURL(value)) {
        return 'Invalid URL';
    }

    // Min length validation
    if (fieldRules.minLength && value.length < fieldRules.minLength) {
        return `Minimum length is ${fieldRules.minLength}`;
    }

    // Max length validation
    if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        return `Maximum length is ${fieldRules.maxLength}`;
    }

    // Pattern validation
    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
        return fieldRules.message || 'Invalid format';
    }

    // Custom validation
    if (fieldRules.custom && typeof fieldRules.custom === 'function') {
        const result = fieldRules.custom(value, data);
        if (result !== true) {
            return result || 'Validation failed';
        }
    }

    return null;
}

export function validateForm(data, rules) {
    const errors = {};
    let isValid = true;

    for (const [field, fieldRules] of Object.entries(rules)) {
        const value = data[field];
        const error = validateField(field, value, fieldRules, data);
        if (error) {
            errors[field] = error;
            isValid = false;
        }
    }

    return { isValid, errors };
}

/**
 * Sanitize HTML string
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Allowed MIME types
 * @returns {boolean} True if valid file type
 */
export function isValidFileType(file, allowedTypes) {
    return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean} True if within size limit
 */
export function isValidFileSize(file, maxSize) {
    return file.size <= maxSize;
}
