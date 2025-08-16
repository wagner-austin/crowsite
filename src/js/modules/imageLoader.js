/**
 * Simple Image Loader Integration
 * Connects the advanced ImageManager to the page
 */

import { Logger } from '../core/logger.js';
import ImageManager from './images.js';

export class ImageLoader {
    constructor() {
        this.logger = new Logger('ImageLoader');
        this.manager = ImageManager;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) {
            return;
        }

        try {
            this.logger.info('Initializing image loader...');

            // Initialize the image manager
            await this.manager.init();

            // Setup page-specific images
            this.setupPageImages();

            // Setup image galleries
            this.setupGalleries();

            // Setup interactive effects
            this.setupInteractiveEffects();

            this.initialized = true;
            this.logger.success('Image loader initialized');
        } catch (error) {
            this.logger.error('Failed to initialize image loader', error);
        }
    }

    /**
     * Setup images on the current page
     */
    setupPageImages() {
        // Profile section
        const profileImg = document.querySelector('.profile-image');
        if (profileImg && this.manager.imageConfig?.profile?.photo) {
            profileImg.dataset.src = this.manager.imageConfig.profile.photo.src;
            profileImg.dataset.effect = 'glitch';
            profileImg.dataset.placeholderType = 'profile';
            profileImg.dataset.lazy = 'true';
        }

        // Logo images
        const headerLogo = document.querySelector('.header-logo');
        if (headerLogo && this.manager.imageConfig?.logos?.header) {
            headerLogo.src = this.manager.imageConfig.logos.header.src;
            headerLogo.alt = this.manager.imageConfig.logos.header.alt;
        }

        // Background images
        const heroSection = document.querySelector('.hero-section');
        if (heroSection && this.manager.imageConfig?.backgrounds?.hero?.enabled) {
            const config = this.manager.imageConfig.backgrounds.hero;
            heroSection.dataset.bgResponsive = JSON.stringify({
                default: config.src,
                640: config.srcset?.['640w'],
                1024: config.srcset?.['1024w'],
                1920: config.srcset?.['1920w'],
                3840: config.srcset?.['3840w'],
            });
        }

        // Project thumbnails
        const projectCards = document.querySelectorAll('.project-card img');
        projectCards.forEach((img, index) => {
            img.dataset.lazy = 'true';
            img.dataset.placeholderType = 'project';
            if (index % 3 === 0) {
                img.dataset.effect = 'pixel';
            }
            if (index % 3 === 1) {
                img.dataset.effect = 'vhs';
            }
            if (index % 3 === 2) {
                img.dataset.effect = 'glitch';
            }
        });

        // Skill icons
        const skillIcons = document.querySelectorAll('.skill-icon');
        skillIcons.forEach(icon => {
            const { skill } = icon.dataset;
            if (skill && this.manager.imageConfig?.icons?.skills?.[skill]) {
                icon.src = this.manager.imageConfig.icons.skills[skill];
                icon.alt = skill;
            }
        });
    }

    /**
     * Setup image galleries with navigation
     */
    setupGalleries() {
        const galleries = document.querySelectorAll('[data-gallery]');

        galleries.forEach(gallery => {
            const images = gallery.querySelectorAll('img');
            const galleryName = gallery.dataset.gallery;

            // Add gallery controls
            this.addGalleryControls(gallery, images);

            // Setup lightbox
            images.forEach((img, index) => {
                img.addEventListener('click', () => {
                    this.openLightbox(images, index);
                });

                img.style.cursor = 'pointer';
                img.dataset.galleryIndex = index;
            });

            this.logger.debug(`Gallery "${galleryName}" setup with ${images.length} images`);
        });
    }

    /**
     * Add navigation controls to gallery
     */
    addGalleryControls(gallery, images) {
        if (images.length <= 1) {
            return;
        }

        const controls = document.createElement('div');
        controls.className = 'gallery-controls';
        controls.innerHTML = `
            <button class="gallery-prev" aria-label="Previous image">
                <span>&lt;</span>
            </button>
            <span class="gallery-counter">
                <span class="current">1</span> / <span class="total">${images.length}</span>
            </span>
            <button class="gallery-next" aria-label="Next image">
                <span>&gt;</span>
            </button>
        `;

        gallery.appendChild(controls);

        let currentIndex = 0;
        const showImage = index => {
            images.forEach((img, i) => {
                img.style.display = i === index ? 'block' : 'none';
            });
            controls.querySelector('.current').textContent = index + 1;
            currentIndex = index;
        };

        controls.querySelector('.gallery-prev').addEventListener('click', () => {
            showImage((currentIndex - 1 + images.length) % images.length);
        });

        controls.querySelector('.gallery-next').addEventListener('click', () => {
            showImage((currentIndex + 1) % images.length);
        });

        // Show first image
        showImage(0);
    }

    /**
     * Open lightbox for image viewing
     */
    openLightbox(images, startIndex) {
        const lightbox = document.createElement('div');
        lightbox.className = 'image-lightbox active';
        lightbox.innerHTML = `
            <div class="lightbox-overlay"></div>
            <div class="lightbox-content">
                <button class="lightbox-close" aria-label="Close">&times;</button>
                <button class="lightbox-prev" aria-label="Previous">&lt;</button>
                <button class="lightbox-next" aria-label="Next">&gt;</button>
                <div class="lightbox-image-container">
                    <img class="lightbox-image" alt="">
                </div>
                <div class="lightbox-caption"></div>
                <div class="lightbox-counter">
                    <span class="current">${startIndex + 1}</span> / ${images.length}
                </div>
            </div>
        `;

        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';

        let currentIndex = startIndex;
        const lightboxImg = lightbox.querySelector('.lightbox-image');
        const caption = lightbox.querySelector('.lightbox-caption');
        const counter = lightbox.querySelector('.current');

        const showImage = index => {
            const img = images[index];
            lightboxImg.src = img.dataset.fullSrc || img.src;
            lightboxImg.alt = img.alt;
            caption.textContent = img.dataset.caption || img.alt || '';
            counter.textContent = index + 1;
            currentIndex = index;

            // Apply effect if specified
            if (img.dataset.effect) {
                this.manager.applyEffect(lightboxImg, img.dataset.effect);
            }
        };

        // Event handlers
        const close = () => {
            lightbox.classList.remove('active');
            setTimeout(() => {
                document.body.removeChild(lightbox);
                document.body.style.overflow = '';
            }, 300);
        };

        lightbox.querySelector('.lightbox-close').addEventListener('click', close);
        lightbox.querySelector('.lightbox-overlay').addEventListener('click', close);

        lightbox.querySelector('.lightbox-prev').addEventListener('click', e => {
            e.stopPropagation();
            showImage((currentIndex - 1 + images.length) % images.length);
        });

        lightbox.querySelector('.lightbox-next').addEventListener('click', e => {
            e.stopPropagation();
            showImage((currentIndex + 1) % images.length);
        });

        // Keyboard navigation
        const handleKeyboard = e => {
            if (e.key === 'Escape') {
                close();
            }
            if (e.key === 'ArrowLeft') {
                showImage((currentIndex - 1 + images.length) % images.length);
            }
            if (e.key === 'ArrowRight') {
                showImage((currentIndex + 1) % images.length);
            }
        };

        document.addEventListener('keydown', handleKeyboard);
        lightbox.addEventListener('close', () => {
            document.removeEventListener('keydown', handleKeyboard);
        });

        // Show initial image
        showImage(startIndex);

        this.logger.debug('Lightbox opened', { startIndex, totalImages: images.length });
    }

    /**
     * Setup interactive image effects
     */
    setupInteractiveEffects() {
        // Hover effects for images with data-hover-effect
        const hoverImages = document.querySelectorAll('[data-hover-effect]');

        hoverImages.forEach(img => {
            const effect = img.dataset.hoverEffect;
            const originalEffect = img.dataset.effect;

            img.addEventListener('mouseenter', () => {
                this.manager.applyEffect(img, effect);
            });

            img.addEventListener('mouseleave', () => {
                if (originalEffect) {
                    this.manager.applyEffect(img, originalEffect);
                } else {
                    img.classList.remove(
                        'glitch-image',
                        'scanlines',
                        'vhs-effect',
                        'pixel-art',
                        'crt-effect'
                    );
                }
            });
        });

        // Click effects for interactive images
        const clickImages = document.querySelectorAll('[data-click-effect]');

        clickImages.forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                const effect = img.dataset.clickEffect;
                this.manager.applyEffect(img, effect);

                // Remove effect after animation
                setTimeout(() => {
                    img.classList.remove('glitching');
                }, 1000);
            });
        });

        // Parallax effects for backgrounds
        const parallaxElements = document.querySelectorAll('[data-parallax]');

        if (parallaxElements.length > 0) {
            let ticking = false;

            const updateParallax = () => {
                const scrolled = window.pageYOffset;

                parallaxElements.forEach(element => {
                    const speed = parseFloat(element.dataset.parallax) || 0.5;
                    const yPos = -(scrolled * speed);
                    element.style.transform = `translateY(${yPos}px)`;
                });

                ticking = false;
            };

            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(updateParallax);
                    ticking = true;
                }
            });
        }
    }

    /**
     * Preload specific images
     */
    async preloadImages(urls) {
        const promises = urls.map(url => this.manager.preloadImage(url));

        try {
            await Promise.all(promises);
            this.logger.info(`Preloaded ${urls.length} images`);
        } catch (error) {
            this.logger.warn('Some images failed to preload', error);
        }
    }

    /**
     * Add custom image to the system
     */
    addImage(config) {
        const picture = this.manager.createOptimizedImage(config);
        return picture;
    }

    /**
     * Get optimized image URL
     */
    getOptimizedUrl(originalUrl) {
        return this.manager.getOptimizedSrc(originalUrl);
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.manager.destroy();
        this.initialized = false;
        this.logger.info('Image loader destroyed');
    }
}

export default new ImageLoader();
