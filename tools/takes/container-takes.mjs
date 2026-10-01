// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Video takes for the demo container "Tour Winterthur" (seeded by tools/seed-container-demo.mjs): filling the empty
 * Monday template by dragging tasks into it, and splitting a filled container work in the November schedule between
 * two employees. Both takes verify the persisted result through the API and restore the demo data afterwards (Monday
 * template emptied via the seed script, the container works of the split take deleted).
 * @param take - page, api, options, recorder, mouse, report, culture, script, viewport, scale (see recordTake)
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import {
  CANVAS_SETTLE_MS,
  HTTP_DELETE,
  HTTP_POST,
  WORKS_API,
  cellCenter,
  dateKey,
  openSchedule,
} from "../lib/schedule-grid.mjs";

export const VIDEO_CONTAINER_FILL = "container-fill";
export const VIDEO_CONTAINER_SPLIT = "container-split";
export const CONTAINER_VIDEOS = [VIDEO_CONTAINER_FILL, VIDEO_CONTAINER_SPLIT];

const ENV_CONTAINER_ID = "KLACKS_DEMO_CONTAINER_ID";
const DEFAULT_CONTAINER_ID = "01a0f40f-2cd1-725c-9c12-5afdf2d3a8fa";
const containerId = () => process.env[ENV_CONTAINER_ID] ?? DEFAULT_CONTAINER_ID;

const toolsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEED_SCRIPT = path.join(toolsDir, "seed-container-demo.mjs");
const SEED_RESET_ARGS = ["--reset-monday", "--lock-wait-s", "150"];
const SEED_TIMEOUT_MS = 5 * 60 * 1000;
const run = promisify(execFile);

const CONTAINER_TEMPLATE_PATH = "/workplace/container-template";
const TEMPLATES_API = (id) => `/api/backend/Containers/${id}/templates`;
const MONDAY = 1;
const MONDAY_BUTTON_INDEX = 1;
const SEL_WEEKDAY_BUTTONS = "label.weekday-button";
const SEL_AVAILABLE_ROWS = "#available-tasks-list tr";
const SEL_SELECTED_LIST = "#selected-tasks-list";
const SEL_SELECTED_ROWS = "#selected-tasks-list tr[cdkdrag], #selected-tasks-list tr.cdk-drag";
const SEL_SAVE = "#shift-save-btn";
const SEL_TIME_RULER = "app-time-ruler canvas.main-canvas";
const SEL_READONLY = "#container-template-wrapper.readonly-mode";

const SPLIT_DATE = "2026-11-10";
const NOVEMBER_RANGE = { from: "2026-11-01", until: "2026-11-30" };
const SPLIT_ROWS = { original: 1, replacement: 2 };
const CONTAINER_TIMES = { start: "07:00:00", end: "15:00:00", hours: 8 };
const SEL_OPEN_MENU = "app-context-menu .menu-container[style*='display: block']";
const SEL_SPLIT_ITEM = "#splitContainer";
const SEL_MODAL = "ngb-modal-window";
const SEL_SPLIT_HOURS = `${SEL_MODAL} app-time-input input.time-hour`;
const SEL_SPLIT_MINUTES = `${SEL_MODAL} app-time-input input.time-minute`;
const SEL_CLIENT_SEARCH = `${SEL_MODAL} input#clientSearch`;
const SEL_CLIENT_RESULT = `${SEL_MODAL} .search-result-item`;
const SEL_CONFLICT_ROWS = `${SEL_MODAL} .conflict-row`;
const SEL_CONFLICT_BUTTONS = ".conflict-btn";
const SEL_MODAL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const CONFLICT_BEFORE_INDEX = 0;
const HH_MM_LENGTH = 5;
const SAVE_TIMEOUT_MS = 30000;
const SPLIT_SETTLE_TIMEOUT_MS = 30000;
const SPLIT_POLL_MS = 500;
const SELECT_ALL = "Control+A";
const PARK_OFFSET = { x: -60, y: 170 };

const BEAT = { intro: 600, hover: 350, menu: 450, field: 250, afterDrop: 450, beforeSave: 600, result: 900, finalHold: 3500 };
const MOVE = { short: 350, normal: 600, drag: 900 };
const TYPE_DELAY_MS = 90;
const HALF = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const log = (...args) => console.log("  ", ...args);
const fullFrame = (take) => ({ x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale });

async function mondayItems(api) {
  const templates = (await api.json(TEMPLATES_API(containerId()))) ?? [];
  const monday = templates.find((t) => t.weekday === MONDAY && !t.isHoliday && !t.isWeekdayAndHoliday);
  return monday?.containerTemplateItems ?? [];
}

