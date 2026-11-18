/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

// Light palette: the site's colour tokens as hex values (ModeContrastTests reads them from here). The neutrals are a
// warm roster paper, the three shift-* tokens colour the early, late and night blocks of the plan grid backdrop.
const lightColors = {
  "outline": "#77736a",
  "on-secondary-container": "#fefcff",
  "on-primary-fixed": "#1b1b1b",
  "background": "#faf7f1",
  "on-tertiary-container": "#F2A516",
  "surface": "#faf7f1",
  "error-container": "#ffdad6",
  "surface-container": "#efeae0",
  "on-error-container": "#93000a",
  "on-background": "#1c1b1b",
  "surface-bright": "#faf7f1",
  "on-secondary-fixed-variant": "#0B4F4D",
  "surface-container-low": "#f4f0e8",
  "on-tertiary-fixed": "#2a1a00",
  "primary-fixed-dim": "#c6c6c6",
  "on-tertiary": "#ffffff",
  "secondary-container": "#0B5F5C",
  "inverse-primary": "#c6c6c6",
  "secondary-fixed": "#d5ecea",
  "tertiary-container": "#3d2800",
  "surface-variant": "#e0dacd",
  "surface-dim": "#d6d0c2",
  "tertiary-fixed-dim": "#68dba9",
  "surface-container-highest": "#e0dacd",
  "on-primary-container": "#848484",
  "primary-container": "#1b1b1b",
  "surface-container-high": "#e8e2d6",
  "surface-tint": "#5e5e5e",
  "on-error": "#ffffff",
  "inverse-surface": "#313030",
  "tertiary-fixed": "#F2A516",
  "on-surface-variant": "#48463f",
  "primary": "#16181D",
  "error": "#ba1a1a",
  "on-secondary": "#ffffff",
  "inverse-on-surface": "#f4f0e8",
  "secondary": "#0E6E6B",
  "surface-container-lowest": "#ffffff",
  "on-primary": "#ffffff",
  "on-tertiary-fixed-variant": "#5c3d00",
  "outline-variant": "#cdc6b8",
  "primary-fixed": "#e2e2e2",
  "on-surface": "#1c1b1b",
  "tertiary": "#000000",
  "secondary-fixed-dim": "#9fd3cf",
  "on-primary-fixed-variant": "#474747",
  "on-secondary-fixed": "#00201f",
  "night": "#0F1E1F",
  "highlight": "#F2A516",
  "secondary-fill": "#0E6E6B",
  "ink-muted": "#4a4f55",
  "ink-subtle": "#62676d",
  "chrome": "#f4f0e8",
  "chrome-hover": "#e9e3d7",
  "link-hover": "#0B5F5C",
  "shift-early": "#F2A516",
  "shift-late": "#0E6E6B",
  "shift-night": "#2B3F6B"
};

// Dark palette, active while <html> carries the "dark" class (wwwroot/js/theme-mode.js). Same keys as lightColors.
const darkColors = {
  "outline": "#8e9192",
  "on-secondary-container": "#fefcff",
  "on-primary-fixed": "#1b1b1b",
  "background": "#0d1516",
  "on-tertiary-container": "#F2A516",
  "surface": "#0d1516",
  "error-container": "#93000a",
  "surface-container": "#172122",
  "on-error-container": "#ffdad6",
  "on-background": "#e4e2e1",
  "surface-bright": "#33403f",
  "on-secondary-fixed-variant": "#9fd3cf",
  "surface-container-low": "#121b1c",
  "on-tertiary-fixed": "#2a1a00",
  "primary-fixed-dim": "#c6c6c6",
  "on-tertiary": "#ffffff",
  "secondary-container": "#0B5F5C",
  "inverse-primary": "#5e5e5e",
  "secondary-fixed": "#163f3d",
  "tertiary-container": "#3d2800",
  "surface-variant": "#3a4748",
  "surface-dim": "#0d1516",
  "tertiary-fixed-dim": "#68dba9",
  "surface-container-highest": "#293536",
  "on-primary-container": "#c6c6c6",
  "primary-container": "#e2e2e2",
  "surface-container-high": "#1f2a2b",
  "surface-tint": "#c6c6c6",
  "on-error": "#690005",
  "inverse-surface": "#e4e2e1",
  "tertiary-fixed": "#F2A516",
  "on-surface-variant": "#c4c8c7",
  "primary": "#f1efee",
  "error": "#ffb4ab",
  "on-secondary": "#ffffff",
  "inverse-on-surface": "#313030",
  "secondary": "#6fd0ca",
  "surface-container-lowest": "#192425",
  "on-primary": "#16181D",
  "on-tertiary-fixed-variant": "#F2A516",
  "outline-variant": "#3f4b4b",
  "primary-fixed": "#e2e2e2",
  "on-surface": "#e4e2e1",
  "tertiary": "#ffffff",
  "secondary-fixed-dim": "#1f5754",
  "on-primary-fixed-variant": "#474747",
  "on-secondary-fixed": "#d5ecea",
  "night": "#081112",
  "highlight": "#F2A516",
  "secondary-fill": "#0E6E6B",
  "ink-muted": "#b9c1cb",
  "ink-subtle": "#98a2ae",
  "chrome": "#121b1c",
  "chrome-hover": "#222e2f",
  "link-hover": "#6fd0ca",
  "shift-early": "#F2A516",
  "shift-late": "#3FA8A2",
  "shift-night": "#6D86C4"
};

const channels = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(' ');

const variables = (palette) =>
  Object.fromEntries(Object.entries(palette).map(([name, hex]) => [`--c-${name}`, channels(hex)]));

const tokens = Object.fromEntries(
  Object.keys(lightColors).map((name) => [name, `rgb(var(--c-${name}) / <alpha-value>)`])
);

module.exports = {
  content: [
    "./Pages/**/*.{razor,cshtml}",
    "./Shared/**/*.razor",
    "./Localization/Content/**/*.json",
  ],
  darkMode: "class",
  // The ":root.dark" variables are a base rule; Tailwind drops base rules whose class never appears in the content.
  safelist: ["dark"],
  theme: {
    extend: {
      colors: tokens,
      // "secondary" is both link text (light teal in dark mode) and the fill behind white text (stays dark teal),
      // so background utilities read their own token.
      backgroundColor: {
        "secondary": tokens["secondary-fill"],
      },
      fontFamily: {
        "headline": ["Inter"],
        "body": ["Inter"],
        "label": ["Inter"]
      },
      boxShadow: {
        "soft": "var(--shadow-soft)",
        "lift": "var(--shadow-lift)"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root": variables(lightColors),
        ":root.dark": { ...variables(darkColors), "color-scheme": "dark" },
      });
    }),
  ],
}
