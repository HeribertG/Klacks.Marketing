// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Szenarien clip S0 "Zwei Varianten, ein Ja" for build-weekplan-video.mjs (--recipe): the opening is Sandra at the phone (gemini_generated_video_7bfe3a94.mp4, 0-5.2 s), a cross-fade to Sandra hesitating
 * (same clip, 24-26.6 s, slowed), a cross-fade to Klacksy with the raised hand next to Sandra and her paper plan (gemini_generated_video_f8b7d212.mp4, 22.6-24.4 s, slowed, it stops before the second Klacksy returns at 24.6 s), the live take
 * scenario-variants-<culture> filling the frame (takes/scenario-variants-takes.mjs, no chat panel), the closing scene with the cup and the end card.
 * The office clips have a wall clock and a second Klacksy on their left side, CROP_OFFICE keeps both out of the first two parts, CROP_PAPER keeps the clock out of the third (it ends above y 140). MORNING_CLIP is a derived clip: its wall clock is painted out
 * frame by frame with rohmaterial/r1-cover-wall-clock.py (arguments: gemini_generated_video_6b02a88c.mp4, MORNING_CLIP, 16.1 20.0 908 92 68 track.json 1.2 bright), it starts at second 16.1 of its source; the part ends at 2.8 s, before a colleague enters and the painted area shows.
 * All clips besides --raw are resolved next to it, so --raw points at a copy of the source clip in a folder that also holds the other clips.
 * Sound: no Veo sound ever; music only under the take, as in every story clip since video 3.
 * The caption file scenario-s0-captions.<culture>.json says what is shown: k1 the request, k2 the doubt, k3 the idea (it never says that Klacksy plans or decides), x1 the closing line.
 * No ZOOMS: the take stands at row slider 100 for its detail stretches, the app draws its text at full size.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { CAPTION_END_BEFORE_CROSSFADE, CAPTION_END_GAP, MORNING_KEY, VARIANT_STANDARD, morningSceneSeconds } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

const OPENING_FADE_SECONDS = 0.5;
const RAW_CLIP = "gemini_generated_video_7bfe3a94.mp4";
const PAPER_CLIP = "gemini_generated_video_f8b7d212.mp4";
const MORNING_CLIP = "s0-morning-without-clock.mp4";
const CROP_OFFICE = Object.freeze({ width: 845, height: 475, x: 435, y: 90 });
const CROP_PAPER = Object.freeze({ width: 1013, height: 570, x: 60, y: 150 });
const SLOWED = 0.75;
const SLOWED_MORE = 0.5;

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: RAW_CLIP,
    rawParts: Object.freeze([
      Object.freeze({ from: 0, to: 5.2, speed: 1, crop: CROP_OFFICE }),
      Object.freeze({ clip: RAW_CLIP, fade: OPENING_FADE_SECONDS, from: 24, to: 26.6, speed: SLOWED, crop: CROP_OFFICE }),
      Object.freeze({ clip: PAPER_CLIP, fade: OPENING_FADE_SECONDS, from: 22.6, to: 24.4, speed: SLOWED_MORE, crop: CROP_PAPER }),
    ]),
    morningClip: MORNING_CLIP,
    morning: Object.freeze({ from: 0.2, to: 2.8, speed: 0.7, captionFrom: 0.4 }),
    backgroundStillAt: 4,
    captionKeys: Object.freeze(["k1", "k2", "k3", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 4.6]), k2: Object.freeze([5.0, 7.9]), k3: Object.freeze([8.3]) }),
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

export const OUTPUT_PREFIX = "scenario-s0-";
export const TAKE_PREFIX = "scenario-variants-";
export const CAPTIONS_PREFIX = "scenario-s0-captions.";
