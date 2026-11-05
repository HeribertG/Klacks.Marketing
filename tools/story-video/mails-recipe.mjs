// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the clip "Klacksy liest die Mails" for build-weekplan-video.mjs (--recipe): the day scene of gemini_generated_video_d5de9445.mp4
 * (0-2.95 s, Sandra asks Klacksy and gets up), the live take mails-availability-<culture> (takes/mails-takes.mjs: Klacksy reads the mails of the
 * team, enters the availabilities and the wishes as planning commands, shows the availability page and the December schedule with both displays),
 * then the night scene from 3.7 s: Klacksy with the mails circling his head (3.7-5.15 s, after Sandra has left, so the reading follows her request; the generated text mark top right lies on the dark window there
 * and is removed with delogo, while 2.95-3.7 s is left out because the mark lies on Sandra's face as she leaves), the night scene of the same
 * then Sandra is back and Klacksy gives a thumbs up (to 10 s), and the end card. Sound: no Veo sound; music only under the take, as in every story clip since video 3.
 * The caption file mails-captions.<culture>.json says what is shown: k1 the situation, k2 the request, x1 the return (shown once Sandra is back, after the envelope part of the night scene).
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { VARIANT_STANDARD } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

const ENVELOPES_FROM = 3.7;
const ENVELOPES_TO = 5.15;
const MORNING_SPEED = 0.7;
const RETURN_CAPTION_FROM = 3.9;
const TEXT_MARK_DELOGO = `delogo=x=1040:y=56:w=200:h=72:enable='lt(t,${((ENVELOPES_TO - ENVELOPES_FROM) / MORNING_SPEED + 0.1).toFixed(2)})'`;

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: "gemini_generated_video_d5de9445.mp4",
    rawParts: Object.freeze([Object.freeze({ from: 0, to: 2.95, speed: 0.55 })]),
    morning: Object.freeze({ from: ENVELOPES_FROM, to: 10, speed: MORNING_SPEED, captionFrom: RETURN_CAPTION_FROM, filter: TEXT_MARK_DELOGO }),
    backgroundStillAt: 2.0,
    captionKeys: Object.freeze(["k1", "k2", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 2.5]), k2: Object.freeze([2.7]) }),
  }),
});

export const OUTPUT_PREFIX = "mails-availability-story-";
export const TAKE_PREFIX = "mails-availability-";
export const CAPTIONS_PREFIX = "mails-captions.";
