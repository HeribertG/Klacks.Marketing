// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cut recipe of the Szenarien clip S1 v2/v3 "Grossanlass mit Keys und Platzhaltern" for build-weekplan-video.mjs (--recipe), cultures de, en, fr, it: the opening is the day part of gemini_generated_video_9578f9f9.mp4
 * (0-3.9 s: Sandra types, tired, Klacksy appears, she turns to it), slowed so the two opening captions keep the reading budget, the live take scenario-placeholders-<culture> filling the frame
 * (takes/scenario-placeholders-takes.mjs: Klacksy explains keys and placeholders in the chat, the key "Messe" and 8 placeholders are created, the AutoWizard fills the scenario), the closing
 * scene from the night part of the SAME clip (4.6-10 s: Klacksy with gears, thumbs up, Sandra claps) and the end card. The cross-fade of the source between day and night (3.9-4.5 s) is never used.
 * Sound: no Veo sound ever; music only under the take. The chat panel is part of the take (TAKE_HAS_CHAT_PANEL true): the builder covers its model and autonomy rows (TAKE_LAYOUT.settingsRows), as in the order clips.
 * The caption file scenario-s1v2-captions.<culture>.json: k1 the event and its demand (20 people a day, script.key of s1-placeholder-stage.mjs), k2 the open commitment and the missing people,
 * x1 the closing line. No ZOOMS.
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

export const TAKE_HAS_CHAT_PANEL = true;

export const OUTPUT_PREFIX = "scenario-s1v2-";
export const TAKE_PREFIX = "scenario-placeholders-";
export const CAPTIONS_PREFIX = "scenario-s1v2-captions.";
