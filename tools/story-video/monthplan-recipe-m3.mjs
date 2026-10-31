// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Monatsplanung clip M3 "Der Dezember steht" for build-weekplan-video.mjs (--recipe): the opening is the night scene of
 * gemini_generated_video_b4401dfc.mp4 (hand on the forehead, 13.0-19.7 s; the laptop with the spreadsheet starts at 20.0 s and stays out), a cross-fade to Klacksy in front of the
 * glowing laptop (gemini_generated_video_0dec3c09.mp4, 0.4-5 s), the live take security-month-plan-<culture> filling the frame (takes/security-takes.mjs, no chat panel),
 * the closing scene with the two colleagues (gemini_generated_video_1f321b29.mp4, 24-28 s) and the end card.
 * Both clips besides --raw are resolved next to it. Sound: no Veo sound ever; music only under the take, as in every story clip since video 3.
 * The caption file monthplan-m3-captions.<culture>.json says what is shown: k1 the situation, k2 the request (it never says that Klacksy plans; the take presses the AutoWizard button),
 * x1 the closing line. No ZOOMS: a 2x crop of the 50 % schedule at 1280 px is not readable (measured on a test take), so the take raises the row slider of the app for its
 * detail stretches and the text is drawn by the app at full size.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { CAPTION_END_BEFORE_CROSSFADE, CAPTION_END_GAP, MORNING_KEY, VARIANT_STANDARD, morningSceneSeconds } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

const OPENING_FADE_SECONDS = 0.5;

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: "gemini_generated_video_b4401dfc.mp4",
    rawParts: Object.freeze([
      Object.freeze({ from: 13, to: 19.7, speed: 1 }),
      Object.freeze({ clip: "gemini_generated_video_0dec3c09.mp4", fade: OPENING_FADE_SECONDS, from: 0.4, to: 5, speed: 1 }),
    ]),
    morningClip: "gemini_generated_video_1f321b29.mp4",
    morning: Object.freeze({ from: 24, to: 28, speed: 1, captionFrom: 0.4 }),
    backgroundStillAt: 18,
    captionKeys: Object.freeze(["k1", "k2", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 6.2]), k2: Object.freeze([6.6]) }),
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

export const OUTPUT_PREFIX = "monthplan-m3-";
export const TAKE_PREFIX = "security-month-plan-";
export const CAPTIONS_PREFIX = "monthplan-m3-captions.";
