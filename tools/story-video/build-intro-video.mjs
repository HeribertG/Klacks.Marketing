// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the "Klacksy stellt sich vor" clip of the simple start page for one culture (recipe of the owner-approved German
 * rough cut v9): five scenes of the chroma-keyed Klacksy (Veo clips on magenta) over the app screenshots of the culture
 * (schedule grid, timeline, absence Gantt, schedule and timeline details), one approved sentence per scene, cross-fades and
 * the end card "Rede mit Klacksy". Silent (the page plays it muted in a loop). Writes simple-klacksy-intro-<culture>.mp4 /
 * .webm / .webp. Steps run one after another (low RAM).
 * CLI: --culture <code> --out-dir <dir> [--clips <dir with the Veo clips>] [--images <dir with app-*-<culture>.webp>]
 *      [--captions <file>] [--work-dir <dir>] [--ffmpeg <path>] [--ffprobe <path>]
 * @param culture - one of the 25 cultures; captions come from intro-captions.<culture>.json, the end card pill and link
 *        from captions.<culture>.json
 * @param clips - default tools/story-video/source-clips (gemini_generated_video_39a4f0ad.mp4, gemini_generated_video_eefd6d08.mp4)
 * Exit code 1 when a check fails (caption over two lines, glyphs not in the font, reading speed); the video is still written.
 */

import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { findCaptionsFile, findProfile, normalizeCulture, renderSettings } from "./culture-profile.mjs";
import { renderCaptions, renderEndcard } from "./render-overlays.mjs";
import { FINAL_CODEC, POSTER_CODEC, SEGMENT_CODEC, WEBM_CODEC } from "./story-recipe.mjs";

const run = promisify(execFile);
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(toolDir, "..", "..");
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const DECIMALS = 3;
const FPS = 30;
const FRAME = "1280:720";
const OUTPUT_PREFIX = "simple-klacksy-intro-";
const CAPTION_KEYS = Object.freeze(["k1", "k2", "k3", "k4", "x1"]);
const DUMMY_KEYS = Object.freeze(["y1", "y2"]);
const DUMMY_CAPTION = "-";
const CROSSFADE_SECONDS = 0.4;
const CAPTION_INSET_SECONDS = 0.35;
const ENDCARD_SECONDS = 3.5;
const POSTER_AT_SECONDS = 1.2;

const CLIPS = Object.freeze({
  wave: Object.freeze({ file: "gemini_generated_video_39a4f0ad.mp4", key: "0xF21AE1:0.30:0.06" }),
  gesture: Object.freeze({ file: "gemini_generated_video_eefd6d08.mp4", key: "0xF51FE7:0.33:0.05" }),
});

const BACKGROUNDS = Object.freeze({
  scheduleFull: Object.freeze({ image: "app-schedule", crop: "2400:1350:0:0" }),
  timelineFull: Object.freeze({ image: "app-timeline", crop: "2400:1350:0:0" }),
  ganttFull: Object.freeze({ image: "app-gantt", crop: "2400:1350:0:0" }),
  scheduleDetail: Object.freeze({ image: "app-schedule", crop: "1600:900:800:200" }),
  timelineDetail: Object.freeze({ image: "app-timeline", crop: "1700:956:700:300" }),
});

const SCENES = Object.freeze([
  Object.freeze({ caption: "k1", clip: "wave", from: 0, seconds: 5.6, speed: 1, background: "scheduleFull" }),
  Object.freeze({ caption: "k2", clip: "gesture", from: 11.8, seconds: 5.2, speed: 0.92, background: "timelineFull" }),
  Object.freeze({ caption: "k3", clip: "wave", from: 4.6, seconds: 5.4, speed: 1, background: "ganttFull" }),
  Object.freeze({ caption: "k4", clip: "gesture", from: 15.4, seconds: 4.5, speed: 0.88, background: "scheduleDetail" }),
  Object.freeze({ caption: "x1", clip: "gesture", from: 4.7, seconds: 6, speed: 1, background: "timelineDetail" }),
]);

