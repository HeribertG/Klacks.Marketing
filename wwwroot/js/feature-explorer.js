// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * ES module for the feature explorer of the preview start page (FeatureExplorer.razor), imported on demand by
 * the component, so production pages never load it. On phones the explorer is an accordion: opening a chapter
 * below the open one collapses the panel above, which pushes the clicked chapter heading out of view. reveal()
 * scrolls that heading back into view, honouring prefers-reduced-motion.
 * @param element - The chapter heading element that was just opened
 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const FIXED_NAV_HEIGHT_PX = 80;

export function reveal(element) {
    if (!element) {
        return;
    }
    const top = element.getBoundingClientRect().top;
    if (top >= FIXED_NAV_HEIGHT_PX && top < window.innerHeight) {
        return;
    }
    const smooth = !window.matchMedia(REDUCED_MOTION_QUERY).matches;
    element.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
}
