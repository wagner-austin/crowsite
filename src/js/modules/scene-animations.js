// src/js/modules/scene-animations.js
import EventBus from '../core/eventBus.js';

export function initSceneAnimations({
  triggerSelector = '[data-zoom-trigger]',
  rootSelector = ':root',
  parallaxPauseClass = 'zoomed',
  ignoreReducedMotion = true,
} = {}) {
  console.log('[SceneAnimations] Initializing with selector:', triggerSelector);
  
  const root = document.documentElement.matches(rootSelector)
    ? document.documentElement
    : document.querySelector(rootSelector);
  if (!root) {
    console.warn('[SceneAnimations] Root element not found');
    return { destroy() {} };
  }

  // Force animations even when OS has reduced motion enabled
  if (ignoreReducedMotion) {
    root.setAttribute('data-motion', 'force');
  }

  // Read CSS custom properties for timing (fallback to 2500/2000ms)
  const msFromVar = (name, fallback) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    if (!v) return fallback;
    // accepts "1500ms" or "1.5s"
    if (v.endsWith('ms')) return parseFloat(v);
    if (v.endsWith('s')) return parseFloat(v) * 1000;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  // Always use full animation timing, ignore reduced motion preference
  const zoomInMs  = msFromVar('--scene-zoom-ms',     2500);
  const zoomOutMs = msFromVar('--scene-zoom-out-ms', 2000);

  let locked = false;

  // Keep aria-pressed in sync for all triggers in the DOM
  const setPressed = (pressed) => {
    document.querySelectorAll(triggerSelector).forEach((el) => {
      el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    });
  };

  const zoomIn = () => {
    console.log('[SceneAnimations] zoomIn called, locked:', locked);
    if (locked) return;
    locked = true;
    root.classList.add('animating');           // 1) enable transitions
    void root.getBoundingClientRect();         // arm transitions for Android
    document.documentElement.dispatchEvent(new CustomEvent('zoom:start'));
    // Add delay for mobile to prepare GPU acceleration
    const isMobile = window.matchMedia('(max-width: 768px)').matches || 
                     window.matchMedia('(pointer: coarse)').matches;
    const prepDelay = isMobile ? 50 : 0;  // 50ms prep time for mobile
    
    window.setTimeout(() => {
      requestAnimationFrame(() => {                // 2) next frame, change state
        console.log('[SceneAnimations] Adding class:', parallaxPauseClass);
        root.classList.add(parallaxPauseClass);   // adds .zoomed
        setPressed(true);
        EventBus.emit('scene:zoom', { state: 'in' });
        window.setTimeout(() => {
          root.classList.remove('animating');    // 3) clean up
          document.documentElement.dispatchEvent(new CustomEvent('zoom:end', { detail: { direction: 'in' }}));
          locked = false;
          console.log('[SceneAnimations] Zoom in complete');
        }, zoomInMs + 100);
      });
    }, prepDelay);
  };

  const zoomOut = () => {
    console.log('[SceneAnimations] zoomOut called, locked:', locked);
    if (locked) return;
    locked = true;
    root.classList.add('animating');
    void root.getBoundingClientRect();         // arm transitions for Android
    document.documentElement.dispatchEvent(new CustomEvent('zoom:start'));
    // Add delay for mobile to prepare GPU acceleration
    const isMobile = window.matchMedia('(max-width: 768px)').matches || 
                     window.matchMedia('(pointer: coarse)').matches;
    const prepDelay = isMobile ? 50 : 0;  // 50ms prep time for mobile
    
    window.setTimeout(() => {
      requestAnimationFrame(() => {
        console.log('[SceneAnimations] Removing class:', parallaxPauseClass);
        root.classList.remove(parallaxPauseClass); // removes .zoomed
        setPressed(false);
        EventBus.emit('scene:zoom', { state: 'out' });
        window.setTimeout(() => {
          root.classList.remove('animating');
          document.documentElement.dispatchEvent(new CustomEvent('zoom:end', { detail: { direction: 'out' }}));
          locked = false;
          console.log('[SceneAnimations] Zoom out complete');
        }, zoomOutMs + 100);
      });
    }, prepDelay);
  };

  const toggleZoom = () => {
    const isZoomed = root.classList.contains(parallaxPauseClass);
    console.log('[SceneAnimations] Toggle zoom, currently zoomed:', isZoomed);
    if (isZoomed) {
      zoomOut();
    } else {
      zoomIn();
    }
  };

  // Find trigger under pointer even if behind other elements
  const findTriggerUnderPointer = (x, y) => {
    const disabled = [];
    let hit;
    // peel top elements to reveal what's underneath
    while ((hit = document.elementFromPoint(x, y))) {
      if (hit.matches?.(triggerSelector)) break;
      // stop if we've peeled the root or nothing changes
      if (hit === document.documentElement || hit === document.body) { 
        hit = null; 
        break; 
      }
      // temporarily disable this layer to see below it
      disabled.push(hit);
      hit.style.setProperty('pointer-events', 'none', 'important');
    }
    // restore pointer-events
    for (const el of disabled) {
      el.style.removeProperty('pointer-events');
    }
    return hit?.matches?.(triggerSelector) ? hit : null;
  };

  // Global delegated click (works even when <main> is on top)
  const onClick = (e) => {
    console.log('[SceneAnimations] Click at:', e.clientX, e.clientY);
    const trigger = findTriggerUnderPointer(e.clientX, e.clientY);
    if (!trigger) {
      console.log('[SceneAnimations] No trigger found under pointer');
      return;
    }
    console.log('[SceneAnimations] Trigger found under pointer:', trigger);
    e.preventDefault();
    // Make anything a11y-pressable
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    toggleZoom();
  };

  const onKey = (e) => {
    const t = e.target.closest(triggerSelector);
    if (!t) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleZoom();
    }
  };

  // Escape to exit
  const onEsc = (e) => {
    if (e.key === 'Escape' && root.classList.contains(parallaxPauseClass)) {
      zoomOut();
    }
  };

  document.addEventListener('click', onClick, { passive: false });
  document.addEventListener('keydown', onKey);
  document.addEventListener('keydown', onEsc);

  // Check if any triggers exist at init time
  const triggers = document.querySelectorAll(triggerSelector);
  console.log(`[SceneAnimations] Found ${triggers.length} trigger elements at init`);
  triggers.forEach((el, i) => {
    console.log(`[SceneAnimations] Trigger ${i}:`, el);
  });

  // If theme changes away from Poe, clear zoom state
  const themeObserver = new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === 'attributes' && r.attributeName === 'data-theme') {
        const th = root.getAttribute('data-theme') || '';
        if (!/^poe/.test(th)) {
          root.classList.remove(parallaxPauseClass, 'animating');
          setPressed(false);
        }
      }
    }
  });
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  return {
    zoomIn,
    zoomOut,
    toggleZoom,
    destroy() {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onEsc);
      themeObserver.disconnect();
    },
  };
}