const num = (value) => String(Number(value.toFixed(DECIMALS)));
const segmentEncode = () => ["-c:v", SEGMENT_CODEC.codec, "-crf", String(SEGMENT_CODEC.crf), "-preset", SEGMENT_CODEC.preset, "-pix_fmt", SEGMENT_CODEC.pixFmt, "-r", String(FPS), "-an"];
const sceneSeconds = (scene) => scene.seconds / scene.speed;

function readOptions() {
  const { values } = parseArgs({
    options: {
      culture: { type: "string" }, "out-dir": { type: "string" }, clips: { type: "string" }, images: { type: "string" },
      captions: { type: "string" }, "work-dir": { type: "string" }, ffmpeg: { type: "string" }, ffprobe: { type: "string" },
    },
  });
  const missing = ["culture", "out-dir"].filter((k) => !values[k]);
  if (missing.length > 0) throw new Error(`missing option(s): ${missing.map((k) => `--${k}`).join(", ")}`);
  const culture = normalizeCulture(values.culture);
  const outDir = path.resolve(values["out-dir"]);
  return {
    culture,
    outDir,
    clipsDir: path.resolve(values.clips ?? path.join(toolDir, "source-clips")),
    imagesDir: path.resolve(values.images ?? path.join(repoDir, "wwwroot", "images")),
    captionsFile: values.captions ? path.resolve(values.captions) : path.join(toolDir, `intro-captions.${culture}.json`),
    workDir: path.resolve(values["work-dir"] ?? path.join(outDir, `work-intro-${culture}`)),
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

async function buildBackground(o, name, file) {
  const b = BACKGROUNDS[name];
  const image = path.join(o.imagesDir, `${b.image}-${o.culture}.webp`);
  await ffmpeg(o.tools, ["-i", image, "-vf", `crop=${b.crop},scale=${FRAME}:flags=lanczos`, file]);
}

async function buildScene(o, scene, background, caption, file) {
  const clip = CLIPS[scene.clip];
  const seconds = sceneSeconds(scene);
  const window = `between(t,${num(CAPTION_INSET_SECONDS)},${num(seconds - CAPTION_INSET_SECONDS)})`;
  const chain = [
    `[1:v]trim=${scene.from}:${num(scene.from + scene.seconds)},setpts=(PTS-STARTPTS)/${scene.speed},fps=${FPS},scale=${FRAME},`
      + `format=rgba,colorkey=${clip.key},despill=type=blue:mix=0.8:expand=0[robot]`,
    `[0:v][robot]overlay=0:0:shortest=1[scene]`,
    `[scene][2:v]overlay=0:0:enable='${window}',format=yuv420p[v]`,
  ];
  await ffmpeg(o.tools, ["-loop", "1", "-framerate", String(FPS), "-t", num(seconds), "-i", background,
    "-i", path.join(o.clipsDir, clip.file), "-loop", "1", "-framerate", String(FPS), "-t", num(seconds), "-i", caption,
    "-filter_complex", chain.join(";"), "-map", "[v]", "-t", num(seconds), ...segmentEncode(), file]);
}

async function mux(o, files, endcard, outBase) {
  const durations = [];
  for (const f of files) durations.push(await durationOf(o.tools, f));
  const inputs = [...files, endcard];
  const graph = [];
  let offset = 0;
  let last = "0:v";
  for (let i = 1; i < inputs.length; i += 1) {
    offset += durations[i - 1] - CROSSFADE_SECONDS;
    const out = i === inputs.length - 1 ? "x" : `x${i}`;
    const transition = i === inputs.length - 1 ? "fadewhite" : "fade";
    graph.push(`[${last}][${i}:v]xfade=transition=${transition}:duration=${CROSSFADE_SECONDS}:offset=${num(offset)}[${out}]`);
    last = out;
  }
  graph.push("[x]format=yuv420p[v]");
  const f = FINAL_CODEC;
  const mp4 = `${outBase}.mp4`;
  await ffmpeg(o.tools, [...inputs.flatMap((file) => ["-i", file]), "-filter_complex", graph.join(";"), "-map", "[v]", "-an",
    "-c:v", f.codec, "-crf", String(f.crf), "-preset", f.preset, "-pix_fmt", f.pixFmt, "-profile:v", "high", "-movflags", "+faststart", mp4]);
  const w = WEBM_CODEC;
  await ffmpeg(o.tools, ["-i", mp4, "-c:v", w.codec, "-crf", String(w.crf), "-b:v", "0", "-row-mt", "1", "-an", `${outBase}.webm`]);
  const p = POSTER_CODEC;
  await ffmpeg(o.tools, ["-ss", num(POSTER_AT_SECONDS), "-i", mp4, "-frames:v", "1", "-c:v", p.codec, "-quality", String(p.quality), "-compression_level", String(p.compressionLevel), `${outBase}.webp`]);
  return offset + ENDCARD_SECONDS;
}

async function main() {
  const o = readOptions();
  const problems = [];
  const config = JSON.parse(await readFile(o.captionsFile, "utf8"));
  const missing = CAPTION_KEYS.filter((k) => !config.captions?.[k]);
  if (missing.length > 0 || !config.endcard?.tagline) throw new Error(`${o.captionsFile}: missing ${[...missing, config.endcard?.tagline ? null : "endcard.tagline"].filter(Boolean).join(", ")}`);
  const storyFile = await findCaptionsFile(o.culture);
  if (!storyFile) throw new Error(`no captions.${o.culture}.json for the end card pill and link`);
  const story = JSON.parse(await readFile(storyFile, "utf8")).endcard;
  const overlayDir = path.join(o.workDir, "overlays");
  const segDir = path.join(o.workDir, "segments");
  await mkdir(overlayDir, { recursive: true });
  await mkdir(segDir, { recursive: true });

  const settings = renderSettings(await findProfile(o.culture));
  const rendered = { ...config.captions, ...Object.fromEntries(DUMMY_KEYS.map((k) => [k, DUMMY_CAPTION])) };
  const caps = await renderCaptions(overlayDir, rendered, o.culture, { settings });
  problems.push(...caps.problems.filter((p) => !DUMMY_KEYS.some((k) => p.startsWith(`${k}:`))));
  const card = await renderEndcard(overlayDir, { tagline: config.endcard.tagline, pill: story.pill, link: story.link }, o.culture, { settings });
  problems.push(...card.problems);

  const speed = SCENES.map((scene) => {
    const chars = [...config.captions[scene.caption]].length;
    const seconds = sceneSeconds(scene) - 2 * CAPTION_INSET_SECONDS;
    return { key: scene.caption, chars, seconds: Number(seconds.toFixed(2)), cps: Number((chars / seconds).toFixed(1)) };
  });
  console.table(speed);
  for (const row of speed.filter((r) => r.cps > settings.maxCharsPerSecond)) problems.push(`${row.key}: ${row.cps} chars/s over ${settings.maxCharsPerSecond}`);

  const files = [];
  for (const [i, scene] of SCENES.entries()) {
    const background = path.join(segDir, `bg${i}.png`);
    await buildBackground(o, scene.background, background);
    const file = path.join(segDir, `s${i}.mp4`);
    await buildScene(o, scene, background, caps.files[scene.caption], file);
    files.push(file);
  }
  const endcard = path.join(segDir, "end.mp4");
  await ffmpeg(o.tools, ["-loop", "1", "-framerate", String(FPS), "-t", num(ENDCARD_SECONDS), "-i", card.file, "-vf", `scale=${FRAME},format=yuv420p`, ...segmentEncode(), endcard]);

  await mkdir(o.outDir, { recursive: true });
  const total = await mux(o, files, endcard, path.join(o.outDir, `${OUTPUT_PREFIX}${o.culture}`));
  console.log(`${OUTPUT_PREFIX}${o.culture}: ${num(total)} s`);
  if (problems.length > 0) {
    for (const p of problems) console.error(`! ${p}`);
    process.exitCode = 1;
  }
}

await main();
