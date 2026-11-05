// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the clip "Bestellungen aus dem ERP, ohne Abtippen" for build-weekplan-video.mjs (--recipe): the day scene of
 * gemini_generated_video_9578f9f9.mp4 (0-3.4 s, slowed to 0.55 so the two captions stay readable: Sandra types tiredly, Klacksy appears next to the laptop at 1.2 s, she turns to him
 * at 2.2 s; the clip stops before she gets up at 3.6 s and before the day/night blend at 3.9 s), the live take erp-import-<culture>
 * (takes/erp-takes.mjs: Klacksy advises the folder of this office PC and opens Settings > Import, the folder row, the ERP file is imported, the four
 * orders are listed as drafts and Sandra seals one), the evening scene of the same clip from 7.2 s (slowed to 0.65, Klacksy smiles, thumbs up at 8.2 s, Sandra
 * claps at 9.6 s; 6.2 s with the cog wheels is left out so it never looks as if Klacksy imported) and the end card. No wall clock in either part.
 * Sound: no Veo sound; music only under the take, as in every story clip since video 3.
 * The caption file erp-captions.<culture>.json says what is shown: k1 the situation, k2 the request, x1 the closing line.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { VARIANT_STANDARD } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: "gemini_generated_video_9578f9f9.mp4",
    rawParts: Object.freeze([Object.freeze({ from: 0, to: 3.4, speed: 0.55 })]),
    morning: Object.freeze({ from: 7.2, to: 10, speed: 0.65, captionFrom: 0.4 }),
    backgroundStillAt: 1.5,
    captionKeys: Object.freeze(["k1", "k2", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 3.3]), k2: Object.freeze([3.4]) }),
  }),
});

export const OUTPUT_PREFIX = "erp-import-story-";
export const TAKE_PREFIX = "erp-import-";
export const CAPTIONS_PREFIX = "erp-captions.";
