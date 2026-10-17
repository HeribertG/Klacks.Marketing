// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Regression check of a rebuilt story video against a reference (the live simple-story-comic-de.mp4): length, file hash,
 * per-frame SSIM and PSNR over the whole video (one ffmpeg pass each, frames paired by index, not by seeking), the values at
 * sample points and the minimum per scene. Exits 1 when the length is off or a scene falls below the thresholds; the end
 * card is reported separately with its own threshold because a freshly rendered card never matches the old video-frame PNG.
 * CLI: --candidate <mp4> --reference <mp4> [--work-dir <dir>] [--points 12] [--min-ssim 0.98] [--min-psnr 35]
 *      [--endcard-min-ssim 0.9] [--take-seconds 23.08] [--ffmpeg <path>] [--ffprobe <path>]
 * @param min-ssim - lowest accepted SSIM of a non-end-card frame (see the noise floor of the final crf-24 encode)
 * @param take-seconds - length of the take scene, sets the scene boundaries
 */

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import { DECIMALS, ENDCARD_SCENE, EXPECTED_SECONDS, FPS, OUTRO_SCENE, RAW_SCENE, SCHEDULE_SCENE, TAKE_SCENE } from "./story-recipe.mjs";

const run = promisify(execFile);
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const DEFAULTS = Object.freeze({ points: 12, minSsim: 0.98, minPsnr: 35, endcardMinSsim: 0.9, lengthTolerance: 0.2 });
const SSIM_FILE = "ssim.log";
const PSNR_FILE = "psnr.log";
const HASH = "md5";
const INFINITE_PSNR = "inf";
const INFINITE_PSNR_VALUE = 100;
const SCENE_ENDCARD = "endcard";
const WORK_DIR_NAME = "klacks-story-compare";
const HALF = 2;

function sceneBounds(takeSeconds) {
  const { seconds, cut } = RAW_SCENE;
  const scenes = [
    ["raw", seconds - (cut.resumeAt - cut.keepUntil) - cut.fadeSeconds],
    ["schedule", SCHEDULE_SCENE.keepSeconds],
    ["take", takeSeconds],
    ["outro", OUTRO_SCENE.totalSeconds],
    [SCENE_ENDCARD, ENDCARD_SCENE.seconds],
  ];
  let start = 0;
  return scenes.map(([name, length]) => {
    const frames = Math.round(length * FPS);
    const scene = { name, from: start, to: start + frames };
    start += frames;
    return scene;
  });
}

function sceneOf(bounds, frame) {
  return bounds.find((s) => frame >= s.from && frame < s.to)?.name ?? SCENE_ENDCARD;
}

function parseStats(text, key) {
  const values = [];
  for (const line of text.split(/\r?\n/)) {
    const n = line.match(/n:(\d+)/);
    const v = line.match(new RegExp(`${key}:([\\d.]+|${INFINITE_PSNR})`));
    if (n && v) values[Number(n[1]) - 1] = v[1] === INFINITE_PSNR ? INFINITE_PSNR_VALUE : Number(v[1]);
  }
  return values;
}

async function fileHash(file) {
  return createHash(HASH).update(await readFile(file)).digest("hex");
}

