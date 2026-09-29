// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Turns a ScreenRecorder frame directory into constant-frame-rate web videos (VP9 WebM + H.264 MP4, muted)
 * and a WebP poster via ffmpeg. Frame durations come from the capture timestamps; flagged speed regions are
 * time-compressed only (frames are never altered). An optional manifest.crop (device pixels) frames the video on the
 * relevant region; the crop is fixed for the whole take. Quality steps down until each file fits the byte budget.
 * An optional target.loop = { holdSeconds, fadeSeconds } makes the video loop smoothly: the final frame is held for
 * holdSeconds, then the tail cross-fades over fadeSeconds into the very first frame, so the restart has no visible jump
 * (the poster is not affected and keeps showing the end state).
 * @param ffmpegPath - ffmpeg executable (from --ffmpeg or FFMPEG_PATH)
 * @param framesDir - directory with frames + manifest.json
 * @param target - outputBase (path without extension), fps, widths, crfLadder per container, maxBytes, optional loop (poster frame = manifest.posterAt)
 */

import { execFile } from "node:child_process";
import { readFile, stat, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { MANIFEST_FILE } from "./screen-recorder.mjs";

const run = promisify(execFile);
const CONCAT_FILE = "frames.ffconcat";
const CONCAT_HEADER = "ffconcat version 1.0";
const LINE_BREAK = "\n";
const DURATION_DECIMALS = 4;
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const EXT_WEBM = ".webm";
const EXT_MP4 = ".mp4";
const EXT_POSTER = ".webp";
const POSTER_QUALITY = 80;
const WEBP_COMPRESSION_LEVEL = 6;
const VP9_CPU_USED = "2";
const X264_PRESET = "slow";
const STILL_EXTRA_SECONDS = 0.2;

export function outputClock(manifest) {
  const regions = [...manifest.speedRegions].sort((a, b) => a.from - b.from);
  return (t) => {
    let out = t - manifest.startedAt;
    for (const r of regions) {
      const overlap = Math.min(t, r.to) - r.from;
      if (overlap > 0) out -= r.cut ? overlap : overlap - overlap / r.factor;
    }
    return out;
  };
}

export async function readManifest(framesDir) {
  return JSON.parse(await readFile(path.join(framesDir, MANIFEST_FILE), "utf8"));
}

/**
 * Resamples the variable-rate capture to constant frame rate: output frame k shows the capture frame that was on
 * screen at output time k / fps. Each concat entry lasts exactly one output frame, so ffmpeg never has to honour
 * sub-frame durations (which the concat demuxer silently stretches).
 */
export async function writeConcatList(framesDir, manifest, fps, holdSeconds = 0) {
  const clock = outputClock(manifest);
  const startT = manifest.trimFrom ?? manifest.startedAt;
  const endT = manifest.trimTo ?? manifest.stoppedAt;
  const timeline = manifest.frames
    .filter((f) => f.t < endT)
    .map((f) => ({ file: f.file, out: clock(Math.max(f.t, startT)) }));
  if (timeline.length === 0) throw new Error(`no frames in ${framesDir} between trim marks`);
  const firstOut = clock(startT);
  const seconds = clock(endT) - firstOut;
  const outputFrames = Math.max(1, Math.round(seconds * fps));
  const frameSeconds = (1 / fps).toFixed(DURATION_DECIMALS);
  const holdFrames = Math.max(0, Math.round(holdSeconds * fps));
  const lines = [CONCAT_HEADER];
  let cursor = 0;
  let firstFile = null;
  for (let k = 0; k < outputFrames; k++) {
    const at = firstOut + k / fps;
    while (cursor + 1 < timeline.length && timeline[cursor + 1].out <= at) cursor++;
    firstFile ??= timeline[cursor].file;
    lines.push(`file '${timeline[cursor].file}'`, `duration ${frameSeconds}`);
  }
  for (let k = 0; k < holdFrames; k++) lines.push(`file '${timeline[cursor].file}'`, `duration ${frameSeconds}`);
  lines.push(`file '${timeline[cursor].file}'`);
  const listPath = path.join(framesDir, CONCAT_FILE);
  await writeFile(listPath, `${lines.join(LINE_BREAK)}${LINE_BREAK}`);
  return { listPath, seconds: (outputFrames + holdFrames) / fps, frameCount: manifest.frames.length, firstFile };
}

async function ffmpeg(ffmpegPath, args) {
  await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], { maxBuffer: MAX_BUFFER_BYTES });
}

function cropFilter(crop) {
  return crop ? `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},` : "";
}

function videoFilter(fps, width, crop) {
  return `fps=${fps},${cropFilter(crop)}scale=${width}:-2:flags=lanczos:in_range=full:out_range=limited,setsar=1,format=yuv420p`;
}

/**
 * Input and filter arguments shared by both containers. Without a loop spec the concat list is filtered as is; with
 * one, a still of the first frame is appended as second input and the video tail cross-fades into it.
 */
