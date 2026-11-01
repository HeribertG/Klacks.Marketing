// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Replacement clip R1 "05:40" for build-weekplan-video.mjs (--recipe): the opening is the night scene of gemini_generated_video_14fa7a7a.mp4 (0-10 s, the phone lights up, the
 * shocked face) as NIGHT_CLIP, a cross-fade to the Klacksy portrait (gemini_generated_video_1026f941.mp4), the live take replacement-r1-<culture> filling the frame (takes/replacement-takes.mjs, no chat panel),
 * the closing scene with the cup and the two colleagues, nobody cut by the frame (gemini_generated_video_1f321b29.mp4, 24-28 s) as MORNING_CLIP, and the end card.
 * NIGHT_CLIP and MORNING_CLIP are derived clips: the wall clock of the source is painted out frame by frame with a tracked soft wall fill, because a crop (tried first) cuts the face or leaves her at the frame edge.
 * MORNING_CLIP starts at second 24 of its source. All clips besides --raw are resolved next to it, so --raw points at NIGHT_CLIP in a folder that also holds the other two.
 * Sound: no Veo sound ever; music only under the take, as in every story clip since video 3.
 * The caption file replacement-r1-captions.<culture>.json says what is shown: k1 the message with the real start of the shift, k2 the question, k3 the request (it never says that Klacksy decides or calls), x1 the closing line.
 * No ZOOMS: the take stands at row slider 100, the app draws its text at full size. Caption windows live here, the texts in the caption file, the beats of the take in capture-app-videos.scripts.json.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { CAPTION_END_BEFORE_CROSSFADE, CAPTION_END_GAP, MORNING_KEY, VARIANT_STANDARD, morningSceneSeconds } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

const OPENING_FADE_SECONDS = 0.5;
const NIGHT_CLIP = "r1-night-without-clock.mp4";
const MORNING_CLIP = "r1-morning-without-clock.mp4";

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: NIGHT_CLIP,
    rawParts: Object.freeze([
      Object.freeze({ from: 0, to: 10, speed: 1 }),
      Object.freeze({ clip: "gemini_generated_video_1026f941.mp4", fade: OPENING_FADE_SECONDS, from: 0, to: 4.5, speed: 1 }),
    ]),
    morningClip: MORNING_CLIP,
    morning: Object.freeze({ from: 0, to: 4, speed: 1, captionFrom: 0.4 }),
    backgroundStillAt: 5,
    captionKeys: Object.freeze(["k1", "k2", "k3", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 5.4]), k2: Object.freeze([5.6, 9.3]), k3: Object.freeze([9.9]) }),
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

export const OUTPUT_PREFIX = "replacement-r1-";
export const TAKE_PREFIX = "replacement-r1-";
export const CAPTIONS_PREFIX = "replacement-r1-captions.";
