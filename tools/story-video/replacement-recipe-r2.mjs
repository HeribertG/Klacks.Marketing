// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Replacement clip R2 "Eine Woche krank" for build-weekplan-video.mjs (--recipe): the opening is Sandra at the phone (gemini_generated_video_a2b69038.mp4, 0-7.5 s), a cross-fade to the
 * papers flying to Klacksy (same clip, 35.5-38.7 s, it stops before the headband appears at 39 s), the live take replacement-r2-<culture> filling the frame (takes/replacement-r2-takes.mjs, no chat panel),
 * the closing scene with the cup (gemini_generated_video_0329cfb2.mp4, 16.1-20 s) as MORNING_CLIP, and the end card.
 * The source clip has a second Klacksy and a wall clock on its left side, CROP_OFFICE keeps both out in the two parts of the opening. MORNING_CLIP is a derived clip: its wall clock is painted out frame by frame with
 * rohmaterial/r1-cover-wall-clock.py, it starts at second 16.1 of its source. All clips besides --raw are resolved next to it, so --raw points at the source clip in a folder that also holds MORNING_CLIP.
 * Sound: no Veo sound ever; music only under the take, as in every story clip since video 3.
 * The caption file replacement-r2-captions.<culture>.json says what is shown: k1 and k2 the absence with its five duties, k3 the request (it never says that Klacksy decides or calls), x1 the closing line.
 * No ZOOMS: the take stands at row slider 100, the app draws its text at full size. Caption windows live here, the texts in the caption file, the beats of the take in capture-app-videos.scripts.json.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { CAPTION_END_BEFORE_CROSSFADE, CAPTION_END_GAP, MORNING_KEY, VARIANT_STANDARD, morningSceneSeconds } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

const OPENING_FADE_SECONDS = 0.5;
const RAW_CLIP = "gemini_generated_video_a2b69038.mp4";
const MORNING_CLIP = "r2-morning-without-clock.mp4";
const CROP_OFFICE = Object.freeze({ width: 845, height: 475, x: 435, y: 90 });

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: RAW_CLIP,
    rawParts: Object.freeze([
      Object.freeze({ from: 0, to: 7.5, speed: 1, crop: CROP_OFFICE }),
      Object.freeze({ clip: RAW_CLIP, fade: OPENING_FADE_SECONDS, from: 35.5, to: 38.7, speed: 1, crop: CROP_OFFICE }),
    ]),
    morningClip: MORNING_CLIP,
    morning: Object.freeze({ from: 0, to: 3.9, speed: 1, captionFrom: 0.4 }),
    backgroundStillAt: 7,
    captionKeys: Object.freeze(["k1", "k2", "k3", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 3.7]), k2: Object.freeze([3.9, 6.8]), k3: Object.freeze([7.2]) }),
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

export const OUTPUT_PREFIX = "replacement-r2-";
export const TAKE_PREFIX = "replacement-r2-";
export const CAPTIONS_PREFIX = "replacement-r2-captions.";
