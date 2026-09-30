// Playback control for the looping demo video (RuleConflictVideo.razor).
// Same pattern as scroll-reveal.js: vanilla IIFE, init via IJSRuntime, MutationObserver
// for Blazor Server re-rendering the prerendered DOM. Under prefers-reduced-motion the
// video never plays (CSS additionally shows only the poster image); otherwise it is
// paused while outside the viewport or while the tab is hidden.
window.klacksRuleConflictVideo = (function () {
    var VIDEO_SELECTOR = 'video.rule-demo-video';
    var OBSERVED_CLASS = 'rule-demo-video-observed';
    var VISIBILITY_THRESHOLD = 0.25;

    var mutationObserver = null;
    var intersectionObserver = null;
    var visibilityListenerAttached = false;
    var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function reducedMotionPreferred() {
        return reducedMotionQuery.matches;
    }

    function tryPlay(video) {
        if (reducedMotionPreferred() || document.hidden || !video._klacksInView) {
            return;
        }
        var result = video.play();
        if (result && typeof result.catch === 'function') {
            result.catch(function () { });
        }
    }

    function stop(video) {
        if (!video.paused) {
            video.pause();
        }
    }

    function initVideo(video) {
        video.classList.add(OBSERVED_CLASS);
        video._klacksInView = false;
        // Blazor sets the muted attribute after creating the element, which does not
        // mute it; browsers only autoplay muted media.
        video.defaultMuted = true;
        video.muted = true;

        video.addEventListener('play', function () {
            if (reducedMotionPreferred()) {
                video.pause();
            }
        });

        if (reducedMotionPreferred()) {
            video.removeAttribute('autoplay');
            video.autoplay = false;
            stop(video);
        }

        if (intersectionObserver) {
            intersectionObserver.observe(video);
        } else {
            video._klacksInView = true;
        }
    }

    function observeNewVideos() {
        document.querySelectorAll(VIDEO_SELECTOR + ':not(.' + OBSERVED_CLASS + ')').forEach(initVideo);
    }

    function forEachVideo(callback) {
        document.querySelectorAll(VIDEO_SELECTOR).forEach(callback);
    }

    function init() {
        if (!intersectionObserver && 'IntersectionObserver' in window) {
            intersectionObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    var video = entry.target;
                    video._klacksInView = entry.isIntersecting;
                    if (entry.isIntersecting) {
                        tryPlay(video);
                    } else {
                        stop(video);
                    }
                });
            }, { threshold: VISIBILITY_THRESHOLD });
        }

        observeNewVideos();

        if (!visibilityListenerAttached) {
            document.addEventListener('visibilitychange', function () {
                forEachVideo(function (video) {
                    if (document.hidden) {
                        stop(video);
                    } else {
                        tryPlay(video);
                    }
                });
            });
            reducedMotionQuery.addEventListener('change', function () {
                forEachVideo(function (video) {
                    if (reducedMotionPreferred()) {
                        stop(video);
                    } else {
                        tryPlay(video);
                    }
                });
            });
            visibilityListenerAttached = true;
        }

        if (!mutationObserver) {
            mutationObserver = new MutationObserver(observeNewVideos);
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Runs once on script load as well, so the prerendered video is guarded before the
    // Blazor circuit connects and MainLayout calls init().
    init();

    return { init: init };
})();
