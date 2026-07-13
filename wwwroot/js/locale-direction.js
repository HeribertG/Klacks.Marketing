window.klacksLocale = (function () {
    // Blazor Server re-patches the DOM on navigation instead of a full reload
    // (see scroll-reveal.js), so <html dir>/[lang] set once in _Layout.cshtml
    // would otherwise stay stuck on whatever culture the page first loaded with.
    function applyDirection(dir, lang) {
        var html = document.documentElement;
        html.setAttribute('dir', dir);
        html.setAttribute('lang', lang);
    }

    return { applyDirection: applyDirection };
})();
