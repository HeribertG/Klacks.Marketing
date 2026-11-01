// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Monatsplanung clip M1 "Ferienwunsch wird Ferien" for build-weekplan-video.mjs (--recipe): the opening is Klacksy at the desk full of notes (gemini_generated_video_3ec1f178.mp4, 0-5 s, without Sandra),
 * a cross-fade to Sandra with the stacks of paper (gemini_generated_video_c7b657cc.mp4, 0-4.5 s, another crop than the order and Spitex clips), a cross-fade to Klacksy next to Sandra (gemini_generated_video_4783f764.mp4, 7-10 s, slowed),
 * the live take monthplan-wishes-<culture> filling the frame (takes/monthplan-wishes-takes.mjs, no chat panel), the closing scene with the cup and the end card.
 * All three opening clips show a wall clock at the top of the frame: CROP_DESK and CROP_SANDRA keep it out, CROP_CLOSE removes the rest of it, the close-up of the third clip only starts at 7 s because the clock is still in the frame before. MORNING_CLIP is the derived clip of
 * replacement-recipe-r2.mjs (gemini_generated_video_0329cfb2.mp4 from 16.1 s, wall clock painted out with rohmaterial/r1-cover-wall-clock.py), the same scene as in R2: the plan assigns it and no unused closing scene exists in the archive; the part ends before a colleague enters.
 * All clips besides --raw are resolved next to it. Sound: no Veo sound ever; music only under the take, as in every story clip since video 3.
 * The caption file monthplan-m1-captions.<culture>.json says what is shown: k1 the wishes, k2 the promise of the clip, k3 the request (it never says that Klacksy plans or decides; the take uses the app by hand), x1 the closing line.
 * No ZOOMS: the take stands at the largest calendar zoom and at row slider 100, the app draws its text at full size.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { CAPTION_END_BEFORE_CROSSFADE, CAPTION_END_GAP, MORNING_KEY, VARIANT_STANDARD, morningSceneSeconds } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

const OPENING_FADE_SECONDS = 0.5;
const SLOWED = 0.8;
const CROP_DESK = Object.freeze({ width: 1058, height: 595, x: 0, y: 125 });
const CROP_SANDRA = Object.freeze({ width: 905, height: 509, x: 0, y: 100 });
const CROP_CLOSE = Object.freeze({ width: 1138, height: 640, x: 142, y: 60 });

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: "gemini_generated_video_3ec1f178.mp4",
    rawParts: Object.freeze([
      Object.freeze({ from: 0, to: 5, speed: 1, crop: CROP_DESK }),
      Object.freeze({ clip: "gemini_generated_video_c7b657cc.mp4", fade: OPENING_FADE_SECONDS, from: 0, to: 4.5, speed: 1, crop: CROP_SANDRA }),
      Object.freeze({ clip: "gemini_generated_video_4783f764.mp4", fade: OPENING_FADE_SECONDS, from: 7, to: 10, speed: SLOWED, crop: CROP_CLOSE }),
    ]),
    morningClip: "r2-morning-without-clock.mp4",
    morning: Object.freeze({ from: 0.2, to: 2.8, speed: 0.7, captionFrom: 0.4 }),
    backgroundStillAt: 4,
    captionKeys: Object.freeze(["k1", "k2", "k3", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 4.5]), k2: Object.freeze([4.9, 8.4]), k3: Object.freeze([8.9]) }),
  }),
});

export function rawSceneSeconds(variant) {
  return variant.rawParts.reduce((sum, p) => sum + (p.to - p.from) / p.speed - (p.fade ?? 0), 0);
}

export function captionWindows(variant) {
  const rawEnd = Number((rawSceneSeconds(variant) - CAPTION_END_BEFORE_CROSSFADE).toFixed(2));
  const windows = Object.fromEntries(Object.entries(variant.windows).map(([k, w]) => [k, w.length === 2 ? [...w] : [w[0], rawEnd]]));
  windows[MORNING_KEY] = [variant.morning.captionFrom, Number((morningSceneSeconds(variant) - CAPTION_END_GAP).toFixed(2))];
  return windows;
}

export const TAKE_HAS_CHAT_PANEL = false;

export const OUTPUT_PREFIX = "monthplan-m1-";
export const TAKE_PREFIX = "monthplan-wishes-";
export const CAPTIONS_PREFIX = "monthplan-m1-captions.";
