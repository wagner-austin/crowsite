/**
 * Mobile Debug Panel
 *
 * Creates an on-screen debug panel for mobile devices to help diagnose
 * parallax and tilt issues. Remove this module in production.
 */

export function createMobileDebugPanel(options = {}) {
    const { isMobile, hasFinePointer, POINTER_MULT } = options;

    // Only show on mobile
    if (!isMobile) {
        return {
            log: msg => console.log(msg),
            updateTilt: () => {},
            destroy: () => {},
        };
    }

    let isCollapsed = true; // Start collapsed

    // Create toggle button with magnifying glass
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'debug-toggle';
    toggleBtn.innerHTML = '🔍';
    toggleBtn.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        border: 1px solid #0f0;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 20px;
        z-index: 100000;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: transform 0.2s;
    `;

    const panel = document.createElement('div');
    panel.id = 'parallax-debug';
    panel.style.cssText = `
        position: fixed;
        top: 60px;
        left: 10px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 10px;
        font-family: monospace;
        font-size: 11px;
        z-index: 99999;
        max-width: 280px;
        border-radius: 4px;
        border: 1px solid #0f0;
        transition: opacity 0.3s, transform 0.3s;
        transform-origin: top left;
    `;

    // Check various APIs and permissions
    const hasOrientation = window.DeviceOrientationEvent !== undefined;
    const hasMotion = window.DeviceMotionEvent !== undefined;
    const needsPermission =
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function';

    // Track if events actually fire
    let orientationWorks = false;
    let motionWorks = false;
    let tiltEventCount = 0;
    let lastTiltValues = { beta: 0, gamma: 0 };
    let lastParallaxValues = { mx: 0, my: 0, tx: 0, ty: 0, influence: 0 };

    // Test listeners
    if (hasOrientation) {
        window.addEventListener(
            'deviceorientation',
            e => {
                orientationWorks = true;
                tiltEventCount++;
                if (e.beta !== null) {
                    lastTiltValues = { beta: e.beta, gamma: e.gamma };
                }
                updatePanel();
            },
            { passive: true }
        );
    }

    if (hasMotion) {
        window.addEventListener(
            'devicemotion',
            () => {
                motionWorks = true;
                updatePanel();
            },
            { once: true }
        );
    }

    function updatePanel() {
        const { userAgent } = navigator;
        const platform = userAgent.includes('Android')
            ? 'Android'
            : userAgent.includes('iPhone') || userAgent.includes('iPad')
              ? 'iOS'
              : 'Other';

        // Only update the status div, not the messages
        let statusDiv = panel.querySelector('#debug-status');
        if (!statusDiv) {
            panel.innerHTML = `
                <div id="debug-status"></div>
                <div id="debug-messages" style="margin-top: 5px; border-top: 1px solid #666; padding-top: 5px;"></div>
            `;
            statusDiv = panel.querySelector('#debug-status');
        }

        statusDiv.innerHTML = `
            <div style="border-bottom: 1px solid #0f0; margin-bottom: 5px; padding-bottom: 5px;">
                <strong>🔍 Parallax Debug</strong>
            </div>
            <div style="color: ${window.isSecureContext ? '#0f0' : '#f00'}">
                🔒 HTTPS: ${window.isSecureContext ? 'YES' : 'NO'}
            </div>
            <div style="color: ${hasOrientation ? '#0f0' : '#f00'}">
                🧭 Orientation API: ${hasOrientation ? 'YES' : 'NO'}
            </div>
            <div style="color: ${orientationWorks ? '#0f0' : '#f00'}">
                ${orientationWorks ? '✅' : '❌'} Events Firing: ${orientationWorks ? 'YES' : 'NO'}
            </div>
            <div style="color: ${needsPermission ? '#ff0' : '#0f0'}">
                🔐 Needs Permission: ${needsPermission ? 'YES (iOS)' : 'NO'}
            </div>
            <div style="color: #0ff">
                📈 Tilt Count: ${tiltEventCount}
            </div>
            ${
                tiltEventCount > 0
                    ? `
            <div style="color: #0f0">
                📐 β: ${lastTiltValues.beta ? lastTiltValues.beta.toFixed(1) : '0'} γ: ${lastTiltValues.gamma ? lastTiltValues.gamma.toFixed(1) : '0'}
            </div>
            <div style="color: #ff0">
                🎯 tx: ${lastParallaxValues.tx.toFixed(2)} ty: ${lastParallaxValues.ty.toFixed(2)}
            </div>
            <div style="color: #0ff">
                📍 mx: ${lastParallaxValues.mx.toFixed(2)} my: ${lastParallaxValues.my.toFixed(2)}
            </div>
            <div style="color: #f0f">
                💪 influence: ${lastParallaxValues.influence.toFixed(2)}
            </div>
            `
                    : ''
            }
            <div style="border-top: 1px solid #666; margin-top: 5px; padding-top: 5px; font-size: 10px;">
                <div>Platform: ${platform}</div>
                <div>POINTER_MULT: ${POINTER_MULT}</div>
                ${!window.isSecureContext ? '<div style="color: #f00">⚠️ HTTPS required for tilt!</div>' : ''}
                ${!orientationWorks && tiltEventCount === 0 ? '<div style="color: #ff0">⚠️ No tilt events detected</div>' : ''}
            </div>
        `;
    }

    // Toggle function
    const togglePanel = () => {
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            panel.style.opacity = '0';
            panel.style.transform = 'scale(0.1)';
            panel.style.pointerEvents = 'none';
        } else {
            panel.style.opacity = '1';
            panel.style.transform = 'scale(1)';
            panel.style.pointerEvents = 'auto';
        }
    };

    toggleBtn.addEventListener('click', togglePanel);
    toggleBtn.addEventListener(
        'touchstart',
        e => {
            e.preventDefault();
            togglePanel();
        },
        { passive: false }
    );

    updatePanel();
    document.body.appendChild(toggleBtn);
    document.body.appendChild(panel);

    // Apply initial collapsed state
    if (isCollapsed) {
        panel.style.opacity = '0';
        panel.style.transform = 'scale(0.1)';
        panel.style.pointerEvents = 'none';
    }

    const updateInterval = setInterval(updatePanel, 2000);

    return {
        log(msg) {
            console.log(msg);
            // Get fresh reference to msgDiv each time since updatePanel recreates it
            const msgDiv = panel.querySelector('#debug-messages');
            if (msgDiv) {
                const line = document.createElement('div');
                line.textContent = msg.replace(/\[Parallax\] /g, '');
                line.style.cssText =
                    'color: #0f0; margin-top: 2px; font-size: 10px; border-bottom: 1px solid #333; padding-bottom: 2px;';
                msgDiv.insertBefore(line, msgDiv.firstChild);
                // Keep last 8 messages for better visibility
                while (msgDiv.children.length > 8) {
                    msgDiv.removeChild(msgDiv.lastChild);
                }
            }
        },
        updateTilt(beta, gamma) {
            lastTiltValues = { beta, gamma };
            tiltEventCount++;
            updatePanel();
        },
        updateParallax(values) {
            lastParallaxValues = { ...values };
            // Don't call updatePanel here to avoid too frequent updates
        },
        destroy() {
            clearInterval(updateInterval);
            if (panel) {
                panel.remove();
            }
            if (toggleBtn) {
                toggleBtn.remove();
            }
        },
    };
}
