// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Spitex story clip A "Aufträge zu einer Tour" for build-weekplan-video.mjs (--recipe): exactly the cut of story video 3
 * (order-recipe.mjs: the evening Veo scene of gemini_generated_video_c7b657cc.mp4, the live take at 1280x720 filling the frame, the closing
 * coffee scene, the end card; owner decision 2026-10-29 "Rahmen": no new Gemini clip, music only under the app take, no speech) with its own
 * take, its own Spitex captions and its own output name. The take is spitex-orders-tour-<culture>.mp4 (takes/spitex-takes.mjs: order review of the
 * eight Spitex orders, then the bundle into one container with the tour map). Caption wording lives in spitex-a-captions.<culture>.json
 * (k1 over the stack of orders, k2 the request, x1 in the coffee scene); it says that Klacksy does the legwork and nobody is planned yet.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every export of order-recipe.mjs is taken over, only the file names differ.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder (never a bare "captions.", that is the end card file)
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

export * from "./order-recipe.mjs";

export const OUTPUT_PREFIX = "simple-story-spitex-a-";
export const TAKE_PREFIX = "spitex-orders-tour-";
export const CAPTIONS_PREFIX = "spitex-a-captions.";
