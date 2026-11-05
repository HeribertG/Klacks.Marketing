// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the clip "Klacksy liest die Mails" for build-weekplan-video.mjs (--recipe): the day scene of gemini_generated_video_d5de9445.mp4
 * (0-2.95 s, Sandra asks Klacksy and gets up), the live take mails-availability-<culture> (takes/mails-takes.mjs: Klacksy reads the mails of the
 * team, enters the availabilities and the wishes as planning commands, shows the availability page and the December schedule with both displays),
 * the night scene of the same clip (5.2-10 s, Sandra is back, Klacksy gives a thumbs up) and the end card. The middle of the Veo clip (Klacksy with
 * flying envelopes, 3.0-5.15 s) is left out: it carries a generated text mark top right that lies on Sandra's face while she leaves, and the take
 * shows the real work instead. Sound: no Veo sound; music only under the take, as in every story clip since video 3.
 * The caption file mails-captions.<culture>.json says what is shown: k1 the situation, k2 the request, x1 the return.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { VARIANT_STANDARD } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: "gemini_generated_video_d5de9445.mp4",
    rawParts: Object.freeze([Object.freeze({ from: 0, to: 2.95, speed: 0.55 })]),
    morning: Object.freeze({ from: 5.2, to: 10, speed: 0.7, captionFrom: 1.8 }),
    backgroundStillAt: 2.0,
    captionKeys: Object.freeze(["k1", "k2", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 2.5]), k2: Object.freeze([2.7]) }),
  }),
});

export const OUTPUT_PREFIX = "mails-availability-story-";
export const TAKE_PREFIX = "mails-availability-";
export const CAPTIONS_PREFIX = "mails-captions.";
