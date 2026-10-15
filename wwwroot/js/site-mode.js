// Keeps the body mode class in sync with Blazor Server's in-circuit navigation, which re-patches the DOM without a
// reload (same reason as locale-direction.js). Stores nothing.
window.klacksMode = (function () {
    var MODE_CLASSES = ['mode-simple', 'mode-expert'];

    function apply(modeClass) {
        var body = document.body;
        MODE_CLASSES.forEach(function (name) {
            body.classList.toggle(name, name === modeClass);
        });
    }

    return { apply: apply };
})();
