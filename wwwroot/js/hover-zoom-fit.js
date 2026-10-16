// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Keeps the hover zoom of screenshots and demo videos (.screenshot-hover-zoom) inside the visible window.
 * On pointer enter it measures the still unscaled frame and sets --hover-zoom-scale (at most the CSS
 * default of 2, smaller when the window is too narrow or too low) plus --hover-zoom-origin-x/-y so the
 * enlarged frame stays below the fixed top navigation and a margin away from every window edge. The margin
 * is always left free, so the pointer can leave the frame and the zoom can be ended without a reload.
 */
window.klacksHoverZoomFit = (function () {
    var FRAME_SELECTOR = '.screenshot-hover-zoom';
    var FIXED_TOP_BAR_SELECTOR = 'nav.fixed';
    var MAX_SCALE = 2;
    var VIEWPORT_MARGIN_PX = 32;
    var SCALE_VAR = '--hover-zoom-scale';
    var ORIGIN_X_VAR = '--hover-zoom-origin-x';
    var ORIGIN_Y_VAR = '--hover-zoom-origin-y';
    var HALF = 2;

    function topBound() {
        var bar = document.querySelector(FIXED_TOP_BAR_SELECTOR);
        var barBottom = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
        return barBottom + VIEWPORT_MARGIN_PX;
    }

    function fitOrigin(start, size, scale, min, max) {
        var origin = size / HALF;
        var growth = scale - 1;
        if (growth <= 0) return origin;
        var low = start - origin * growth;
        var high = start + origin + scale * (size - origin);
        if (low < min) {
            origin = (start - min) / growth;
        } else if (high > max) {
            origin = (start + scale * size - max) / growth;
        }
        return Math.min(size, Math.max(0, origin));
    }

    function fit(frame) {
        var rect = frame.getBoundingClientRect();
        var width = frame.offsetWidth;
        var height = frame.offsetHeight;
        if (!width || !height) return;
        var left = VIEWPORT_MARGIN_PX;
        var right = document.documentElement.clientWidth - VIEWPORT_MARGIN_PX;
        var top = topBound();
        var bottom = document.documentElement.clientHeight - VIEWPORT_MARGIN_PX;
        var scale = Math.max(1, Math.min(MAX_SCALE, (right - left) / width, (bottom - top) / height));
        frame.style.setProperty(SCALE_VAR, String(scale));
        frame.style.setProperty(ORIGIN_X_VAR, fitOrigin(rect.left, width, scale, left, right) + 'px');
        frame.style.setProperty(ORIGIN_Y_VAR, fitOrigin(rect.top, height, scale, top, bottom) + 'px');
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
