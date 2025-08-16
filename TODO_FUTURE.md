# Future Enhancements

## Poe Day/Night Themes

### Concept

Two variants of the Poe theme that can be toggled:

#### Poe Day

- White/light background (#ffffff or #fafafa)
- Black silhouettes (crows, trees, branches)
- Dark text on light background
- Subtle gray shadows
- Morning/afternoon ambiance

#### Poe Night (Current)

- Black/dark background (#000000)
- White silhouettes (crows, trees, branches)
- Light text on dark background
- Subtle white glow effects
- Evening/night ambiance

### Implementation Ideas

1. Add a simple day/night toggle button (sun/moon icon)
2. Auto-switch based on time of day (optional)
3. Respect system dark/light mode preference
4. Use CSS variables to swap colors:
    ```css
    [data-theme='poe-day'] {
        /* light mode */
    }
    [data-theme='poe-night'] {
        /* dark mode */
    }
    ```
5. Swap PNG assets or use CSS filters to invert colors
6. Smooth transition animation between modes

### Assets Needed

- Separate PNG sets for day/night OR
- Use CSS `filter: invert(1)` on existing assets
- Different sky gradients for each mode

### Code Structure

- Update ThemeManager to support sub-themes
- `themes: ['poe-day', 'poe-night']`
- Store preference in localStorage
- Update theme-poe.js to handle both variants
