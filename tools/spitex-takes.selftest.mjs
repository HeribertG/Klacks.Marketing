// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Self-test of the Spitex story takes without a browser, a server or a database: the judging functions of lib/spitex-tour-state.mjs on synthetic
 * container templates (visit times, travel times, route info, break at 12:00, overlap), the bundle parameter check, and the shipped texts - every
 * message of spitex-orders-tour / spitex-tour-finish in capture-app-videos.scripts.json has a known condition and a cue that exists in
 * simple-videos.<culture>.json, every caption track passes validateCaptionTrack, and the intro/outro captions of both clips fit the reading budget
 * of the recipes (spitex-recipe-a.mjs / spitex-recipe-b.mjs, 17 characters per second).
 * Run: node tools/spitex-takes.selftest.mjs
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCaptionTrack } from "./lib/caption-overlay.mjs";
import * as D from "./lib/spitex-demo.mjs";
import * as T from "./lib/spitex-tour-state.mjs";
import {
  SPITEX_ORDERS_TOUR_CUES,
  SPITEX_TOUR_FINISH_CUES,
  VIDEO_SPITEX_ORDERS_TOUR,
  VIDEO_SPITEX_TOUR_FINISH,
} from "./takes/spitex-takes.mjs";
import * as recipeA from "./story-video/spitex-recipe-a.mjs";
import * as recipeB from "./story-video/spitex-recipe-b.mjs";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const CULTURES = ["de", "en", "fr", "it"];
const MAX_CHARS_PER_SECOND = 17;
const CONDITIONS = {
  [VIDEO_SPITEX_ORDERS_TOUR]: ["recipeOffered", "reviewStarted", "confirmationPending", "executed", "bundleHeld"],
  [VIDEO_SPITEX_TOUR_FINISH]: ["breakHeld", "routeStale", "breakDone", "assignHeld", "booked"],
};
const CUES = {
  [VIDEO_SPITEX_ORDERS_TOUR]: Object.values(SPITEX_ORDERS_TOUR_CUES),
  [VIDEO_SPITEX_TOUR_FINISH]: Object.values(SPITEX_TOUR_FINISH_CUES),
};
const MESSAGE_CUES = {
  [VIDEO_SPITEX_ORDERS_TOUR]: ["request", "accept", "confirm", "bundle"],
  [VIDEO_SPITEX_TOUR_FINISH]: ["break", "assign", "schedule"],
};

const clock = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;

function task(abbreviation, startMinutes) {
  return {
    shiftId: `shift-${abbreviation}`,
    shift: { abbreviation },
    startItem: D.ORDER.start,
    endItem: D.ORDER.end,
    timeRangeStartItem: clock(startMinutes),
    timeRangeEndItem: clock(startMinutes + D.ORDER.visitMinutes),
    travelTimeBefore: "00:10:00",
    travelTimeAfter: "00:00:00",
  };
}

function goodTemplate(startMinutes = 8 * 60) {
  const items = D.SPITEX_ABBREVIATIONS.map((abbreviation, i) => task(abbreviation, startMinutes + i * (D.ORDER.visitMinutes + 10)));
  return {
    weekday: D.DEMO_WEEKDAY,
    startBase: "Winterthur",
    endBase: "Winterthur",
    routeInfo: { totalDistanceKm: 21.4, estimatedTravelTime: "01:20:00", optimizedRoute: items.map((i) => ({ name: i.shift.abbreviation })) },
    containerTemplateItems: items,
  };
}

function withBreak(template, startItem, endItem) {
  return { ...template, containerTemplateItems: [...template.containerTemplateItems, { absenceId: "absence-1", startItem, endItem }] };
}

function testVisitProblems() {
  assert.deepEqual(T.visitProblems(goodTemplate()), []);
  assert.match(T.visitProblems(null)[0], /no template/);
  const noRoute = { ...goodTemplate(), routeInfo: null };
  assert.ok(T.visitProblems(noRoute).some((p) => /no route info/.test(p)));
  const untimed = goodTemplate();
  untimed.containerTemplateItems[3] = { ...untimed.containerTemplateItems[3], timeRangeStartItem: null, timeRangeEndItem: null };
  assert.ok(T.visitProblems(untimed).some((p) => /SXZB has no visit time/.test(p)));
  const foreign = goodTemplate();
  foreign.containerTemplateItems.push({ ...task("ZZZ", 15 * 60) });
  assert.ok(T.visitProblems(foreign).some((p) => /foreign task/.test(p)));
  const overlap = goodTemplate();
  overlap.containerTemplateItems[1] = task("SXBR", 8 * 60 + 30);
  assert.ok(T.visitProblems(overlap).some((p) => /overlaps/.test(p)));
  const late = goodTemplate(16 * 60);
  assert.ok(T.visitProblems(late).some((p) => /outside the order window/.test(p)));
  const wrongLength = goodTemplate();
  wrongLength.containerTemplateItems[0].timeRangeEndItem = clock(8 * 60 + 60);
  assert.ok(T.visitProblems(wrongLength).some((p) => /60 min/.test(p)));
  const noTravel = goodTemplate();
  noTravel.containerTemplateItems[2].travelTimeBefore = null;
  assert.ok(T.visitProblems(noTravel).some((p) => /no travel times/.test(p)));
  const seven = goodTemplate();
  seven.containerTemplateItems.pop();
  assert.ok(T.visitProblems(seven).some((p) => /7 visits/.test(p)));
}

