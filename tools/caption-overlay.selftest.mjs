// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Self-test of lib/caption-overlay.mjs against harmless data: pages (the Klacks app is never touched) and the real
 * tools/simple-videos.de.json. Covers: show / replace / hide, RTL placement with Arabic text, survival of a full navigation,
 * pointer transparency and stacking below the capture cursor and the fast-forward badge, overlap detection, the visibility
 * math across time-compressed and cut regions, and the caption file validation (cues complete, length, forbidden phrases).
 * Run: node tools/caption-overlay.selftest.mjs   (needs the Chromium used by capture-app-videos.mjs)
 */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import {
  CAPTION_ID,
  CaptionOverlay,
  DIRECTION_RTL,
  MIN_VISIBLE_SECONDS,
  captionProblems,
  captionTrackOf,
  captionVisibility,
  loadCaptionTracks,
  validateCaptionTrack,
} from "./lib/caption-overlay.mjs";
import { cursorInitScript } from "./lib/cursor-overlay.mjs";
import { ScreenRecorder } from "./lib/screen-recorder.mjs";
import {
  SIMPLE_KLACKSY_CALL_CUES,
  SIMPLE_PLANS_WEEK_CUES,
  VIDEO_SIMPLE_KLACKSY_CALL,
  VIDEO_SIMPLE_PLANS_WEEK,
  containsContactData,
} from "./takes/simple-takes.mjs";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const VIEWPORT = { width: 1000, height: 720 };
const TRACK = { a: "Erster Satz", b: "Zweiter Satz" };
const RTL_TRACK = { a: "\u0627\u0646\u0642\u0631 \u0639\u0644\u0649 Klacksy" };
const NAVIGATION_TIMEOUT_MS = 3000;
const RECORDER_CONFIG = { jpegQuality: 50, maxWidth: 400, maxHeight: 300 };
const FAST_FACTOR = 4;
const pageUrl = (body) => `data:text/html;charset=utf-8,${encodeURIComponent(`<html><body style="margin:0;height:100vh">${body}</body></html>`)}`;

async function freshPage(browser, body = "<h1>demo</h1>") {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const cursor = cursorInitScript({ x: 10, y: 10 });
  await context.addInitScript(cursor.fn, cursor.arg);
  const page = await context.newPage();
  await page.goto(pageUrl(body));
  return { context, page };
}

const captionState = (page) => page.evaluate((id) => {
  const el = document.getElementById(id);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return {
    count: document.querySelectorAll(`#${id}`).length,
    text: el.textContent,
    dir: el.getAttribute("dir"),
    direction: style.direction,
    pointerEvents: style.pointerEvents,
    z: Number(style.zIndex),
    left: box.left,
    right: box.right,
    cx: box.left + box.width / 2,
    cy: box.top + box.height / 2,
  };
}, CAPTION_ID);

const zIndexOf = (page, id) => page.evaluate((elementId) => Number(getComputedStyle(document.getElementById(elementId)).zIndex), id);

async function check(name, body) {
  await body();
  console.log(`ok  ${name}`);
}

