export const DOM = {
    select(selector) {
        return document.querySelector(selector);
    },

    selectAll(selector) {
        return Array.from(document.querySelectorAll(selector));
    },

    create(tag, className = '', attributes = {}) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'dataset' && typeof value === 'object') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        return element;
    },

    remove(selector) {
        const elements =
            typeof selector === 'string' ? document.querySelectorAll(selector) : [selector];

        elements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        return this;
    },

    append(parent, children) {
        const parentElement = typeof parent === 'string' ? document.querySelector(parent) : parent;

        if (!parentElement) {
            return this;
        }

        const childArray = Array.isArray(children) ? children : [children];

        childArray.forEach(child => {
            if (typeof child === 'string') {
                parentElement.insertAdjacentHTML('beforeend', child);
            } else if (child instanceof Node) {
                parentElement.appendChild(child);
            }
        });
        return this;
    },

    prepend(parent, children) {
        const parentElement = typeof parent === 'string' ? document.querySelector(parent) : parent;

        if (!parentElement) {
            return this;
        }

        const childArray = Array.isArray(children) ? children : [children];

        childArray.reverse().forEach(child => {
            if (typeof child === 'string') {
                parentElement.insertAdjacentHTML('afterbegin', child);
            } else if (child instanceof Node) {
                parentElement.insertBefore(child, parentElement.firstChild);
            }
        });
        return this;
    },

    addClass(element, ...classNames) {
        const elements =
            typeof element === 'string' ? document.querySelectorAll(element) : [element];

        elements.forEach(el => {
            if (el) {
                el.classList.add(...classNames);
            }
        });
        return this;
    },

    removeClass(element, ...classNames) {
        const elements =
            typeof element === 'string' ? document.querySelectorAll(element) : [element];

        elements.forEach(el => {
            if (el) {
                el.classList.remove(...classNames);
            }
        });
        return this;
    },

    toggleClass(element, className) {
        const elements =
            typeof element === 'string' ? document.querySelectorAll(element) : [element];

        elements.forEach(el => {
            if (el) {
                el.classList.toggle(className);
            }
        });
        return this;
    },

    hasClass(element, className) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        return el ? el.classList.contains(className) : false;
    },

    on(selector, event, handler, options = {}) {
        const elements =
            typeof selector === 'string' ? document.querySelectorAll(selector) : [selector];

        elements.forEach(element => {
            if (element) {
                element.addEventListener(event, handler, options);
            }
        });

        return () => {
            elements.forEach(element => {
                if (element) {
                    element.removeEventListener(event, handler, options);
                }
            });
        };
    },

    off(selector, event, handler, options = {}) {
        const elements =
            typeof selector === 'string' ? document.querySelectorAll(selector) : [selector];

        elements.forEach(element => {
            if (element) {
                element.removeEventListener(event, handler, options);
            }
        });
        return this;
    },

    once(selector, event, handler, options = {}) {
        const wrappedHandler = e => {
            handler(e);
            this.off(selector, event, wrappedHandler, options);
        };

        this.on(selector, event, wrappedHandler, options);
        return this;
    },

    delegate(parent, selector, event, handler) {
        const parentElement = typeof parent === 'string' ? document.querySelector(parent) : parent;

        if (!parentElement) {
            return this;
        }

        const delegatedHandler = e => {
            const target = e.target.closest(selector);
            if (target && parentElement.contains(target)) {
                handler.call(target, e);
            }
        };

        parentElement.addEventListener(event, delegatedHandler);

        return () => {
            parentElement.removeEventListener(event, delegatedHandler);
        };
    },

    ready(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
        return this;
    },

    attr(element, attribute, value) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        if (!el) {
            return value === undefined ? undefined : this;
        }

        if (value === undefined) {
            return el.getAttribute(attribute);
        }

        if (value === null) {
            el.removeAttribute(attribute);
        } else {
            el.setAttribute(attribute, value);
        }
        return this;
    },

    data(element, key, value) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        if (!el) {
            return value === undefined ? undefined : this;
        }

        if (value === undefined) {
            return el.dataset[key];
        }

        el.dataset[key] = value;
        return this;
    },

    style(element, styles) {
        const elements =
            typeof element === 'string' ? document.querySelectorAll(element) : [element];

        elements.forEach(el => {
            if (el) {
                Object.assign(el.style, styles);
            }
        });
        return this;
    },

    show(element) {
        const elements =
            typeof element === 'string' ? document.querySelectorAll(element) : [element];

        elements.forEach(el => {
            if (el) {
                el.style.display = '';
            }
        });
        return this;
    },

    hide(element) {
        const elements =
            typeof element === 'string' ? document.querySelectorAll(element) : [element];

        elements.forEach(el => {
            if (el) {
                el.style.display = 'none';
            }
        });
        return this;
    },

    html(element, content) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        if (!el) {
            return content === undefined ? undefined : this;
        }

        if (content === undefined) {
            return el.innerHTML;
        }

        el.innerHTML = content;
        return this;
    },

    text(element, content) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        if (!el) {
            return content === undefined ? undefined : this;
        }

        if (content === undefined) {
            return el.textContent;
        }

        el.textContent = content;
        return this;
    },

    value(element, val) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        if (!el) {
            return val === undefined ? undefined : this;
        }

        if (val === undefined) {
            return el.value;
        }

        el.value = val;
        return this;
    },

    parent(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        return el ? el.parentElement : null;
    },

    children(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        return el ? Array.from(el.children) : [];
    },

    siblings(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        if (!el || !el.parentElement) {
            return [];
        }

        return Array.from(el.parentElement.children).filter(child => child !== el);
    },

    closest(element, selector) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;

        return el ? el.closest(selector) : null;
    },

    find(parent, selector) {
        const parentElement = typeof parent === 'string' ? document.querySelector(parent) : parent;

        return parentElement ? parentElement.querySelector(selector) : null;
    },

    findAll(parent, selector) {
        const parentElement = typeof parent === 'string' ? document.querySelector(parent) : parent;

        return parentElement ? Array.from(parentElement.querySelectorAll(selector)) : [];
    },
};
