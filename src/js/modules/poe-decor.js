/* eslint-env browser */

/**
 * Poe Decorations Module
 *
 * Adds atmospheric decorative elements to the Poe theme:
 * - Flying crows that cross the screen
 * - Falling feathers with physics simulation
 * - Ambient particle effects
 * - Scroll-based drift animations
 *
 * Features:
 * - Performance-aware spawning (reduced on low-end devices)
 * - Respects user's save-data and device memory
 * - Fallback SVGs for missing images
 * - Physics-based feather movement with mouse velocity influence
 * - Pauses animations when tab is hidden
 *
 * Mobile specific:
 * - Crow positioned correctly with visualViewport API
 * - Animation overrides for reduced motion compatibility
 * - Safety timeouts for animation cleanup
 *
 * @module poe-decor
 */

const isPoeTheme = () => {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme && theme.startsWith('poe');
};

/* Update these arrays with your filenames */
const CROW_SPRITES = ['assets/poe/crow/crow_flying_from_a_distance_2x3.png'];
const FEATHER_SPRITES = ['assets/poe/feathers/feather_one_2x3.png'];

// Fallback SVGs (simple, small) - using black fill with currentColor for theme adaptation
const CROW_SVG_FALLBACK = `data:image/svg+xml;base64,${window.btoa(
    '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 36c8-8 22-12 34-9-4 2-6 4-7 7 6-1 11 0 16 2-6 4-12 7-18 8-1 3-2 6-5 8-1-6-6-10-12-12 4-1 7-2 9-4-6 0-11-1-17 0z" fill="black"/></svg>'
)}`;

const FEATHER_SVG_FALLBACK = `data:image/svg+xml;base64,${window.btoa(
    '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 40c12-1 24-13 28-28-10 3-23 15-28 28zM10 34c6-2 12-8 16-16" fill="black"/></svg>'
)}`;

// Track which images have failed to load
const failedImages = new Set();

function handleSpriteLoadError(el, sprite, fallback) {
    failedImages.add(sprite);
    el.src = fallback;
    // nudge layout flush to avoid a blink
    void el.offsetWidth;
}

// Performance considerations
const saveData = navigator.connection?.saveData === true;
const lowMem = (navigator.deviceMemory || 4) <= 2; // default to 4 if unknown

// Adjust spawn intervals based on connection/memory
const CROW_MIN = saveData || lowMem ? 18000 : 12000;
const CROW_MAX = saveData || lowMem ? 26000 : 20000;
const FEATHER_MIN = saveData || lowMem ? 8000 : 5000;
const FEATHER_MAX = saveData || lowMem ? 14000 : 9000;

// Helpers
const underCap = (sel, max) => document.querySelectorAll(sel).length < max;

