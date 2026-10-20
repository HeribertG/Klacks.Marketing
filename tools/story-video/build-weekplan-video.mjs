// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds story video 2 "Wochenplanung" of the simple start page for one culture in the recipe of weekplan-recipe.mjs: renders
 * the captions and the end card, cuts the Veo clip, insets the live take simple-plans-week-<culture> over a blurred Veo still,
 * covers the model row, the "autonomous" switch and the greeting bubble (hidden, or re-written for cultures in
 * GREETING_REPLACEMENTS), adds the morning scene and the end card, mixes the Veo sound with a pink-noise bed and writes
 * simple-story-weekplan-<culture>.mp4 / .webm / .webp. Panel side (left for RTL), panel open/close and the greeting window are
 * measured on the take's pixels, so a re-recorded take needs no new numbers. Steps run one after another (low RAM).
 * CLI: --culture <code> --raw <Veo clip of the variant> --out-dir <dir> [--variant standard|headscarf] [--take <file>]
 *      [--captions <file>] [--work-dir <dir>] [--ffmpeg <path>] [--ffprobe <path>]; --culture <code> --detect-only prints the
 *      measured panel and greeting window of the take without encoding
 * @param culture - any of the cultures with a weekplan-captions.<culture>.json; the end card texts come from captions.<culture>.json
 * @param variant - default from the culture: headscarf for ar, id, ms (clip gemini_generated_video_16a58156.mp4, short story),
 *        standard otherwise (clip gemini_generated_video_d838e9c0.mp4); see VARIANTS in weekplan-recipe.mjs
 * @param take - default wwwroot/videos/simple-plans-week-<culture>.mp4 of this repository
 * Exit code 1 when a check fails (caption over two lines, glyphs not in the font, reading speed, panel or greeting not found);
 * the video is still written so the frames can be inspected.
 */

import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { findCaptionsFile, findProfile, normalizeCulture, renderSettings } from "./culture-profile.mjs";
import { renderCaptions, renderEndcard } from "./render-overlays.mjs";
import { FINAL_CODEC, POSTER_CODEC, SEGMENT_CODEC, WEBM_CODEC } from "./story-recipe.mjs";
import {
  ALL_CAPTION_KEYS,
  AUDIO_FADE_SECONDS,
  CROSSFADES,
  ENDCARD_SECONDS,
  GREETING_REPLACEMENTS,
  NOISE,
  OUTPUT_PREFIX,
  TAKE_LAYOUT,
  VARIANTS,
  VIDEO_FPS,
  captionWindows,
  morningSceneSeconds,
  rawSceneSeconds,
  variantFor,
} from "./weekplan-recipe.mjs";

const run = promisify(execFile);
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(toolDir, "..", "..");
const MAX_BUFFER_BYTES = 1 << 30;
const DECIMALS = 3;
const BYTES_RGB = 3;
const PROBE_ROWS = 2;
const TEAL = Object.freeze({ minGreenOverRed: 40, minBlueOverRed: 30, maxGreen: 200 });
const BACKGROUND_TOLERANCE = 12;
const CONTENT_PIXELS_PER_ROW = 3;
const GAP_ROWS = 10;
const BACKGROUND_ROWS = 3;
const SCAN_INSET = 8;
const GREETING_SCAN_HEIGHT = 300;
const GREETING_PAD = 6;
const REFERENCE_AFTER_OPEN = 1.0;
const GREETING_DIFF_THRESHOLD = 8;
const DUMMY_CAPTION = "-";
const DUMMY_KEYS = Object.freeze(["y1", "y2"]);
const MORNING_KEY = "x1";
const PIX_RGB = "rgb24";
const PIX_GRAY = "gray";
const FILES = Object.freeze({ raw: "a.mp4", take: "b.mp4", morning: "c.mp4", endcard: "e.mp4", still: "bg.png" });
const EXT = Object.freeze({ mp4: ".mp4", webm: ".webm", poster: ".webp" });

