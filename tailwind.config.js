/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

// Light palette: the site's colour tokens as hex values (ModeContrastTests reads them from here).
const lightColors = {
  "outline": "#7e7576",
  "on-secondary-container": "#fefcff",
  "on-primary-fixed": "#1b1b1b",
  "background": "#fcf9f8",
  "on-tertiary-container": "#F2A516",
  "surface": "#fcf9f8",
  "error-container": "#ffdad6",
  "surface-container": "#f0edec",
  "on-error-container": "#93000a",
  "on-background": "#1c1b1b",
  "surface-bright": "#fcf9f8",
  "on-secondary-fixed-variant": "#0B4F4D",
  "surface-container-low": "#f6f3f2",
  "on-tertiary-fixed": "#2a1a00",
  "primary-fixed-dim": "#c6c6c6",
  "on-tertiary": "#ffffff",
  "secondary-container": "#0B5F5C",
  "inverse-primary": "#c6c6c6",
  "secondary-fixed": "#d5ecea",
  "tertiary-container": "#3d2800",
  "surface-variant": "#e5e2e1",
  "surface-dim": "#dcd9d9",
  "tertiary-fixed-dim": "#68dba9",
  "surface-container-highest": "#e5e2e1",
  "on-primary-container": "#848484",
  "primary-container": "#1b1b1b",
  "surface-container-high": "#ebe7e7",
  "surface-tint": "#5e5e5e",
  "on-error": "#ffffff",
  "inverse-surface": "#313030",
  "tertiary-fixed": "#F2A516",
  "on-surface-variant": "#4c4546",
  "primary": "#16181D",
  "error": "#ba1a1a",
  "on-secondary": "#ffffff",
  "inverse-on-surface": "#f3f0ef",
  "secondary": "#0E6E6B",
  "surface-container-lowest": "#ffffff",
  "on-primary": "#ffffff",
  "on-tertiary-fixed-variant": "#5c3d00",
  "outline-variant": "#cfc4c5",
  "primary-fixed": "#e2e2e2",
  "on-surface": "#1c1b1b",
  "tertiary": "#000000",
  "secondary-fixed-dim": "#9fd3cf",
  "on-primary-fixed-variant": "#474747",
  "on-secondary-fixed": "#00201f",
  "night": "#0F1E1F",
  "highlight": "#F2A516",
  "secondary-fill": "#0E6E6B",
  "ink-muted": "#475569",
  "ink-subtle": "#64748b",
  "chrome": "#f8fafc",
  "chrome-hover": "#f1f5f9",
  "link-hover": "#2563eb"
};

// Dark palette, active while <html> carries the "dark" class (wwwroot/js/theme-mode.js). Same keys as lightColors.
const darkColors = {
  "outline": "#8e9192",
  "on-secondary-container": "#fefcff",
  "on-primary-fixed": "#1b1b1b",
  "background": "#111414",
  "on-tertiary-container": "#F2A516",
  "surface": "#111414",
  "error-container": "#93000a",
  "surface-container": "#1c2020",
  "on-error-container": "#ffdad6",
  "on-background": "#e4e2e1",
  "surface-bright": "#363a3a",
  "on-secondary-fixed-variant": "#9fd3cf",
  "surface-container-low": "#171a1a",
  "on-tertiary-fixed": "#2a1a00",
  "primary-fixed-dim": "#c6c6c6",
  "on-tertiary": "#ffffff",
  "secondary-container": "#0B5F5C",
  "inverse-primary": "#5e5e5e",
  "secondary-fixed": "#163f3d",
  "tertiary-container": "#3d2800",
  "surface-variant": "#3f4848",
  "surface-dim": "#111414",
  "tertiary-fixed-dim": "#68dba9",
  "surface-container-highest": "#2e3333",
  "on-primary-container": "#c6c6c6",
  "primary-container": "#e2e2e2",
  "surface-container-high": "#252929",
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
  "surface-container-lowest": "#1e2323",
  "on-primary": "#16181D",
  "on-tertiary-fixed-variant": "#F2A516",
  "outline-variant": "#444949",
  "primary-fixed": "#e2e2e2",
  "on-surface": "#e4e2e1",
  "tertiary": "#ffffff",
  "secondary-fixed-dim": "#1f5754",
  "on-primary-fixed-variant": "#474747",
  "on-secondary-fixed": "#d5ecea",
  "night": "#0a1617",
  "highlight": "#F2A516",
  "secondary-fill": "#0E6E6B",
  "ink-muted": "#b9c1cb",
  "ink-subtle": "#98a2ae",
  "chrome": "#171a1a",
  "chrome-hover": "#262a2a",
  "link-hover": "#7fb0ff"
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
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
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
