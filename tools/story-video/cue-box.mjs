// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Finds the in-app caption (the dark "cue" box that lib/caption-overlay.mjs drew into the recorded take) in the pixels of the
 * take, because that caption is burned into the video and can only be hidden, never removed. The box sits in the inline-start
 * bottom corner (left for ltr, right for rtl). For a few frames inside the story caption window the function walks the rows
 * of the lower part of the frame from the box edge inwards, collects the rows that start with a long dark run, joins them
 * to one box and returns the union over the frames, in the coordinates of the cropped story frame.
 * @param ffmpeg - path of the ffmpeg binary
 * @param take - recorded take video
 * @param times - take seconds to inspect (inside the window in which the in-app caption is visible)
 * @param geometry - { width, height } of the take video and { cropY } of the story crop
 * @param direction - "ltr" or "rtl", decides at which edge the box starts
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CUE_DETECTION, DIR_RTL } from "./story-recipe.mjs";

const run = promisify(execFile);
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const CHANNELS = 3;
const PIXEL_FORMAT = "rgb24";

async function frameAt(ffmpeg, take, seconds) {
  const { stdout } = await run(ffmpeg, ["-v", "error", "-ss", String(seconds), "-i", take, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", PIXEL_FORMAT, "pipe:1"], { encoding: "buffer", maxBuffer: MAX_BUFFER_BYTES });
  return stdout;
}

function isDark(buffer, offset) {
  return Math.max(buffer[offset], buffer[offset + 1], buffer[offset + 2]) < CUE_DETECTION.darkMax;
}

function runLength(buffer, width, y, startX, step) {
  let length = 0;
  for (let x = startX; x >= 0 && x < width && isDark(buffer, (y * width + x) * CHANNELS); x += step) length += 1;
  return length;
}

function boxInFrame(buffer, width, height, direction) {
  const c = CUE_DETECTION;
  const rtl = direction === DIR_RTL;
  const step = rtl ? -1 : 1;
  const startX = rtl ? width - 1 - c.edgePixels - c.startInsetPixels : c.edgePixels + c.startInsetPixels;
  const rows = [];
  for (let y = Math.floor(height * c.searchFromFraction); y < height; y += 1) {
    const length = runLength(buffer, width, y, startX, step);
    if (length >= c.minRunPixels) rows.push({ y, length });
  }
  if (rows.length === 0) return null;
  let group = [rows[rows.length - 1]];
  for (let i = rows.length - 2; i >= 0; i -= 1) {
    if (group[0].y - rows[i].y > c.maxGapRows) break;
    group.unshift(rows[i]);
  }
  const top = group[0].y;
  const bottom = group[group.length - 1].y;
  if (bottom - top + 1 < c.minBoxHeight) return null;
  const widest = Math.max(...group.map((r) => r.length));
  return rtl
    ? { left: startX - widest + 1, right: width - 1 - c.edgePixels, top, bottom }
    : { left: c.edgePixels, right: startX + widest - 1, top, bottom };
}

export async function detectCueBox(ffmpeg, take, times, geometry, direction) {
  const found = [];
  for (const seconds of times) {
    const buffer = await frameAt(ffmpeg, take, seconds);
    const box = boxInFrame(buffer, geometry.width, geometry.height, direction);
    if (box && box.bottom - box.top + 1 <= CUE_DETECTION.maxBoxHeight) found.push(box);
  }
  if (found.length === 0) throw new Error(`no in-app caption box found in ${take} at ${times.join(", ")} s: the take has no cue caption there or it sits in another corner`);
  const union = found.reduce((a, b) => ({ left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) }));
  return { box: union, frames: found.length, inspected: times.length };
}

export function cueTimes(window, takeSeconds) {
  const to = Math.min(window.to, takeSeconds);
  const from = window.from;
  const count = CUE_DETECTION.frames;
  return Array.from({ length: count }, (_, i) => Number((from + ((to - from) * (i + 0.5)) / count).toFixed(2)));
}

export function coverInStoryFrame(box, cropY, frameWidth, frameHeight, pad) {
  const top = box.top - cropY;
  const bottom = box.bottom - cropY;
  const left = box.left;
  const right = box.right;
  return {
    left: Math.max(0, left - pad),
    right: Math.min(frameWidth - 1, right + pad),
    top: Math.max(0, top - pad),
    bottom: Math.min(frameHeight - 1, bottom + pad),
    visible: bottom + CUE_DETECTION.haloPixels <= frameHeight && top >= 0,
  };
}
