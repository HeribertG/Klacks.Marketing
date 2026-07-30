// Steuert die Crossfade-Slideshow im Hero-Produkt-Mockup (HeroProductMockup.razor).
// Muster wie scroll-reveal.js: Vanilla-IIFE, Init via IJSRuntime, MutationObserver
// für Blazor-Server-Client-Navigation. Pausiert ausserhalb des Viewports und bei
// verstecktem Tab; bei prefers-reduced-motion oder nur einem Bild bleibt das
// erste Bild statisch (ist serverseitig bereits is-active).
window.klacksHeroSlideshow = (function () {
    var mutationObserver = null;
    var visibilityListenerAttached = false;
    var SLIDE_INTERVAL_MS = 6000;

    function reducedMotionPreferred() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function initRoot(root) {
        var slides = root.querySelectorAll('.hero-slide');
        var dots = root.querySelectorAll('.hero-slideshow-dot');

        if (slides.length === 0) {
            return;
        }

        // Statischer Fall: reduced motion, ein einzelnes Bild oder kein
        // IntersectionObserver — das erste Bild bleibt einfach sichtbar.
        if (reducedMotionPreferred() || slides.length < 2 || !('IntersectionObserver' in window)) {
            slides[0].classList.add('is-active');
            return;
        }

        // Erst mit aktivem JS die Dots einblenden (CSS: .hero-slideshow-js).
        root.classList.add('hero-slideshow-js');

        var state = { index: 0, timer: null, inView: false };
        root._klacksSlideshow = state;

        function show(newIndex) {
            slides[state.index].classList.remove('is-active');
            if (dots[state.index]) {
                dots[state.index].classList.remove('is-active');
            }
            state.index = newIndex;
            slides[newIndex].classList.add('is-active');
            if (dots[newIndex]) {
                dots[newIndex].classList.add('is-active');
            }
        }

        function stop() {
            if (state.timer) {
                clearInterval(state.timer);
                state.timer = null;
            }
        }

        function start() {
            if (!state.timer && state.inView && !document.hidden && root.isConnected) {
                state.timer = setInterval(function () {
                    show((state.index + 1) % slides.length);
                }, SLIDE_INTERVAL_MS);
            }
        }

        state.stop = stop;
        state.start = start;

        for (var i = 0; i < dots.length; i++) {
            (function (dot, dotIndex) {
                dot.addEventListener('click', function () {
                    show(dotIndex);
                    stop();
                    start();
                });
            })(dots[i], i);
        }

        var observer = new IntersectionObserver(function (entries) {
            state.inView = entries[0].isIntersecting;
            if (state.inView) {
                start();
            } else {
                stop();
            }
        }, { threshold: 0.2 });
        observer.observe(root);
    }

    function observeNewRoots() {
        document.querySelectorAll('.hero-slideshow:not(.hero-slideshow-observed)').forEach(function (root) {
            root.classList.add('hero-slideshow-observed');
            initRoot(root);
        });
    }

    function init() {
        observeNewRoots();

        // Ein globaler Listener statt einem pro Mockup: Blazor-Navigation ersetzt
        // den DOM, alte Roots sind dann nicht mehr connected und werden uebersprungen.
        if (!visibilityListenerAttached) {
            document.addEventListener('visibilitychange', function () {
                document.querySelectorAll('.hero-slideshow-js').forEach(function (root) {
                    var state = root._klacksSlideshow;
                    if (!state) {
                        return;
                    }
                    if (document.hidden) {
                        state.stop();
                    } else {
                        state.start();
                    }
                });
            });
            visibilityListenerAttached = true;
        }

        if (!mutationObserver) {
            mutationObserver = new MutationObserver(observeNewRoots);
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    return { init: init };
})();
