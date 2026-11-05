// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the clip "Klacksy liest die Mails" for build-weekplan-video.mjs (--recipe): the day scene of gemini_generated_video_d5de9445.mp4
 * (0-2.95 s, Sandra asks Klacksy and gets up), the live take mails-availability-<culture> (takes/mails-takes.mjs: Klacksy reads the mails of the
 * team, enters the availabilities and the wishes as planning commands, shows the availability page and the December schedule with both displays),
 * then Klacksy with the mails circling his head (3.7-5.15 s, after Sandra has left; the generated text mark top right lies on the dark window there
 * and is removed with delogo, while 2.95-3.7 s is left out because the mark lies on Sandra's face as she leaves), the night scene of the same
 * clip (5.2-10 s, Sandra is back, Klacksy gives a thumbs up) and the end card. Sound: no Veo sound; music only under the take, as in every story clip since video 3.
 * The caption file mails-captions.<culture>.json says what is shown: k1 the situation, k2 the request, k3 Klacksy reading the mails, x1 the return.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { VARIANT_STANDARD } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

const ENVELOPES_FROM = 3.7;
const ENVELOPES_TO = 5.15;
const TEXT_MARK_DELOGO = "delogo=x=1040:y=56:w=200:h=72";

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: "gemini_generated_video_d5de9445.mp4",
    rawParts: Object.freeze([
      Object.freeze({ from: 0, to: 2.95, speed: 0.55 }),
      Object.freeze({ from: ENVELOPES_FROM, to: ENVELOPES_TO, speed: 0.8, filter: TEXT_MARK_DELOGO }),
    ]),
    morning: Object.freeze({ from: 5.2, to: 10, speed: 0.7, captionFrom: 1.8 }),
    backgroundStillAt: 2.0,
    captionKeys: Object.freeze(["k1", "k2", "k3", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 2.5]), k2: Object.freeze([2.7, 5.2]), k3: Object.freeze([5.6]) }),
  }),
});

export const OUTPUT_PREFIX = "mails-availability-story-";
export const TAKE_PREFIX = "mails-availability-";
export const CAPTIONS_PREFIX = "mails-captions.";
