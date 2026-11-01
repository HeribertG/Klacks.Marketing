// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Post-processing of one recorded take (a ScreenRecorder frames directory with manifest.json and <video>-<culture>.cues.json) before the story build, in the two steps that
 * the accepted German M2 cut needed and that the take itself does not do (see the header of takes/monthplan-commands-takes.mjs):
 *   --dark   the app reloads after every saved cell and the canvas stays dark for about 0.2 s; every frame whose grid area is darker than the threshold is replaced by the last bright
 *            frame (the original goes to <framesDir>.dark-originals), so no flicker reaches the video. A run that would replace more than --max-replaced of all frames is refused
 *            (a modal dimming the grid for seconds is not a flicker).
 *   --trim   cut the static end of a hold right before a caption: --trim <cue>:<seconds> (repeatable) cuts [shownAt - seconds, shownAt] of that cue out of the output clock and
 *            rewrites the cue sidecar on the new clock; manifest and sidecar are always rebuilt from their .orig backups, so a rerun never cuts twice.
 *            A cut is refused (unless --force-trim) when the window is not static (sampled frames inside it differ by more than the static limit) or when a caption would
 *            stay visible for less than MIN_VISIBLE_SECONDS of the rewritten clock. Whether the cut hides nothing that matters is still a matter for the eye.
 * Then the take is encoded again (mp4, webm, poster) with the same ladder as the capture. --dry-run only reports what would change and writes nothing.
 * CLI: --frames-dir <dir> --ffmpeg <exe> [--dark] [--dark-crop x,y,width,height] [--dark-threshold 110] [--max-replaced 0.05] [--trim cue:seconds ...] [--force-trim] [--width 1280] [--max-mb 12] [--dry-run]
 * @param frames-dir - frames directory of the take (frame-*.jpg, manifest.json, <video>-<culture>.cues.json, <video>-<culture>.mp4)
 * @param dark-crop - grid area in frame pixels that is measured, default 320,200,900,300 (the schedule grid at 1280x720)
 * @param dark-threshold - mean grey value (0-255) below which a frame counts as dark, default 110
 * @param max-replaced - largest fraction of all frames that may be replaced, default 0.05
 * @param trim - cue and seconds to cut right before the cue is shown
 * @param force-trim - cut even when the window is not static or a caption would become too short
 * @param width - encoded width, the width of the first encoding of the take
 * @param max-mb - size budget of the encoded mp4/webm in MB, default KLACKS_VIDEO_MAX_MB or 12
 */

import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { MIN_VISIBLE_SECONDS, captionCueSidecar } from "../lib/caption-overlay.mjs";
import { encodeRecording } from "../lib/video-encoder.mjs";

const MANIFEST_FILE = "manifest.json";
const CUES_SUFFIX = ".cues.json";
const ORIGINAL_SUFFIX = ".orig";
const DARK_ORIGINALS_SUFFIX = ".dark-originals";
const DEFAULT_CROP = "320,200,900,300";
const DEFAULT_THRESHOLD = 110;
const DEFAULT_MAX_REPLACED = 0.05;
const DEFAULT_WIDTH = 1280;
const DEFAULT_MAX_MB = 12;
const BYTES_PER_MB = 1024 * 1024;
const FPS = 25;
const CRF_LADDER = Object.freeze({ webm: [30, 34, 38, 42, 46], mp4: [22, 25, 28, 31, 34] });
const SECONDS_DECIMALS = 3;
const RUN_PREVIEW_LIMIT = 10;
const MEASURE_WIDTH = 64;
const MEASURE_HEIGHT = 21;
const STATIC_SAMPLE_WIDTH = 64;
const STATIC_SAMPLE_HEIGHT = 36;
const STATIC_SAMPLES = 6;
const STATIC_MAX_DIFFERENCE = 2;

export function parseCrop(text) {
  const parts = text.split(",").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0)) throw new Error(`--dark-crop must be x,y,width,height in whole pixels, got "${text}"`);
  const [left, top, width, height] = parts;
  return { left, top, width, height };
}

export function parseTrim(text) {
  const [cue, seconds] = text.split(":");
  const value = Number(seconds);
  if (!cue || !Number.isFinite(value) || value <= 0) throw new Error(`--trim must be <cue>:<seconds>, got "${text}"`);
  return { cue, seconds: value };
}

/** Mean grey value (0-255) of the measured area of one frame. */
export async function meanLuma(file, crop) {
  const pixels = await sharp(file).extract(crop).greyscale().resize(MEASURE_WIDTH, MEASURE_HEIGHT, { fit: "fill" }).raw().toBuffer();
  return pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
}