async function resetMonday(options) {
  const { stdout } = await run(process.execPath, [SEED_SCRIPT, ...SEED_RESET_ARGS, "--api-url", options.apiUrl], {
    timeout: SEED_TIMEOUT_MS,
    env: process.env,
  });
  return stdout.trim().split("\n").slice(-1)[0];
}

function center(box) {
  return { x: box.x + box.width / HALF, y: box.y + box.height / HALF };
}

export async function takeContainerFill(take) {
  const { page, api, options, recorder, mouse, report, script } = take;
  if ((await mondayItems(api)).length > 0) {
    log(`Monday template not empty - resetting first: ${await resetMonday(options)}`);
  }
  await page.goto(`${options.uiUrl}${CONTAINER_TEMPLATE_PATH}/${containerId()}`, { timeout: S.NAV_TIMEOUT_MS });
  await page.locator(SEL_WEEKDAY_BUTTONS).nth(MONDAY_BUTTON_INDEX).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.locator(SEL_TIME_RULER).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (await page.locator(SEL_READONLY).count()) throw new Error("container template is read-only (lock held by another session)");
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  let saved = false;
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await mouse.clickLocator(page.locator(SEL_WEEKDAY_BUTTONS).nth(MONDAY_BUTTON_INDEX), MOVE.normal);
    for (const abbreviation of script.tasks) {
      const row = page.locator(SEL_AVAILABLE_ROWS).filter({ hasText: abbreviation }).first();
      await row.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
      const from = center(await row.boundingBox());
      const to = center(await page.locator(SEL_SELECTED_LIST).boundingBox());
      await mouse.moveTo(from, MOVE.normal);
      await page.waitForTimeout(BEAT.hover);
      await mouse.drag(from, to, MOVE.drag);
      await page.waitForTimeout(BEAT.afterDrop);
    }
    report.selectedRows = await page.locator(SEL_SELECTED_ROWS).count();
    await page.waitForTimeout(BEAT.beforeSave);
    const response = page.waitForResponse(
      (r) => r.url().includes(TEMPLATES_API(containerId())) && r.request().method() !== "GET",
      { timeout: SAVE_TIMEOUT_MS },
    );
    await mouse.clickLocator(page.locator(SEL_SAVE), MOVE.normal);
    const result = await response;
    if (!result.ok()) throw new Error(`template save -> HTTP ${result.status()}`);
    saved = true;
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    const ruler = await page.locator(SEL_TIME_RULER).boundingBox();
    await mouse.moveTo({ x: ruler.x + ruler.width / HALF, y: ruler.y + ruler.height - PARK_OFFSET.y }, MOVE.normal);
    await page.waitForTimeout(BEAT.result);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.finalHold);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    const items = await mondayItems(api);
    report.savedItems = items.length;
    report.publishable = saved && items.length === script.tasks.length;
    if (!report.publishable) report.failure = `Monday template holds ${items.length} items instead of ${script.tasks.length}`;
    await page.close();
    report.reset = await resetMonday(options);
    report.mondayRestored = (await mondayItems(api)).length === 0;
    if (!report.mondayRestored) throw new Error("Monday template is not empty after the reset - check the demo data!");
    log(`Monday template restored (was ${items.length} items)`);
  }
}

function worksOnSplitDate(data, clientIds) {
  return data.entries.filter((e) => clientIds.includes(e.clientId) && dateKey(e.entryDate) === SPLIT_DATE);
}

async function containerWorksOnSplitDate(api, filter) {
  const data = await api.schedule(filter);
  return data.entries.filter((e) => e.entryId === containerId() && dateKey(e.entryDate) === SPLIT_DATE);
}

async function deleteWorks(api, ids) {
  for (const id of ids) {
    await api.json(`${WORKS_API}/${id}?periodStart=${NOVEMBER_RANGE.from}&periodEnd=${NOVEMBER_RANGE.until}`, { method: HTTP_DELETE });
  }
}

async function typeInto(take, selector, text) {
  const { page, mouse } = take;
  const field = page.locator(selector).first();
  await field.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(field, MOVE.short);
  await page.keyboard.press(SELECT_ALL);
  await field.pressSequentially(text, { delay: TYPE_DELAY_MS });
  await page.waitForTimeout(BEAT.field);
}