function sourceArgs(source, fps, width, crop) {
  const chain = videoFilter(fps, width, crop);
  const input = ["-f", "concat", "-safe", "0", "-i", source.listPath];
  if (!source.loop) return [...input, "-an", "-vf", chain];
  const { fadeSeconds } = source.loop;
  const offset = (source.seconds - fadeSeconds).toFixed(DURATION_DECIMALS);
  return [
    ...input,
    "-loop", "1", "-framerate", String(fps), "-t", String(fadeSeconds + STILL_EXTRA_SECONDS), "-i", source.firstFramePath,
    "-an",
    "-filter_complex", `[0:v]${chain}[a];[1:v]${chain}[b];[a][b]xfade=transition=fade:duration=${fadeSeconds}:offset=${offset},format=yuv420p[v]`,
    "-map", "[v]",
    "-t", source.seconds.toFixed(DURATION_DECIMALS),
  ];
}

async function encodeWebm(ffmpegPath, source, file, fps, width, crf, crop) {
  await ffmpeg(ffmpegPath, [
    ...sourceArgs(source, fps, width, crop),
    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf), "-row-mt", "1",
    "-deadline", "good", "-cpu-used", VP9_CPU_USED, file,
  ]);
}

async function encodeMp4(ffmpegPath, source, file, fps, width, crf, crop) {
  await ffmpeg(ffmpegPath, [
    ...sourceArgs(source, fps, width, crop),
    "-c:v", "libx264", "-preset", X264_PRESET, "-crf", String(crf), "-pix_fmt", "yuv420p", "-color_range", "tv",
    "-movflags", "+faststart", file,
  ]);
}

function widthsFor(target, crop) {
  const widths = crop ? target.widths.filter((w) => w <= crop.width) : target.widths;
  return crop && (widths.length === 0 || widths[0] !== crop.width) ? [crop.width, ...widths] : widths;
}

async function fitBudget(label, encode, file, target, crop) {
  const tried = [];
  for (const width of widthsFor(target, crop)) {
    for (const crf of target.crfLadder[label]) {
      await encode(width, crf);
      const { size } = await stat(file);
      tried.push({ width, crf, size });
      if (size <= target.maxBytes) return { width, crf, size };
    }
  }
  const last = tried[tried.length - 1];
  throw new Error(`${path.basename(file)} stays above ${target.maxBytes} bytes (last ${last.size} at ${last.width}px crf ${last.crf})`);
}

async function encodePoster(ffmpegPath, framesDir, manifest, target, width) {
  const frame = [...manifest.frames].reverse().find((f) => f.t <= (manifest.posterAt ?? manifest.stoppedAt))
    ?? manifest.frames[manifest.frames.length - 1];
  const file = `${target.outputBase}${EXT_POSTER}`;
  await ffmpeg(ffmpegPath, [
    "-i", path.join(framesDir, frame.file), "-frames:v", "1",
    "-vf", `${cropFilter(manifest.crop)}scale=${width}:-2:flags=lanczos`,
    "-c:v", "libwebp", "-quality", String(POSTER_QUALITY), "-compression_level", String(WEBP_COMPRESSION_LEVEL), file,
  ]);
  return { file, size: (await stat(file)).size, frame: frame.file };
}

/**
 * Encodes the recording into outputBase.webm / .mp4 / .webp and returns sizes, chosen settings and duration.
 */
export async function encodeRecording(ffmpegPath, framesDir, target) {
  const manifest = await readManifest(framesDir);
  const loop = target.loop ?? null;
  const { listPath, seconds, frameCount, firstFile } = await writeConcatList(framesDir, manifest, target.fps, loop?.holdSeconds ?? 0);
  if (loop && loop.fadeSeconds >= seconds) throw new Error(`loop fade (${loop.fadeSeconds} s) is not shorter than the video (${seconds} s)`);
  const source = { listPath, seconds, loop, firstFramePath: path.join(framesDir, firstFile) };
  const webmFile = `${target.outputBase}${EXT_WEBM}`;
  const mp4File = `${target.outputBase}${EXT_MP4}`;
  await rm(webmFile, { force: true });
  await rm(mp4File, { force: true });
  const crop = manifest.crop ?? null;
  const webm = await fitBudget("webm", (w, crf) => encodeWebm(ffmpegPath, source, webmFile, target.fps, w, crf, crop), webmFile, target, crop);
  const mp4 = await fitBudget("mp4", (w, crf) => encodeMp4(ffmpegPath, source, mp4File, target.fps, w, crf, crop), mp4File, target, crop);
  const poster = await encodePoster(ffmpegPath, framesDir, manifest, target, Math.max(webm.width, mp4.width));
  const recordedSeconds = (manifest.trimTo ?? manifest.stoppedAt) - (manifest.trimFrom ?? manifest.startedAt);
  return {
    seconds,
    loop,
    recordedSeconds,
    sourceFrames: frameCount,
    sourceFps: frameCount / recordedSeconds,
    crop,
    speedRegions: manifest.speedRegions.map((r) => ({ factor: r.cut ? "cut" : r.factor, seconds: r.to - r.from })),
    webm: { file: webmFile, ...webm },
    mp4: { file: mp4File, ...mp4 },
    poster,
  };
}
