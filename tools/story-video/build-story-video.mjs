// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the "Anna is sick" story video of the simple start page for one culture: renders the captions and the end card,
 * cuts the raw comic clip, the schedule still and the app take "Ausfall decken" with ffmpeg in the recipe of the live cut,
 * mixes the clip sound with a synthetic pink-noise bed and writes simple-story-comic-<culture>.mp4 / .webm / .webp.
 * It prints the caption reading speed, file sizes and the duration. Steps run one after another (low RAM).
 * CLI: --culture <code> --raw <raw clip> --take <app take of that UI language> --schedule-image <app-schedule-<culture>.webp>
 *      --out-dir <dir> [--captions <file>] [--endcard-image <png>] [--mode standard|exact] [--ffmpeg <path>] [--ffprobe <path>]
 * @param culture - any of the 25 cultures in any casing (zh-CN = zh-cn); captions come from captions.<culture>.json next to
 *        this file unless --captions is given; the output files use the lower-case culture like the video catalog
 * @param endcard-image - optional fixed end card PNG instead of the rendered one (regression against the live video)
 * @param mode - standard (default: Inter, fitted layout, in-app caption never shown together with a story caption) or exact
 *        (the layout of the live German cut of 2026-10-17: Arial through the ignored font link, crop 0:40, old placement;
 *        only for the bit-exact regression against the live video, also accepted as --font-mode live)
 * Exit code 1 when a check fails (glyphs not in Inter, caption over two lines, overlapping captions, cue cut off by the crop);
 * the video is still written so the frames can be inspected.
 */

import { execFile } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { findCaptionsFile, findProfile, normalizeCulture, renderSettings } from "./culture-profile.mjs";
import { coverInStoryFrame, cueTimes, detectCueBox } from "./cue-box.mjs";
import { renderCaptions, renderEndcard } from "./render-overlays.mjs";
import {
  DECIMALS,
  ENDCARD_SCENE,
  EXPECTED_SECONDS,
  FINAL_CODEC,
  FPS,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  NOISE_BED,
  OUTPUT_PREFIX,
  OUTRO_SCENE,
  POSTER_CODEC,
  RAW_SCENE,
  SCHEDULE_SCENE,
  SEGMENT_CODEC,
  LAYOUTS,
  LAYOUT_EXACT,
  LAYOUT_STANDARD,
  TAKE_CAPTION,
  WEBM_CODEC,
  captionTimeline,
  cultureDirection,
  overlappingCaptions,
  readingSpeed,
  takeSettings,
} from "./story-recipe.mjs";

const run = promisify(execFile);
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const BYTES_PER_KB = 1024;
const NUMBER_DECIMALS = 3;
const LEGACY_FONT_MODE_EXACT = "live";
const WORK_DIR_PREFIX = "work-";
const CAPTIONS_DIR = "overlays";
const SEGMENTS_DIR = "segments";
const CONCAT_FILE = "concat.txt";
const BED_FILE = "bed.wav";
const EXT_MP4 = ".mp4";
const EXT_WEBM = ".webm";
const EXT_POSTER = ".webp";
const SEG = Object.freeze({ raw: "k_a", rawTrim: "k_a_trim", schedule: "k_e1", scheduleTrim: "k_e1_3", take: "k_take", outro: "k_b", endcard: "k_end" });
const CONCAT_ORDER = Object.freeze([SEG.rawTrim, SEG.scheduleTrim, SEG.take, SEG.outro, SEG.endcard]);

const num = (value) => String(Number(value.toFixed(NUMBER_DECIMALS)));
const between = (w) => `enable='between(t,${num(w.from)},${num(w.to)})'`;
const loopInput = (file) => ["-loop", "1", "-framerate", String(FPS), "-i", file];
const segmentEncode = () => ["-c:v", SEGMENT_CODEC.codec, "-crf", String(SEGMENT_CODEC.crf), "-preset", SEGMENT_CODEC.preset, "-pix_fmt", SEGMENT_CODEC.pixFmt, "-r", String(FPS), "-an"];
const segmentReencode = () => ["-c:v", SEGMENT_CODEC.codec, "-crf", String(SEGMENT_CODEC.crf), "-preset", SEGMENT_CODEC.preset, "-an"];
const frameSize = `${FRAME_WIDTH}:${FRAME_HEIGHT}`;