export async function takeContainerSplit(take) {
  const { page, api, options, recorder, mouse, report, script } = take;
  const { filter, data } = await openSchedule(page, options);
  const original = data.clients[SPLIT_ROWS.original];
  const replacement = data.clients[SPLIT_ROWS.replacement];
  const leftovers = await containerWorksOnSplitDate(api, filter);
  if (leftovers.length > 0) {
    log(`removing ${leftovers.length} leftover container works on ${SPLIT_DATE}`);
    await deleteWorks(api, leftovers.map((e) => e.id));
  }
  const busy = worksOnSplitDate(await api.schedule(filter), [original.id, replacement.id]);
  if (busy.length > 0) throw new Error(`${SPLIT_DATE} is not free for the two framed employees: ${JSON.stringify(busy)}`);
  const created = await api.json(WORKS_API, {
    method: HTTP_POST,
    data: {
      clientId: original.id, shiftId: containerId(), currentDate: SPLIT_DATE,
      startTime: CONTAINER_TIMES.start, endTime: CONTAINER_TIMES.end, workTime: CONTAINER_TIMES.hours,
      surcharges: 0, information: "", lockLevel: 0,
    },
  });
  Object.assign(report, {
    container: `${SPLIT_DATE} ${original.firstName} ${original.name} -> ${replacement.firstName} ${replacement.name} at ${script.splitHours}:${script.splitMinutes}`,
    originalWorkId: created?.id ?? null,
  });
  log(`split ${report.container}`);
  try {
    await openSchedule(page, options);
    const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
    const dayIndex = Math.round((Date.parse(`${SPLIT_DATE}T00:00:00Z`) - Date.parse(`${filter.periodStartDate}T00:00:00Z`)) / MS_PER_DAY);
    const cell = await cellCenter(page, SPLIT_ROWS.original, dayIndex, isRtl);
    await recorder.start();
    try {
      await page.waitForTimeout(BEAT.intro);
      await mouse.moveTo(cell, MOVE.normal);
      await page.waitForTimeout(BEAT.hover);
      await mouse.rightClick(cell, MOVE.short);
      const item = page.locator(`${SEL_OPEN_MENU} ${SEL_SPLIT_ITEM}`).first();
      await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
      await page.waitForTimeout(BEAT.menu);
      await mouse.clickLocator(item, MOVE.normal);
      await typeInto(take, SEL_SPLIT_HOURS, script.splitHours);
      await typeInto(take, SEL_SPLIT_MINUTES, script.splitMinutes);
      await typeInto(take, SEL_CLIENT_SEARCH, replacement.name.slice(0, script.searchChars));
      const result = page.locator(SEL_CLIENT_RESULT).filter({ hasText: replacement.name }).first();
      await result.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
      await mouse.clickLocator(result, MOVE.normal);
      const conflicts = page.locator(SEL_CONFLICT_ROWS);
      report.conflicts = await conflicts.count();
      for (let i = 0; i < report.conflicts; i++) {
        await mouse.clickLocator(conflicts.nth(i).locator(SEL_CONFLICT_BUTTONS).nth(CONFLICT_BEFORE_INDEX), MOVE.normal);
        await page.waitForTimeout(BEAT.field);
      }
      await page.waitForTimeout(BEAT.beforeSave);
      await mouse.clickLocator(page.locator(SEL_MODAL_SAVE), MOVE.normal);
      await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: SAVE_TIMEOUT_MS });
      const splitAt = `${script.splitHours}:${script.splitMinutes}`;
      const deadline = Date.now() + SPLIT_SETTLE_TIMEOUT_MS;
      let parts = [];
      while (Date.now() < deadline) {
        parts = await containerWorksOnSplitDate(api, filter);
        if (parts.length === 2) break;
        await page.waitForTimeout(SPLIT_POLL_MS);
      }
      report.parts = parts.map((p) => ({ clientId: p.clientId, from: p.startTime, until: p.endTime }));
      const first = parts.find((p) => p.clientId === original.id);
      const second = parts.find((p) => p.clientId === replacement.id);
      const ok = first && second && first.endTime.slice(0, HH_MM_LENGTH) === splitAt && second.startTime.slice(0, HH_MM_LENGTH) === splitAt;
      if (!ok) report.failure = `split result unexpected: ${JSON.stringify(report.parts)}`;
      await page.waitForTimeout(CANVAS_SETTLE_MS);
      await mouse.moveTo({ x: cell.x + PARK_OFFSET.x, y: cell.y + PARK_OFFSET.y }, MOVE.normal);
      await page.waitForTimeout(BEAT.result);
      report.posterAt = ScreenRecorder.now();
      await page.waitForTimeout(BEAT.finalHold);
      report.publishable = !report.failure;
    } finally {
      await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    }
  } finally {
    const remaining = await containerWorksOnSplitDate(api, filter);
    await deleteWorks(api, remaining.map((e) => e.id));
    report.cleanedUp = (await containerWorksOnSplitDate(api, filter)).length === 0;
    if (!report.cleanedUp) throw new Error(`container works on ${SPLIT_DATE} remain after the cleanup - check the demo data!`);
    log(`removed ${remaining.length} container works on ${SPLIT_DATE}`);
  }
}

export const CONTAINER_TAKE_RUNNERS = {
  [VIDEO_CONTAINER_FILL]: takeContainerFill,
  [VIDEO_CONTAINER_SPLIT]: takeContainerSplit,
};
