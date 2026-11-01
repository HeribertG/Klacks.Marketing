// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Self-test of fix-take.mjs without ffmpeg: the dark-frame selection, the option parsers and the luma measurement on generated frames (a bright and a dark JPEG made in memory).
 * Run: node tools/series-recording/fix-take.selftest.mjs
 */

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { darkReplacements, frameDifference, meanLuma, parseCrop, parseTrim } from "./fix-take.mjs";

const THRESHOLD = 110;
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;
const BRIGHT = 235;
const DARK = 30;

assert.deepEqual(darkReplacements([200, 200, 20, 20, 200, 10, 200], THRESHOLD), [{ index: 2, source: 1 }, { index: 3, source: 1 }, { index: 5, source: 4 }]);
assert.deepEqual(darkReplacements([20, 20, 200, 20], THRESHOLD), [{ index: 3, source: 2 }], "dark frames before the first bright one stay");
assert.deepEqual(darkReplacements([], THRESHOLD), []);
assert.deepEqual(darkReplacements([110, 109], THRESHOLD), [{ index: 1, source: 0 }], "110 is bright, 109 dark");

assert.deepEqual(parseCrop("320,200,900,300"), { left: 320, top: 200, width: 900, height: 300 });
assert.throws(() => parseCrop("320,200,900"), /x,y,width,height/);
assert.throws(() => parseCrop("a,b,c,d"), /x,y,width,height/);
assert.deepEqual(parseTrim("decide:1.45"), { cue: "decide", seconds: 1.45 });
assert.throws(() => parseTrim("decide"), /<cue>:<seconds>/);
assert.throws(() => parseTrim("decide:0"), /<cue>:<seconds>/);

const folder = await mkdtemp(path.join(os.tmpdir(), "fix-take-selftest-"));
try {
  const make = async (name, grey) => {
    const file = path.join(folder, name);
    await writeFile(file, await sharp({ create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 3, background: { r: grey, g: grey, b: grey } } }).jpeg().toBuffer());
    return file;
  };
  const crop = parseCrop("320,200,900,300");
  const bright = await meanLuma(await make("bright.jpg", BRIGHT), crop);
  const dark = await meanLuma(await make("dark.jpg", DARK), crop);
  assert.ok(bright > THRESHOLD && dark < THRESHOLD, `bright ${bright} dark ${dark}`);
  assert.equal(await frameDifference(path.join(folder, "bright.jpg"), path.join(folder, "bright.jpg")), 0);
  const gap = await frameDifference(path.join(folder, "bright.jpg"), path.join(folder, "dark.jpg"));
  assert.ok(Math.abs(gap - (BRIGHT - DARK)) < 3, `difference ${gap}`);
} finally {
  await rm(folder, { recursive: true, force: true });
}
console.log("fix-take self-test: ok");
