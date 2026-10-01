// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Keeps the hover zoom of screenshots and demo videos (.screenshot-hover-zoom) inside the viewport.
 * On pointer enter it measures the still unscaled frame and sets --hover-zoom-scale (at most the CSS
 * default of 2, smaller when the viewport is too narrow) and --hover-zoom-origin-x so the enlarged
 * frame neither leaves the window nor causes horizontal page scrolling, wherever the frame sits.
 */
window.klacksHoverZoomFit = (function () {
    var FRAME_SELECTOR = '.screenshot-hover-zoom';
    var MAX_SCALE = 2;
    var VIEWPORT_MARGIN_PX = 16;
    var SCALE_VAR = '--hover-zoom-scale';
    var ORIGIN_VAR = '--hover-zoom-origin-x';
    var HALF = 2;

    function fit(frame) {
        var rect = frame.getBoundingClientRect();
        var width = frame.offsetWidth;
        if (!width) return;
        var viewportWidth = document.documentElement.clientWidth;
        var available = viewportWidth - VIEWPORT_MARGIN_PX * HALF;
        var scale = Math.max(1, Math.min(MAX_SCALE, available / width));
        var origin = width / HALF;
        if (scale > 1) {
            var growth = scale - 1;
            var left = rect.left - origin * growth;
            var right = rect.left + origin + scale * (width - origin);
            if (left < VIEWPORT_MARGIN_PX) {
                origin = (rect.left - VIEWPORT_MARGIN_PX) / growth;
            } else if (right > viewportWidth - VIEWPORT_MARGIN_PX) {
                origin = (rect.left + scale * width - (viewportWidth - VIEWPORT_MARGIN_PX)) / growth;
            }
            origin = Math.min(width, Math.max(0, origin));
        }
        frame.style.setProperty(SCALE_VAR, String(scale));
        frame.style.setProperty(ORIGIN_VAR, origin + 'px');
    }

    function onPointerOver(event) {
        var frame = event.target.closest && event.target.closest(FRAME_SELECTOR);
        if (!frame || frame.contains(event.relatedTarget)) return;
        fit(frame);
    }

    function init() {
        document.addEventListener('pointerover', onPointerOver, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { fit: fit };
})();
