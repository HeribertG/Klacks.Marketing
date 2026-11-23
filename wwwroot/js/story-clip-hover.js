// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Plays a story clip (Geschichten.razor) while the mouse pointer is over its hover-zoom frame and pauses it when
 * the pointer leaves, so only the enlarged clip runs. Browsers refuse playback with sound before the visitor has
 * clicked anywhere on the page: the clip then starts muted and gets its sound back on the next hover. Touch and pen
 * pointers and prefers-reduced-motion are left to the native controls.
 */
window.klacksStoryClipHover = (function () {
    var FRAME_SELECTOR = '.story-clip-frame';
    var VIDEO_SELECTOR = 'video.story-clip';
    var MOUSE_POINTER = 'mouse';
    var NOT_ALLOWED_ERROR = 'NotAllowedError';
    var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function ignoreRejection(result) {
        if (result && typeof result.catch === 'function') {
            result.catch(function () { });
        }
    }

    function hoveredClip(event) {
        if (event.pointerType !== MOUSE_POINTER || reducedMotionQuery.matches) return null;
        var frame = event.target.closest && event.target.closest(FRAME_SELECTOR);
        if (!frame || frame.contains(event.relatedTarget)) return null;
        return frame.querySelector(VIDEO_SELECTOR);
    }

    function playMuted(video) {
        if (!video._klacksHovered || video.muted) return;
        video.muted = true;
        video._klacksMutedForHover = true;
        ignoreRejection(video.play());
    }

    function start(video) {
        video._klacksHovered = true;
        if (video._klacksMutedForHover) {
            video.muted = false;
            video._klacksMutedForHover = false;
        }
        var result = video.play();
        if (!result || typeof result.catch !== 'function') return;
        result.catch(function (error) {
            if (error && error.name === NOT_ALLOWED_ERROR) {
                playMuted(video);
            }
        });
    }

    function stop(video) {
        video._klacksHovered = false;
        if (!video.paused) {
            video.pause();
        }
    }

    function onPointerOver(event) {
        var video = hoveredClip(event);
        if (video) start(video);
    }

    function onPointerOut(event) {
        var video = hoveredClip(event);
        if (video) stop(video);
    }

    function init() {
        document.addEventListener('pointerover', onPointerOver, true);
        document.addEventListener('pointerout', onPointerOut, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { start: start, stop: stop };
})();
