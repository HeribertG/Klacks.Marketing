// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Keyboard, swipe and auto-advance helpers for the demo video carousels (DemoVideoCarousel.razor, one instance per DemoCarousels definition).
 * Everything is delegated from the document, so it works on the prerendered DOM and survives Blazor
 * re-rendering. The script never changes the slide itself: it only clicks the carousel's own prev/next
 * buttons, so the Blazor state, the fade and the live region stay the single source of truth.
 * Left/Right keys and swipes follow the visual direction (mirrored when <html dir="rtl">). When the
 * non-looping video of the carousel has ended, the next button is clicked (hover and focus do not pause this;
 * videos outside the viewport are paused by rule-conflict-video.js and therefore never end).
 */
window.klacksCarouselControls = (function () {
    var ROOT_SELECTOR = '[data-carousel]';
    var PREV_SELECTOR = '[data-carousel-prev]';
    var NEXT_SELECTOR = '[data-carousel-next]';
    var KEY_LEFT = 'ArrowLeft';
    var KEY_RIGHT = 'ArrowRight';
    var SWIPE_MIN_DISTANCE_PX = 48;
    var SWIPE_DIRECTION_RATIO = 1.5;
    var REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

    var touchStart = null;

    function isRtl() {
        return document.documentElement.getAttribute('dir') === 'rtl';
    }

    function prefersReducedMotion() {
        return window.matchMedia(REDUCED_MOTION_QUERY).matches;
    }

    function step(root, towardsNext) {
        var button = root.querySelector(towardsNext ? NEXT_SELECTOR : PREV_SELECTOR);
        if (button) {
            button.click();
        }
    }

    function onKeyDown(event) {
        var root = event.target.closest && event.target.closest(ROOT_SELECTOR);
        if (!root || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key !== KEY_LEFT && event.key !== KEY_RIGHT) return;
        event.preventDefault();
        step(root, (event.key === KEY_RIGHT) !== isRtl());
    }

    function onTouchStart(event) {
        var root = event.target.closest && event.target.closest(ROOT_SELECTOR);
        if (!root || event.touches.length !== 1) {
            touchStart = null;
            return;
        }
        var touch = event.touches[0];
        touchStart = { root: root, x: touch.clientX, y: touch.clientY };
    }

    function onTouchEnd(event) {
        var start = touchStart;
        touchStart = null;
        if (!start || !event.changedTouches.length) return;
        var touch = event.changedTouches[0];
        var dx = touch.clientX - start.x;
        var dy = touch.clientY - start.y;
        if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_DIRECTION_RATIO) return;
        step(start.root, (dx < 0) !== isRtl());
    }

    function onVideoEnded(event) {
        var video = event.target;
        var root = video.closest && video.closest(ROOT_SELECTOR);
        if (!root) return;
        step(root, true);
    }

    function init() {
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
        document.addEventListener('ended', onVideoEnded, true);
    }

    init();

    return { prefersReducedMotion: prefersReducedMotion };
})();
