// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Self-test of lib/dev-overlay-guard.mjs against a harmless data: page into which a <vite-error-overlay> element is injected
 * (the Klacks app is never touched). Covers: clean page passes, live overlay, overlay dismissed again before the poll,
 * interval polling, mouse / recorder checkpoints, and that recorder.stop() never throws (cleanup must run).
 * Run: node tools/dev-overlay-guard.selftest.mjs   (needs the Chromium used by capture-app-videos.mjs)
 */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import { DevOverlayGuard, DevOverlayViolationError } from "./lib/dev-overlay-guard.mjs";
import { HumanMouse } from "./lib/cursor-overlay.mjs";
import { ScreenRecorder } from "./lib/screen-recorder.mjs";

const PAGE_URL = "data:text/html,<html><body><h1>demo</h1></body></html>";
const OVERLAY_TEXT = "TS2339: Property 'x' does not exist. Click outside, press Esc key, or fix the code to dismiss.";
const POLL_MS = 100;
const WAIT_MS = 600;
const RECORDER_CONFIG = { jpegQuality: 50, maxWidth: 400, maxHeight: 300 };

const injectOverlay = (page) => page.evaluate((text) => {
  const el = document.createElement("vite-error-overlay");
  const root = el.attachShadow({ mode: "open" });
  root.innerHTML = `<style>.window{color:red}</style><div class="window"><pre class="message">${text}</pre></div>`;
  document.body.appendChild(el);
}, OVERLAY_TEXT);

const removeOverlay = (page) => page.evaluate(() => document.querySelector("vite-error-overlay")?.remove());

async function freshPage(browser) {
  const context = await browser.newContext();
  const init = DevOverlayGuard.initScript();
  await context.addInitScript(init.fn, init.arg);
  const page = await context.newPage();
  await page.goto(PAGE_URL);
  return { context, page, guard: new DevOverlayGuard(page, { pollMs: POLL_MS }) };
}

async function check(name, body) {
  await body();
  console.log(`ok  ${name}`);
}

const browser = await chromium.launch();
const framesRoot = await mkdtemp(path.join(os.tmpdir(), "overlay-guard-"));
try {
  await check("clean page passes every checkpoint", async () => {
    const { context, page, guard } = await freshPage(browser);
    await guard.assertClean("clean");
    guard.throwIfViolated();
    await new HumanMouse(page, { x: 1, y: 1 }, guard).moveTo({ x: 20, y: 20 }, 50);
    await context.close();
  });

  await check("live overlay is reported with its message", async () => {
    const { context, page, guard } = await freshPage(browser);
    await injectOverlay(page);
    await assert.rejects(guard.assertClean("live"), (error) => error instanceof DevOverlayViolationError
      && error.finding.selector === "vite-error-overlay" && error.finding.text.includes("TS2339") && error.message.includes("not publishable"));
    await context.close();
  });

  await check("overlay dismissed before the next poll is still reported (sticky)", async () => {
    const { context, page, guard } = await freshPage(browser);
    await injectOverlay(page);
    await removeOverlay(page);
    await assert.rejects(guard.assertClean("sticky"), DevOverlayViolationError);
    await context.close();
  });

  await check("interval polling flags the take and the next mouse step throws", async () => {
    const { context, page, guard } = await freshPage(browser);
    guard.startWatching();
    await injectOverlay(page);
    await page.waitForTimeout(WAIT_MS);
    guard.stopWatching();
    assert.ok(guard.violation, "poll did not notice the overlay");
    await assert.rejects(new HumanMouse(page, { x: 1, y: 1 }, guard).moveTo({ x: 20, y: 20 }, 50), DevOverlayViolationError);
    await context.close();
  });

  await check("recorder: start/stop never throw, fast-forward does", async () => {
    const { context, page, guard } = await freshPage(browser);
    const recorder = new ScreenRecorder(page, path.join(framesRoot, "take"), RECORDER_CONFIG, guard);
    await injectOverlay(page);
    await recorder.start();
    assert.ok(guard.violation, "recorder.start did not inspect the guard");
    await assert.rejects(recorder.beginFast(4), DevOverlayViolationError);
    await recorder.stop();
    await context.close();
  });

  await check("recorder: overlay appearing during the recording is caught at stop", async () => {
    const { context, page, guard } = await freshPage(browser);
    const recorder = new ScreenRecorder(page, path.join(framesRoot, "take2"), RECORDER_CONFIG, guard);
    await recorder.start();
    assert.equal(guard.violation, null);
    await injectOverlay(page);
    await recorder.stop();
    assert.ok(guard.violation, "recorder.stop did not inspect the guard");
    await context.close();
  });
} finally {
  await browser.close();
  await rm(framesRoot, { recursive: true, force: true });
}