async function ffmpeg(tools, args) {
  await run(tools.ffmpeg, ["-v", "error", "-y", ...args], { maxBuffer: MAX_BUFFER_BYTES });
}

async function probe(tools, file, entries) {
  const { stdout } = await run(tools.ffprobe, ["-v", "error", "-show_entries", entries, "-of", "json", file], { maxBuffer: MAX_BUFFER_BYTES });
  return JSON.parse(stdout);
}

async function durationOf(tools, file) {
  return Number((await probe(tools, file, "format=duration")).format.duration);
}

async function videoSize(tools, file) {
  const stream = (await probe(tools, file, "stream=width,height")).streams.find((s) => s.width);
  return { width: stream.width, height: stream.height };
}

function readOptions() {
  const { values } = parseArgs({
    options: {
      culture: { type: "string" },
      raw: { type: "string" },
      take: { type: "string" },
      "schedule-image": { type: "string" },
      "out-dir": { type: "string" },
      captions: { type: "string" },
      "endcard-image": { type: "string" },
      mode: { type: "string" },
      "font-mode": { type: "string" },
      ffmpeg: { type: "string" },
      ffprobe: { type: "string" },
    },
  });
  const required = ["culture", "raw", "take", "schedule-image", "out-dir"];
  const missing = required.filter((k) => !values[k]);
  if (missing.length > 0) throw new Error(`missing option(s): ${missing.map((k) => `--${k}`).join(", ")}`);
  const culture = normalizeCulture(values.culture);
  const layout = values.mode ?? (values["font-mode"] === LEGACY_FONT_MODE_EXACT ? LAYOUT_EXACT : LAYOUT_STANDARD);
  if (!LAYOUTS.includes(layout)) throw new Error(`--mode must be one of ${LAYOUTS.join(", ")}`);
  return {
    layout,
    culture,
    raw: path.resolve(values.raw),
    take: path.resolve(values.take),
    schedule: path.resolve(values["schedule-image"]),
    outDir: path.resolve(values["out-dir"]),
    captionsFile: values.captions ? path.resolve(values.captions) : null,
    endcardImage: values["endcard-image"] ? path.resolve(values["endcard-image"]) : null,
    tools: {
      ffmpeg: values.ffmpeg ?? process.env.FFMPEG_PATH ?? "ffmpeg",
      ffprobe: values.ffprobe ?? process.env.FFPROBE_PATH ?? "ffprobe",
    },
  };
}

async function buildRawScene(tools, raw, caps, segDir) {
  const { zoom, captions, seconds } = RAW_SCENE;
  const keys = Object.keys(captions);
  const inputs = keys.flatMap((k) => loopInput(caps[k]));
  const chain = [`[0:v]trim=0:${num(seconds)},setpts=PTS-STARTPTS,fps=${FPS},scale=${frameSize},split[b][z0]`,
    `[z0]crop=${zoom.crop},scale=${frameSize}:flags=lanczos[z]`,
    `[b][z]overlay=0:0:${between(zoom)}[nv]`];
  let last = "nv";
  keys.forEach((k, i) => {
    const label = i === keys.length - 1 ? "" : `[n${i + 1}]`;
    const tail = i === keys.length - 1 ? ",format=yuv420p[v]" : label;
    chain.push(`[${last}][${i + 1}:v]overlay=0:0:${between(captions[k])}${tail}`);
    last = `n${i + 1}`;
  });
  const out = path.join(segDir, `${SEG.raw}${EXT_MP4}`);
  await ffmpeg(tools, ["-i", raw, ...inputs, "-filter_complex", chain.join(";"), "-map", "[v]", "-t", num(seconds), ...segmentEncode(), out]);
  const { keepUntil, resumeAt, fadeSeconds } = RAW_SCENE.cut;
  const trim = path.join(segDir, `${SEG.rawTrim}${EXT_MP4}`);
  const filter = `[0:v]trim=0:${num(keepUntil)},setpts=PTS-STARTPTS[a];[0:v]trim=${num(resumeAt)}:${num(seconds)},setpts=PTS-STARTPTS[b];`
    + `[a][b]xfade=transition=fade:duration=${num(fadeSeconds)}:offset=${num(keepUntil - fadeSeconds)},format=yuv420p[v]`;
  await ffmpeg(tools, ["-i", out, "-filter_complex", filter, "-map", "[v]", ...segmentReencode(), trim]);
}

