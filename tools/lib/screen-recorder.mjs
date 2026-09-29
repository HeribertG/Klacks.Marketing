// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Records a Playwright page via the CDP screencast into timestamped JPEG frames on disk and a manifest.json
 * (frame list + speed regions). Waiting periods can be flagged as time-compressed; the page then shows a
 * fast-forward badge so viewers can tell that time was compressed, while the recorded content stays unchanged.
 * A non-finite factor marks a cut region (no badge): its frames are dropped from the video.
 * @param page - Playwright page to record
 * @param framesDir - directory that receives frame-NNNNN.jpg and manifest.json
 * @param config - jpegQuality, maxWidth, maxHeight (device pixels)
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const MANIFEST_FILE = "manifest.json";
const FRAME_FILE = (index) => `frame-${String(index).padStart(5, "0")}.jpg`;
const FRAME_INDEX_DIGITS = 5;
const MS_PER_SECOND = 1000;
const BADGE_ID = "capture-fast-forward";
const BADGE_Z_INDEX = 2147483646;
const BADGE_TEXT = (factor) => `⏩ ${factor}×`;

export class ScreenRecorder {
  constructor(page, framesDir, config) {
    this.page = page;
    this.framesDir = framesDir;
    this.config = config;
    this.frames = [];
    this.pendingWrites = [];
    this.speedRegions = [];
    this.openRegion = null;
    this.startedAt = null;
    this.stoppedAt = null;
    this.cdp = null;
  }

  static now() {
    return Date.now() / MS_PER_SECOND;
  }

  async start() {
    await rm(this.framesDir, { recursive: true, force: true });
    await mkdir(this.framesDir, { recursive: true });
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", (frame) => this.onFrame(frame));
    await this.cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: this.config.jpegQuality,
      maxWidth: this.config.maxWidth,
      maxHeight: this.config.maxHeight,
      everyNthFrame: 1,
    });
    this.startedAt = ScreenRecorder.now();
  }

  onFrame(frame) {
    this.cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
    if (this.stoppedAt !== null) return;
    const index = this.frames.length;
    const file = FRAME_FILE(index);
    this.frames.push({ file, t: frame.metadata.timestamp ?? ScreenRecorder.now() });
    this.pendingWrites.push(writeFile(path.join(this.framesDir, file), Buffer.from(frame.data, "base64")));
  }

  async beginFast(factor, { badge = true } = {}) {
    if (this.openRegion) await this.endFast();
    const cut = !Number.isFinite(factor);
    this.openRegion = { from: ScreenRecorder.now(), factor: cut ? null : factor, cut };
    if (cut || !badge) return;
    await this.page.evaluate(({ id, text, z }) => {
      const badge = document.getElementById(id) ?? document.createElement("div");
      badge.id = id;
      badge.textContent = text;
      badge.style.cssText = `position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:${z};pointer-events:none;`
        + "padding:6px 14px;border-radius:999px;background:rgba(20,20,20,.72);color:#fff;"
        + "font:600 18px/1.2 system-ui,sans-serif;letter-spacing:.04em;direction:ltr;";
      document.documentElement.appendChild(badge);
    }, { id: BADGE_ID, text: BADGE_TEXT(factor), z: BADGE_Z_INDEX }).catch(() => {});
  }

  async endFast() {
    if (!this.openRegion) return;
    this.speedRegions.push({ ...this.openRegion, to: ScreenRecorder.now() });
    this.openRegion = null;
    await this.page.evaluate((id) => document.getElementById(id)?.remove(), BADGE_ID).catch(() => {});
  }

  async stop(extra = {}) {
    await this.endFast();
    this.stoppedAt = ScreenRecorder.now();
    await this.cdp.send("Page.stopScreencast").catch(() => {});
    await Promise.all(this.pendingWrites);
    const manifest = {
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      frameIndexDigits: FRAME_INDEX_DIGITS,
      frames: this.frames,
      speedRegions: this.speedRegions,
      ...extra,
    };
    await writeFile(path.join(this.framesDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2));
    return manifest;
  }
}

export { MANIFEST_FILE };
