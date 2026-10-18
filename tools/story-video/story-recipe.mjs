// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Frozen cut recipe of the "Anna is sick" story video (live cut "krank4", 54.57 s): segment timings, crops, caption windows,
 * encoder settings and the noise bed, plus helpers that map source caption windows onto the final timeline and compute the
 * reading speed (characters per second) of each caption.
 * Two layouts exist: "exact" rebuilds the live German cut bit for bit (old take crop, old caption placement, Arial through the
 * ignored font link) and serves only the regression check; "standard" is the layout for every new culture (Inter, take crop that
 * keeps the in-app caption fully visible, story captions that take the place of the in-app caption, at most two lines).
 * @param take - optional per-culture take override from captions.<culture>.json ({ seconds, windows: { y1: {from,to}, ... } });
 *        the defaults are measured on the German take (1280x800, 25 fps, 23.08 s) and must be re-measured for every new recording
 */

export const FPS = 30;
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
export const MAX_CAPTION_WIDTH = 980;
export const MAX_CHARS_PER_SECOND = 17;
export const DECIMALS = 2;
const OVERLAP_TOLERANCE_SECONDS = 0.05;

export const LAYOUT_EXACT = "exact";
export const LAYOUT_STANDARD = "standard";
export const LAYOUTS = Object.freeze([LAYOUT_EXACT, LAYOUT_STANDARD]);

export const CULTURE_DEFAULT = "de";
export const RTL_CULTURES = Object.freeze(["ar", "he"]);
export const DIR_LTR = "ltr";
export const DIR_RTL = "rtl";

export const CAPTION_KEYS = Object.freeze({
  raw: Object.freeze(["k1", "k2", "k3", "k4"]),
  schedule: Object.freeze(["x1"]),
  take: Object.freeze(["y1", "y2"]),
});

export const CAPTION_STYLE = Object.freeze({
  bottomRaw: 48,
  bottomTake: 118,
  fontSize: 32,
  lineHeight: 1.25,
  fontWeight: 700,
  padding: Object.freeze({ top: 16, inner: 28, bar: 32, bottom: 16 }),
  barWidth: 6,
  radius: 10,
  background: "rgba(20,24,30,.88)",
  coverBackground: "rgb(20,24,30)",
  color: "#fff",
  barColor: "#f5a30f",
  fontFamily: "Inter,sans-serif",
});

export const CAPTION_FIT = Object.freeze({ maxLines: 2, minFontSize: 24, fontStep: 2, shrinkWrapSlack: 2 });

export const TAKE_CAPTION = Object.freeze({
  maxWidth: 980,
  coverPad: 8,
  cueKeys: Object.freeze(["y1", "y2"]),
  cueName: "decide",
  takeVideo: "simple-cover-absence",
});

export const CUE_DETECTION = Object.freeze({
  frames: 4,
  searchFromFraction: 0.7,
  darkMax: 90,
  minRunPixels: 40,
  startInsetPixels: 4,
  edgePixels: 24,
  maxGapRows: 40,
  minBoxHeight: 24,
  maxBoxHeight: 120,
  haloPixels: 14,
});

export const ENDCARD_STYLE = Object.freeze({
  background: "#ffffff",
  topBarHeight: 8,
  topBarColor: "#f2a516",
  logoSize: 148,
  logoTop: 109,
  logoGrey: "#808080",
  teal: "#0E6E6B",
  wordmark: "Klacks",
  wordmarkTop: 268,
  wordmarkSize: 76,
  wordmarkWeight: 800,
  wordmarkLetterSpacing: -1,
  taglineTop: 368,
  taglineSize: 34,
  taglineWeight: 700,
  textColor: "#14181d",
  pillTop: 434,
  pillSize: 25,
  pillWeight: 500,
  pillBackground: "#d4e9e7",
  pillPadding: "8px 21px",
  buttonTop: 512,
  buttonSize: 30,
  buttonWeight: 800,
  buttonBackground: "#f2a516",
  buttonColor: "#1c1206",
  buttonPadding: "10px 25px",
  buttonRadius: 8,
  maxTextWidth: 1100,
});

export const LOGO_VIEWBOX = Object.freeze({ cx: 105, cy: 148.5, outerRadius: 130, padding: 8 });

export const RAW_SCENE = Object.freeze({
  seconds: 26,
  captions: Object.freeze({
    k1: Object.freeze({ from: 0, to: 9.5 }),
    k2: Object.freeze({ from: 9.5, to: 19.8 }),
    k3: Object.freeze({ from: 20, to: 22.3 }),
    k4: Object.freeze({ from: 22.3, to: 26 }),
  }),
  zoom: Object.freeze({ from: 19.97, to: 24.2, crop: "1067:590:90:0" }),
  cut: Object.freeze({ keepUntil: 14.3, resumeAt: 17.7, fadeSeconds: 0.6 }),
});

export const SCHEDULE_SCENE = Object.freeze({
  encodeSeconds: 4,
  keepSeconds: 3,
  crop: "1760:990:160:100",
  captions: Object.freeze({ x1: Object.freeze({ from: 0, to: 3 }) }),
});