async function buildScheduleScene(tools, schedule, caps, segDir) {
  const out = path.join(segDir, `${SEG.schedule}${EXT_MP4}`);
  const filter = `[0:v]crop=${SCHEDULE_SCENE.crop},scale=${frameSize}:flags=lanczos,fps=${FPS}[a];[a][1:v]overlay=0:0,format=yuv420p[v]`;
  await ffmpeg(tools, [...loopInput(schedule), ...loopInput(caps.x1), "-filter_complex", filter, "-map", "[v]", "-t", num(SCHEDULE_SCENE.encodeSeconds), ...segmentEncode(), out]);
  await ffmpeg(tools, ["-i", out, "-t", num(SCHEDULE_SCENE.keepSeconds), ...segmentReencode(), path.join(segDir, `${SEG.scheduleTrim}${EXT_MP4}`)]);
}

async function buildTakeScene(tools, take, caps, segDir, settings) {
  const size = await videoSize(tools, take);
  if (size.width !== settings.sourceWidth || size.height !== settings.sourceHeight) {
    throw new Error(`take ${take} is ${size.width}x${size.height}; the crop ${settings.crop} expects ${settings.sourceWidth}x${settings.sourceHeight} like the German take`);
  }
  const keys = Object.keys(settings.windows);
  const inputs = keys.flatMap((k) => loopInput(caps[k]));
  const chain = [`[0:v]crop=${settings.crop},fps=${FPS}[t0]`];
  keys.forEach((k, i) => {
    const tail = i === keys.length - 1 ? ",format=yuv420p[v]" : `[t${i + 1}]`;
    chain.push(`[t${i}][${i + 1}:v]overlay=0:0:${between(settings.windows[k])}${tail}`);
  });
  await ffmpeg(tools, ["-i", take, ...inputs, "-filter_complex", chain.join(";"), "-map", "[v]", "-t", num(settings.seconds), ...segmentReencode(), path.join(segDir, `${SEG.take}${EXT_MP4}`)]);
}

async function buildOutroAndEndcard(tools, raw, endcardPng, segDir) {
  const outroVf = `scale=${frameSize},fps=${FPS},tpad=stop_mode=clone:stop_duration=${num(OUTRO_SCENE.holdSeconds)},format=yuv420p`;
  await ffmpeg(tools, ["-ss", num(OUTRO_SCENE.from), "-t", num(OUTRO_SCENE.seconds), "-i", raw, "-vf", outroVf, "-t", num(OUTRO_SCENE.totalSeconds), ...segmentEncode(), path.join(segDir, `${SEG.outro}${EXT_MP4}`)]);
  const endVf = `scale=${frameSize},fade=t=in:st=0:d=${num(ENDCARD_SCENE.fadeInSeconds)}:color=${ENDCARD_SCENE.fadeColor},format=yuv420p`;
  await ffmpeg(tools, [...loopInput(endcardPng), "-vf", endVf, "-t", num(ENDCARD_SCENE.seconds), ...segmentEncode(), path.join(segDir, `${SEG.endcard}${EXT_MP4}`)]);
}

async function buildNoiseBed(tools, workDir, seconds) {
  const b = NOISE_BED;
  const file = path.join(workDir, BED_FILE);
  const source = `anoisesrc=color=${b.color}:amplitude=${num(b.amplitude)}:sample_rate=${b.sampleRate}:seed=${b.seed}`;
  await ffmpeg(tools, ["-f", "lavfi", "-i", source, "-t", num(Math.max(b.minSeconds, Math.ceil(seconds))), "-af", `lowpass=f=${b.lowpassHz},aformat=channel_layouts=stereo`, file]);
  return file;
}

