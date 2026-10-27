// Keeps the body mode class in sync with Blazor Server's in-circuit navigation, which re-patches the DOM without a
// reload (same reason as locale-direction.js), lets Space activate the expert-mode switch link like Enter and scrolls
// to the top when a link marked data-scroll-top (the logo) is clicked, also when it points at the page already shown,
// where Blazor's link interception would otherwise not move the page.
// Does nothing while the feature is off (empty mode class). Stores nothing.
window.klacksMode = (function () {
    var MODE_CLASSES = ['mode-simple', 'mode-expert'];
    var SWITCH_SELECTOR = 'a[role="switch"]';
    var SPACE_KEYS = [' ', 'Spacebar'];
    var SCROLL_TOP_SELECTOR = 'a[data-scroll-top]';

    function apply(modeClass) {
        if (!modeClass) {
            return;
        }
        var body = document.body;
        MODE_CLASSES.forEach(function (name) {
            body.classList.toggle(name, name === modeClass);
        });
    }

    document.addEventListener('keydown', function (ev) {
        if (SPACE_KEYS.indexOf(ev.key) < 0 || !ev.target.closest) {
            return;
        }
        var target = ev.target.closest(SWITCH_SELECTOR);
        if (target) {
            ev.preventDefault();
            target.click();
        }
    });

    document.addEventListener('click', function (ev) {
        if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || !ev.target.closest) {
            return;
        }
        if (ev.target.closest(SCROLL_TOP_SELECTOR)) {
            window.scrollTo(0, 0);
        }
    });

    return { apply: apply };
})();
