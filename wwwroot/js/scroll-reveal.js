window.klacksScrollReveal = (function () {
    let intersectionObserver = null;
    let mutationObserver = null;

    function reducedMotionPreferred() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function revealAllImmediately() {
        document.querySelectorAll('.reveal').forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    function observeNewElements() {
        document.querySelectorAll('.reveal:not(.reveal-observed)').forEach(function (el) {
            el.classList.add('reveal-observed');
            intersectionObserver.observe(el);
        });
    }

    function init() {
        if (reducedMotionPreferred() || !('IntersectionObserver' in window)) {
            revealAllImmediately();
            return;
        }

        if (!intersectionObserver) {
            intersectionObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        intersectionObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
        }

        observeNewElements();

        // Blazor Server re-patches the DOM on navigation instead of a full reload,
        // so newly rendered .reveal elements need to be picked up without a fresh init() call.
        if (!mutationObserver) {
            mutationObserver = new MutationObserver(observeNewElements);
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    return { init: init };
})();
