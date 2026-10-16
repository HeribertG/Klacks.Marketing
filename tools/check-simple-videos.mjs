// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Checks the recorded simple start page videos before they are committed: for every video and culture the WebM, MP4 and
 * WebP poster exist in wwwroot/videos (the catalog needs all three), each file stays within the byte budget of
 * capture-app-videos.mjs (1.5 MB), the MP4 length lies in the expected range, and the take report says publishable, no dev
 * overlay, every caption long enough on screen, nothing covered, no refusal in an answer and every expected skill call made. With ffmpeg it extracts one still per caption into
 * <frames>/<video>-<culture>/checks for the visual check, and it prints reference rows of existing videos for comparison.
 * CLI: --cultures de  --frames-dir <dir>  --ffmpeg <path>
 * Env: KLACKS_VIDEO_FRAMES_DIR, FFMPEG_PATH
 */

import { execFile } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { MIN_VISIBLE_SECONDS } from "./lib/caption-overlay.mjs";
import { VIDEO_SIMPLE_KLACKSY_CALL, VIDEO_SIMPLE_PLANS_WEEK, takeAnswerProblems } from "./takes/simple-takes.mjs";

const run = promisify(execFile);
const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_DIR = path.join(toolsDir, "..", "wwwroot", "videos");
const DEFAULT_FRAMES_DIR = path.join(os.tmpdir(), "klacks-video-frames");
const TAKE_REPORT_FILE = "take-report.json";
const CHECKS_DIR = "checks";
const EXT_MP4 = ".mp4";
const EXT_WEBM = ".webm";
const EXT_POSTER = ".webp";
const EXTENSIONS = [EXT_MP4, EXT_WEBM, EXT_POSTER];
const BYTES_PER_KB = 1024;
const MAX_BYTES_PER_FILE = 1.5 * BYTES_PER_KB * BYTES_PER_KB;
const MVHD = "mvhd";
const MVHD_VERSION_OFFSET = 4;
const MVHD_V0 = { timescale: 16, duration: 20 };
const MVHD_V1 = { timescale: 24, duration: 28 };
const HALF = 2;
const LIMITS = {
  [VIDEO_SIMPLE_KLACKSY_CALL]: { minSeconds: 10, maxSeconds: 20 },
  [VIDEO_SIMPLE_PLANS_WEEK]: { minSeconds: 30, maxSeconds: 50 },
};
const REFERENCE_VIDEOS = ["klacksy-plans-week", "rest-conflict"];
const ANSWER_PREVIEW_CHARS = 300;

function mp4Seconds(buffer) {
  const at = buffer.indexOf(MVHD);
  if (at < 0) throw new Error("no mvhd box");
  const layout = buffer[at + MVHD_VERSION_OFFSET] === 0 ? MVHD_V0 : MVHD_V1;
  const timescale = buffer.readUInt32BE(at + layout.timescale);
  const duration = layout === MVHD_V0 ? buffer.readUInt32BE(at + layout.duration) : Number(buffer.readBigUInt64BE(at + layout.duration));
  return duration / timescale;
}

async function filesOf(name) {
  const files = {};
  for (const ext of EXTENSIONS) {
    const file = path.join(VIDEOS_DIR, `${name}${ext}`);
    const info = await stat(file).catch(() => null);
    if (info) files[ext] = { file, size: info.size };
  }
  return files;
}

async function extractStills(ffmpegPath, mp4File, framesDir, visibility) {
  const dir = path.join(framesDir, CHECKS_DIR);
  await mkdir(dir, { recursive: true });
  const stills = [];
  for (const v of visibility) {
    const at = (v.fromSeconds + v.seconds / HALF).toFixed(HALF);
    const out = path.join(dir, `${v.cue}.png`);
    await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", "-ss", at, "-i", mp4File, "-frames:v", "1", out]);
    stills.push(out);
  }
  return stills;
}

