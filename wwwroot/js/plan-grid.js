// Living roster grid: the decorative backdrop of the hero and call-to-action stages ([data-plan-grid]). It draws a
// duty roster as coloured shift blocks (early, late, night) on a canvas and tells the product story without words:
// a block drops out, the gap pulses, a replacement slides in. Cells near the pointer light up. The element is
// aria-hidden and carries no text, so it needs no translation. Colours come from the CSS variables --c-shift-early /
// --c-shift-late / --c-shift-night / --c-highlight / --c-outline-variant as they resolve on the host element, so a
// stage on a dark card can carry its own values and every stage follows the dark mode. The attribute value is the
// base opacity of the blocks. Reduced motion draws one static frame without pointer highlight; outside the viewport
// and in a hidden tab nothing is drawn. Nothing is stored (NoCookieGuardTests).
window.klacksPlanGrid = (function () {
    var SELECTOR = '[data-plan-grid]';
    var READY_ATTRIBUTE = 'data-plan-grid-ready';
    var CARD_CLASS = 'plan-grid-card';
    var DARK_CLASS = 'dark';
    var CELL = 46;
    var GAP = 8;
    var RADIUS = 9;
    var FILL_RATIO = 0.62;
    var DEFAULT_BASE_ALPHA = 0.16;
    var MAX_ALPHA = 0.9;
    var POINTER_ALPHA = 0.34;
    var EVENT_INTERVAL_MS = 2400;
    var DROP_MS = 500;
    var GAP_MS = 1500;
    var FILL_MS = 650;
    var POINTER_REACH = 190;
    var FRAME_MS = 40;
    var MAX_PIXEL_RATIO = 2;
    // The hero mask shows the grid around the upper end-side corner only; events are picked from that part.
    var HERO_VISIBLE_INLINE = 0.45;
    var HERO_VISIBLE_BLOCK = 0.6;
    var SHIFT_VARIABLES = ['--c-shift-early', '--c-shift-late', '--c-shift-night'];
    var HIGHLIGHT_VARIABLE = '--c-highlight';
    var OUTLINE_VARIABLE = '--c-outline-variant';
    var FALLBACK_COLOUR = '128, 128, 128';
    var STATE_FILLED = 0;
    var STATE_DROPPING = 1;
    var STATE_OPEN = 2;
    var STATE_FILLING = 3;
    var NO_POINTER = -1;

    var stages = [];
    var mutationObserver = null;
    var frameHandle = 0;
    var lastFrame = 0;
    var pointerX = NO_POINTER;
    var pointerY = NO_POINTER;
    var pointerMoved = false;
    var listenersAttached = false;
    var darkTheme = false;

    function reducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function seededRandom(seed) {
        var value = seed % 2147483647;
        if (value <= 0) {
            value += 2147483646;
        }
        return function () {
            value = (value * 16807) % 2147483647;
            return (value - 1) / 2147483646;
        };
    }

    function readPalette(host) {
        var style = getComputedStyle(host);
        function colour(name) {
            var raw = style.getPropertyValue(name).trim();
            return raw.length > 0 ? raw.split(/\s+/).join(', ') : FALLBACK_COLOUR;
        }
        return {
            shifts: SHIFT_VARIABLES.map(colour),
            highlight: colour(HIGHLIGHT_VARIABLE),
            outline: colour(OUTLINE_VARIABLE)
        };
    }

    function buildCells(stage) {
        var step = CELL + GAP;
        stage.columns = Math.ceil(stage.width / step);
        stage.rows = Math.ceil(stage.height / step);
        stage.cells = [];
        var random = seededRandom(stage.columns * 131 + stage.rows * 17 + 7);
        for (var row = 0; row < stage.rows; row++) {
            for (var column = 0; column < stage.columns; column++) {
                var filled = random() < FILL_RATIO;
                stage.cells.push({
                    row: row,
                    column: column,
                    shift: filled ? Math.floor(random() * SHIFT_VARIABLES.length) : -1,
                    state: STATE_FILLED,
                    since: 0
                });
            }
        }
    }

    function resize(stage) {
        var rect = stage.host.getBoundingClientRect();
        var ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
        stage.width = Math.max(1, Math.round(rect.width));
        stage.height = Math.max(1, Math.round(rect.height));
        stage.canvas.width = stage.width * ratio;
        stage.canvas.height = stage.height * ratio;
        stage.context.setTransform(ratio, 0, 0, ratio, 0, 0);
        buildCells(stage);
        draw(stage, performance.now(), false);
    }

    function roundedRect(context, x, y, size, radius) {
        context.beginPath();
        if (context.roundRect) {
            context.roundRect(x, y, size, size, radius);
        } else {
            context.rect(x, y, size, size);
        }
    }

    function pointerBoost(stage, centreX, centreY) {
        if (pointerX === NO_POINTER) {
            return 0;
        }
        var distance = Math.hypot(pointerX - stage.left - centreX, pointerY - stage.top - centreY);
        return distance >= POINTER_REACH ? 0 : 1 - distance / POINTER_REACH;
    }

    function drawCell(stage, cell, now, withPointer) {
        var context = stage.context;
        var step = CELL + GAP;
        var x = cell.column * step + GAP / 2;
        var y = cell.row * step + GAP / 2;
        var boost = withPointer ? pointerBoost(stage, x + CELL / 2, y + CELL / 2) : 0;
        var elapsed = now - cell.since;
        var palette = stage.palette;

        if (cell.shift < 0) {
            roundedRect(context, x + 0.5, y + 0.5, CELL - 1, RADIUS);
            context.strokeStyle = 'rgba(' + palette.outline + ', ' + (0.32 + boost * 0.4) + ')';
            context.lineWidth = 1;
            context.stroke();
            return;
        }

        var colour = palette.shifts[cell.shift];
        var alpha = stage.baseAlpha + boost * POINTER_ALPHA;
        var scale = 1;

        if (cell.state === STATE_DROPPING) {
            var dropProgress = Math.min(1, elapsed / DROP_MS);
            alpha *= 1 - dropProgress;
            scale = 1 - dropProgress * 0.18;
        } else if (cell.state === STATE_OPEN) {
            var pulse = 0.5 + 0.5 * Math.sin(elapsed / 190);
            roundedRect(context, x + 1, y + 1, CELL - 2, RADIUS);
            context.setLineDash([5, 5]);
            context.strokeStyle = 'rgba(' + palette.highlight + ', ' + (0.45 + pulse * 0.5) + ')';
            context.lineWidth = 2;
            context.stroke();
            context.setLineDash([]);
            return;
        } else if (cell.state === STATE_FILLING) {
            var fillProgress = Math.min(1, elapsed / FILL_MS);
            var eased = 1 - Math.pow(1 - fillProgress, 3);
            alpha = (stage.baseAlpha + 0.42 * (1 - fillProgress)) * eased + boost * POINTER_ALPHA;
            scale = 0.7 + 0.3 * eased;
        }

        var size = CELL * scale;
        var offset = (CELL - size) / 2;
        roundedRect(context, x + offset, y + offset, size, RADIUS * scale);
        context.fillStyle = 'rgba(' + colour + ', ' + Math.min(MAX_ALPHA, alpha) + ')';
        context.fill();
    }

    function draw(stage, now, withPointer) {
        stage.context.clearRect(0, 0, stage.width, stage.height);
        for (var index = 0; index < stage.cells.length; index++) {
            drawCell(stage, stage.cells[index], now, withPointer);
        }
    }

    function inVisiblePart(stage, cell) {
        if (stage.isCard) {
            return true;
        }
        var inline = (cell.column + 0.5) / stage.columns;
        var fromEnd = stage.isRtl ? inline : 1 - inline;
        return fromEnd <= 1 - HERO_VISIBLE_INLINE && (cell.row + 0.5) / stage.rows <= HERO_VISIBLE_BLOCK;
    }

    function advance(stage, now) {
        var active = false;
        for (var index = 0; index < stage.cells.length; index++) {
            var cell = stage.cells[index];
            if (cell.state === STATE_FILLED) {
                continue;
            }
            active = true;
            var elapsed = now - cell.since;
            if (cell.state === STATE_DROPPING && elapsed >= DROP_MS) {
                cell.state = STATE_OPEN;
                cell.since = now;
            } else if (cell.state === STATE_OPEN && elapsed >= GAP_MS) {
                cell.state = STATE_FILLING;
                cell.shift = (cell.shift + 1) % SHIFT_VARIABLES.length;
                cell.since = now;
            } else if (cell.state === STATE_FILLING && elapsed >= FILL_MS) {
                cell.state = STATE_FILLED;
            }
        }

        if (now - stage.lastEvent >= EVENT_INTERVAL_MS) {
            stage.lastEvent = now;
            var candidates = stage.cells.filter(function (cell) {
                return cell.shift >= 0 && cell.state === STATE_FILLED && inVisiblePart(stage, cell);
            });
            if (candidates.length > 0) {
                var chosen = candidates[Math.floor(stage.random() * candidates.length)];
                chosen.state = STATE_DROPPING;
                chosen.since = now;
                active = true;
            }
        }

        return active;
    }

    function frame(now) {
        frameHandle = 0;
        if (document.hidden) {
            return;
        }
        if (now - lastFrame >= FRAME_MS) {
            lastFrame = now;
            for (var index = 0; index < stages.length; index++) {
                var stage = stages[index];
                if (!stage.visible) {
                    continue;
                }
                var rect = stage.host.getBoundingClientRect();
                var scrolled = rect.left !== stage.left || rect.top !== stage.top;
                stage.left = rect.left;
                stage.top = rect.top;
                var active = advance(stage, now);
                if (active || stage.wasActive || pointerMoved || (scrolled && pointerX !== NO_POINTER)) {
                    draw(stage, now, true);
                }
                stage.wasActive = active;
            }
            pointerMoved = false;
        }
        schedule();
    }

    function schedule() {
        if (frameHandle !== 0 || reducedMotion() || document.hidden) {
            return;
        }
        if (stages.some(function (stage) { return stage.visible; })) {
            frameHandle = window.requestAnimationFrame(frame);
        }
    }

    function clearPointer() {
        pointerX = NO_POINTER;
        pointerY = NO_POINTER;
        pointerMoved = true;
    }

    function redrawAfterThemeChange() {
        var dark = document.documentElement.classList.contains(DARK_CLASS);
        if (dark === darkTheme) {
            return;
        }
        darkTheme = dark;
        stages.forEach(function (stage) {
            stage.palette = readPalette(stage.host);
            draw(stage, performance.now(), false);
        });
    }

    function attachListeners() {
        if (listenersAttached) {
            return;
        }
        listenersAttached = true;
        darkTheme = document.documentElement.classList.contains(DARK_CLASS);
        window.addEventListener('pointermove', function (event) {
            pointerX = event.clientX;
            pointerY = event.clientY;
            pointerMoved = true;
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', clearPointer);
        window.addEventListener('pointercancel', clearPointer, { passive: true });
        window.addEventListener('pointerup', function (event) {
            if (event.pointerType !== 'mouse') {
                clearPointer();
            }
        }, { passive: true });
        document.addEventListener('visibilitychange', schedule);
        new MutationObserver(redrawAfterThemeChange)
            .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    function mount(host) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        host.appendChild(canvas);
        var stage = {
            host: host,
            canvas: canvas,
            context: context,
            cells: [],
            palette: readPalette(host),
            baseAlpha: parseFloat(host.getAttribute('data-plan-grid')) || DEFAULT_BASE_ALPHA,
            isCard: host.classList.contains(CARD_CLASS),
            isRtl: getComputedStyle(host).direction === 'rtl',
            random: seededRandom(stages.length * 97 + 13),
            lastEvent: performance.now(),
            visible: false,
            wasActive: false,
            left: 0,
            top: 0
        };
        // The resize observer reports the initial size right away, which builds and draws the first frame.
        stage.resizeObserver = new ResizeObserver(function () { resize(stage); });
        stage.resizeObserver.observe(host);
        stage.intersectionObserver = new IntersectionObserver(function (entries) {
            stage.visible = entries[entries.length - 1].isIntersecting;
            schedule();
        });
        stage.intersectionObserver.observe(host);
        stages.push(stage);
    }

    function unmountDetached() {
        stages = stages.filter(function (stage) {
            if (document.body.contains(stage.host)) {
                return true;
            }
            stage.resizeObserver.disconnect();
            stage.intersectionObserver.disconnect();
            stage.canvas.remove();
            stage.host.removeAttribute(READY_ATTRIBUTE);
            return false;
        });
    }

    function scan() {
        unmountDetached();
        var hosts = document.querySelectorAll(SELECTOR);
        for (var index = 0; index < hosts.length; index++) {
            var host = hosts[index];
            if (!host.hasAttribute(READY_ATTRIBUTE)) {
                host.setAttribute(READY_ATTRIBUTE, '');
                mount(host);
            }
        }
        schedule();
    }

    function init() {
        if (!('ResizeObserver' in window) || !('IntersectionObserver' in window)) {
            return;
        }
        attachListeners();
        scan();
        if (!mutationObserver) {
            mutationObserver = new MutationObserver(scan);
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init: init };
})();