function audioGraph(middleSeconds) {
  const { keepUntil, resumeAt, fadeSeconds } = RAW_SCENE.cut;
  const b = NOISE_BED;
  return [
    `[1:a]aformat=channel_layouts=stereo,aresample=${b.sampleRate},asplit=3[r1][r2][r3]`,
    `[r1]atrim=0:${num(keepUntil)},asetpts=PTS-STARTPTS[p1]`,
    `[r2]atrim=${num(resumeAt)}:${num(RAW_SCENE.seconds)},asetpts=PTS-STARTPTS[p2]`,
    `[p1][p2]acrossfade=d=${num(fadeSeconds)}[a0]`,
    `[2:a]atrim=0:${middleSeconds.toFixed(DECIMALS)},asetpts=PTS-STARTPTS[a1]`,
    `[r3]atrim=${num(OUTRO_SCENE.from)}:${num(OUTRO_SCENE.from + OUTRO_SCENE.seconds)},asetpts=PTS-STARTPTS,apad=whole_dur=${num(OUTRO_SCENE.totalSeconds)}[a2]`,
    `[2:a]atrim=0:${num(ENDCARD_SCENE.seconds)},asetpts=PTS-STARTPTS,afade=t=out:st=${num(b.endcardFadeOutAt)}:d=${num(b.endcardFadeOutSeconds)}[a3]`,
    "[a0][a1][a2][a3]concat=n=4:v=0:a=1[a]",
  ].join(";");
}