export const TAKE_SCENE = Object.freeze({
  crop: "1280:720:0:40",
  standardCropY: 60,
  sourceWidth: 1280,
  sourceHeight: 800,
  seconds: 23.08,
  windows: Object.freeze({
    y1: Object.freeze({ from: 16.4, to: 19.6 }),
    y2: Object.freeze({ from: 19.6, to: 23.1 }),
  }),
});

export const OUTRO_SCENE = Object.freeze({ from: 28, seconds: 2, holdSeconds: 1, totalSeconds: 2.5 });
export const ENDCARD_SCENE = Object.freeze({ seconds: 4, fadeInSeconds: 0.4, fadeColor: "white" });

export const NOISE_BED = Object.freeze({
  color: "pink",
  amplitude: 0.04,
  sampleRate: 48000,
  seed: 7,
  lowpassHz: 3500,
  minSeconds: 46,
  endcardFadeOutAt: 2.5,
  endcardFadeOutSeconds: 1.5,
});

export const SEGMENT_CODEC = Object.freeze({ codec: "libx264", crf: 18, preset: "veryfast", pixFmt: "yuv420p" });
export const FINAL_CODEC = Object.freeze({ codec: "libx264", crf: 24, preset: "slow", pixFmt: "yuv420p", audioCodec: "aac", audioBitrate: "96k" });
export const WEBM_CODEC = Object.freeze({ codec: "libvpx-vp9", crf: 34, audioCodec: "libopus", audioBitrate: "64k" });
export const POSTER_CODEC = Object.freeze({ codec: "libwebp", quality: 80, compressionLevel: 6 });

export const OUTPUT_PREFIX = "simple-story-comic-";
export const EXPECTED_SECONDS = 54.57;

export function cultureDirection(culture) {
  return RTL_CULTURES.includes(culture.toLowerCase()) ? DIR_RTL : DIR_LTR;
}

export function takeSettings(override, layout = LAYOUT_EXACT) {
  const standard = layout === LAYOUT_STANDARD;
  const [cropWidth, cropHeight, cropX] = TAKE_SCENE.crop.split(":");
  return {
    crop: standard ? `${cropWidth}:${cropHeight}:${cropX}:${TAKE_SCENE.standardCropY}` : TAKE_SCENE.crop,
    sourceWidth: TAKE_SCENE.sourceWidth,
    sourceHeight: TAKE_SCENE.sourceHeight,
    seconds: override?.seconds ?? TAKE_SCENE.seconds,
    windows: { ...TAKE_SCENE.windows, ...(override?.windows ?? {}) },
  };
}

function rawToOutput(t) {
  const { keepUntil, resumeAt, fadeSeconds } = RAW_SCENE.cut;
  return t < keepUntil ? t : Math.max(t, resumeAt) - (resumeAt - keepUntil) - fadeSeconds;
}

function rawVisibleSeconds(window) {
  const { keepUntil, resumeAt, fadeSeconds } = RAW_SCENE.cut;
  const before = Math.max(0, Math.min(window.to, keepUntil) - window.from);
  const after = Math.max(0, window.to - Math.max(window.from, resumeAt));
  const both = before > 0 && after > 0 ? fadeSeconds : 0;
  return before + after - both;
}

export function captionTimeline(takeSeconds, take) {
  const rawSeconds = RAW_SCENE.seconds - (RAW_SCENE.cut.resumeAt - RAW_SCENE.cut.keepUntil) - RAW_SCENE.cut.fadeSeconds;
  const takeStart = rawSeconds + SCHEDULE_SCENE.keepSeconds;
  const rows = [];
  for (const [key, w] of Object.entries(RAW_SCENE.captions)) {
    rows.push({ key, from: rawToOutput(w.from), seconds: rawVisibleSeconds(w) });
  }
  for (const [key, w] of Object.entries(SCHEDULE_SCENE.captions)) {
    rows.push({ key, from: rawSeconds + w.from, seconds: Math.min(w.to, SCHEDULE_SCENE.keepSeconds) - w.from });
  }
  for (const [key, w] of Object.entries(take.windows)) {
    rows.push({ key, from: takeStart + w.from, seconds: Math.min(w.to, takeSeconds) - w.from });
  }
  return rows;
}

export function readingSpeed(captions, timeline, maxCharsPerSecond = MAX_CHARS_PER_SECOND) {
  return timeline.map((row) => {
    const text = captions[row.key] ?? "";
    const chars = [...text].length;
    const cps = row.seconds > 0 ? chars / row.seconds : Infinity;
    return {
      key: row.key,
      from: Number(row.from.toFixed(DECIMALS)),
      seconds: Number(row.seconds.toFixed(DECIMALS)),
      chars,
      cps: Number(cps.toFixed(DECIMALS)),
      tooFast: cps > maxCharsPerSecond,
    };
  });
}

export function overlappingCaptions(timeline) {
  const sorted = [...timeline].sort((a, b) => a.from - b.from);
  const problems = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const end = sorted[i - 1].from + sorted[i - 1].seconds;
    if (sorted[i].from < end - OVERLAP_TOLERANCE_SECONDS) problems.push(`${sorted[i - 1].key} (until ${end.toFixed(DECIMALS)} s) overlaps ${sorted[i].key} (from ${sorted[i].from.toFixed(DECIMALS)} s)`);
  }
  return problems;
}
