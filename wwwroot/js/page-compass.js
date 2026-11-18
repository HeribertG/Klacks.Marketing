// Page compass: a rail at the end-side edge of wide screens with one mark per section of the current page. It is
// built from the page's own h2 headings, so it exists on every page and in every language without extra texts: the
// mark of the section in view is highlighted, hovering a mark shows the heading, a click scrolls there. The marks
// run through the three shift colours from the top of the page to its end. The rail is a pointer convenience only:
// it is aria-hidden, not focusable and never takes the focus on a click (keyboard and screen-reader users navigate
// by the headings themselves), and CSS shows it from 1440px up. Pages with fewer than MIN_SECTIONS headings get no
// rail. Blazor Server re-patches the DOM on navigation, so the headings are re-read (debounced) whenever the
// document changes. Nothing is stored.
window.klacksPageCompass = (function () {
    var HEADING_SELECTOR = 'h2';
    var EXCLUDED_ANCESTORS = 'nav, footer, details, [role="dialog"], [aria-modal="true"], .page-compass';
    var LABEL_NOISE_SELECTOR = '.material-symbols-outlined, [aria-hidden="true"]';
    var HEADER_SELECTOR = 'nav.glass-nav';
    var RAIL_CLASS = 'page-compass';
    var MARK_CLASS = 'page-compass-mark';
    var LABEL_CLASS = 'page-compass-label';
    var ACTIVE_CLASS = 'is-active';
    var SHIFT_CLASSES = ['page-compass-early', 'page-compass-late', 'page-compass-night'];
    var MIN_SECTIONS = 4;
    var MAX_SECTIONS = 14;
    var REBUILD_DELAY_MS = 350;
    var SCROLL_GAP = 24;
    var ACTIVE_LINE = 0.4;
    var PAGE_END_TOLERANCE = 2;

    var rail = null;
    var headings = [];
    var signature = '';
    var rebuildTimer = 0;
    var scrollScheduled = false;
    var observer = null;

    function reducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // The heading text without icon ligatures ("extension", "warning") and other decorative children.
    function headingLabel(heading) {
        var copy = heading.cloneNode(true);
        var noise = copy.querySelectorAll(LABEL_NOISE_SELECTOR);
        for (var index = 0; index < noise.length; index++) {
            noise[index].remove();
        }
        return copy.textContent.trim().replace(/\s+/g, ' ');
    }

    function collectHeadings() {
        var found = [];
        var all = document.querySelectorAll(HEADING_SELECTOR);
        for (var index = 0; index < all.length && found.length < MAX_SECTIONS; index++) {
            var heading = all[index];
            if (heading.closest(EXCLUDED_ANCESTORS) || heading.offsetParent === null) {
                continue;
            }
            if (headingLabel(heading).length > 0) {
                found.push(heading);
            }
        }
        return found;
    }

    function headerHeight() {
        var header = document.querySelector(HEADER_SELECTOR);
        return header ? header.getBoundingClientRect().height : 0;
    }

    // Layout position in the document, independent of the reveal transform a section may still carry.
    function documentTop(element) {
        var top = 0;
        for (var node = element; node; node = node.offsetParent) {
            top += node.offsetTop;
        }
        return top;
    }

    function scrollToHeading(heading) {
        var top = documentTop(heading) - headerHeight() - SCROLL_GAP;
        window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'instant' : 'smooth' });
    }

    function removeRail() {
        if (rail) {
            rail.remove();
            rail = null;
        }
        headings = [];
    }

    function buildRail(found) {
        removeRail();
        headings = found;
        if (headings.length < MIN_SECTIONS) {
            return;
        }
        rail = document.createElement('div');
        rail.className = RAIL_CLASS;
        rail.setAttribute('aria-hidden', 'true');
        headings.forEach(function (heading, index) {
            var mark = document.createElement('button');
            mark.type = 'button';
            mark.tabIndex = -1;
            mark.className = MARK_CLASS + ' ' + SHIFT_CLASSES[Math.min(SHIFT_CLASSES.length - 1, Math.floor(index * SHIFT_CLASSES.length / headings.length))];
            var label = document.createElement('span');
            label.className = LABEL_CLASS;
            label.textContent = headingLabel(heading);
            mark.appendChild(label);
            mark.addEventListener('mousedown', function (event) { event.preventDefault(); });
            mark.addEventListener('click', function () { scrollToHeading(heading); });
            rail.appendChild(mark);
        });
        document.body.appendChild(rail);
        markActive();
    }

    function markActive() {
        scrollScheduled = false;
        if (!rail) {
            return;
        }
        var line = window.innerHeight * ACTIVE_LINE;
        var active = 0;
        for (var index = 0; index < headings.length; index++) {
            if (headings[index].isConnected && headings[index].getBoundingClientRect().top <= line) {
                active = index;
            }
        }
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - PAGE_END_TOLERANCE) {
            active = headings.length - 1;
        }
        for (var position = 0; position < rail.children.length; position++) {
            rail.children[position].classList.toggle(ACTIVE_CLASS, position === active);
        }
    }

    function onScroll() {
        if (!scrollScheduled) {
            scrollScheduled = true;
            window.requestAnimationFrame(markActive);
        }
    }

    function rebuildIfChanged() {
        rebuildTimer = 0;
        var found = collectHeadings();
        var next = found.map(headingLabel).join('|');
        var detached = headings.some(function (heading) { return !heading.isConnected; });
        if (next !== signature || detached) {
            signature = next;
            buildRail(found);
        }
    }

    function scheduleRebuild() {
        if (rebuildTimer === 0) {
            rebuildTimer = window.setTimeout(rebuildIfChanged, REBUILD_DELAY_MS);
        }
    }

    function init() {
        if (observer) {
            return;
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        observer = new MutationObserver(scheduleRebuild);
        observer.observe(document.body, { childList: true, subtree: true });
        rebuildIfChanged();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init: init };
})();
