// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Spitex story clip B "Tour fertig machen" for build-weekplan-video.mjs (--recipe): the cut of story video 3 (order-recipe.mjs: the
 * live take at 1280x720 filling the frame, the end card; owner decision 2026-10-29 "Rahmen": no new Gemini clip, music only under the app take, no
 * speech) with its own scenes so that it does not repeat clip A (owner 2026-10-30): the opening is the evening scene of gemini_generated_video_c10f2a35.mp4
 * (the planner talks to Klacksy, no window in the frame), the closing is the bright coffee scene of gemini_generated_video_a2b69038.mp4 (morningClip, resolved
 * next to --raw). The take is spitex-tour-finish-<culture>.mp4 (takes/spitex-takes.mjs: lunch break and new route optimization on the container page,
 * the tour booked for the nurse, the schedule). It is recorded on the database copy after a publishable clip A. Caption wording lives in
 * spitex-b-captions.<culture>.json (k1 over the planner at her desk, k2 the request, x1 in the coffee scene); the nurse is booked only by the planner's
 * explicit request in the take. The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder (never a bare "captions.", that is the end card file)
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { VARIANTS as ORDER_VARIANTS, VARIANT_STANDARD } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    ...ORDER_VARIANTS[VARIANT_STANDARD],
    rawClip: "gemini_generated_video_c10f2a35.mp4",
    rawParts: Object.freeze([Object.freeze({ from: 5.05, to: 10, speed: 0.65 })]),
    backgroundStillAt: 7,
    morningClip: "gemini_generated_video_a2b69038.mp4",
    morning: Object.freeze({ from: 25.9, to: 29.9, speed: 0.8, captionFrom: 1 }),
  }),
});

export const OUTPUT_PREFIX = "simple-story-spitex-b-";
export const TAKE_PREFIX = "spitex-tour-finish-";
export const CAPTIONS_PREFIX = "spitex-b-captions.";
