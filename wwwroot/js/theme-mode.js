// Dark mode without storage (NoCookieGuardTests): the page follows the system setting (prefers-color-scheme); the
// header button overrides it for the current visit only. Loaded synchronously in <head> so the class is set before the
// first paint. The override lives in this script's memory, so it survives Blazor Server's in-circuit navigation and
// ends with a full reload. The button works before and without the circuit (document-level click handler); sync()
// re-applies aria-pressed after Blazor re-rendered the header. Where the browser supports view transitions (and motion
// is not reduced) the new theme opens as a circle from the button: toggle() passes the button centre to the CSS
// variables --theme-x / --theme-y read by the themeReveal keyframes (tailwind-input.css).
window.klacksTheme = (function () {
    var DARK = 'dark';
    var LIGHT = 'light';
    var TOGGLE_SELECTOR = '[data-theme-toggle]';
    var query = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    var override = null;

    function isDark() {
        if (override !== null) {
            return override === DARK;
        }
        return query !== null && query.matches;
    }

    function sync() {
        var dark = isDark();
        var html = document.documentElement;
        html.classList.toggle(DARK, dark);
        html.classList.toggle(LIGHT, !dark);
        var toggles = document.querySelectorAll(TOGGLE_SELECTOR);
        for (var i = 0; i < toggles.length; i++) {
            toggles[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
        }
    }

    function reducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function toggle(button) {
        override = isDark() ? LIGHT : DARK;
        if (!document.startViewTransition || reducedMotion()) {
            sync();
            return;
        }
        var rect = button.getBoundingClientRect();
        var style = document.documentElement.style;
        style.setProperty('--theme-x', (rect.left + rect.width / 2) + 'px');
        style.setProperty('--theme-y', (rect.top + rect.height / 2) + 'px');
        document.startViewTransition(sync);
    }

    if (query !== null && query.addEventListener) {
        query.addEventListener('change', sync);
    }

    document.addEventListener('click', function (ev) {
        var button = ev.target.closest ? ev.target.closest(TOGGLE_SELECTOR) : null;
        if (button) {
            toggle(button);
        }
    });

    document.addEventListener('DOMContentLoaded', sync);
    sync();

    return { sync: sync };
})();
