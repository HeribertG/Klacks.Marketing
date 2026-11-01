// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Monatsplanung clip M2 "Wünsche vor dem Plan" for build-weekplan-video.mjs (--recipe): the opening is Klacksy at the desk full of notes (gemini_generated_video_7d4d55e8.mp4, 0-5 s, without Sandra;
 * 14fa7a7a was the first idea, its wall clock stands beside her head in the push-in and cannot be cropped), Klacksy in the chair with the flying paper (gemini_generated_video_8e7c2926.mp4, 0-4.5 s) and Klacksy
 * flying to Sandra (gemini_generated_video_023ae61d.mp4, 3-6 s), the live take monthplan-commands-<culture> filling the frame (takes/monthplan-commands-takes.mjs, no chat panel), the notes flying away
 * (gemini_generated_video_02bfb036.mp4, 4.5-8.5 s) and the end card. All clips besides --raw are resolved next to it. Every Veo part is cropped so the wall clock of the night office stays out of the picture.
 * Sound: no Veo sound ever; music only under the take, as in every story clip since video 3.
 * The caption file monthplan-m2-captions.<culture>.json says what is shown: k1 the wishes, k2 the promise of the clip, k3 the request (it never says that Klacksy plans), x1 the closing line.
 * ZOOMS stay at about 1.4x on the settings and the proposal and 1.5x on the typed rows; the text of the grid is drawn by the app at slider 100, so the zooms stay inside what the frame can carry.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { CAPTION_END_BEFORE_CROSSFADE, CAPTION_END_GAP, MORNING_KEY, VARIANT_STANDARD, morningSceneSeconds } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

const OPENING_FADE_SECONDS = 0.5;
const CROP_DESK = Object.freeze({ width: 1162, height: 654, x: 0, y: 66 });
const CROP_CHAIR = Object.freeze({ width: 1031, height: 580, x: 249, y: 140 });
const CROP_SANDRA = Object.freeze({ width: 900, height: 506, x: 0, y: 100 });
const CROP_NOTES = Object.freeze({ width: 900, height: 506, x: 0, y: 40 });

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: "gemini_generated_video_7d4d55e8.mp4",
    rawParts: Object.freeze([
      Object.freeze({ from: 0, to: 5, speed: 1, crop: CROP_DESK }),
      Object.freeze({ clip: "gemini_generated_video_8e7c2926.mp4", fade: OPENING_FADE_SECONDS, from: 0, to: 4.5, speed: 1, crop: CROP_CHAIR }),
      Object.freeze({ clip: "gemini_generated_video_023ae61d.mp4", fade: OPENING_FADE_SECONDS, from: 3, to: 6, speed: 1, crop: CROP_SANDRA }),
    ]),
    morningClip: "gemini_generated_video_02bfb036.mp4",
    morning: Object.freeze({ from: 4.5, to: 8.5, speed: 1, captionFrom: 0.4, crop: CROP_NOTES }),
    backgroundStillAt: 4,
    captionKeys: Object.freeze(["k1", "k2", "k3", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 4.5]), k2: Object.freeze([4.9, 8.5]), k3: Object.freeze([8.9]) }),
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

export const ZOOMS = Object.freeze([
  Object.freeze({ cue: "free", delayMs: 200, holdMs: 8700, rect: Object.freeze({ x: 110, y: 62, w: 931, h: 524 }) }),
  Object.freeze({ cue: "type", delayMs: 200, holdMs: 13900, rect: Object.freeze({ x: 100, y: 128, w: 853, h: 480 }) }),
  Object.freeze({ cue: "proofFree", delayMs: 100, holdMs: 18940, rect: Object.freeze({ x: 100, y: 122, w: 914, h: 514 }) }),
]);

export const OUTPUT_PREFIX = "monthplan-m2-";
export const TAKE_PREFIX = "monthplan-commands-";
export const CAPTIONS_PREFIX = "monthplan-m2-captions.";
