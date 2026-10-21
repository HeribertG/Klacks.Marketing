// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Frozen cut recipe of story video 2 "Wochenplanung" (owner-approved German trials of 2026-10-20): Veo scene, the live take
 * simple-plans-week-<culture> inset over a blurred Veo still with the model row, the "autonomous" switch and the greeting
 * covered, the Veo morning scene and the end card. Two variants: "standard" (56.1 s, frown frames 11.55-15.1 s cut out) and
 * "headscarf" for HEADSCARF_CULTURES (50.3 s, short story with k1, k2 and x1 only; the standard cut must never be shown there).
 * Caption windows are the same for every culture of a variant; the budgets follow from them and MAX_CHARS_PER_SECOND.
 * @param GREETING_REPLACEMENTS - cultures whose greeting bubble gets a new text ("Hi, Sandra!") instead of being hidden;
 *        coordinates are take pixels (1000x720) measured on simple-plans-week-de
 */

export const VARIANT_STANDARD = "standard";
export const VARIANT_HEADSCARF = "headscarf";
export const HEADSCARF_CULTURES = Object.freeze(["ar", "id", "ms"]);

export const VARIANTS = Object.freeze({
  [VARIANT_STANDARD]: Object.freeze({
    rawClip: "gemini_generated_video_d838e9c0.mp4",
    rawParts: Object.freeze([
      Object.freeze({ from: 0, to: 10, speed: 1 }),
      Object.freeze({ from: 10, to: 11.55, speed: 0.7 }),
      Object.freeze({ from: 15.1, to: 16, speed: 0.7 }),
    ]),
    morning: Object.freeze({ from: 16.05, to: 18.9, speed: 0.7, captionFrom: 0.8 }),
    backgroundStillAt: 15.9,
    captionKeys: Object.freeze(["k1", "k2", "k3", "k4", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 4.5]), k2: Object.freeze([4.55, 7.85]), k3: Object.freeze([7.95, 10.25]), k4: Object.freeze([10.35]) }),
  }),
  [VARIANT_HEADSCARF]: Object.freeze({
    rawClip: "gemini_generated_video_16a58156.mp4",
    rawParts: Object.freeze([
      Object.freeze({ from: 0, to: 4.5, speed: 1 }),
      Object.freeze({ from: 4.5, to: 7.6, speed: 0.8 }),
    ]),
    morning: Object.freeze({ from: 7.6, to: 10, speed: 0.7, captionFrom: 0.6 }),
    backgroundStillAt: 7.4,
    captionKeys: Object.freeze(["k1", "k2", "x1"]),
    windows: Object.freeze({ k1: Object.freeze([0.3, 4.5]), k2: Object.freeze([4.6]) }),
  }),
});

export const CAPTION_END_GAP = 0.1;
export const CROSSFADES = Object.freeze({ toTake: 0.5, toMorning: 0.6, toEndcard: 0.5 });
export const ENDCARD_SECONDS = 4;
export const CAPTION_END_BEFORE_CROSSFADE = 0.45;

export const TAKE_LAYOUT = Object.freeze({
  width: 1000,
  height: 720,
  insetX: 140,
  panelWidth: 447,
  panelProbeY: 37,
  panelProbeXRight: 700,
  panelProbeXLeft: 300,
  settingsRows: Object.freeze({ y: 76, height: 97 }),
  greeting: Object.freeze({ y: 176, height: 166 }),
  greetingProbe: Object.freeze({ width: 64, height: 24, threshold: 6, settleSeconds: 0.4 }),
  coverColor: "white",
  backgroundBlur: "24:2",
  backgroundBrightness: -0.1,
});

export const GREETING_REPLACEMENTS = Object.freeze({
  de: Object.freeze({
    box: Object.freeze({ x: 622, y: 200, width: 262, height: 45 }),
    lines: Object.freeze([
      Object.freeze({ text: "Hi, Sandra! Bereit für einen produktiven", x: 628, y: 204 }),
      Object.freeze({ text: "Freitag?", x: 628, y: 225 }),
    ]),
    font: "C\\:/Windows/Fonts/segoeui.ttf",
    fontSize: 14,
    fontColor: "0x3a3f44",
  }),
});

export const ALL_CAPTION_KEYS = Object.freeze(["k1", "k2", "k3", "k4", "x1"]);
export const OUTPUT_PREFIX = "simple-story-weekplan-";
export const VIDEO_FPS = 30;
export const NOISE = Object.freeze({ color: "pink", amplitude: 0.04, sampleRate: 48000, seed: 7, lowpassHz: 3500, fadeOutSeconds: 1.5 });
export const AUDIO_FADE_SECONDS = Object.freeze({ rawOut: 0.8, morningIn: 0.6, morningOut: 0.8 });

export function variantFor(culture) {
  return HEADSCARF_CULTURES.includes(String(culture).toLowerCase()) ? VARIANT_HEADSCARF : VARIANT_STANDARD;
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
  windows.x1 = [variant.morning.captionFrom, Number((morningSceneSeconds(variant) - CAPTION_END_GAP).toFixed(2))];
  return windows;
}
