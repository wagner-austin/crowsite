/**
 * Mobile Debug Panel with Tabs
 *
 * Creates an on-screen debug panel for mobile devices to help diagnose
 * various issues. Features tabbed interface for different debug areas.
 */

export function createMobileDebugPanel(options = {}) {
    const { isMobile, hasFinePointer, POINTER_MULT } = options;

    // Show on mobile OR if debug flag is set
    const showDebug = isMobile || localStorage.getItem('debugPanel') === 'true';

    if (!showDebug) {
        return {
            log: msg => console.log(msg),
            updateTilt: () => {},
            destroy: () => {},
        };
    }

    // State
    let isCollapsed = true; // Start collapsed/minimized
    let activeTab = 'trees'; // Default to trees tab since that's the current issue

    // Track parallax data
    let orientationWorks = false;
    let motionWorks = false;
    let tiltEventCount = 0;
    let lastTiltValues = { beta: 0, gamma: 0 };
    let lastParallaxValues = { mx: 0, my: 0, tx: 0, ty: 0, influence: 0 };

    // Check APIs
    const hasOrientation = window.DeviceOrientationEvent !== undefined;
    const hasMotion = window.DeviceMotionEvent !== undefined;
    const needsPermission =
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function';

    // Create UI elements
    const createButton = (id, content, styles) => {
        const btn = document.createElement('button');
        btn.id = id;
        btn.innerHTML = content;
        btn.style.cssText = styles;
        return btn;
    };

    const createDiv = (id, styles) => {
        const div = document.createElement('div');
        if (id) {
            div.id = id;
        }
        div.style.cssText = styles;
        return div;
    };

    // Create toggle button
    const toggleBtn = createButton(
        'debug-toggle',
        '🔍',
        `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.9);
        color: white;
        border: 2px solid #0f0;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        font-size: 20px;
        z-index: 2147483647;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: transform 0.2s;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    `
    );

    // Create main panel
    const panel = createDiv(
        'debug-panel',
        `
        position: fixed;
        top: 60px;
        left: 10px;
        right: 10px;
        background: rgba(0,0,0,0.95);
        color: white;
        padding: 0;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        z-index: 2147483646;
        max-width: 400px;
        max-height: 70vh;
        border-radius: 6px;
        border: 2px solid #0f0;
        transition: opacity 0.3s, transform 0.3s;
        transform-origin: top left;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        -webkit-font-smoothing: antialiased;
    `
    );

    // Create tab bar
    const tabBar = createDiv(
        'debug-tabs',
        `
        display: flex;
        background: rgba(0,255,0,0.1);
        border-bottom: 1px solid #0f0;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        flex-shrink: 0;
    `
    );

    // Create content area
    const contentArea = createDiv(
        'debug-content',
        `
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        -webkit-overflow-scrolling: touch;
        min-height: 0;
    `
    );

    // Helper functions for consistent styling
    const formatSection = (title, content, color = '#ff0') => `
        <div style="background: rgba(255,255,255,0.05); padding: 8px; margin-bottom: 8px; border-radius: 3px;">
            <div style="color: ${color}; font-weight: bold; margin-bottom: 4px;">${title}</div>
            ${content}
        </div>`;

    const formatRow = (label, value, color = 'white') =>
        `<div style="color: ${color};">${label}: ${value}</div>`;

    const formatError = message =>
        `<div style="color: #f00; font-weight: bold; margin-top: 4px;">⚠ ${message}</div>`;

    const formatSuccess = message =>
        `<div style="color: #0f0; margin-top: 4px;">✓ ${message}</div>`;

    // Content creation functions
    const createTreesContent = () => {
        const treeLeft = document.querySelector('.tree-close-left');
        const treeRight = document.querySelector('.tree-close-right');
        const parallaxFront = document.querySelector('.parallax-front');
        const parallaxContainer = document.querySelector('.parallax-container');

        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const vvh = window.visualViewport?.height || vh;
        const vvw = window.visualViewport?.width || vw;

        let content = '';

        // Viewport section
        content += formatSection(
            'Viewport',
            formatRow('Window', `${vw}×${vh}px`) +
                formatRow('Visual', `${vvw}×${vvh}px`) +
                formatRow('Orientation', vh > vw ? 'portrait' : 'landscape')
        );

        // Container section
        if (parallaxContainer) {
            const rect = parallaxContainer.getBoundingClientRect();
            const computed = getComputedStyle(parallaxContainer);
            content += formatSection(
                'Parallax Container',
                formatRow('Height', `${rect.height.toFixed(0)}px (css: ${computed.height})`) +
                    formatRow('Position', computed.position) +
                    formatRow('Inset', computed.inset)
            );
        }

        // Front layer section
        if (parallaxFront) {
            const rect = parallaxFront.getBoundingClientRect();
            const computed = getComputedStyle(parallaxFront);
            content += formatSection(
                'Front Layer',
                formatRow('Height', `${rect.height.toFixed(0)}px`) +
                    formatRow('Bottom', `${rect.bottom.toFixed(0)}px`) +
                    formatRow('Inset', computed.inset) +
                    formatRow(
                        'Transform',
                        computed.transform.length > 30
                            ? `${computed.transform.substring(0, 30)}...`
                            : computed.transform
                    )
            );
        }

        // Tree analysis
        const analyzeTree = (tree, name) => {
            if (!tree) {
                return formatSection(name, '<div style="color: #666;">Not found</div>', '#666');
            }

            const rect = tree.getBoundingClientRect();
            const computed = getComputedStyle(tree);
            const bottomGap = rect.bottom - vh;
            const topCutoff = rect.top < 0 ? Math.abs(rect.top) : 0;
            const src = tree.src?.split('/').pop() || 'unknown';

            // Determine issues
            const issues = [];
            if (bottomGap > 1) {
                issues.push(`BELOW by ${bottomGap.toFixed(0)}px`);
            }
            if (topCutoff > 1) {
                issues.push(`TOP CUT by ${topCutoff.toFixed(0)}px`);
            }
            if (rect.top >= vh) {
                issues.push('ENTIRELY BELOW');
            }
            if (rect.bottom <= 0) {
                issues.push('ENTIRELY ABOVE');
            }

            const color = issues.length > 0 ? '#f00' : '#0f0';

            let treeContent = '';
            treeContent += `<div style="font-size: 9px; color: #888;">Image: ${src}</div>`;
            treeContent += formatRow('Natural', `${tree.naturalWidth}×${tree.naturalHeight}`);
            treeContent += formatRow(
                'Displayed',
                `${rect.width.toFixed(0)}×${rect.height.toFixed(0)}px`
            );
            treeContent += formatRow(
                'Position',
                `top=${rect.top.toFixed(0)}, bottom=${rect.bottom.toFixed(0)}`
            );
            treeContent += formatRow('CSS Height', computed.height);
            treeContent += formatRow('CSS Bottom', computed.bottom);
            treeContent += formatRow('Object-fit', computed.objectFit);
            treeContent += formatRow('Object-pos', computed.objectPosition);

            if (issues.length > 0) {
                treeContent += formatError(issues.join(', '));
            } else {
                treeContent += formatSuccess('Properly positioned');
            }

            return formatSection(name, treeContent, color);
        };

        content += analyzeTree(treeLeft, 'Left Tree');
        content += analyzeTree(treeRight, 'Right Tree');

        // Media query info
        const width = window.innerWidth;
        let mediaQuery = 'Unknown';
        if (width <= 767 && vh > vw) {
            mediaQuery = 'Mobile Portrait (≤767px portrait)';
        } else if (width <= 767 && vh <= vw) {
            mediaQuery = 'Mobile Landscape (≤767px landscape)';
        } else if (width >= 768 && width <= 1023) {
            mediaQuery = 'Tablet (768-1023px)';
        } else if (width >= 1024) {
            mediaQuery = 'Desktop (≥1024px)';
        }

        content += formatSection('Active Media Query', formatRow('Query', mediaQuery));

        return content;
    };

    const createParallaxContent = () => {
        const { userAgent } = navigator;
        const platform = userAgent.includes('Android')
            ? 'Android'
            : userAgent.includes('iPhone') || userAgent.includes('iPad')
              ? 'iOS'
              : 'Other';

        let content = '';

        // Security & APIs
        content += formatSection(
            'Environment',
            formatRow(
                '🔒 HTTPS',
                window.isSecureContext ? 'YES' : 'NO',
                window.isSecureContext ? '#0f0' : '#f00'
            ) +
                formatRow('Platform', platform) +
                formatRow('POINTER_MULT', POINTER_MULT || 'N/A')
        );

        // Orientation API
        content += formatSection(
            'Orientation API',
            formatRow(
                'API Available',
                hasOrientation ? 'YES' : 'NO',
                hasOrientation ? '#0f0' : '#f00'
            ) +
                formatRow(
                    'Events Firing',
                    orientationWorks ? 'YES' : 'NO',
                    orientationWorks ? '#0f0' : '#f00'
                ) +
                formatRow(
                    'Needs Permission',
                    needsPermission ? 'YES (iOS)' : 'NO',
                    needsPermission ? '#ff0' : '#0f0'
                ) +
                formatRow('Tilt Count', tiltEventCount, '#0ff')
        );

        // Tilt values if available
        if (tiltEventCount > 0) {
            content += formatSection(
                'Tilt Data',
                formatRow('Beta (β)', lastTiltValues.beta?.toFixed(1) || '0', '#0f0') +
                    formatRow('Gamma (γ)', lastTiltValues.gamma?.toFixed(1) || '0', '#0f0') +
                    formatRow('Transform X', lastParallaxValues.tx?.toFixed(2) || '0.00', '#ff0') +
                    formatRow('Transform Y', lastParallaxValues.ty?.toFixed(2) || '0.00', '#ff0') +
                    formatRow('Mouse X', lastParallaxValues.mx?.toFixed(2) || '0.00', '#0ff') +
                    formatRow('Mouse Y', lastParallaxValues.my?.toFixed(2) || '0.00', '#0ff') +
                    formatRow(
                        'Influence',
                        lastParallaxValues.influence?.toFixed(2) || '0.00',
                        '#f0f'
                    )
            );
        }

        // Warnings
        if (!window.isSecureContext) {
            content += formatError('HTTPS required for tilt!');
        }
        if (!orientationWorks && tiltEventCount === 0) {
            content += formatError('No tilt events detected');
        }

        return content;
    };

    const createViewportContent = () => {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const vvh = window.visualViewport?.height || vh;
        const vvw = window.visualViewport?.width || vw;
        const dpr = window.devicePixelRatio;
        const orientation = screen.orientation?.type || 'unknown';
        const angle = screen.orientation?.angle || 0;

        let content = '';

        content += formatSection(
            'Window',
            formatRow('Inner', `${vw}×${vh}px`) +
                formatRow('Outer', `${window.outerWidth}×${window.outerHeight}px`) +
                formatRow('Screen', `${screen.width}×${screen.height}px`) +
                formatRow('Available', `${screen.availWidth}×${screen.availHeight}px`)
        );

        content += formatSection(
            'Visual Viewport',
            formatRow('Size', `${vvw}×${vvh}px`) +
                formatRow('Scale', window.visualViewport?.scale || 'N/A') +
                formatRow(
                    'Offset',
                    `${window.visualViewport?.offsetLeft || 0}, ${window.visualViewport?.offsetTop || 0}`
                )
        );

        content += formatSection(
            'Display',
            formatRow('DPR', dpr) +
                formatRow('Orientation', orientation) +
                formatRow('Angle', `${angle}°`) +
                formatRow('CSS pixels', `${(vw * dpr).toFixed(0)}×${(vh * dpr).toFixed(0)}`)
        );

        content += formatSection(
            'Browser UI',
            formatRow('URL bar', vh !== vvh ? 'Visible' : 'Hidden') +
                formatRow('Height diff', `${(vh - vvh).toFixed(0)}px`)
        );

        return content;
    };

    const createCSSContent = () => {
        const supportsDvh = CSS.supports('height', '100dvh');
        const supportsSvh = CSS.supports('height', '100svh');
        const supportsLvh = CSS.supports('height', '100lvh');
        const supportsContainer = CSS.supports('container-type', 'inline-size');

        const stylesheets = Array.from(document.styleSheets);
        const themeStyles = stylesheets.filter(s => s.href && s.href.includes('poe'));

        let content = '';

        content += formatSection(
            'Viewport Units Support',
            formatRow('dvh', supportsDvh ? '✅ YES' : '❌ NO') +
                formatRow('svh', supportsSvh ? '✅ YES' : '❌ NO') +
                formatRow('lvh', supportsLvh ? '✅ YES' : '❌ NO')
        );

        content += formatSection(
            'Modern CSS Features',
            formatRow('Container Queries', supportsContainer ? '✅ YES' : '❌ NO') +
                formatRow(
                    'Aspect Ratio',
                    CSS.supports('aspect-ratio', '1/1') ? '✅ YES' : '❌ NO'
                ) +
                formatRow('Object-fit', CSS.supports('object-fit', 'cover') ? '✅ YES' : '❌ NO')
        );

        content += formatSection(
            'Active Stylesheets',
            formatRow('Total', stylesheets.length) + formatRow('Theme', themeStyles.length)
        );

        return content;
    };

    // Tab configuration
    const tabs = {
        trees: { label: '🌲 Trees', content: createTreesContent },
        parallax: { label: '🧭 Tilt', content: createParallaxContent },
        viewport: { label: '📱 View', content: createViewportContent },
        css: { label: '🎨 CSS', content: createCSSContent },
    };

    // Store tab buttons
    const tabButtons = {};

    // Tab selection function - MUST BE DEFINED BEFORE USING IN EVENT LISTENERS
    const selectTab = tabKey => {
        if (!tabs[tabKey]) {
            console.error(`Tab ${tabKey} not found`);
            return;
        }

        activeTab = tabKey;

        // Update all tab button styles
        Object.keys(tabButtons).forEach(key => {
            const btn = tabButtons[key];
            if (key === activeTab) {
                btn.style.color = '#0f0';
                btn.style.background = 'rgba(0,255,0,0.05)';
            } else {
                btn.style.color = '#888';
                btn.style.background = 'transparent';
            }
        });

        updateContent();
    };

    // Create tab buttons - NOW AFTER selectTab is defined
    Object.keys(tabs).forEach(tabKey => {
        const btn = createButton(
            `tab-${tabKey}`,
            tabs[tabKey].label,
            `
            flex: 1;
            padding: 8px 12px;
            background: ${tabKey === activeTab ? 'rgba(0,255,0,0.05)' : 'transparent'};
            color: ${tabKey === activeTab ? '#0f0' : '#888'};
            border: none;
            border-right: 1px solid rgba(0,255,0,0.2);
            cursor: pointer;
            font-size: 11px;
            font-family: inherit;
            transition: color 0.2s, background 0.2s;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            min-width: 0;
            white-space: nowrap;
        `
        );

        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            selectTab(tabKey);
        });

        tabButtons[tabKey] = btn;
        tabBar.appendChild(btn);
    });

    // Update content
    const updateContent = () => {
        if (!contentArea || !tabs[activeTab]) {
            return;
        }

        const content = tabs[activeTab].content();
        contentArea.innerHTML = `
            <div style="color: #0f0; font-weight: bold; margin-bottom: 10px; font-size: 12px;">
                ${tabs[activeTab].label} Debug
            </div>
            ${content}
        `;
    };

    // Panel toggle
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
            updateContent();
        }
        toggleBtn.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)';
    };

    // Event listeners
    toggleBtn.addEventListener('click', togglePanel);

    // Orientation events
    if (hasOrientation) {
        window.addEventListener(
            'deviceorientation',
            e => {
                orientationWorks = true;
                tiltEventCount++;
                if (e.beta !== null) {
                    lastTiltValues = { beta: e.beta, gamma: e.gamma };
                }
                if (activeTab === 'parallax' && !isCollapsed) {
                    updateContent();
                }
            },
            { passive: true }
        );
    }

    if (hasMotion) {
        window.addEventListener(
            'devicemotion',
            () => {
                motionWorks = true;
                if (activeTab === 'parallax' && !isCollapsed) {
                    updateContent();
                }
            },
            { once: true }
        );
    }

    // Resize events
    const handleResize = () => {
        if (!isCollapsed) {
            updateContent();
        }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    // Build panel
    panel.appendChild(tabBar);
    panel.appendChild(contentArea);

    // Add to DOM
    document.body.appendChild(toggleBtn);
    document.body.appendChild(panel);

    // Initial setup
    if (isCollapsed) {
        panel.style.opacity = '0';
        panel.style.transform = 'scale(0.1)';
        panel.style.pointerEvents = 'none';
    } else {
        updateContent();
    }

    // Public API
    const log = msg => {
        console.log(`[MobileDebug] ${msg}`);
    };

    const updateTilt = (beta, gamma) => {
        // Back-compat: if first arg is an object, treat it as parallax values
        if (typeof beta === 'object' && beta) {
            lastParallaxValues = beta;
        } else if (typeof beta === 'number' && typeof gamma === 'number') {
            lastTiltValues = { beta, gamma };
        }
        if (activeTab === 'parallax' && !isCollapsed) {
            updateContent();
        }
    };

    const updateParallax = v => {
        // Update parallax values from poe-parallax module
        if (v) {
            lastParallaxValues = {
                tx: v.tx || 0,
                ty: v.ty || 0,
                mx: v.mx || 0,
                my: v.my || 0,
                influence: v.influence || 0,
            };
        }
        if (activeTab === 'parallax' && !isCollapsed) {
            updateContent();
        }
    };

    const destroy = () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        window.visualViewport?.removeEventListener('resize', handleResize);
        toggleBtn.remove();
        panel.remove();
    };

    return {
        log,
        updateTilt,
        updateParallax, // Add this so poe-parallax can call it
        destroy,
    };
}
