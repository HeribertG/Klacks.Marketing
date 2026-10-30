// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds a "take inset" story video of the simple start page for one culture in the recipe of a recipe module (default
 * weekplan-recipe.mjs, story video 2 "Wochenplanung"): renders the captions and the end card, cuts the Veo clip, insets the
 * live take <TAKE_PREFIX><culture> over a blurred Veo still, covers the model row, the "autonomous" switch and the greeting
 * bubble (hidden, or re-written for cultures in GREETING_REPLACEMENTS), adds the morning scene and the end card and writes
 * <OUTPUT_PREFIX><culture>.mp4 / .webm / .webp. The Veo sound (it carries speech) is never used: quiet background music
 * (default music/local-forecast-elevator.mp3, CC BY 3.0, credit in its LICENSE file) plays only while the app take with
 * Klacksy is on screen, faded in and out; the comic scenes and the end card stay silent. --silent writes no audio track. Panel side (left for RTL), panel
 * open/close and the greeting window are measured on the take's pixels, so a re-recorded take needs no new numbers. Steps
 * run one after another (low RAM). Every story-specific constant lives in the recipe module; the builder only reads it.
 * CLI: --culture <code> --raw <Veo clip of the variant> --out-dir <dir> [--recipe <recipe module>] [--variant <name>]
 *      [--take <file>] [--captions <file>] [--work-dir <dir>] [--music <file> | --silent] [--ffmpeg <path>] [--ffprobe <path>]; --culture <code>
 *      --detect-only prints the measured panel and greeting window of the take without encoding
 * @param recipe - recipe module (path relative to the working directory), default tools/story-video/weekplan-recipe.mjs; it must
 *        export VARIANTS, variantFor, rawSceneSeconds, morningSceneSeconds, captionWindows, CROSSFADES, ENDCARD_SECONDS,
 *        TAKE_LAYOUT, GREETING_REPLACEMENTS, ALL_CAPTION_KEYS, MORNING_KEY, OUTPUT_PREFIX, TAKE_PREFIX, CAPTIONS_PREFIX,
 *        and VIDEO_FPS (the build stops with a list of the missing ones); optional COVER_GREETING
 *        (default true): false keeps the app greeting visible (the take was recorded with the story's user name)
 * @param culture - any of the cultures with a <CAPTIONS_PREFIX><culture>.json; the end card texts come from captions.<culture>.json
 * @param variant - default from variantFor(culture); in weekplan-recipe.mjs headscarf for ar, id, ms (clip
 *        gemini_generated_video_16a58156.mp4, short story), standard otherwise (clip gemini_generated_video_d838e9c0.mp4)
 * @param music - licensed music file laid quietly under the app take only, default music/local-forecast-elevator.mp3
 * @param take - default tools/story-video/source-clips/takes/<TAKE_PREFIX><culture>.mp4 (the recorded app take; not served)
 * Exit code 1 when a check fails (caption over two lines, glyphs not in the font, reading speed, panel or greeting not found);
 * the video is still written so the frames can be inspected.
 */

import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";
import { findCaptionsFile, findProfile, normalizeCulture, renderSettings } from "./culture-profile.mjs";
import { renderCaptions, renderEndcard } from "./render-overlays.mjs";
import { FINAL_CODEC, POSTER_CODEC, SEGMENT_CODEC, WEBM_CODEC } from "./story-recipe.mjs";

const run = promisify(execFile);
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RECIPE = "weekplan-recipe.mjs";
const RECIPE_EXPORTS = Object.freeze(["ALL_CAPTION_KEYS", "CAPTIONS_PREFIX", "CROSSFADES", "ENDCARD_SECONDS", "GREETING_REPLACEMENTS", "MORNING_KEY",
  "OUTPUT_PREFIX", "TAKE_LAYOUT", "TAKE_PREFIX", "VARIANTS", "VIDEO_FPS", "captionWindows", "morningSceneSeconds", "rawSceneSeconds", "variantFor"]);
const CLI_OPTIONS = Object.freeze({
  culture: { type: "string" }, raw: { type: "string" }, "out-dir": { type: "string" }, take: { type: "string" }, recipe: { type: "string" },
  captions: { type: "string" }, "work-dir": { type: "string" }, music: { type: "string" }, silent: { type: "boolean" }, variant: { type: "string" }, "detect-only": { type: "boolean" }, ffmpeg: { type: "string" }, ffprobe: { type: "string" },
});
const { values: cli } = parseArgs({ options: CLI_OPTIONS });
const recipe = await import(pathToFileURL(cli.recipe ? path.resolve(cli.recipe) : path.join(toolDir, DEFAULT_RECIPE)).href);
const absent = RECIPE_EXPORTS.filter((name) => recipe[name] === undefined);
if (absent.length > 0) throw new Error(`recipe module lacks export(s): ${absent.join(", ")}`);
const {
  ALL_CAPTION_KEYS,
  CAPTIONS_PREFIX,
  CROSSFADES,
  ENDCARD_SECONDS,
  GREETING_REPLACEMENTS,
  MORNING_KEY,
  OUTPUT_PREFIX,
  TAKE_LAYOUT,
  TAKE_PREFIX,
  VARIANTS,
  VIDEO_FPS,
  captionWindows,
  morningSceneSeconds,
  rawSceneSeconds,
  variantFor,
} = recipe;
const MAX_BUFFER_BYTES = 1 << 30;
const MS_PER_SECOND = 1000;
const MUSIC = Object.freeze({ file: "music/local-forecast-elevator.mp3", volume: 0.18, fadeInSeconds: 0.5, fadeOutSeconds: 2.5, sampleRate: 48000 });
const DECIMALS = 3;
const BYTES_RGB = 3;
const PROBE_ROWS = 2;
const PANEL_GAP_MERGE_SECONDS = 0.5;
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
const PIX_RGB = "rgb24";
const PIX_GRAY = "gray";
const FILES = Object.freeze({ raw: "a.mp4", take: "b.mp4", morning: "c.mp4", endcard: "e.mp4", still: "bg.png" });
const EXT = Object.freeze({ mp4: ".mp4", webm: ".webm", poster: ".webp", json: ".json" });

const num = (value) => String(Number(value.toFixed(DECIMALS)));
const segmentEncode = () => ["-c:v", SEGMENT_CODEC.codec, "-crf", String(SEGMENT_CODEC.crf), "-preset", SEGMENT_CODEC.preset, "-pix_fmt", SEGMENT_CODEC.pixFmt, "-r", String(VIDEO_FPS), "-an"];

function readOptions() {
  const values = cli;
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
    take: path.resolve(values.take ?? path.join(toolDir, "source-clips", "takes", `${TAKE_PREFIX}${culture}${EXT.mp4}`)),
    captionsFile: values.captions ? path.resolve(values.captions) : path.join(toolDir, `${CAPTIONS_PREFIX}${culture}${EXT.json}`),
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
  return { x: rightSide ? L.width - L.panelWidth : 0, openAt: first / fps, closeAt: (last + 1) / fps, intervals: openIntervals(open, fps), side: rightSide ? "right" : "left" };
}

/** Time ranges in which the panel is open; a gap shorter than PANEL_GAP_MERGE_SECONDS (slide animation) does not split a range. */
function openIntervals(open, fps) {
  const intervals = [];
  open.forEach((isOpen, i) => {
    if (!isOpen) return;
    const last = intervals.at(-1);
    if (last && i / fps - last[1] < PANEL_GAP_MERGE_SECONDS) last[1] = (i + 1) / fps;
    else intervals.push([i / fps, (i + 1) / fps]);
  });
  return intervals;
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
  const panelWindow = panel.intervals.map(([from, until]) => `between(t,${num(from)},${num(until)})`).join("+");
  const filters = [`fps=${VIDEO_FPS}`,
    `drawbox=x=${panel.x}:y=${L.settingsRows.y}:w=${L.panelWidth}:h=${L.settingsRows.height}:color=${L.coverColor}:t=fill:enable='${panelWindow}'`];
  if (!greeting) {
    return filters.join(",");
  }
  const greetWindow = `between(t,${num(greeting.fromAt)},${num(greeting.endAt)})`;
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

async function mux(tools, seg, outBase) {
  const [dA, dB, dC] = [await durationOf(tools, seg.raw), await durationOf(tools, seg.take), await durationOf(tools, seg.morning)];
  const x = CROSSFADES;
  const oB = dA - x.toTake, oC = oB + dB - x.toMorning, oE = oC + dC - x.toEndcard, total = oE + ENDCARD_SECONDS;
  const graph = [
    `[0:v][1:v]xfade=transition=fade:duration=${x.toTake}:offset=${num(oB)}[ab]`,
    `[ab][2:v]xfade=transition=fade:duration=${x.toMorning}:offset=${num(oC)}[abc]`,
    `[abc][3:v]xfade=transition=fadewhite:duration=${x.toEndcard}:offset=${num(oE)},format=yuv420p[v]`,
  ];
  const inputs = ["-i", seg.raw, "-i", seg.take, "-i", seg.morning, "-i", seg.endcard];
  const f = FINAL_CODEC;
  const music = cli.silent ? null : cli.music ? path.resolve(cli.music) : path.join(toolDir, MUSIC.file);
  let audio = ["-an"];
  if (music) {
    inputs.push("-stream_loop", "-1", "-i", music);
    const delayMs = Math.round(oB * MS_PER_SECOND);
    graph.push(`[4:a]aformat=channel_layouts=stereo,aresample=${MUSIC.sampleRate},volume=${MUSIC.volume},atrim=0:${num(dB)},afade=t=in:d=${MUSIC.fadeInSeconds},afade=t=out:st=${num(dB - MUSIC.fadeOutSeconds)}:d=${MUSIC.fadeOutSeconds},adelay=${delayMs}|${delayMs},apad=whole_dur=${num(total)},atrim=0:${num(total)}[a]`);
    audio = ["-map", "[a]", "-c:a", f.audioCodec, "-b:a", f.audioBitrate];
  }
  const mp4 = `${outBase}${EXT.mp4}`;
  await ffmpeg(tools, [...inputs, "-filter_complex", graph.join(";"), "-map", "[v]", ...audio,
    "-c:v", f.codec, "-crf", String(f.crf), "-preset", f.preset, "-pix_fmt", f.pixFmt, "-movflags", "+faststart", mp4]);
  const w = WEBM_CODEC;
  const webmAudio = music ? ["-c:a", w.audioCodec, "-b:a", w.audioBitrate] : ["-an"];
  await ffmpeg(tools, ["-i", mp4, "-c:v", w.codec, "-crf", String(w.crf), "-b:v", "0", "-row-mt", "1", ...webmAudio, `${outBase}${EXT.webm}`]);
  const p = POSTER_CODEC;
  await ffmpeg(tools, ["-i", mp4, "-frames:v", "1", "-c:v", p.codec, "-quality", String(p.quality), "-compression_level", String(p.compressionLevel), `${outBase}${EXT.poster}`]);
  return { total, offsets: { take: oB, morning: oC, endcard: oE } };
}

async function detectTake(o) {
  const fps = await frameRateOf(o.tools, o.take);
  const panel = await detectPanel(o.tools, o.take, fps);
  const coverGreeting = recipe.COVER_GREETING ?? true;
  const greeting = coverGreeting ? await detectGreeting(o.tools, o.take, fps, panel) : null;
  const coverColor = coverGreeting ? await chatBackground(o.tools, o.take, panel, greeting) : null;
  const greetingNote = coverGreeting ? `greeting cover h=${greeting.height} ${num(greeting.fromAt)}-${num(greeting.endAt)} s, colour ${coverColor}` : "greeting kept";
  const openRanges = panel.intervals.map(([from, until]) => `${num(from)}-${num(until)}`).join(", ");
  console.log(`take ${path.basename(o.take)}: panel ${panel.side} x=${panel.x} open ${openRanges} s; ${greetingNote}`);
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
  const morningRaw = o.variant.morningClip ? path.join(path.dirname(o.raw), o.variant.morningClip) : o.raw;
  await buildMorning(o.tools, morningRaw, o.variant, caps.files[MORNING_KEY], windows[MORNING_KEY], seg.morning);
  await ffmpeg(o.tools, ["-loop", "1", "-framerate", String(VIDEO_FPS), "-t", String(ENDCARD_SECONDS), "-i", card.file, "-vf", "scale=1280:720,format=yuv420p", ...segmentEncode(), seg.endcard]);

  await mkdir(o.outDir, { recursive: true });
  const result = await mux(o.tools, seg, path.join(o.outDir, `${OUTPUT_PREFIX}${o.culture}`));
  console.log(`${OUTPUT_PREFIX}${o.culture} (${o.variantName}): ${num(result.total)} s (take from ${num(result.offsets.take)} s, morning from ${num(result.offsets.morning)} s, end card from ${num(result.offsets.endcard)} s)`);
  if (problems.length > 0) {
    for (const p of problems) console.error(`! ${p}`);
    process.exitCode = 1;
  }
}

await main();