async function main() {
  const { values } = parseArgs({
    options: {
      candidate: { type: "string" }, reference: { type: "string" }, "work-dir": { type: "string" },
      points: { type: "string" }, "min-ssim": { type: "string" }, "min-psnr": { type: "string" },
      "endcard-min-ssim": { type: "string" }, "take-seconds": { type: "string" }, ffmpeg: { type: "string" }, ffprobe: { type: "string" },
    },
  });
  if (!values.candidate || !values.reference) throw new Error("--candidate and --reference are required");
  const ffmpegPath = values.ffmpeg ?? process.env.FFMPEG_PATH ?? "ffmpeg";
  const ffprobePath = values.ffprobe ?? process.env.FFPROBE_PATH ?? "ffprobe";
  const limits = {
    points: Number(values.points ?? DEFAULTS.points),
    minSsim: Number(values["min-ssim"] ?? DEFAULTS.minSsim),
    minPsnr: Number(values["min-psnr"] ?? DEFAULTS.minPsnr),
    endcardMinSsim: Number(values["endcard-min-ssim"] ?? DEFAULTS.endcardMinSsim),
  };
  const workDir = path.resolve(values["work-dir"] ?? path.join(os.tmpdir(), WORK_DIR_NAME));
  await mkdir(workDir, { recursive: true });
  const durations = [];
  for (const file of [values.candidate, values.reference]) {
    const { stdout } = await run(ffprobePath, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
    durations.push(Number(stdout.trim()));
  }
  const [candHash, refHash] = [await fileHash(values.candidate), await fileHash(values.reference)];
  const ssimLog = path.join(workDir, SSIM_FILE);
  const psnrLog = path.join(workDir, PSNR_FILE);
  const escaped = (f) => f.replace(/\\/g, "/").replace(/:/g, "\\:");
  await run(ffmpegPath, ["-v", "error", "-i", values.candidate, "-i", values.reference, "-filter_complex",
    `[0:v][1:v]ssim=stats_file='${escaped(ssimLog)}'`, "-f", "null", "-"], { maxBuffer: MAX_BUFFER_BYTES });
  await run(ffmpegPath, ["-v", "error", "-i", values.candidate, "-i", values.reference, "-filter_complex",
    `[0:v][1:v]psnr=stats_file='${escaped(psnrLog)}'`, "-f", "null", "-"], { maxBuffer: MAX_BUFFER_BYTES });
  const ssim = parseStats(await readFile(ssimLog, "utf8"), "All");
  const psnr = parseStats(await readFile(psnrLog, "utf8"), "psnr_avg");
  const bounds = sceneBounds(Number(values["take-seconds"] ?? TAKE_SCENE.seconds));
  const frames = ssim.length;
  const expectedFrames = bounds[bounds.length - 1].to;
  const complete = frames === expectedFrames && psnr.length === frames && ssim.every((v) => Number.isFinite(v)) && psnr.every((v) => Number.isFinite(v));
  if (!complete) {
    console.error(`compared ${frames} SSIM / ${psnr.length} PSNR frames, expected ${expectedFrames}: inputs do not pair frame by frame`);
    process.exitCode = 1;
    return;
  }
  const step = frames / limits.points;
  const samples = Array.from({ length: limits.points }, (_, i) => Math.min(frames - 1, Math.round(step / HALF + i * step)));
  console.log(`length candidate ${durations[0]} s, reference ${durations[1]} s, expected ${EXPECTED_SECONDS} s (+-${DEFAULTS.lengthTolerance})`);
  console.log(`${HASH} candidate ${candHash}, reference ${refHash}: ${candHash === refHash ? "bit-identical" : "different bytes"}`);
  console.table(samples.map((n) => ({ frame: n, seconds: (n / FPS).toFixed(DECIMALS), scene: sceneOf(bounds, n), ssim: ssim[n], psnr: psnr[n] })));
  const perScene = bounds.map((s) => {
    const idx = ssim.map((_, i) => i).filter((i) => i >= s.from && i < s.to);
    const minSsim = Math.min(...idx.map((i) => ssim[i]));
    const minPsnr = Math.min(...idx.map((i) => psnr[i]));
    const meanSsim = idx.reduce((a, i) => a + ssim[i], 0) / idx.length;
    const okSsim = s.name === SCENE_ENDCARD ? minSsim >= limits.endcardMinSsim : minSsim >= limits.minSsim;
    const okPsnr = s.name === SCENE_ENDCARD || minPsnr >= limits.minPsnr;
    return { scene: s.name, frames: `${s.from}-${s.to - 1}`, minSsim, meanSsim: Number(meanSsim.toFixed(6)), minPsnr, ok: okSsim && okPsnr };
  });
  console.table(perScene);
  const lengthOk = durations.every((d) => Math.abs(d - EXPECTED_SECONDS) <= DEFAULTS.lengthTolerance);
  if (!lengthOk || perScene.some((s) => !s.ok)) process.exitCode = 1;
  console.log(lengthOk && perScene.every((s) => s.ok) ? "regression: PASS" : "regression: FAIL");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
