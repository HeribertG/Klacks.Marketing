// Count-up-Animation für die Kennzahlen-Sektion (StatsCounterSection.razor).
// Muster wie scroll-reveal.js: Vanilla-IIFE, Init via IJSRuntime, MutationObserver
// für Blazor-Server-Client-Navigation. Im Markup steht bereits der Endwert —
// bei prefers-reduced-motion oder ohne JS bleibt er einfach stehen.
window.klacksStatsCounter = (function () {
    var intersectionObserver = null;
    var mutationObserver = null;
    var DURATION_MS = 1500;

    function reducedMotionPreferred() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function format(value, decimals) {
        return value.toLocaleString(document.documentElement.lang || undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function setFinalValue(el) {
        var target = parseFloat(el.getAttribute('data-countup-value')) || 0;
        var decimals = parseInt(el.getAttribute('data-countup-decimals') || '0', 10);
        el.textContent = format(target, decimals);
    }

    function countUp(el) {
        var target = parseFloat(el.getAttribute('data-countup-value')) || 0;
        var decimals = parseInt(el.getAttribute('data-countup-decimals') || '0', 10);
        var startTime = null;

        function tick(timestamp) {
            if (!el.isConnected) {
                return;
            }
            if (startTime === null) {
                startTime = timestamp;
            }
            var progress = Math.min((timestamp - startTime) / DURATION_MS, 1);
            // easeOutCubic: schneller Start, sanftes Auslaufen auf den Endwert.
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = format(target * eased, decimals);
            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        }

        requestAnimationFrame(tick);
    }

    function observeNewElements() {
        document.querySelectorAll('[data-countup]:not(.countup-observed)').forEach(function (el) {
            el.classList.add('countup-observed');

            if (reducedMotionPreferred() || !('IntersectionObserver' in window)) {
                setFinalValue(el);
                return;
            }

            if (!intersectionObserver) {
                intersectionObserver = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            intersectionObserver.unobserve(entry.target);
                            countUp(entry.target);
                        }
                    });
                }, { threshold: 0.4 });
            }

            intersectionObserver.observe(el);
        });
    }

    function init() {
        observeNewElements();

        if (!mutationObserver) {
            mutationObserver = new MutationObserver(observeNewElements);
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    return { init: init };
})();
