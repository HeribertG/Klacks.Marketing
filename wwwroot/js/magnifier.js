window.klacksMagnifier = (function () {
    var ZOOM_FACTOR = 2.5;
    var LENS_SIZE_RATIO = 0.75; // Loupe diameter relative to the shorter edge of the image.
    var FILTER_ID = 'klacks-magnifier-lens';
    var mutationObserver = null;
    var filterReady = false;

    // Pointer capability is decided per event via PointerEvent.pointerType, not
    // via static media queries: Windows touch-capable laptops report
    // (pointer: coarse) and even (any-pointer: coarse) as the only values in
    // Chromium although a mouse is attached and in use, so any matchMedia-based
    // init guard silently disables the loupe for mouse users on such devices.
    function supportsPointerEvents() {
        return typeof window.PointerEvent === 'function';
    }

    // Legacy fallback only (browsers without PointerEvent): mouse listeners are
    // attached solely when some fine hover-capable input exists, so touch-only
    // devices never get a lens stuck after a tap's synthetic mouse events.
    function anyFineHoverPointerAvailable() {
        return window.matchMedia('(any-hover: hover) and (any-pointer: fine)').matches;
    }

    // Builds a radial "lens bulge" displacement map once: near-zero warp at the
    // center, growing sharply toward the rim, so the SVG filter reads as glass
    // curvature concentrated at the edge instead of uniform noise across the disc.
    function buildDisplacementMapDataUrl() {
        var size = 256;
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        var imageData = ctx.createImageData(size, size);
        var data = imageData.data;
        var center = size / 2;

        for (var y = 0; y < size; y++) {
            for (var x = 0; x < size; x++) {
                var nx = (x - center) / center;
                var ny = (y - center) / center;
                var r = Math.sqrt(nx * nx + ny * ny);
                var idx = (y * size + x) * 4;

                if (r >= 1) {
                    data[idx] = 128;
                    data[idx + 1] = 128;
                    data[idx + 2] = 128;
                    data[idx + 3] = 255;
                    continue;
                }

                var strength = Math.pow(r, 3);
                var dx = r > 0 ? (nx / r) * strength : 0;
                var dy = r > 0 ? (ny / r) * strength : 0;

                data[idx] = Math.max(0, Math.min(255, 128 + dx * 110));
                data[idx + 1] = Math.max(0, Math.min(255, 128 + dy * 110));
                data[idx + 2] = 128;
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png');
    }

    function ensureDistortionFilter() {
        if (filterReady || document.getElementById(FILTER_ID)) {
            filterReady = true;
            return;
        }

        var svgNs = 'http://www.w3.org/2000/svg';
        var xlinkNs = 'http://www.w3.org/1999/xlink';

        var svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.position = 'absolute';
        svg.style.overflow = 'hidden';

        var filter = document.createElementNS(svgNs, 'filter');
        filter.setAttribute('id', FILTER_ID);
        filter.setAttribute('x', '-10%');
        filter.setAttribute('y', '-10%');
        filter.setAttribute('width', '120%');
        filter.setAttribute('height', '120%');

        var feImage = document.createElementNS(svgNs, 'feImage');
        feImage.setAttributeNS(xlinkNs, 'href', buildDisplacementMapDataUrl());
        feImage.setAttribute('result', 'lensMap');
        feImage.setAttribute('x', '0');
        feImage.setAttribute('y', '0');
        feImage.setAttribute('width', '100%');
        feImage.setAttribute('height', '100%');
        feImage.setAttribute('preserveAspectRatio', 'none');

        var feDisplacementMap = document.createElementNS(svgNs, 'feDisplacementMap');
        feDisplacementMap.setAttribute('in', 'SourceGraphic');
        feDisplacementMap.setAttribute('in2', 'lensMap');
        feDisplacementMap.setAttribute('scale', '18');
        feDisplacementMap.setAttribute('xChannelSelector', 'R');
        feDisplacementMap.setAttribute('yChannelSelector', 'G');

        filter.appendChild(feImage);
        filter.appendChild(feDisplacementMap);
        svg.appendChild(filter);
        document.body.appendChild(svg);
        filterReady = true;
    }

    function attach(frame) {
        if (frame.dataset.magnifyReady === 'true') {
            return;
        }

        var img = frame.querySelector('.magnify-image');
        if (!img) {
            return;
        }

        frame.dataset.magnifyReady = 'true';

        var glass = document.createElement('div');
        glass.className = 'magnify-glass';
        glass.setAttribute('aria-hidden', 'true');

        var glassInner = document.createElement('div');
        glassInner.className = 'magnify-glass-inner';
        glass.appendChild(glassInner);
        frame.appendChild(glass);

        var rafId = null;
        var active = false;
        var pendingClientX = 0;
        var pendingClientY = 0;

        // All lens geometry is computed in the frame's LOCAL (untransformed)
        // coordinate space. An ancestor (.screenshot-hover-zoom) scales the
        // card on hover, so getBoundingClientRect() returns scaled values while
        // translate3d/background-position are applied pre-scale: client
        // coordinates must be divided by the current scale factor, and sizes
        // must come from offsetWidth/offsetHeight, or the lens drifts away
        // from the cursor and gets clipped at the frame edges.
        function render() {
            var rect = frame.getBoundingClientRect();
            var width = frame.offsetWidth;
            var height = frame.offsetHeight;

            if (width === 0 || height === 0 || rect.width === 0 || rect.height === 0) {
                return;
            }

            var scaleX = rect.width / width;
            var scaleY = rect.height / height;
            var x = (pendingClientX - rect.left) / scaleX;
            var y = (pendingClientY - rect.top) / scaleY;

            // The image fills the frame's CONTENT box, while absolutely
            // positioned children (the glass) are placed from the PADDING box
            // origin. clientLeft/clientTop (the border widths) convert the
            // border-box coordinates above into image coordinates.
            var ix = x - frame.clientLeft;
            var iy = y - frame.clientTop;
            var boxW = frame.clientWidth;
            var boxH = frame.clientHeight;

            var size = LENS_SIZE_RATIO * Math.min(boxW, boxH);
            var radius = size / 2;

            // Frames can host several stacked images (hero slideshow): the
            // loupe follows whichever slide currently carries .is-active.
            // Single-image frames (MagnifiedImage) have no .is-active and
            // fall back to the image found at attach time.
            var activeImg = frame.querySelector('.magnify-image.is-active') || img;
            var src = activeImg.currentSrc || activeImg.src;

            // The lens background must reproduce the image's on-screen mapping
            // exactly, or the zoomed content drifts away from what is under
            // the cursor (the "fake border" artifact):
            // - object-fit: cover crops the image into the box (hero slides
            //   keep a fixed 16/10 aspect regardless of the screenshot's own
            //   aspect); the crop offset follows object-position.
            // - the hero's Ken Burns animation scales the active slide about
            //   the box center; the live factor comes from the computed
            //   transform matrix (uniform scale, a === d).
            var dispW = boxW;
            var dispH = boxH;
            var cropX = 0;
            var cropY = 0;
            var zoom = 1;

            if (activeImg.naturalWidth > 0 && activeImg.naturalHeight > 0) {
                var style = getComputedStyle(activeImg);

                if (style.objectFit === 'cover') {
                    var coverScale = Math.max(boxW / activeImg.naturalWidth, boxH / activeImg.naturalHeight);
                    dispW = activeImg.naturalWidth * coverScale;
                    dispH = activeImg.naturalHeight * coverScale;
                    var posParts = style.objectPosition.split(' ');
                    cropX = (parseFloat(posParts[0]) / 100) * (dispW - boxW);
                    cropY = (parseFloat(posParts[1]) / 100) * (dispH - boxH);
                }

                if (style.transform !== 'none') {
                    var matrix = new DOMMatrixReadOnly(style.transform);
                    if (matrix.a > 0) {
                        zoom = matrix.a;
                    }
                }
            }

            // Box point p shows image coordinate p + (zoom-1)*center +
            // zoom*crop; the background is sized to the live displayed size,
            // so magnifying by ZOOM_FACTOR keeps the lens aligned.
            var mapX = ix + (zoom - 1) * (boxW / 2) + zoom * cropX;
            var mapY = iy + (zoom - 1) * (boxH / 2) + zoom * cropY;

            // The ring follows the cursor freely and stays a full circle even
            // when it geometrically overhangs the image edge. Only the zoomed
            // content (glassInner) is clipped to the part of the circle that
            // actually lies over the image rectangle; in the overhanging rest
            // of the circle the glass is transparent, so the real page shows
            // through at normal scale. Overhang per side is computed in
            // frame-local pixels, which equal glass-local pixels.
            var clipTop = Math.max(0, radius - iy);
            var clipRight = Math.max(0, ix + radius - boxW);
            var clipBottom = Math.max(0, iy + radius - boxH);
            var clipLeft = Math.max(0, radius - ix);

            glass.style.width = size + 'px';
            glass.style.height = size + 'px';
            glass.style.transform = 'translate3d(' + (ix - radius) + 'px, ' + (iy - radius) + 'px, 0)';

            glassInner.style.clipPath =
                'inset(' + clipTop + 'px ' + clipRight + 'px ' + clipBottom + 'px ' + clipLeft + 'px)';
            glassInner.style.backgroundImage = 'url("' + src + '")';
            glassInner.style.backgroundSize = (dispW * zoom * ZOOM_FACTOR) + 'px ' + (dispH * zoom * ZOOM_FACTOR) + 'px';
            glassInner.style.backgroundPosition =
                (-(mapX * ZOOM_FACTOR - radius)) + 'px ' + (-(mapY * ZOOM_FACTOR - radius)) + 'px';
        }

        // Continuous rAF loop while hovered: the card-scale transition keeps
        // changing the frame rect for ~400ms even when the pointer rests, so a
        // single render per mousemove would leave the lens frozen mid-drift.
        function loop() {
            if (!active) {
                rafId = null;
                return;
            }
            render();
            rafId = requestAnimationFrame(loop);
        }

        // Touch (and pen) contacts must never activate the lens: without this
        // check a tap would leave a ghost ring frozen on the image, since no
        // leave event follows on touch devices.
        function handlePointer(event) {
            if (event.pointerType !== undefined && event.pointerType !== 'mouse') {
                return;
            }

            pendingClientX = event.clientX;
            pendingClientY = event.clientY;

            if (!active) {
                active = true;
                glass.classList.add('is-active');
                rafId = requestAnimationFrame(loop);
            }
        }

        function hide() {
            active = false;
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            glass.classList.remove('is-active');
        }

        if (supportsPointerEvents()) {
            frame.addEventListener('pointerenter', handlePointer);
            frame.addEventListener('pointermove', handlePointer);
            frame.addEventListener('pointerleave', hide);
        } else if (anyFineHoverPointerAvailable()) {
            frame.addEventListener('mouseenter', handlePointer);
            frame.addEventListener('mousemove', handlePointer);
            frame.addEventListener('mouseleave', hide);
        }
    }

    function attachAll() {
        document.querySelectorAll('.magnify-frame:not([data-magnify-ready])').forEach(attach);
    }

    // No reduced-motion guard: the loupe is an interactive utility that follows
    // the cursor directly, not decorative animation. Reduced motion only drops
    // the opacity fade, handled in CSS (tailwind-input.css).
    function init() {
        ensureDistortionFilter();
        attachAll();

        // Blazor Server re-patches the DOM on navigation instead of a full reload
        // (see scroll-reveal.js), so newly rendered .magnify-frame elements need
        // to be picked up without a fresh init() call.
        if (!mutationObserver) {
            mutationObserver = new MutationObserver(attachAll);
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    return { init: init };
})();
