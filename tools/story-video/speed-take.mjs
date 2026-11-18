// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shortens a recorded app take section by section for a story video (replaces the lost scratchpad build_clips.py of the Spitex clips):
 * still spans (waiting for an answer, a page at rest) are found with ffmpeg freezedetect (spans closer than --merge-gap are joined) and
 * condensed at one common speed that is solved so the result lasts --target seconds, but each keeps at least --min-hold seconds so a caption
 * or a page shown there stays readable; moving spans (typing, scrolling, answers streaming in) play at --moving-speed. A single decode pass
 * with a piecewise setpts mapping (low RAM).
 * CLI: --take <in.mp4> --out <out.mp4> --target <seconds> [--min-hold 1.6] [--moving-speed 1.5] [--merge-gap 0.3] [--freeze-noise -50dB]
 *      [--freeze-min 0.6] [--ffmpeg <path>] [--ffprobe <path>] [--dry-run]
 * @param target - wanted length of the shortened take in seconds
 * @param min-hold - shortest output length of a still span (never longer than the span itself)
 * @param moving-speed - speed of the moving spans
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { parseArgs, promisify } from "node:util";

const run = promisify(execFile);
const MAX_BUFFER_BYTES = 1 << 28;
const DECIMALS = 3;
const FPS = 30;
const CRF = 18;
const { values: cli } = parseArgs({
  options: {
    take: { type: "string" }, out: { type: "string" }, target: { type: "string" }, "min-hold": { type: "string" }, "moving-speed": { type: "string" },
    "merge-gap": { type: "string" }, "freeze-noise": { type: "string" }, "freeze-min": { type: "string" }, ffmpeg: { type: "string" },
    ffprobe: { type: "string" }, "dry-run": { type: "boolean" },
  },
});

const num = (v) => String(Number(v.toFixed(DECIMALS)));

async function main() {
  const missing = ["take", "out", "target"].filter((k) => !cli[k]);
  if (missing.length > 0) throw new Error(`missing option(s): ${missing.map((k) => `--${k}`).join(", ")}`);
  const ffmpeg = cli.ffmpeg ?? process.env.FFMPEG_PATH ?? "ffmpeg";
  const ffprobe = cli.ffprobe ?? process.env.FFPROBE_PATH ?? "ffprobe";
  const take = path.resolve(cli.take);
  const target = Number(cli.target);
  const minHold = Number(cli["min-hold"] ?? 1.6);
  const movingSpeed = Number(cli["moving-speed"] ?? 1.5);
  const mergeGap = Number(cli["merge-gap"] ?? 0.3);
  const noise = cli["freeze-noise"] ?? "-50dB";
  const freezeMin = Number(cli["freeze-min"] ?? 0.6);

  const duration = Number((await run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", take])).stdout.trim());
  const probe = await run(ffmpeg, ["-v", "info", "-i", take, "-vf", `freezedetect=n=${noise}:d=${freezeMin}`, "-an", "-f", "null", "-"], { maxBuffer: MAX_BUFFER_BYTES });
  const log = probe.stderr;
  const starts = [...log.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const stills = [];
  for (const span of starts.map((s, i) => [s, ends[i] ?? duration])) {
    const last = stills.at(-1);
    if (last && span[0] - last[1] < mergeGap) last[1] = span[1];
    else stills.push(span);
  }

  const spans = [];
  let cursor = 0;
  for (const [s, e] of stills) {
    if (s > cursor) spans.push({ from: cursor, to: s, still: false });
    spans.push({ from: s, to: e, still: true });
    cursor = e;
  }
  if (cursor < duration) spans.push({ from: cursor, to: duration, still: false });

  const moving = spans.filter((x) => !x.still).reduce((n, x) => n + (x.to - x.from), 0);
  for (const sp of spans.filter((x) => !x.still)) sp.out = (sp.to - sp.from) / movingSpeed;
  const stillBudget = target - moving / movingSpeed;
  const stillOutAt = (k) => spans.filter((x) => x.still).reduce((n, x) => n + Math.min(x.to - x.from, Math.max(minHold, (x.to - x.from) / k)), 0);
  let lo = 1, hi = 64;
  for (let i = 0; i < 60; i += 1) { const mid = (lo + hi) / 2; if (stillOutAt(mid) > stillBudget) lo = mid; else hi = mid; }
  const speed = hi;
  if (stillOutAt(speed) > stillBudget + 0.5) console.warn(`! the still spans cannot shrink below ${num(stillOutAt(speed))} s with min-hold ${minHold}: the take stays longer than ${target} s`);
  for (const sp of spans.filter((x) => x.still)) sp.out = Math.min(sp.to - sp.from, Math.max(minHold, (sp.to - sp.from) / speed));
  const stillOut = stillOutAt(speed);

  let offset = 0;
  const terms = [];
  for (const sp of spans) {
    const k = (sp.to - sp.from) / sp.out;
    terms.push(`gte(T,${num(sp.from)})*lt(T,${num(sp.to)})*(${num(offset)}+(T-${num(sp.from)})/${num(k)})`);
    sp.at = offset;
    offset += sp.out;
  }
  console.log(`take ${num(duration)} s -> ${num(offset)} s; ${stills.length} still span(s) ${num(stills.reduce((n, [s, e]) => n + e - s, 0))} s -> ${num(stillOut)} s; moving ${num(moving)} s at ${movingSpeed}x; still speed ${speed.toFixed(2)}x`);
  for (const sp of spans) console.log(`  ${sp.still ? "still " : "moving"} ${num(sp.from).padStart(7)}-${num(sp.to).padEnd(7)} -> out ${num(sp.at).padStart(7)} (+${num(sp.out)})`);
  if (cli["dry-run"]) return;
  const expr = terms.join("+");
  await run(ffmpeg, ["-v", "error", "-y", "-i", take, "-filter_complex", `[0:v]setpts='(${expr})/TB',fps=${FPS}[v]`, "-map", "[v]", "-an",
    "-c:v", "libx264", "-crf", String(CRF), "-preset", "medium", "-pix_fmt", "yuv420p", path.resolve(cli.out)], { maxBuffer: MAX_BUFFER_BYTES });
  console.log(`written ${path.resolve(cli.out)}`);
}

await main();
