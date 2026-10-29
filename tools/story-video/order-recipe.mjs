// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of story video 3 "Neue Bestellungen" for build-weekplan-video.mjs (--recipe): the evening Veo scene (Sandra in
 * front of a stack of new orders asks Klacksy, 0-5 s of gemini_generated_video_c7b657cc.mp4), the live take
 * simple-order-review-<culture> inset over a blurred Veo still (the planner goes through the open orders with Klacksy and
 * confirms; the orders are sealed and cut into shifts), the closing scene (the stack flies away, Sandra drinks her coffee,
 * 5-10 s) and the end card. One variant for every culture (the clip has no headscarf version yet). The app greeting stays
 * visible (COVER_GREETING false): the takes run as a demo user whose first name is Sandra (seed-order-review-demo.mjs).
 * The take is recorded at 1280x720 (the shift lists and the schedule have to stay readable next to the chat panel), so it fills
 * the frame (insetX 0) and has its own TAKE_LAYOUT; the chat panel (x 830, width 450) was measured on simple-order-review-de.
 * The contract of a recipe module is described in weekplan-recipe.mjs.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 * @param MORNING_KEY - caption key shown inside the closing scene
 */

import { AUDIO_FADE_SECONDS, NOISE, TAKE_LAYOUT as INSET_TAKE_LAYOUT, VIDEO_FPS } from "./weekplan-recipe.mjs";

export { AUDIO_FADE_SECONDS, NOISE, VIDEO_FPS };

export const TAKE_LAYOUT = Object.freeze({
  ...INSET_TAKE_LAYOUT,
  width: 1280,
  height: 720,
  insetX: 0,
  panelWidth: 450,
  panelProbeXRight: 1000,
  panelProbeXLeft: 280,
});

export const COVER_GREETING = false;

export const VARIANT_STANDARD = "standard";

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: "gemini_generated_video_c7b657cc.mp4",
    rawParts: Object.freeze([Object.freeze({ from: 0, to: 5, speed: 0.65 })]),
    morning: Object.freeze({ from: 5, to: 10, speed: 0.8, captionFrom: 1.6 }),
    backgroundStillAt: 4.8,
    captionKeys: Object.freeze(["k1", "k2", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 4.0]), k2: Object.freeze([4.1]) }),
  }),
});

export const CAPTION_END_GAP = 0.1;
export const CROSSFADES = Object.freeze({ toTake: 0.5, toMorning: 0.6, toEndcard: 0.5 });
export const ENDCARD_SECONDS = 4;
export const CAPTION_END_BEFORE_CROSSFADE = 0.45;
export const GREETING_REPLACEMENTS = Object.freeze({});
export const ALL_CAPTION_KEYS = Object.freeze(["k1", "k2", "k3", "k4", "x1"]);
export const MORNING_KEY = "x1";
export const OUTPUT_PREFIX = "simple-story-orders-";
export const TAKE_PREFIX = "simple-order-review-";
export const CAPTIONS_PREFIX = "order-captions.";

export function variantFor() {
  return VARIANT_STANDARD;
}

export function rawSceneSeconds(variant) {
  return variant.rawParts.reduce((sum, p) => sum + (p.to - p.from) / p.speed, 0);
}

export function morningSceneSeconds(variant) {
  return (variant.morning.to - variant.morning.from) / variant.morning.speed;
}

export function captionWindows(variant) {
  const rawEnd = Number((rawSceneSeconds(variant) - CAPTION_END_BEFORE_CROSSFADE).toFixed(2));
  const windows = Object.fromEntries(Object.entries(variant.windows).map(([k, w]) => [k, w.length === 2 ? [...w] : [w[0], rawEnd]]));
  windows[MORNING_KEY] = [variant.morning.captionFrom, Number((morningSceneSeconds(variant) - CAPTION_END_GAP).toFixed(2))];
  return windows;
}
