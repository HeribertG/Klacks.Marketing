// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Szenarien clip S1 "Grossauftrag mit virtuellen Keys" for build-weekplan-video.mjs (--recipe), German only: the opening is the day part of gemini_generated_video_9578f9f9.mp4
 * (0-3.9 s: Sandra types, tired, Klacksy appears, she turns to it), slowed so the two opening captions keep the reading budget, the live take scenario-keys-<culture> (or scenario-keys-wizard-<culture>, the
 * builder takes the file from --take) filling the frame (takes/scenario-keys-takes.mjs, no chat panel), the closing scene from the night part of the SAME clip (4.6-10 s: Klacksy with gears, thumbs up, Sandra claps)
 * and the end card. The cross-fade of the source between day and night (3.9-4.5 s) is never used: the opening ends at 3.9 s, the closing starts at 4.6 s. The model takes the closing scene from --raw
 * when morningClip is left out (build-weekplan-video.mjs, buildMorning), so no derived clip is needed. The clip shows no wall clock, nothing is cropped.
 * Sound: no Veo sound ever; music only under the take, as in every story clip since video 3.
 * The caption file scenario-s1-captions.<culture>.json says what is shown: k1 the request (the people per day are checked by the take against the demand of both keys, report.keys.peoplePerDay), k2 the open
 * commitment and the idea of planning ahead without touching the real plan (it never says that Klacksy plans or decides), x1 the closing line.
 * No ZOOMS: the take frames the plan at its overview value and opens the dialogs at full size.
 * The contract of a recipe module is described in weekplan-recipe.mjs; every other export of order-recipe.mjs is taken over.
 * @param TAKE_PREFIX - file name prefix of the recorded app take, the culture and ".mp4" are appended
 * @param CAPTIONS_PREFIX - file name prefix of the per-culture caption file next to the builder
 * @param OUTPUT_PREFIX - file name prefix of the written video, the culture is appended
 */

import { CAPTION_END_BEFORE_CROSSFADE, CAPTION_END_GAP, MORNING_KEY, VARIANT_STANDARD, morningSceneSeconds } from "./order-recipe.mjs";

export * from "./order-recipe.mjs";

const RAW_CLIP = "gemini_generated_video_9578f9f9.mp4";
const DAY_PART_END_SECONDS = 3.9;
const NIGHT_PART_START_SECONDS = 4.6;
const CLIP_END_SECONDS = 10;
const OPENING_SPEED = 0.55;

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: RAW_CLIP,
    rawParts: Object.freeze([Object.freeze({ from: 0, to: DAY_PART_END_SECONDS, speed: OPENING_SPEED })]),
    morning: Object.freeze({ from: NIGHT_PART_START_SECONDS, to: CLIP_END_SECONDS, speed: 1, captionFrom: 0.4 }),
    backgroundStillAt: 3,
    captionKeys: Object.freeze(["k1", "k2", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 3.4]), k2: Object.freeze([3.6]) }),
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

export const OUTPUT_PREFIX = "scenario-s1-";
export const TAKE_PREFIX = "scenario-keys-";
export const CAPTIONS_PREFIX = "scenario-s1-captions.";
