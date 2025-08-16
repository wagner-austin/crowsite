/* eslint-env browser */

export function enablePoeTheme() {
    // Only proceed if the theme is actually set to Poe
    if (document.documentElement.getAttribute('data-theme') !== 'poe') {
        return;
    }

    // Update meta tags for mobile browser chrome - now black for Poe theme
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#000000');
    }

    const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (colorSchemeMeta) {
        colorSchemeMeta.setAttribute('content', 'dark');
    }
}