function testBreakProblems() {
  const base = goodTemplate();
  assert.deepEqual(T.breakProblems(base), ["0 break items in the template, expected 1"]);
  const moved = goodTemplate();
  moved.containerTemplateItems.forEach((item, i) => {
    const start = (i < 4 ? 8 * 60 : 8 * 60 + 40) + i * (D.ORDER.visitMinutes + 10);
    item.timeRangeStartItem = clock(start);
    item.timeRangeEndItem = clock(start + D.ORDER.visitMinutes);
  });
  const fine = withBreak({ ...moved, containerTemplateItems: moved.containerTemplateItems.map((i, n) => (n < 4 ? i : { ...i, timeRangeStartItem: clock(13 * 60 + (n - 4) * 55), timeRangeEndItem: clock(13 * 60 + (n - 4) * 55 + 45) })) }, "12:00:00", "12:30:00");
  assert.deepEqual(T.breakProblems(fine), []);
  assert.ok(T.breakProblems(withBreak(base, "12:00:00", "12:30:00")).some((p) => /overlaps the break/.test(p)));
  assert.ok(T.breakProblems(withBreak(base, "12:15:00", "12:45:00")).some((p) => /starts at 12:15/.test(p)));
  assert.ok(T.breakProblems(withBreak(base, "12:00:00", "13:00:00")).some((p) => /lasts 60 min/.test(p)));
}

function testBundleParameters() {
  const group = { id: "AAAA-1111", name: D.GROUP.name };
  const ok = { location: "Winterthur", weekday: 4, fromTime: "07:00", untilTime: "18:00", fromDate: "2026-11-05", untilDate: "2026-11-05", groupIds: "aaaa-1111" };
  assert.deepEqual(T.bundleParameterProblems(ok, group), []);
  assert.deepEqual(T.bundleParameterProblems({ ...ok, weekday: "4", untilDate: undefined }, group), []);
  assert.ok(T.bundleParameterProblems({ ...ok, weekday: 3 }, group).some((p) => /weekday 3/.test(p)));
  assert.ok(T.bundleParameterProblems({ ...ok, groupIds: "" }, group).some((p) => /groupIds/.test(p)));
  assert.ok(T.bundleParameterProblems({ ...ok, fromDate: "2026-11-06" }, group).some((p) => /fromDate/.test(p)));
  assert.ok(T.bundleParameterProblems({ ...ok, untilDate: "2026-11-04" }, group).some((p) => /untilDate/.test(p)));
  assert.ok(T.bundleParameterProblems(null, group).length > 0);
}

function testOrderCounts() {
  const open = Object.fromEntries(D.SPITEX_ABBREVIATIONS.map((a) => [a, { open: 1, sealed: 0 }]));
  const sealed = Object.fromEntries(D.SPITEX_ABBREVIATIONS.map((a) => [a, { open: 0, sealed: 1 }]));
  assert.ok(T.noneSealed(open) && !T.allSealed(open));
  assert.ok(T.allSealed(sealed) && !T.noneSealed(sealed));
  assert.equal(T.VISIT_COUNT, 8);
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(toolsDir, file), "utf8"));
}

async function testShippedTexts() {
  const scripts = await readJson("capture-app-videos.scripts.json");
  for (const video of Object.keys(CONDITIONS)) {
    for (const culture of CULTURES) {
      const messages = scripts[video]?.[culture]?.messages ?? [];
      assert.ok(messages.length > 0, `${video}/${culture}: no messages`);
      assert.equal(messages[0].sendWhen, undefined, `${video}/${culture}: the first message must not wait`);
      const track = (await readJson(`simple-videos.${culture}.json`))[video]?.captions;
      assert.deepEqual(validateCaptionTrack(video, track, CUES[video]), [], `${video}/${culture}: caption track`);
      const used = new Set();
      for (const message of messages) {
        assert.ok(message.text.length > 0 && message.text.length < 140, `${video}/${culture}: message length`);
        assert.ok(message.sendWhen === undefined || CONDITIONS[video].includes(message.sendWhen), `${video}/${culture}: unknown condition ${message.sendWhen}`);
        assert.ok(track[message.cue] !== undefined, `${video}/${culture}: cue ${message.cue} has no caption`);
        used.add(message.cue);
      }
      for (const cue of MESSAGE_CUES[video]) assert.ok(used.has(cue), `${video}/${culture}: cue ${cue} is not tied to any message`);
      const conditions = messages.map((m) => m.sendWhen).filter(Boolean);
      for (const required of video === VIDEO_SPITEX_ORDERS_TOUR ? ["reviewStarted", "confirmationPending", "executed"] : ["breakDone", "booked"]) {
        assert.ok(conditions.includes(required), `${video}/${culture}: no message waits for ${required}`);
      }
    }
  }
}

async function testStoryCaptions() {
  for (const [recipe, prefix, label] of [[recipeA, "spitex-a-captions", "A"], [recipeB, "spitex-b-captions", "B"]]) {
    assert.equal(recipe.CAPTIONS_PREFIX, `${prefix}.`);
    const windows = recipe.captionWindows(recipe.VARIANTS[recipe.variantFor()]);
    for (const culture of CULTURES) {
      const { captions } = await readJson(`story-video/${prefix}.${culture}.json`);
      for (const key of recipe.VARIANTS.standard.captionKeys) {
        assert.ok(captions[key], `${label}/${culture}: caption ${key} missing`);
        const seconds = windows[key][1] - windows[key][0];
        const perSecond = [...captions[key]].length / seconds;
        assert.ok(perSecond <= MAX_CHARS_PER_SECOND, `${label}/${culture}/${key}: ${perSecond.toFixed(1)} chars/s`);
      }
    }
  }
  assert.notEqual(recipeA.OUTPUT_PREFIX, recipeB.OUTPUT_PREFIX);
  assert.notEqual(recipeA.TAKE_PREFIX, recipeB.TAKE_PREFIX);
}

testVisitProblems();
testBreakProblems();
testBundleParameters();
testOrderCounts();
await testShippedTexts();
await testStoryCaptions();
console.log("spitex-takes self-test: ok");