const browser = await chromium.launch();
const framesRoot = await mkdtemp(path.join(os.tmpdir(), "caption-overlay-"));
try {
  await check("show, replace and hide keep exactly one caption and log every event", async () => {
    const { context, page } = await freshPage(browser);
    const captions = new CaptionOverlay(page, TRACK);
    await captions.show("a");
    let state = await captionState(page);
    assert.equal(state.text, TRACK.a);
    assert.equal(state.dir, "ltr");
    assert.ok(state.left < VIEWPORT.width / 2, `LTR caption should sit left, left=${state.left}`);
    await captions.show("b");
    state = await captionState(page);
    assert.equal(state.count, 1);
    assert.equal(state.text, TRACK.b);
    await captions.hide();
    assert.equal(await captionState(page), null);
    assert.equal(captions.events.length, 2);
    assert.ok(captions.events.every((e) => e.hiddenAt !== null && e.hiddenAt >= e.shownAt));
    await assert.rejects(captions.show("missing"), /no caption text/);
    captions.dispose();
    await context.close();
  });

  await check("RTL caption carries dir=rtl and sits at the right edge", async () => {
    const { context, page } = await freshPage(browser);
    assert.throws(() => new CaptionOverlay(page, RTL_TRACK, { dir: "auto" }), /caption direction/);
    const captions = new CaptionOverlay(page, RTL_TRACK, { dir: DIRECTION_RTL });
    await captions.show("a");
    const state = await captionState(page);
    assert.equal(state.dir, DIRECTION_RTL);
    assert.equal(state.direction, DIRECTION_RTL);
    assert.equal(state.text, RTL_TRACK.a);
    assert.ok(state.left > VIEWPORT.width / 2, `RTL caption should sit right, left=${state.left}`);
    captions.dispose();
    await context.close();
  });

  await check("caption survives a full page navigation", async () => {
    const { context, page } = await freshPage(browser);
    const captions = new CaptionOverlay(page, TRACK);
    await captions.show("a");
    await page.goto(pageUrl("<h1>second page</h1>"));
    await page.waitForFunction((id) => document.getElementById(id)?.textContent, CAPTION_ID, { timeout: NAVIGATION_TIMEOUT_MS });
    assert.equal((await captionState(page)).text, TRACK.a);
    captions.dispose();
    await context.close();
  });

  await check("caption ignores the pointer and stacks below cursor and fast-forward badge", async () => {
    const body = '<button id="under" style="position:fixed;left:0;bottom:0;width:100vw;height:200px">x</button>';
    const { context, page } = await freshPage(browser, body);
    const captions = new CaptionOverlay(page, TRACK);
    await captions.show("a");
    const state = await captionState(page);
    assert.equal(state.pointerEvents, "none");
    const hitId = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, { x: state.cx, y: state.cy });
    assert.equal(hitId, "under");
    const recorder = new ScreenRecorder(page, path.join(framesRoot, "badge"), RECORDER_CONFIG);
    await recorder.beginFast(FAST_FACTOR);
    assert.ok(await zIndexOf(page, "capture-fast-forward") > state.z, "badge must stack above the caption");
    assert.ok(await zIndexOf(page, "capture-cursor") > state.z, "cursor must stack above the caption");
    await recorder.endFast();
    captions.dispose();
    await context.close();
  });

  await check("covering an avoided element is recorded and reported", async () => {
    const body = '<input id="chat" style="position:fixed;left:30px;bottom:40px;width:200px;height:30px">';
    const { context, page } = await freshPage(browser, body);
    const captions = new CaptionOverlay(page, TRACK, { avoidSelectors: ["#chat", "#absent"] });
    await captions.show("a");
    assert.deepEqual(captions.overlaps, [{ cue: "a", selector: "#chat" }]);
    const problems = captionProblems([{ cue: "a", text: TRACK.a, fromSeconds: 0, seconds: 5 }], captions.overlaps, ["a"]);
    assert.ok(problems.some((p) => p.includes("covers #chat")));
    captions.dispose();
    await context.close();
  });

  await check("visibility follows the encoder clock across fast and cut regions", async () => {
    const manifest = {
      startedAt: 100,
      stoppedAt: 120,
      speedRegions: [{ from: 105, to: 115, factor: 10, cut: false }, { from: 116, to: 118, factor: null, cut: true }],
    };
    const visibility = captionVisibility(manifest, [
      { cue: "a", text: "A", shownAt: 99, hiddenAt: 104 },
      { cue: "b", text: "B", shownAt: 104, hiddenAt: 116 },
      { cue: "c", text: "C", shownAt: 116, hiddenAt: null },
      { cue: "d", text: "D", shownAt: 106, hiddenAt: 110 },
    ]);
    assert.deepEqual(visibility.map((v) => v.seconds), [4, 3, 2, 0.4]);
    assert.deepEqual(visibility.map((v) => v.fromSeconds), [0, 4, 7, 5.1]);
    const problems = captionProblems(visibility, [], ["a", "b", "c", "d", "e"]);
    assert.ok(problems.some((p) => p.includes('"d"') && p.includes(String(MIN_VISIBLE_SECONDS))));
    assert.ok(problems.some((p) => p.includes('"e" was never shown')));
    assert.equal(problems.length, 2);
  });

  await check("simple-videos.de.json is complete, short and free of forbidden phrases", async () => {
    const tracks = await loadCaptionTracks(toolsDir, "de");
    assert.deepEqual(validateCaptionTrack(VIDEO_SIMPLE_KLACKSY_CALL, captionTrackOf(tracks, VIDEO_SIMPLE_KLACKSY_CALL), Object.values(SIMPLE_KLACKSY_CALL_CUES)), []);
    assert.deepEqual(validateCaptionTrack(VIDEO_SIMPLE_PLANS_WEEK, captionTrackOf(tracks, VIDEO_SIMPLE_PLANS_WEEK), Object.values(SIMPLE_PLANS_WEEK_CUES)), []);
    assert.equal(await loadCaptionTracks(toolsDir, "xx"), null);
    const cues = Object.values(SIMPLE_PLANS_WEEK_CUES);
    const bad = validateCaptionTrack("v", { request: "Klacksy plant alles", preview: "Vorschau", extra: "x" }, cues);
    assert.ok(bad.some((p) => p.includes("forbidden phrase")));
    assert.ok(bad.some((p) => p.includes('cue "accept" has no text')));
    assert.ok(bad.some((p) => p.includes('unknown cue "extra"')));
    assert.ok(validateCaptionTrack("v", { a: "x".repeat(60) }, ["a"]).some((p) => p.includes("characters")));
    assert.deepEqual(validateCaptionTrack("v", null, ["a"]), ["v: no captions"]);
    assert.ok(validateCaptionTrack("v", { a: "Gratis testen" }, ["a"]).some((p) => p.includes('"gratis"')));
  });

  await check("contact data detection ignores dates and times but finds e-mails and phone numbers", async () => {
    assert.equal(containsContactData("Vom 2026-10-19 - 2026-10-25 arbeiten 5 Personen."), false);
    assert.equal(containsContactData("Am 19/10/2026 und am 19.10.2026 von 06:00 bis 14:00."), false);
    assert.equal(containsContactData("Ruf an: +41 52 123 45 67"), true);
    assert.equal(containsContactData("Schreib an anna@example.com"), true);
  });
} finally {
  await browser.close();
  await rm(framesRoot, { recursive: true, force: true });
}
