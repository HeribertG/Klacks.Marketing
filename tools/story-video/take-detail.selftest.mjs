// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Self-test of take-detail.mjs without ffmpeg: zoom planning (limits, cue lookup, overlaps, caption pill protection, rectangle
 * fitting), the generated filter graph and the cover filters.
 * Run: node tools/story-video/take-detail.selftest.mjs
 */

import assert from "node:assert/strict";
import { MAX_ZOOMS, coverFilters, planZooms, zoomedTakeGraph } from "./take-detail.mjs";

const GEOMETRY = { width: 1280, height: 720, seconds: 60 };
const PILL = { x: 24.4, y: 639, width: 396, height: 49 };
const SIDECAR = {
  viewport: { width: 1280, height: 720 },
  cues: [
    { cue: "a", fromSeconds: 2, endSeconds: 8, box: PILL },
    { cue: "b", fromSeconds: 10, endSeconds: 16, box: PILL },
    { cue: "b", fromSeconds: 30, endSeconds: 36, box: PILL },
    { cue: "n", fromSeconds: 40, endSeconds: 46, box: null },
  ],
};
const zoom = (over = {}) => ({ cue: "b", delayMs: 500, holdMs: 2000, rect: { x: 100, y: 100 }, ...over });
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n${error.stack}`);
  }
}

check("no zooms plan nothing, a missing sidecar fails loudly", () => {
  assert.equal(planZooms([], null, GEOMETRY), null);
  assert.throws(() => planZooms([zoom()], null, GEOMETRY), /cue sidecar/);
});

check("more than the maximum zooms are rejected", () => {
  const many = Array.from({ length: MAX_ZOOMS + 1 }, (_, i) => zoom({ delayMs: i * 1000 }));
  assert.throws(() => planZooms(many, SIDECAR, GEOMETRY), /at most 3/);
});

check("unknown cue and missing occurrence are rejected", () => {
  assert.throws(() => planZooms([zoom({ cue: "zzz" })], SIDECAR, GEOMETRY), /not in the cue sidecar/);
  assert.throws(() => planZooms([zoom({ occurrence: 2 })], SIDECAR, GEOMETRY), /occurrence 2 does not exist/);
});

check("timing follows the cue, delay and ramps", () => {
  const plan = planZooms([zoom({ occurrence: 1 })], SIDECAR, GEOMETRY);
  const [z] = plan.zooms;
  assert.equal(z.t0, 30.5);
  assert.equal(Number(z.t1.toFixed(3)), 30.9);
  assert.equal(Number(z.t2.toFixed(3)), 32.9);
  assert.equal(Number(z.t3.toFixed(3)), 33.3);
});

check("zooms that overlap or run past the end are rejected", () => {
  assert.throws(() => planZooms([zoom(), zoom({ delayMs: 1000 })], SIDECAR, GEOMETRY), /overlaps/);
  assert.throws(() => planZooms([zoom({ occurrence: 1 })], SIDECAR, { ...GEOMETRY, seconds: 32 }), /take is 32 s long/);
});

check("a rectangle over a visible caption pill is rejected, one beside it is not", () => {
  assert.throws(() => planZooms([zoom({ rect: { x: 0, y: 360 } })], SIDECAR, GEOMETRY), /covers the caption/);
  const plan = planZooms([zoom()], SIDECAR, GEOMETRY);
  assert.deepEqual(plan.overlays, [{ box: { x: 24, y: 639, w: 397, h: 49 }, from: 10.5, until: 13.3 }]);
});

check("a caption without a measured box blocks a zoom during it", () => {
  assert.throws(() => planZooms([zoom({ cue: "n" })], SIDECAR, GEOMETRY), /not measured/);
});

check("a take recorded at another width is rejected", () => {
  assert.throws(() => planZooms([zoom()], SIDECAR, { ...GEOMETRY, width: 1000 }), /recorded at 1280/);
});

check("rectangles are widened to 16:9 and shifted into the frame", () => {
  const [z] = planZooms([zoom({ rect: { x: 1200, y: 700, w: 400, h: 360 } })], SIDECAR, GEOMETRY).zooms;
  assert.equal(z.rect.w / z.rect.h, 16 / 9);
  assert.ok(z.rect.x + z.rect.w <= 1280 && z.rect.y + z.rect.h <= 720);
  assert.throws(() => planZooms([zoom({ rect: { x: 0, y: 0, w: 1280, h: 720 } })], SIDECAR, GEOMETRY), /no zoom/);
});

check("the graph has one overlay per caption window and a plain chain without captions", () => {
  const withPill = zoomedTakeGraph("fps=30", planZooms([zoom()], SIDECAR, GEOMETRY));
  assert.match(withPill, /^\[0:v\]fps=30,split=2\[z\]\[u0\];\[z\]scale=.*eval=frame.*\[z0\];\[u0\]crop=397:49:24:639\[c0\];\[z0\]\[c0\]overlay=24:639:enable='between\(t,10.5,13.3\)'\[t\]$/);
  const bare = zoomedTakeGraph("fps=30", planZooms([zoom({ cue: "a", delayMs: 7000 })], { ...SIDECAR, cues: [{ cue: "a", fromSeconds: 2, endSeconds: 3, box: PILL }] }, GEOMETRY));
  assert.match(bare, /^\[0:v\]fps=30,scale=.*\[t\]$/);
  assert.ok(!bare.includes("split"));
});

check("cover filters: whole take, panel and explicit windows; bad input is rejected", () => {
  const frame = { width: 1280, height: 720, panelIntervals: [[1, 5], [7, 9]] };
  const rect = { x: 10, y: 20, w: 100, h: 18 };
  assert.deepEqual(coverFilters([{ rect, color: "white" }], frame), ["drawbox=x=10:y=20:w=100:h=18:color=white:t=fill"]);
  assert.deepEqual(coverFilters([{ rect, color: "0xf0f0f0", windows: "panel" }], frame), ["drawbox=x=10:y=20:w=100:h=18:color=0xf0f0f0:t=fill:enable='between(t,1,5)+between(t,7,9)'"]);
  assert.deepEqual(coverFilters([{ rect, color: "white", windows: [[2, 3]] }], frame), ["drawbox=x=10:y=20:w=100:h=18:color=white:t=fill:enable='between(t,2,3)'"]);
  assert.throws(() => coverFilters([{ rect: { ...rect, x: 1250 }, color: "white" }], frame), /outside/);
  assert.throws(() => coverFilters([{ rect, color: "white;x" }], frame), /colour/);
  assert.throws(() => coverFilters([{ rect, color: "white", windows: [[3, 2]] }], frame), /invalid window/);
});

if (failed > 0) process.exit(1);
