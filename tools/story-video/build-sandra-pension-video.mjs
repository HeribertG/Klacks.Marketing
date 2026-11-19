// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Joins the three Veo comic clips of the "Sandra and the retiring baby boomers" story into one silent 16:9 video: trims each
 * clip, adds the captions of the caption file in their time windows and appends the end card. The Veo sound is never used
 * (story clips carry no speech and no music, owner rule 2026-10-29).
 * CLI: --clip1 <file> --clip2 <file> --clip3 <file> [--screen <file>] --out <file> [--config <captions json>] [--work-dir <dir>] [--ffmpeg <path>]
 * @param clip1 - Veo clip "the baby boomers leave the open-plan office"
 * @param clip2 - Veo clip "Sandra despairs, opens the notebook, Klacksy appears"
 * @param clip3 - Veo clip "Sandra with a coffee, satisfied"
 * @param screen - optional finished silent screen part (real app takes with its own captions) that a timeline segment named "screen" plays between clip 2 and clip 3
 * @param config - caption file, default sandra-pension-captions.de.json (captions, endcard, timeline with segments and windows)
 */

import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { findProfile, renderSettings } from "./culture-profile.mjs";
import { renderCaptions, renderEndcard } from "./render-overlays.mjs";
import { SEGMENT_CODEC } from "./story-recipe.mjs";

const run = promisify(execFile);
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const MAX_BUFFER_BYTES = 1 << 28;
const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 720;
const FINAL_CRF = 22;
const CAPTION_KEYS = Object.freeze(["k1", "k2", "k3", "k4", "x1"]);
const DEFAULT_CONFIG = "sandra-pension-captions.de.json";

const { values: cli } = parseArgs({
  options: {
    clip1: { type: "string" }, clip2: { type: "string" }, clip3: { type: "string" }, screen: { type: "string" }, out: { type: "string" },
    config: { type: "string" }, "work-dir": { type: "string" }, ffmpeg: { type: "string" },
  },
});
for (const name of ["clip1", "clip2", "clip3", "out"]) if (!cli[name]) throw new Error(`--${name} is required`);

const config = JSON.parse(await readFile(path.resolve(cli.config ?? path.join(toolDir, DEFAULT_CONFIG)), "utf8"));
const { segments, windows, endcardSeconds } = config.timeline;
const clips = { clip1: path.resolve(cli.clip1), clip2: path.resolve(cli.clip2), clip3: path.resolve(cli.clip3), ...(cli.screen ? { screen: path.resolve(cli.screen) } : {}) };
const workDir = path.resolve(cli["work-dir"] ?? path.join(path.dirname(path.resolve(cli.out)), "sandra-pension-work"));
await mkdir(workDir, { recursive: true });
await mkdir(path.dirname(path.resolve(cli.out)), { recursive: true });
const ffmpeg = cli.ffmpeg ?? "ffmpeg";

const settings = renderSettings(await findProfile(config.culture));
const caps = await renderCaptions(workDir, config.captions, config.culture, { settings });
const card = await renderEndcard(workDir, config.endcard, config.culture, { settings });
const problems = [...caps.problems.filter((p) => !p.startsWith("y1:") && !p.startsWith("y2:")), ...card.problems];

const clipSeconds = segments.reduce((sum, s) => sum + (s.to - s.from), 0);
const totalSeconds = clipSeconds + endcardSeconds;
for (const key of CAPTION_KEYS) {
  const w = windows[key];
  const chars = config.captions[key].length;
  if (!w || w.to > clipSeconds) problems.push(`${key}: window missing or inside the end card`);
  else if (chars / (w.to - w.from) > 17) problems.push(`${key}: reading speed ${(chars / (w.to - w.from)).toFixed(1)} chars/s (max 17)`);
}

const inputs = [];
for (const s of segments) inputs.push("-i", clips[s.clip]);
inputs.push("-loop", "1", "-t", String(totalSeconds), "-i", card.file);
for (const key of CAPTION_KEYS) inputs.push("-loop", "1", "-t", String(totalSeconds), "-i", caps.files[key]);

const cardIndex = segments.length;
const filters = segments.map((s, i) =>
  `[${i}:v]trim=start=${s.from}:end=${s.to},setpts=PTS-STARTPTS,scale=${WIDTH}:${HEIGHT},fps=${FPS},format=yuv420p[s${i}]`);
filters.push(`[${cardIndex}:v]trim=0:${endcardSeconds},setpts=PTS-STARTPTS,scale=${WIDTH}:${HEIGHT},fps=${FPS},format=yuv420p[ec]`);
filters.push(`${segments.map((_, i) => `[s${i}]`).join("")}[ec]concat=n=${segments.length + 1}:v=1:a=0[base]`);
let last = "base";
CAPTION_KEYS.forEach((key, i) => {
  const w = windows[key];
  filters.push(`[${cardIndex + 1 + i}:v]format=rgba[c${i}]`);
  filters.push(`[${last}][c${i}]overlay=0:0:enable='between(t,${w.from},${w.to})'[o${i}]`);
  last = `o${i}`;
});

const args = ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filters.join(";"), "-map", `[${last}]`, "-an",
  "-c:v", SEGMENT_CODEC.codec, "-crf", String(FINAL_CRF), "-preset", "medium", "-pix_fmt", SEGMENT_CODEC.pixFmt,
  "-t", String(totalSeconds), "-movflags", "+faststart", path.resolve(cli.out)];
await run(ffmpeg, args, { maxBuffer: MAX_BUFFER_BYTES });

console.log(`written ${path.resolve(cli.out)} (${totalSeconds} s, no audio)`);
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
}