function ensureParticles() {
    if (document.querySelector('.nature-particles')) {
        return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'nature-particles';
    wrap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 24; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDelay = `${Math.random() * 8}s`;
        wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
}

/**
 * Spawn a crow that flies across the screen
 * Limited to 1 crow at a time to avoid overwhelming the scene
 * Uses visualViewport for accurate mobile positioning
 */
function spawnCrow() {
    if (!isPoeTheme() || document.hidden || !underCap('.crow', 1)) {
        return;
    }

    const el = document.createElement('img');
    el.className = 'crow creature-crow';
    el.setAttribute('aria-hidden', 'true');

    // Pick a sprite, use fallback if it failed before
    const sprite = CROW_SPRITES[(Math.random() * CROW_SPRITES.length) | 0];
    el.src = failedImages.has(sprite) ? CROW_SVG_FALLBACK : sprite;

    // Handle load errors
    el.onerror = () => {
        handleSpriteLoadError(el, sprite, CROW_SVG_FALLBACK);
    };

    // Use visualViewport for accurate height on mobile
    const vh = window.visualViewport?.height ?? document.documentElement.clientHeight;
    const startTopPx = Math.round(vh * 0.18); // ~upper fifth, reliable across modes

    // Ensure crow is properly positioned and visible
    el.style.position = 'fixed';
    el.style.top = `${startTopPx}px`;
    el.style.left = `-15vw`; // matches your keyframes (from -15vw to 115vw)
    el.style.zIndex = '9999'; // Above everything
    el.style.transform = `translate3d(0, var(--scroll-drift, 0px), 0)`;
    const dur = 18 + Math.random() * 10;
    el.style.setProperty('animation', `fly-across ${dur}s linear 1`, 'important'); // defeats any PRM "animation:none !important"
    el.addEventListener('animationend', () => el.remove());
    setTimeout(() => el.remove(), dur * 1000 + 1500); // safety remove if animationend never fires
    document.body.appendChild(el);
}

// Track last mouse position and velocity for feather spawning
let lastMouseX = window.innerWidth / 2;
let lastMouseY = 100;
let mouseVelX = 0; // px/s
let mouseVelY = 0; // px/s
let lastMoveTime = performance.now();

// Helper
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Apply physics simulation to a falling feather
 * Includes gravity, drag, terminal velocity, and oscillating rotation
 * @param {HTMLElement} el - The feather element
 * @param {Object} velocities - Initial velocities
 * @param {number} velocities.vx - Horizontal velocity (px/s)
 * @param {number} velocities.vy - Vertical velocity (px/s)
 */
function physicsFall(el, { vx, vy }) {
    // Floaty fall (from last tweak)
    const G = 340; // gravity px/s^2
    const DRAG_X = 1.2; // horizontal drag 1/s
    const VTERM = 160; // vertical terminal velocity px/s
    const MAX_TIME = 20; // s

    // Oscillating tilt instead of full spin - natural feather flutter
    const ANG_FREQ = 0.08 + Math.random() * 0.12; // very slow: 0.08-0.2 cycles per second
    const ANG_PHASE = 0; // Start at 0 to begin pointing down

    let x = 0;
    let y = 0;
    let tPrev = performance.now();
    let tOsc = 0;

    el.style.setProperty('transition', 'opacity 120ms linear', 'important');
    el.style.opacity = '0';
    // force reflow
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight;
    el.style.opacity = '1';

    const step = now => {
        const dt = Math.min(0.05, (now - tPrev) / 1000);
        tPrev = now;
        tOsc += dt;

        // motion
        vx *= Math.exp(-DRAG_X * dt);
        vy = Math.min(vy + G * dt, VTERM);

        x += vx * dt;
        y += vy * dt;

        // Start at 0° (pointing down) and gradually oscillate between 10° and 100°
        // Use a fade-in multiplier that grows from 0 to 1 over the first 2 seconds
        const fadeInTime = 2.0; // seconds to reach full oscillation
        const oscillationStrength = Math.min(1, tOsc / fadeInTime);

        // sin oscillates between -1 and 1, map to 0..1 for our range
        const sineValue = Math.sin(2 * Math.PI * ANG_FREQ * tOsc);
        const normalizedSine = (sineValue + 1) / 2; // Convert -1..1 to 0..1

        // Start at 0°, gradually oscillate between 10° and 100°
        const targetAngle = 10 + normalizedSine * 90; // Target oscillation 10..100
        const angle = targetAngle * oscillationStrength; // Fade in the oscillation

        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;

        const outY = y > window.innerHeight + 120;
        const tooLong = tOsc > MAX_TIME;
        if (outY || tooLong) {
            el.style.setProperty('transition', 'opacity 150ms linear', 'important');
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 160);
            return;
        }
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

/**
 * Spawn a feather that falls with physics simulation
 * Spawns near mouse position with velocity based on mouse movement
 * Limited to 8 concurrent feathers for performance
 */
function spawnFeather() {
    if (!isPoeTheme() || document.hidden || !underCap('.feather', 8)) {
        return;
    }

    const el = document.createElement('img');
    el.className = 'feather creature-feather';
    el.setAttribute('aria-hidden', 'true');

    // Pick a sprite, use fallback if it failed before
    const sprite = FEATHER_SPRITES[(Math.random() * FEATHER_SPRITES.length) | 0];
    el.src = failedImages.has(sprite) ? FEATHER_SVG_FALLBACK : sprite;

    // Handle load errors
    el.onerror = () => {
        handleSpriteLoadError(el, sprite, FEATHER_SVG_FALLBACK);
    };

    // Spawn just below mouse, left/top fixed; movement happens via transform
    const offsetX = (Math.random() - 0.5) * 20;
    const spawnX = lastMouseX + offsetX;
    const spawnY = lastMouseY + 15;

    el.style.left = `${spawnX}px`;
    el.style.top = `${spawnY}px`;

    // initial velocities from mouse (parabola) - dampened for subtler effect
    const VX_SCALE = 0.15; // Reduced from 0.30 - less horizontal influence
    const VY_SCALE = 0.05; // Reduced from 0.10 - less vertical influence
    const vx0 = clamp(mouseVelX * VX_SCALE, -300, 300); // Also reduced max velocity
    const vy0 = Math.max(0, mouseVelY * VY_SCALE);

    document.body.appendChild(el); // Append first so reflow works
    physicsFall(el, { vx: vx0, vy: vy0 }); // Then start the physics loop
}

/**
 * Create smooth scroll-based drift effect
 * Updates CSS custom property for parallax elements
 * Uses exponential smoothing for natural movement
 * @returns {Function} Cleanup function to stop the animation
 */
function startScrollDrift() {
    let last = -1;
    let driftRaf;
    const k = 0.08;
    const step = () => {
        const target = (window.scrollY || 0) * 0.05;
        if (last < 0) {
            last = target;
        }
        last += (target - last) * k;
        document.documentElement.style.setProperty('--scroll-drift', `${last}px`);
        driftRaf = window.requestAnimationFrame(step);
    };
    driftRaf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(driftRaf);
}

/**
 * Initialize all Poe decorative elements
 * Sets up particles, spawns initial creatures, and manages animation loops
 * @returns {Function} Cleanup function to remove all decorations
 */
export function initPoeDecor() {
    ensureParticles();

    // Track mouse movement and velocity for feather spawning
    const onPointerMove = e => {
        const now = performance.now();
        const dt = Math.max(1, now - lastMoveTime) / 1000; // seconds
        const nx = e.clientX;
        const ny = e.clientY;
        const vx = (nx - lastMouseX) / dt; // px/s
        const vy = (ny - lastMouseY) / dt; // px/s
        const a = 0.6; // smoothing
        mouseVelX = mouseVelX * (1 - a) + vx * a;
        mouseVelY = mouseVelY * (1 - a) + vy * a;
        lastMouseX = nx;
        lastMouseY = ny;
        lastMoveTime = now;
    };

    document.addEventListener('pointermove', onPointerMove, { passive: true });

    // Small "hello" touch
    spawnCrow();
    setTimeout(() => spawnFeather(), 1000); // Stagger initial spawns

    let alive = true;

    const schedule = (fn, min, max) => {
        let id;
        const run = () => {
            if (!alive) {
                return;
            }
            fn();
            id = window.setTimeout(run, min + Math.random() * (max - min));
        };
        id = window.setTimeout(run, min + Math.random() * (max - min));
        return () => window.clearTimeout(id);
    };

    // Randomized, self-throttling loops (adjusted for performance)
    const stopCrowLoop = schedule(spawnCrow, CROW_MIN, CROW_MAX);
    const stopFeatherLoop = schedule(spawnFeather, FEATHER_MIN, FEATHER_MAX);

    const onVis = () => {
        const paused = document.hidden || !isPoeTheme();
        document
            .querySelectorAll('.crow,.feather')
            .forEach(n => (n.style.animationPlayState = paused ? 'paused' : 'running'));
    };

    document.addEventListener('visibilitychange', onVis, { passive: true });

    const stopDrift = startScrollDrift();

    // Initial state
    onVis();

    // Cleanup function
    return () => {
        alive = false;
        stopCrowLoop();
        stopFeatherLoop();
        stopDrift();
        document.removeEventListener('visibilitychange', onVis);
        document.removeEventListener('pointermove', onPointerMove);
        // Clean up any lingering elements on teardown
        document.querySelectorAll('.crow,.feather,.nature-particles').forEach(n => n.remove());
    };
}