/** Indexes of the frames to replace: dark frames that have a bright frame before them, with the index of that bright frame. */
export function darkReplacements(lumas, threshold) {
  const replacements = [];
  let lastGood = -1;
  lumas.forEach((luma, index) => {
    if (luma < threshold && lastGood >= 0) replacements.push({ index, source: lastGood });
    else if (luma >= threshold) lastGood = index;
  });
  return replacements;
}

/** Mean absolute grey difference (0-255) of two whole frames at 64x36. */
export async function frameDifference(fileA, fileB) {
  const read = (file) => sharp(file).greyscale().resize(STATIC_SAMPLE_WIDTH, STATIC_SAMPLE_HEIGHT, { fit: "fill" }).raw().toBuffer();
  const [a, b] = await Promise.all([read(fileA), read(fileB)]);
  let sum = 0;
  for (let index = 0; index < a.length; index++) sum += Math.abs(a[index] - b[index]);
  return sum / a.length;
}

/** The largest difference between neighbouring samples of the window [from, to] (capture clock); 0 means the picture does not move. */
async function windowMotion(framesDir, manifest, from, to) {
  const frames = manifest.frames.filter((frame) => typeof frame === "object");
  if (frames.length === 0) return Number.POSITIVE_INFINITY;
  const sampleAt = (time) => frames.reduce((best, frame) => (frame.t <= time && frame.t >= best.t ? frame : best), frames[0]);
  const files = [];
  for (let step = 0; step < STATIC_SAMPLES; step++) files.push(path.join(framesDir, sampleAt(from + ((to - from) * step) / (STATIC_SAMPLES - 1)).file));
  let largest = 0;
  for (let index = 1; index < files.length; index++) largest = Math.max(largest, await frameDifference(files[index - 1], files[index]));
  return largest;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function backupOnce(file) {
  if (!(await exists(`${file}${ORIGINAL_SUFFIX}`))) await copyFile(file, `${file}${ORIGINAL_SUFFIX}`);
}

async function replaceDark(framesDir, manifest, options) {
  const frameFile = (frame) => path.join(framesDir, typeof frame === "string" ? frame : frame.file);
  const lumas = [];
  for (const frame of manifest.frames) lumas.push(await meanLuma(frameFile(frame), options.crop));
  const replacements = darkReplacements(lumas, options.threshold);
  const fraction = manifest.frames.length === 0 ? 0 : replacements.length / manifest.frames.length;
  const summary = {
    frames: manifest.frames.length,
    replaced: replacements.length,
    fraction: Number(fraction.toFixed(4)),
    firstFrames: replacements.slice(0, RUN_PREVIEW_LIMIT).map((item) => manifest.frames[item.index].file ?? manifest.frames[item.index]),
  };
  if (fraction > options.maxReplaced) throw new Error(`${replacements.length} of ${manifest.frames.length} frames are dark (${(fraction * 100).toFixed(1)} %), more than --max-replaced ${options.maxReplaced}; not a flicker, nothing replaced`);
  if (options.dryRun || replacements.length === 0) return summary;
  const backup = `${framesDir}${DARK_ORIGINALS_SUFFIX}`;
  await mkdir(backup, { recursive: true });
  for (const { index, source } of replacements) {
    const target = frameFile(manifest.frames[index]);
    await copyFile(target, path.join(backup, path.basename(target)));
    await copyFile(frameFile(manifest.frames[source]), target);
  }
  return summary;
}

async function trimCuts(framesDir, cuesFile, trims, dryRun, force) {
  const manifestFile = path.join(framesDir, MANIFEST_FILE);
  const manifestSource = (await exists(`${manifestFile}${ORIGINAL_SUFFIX}`)) ? `${manifestFile}${ORIGINAL_SUFFIX}` : manifestFile;
  const cuesSource = (await exists(`${cuesFile}${ORIGINAL_SUFFIX}`)) ? `${cuesFile}${ORIGINAL_SUFFIX}` : cuesFile;
  const manifest = JSON.parse(await readFile(manifestSource, "utf8"));
  const sidecar = JSON.parse(await readFile(cuesSource, "utf8"));
  const regions = trims.map(({ cue, seconds }) => {
    const shown = sidecar.cues.find((item) => item.cue === cue);
    if (!shown) throw new Error(`--trim ${cue}: the sidecar has no such cue (cues: ${sidecar.cues.map((item) => item.cue).join(", ")})`);
    return { from: shown.shownAt - seconds, factor: null, cut: true, to: shown.shownAt };
  });
  manifest.speedRegions = [...manifest.speedRegions, ...regions];
  const events = sidecar.cues.map(({ cue, text, shownAt, hiddenAt, box }) => ({ cue, text, shownAt, hiddenAt, box }));
  const next = captionCueSidecar(manifest, events, { video: sidecar.video, culture: sidecar.culture, viewport: sidecar.viewport });
  if (sidecar.encodedWidth !== undefined) next.encodedWidth = sidecar.encodedWidth;
  const shift = next.cues.map((cue, index) => ({ cue: cue.cue, from: sidecar.cues[index].fromSeconds, to: cue.fromSeconds }));
  const motion = [];
  for (const region of regions) motion.push(Number((await windowMotion(framesDir, manifest, region.from, region.to)).toFixed(2)));
  const tooShort = next.cues.filter((cue) => cue.endSeconds - cue.fromSeconds < MIN_VISIBLE_SECONDS).map((cue) => `${cue.cue} ${(cue.endSeconds - cue.fromSeconds).toFixed(2)} s`);
  const refusals = [
    ...motion.filter((value) => value > STATIC_MAX_DIFFERENCE).map((value) => `the window is not static (difference ${value} > ${STATIC_MAX_DIFFERENCE})`),
    ...tooShort.map((text) => `caption ${text} would be shorter than ${MIN_VISIBLE_SECONDS} s`),
  ];
  if (refusals.length > 0 && !force) throw new Error(`--trim refused: ${refusals.join("; ")} (--force-trim cuts anyway)`);
  if (!dryRun) {
    await backupOnce(manifestFile);
    await backupOnce(cuesFile);
    await writeFile(manifestFile, JSON.stringify(manifest));
    await writeFile(cuesFile, JSON.stringify(next, null, 2));
  }
  return { cuts: trims, motion, refusals, shift };
}

async function main() {
  const { values } = parseArgs({
    options: {
      "frames-dir": { type: "string" },
      ffmpeg: { type: "string" },
      dark: { type: "boolean", default: false },
      "dark-crop": { type: "string", default: DEFAULT_CROP },
      "dark-threshold": { type: "string", default: String(DEFAULT_THRESHOLD) },
      "max-replaced": { type: "string", default: String(DEFAULT_MAX_REPLACED) },
      trim: { type: "string", multiple: true, default: [] },
      "force-trim": { type: "boolean", default: false },
      width: { type: "string", default: String(DEFAULT_WIDTH) },
      "max-mb": { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (!values["frames-dir"] || !values.ffmpeg) throw new Error("Pass --frames-dir and --ffmpeg.");
  if (!values.dark && values.trim.length === 0) throw new Error("Nothing to do: pass --dark and/or --trim.");
  const framesDir = path.resolve(values["frames-dir"]);
  const cuesFile = path.join(framesDir, (await readdir(framesDir)).find((name) => name.endsWith(CUES_SUFFIX)) ?? "");
  if (!cuesFile.endsWith(CUES_SUFFIX)) throw new Error(`No ${CUES_SUFFIX} file in ${framesDir}.`);
  const dryRun = values["dry-run"];
  const report = { framesDir, dryRun };
  if (values.dark) {
    const manifest = JSON.parse(await readFile(path.join(framesDir, MANIFEST_FILE), "utf8"));
    report.dark = await replaceDark(framesDir, manifest, {
      crop: parseCrop(values["dark-crop"]),
      threshold: Number(values["dark-threshold"]),
      maxReplaced: Number(values["max-replaced"]),
      dryRun,
    });
  }
  if (values.trim.length > 0) report.trim = await trimCuts(framesDir, cuesFile, values.trim.map(parseTrim), dryRun, values["force-trim"]);
  if (!dryRun) {
    const sidecar = JSON.parse(await readFile(cuesFile, "utf8"));
    const maxMb = Number(values["max-mb"] ?? process.env.KLACKS_VIDEO_MAX_MB) || DEFAULT_MAX_MB;
    const encoded = await encodeRecording(values.ffmpeg, framesDir, {
      fps: FPS,
      widths: [Number(values.width)],
      crfLadder: CRF_LADDER,
      maxBytes: maxMb * BYTES_PER_MB,
      outputBase: path.join(framesDir, `${sidecar.video}-${sidecar.culture}`),
    });
    report.encoded = { seconds: Number(encoded.seconds.toFixed(SECONDS_DECIMALS)), width: encoded.mp4?.width, crf: encoded.mp4?.crf, mp4Bytes: encoded.mp4?.size };
  }
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`x ${error.message}`);
    process.exit(1);
  });
}