const num = (value) => String(Number(value.toFixed(DECIMALS)));
const segmentEncode = () => ["-c:v", SEGMENT_CODEC.codec, "-crf", String(SEGMENT_CODEC.crf), "-preset", SEGMENT_CODEC.preset, "-pix_fmt", SEGMENT_CODEC.pixFmt, "-r", String(VIDEO_FPS), "-an"];

function readOptions() {
  const { values } = parseArgs({
    options: {
      culture: { type: "string" }, raw: { type: "string" }, "out-dir": { type: "string" }, take: { type: "string" },
      captions: { type: "string" }, "work-dir": { type: "string" }, variant: { type: "string" }, "detect-only": { type: "boolean" }, ffmpeg: { type: "string" }, ffprobe: { type: "string" },
    },
  });
  const detectOnly = values["detect-only"] === true;
  const missing = (detectOnly ? ["culture"] : ["culture", "raw", "out-dir"]).filter((k) => !values[k]);
  if (missing.length > 0) throw new Error(`missing option(s): ${missing.map((k) => `--${k}`).join(", ")}`);
  const culture = normalizeCulture(values.culture);
  const outDir = path.resolve(values["out-dir"] ?? ".");
  const variantName = values.variant ?? variantFor(culture);
  if (!VARIANTS[variantName]) throw new Error(`--variant must be one of ${Object.keys(VARIANTS).join(", ")}`);
  return {
    culture,
    detectOnly,
    variantName,
    variant: VARIANTS[variantName],
    raw: values.raw ? path.resolve(values.raw) : null,
    outDir,
    take: path.resolve(values.take ?? path.join(repoDir, "wwwroot", "videos", `simple-plans-week-${culture}${EXT.mp4}`)),
    captionsFile: values.captions ? path.resolve(values.captions) : path.join(toolDir, `weekplan-captions.${culture}.json`),
    workDir: path.resolve(values["work-dir"] ?? path.join(outDir, `work-weekplan-${culture}`)),
    tools: { ffmpeg: values.ffmpeg ?? process.env.FFMPEG_PATH ?? "ffmpeg", ffprobe: values.ffprobe ?? process.env.FFPROBE_PATH ?? "ffprobe" },
  };
}

async function ffmpeg(tools, args) {
  await run(tools.ffmpeg, ["-v", "error", "-y", ...args], { maxBuffer: MAX_BUFFER_BYTES });
}