async function checkVideo(options, video, culture) {
  const name = `${video}-${culture}`;
  const limits = LIMITS[video];
  const problems = [];
  const files = await filesOf(name);
  for (const ext of EXTENSIONS) {
    if (!files[ext]) problems.push(`${name}${ext} missing`);
    else if (files[ext].size > MAX_BYTES_PER_FILE) problems.push(`${name}${ext} has ${files[ext].size} bytes (max ${MAX_BYTES_PER_FILE})`);
  }
  const seconds = files[EXT_MP4] ? mp4Seconds(await readFile(files[EXT_MP4].file)) : null;
  if (seconds !== null && (seconds < limits.minSeconds || seconds > limits.maxSeconds)) {
    problems.push(`${name}.mp4 lasts ${seconds.toFixed(1)} s (expected ${limits.minSeconds}-${limits.maxSeconds} s)`);
  }
  const framesDir = path.join(options.framesRoot, name);
  const report = await readFile(path.join(framesDir, TAKE_REPORT_FILE), "utf8").then(JSON.parse, () => null);
  const visibility = report?.captions?.visibility ?? [];
  if (!report) problems.push(`no take report in ${framesDir}`);
  else {
    if (report.publishable !== true) problems.push(`take not publishable: ${report.failure ?? "-"}`);
    if (report.devOverlay) problems.push(`dev overlay seen: ${report.devOverlay.text}`);
    if (visibility.length === 0) problems.push("take report has no captions");
    for (const v of visibility) {
      if (v.seconds < MIN_VISIBLE_SECONDS) problems.push(`caption "${v.cue}" visible ${v.seconds} s`);
    }
    for (const o of report.captions?.overlaps ?? []) problems.push(`caption "${o.cue}" covers ${o.selector}`);
    problems.push(...takeAnswerProblems(video, report.turns));
  }
  const stills = options.ffmpegPath && files[EXT_MP4] && visibility.length > 0
    ? await extractStills(options.ffmpegPath, files[EXT_MP4].file, framesDir, visibility)
    : [];
  const answers = (report?.turns ?? []).map((t) => String(t.content ?? "").replace(/\s+/g, " ").slice(0, ANSWER_PREVIEW_CHARS));
  return {
    row: {
      name,
      seconds: seconds?.toFixed(1) ?? "-",
      mp4KB: files[EXT_MP4] ? Math.round(files[EXT_MP4].size / BYTES_PER_KB) : "-",
      webmKB: files[EXT_WEBM] ? Math.round(files[EXT_WEBM].size / BYTES_PER_KB) : "-",
      posterKB: files[EXT_POSTER] ? Math.round(files[EXT_POSTER].size / BYTES_PER_KB) : "-",
      problems: problems.length,
    },
    problems,
    stills,
    answers,
  };
}

async function referenceRow(video, culture) {
  const name = `${video}-${culture}`;
  const files = await filesOf(name);
  return {
    name: `(ref) ${name}`,
    seconds: files[EXT_MP4] ? mp4Seconds(await readFile(files[EXT_MP4].file)).toFixed(1) : "-",
    mp4KB: files[EXT_MP4] ? Math.round(files[EXT_MP4].size / BYTES_PER_KB) : "-",
    webmKB: files[EXT_WEBM] ? Math.round(files[EXT_WEBM].size / BYTES_PER_KB) : "-",
    posterKB: files[EXT_POSTER] ? Math.round(files[EXT_POSTER].size / BYTES_PER_KB) : "-",
    problems: "",
  };
}

async function main() {
  const { values } = parseArgs({ options: { cultures: { type: "string" }, "frames-dir": { type: "string" }, ffmpeg: { type: "string" } } });
  const options = {
    cultures: (values.cultures ?? "de").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean),
    framesRoot: path.resolve(values["frames-dir"] ?? process.env.KLACKS_VIDEO_FRAMES_DIR ?? DEFAULT_FRAMES_DIR),
    ffmpegPath: values.ffmpeg ?? process.env.FFMPEG_PATH ?? null,
  };
  const rows = [];
  for (const culture of options.cultures) {
    for (const video of Object.keys(LIMITS)) {
      const result = await checkVideo(options, video, culture);
      rows.push(result.row);
      for (const problem of result.problems) console.error(`x ${result.row.name}: ${problem}`);
      for (const still of result.stills) console.log(`still: ${still}`);
      result.answers.forEach((answer, i) => console.log(`answer ${result.row.name} #${i + 1}: ${answer}`));
      if (result.problems.length > 0) process.exitCode = 1;
    }
    for (const video of REFERENCE_VIDEOS) rows.push(await referenceRow(video, culture));
  }
  console.table(rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
