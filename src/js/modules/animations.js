import { Logger } from '../core/logger.js';

export class Animations {
    constructor() {
        this.logger = new Logger('Animations');
        this.animations = new Map();
        this.observers = [];
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    init() {
        this.registerObservers();
        this.initScrollAnimations();
        this.initHoverEffects();
        this.logger.info('Animations initialized');
    }

    registerObservers() {
        if (this.isReducedMotion) {
            this.logger.info('Reduced motion detected, animations minimized');
            return;
        }

        const options = {
            root: null,
            rootMargin: '0px',
            threshold: [0, 0.25, 0.5, 0.75, 1],
        };

        const observer = new IntersectionObserver(this.handleIntersection.bind(this), options);

        const elements = document.querySelectorAll('[data-animate]');
        elements.forEach(element => {
            observer.observe(element);
        });

        this.observers.push(observer);
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const animation = element.dataset.animate || 'fadeIn';
                const delay = element.dataset.animateDelay || 0;

                setTimeout(() => {
                    this.animate(element, animation);
                }, delay);
            }
        });
    }

    animate(element, animation, options = {}) {
        const defaults = {
            duration: 500,
            easing: 'ease-out',
            fill: 'forwards',
        };

        const settings = { ...defaults, ...options };

        const animations = {
            fadeIn: [{ opacity: 0 }, { opacity: 1 }],
            slideUp: [
                { opacity: 0, transform: 'translateY(30px)' },
                { opacity: 1, transform: 'translateY(0)' },
            ],
            slideDown: [
                { opacity: 0, transform: 'translateY(-30px)' },
                { opacity: 1, transform: 'translateY(0)' },
            ],
            slideLeft: [
                { opacity: 0, transform: 'translateX(30px)' },
                { opacity: 1, transform: 'translateX(0)' },
            ],
            slideRight: [
                { opacity: 0, transform: 'translateX(-30px)' },
                { opacity: 1, transform: 'translateX(0)' },
            ],
            zoomIn: [
                { opacity: 0, transform: 'scale(0.8)' },
                { opacity: 1, transform: 'scale(1)' },
            ],
            zoomOut: [
                { opacity: 0, transform: 'scale(1.2)' },
                { opacity: 1, transform: 'scale(1)' },
            ],
            rotate: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
            bounce: [
                { transform: 'translateY(0)' },
                { transform: 'translateY(-20px)' },
                { transform: 'translateY(0)' },
            ],
            shake: [
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' },
            ],
            pulse: [
                { transform: 'scale(1)' },
                { transform: 'scale(1.05)' },
                { transform: 'scale(1)' },
            ],
            flash: [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }],
        };

        const keyframes = animations[animation];

        if (!keyframes) {
            this.logger.warn(`Animation '${animation}' not found`);
            return;
        }

        if (element.animate) {
            const anim = element.animate(keyframes, settings);
            this.animations.set(element, anim);

            anim.onfinish = () => {
                this.animations.delete(element);
                element.classList.add(`animated-${animation}`);
            };

            return anim;
        }
        element.classList.add(`animated-${animation}`);
        return undefined;
    }

    glitch(selector, duration = 500) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;

        if (!element) {
            return;
        }

        element.classList.add('glitch');

        setTimeout(() => {
            element.classList.remove('glitch');
        }, duration);
    }

    typewriter(element, text, speed = 50) {
        return new Promise(resolve => {
            let index = 0;
            element.textContent = '';

            const type = () => {
                if (index < text.length) {
                    element.textContent += text.charAt(index);
                    index += 1;
                    setTimeout(type, speed);
                } else {
                    resolve();
                }
            };

            type();
        });
    }

    countUp(element, start, end, duration = 2000) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;

            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }

            element.textContent = Math.floor(current);
        }, 16);

        return timer;
    }

    parallax(elements, speed = 0.5) {
        const handleScroll = () => {
            const scrollY = window.pageYOffset;

            elements.forEach(element => {
                const elementTop = element.offsetTop;
                const elementHeight = element.offsetHeight;
                const windowHeight = window.innerHeight;

                if (scrollY + windowHeight > elementTop && scrollY < elementTop + elementHeight) {
                    const yPos = -(scrollY - elementTop) * speed;
                    element.style.transform = `translateY(${yPos}px)`;
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }

    ripple(event, color = 'rgba(0, 255, 204, 0.5)') {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: ${color};
            pointer-events: none;
            transform: translate(${x}px, ${y}px) scale(0);
            animation: ripple-effect 0.6s ease-out;
        `;

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    initScrollAnimations() {
        const elements = document.querySelectorAll('[data-scroll-animate]');

        if (elements.length === 0) {
            return;
        }

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '50px',
        };

        const scrollObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const animation = entry.target.dataset.scrollAnimate;
                    this.animate(entry.target, animation);
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        elements.forEach(element => {
            scrollObserver.observe(element);
        });
    }

    initHoverEffects() {
        const buttons = document.querySelectorAll('.btn');

        buttons.forEach(button => {
            button.addEventListener('mouseenter', e => {
                this.animate(e.target, 'pulse', { duration: 300 });
            });

            button.addEventListener('click', e => {
                this.ripple(e);
            });
        });

        const cards = document.querySelectorAll('.card');

        cards.forEach(card => {
            card.addEventListener('mouseenter', e => {
                this.animate(e.target, 'zoomIn', { duration: 200 });
            });
        });
    }

    stagger(elements, animation, delay = 100) {
        elements.forEach((element, index) => {
            setTimeout(() => {
                this.animate(element, animation);
            }, index * delay);
        });
    }

    chain(animations) {
        return animations.reduce(
            (promise, { element, animation, options }) =>
                promise.then(
                    () =>
                        new Promise(resolve => {
                            const anim = this.animate(element, animation, options);
                            if (anim && anim.finished) {
                                anim.finished.then(resolve);
                            } else {
                                setTimeout(resolve, options?.duration || 500);
                            }
                        })
                ),
            Promise.resolve()
        );
    }

    morph(element, from, to, duration = 1000) {
        const steps = 60;
        const stepDuration = duration / steps;
        let currentStep = 0;

        const interpolate = (start, end, progress) => start + (end - start) * progress;

        const timer = setInterval(() => {
            currentStep += 1;
            const progress = currentStep / steps;

            Object.keys(to).forEach(property => {
                const startValue = parseFloat(from[property]) || 0;
                const endValue = parseFloat(to[property]) || 0;
                const currentValue = interpolate(startValue, endValue, progress);

                if (property === 'opacity' || property === 'scale') {
                    element.style[property] = currentValue;
                } else {
                    const unit = to[property].replace(/[0-9.-]/g, '') || 'px';
                    element.style[property] = currentValue + unit;
                }
            });

            if (currentStep >= steps) {
                clearInterval(timer);
            }
        }, stepDuration);

        return timer;
    }

    particles(container, options = {}) {
        const defaults = {
            count: 50,
            size: 3,
            color: '#00ffcc',
            speed: 1,
            direction: 'up',
        };

        const settings = { ...defaults, ...options };
        const particles = [];

        for (let i = 0; i < settings.count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${settings.size}px;
                height: ${settings.size}px;
                background: ${settings.color};
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                pointer-events: none;
            `;

            container.appendChild(particle);
            particles.push({
                element: particle,
                x: Math.random() * 100,
                y: Math.random() * 100,
                vx: (Math.random() - 0.5) * settings.speed,
                vy:
                    settings.direction === 'up'
                        ? -Math.random() * settings.speed
                        : Math.random() * settings.speed,
            });
        }

        const animateParticles = () => {
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;

                if (particle.x < 0 || particle.x > 100) {
                    particle.vx *= -1;
                }
                if (particle.y < 0 || particle.y > 100) {
                    particle.vy *= -1;
                }

                particle.element.style.left = `${particle.x}%`;
                particle.element.style.top = `${particle.y}%`;
            });

            requestAnimationFrame(animateParticles);
        };

        animateParticles();

        return () => {
            particles.forEach(p => p.element.remove());
        };
    }

    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.animations.forEach(animation => animation.cancel());
        this.animations.clear();
        this.observers = [];
        this.logger.info('Animations destroyed');
    }
}