async function durationOf(tools, file) {
  const { stdout } = await run(tools.ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(stdout.trim());
}

async function frameRateOf(tools, file) {
  const { stdout } = await run(tools.ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", file]);
  const [n, d] = stdout.trim().split("/").map(Number);
  return n / (d || 1);
}

async function rawFrames(tools, file, pixFmt, filter, frameBytes, extraInput = []) {
  const { stdout } = await run(tools.ffmpeg, ["-v", "error", ...extraInput, "-i", file, "-vf", `format=${pixFmt},${filter}`, "-f", "rawvideo", "-pix_fmt", pixFmt, "-"],
    { encoding: "buffer", maxBuffer: MAX_BUFFER_BYTES });
  const frames = [];
  for (let i = 0; i + frameBytes <= stdout.length; i += frameBytes) frames.push(stdout.subarray(i, i + frameBytes));
  return frames;
}

function isTeal(frame, x) {
  const r = frame[x * BYTES_RGB], g = frame[x * BYTES_RGB + 1], b = frame[x * BYTES_RGB + 2];
  return g > r + TEAL.minGreenOverRed && b > r + TEAL.minBlueOverRed && g < TEAL.maxGreen;
}

async function detectPanel(tools, take, fps) {
  const L = TAKE_LAYOUT;
  const rows = await rawFrames(tools, take, PIX_RGB, `crop=${L.width}:${PROBE_ROWS}:0:${L.panelProbeY - 1}`, L.width * PROBE_ROWS * BYTES_RGB);
  const right = rows.map((f) => isTeal(f, L.panelProbeXRight));
  const left = rows.map((f) => isTeal(f, L.panelProbeXLeft));
  const rightSide = right.filter(Boolean).length >= left.filter(Boolean).length;
  const open = rightSide ? right : left;
  const first = open.indexOf(true);
  const last = open.lastIndexOf(true);
  if (first < 0) throw new Error(`${take}: assistant panel not found`);
  return { x: rightSide ? L.width - L.panelWidth : 0, openAt: first / fps, closeAt: (last + 1) / fps, side: rightSide ? "right" : "left" };
}

function greetingBottom(columnFrame, width, height) {
  const counts = new Map();
  for (const v of columnFrame.subarray(0, width * BACKGROUND_ROWS)) counts.set(v, (counts.get(v) ?? 0) + 1);
  const background = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  let lastContent = -1;
  let gap = 0;
  for (let y = 0; y < height; y += 1) {
    const row = columnFrame.subarray(y * width, (y + 1) * width);
    let content = 0;
    for (const v of row) if (Math.abs(v - background) > BACKGROUND_TOLERANCE) content += 1;
    if (content > CONTENT_PIXELS_PER_ROW) { lastContent = y; gap = 0; } else if (lastContent >= 0 && (gap += 1) >= GAP_ROWS) break;
  }
  return lastContent;
}

async function detectGreeting(tools, take, fps, panel) {
  const L = TAKE_LAYOUT;
  const width = L.panelWidth - 1;
  const scanWidth = width - 2 * SCAN_INSET;
  const referenceAt = panel.openAt + REFERENCE_AFTER_OPEN;
  const [column] = await rawFrames(tools, take, PIX_GRAY, `crop=${scanWidth}:${GREETING_SCAN_HEIGHT}:${panel.x + SCAN_INSET}:${L.greeting.y}`, scanWidth * GREETING_SCAN_HEIGHT, ["-ss", num(referenceAt)]);
  const bottom = greetingBottom(column, scanWidth, GREETING_SCAN_HEIGHT);
  if (bottom < 0) throw new Error(`${take}: greeting bubble not found at ${num(referenceAt)} s`);
  const height = Math.min(L.greeting.height, bottom + GREETING_PAD);
  const p = L.greetingProbe;
  const frames = await rawFrames(tools, take, PIX_GRAY, `crop=${width}:${height}:${panel.x}:${L.greeting.y},scale=${p.width}:${p.height}`, p.width * p.height);
  const ref = frames[Math.round(referenceAt * fps)];
  let endAt = panel.closeAt;
  for (let i = Math.round(referenceAt * fps) + 1; i < frames.length; i += 1) {
    let diff = 0;
    for (let k = 0; k < ref.length; k += 1) diff += Math.abs(frames[i][k] - ref[k]);
    if (diff / ref.length > GREETING_DIFF_THRESHOLD) { endAt = i / fps; break; }
  }
  return { height, fromAt: panel.openAt, endAt };
}

function drawtextLines(replacement, offsetX, enable) {
  return replacement.lines.map((line) => `drawtext=fontfile='${replacement.font}':fontsize=${replacement.fontSize}:fontcolor=${replacement.fontColor}:text='${line.text}':x=${line.x + offsetX}:y=${line.y}:enable='${enable}'`);
}

function takeFilter(panel, greeting, replacement, coverColor) {
  const L = TAKE_LAYOUT;
  const panelWindow = `between(t,${num(panel.openAt)},${num(panel.closeAt)})`;
  const greetWindow = `between(t,${num(greeting.fromAt)},${num(greeting.endAt)})`;
  const filters = [`fps=${VIDEO_FPS}`,
    `drawbox=x=${panel.x}:y=${L.settingsRows.y}:w=${L.panelWidth}:h=${L.settingsRows.height}:color=${L.coverColor}:t=fill:enable='${panelWindow}'`];
  if (replacement) {
    const b = replacement.box;
    filters.push(`drawbox=x=${b.x}:y=${b.y}:w=${b.width}:h=${b.height}:color=${L.coverColor}:t=fill:enable='${greetWindow}'`);
    filters.push(...drawtextLines(replacement, 0, greetWindow));
  } else {
    filters.push(`drawbox=x=${panel.x}:y=${L.greeting.y}:w=${L.panelWidth}:h=${greeting.height}:color=${coverColor}:t=fill:enable='${greetWindow}'`);
  }
  return filters.join(",");
}

async function chatBackground(tools, take, panel, greeting) {
  const at = panel.openAt + REFERENCE_AFTER_OPEN;
  const y = TAKE_LAYOUT.greeting.y + greeting.height + 2;
  const x = panel.x + Math.round(TAKE_LAYOUT.panelWidth / 2);
  const [frame] = await rawFrames(tools, take, PIX_RGB, `crop=2:2:${x}:${y}`, 2 * 2 * BYTES_RGB, ["-ss", num(at)]);
  const hex = (v) => v.toString(16).padStart(2, "0");
  return `0x${hex(frame[0])}${hex(frame[1])}${hex(frame[2])}`;
}

async function buildRaw(tools, raw, variant, caps, windows, file) {
  const parts = variant.rawParts;
  const keys = variant.captionKeys.filter((k) => k !== MORNING_KEY);
  const chain = [`[0:v]fps=${VIDEO_FPS},scale=1280:720,split=${parts.length}${parts.map((_, i) => `[s${i}]`).join("")}`,
    ...parts.map((p, i) => `[s${i}]trim=${p.from}:${p.to},setpts=(PTS-STARTPTS)/${p.speed},fps=${VIDEO_FPS}[p${i}]`),
    `${parts.map((_, i) => `[p${i}]`).join("")}concat=n=${parts.length}:v=1:a=0[v0]`];
  keys.forEach((k, i) => chain.push(`[v${i}][${i + 1}:v]overlay=0:0:enable='between(t,${windows[k][0]},${windows[k][1]})'[v${i + 1}]`));
  await ffmpeg(tools, ["-i", raw, ...keys.flatMap((k) => ["-i", caps[k]]), "-filter_complex", chain.join(";"), "-map", `[v${keys.length}]`, ...segmentEncode(), file]);
}

async function buildTake(tools, take, still, filter, file) {
  const L = TAKE_LAYOUT;
  const seconds = await durationOf(tools, take);
  const chain = [`[1:v]scale=1280:720,boxblur=${L.backgroundBlur},eq=brightness=${L.backgroundBrightness}[bg]`, `[0:v]${filter}[t]`, `[bg][t]overlay=${L.insetX}:0:shortest=1,format=yuv420p[v]`];
  await ffmpeg(tools, ["-i", take, "-loop", "1", "-framerate", String(VIDEO_FPS), "-t", num(seconds), "-i", still, "-filter_complex", chain.join(";"), "-map", "[v]", ...segmentEncode(), file]);
}

async function buildMorning(tools, raw, variant, caption, window, file) {
  const m = variant.morning;
  await ffmpeg(tools, ["-i", raw, "-i", caption, "-filter_complex",
    `[0:v]trim=${m.from}:${m.to},setpts=(PTS-STARTPTS)/${m.speed},fps=${VIDEO_FPS},scale=1280:720[c];[c][1:v]overlay=0:0:enable='between(t,${window[0]},${window[1]})'[v]`,
    "-map", "[v]", ...segmentEncode(), file]);
}

async function mux(tools, variant, seg, raw, outBase) {
  const [dA, dB, dC] = [await durationOf(tools, seg.raw), await durationOf(tools, seg.take), await durationOf(tools, seg.morning)];
  const x = CROSSFADES;
  const oB = dA - x.toTake, oC = oB + dB - x.toMorning, oE = oC + dC - x.toEndcard, total = oE + ENDCARD_SECONDS;
  const morning = morningSceneSeconds(variant);
  const rawSeconds = rawSceneSeconds(variant);
  const ms = (s) => Math.round(s * 1000);
  const a = AUDIO_FADE_SECONDS;
  const parts = variant.rawParts;
  const m = variant.morning;
  const graph = [
    `[0:v][1:v]xfade=transition=fade:duration=${x.toTake}:offset=${num(oB)}[ab]`,
    `[ab][2:v]xfade=transition=fade:duration=${x.toMorning}:offset=${num(oC)}[abc]`,
    `[abc][3:v]xfade=transition=fadewhite:duration=${x.toEndcard}:offset=${num(oE)},format=yuv420p[v]`,
    `[4:a]aformat=channel_layouts=stereo,aresample=${NOISE.sampleRate},asplit=${parts.length + 1}${parts.map((_, i) => `[r${i}]`).join("")}[rm]`,
    ...parts.map((p, i) => `[r${i}]atrim=${p.from}:${p.to},asetpts=PTS-STARTPTS,atempo=${p.speed}[q${i}]`),
    `${parts.map((_, i) => `[q${i}]`).join("")}concat=n=${parts.length}:v=0:a=1,afade=t=out:st=${num(rawSeconds - a.rawOut)}:d=${a.rawOut}[aa]`,
    `[rm]atrim=${m.from}:${m.to},asetpts=PTS-STARTPTS,atempo=${m.speed},afade=t=in:d=${a.morningIn},afade=t=out:st=${num(morning - a.morningOut)}:d=${a.morningOut},adelay=${ms(oC)}|${ms(oC)}[ac]`,
    `anoisesrc=color=${NOISE.color}:amplitude=${NOISE.amplitude}:sample_rate=${NOISE.sampleRate}:seed=${NOISE.seed},lowpass=f=${NOISE.lowpassHz},aformat=channel_layouts=stereo,atrim=0:${num(total)},afade=t=out:st=${num(total - NOISE.fadeOutSeconds)}:d=${NOISE.fadeOutSeconds}[bed]`,
    `[aa][ac][bed]amix=inputs=3:normalize=0:duration=longest,atrim=0:${num(total)}[a]`,
  ];
  const f = FINAL_CODEC;
  const mp4 = `${outBase}${EXT.mp4}`;
  await ffmpeg(tools, ["-i", seg.raw, "-i", seg.take, "-i", seg.morning, "-i", seg.endcard, "-i", raw, "-filter_complex", graph.join(";"), "-map", "[v]", "-map", "[a]",
    "-c:v", f.codec, "-crf", String(f.crf), "-preset", f.preset, "-pix_fmt", f.pixFmt, "-c:a", f.audioCodec, "-b:a", f.audioBitrate, "-movflags", "+faststart", mp4]);
  const w = WEBM_CODEC;
  await ffmpeg(tools, ["-i", mp4, "-c:v", w.codec, "-crf", String(w.crf), "-b:v", "0", "-row-mt", "1", "-c:a", w.audioCodec, "-b:a", w.audioBitrate, `${outBase}${EXT.webm}`]);
  const p = POSTER_CODEC;
  await ffmpeg(tools, ["-i", mp4, "-frames:v", "1", "-c:v", p.codec, "-quality", String(p.quality), "-compression_level", String(p.compressionLevel), `${outBase}${EXT.poster}`]);
  return { total, offsets: { take: oB, morning: oC, endcard: oE } };
}

async function detectTake(o) {
  const fps = await frameRateOf(o.tools, o.take);
  const panel = await detectPanel(o.tools, o.take, fps);
  const greeting = await detectGreeting(o.tools, o.take, fps, panel);
  const coverColor = await chatBackground(o.tools, o.take, panel, greeting);
  console.log(`take ${path.basename(o.take)}: panel ${panel.side} x=${panel.x} open ${num(panel.openAt)}-${num(panel.closeAt)} s; greeting cover h=${greeting.height} ${num(greeting.fromAt)}-${num(greeting.endAt)} s, colour ${coverColor}`);
  return { panel, greeting, coverColor };
}

async function main() {
  const o = readOptions();
  if (o.detectOnly) {
    await detectTake(o);
    return;
  }
  const problems = [];
  const config = JSON.parse(await readFile(o.captionsFile, "utf8"));
  const storyFile = await findCaptionsFile(o.culture);
  if (!storyFile) throw new Error(`no captions.${o.culture}.json for the end card`);
  const endcard = JSON.parse(await readFile(storyFile, "utf8")).endcard;
  const keys = o.variant.captionKeys;
  const missing = keys.filter((k) => !config.captions?.[k]);
  if (missing.length > 0) throw new Error(`${o.captionsFile}: missing ${missing.join(", ")}`);
  const overlayDir = path.join(o.workDir, "overlays");
  const segDir = path.join(o.workDir, "segments");
  await mkdir(overlayDir, { recursive: true });
  await mkdir(segDir, { recursive: true });

  const profile = await findProfile(o.culture);
  const settings = renderSettings(profile);
  const unused = [...ALL_CAPTION_KEYS.filter((k) => !keys.includes(k)), ...DUMMY_KEYS];
  const rendered = Object.fromEntries([...keys.map((k) => [k, config.captions[k]]), ...unused.map((k) => [k, DUMMY_CAPTION])]);
  const caps = await renderCaptions(overlayDir, rendered, o.culture, { settings });
  problems.push(...caps.problems.filter((p) => !unused.some((k) => p.startsWith(`${k}:`))));
  const card = await renderEndcard(overlayDir, endcard, o.culture, { settings });
  problems.push(...card.problems);

  const windows = captionWindows(o.variant);
  const speed = keys.map((k) => {
    const chars = [...config.captions[k]].length;
    const seconds = windows[k][1] - windows[k][0];
    return { key: k, chars, seconds: Number(seconds.toFixed(2)), cps: Number((chars / seconds).toFixed(1)) };
  });
  console.table(speed);
  for (const row of speed.filter((r) => r.cps > settings.maxCharsPerSecond)) problems.push(`${row.key}: ${row.cps} chars/s over ${settings.maxCharsPerSecond}`);

  const { panel, greeting, coverColor } = await detectTake(o);

  const seg = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, path.join(segDir, f)]));
  await ffmpeg(o.tools, ["-ss", num(o.variant.backgroundStillAt), "-i", o.raw, "-frames:v", "1", seg.still]);
  await buildRaw(o.tools, o.raw, o.variant, caps.files, windows, seg.raw);
  await buildTake(o.tools, o.take, seg.still, takeFilter(panel, greeting, GREETING_REPLACEMENTS[o.culture], coverColor), seg.take);
  await buildMorning(o.tools, o.raw, o.variant, caps.files[MORNING_KEY], windows[MORNING_KEY], seg.morning);
  await ffmpeg(o.tools, ["-loop", "1", "-framerate", String(VIDEO_FPS), "-t", String(ENDCARD_SECONDS), "-i", card.file, "-vf", "scale=1280:720,format=yuv420p", ...segmentEncode(), seg.endcard]);

  await mkdir(o.outDir, { recursive: true });
  const result = await mux(o.tools, o.variant, seg, o.raw, path.join(o.outDir, `${OUTPUT_PREFIX}${o.culture}`));
  console.log(`${OUTPUT_PREFIX}${o.culture} (${o.variantName}): ${num(result.total)} s (take from ${num(result.offsets.take)} s, morning from ${num(result.offsets.morning)} s, end card from ${num(result.offsets.endcard)} s)`);
  if (problems.length > 0) {
    for (const p of problems) console.error(`! ${p}`);
    process.exitCode = 1;
  }
}

await main();
