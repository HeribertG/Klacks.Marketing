// Keeps the body mode class in sync with Blazor Server's in-circuit navigation, which re-patches the DOM without a
// reload (same reason as locale-direction.js), and lets Space activate the expert-mode switch link like Enter.
// Does nothing while the feature is off (empty mode class). Stores nothing.
window.klacksMode = (function () {
    var MODE_CLASSES = ['mode-simple', 'mode-expert'];
    var SWITCH_SELECTOR = 'a[role="switch"]';
    var SPACE_KEYS = [' ', 'Spacebar'];

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

    return { apply: apply };
})();