async function muxFinal(tools, raw, segDir, workDir, outBase) {
  const list = CONCAT_ORDER.map((s) => `file '${path.join(segDir, `${s}${EXT_MP4}`).replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n");
  const listFile = path.join(workDir, CONCAT_FILE);
  await writeFile(listFile, `${list}\n`, "utf8");
  const middle = await durationOf(tools, path.join(segDir, `${SEG.scheduleTrim}${EXT_MP4}`)) + await durationOf(tools, path.join(segDir, `${SEG.take}${EXT_MP4}`));
  const bed = await buildNoiseBed(tools, workDir, Math.max(middle, ENDCARD_SCENE.seconds));
  const f = FINAL_CODEC;
  const mp4 = `${outBase}${EXT_MP4}`;
  await ffmpeg(tools, ["-f", "concat", "-safe", "0", "-i", listFile, "-i", raw, "-i", bed, "-filter_complex", audioGraph(middle),
    "-map", "0:v", "-map", "[a]", "-c:v", f.codec, "-crf", String(f.crf), "-preset", f.preset, "-pix_fmt", f.pixFmt,
    "-c:a", f.audioCodec, "-b:a", f.audioBitrate, "-movflags", "+faststart", mp4]);
  const w = WEBM_CODEC;
  await ffmpeg(tools, ["-i", mp4, "-c:v", w.codec, "-crf", String(w.crf), "-b:v", "0", "-row-mt", "1", "-c:a", w.audioCodec, "-b:a", w.audioBitrate, `${outBase}${EXT_WEBM}`]);
  const p = POSTER_CODEC;
  await ffmpeg(tools, ["-i", mp4, "-frames:v", "1", "-c:v", p.codec, "-quality", String(p.quality), "-compression_level", String(p.compressionLevel), `${outBase}${EXT_POSTER}`]);
}

function printReadingSpeed(culture, rows, maxCharsPerSecond) {
  console.log(`caption reading speed ${culture} (max ${maxCharsPerSecond} chars/s):`);
  console.table(rows);
  for (const r of rows.filter((x) => x.tooFast)) console.warn(`! ${culture} ${r.key}: ${r.cps} chars/s over ${maxCharsPerSecond}`);
}

async function coverOfCue(options, take, takeSize) {
  const direction = cultureDirection(options.culture);
  const windows = Object.values(take.windows);
  const window = { from: Math.min(...windows.map((w) => w.from)), to: Math.max(...windows.map((w) => w.to)) };
  const times = cueTimes(window, take.seconds);
  const { box, frames, inspected } = await detectCueBox(options.tools.ffmpeg, options.take, times, takeSize, direction);
  const [, , , cropY] = take.crop.split(":").map(Number);
  const cover = coverInStoryFrame(box, cropY, FRAME_WIDTH, FRAME_HEIGHT, TAKE_CAPTION.coverPad);
  console.log(`in-app caption found in ${frames}/${inspected} frames (${times.join(", ")} s): take pixels x ${box.left}-${box.right}, y ${box.top}-${box.bottom}; cover in the story frame x ${cover.left}-${cover.right}, y ${cover.top}-${cover.bottom}`);
  return cover;
}

async function main() {
  const options = readOptions();
  const exact = options.layout === LAYOUT_EXACT;
  const captionsFile = options.captionsFile ?? await findCaptionsFile(options.culture);
  if (!captionsFile) throw new Error(`no captions.${options.culture}.json in ${toolDir}; pass --captions`);
  const config = JSON.parse(await readFile(captionsFile, "utf8"));
  const profile = await findProfile(options.culture);
  if (!profile) console.warn(`! no profile for ${options.culture} in culture-profiles.json: default font and reading speed`);
  const settings = renderSettings(profile);
  const take = takeSettings(config.take, options.layout);
  const timeline = captionTimeline(take.seconds, take);
  const problems = overlappingCaptions(timeline).map((p) => `captions overlap: ${p}`);
  printReadingSpeed(options.culture, readingSpeed(config.captions, timeline, settings.maxCharsPerSecond), settings.maxCharsPerSecond);
  if (config.abbreviations && config.abbreviations.verifiedOnTake !== true) {
    console.warn(`! ${options.culture}: abbreviations ${config.abbreviations.absence}/${config.abbreviations.replacement} in y1/y2 are not yet checked against the recorded take`);
  }
  const takeSize = await videoSize(options.tools, options.take);
  if (takeSize.width !== take.sourceWidth || takeSize.height !== take.sourceHeight) {
    throw new Error(`take ${options.take} is ${takeSize.width}x${takeSize.height}; the crop ${take.crop} expects ${take.sourceWidth}x${take.sourceHeight} like the German take`);
  }
  const cover = exact ? null : await coverOfCue(options, take, takeSize);
  if (cover && !cover.visible) problems.push("in-app caption is cut off by the take crop");
  const workDir = path.join(options.outDir, `${WORK_DIR_PREFIX}${options.culture}`);
  const capDir = path.join(workDir, CAPTIONS_DIR);
  const segDir = path.join(workDir, SEGMENTS_DIR);
  await mkdir(capDir, { recursive: true });
  await mkdir(segDir, { recursive: true });
  const rendered = await renderCaptions(capDir, config.captions, options.culture, { layout: options.layout, settings, cover });
  const caps = rendered.files;
  problems.push(...rendered.problems);
  let endcardPng = options.endcardImage;
  if (!endcardPng) {
    const card = await renderEndcard(capDir, config.endcard, options.culture, { layout: options.layout, settings });
    endcardPng = card.file;
    problems.push(...card.problems);
    if (!exact) console.table(card.report);
    for (const f of card.fits) console.log(`end card ${f.line} shrunk from ${f.from}px to ${f.fontSize}px to fit`);
  }
  console.table(rendered.report);
  console.log(`fonts that drew the glyphs: * = Inter from wwwroot/fonts (embedded), other names are the system font; interRequired ${exact ? "n/a (exact layout, system font by design)" : settings.interRequired}`);
  await buildRawScene(options.tools, options.raw, caps, segDir);
  await buildScheduleScene(options.tools, options.schedule, caps, segDir);
  await buildTakeScene(options.tools, options.take, caps, segDir, take);
  await buildOutroAndEndcard(options.tools, options.raw, endcardPng, segDir);
  const outBase = path.join(options.outDir, `${OUTPUT_PREFIX}${options.culture}`);
  await muxFinal(options.tools, options.raw, segDir, workDir, outBase);
  const rows = [];
  for (const ext of [EXT_MP4, EXT_WEBM, EXT_POSTER]) {
    const file = `${outBase}${ext}`;
    rows.push({ file, kb: Math.round((await stat(file)).size / BYTES_PER_KB), seconds: ext === EXT_POSTER ? "-" : (await durationOf(options.tools, file)).toFixed(DECIMALS) });
  }
  console.table(rows);
  console.log(`expected length of the German live cut: ${EXPECTED_SECONDS} s; end card: ${endcardPng}`);
  for (const problem of problems) console.error(`! ${options.culture}: ${problem}`);
  if (problems.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
