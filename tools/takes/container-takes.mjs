// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Video takes for the demo container "Tour Winterthur" (seeded by tools/seed-container-demo.mjs): filling the empty
 * Monday template by dragging tasks into it, opening and splitting a filled container work in the November schedule between
 * two employees (both halves are opened and checked afterwards), and inserting a break (absence from the "Employment" tab)
 * into the filled Tuesday template and adjusting its time in the dialog. All takes verify the persisted result through the API and restore the demo data
 * afterwards (Monday/Tuesday template reset via the seed script, the container works of the split take deleted).
 * @param take - page, api, options, recorder, mouse, report, culture, script, viewport, scale (see recordTake)
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { waitModalAtRest } from "../lib/modal.mjs";
import {
  SEL_AVAILABLE_ROWS,
  SEL_SAVE,
  SEL_SELECTED_LIST,
  SEL_SELECTED_ROWS,
  SEL_TIME_RULER,
  SEL_WEEKDAY_BUTTONS,
  TEMPLATES_API,
  fitSelectedList,
  growListToContent,
  leaveEditor,
  listFullyVisible,
  openContainerEditor,
  revealInPane,
  selectWeekdayBeforeRecording,
} from "../lib/container-editor.mjs";
import {
  CANVAS_SETTLE_MS,
  HTTP_DELETE,
  HTTP_POST,
  WORKS_API,
  cellCenter,
  dateKey,
  openSchedule,
  sameSnapshot,
} from "../lib/schedule-grid.mjs";

export const VIDEO_CONTAINER_FILL = "container-fill";
export const VIDEO_CONTAINER_SPLIT = "container-split";
export const VIDEO_CONTAINER_PAUSE = "container-pause";
export const CONTAINER_VIDEOS = [VIDEO_CONTAINER_FILL, VIDEO_CONTAINER_SPLIT, VIDEO_CONTAINER_PAUSE];

const ENV_CONTAINER_ID = "KLACKS_DEMO_CONTAINER_ID";
const DEFAULT_CONTAINER_ID = "01a0f40f-2cd1-725c-9c12-5afdf2d3a8fa";
const containerId = () => process.env[ENV_CONTAINER_ID] ?? DEFAULT_CONTAINER_ID;

const toolsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEED_SCRIPT = path.join(toolsDir, "seed-container-demo.mjs");
const SEED_RESET_ARGS = ["--reset-monday", "--lock-wait-s", "150"];
const SEED_RESET_TUESDAY_ARGS = ["--reset-tuesday", "--lock-wait-s", "150"];
const SEED_TIMEOUT_MS = 5 * 60 * 1000;
const run = promisify(execFile);

const MONDAY = 1;
const MONDAY_BUTTON_INDEX = 1;

const SPLIT_DATE = "2026-11-10";
const NOVEMBER_RANGE = { from: "2026-11-01", until: "2026-11-30" };
const SPLIT_ROWS = { original: 1, replacement: 2 };
const CONTAINER_TIMES = { start: "07:00:00", end: "15:00:00", hours: 8 };
const SEL_OPEN_MENU = "app-context-menu .menu-container[style*='display: block']";
const SEL_SPLIT_ITEM = "#splitContainer";
const SEL_MODAL = "ngb-modal-window";
const SEL_SPLIT_HOURS = `${SEL_MODAL} app-time-input input.time-hour`;
const SEL_SPLIT_POINT_BUTTON = `${SEL_MODAL} .split-points .split-point-btn`;
const SEL_SPLIT_MINUTES = `${SEL_MODAL} app-time-input input.time-minute`;
const SEL_CLIENT_SEARCH = `${SEL_MODAL} input#clientSearch`;
const SEL_CLIENT_RESULT = `${SEL_MODAL} .search-result-item`;
const SEL_MODAL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const HH_MM_LENGTH = 5;
const SAVE_TIMEOUT_MS = 30000;
const SPLIT_SETTLE_TIMEOUT_MS = 30000;
const SPLIT_POLL_MS = 500;
const SELECT_ALL = "Control+A";
const PARK_OFFSET = { x: -60, y: 170 };

const BEAT = { intro: 600, hover: 350, menu: 450, field: 250, afterDrop: 450, beforeSave: 600, result: 900, ruler: 1800, finalHold: 3500 };
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

async function runSeedReset(options, resetArgs) {
  const { stdout } = await run(process.execPath, [SEED_SCRIPT, ...resetArgs, "--api-url", options.apiUrl], {
    timeout: SEED_TIMEOUT_MS,
    env: process.env,
  });
  return stdout.replace(/\s+/g, " ").trim();
}

const resetMonday = (options) => runSeedReset(options, SEED_RESET_ARGS);
const resetTuesday = (options) => runSeedReset(options, SEED_RESET_TUESDAY_ARGS);

function center(box) {
  return { x: box.x + box.width / HALF, y: box.y + box.height / HALF };
}

export async function takeContainerFill(take) {
  const { page, api, options, recorder, mouse, report, script } = take;
  if ((await mondayItems(api)).length > 0) {
    log(`Monday template not empty - resetting first: ${await resetMonday(options)}`);
  }
  await openContainerEditor(take, containerId(), () => page.locator(SEL_WEEKDAY_BUTTONS).nth(MONDAY_BUTTON_INDEX).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS }));
  await selectWeekdayBeforeRecording(page, MONDAY_BUTTON_INDEX);
  await page.locator(SEL_AVAILABLE_ROWS).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  report.listFit = await fitSelectedList(take, script.tasks.length);
  let saved = false;
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    for (const abbreviation of script.tasks) {
      const row = page.locator(SEL_AVAILABLE_ROWS).filter({ hasText: abbreviation }).first();
      await row.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
      await revealInPane(take, row, { moveMs: MOVE.normal, pauseMs: BEAT.field });
      const from = center(await row.boundingBox());
      const to = center(await page.locator(SEL_SELECTED_LIST).boundingBox());
      await mouse.moveTo(from, MOVE.normal);
      await page.waitForTimeout(BEAT.hover);
      await mouse.drag(from, to, MOVE.drag);
      await page.waitForTimeout(BEAT.afterDrop);
    }
    report.selectedRows = await page.locator(SEL_SELECTED_ROWS).count();
    report.listFullyVisible = await listFullyVisible(page);
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
    report.publishable = saved && items.length === script.tasks.length && report.listFullyVisible === true;
    if (!report.publishable) report.failure = `Monday template holds ${items.length} items instead of ${script.tasks.length} (list fully visible: ${report.listFullyVisible})`;
    report.lockReleased = await leaveEditor(page);
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

const typeInto = (take, selector, text) => typeIntoField(take, take.page.locator(selector).first(), text);

async function typeIntoField(take, field, text) {
  const { page, mouse } = take;
  await field.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(field, MOVE.short);
  await page.keyboard.press(SELECT_ALL);
  await field.pressSequentially(text, { delay: TYPE_DELAY_MS });
  await page.waitForTimeout(BEAT.field);
}

const SEL_OPEN_ITEM = "#openContainer";
const SEL_DIALOG_CANCEL = `${SEL_MODAL} .modal-footer .link-button`;
const SEL_DIALOG_LOADING = `${SEL_MODAL} .loading-indicator`;
const SEL_DIALOG_READONLY = `${SEL_MODAL} .readonly-banner`;
const SEL_DIALOG_TIME_INPUTS = `${SEL_MODAL} .time-controls-bar app-time-input`;
const SEL_DIALOG_RULER = `${SEL_MODAL} ${SEL_TIME_RULER}`;
const SEL_DIALOG_TIME_HOURS = "input.time-hour";
const SEL_DIALOG_TIME_MINUTES = "input.time-minute";
const ABBREVIATION_CELL_INDEX = 2;
const DIALOG_FROM_INDEX = 0;
const DIALOG_UNTIL_INDEX = 1;
const TIME_PAD_LENGTH = 2;
const DIALOG = { settleMs: 450, rowMoveMs: 320, rowHoldMs: 180, dwellMs: 2500, closeBeatMs: 300, dblClickOpenTimeoutMs: 3000 };
const OPENED_VIA = { doubleClick: "double-click", contextMenu: "context-menu" };
const LOCKS_API = "/api/backend/ContainerLocks";
const LOCK_RESOURCE_WORK = "ContainerWork";
const LOCK_PROBE_INSTANCE_PREFIX = "marketing-lock-probe-";
const LOCK_RELEASE_PATH = /\/ContainerLocks\/[0-9a-f-]{36}$/i;
const LOCK_RELEASE_TIMEOUT_MS = 8000;
const PARENT_TASKS = ["FZK", "WAN", "OBG"];
const REPLACEMENT_TASKS = ["DOK"];
const ALL_TASKS = [...PARENT_TASKS, ...REPLACEMENT_TASKS];

const hhmm = (value) => String(value).slice(0, HH_MM_LENGTH);
const padTime = (value) => String(value).trim().padStart(TIME_PAD_LENGTH, "0");
const describeWork = (work) => `${work.abbreviation} ${work.from}-${work.until}`;
const sortedCopy = (list) => [...list].sort();
const workIdOf = (entry) => entry.sourceId ?? entry.id;

function flag(report, message) {
  report.failure ??= message;
  log(`! ${message}`);
}

async function containerChildren(api, workId) {
  const children = await api.json(`${WORKS_API}/${workId}/Children?isHoliday=false`);
  const works = (children?.subWorks ?? [])
    .map((subWork) => ({
      id: subWork.id,
      abbreviation: subWork.shift?.abbreviation ?? subWork.shiftId,
      from: hhmm(subWork.startTime),
      until: hhmm(subWork.endTime),
    }))
    .sort((a, b) => a.from.localeCompare(b.from));
  return { works, breaks: (children?.subBreaks ?? []).length };
}

function distributionProblems(before, parent, replacement) {
  const problems = [];
  const names = (children) => sortedCopy(children.works.map((work) => work.abbreviation));
  if (!sameSnapshot(names(parent), sortedCopy(PARENT_TASKS))) {
    problems.push(`shortened parent holds [${names(parent)}] instead of [${sortedCopy(PARENT_TASKS)}]`);
  }
  if (!sameSnapshot(names(replacement), sortedCopy(REPLACEMENT_TASKS))) {
    problems.push(`new work holds [${names(replacement)}] instead of [${sortedCopy(REPLACEMENT_TASKS)}]`);
  }
  const merged = sortedCopy([...parent.works, ...replacement.works].map(describeWork));
  if (!sameSnapshot(merged, sortedCopy(before.works.map(describeWork)))) {
    problems.push(`tasks or their times changed by the split: before [${before.works.map(describeWork)}], after [${merged}]`);
  }
  if (parent.breaks + replacement.breaks !== before.breaks) {
    problems.push(`breaks changed by the split: ${before.breaks} before, ${parent.breaks + replacement.breaks} after`);
  }
  return problems;
}

async function containerWorkLockFree(api, workId) {
  const lock = await api.json(`${LOCKS_API}/Acquire`, {
    method: HTTP_POST,
    data: { resourceType: LOCK_RESOURCE_WORK, resourceId: workId, instanceId: `${LOCK_PROBE_INSTANCE_PREFIX}${Date.now()}` },
  });
  if (lock?.acquired && lock.id) await api.json(`${LOCKS_API}/${lock.id}`, { method: HTTP_DELETE });
  return Boolean(lock?.acquired);
}

async function openContainerWork(take, cell) {
  const { page, mouse } = take;
  await mouse.doubleClick(cell, MOVE.normal);
  const opened = await page.locator(SEL_MODAL).first()
    .waitFor({ state: "visible", timeout: DIALOG.dblClickOpenTimeoutMs })
    .then(() => true, () => false);
  if (opened) return OPENED_VIA.doubleClick;
  await mouse.rightClick(cell, MOVE.short);
  const item = page.locator(`${SEL_OPEN_MENU} ${SEL_OPEN_ITEM}`).first();
  await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(BEAT.menu);
  await mouse.clickLocator(item, MOVE.normal);
  return OPENED_VIA.contextMenu;
}

async function readDialogTime(page, index) {
  const input = page.locator(SEL_DIALOG_TIME_INPUTS).nth(index);
  const hours = await input.locator(SEL_DIALOG_TIME_HOURS).inputValue();
  const minutes = await input.locator(SEL_DIALOG_TIME_MINUTES).inputValue();
  return `${padTime(hours)}:${padTime(minutes)}`;
}

async function closeContainerWorkDialog(take) {
  const { page, mouse } = take;
  await page.waitForTimeout(DIALOG.closeBeatMs);
  const released = page.waitForResponse(
    (r) => r.request().method() === HTTP_DELETE && LOCK_RELEASE_PATH.test(new URL(r.url()).pathname),
    { timeout: LOCK_RELEASE_TIMEOUT_MS },
  );
  released.catch(() => {});
  await mouse.clickLocator(page.locator(SEL_DIALOG_CANCEL).first(), MOVE.normal);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: SAVE_TIMEOUT_MS });
  return released.then((response) => response.ok(), () => false);
}

/**
 * Opens the container work dialog of a schedule cell (double-click, context menu "Open" as fallback), waits until its task list
 * and time ruler are loaded, checks the shown tasks and time window, lets the cursor visit every task row and closes the dialog
 * with "Cancel" (nothing is saved). Afterwards the edit lock of the work must be free: the dialog's release request must succeed
 * and a probe acquire through the API (other instance id) must work. Mismatches are recorded as take failure.
 * @param take - page, api, mouse, report
 * @param cell - centre of the schedule cell that shows the container work
 * @param spec - label (report key), workId, expectedTasks (abbreviations), expectedFrom/expectedUntil (HH:MM of the dialog's time window)
 */
async function reviewContainerWork(take, cell, spec) {
  const { page, api, mouse, report } = take;
  const via = await openContainerWork(take, cell);
  await waitModalAtRest(page);
  const rows = page.locator(SEL_SELECTED_ROWS);
  await rows.first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.locator(SEL_DIALOG_LOADING).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await page.locator(SEL_DIALOG_RULER).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(DIALOG.settleMs);
  const startedAt = Date.now();
  const entry = { via };
  report.dialogs = { ...(report.dialogs ?? {}), [spec.label]: entry };
  entry.readOnly = (await page.locator(SEL_DIALOG_READONLY).count()) > 0;
  if (entry.readOnly) flag(report, `${spec.label} dialog opened read-only (edit lock held by someone else)`);
  if (!(await listFullyVisible(page))) {
    entry.listGrown = await growListToContent(take, { durationMs: MOVE.drag, scope: SEL_MODAL });
  }
  entry.tasks = await rows.evaluateAll((els, index) => els.map((el) => el.children[index]?.textContent.trim() ?? ""), ABBREVIATION_CELL_INDEX);
  entry.from = await readDialogTime(page, DIALOG_FROM_INDEX);
  entry.until = await readDialogTime(page, DIALOG_UNTIL_INDEX);
  if (!sameSnapshot(sortedCopy(entry.tasks), sortedCopy(spec.expectedTasks))) {
    flag(report, `${spec.label} dialog lists [${entry.tasks}] instead of [${spec.expectedTasks}]`);
  }
  if (entry.from !== spec.expectedFrom || entry.until !== spec.expectedUntil) {
    flag(report, `${spec.label} dialog shows ${entry.from}-${entry.until} instead of ${spec.expectedFrom}-${spec.expectedUntil}`);
  }
  for (let i = 0; i < entry.tasks.length; i++) {
    const box = await rows.nth(i).boundingBox();
    if (!box) continue;
    await mouse.moveTo(center(box), DIALOG.rowMoveMs);
    await page.waitForTimeout(DIALOG.rowHoldMs);
  }
  await page.waitForTimeout(Math.max(0, DIALOG.dwellMs - (Date.now() - startedAt)));
  if (await page.locator(SEL_MODAL_SAVE).isEnabled()) {
    flag(report, `${spec.label} dialog is dirty before closing (Save enabled) - "Cancel" would open a discard confirmation`);
    throw new Error(report.failure);
  }
  entry.lockReleased = await closeContainerWorkDialog(take);
  entry.lockFree = await containerWorkLockFree(api, spec.workId);
  if (!entry.lockReleased || !entry.lockFree) {
    flag(report, `${spec.label} dialog: edit lock not free after closing (release ok: ${entry.lockReleased}, probe acquire ok: ${entry.lockFree})`);
  }
  return entry;
}

/**
 * Container split in the November schedule: a container work (07:00-15:00, Tuesday template with FZK, WAN, OBG, DOK) is created for
 * one employee through the API. On camera: the container work is opened first (task list and time ruler) and closed without saving,
 * then split at the script's time between two employees (relief person). The split time lies in the gap between OBG (10:30-11:30) and
 * DOK (13:00-14:30), because a split may only fall between two tasks, never through one. Finally both halves are opened one after the
 * other (shortened parent with FZK, WAN, OBG; new work with DOK). The API check
 * compares the sub-works of both halves with the state before the split; a wrong distribution makes the take unpublishable.
 * The container works created by the take are deleted afterwards.
 */
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
  const deletedIds = [];
  try {
    const originalWorkId = created?.id;
    if (!originalWorkId) throw new Error("the container work was created without an id - cannot verify its sub-works");
    const childrenBefore = await containerChildren(api, originalWorkId);
    report.childrenBefore = childrenBefore.works.map(describeWork);
    if (!sameSnapshot(sortedCopy(childrenBefore.works.map((work) => work.abbreviation)), sortedCopy(ALL_TASKS))) {
      throw new Error(`the new container work holds [${report.childrenBefore}] instead of the tasks [${ALL_TASKS}] - check the Tuesday template of the demo container`);
    }
    await openSchedule(page, options);
    const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
    const dayIndex = Math.round((Date.parse(`${SPLIT_DATE}T00:00:00Z`) - Date.parse(`${filter.periodStartDate}T00:00:00Z`)) / MS_PER_DAY);
    const cell = await cellCenter(page, SPLIT_ROWS.original, dayIndex, isRtl);
    const replacementCell = await cellCenter(page, SPLIT_ROWS.replacement, dayIndex, isRtl);
    const splitAt = `${script.splitHours}:${script.splitMinutes}`;
    await recorder.start();
    try {
      await page.waitForTimeout(BEAT.intro);
      await mouse.moveTo(cell, MOVE.normal);
      await page.waitForTimeout(BEAT.hover);
      const preview = await reviewContainerWork(take, cell, {
        label: "beforeSplit",
        workId: originalWorkId,
        expectedTasks: ALL_TASKS,
        expectedFrom: hhmm(CONTAINER_TIMES.start),
        expectedUntil: hhmm(CONTAINER_TIMES.end),
      });
      if (!preview.lockReleased || !preview.lockFree) throw new Error(report.failure);
      await mouse.moveTo(cell, MOVE.normal);
      await page.waitForTimeout(BEAT.hover);
      await mouse.rightClick(cell, MOVE.short);
      const item = page.locator(`${SEL_OPEN_MENU} ${SEL_SPLIT_ITEM}`).first();
      await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
      await page.waitForTimeout(BEAT.menu);
      await mouse.clickLocator(item, MOVE.normal);
      const splitPointButton = page.locator(SEL_SPLIT_POINT_BUTTON).last();
      await splitPointButton.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
      await page.waitForTimeout(BEAT.hover);
      await mouse.clickLocator(splitPointButton, MOVE.normal);
      await page.waitForTimeout(BEAT.hover);
      const chosenHours = await page.locator(SEL_SPLIT_HOURS).first().inputValue();
      const chosenMinutes = await page.locator(SEL_SPLIT_MINUTES).first().inputValue();
      if (`${chosenHours}:${chosenMinutes}` !== splitAt) throw new Error(`split point button set ${chosenHours}:${chosenMinutes}, expected ${splitAt}`);
      await typeInto(take, SEL_CLIENT_SEARCH, replacement.name.slice(0, script.searchChars));
      const result = page.locator(SEL_CLIENT_RESULT).filter({ hasText: replacement.name }).first();
      await result.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
      await mouse.clickLocator(result, MOVE.normal);
      await page.waitForTimeout(BEAT.beforeSave);
      await mouse.clickLocator(page.locator(SEL_MODAL_SAVE), MOVE.normal);
      await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: SAVE_TIMEOUT_MS });
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
      if (!ok) {
        flag(report, `split result unexpected: ${JSON.stringify(report.parts)}`);
      } else {
        const parentChildren = await containerChildren(api, workIdOf(first));
        const replacementChildren = await containerChildren(api, workIdOf(second));
        report.distribution = { parent: parentChildren.works.map(describeWork), replacement: replacementChildren.works.map(describeWork) };
        const problems = distributionProblems(childrenBefore, parentChildren, replacementChildren);
        report.distributionOk = problems.length === 0;
        if (problems.length > 0) flag(report, `sub-works not distributed as expected: ${problems.join("; ")}`);
      }
      await page.waitForTimeout(CANVAS_SETTLE_MS);
      await mouse.moveTo({ x: cell.x + PARK_OFFSET.x, y: cell.y + PARK_OFFSET.y }, MOVE.normal);
      await page.waitForTimeout(BEAT.result);
      if (!report.failure) {
        await reviewContainerWork(take, cell, {
          label: "parentAfterSplit",
          workId: workIdOf(first),
          expectedTasks: PARENT_TASKS,
          expectedFrom: hhmm(CONTAINER_TIMES.start),
          expectedUntil: splitAt,
        });
        await reviewContainerWork(take, replacementCell, {
          label: "replacementAfterSplit",
          workId: workIdOf(second),
          expectedTasks: REPLACEMENT_TASKS,
          expectedFrom: splitAt,
          expectedUntil: hhmm(CONTAINER_TIMES.end),
        });
        await mouse.moveTo({ x: cell.x + PARK_OFFSET.x, y: cell.y + PARK_OFFSET.y }, MOVE.normal);
        await page.waitForTimeout(BEAT.result);
      }
      report.posterAt = ScreenRecorder.now();
      await page.waitForTimeout(BEAT.finalHold);
      report.publishable = !report.failure;
    } finally {
      await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    }
  } finally {
    const remaining = await containerWorksOnSplitDate(api, filter);
    deletedIds.push(...remaining.map(workIdOf));
    await deleteWorks(api, remaining.map((e) => e.id));
    report.cleanedUp = (await containerWorksOnSplitDate(api, filter)).length === 0;
    if (!report.cleanedUp) throw new Error(`container works on ${SPLIT_DATE} remain after the cleanup - check the demo data!`);
    let orphans = 0;
    for (const id of deletedIds) orphans += (await containerChildren(api, id).catch(() => ({ works: [] }))).works.length;
    report.orphanSubWorks = orphans;
    if (orphans > 0) log(`! ${orphans} sub-works of the deleted container works still exist - check the demo data`);
    log(`removed ${remaining.length} container works on ${SPLIT_DATE}`);
  }
}

const TUESDAY = 2;
const TUESDAY_BUTTON_INDEX = 2;
const TUESDAY_ITEM_COUNT = 4;
const SEL_EMPLOYMENT_TAB = "button.tab.permanent-tab";
const SEL_ABSENCE_ROWS = "#container-absences-list tr";
const SEL_ABSENCE_CELL = "td";
const SEL_SELECTED_ABSENCE_ROWS = "#selected-tasks-list tr.absence-item";
const ABSENCE_ITEM_CLASS = "absence-item";
const SEL_MODAL_TITLE = `${SEL_MODAL} .modal-title`;
const SEL_MODAL_TIME_INPUT = `${SEL_MODAL} app-time-input`;
const SEL_TIME_HOURS = "input.time-hour";
const SEL_TIME_MINUTES = "input.time-minute";
const END_TIME_INPUT_INDEX = 1;
const DROP_ROW_FRACTION = 0.25;
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

async function tuesdayItems(api) {
  const templates = (await api.json(TEMPLATES_API(containerId()))) ?? [];
  const tuesday = templates.find((t) => t.weekday === TUESDAY && !t.isHoliday && !t.isWeekdayAndHoliday);
  return tuesday?.containerTemplateItems ?? [];
}

const isSeededTuesday = (items) => items.length === TUESDAY_ITEM_COUNT && items.every((item) => !item.absenceId);

function itemSnapshot(items) {
  return items
    .map((item) => [item.shiftId ?? "", item.absenceId ?? "", item.startItem?.slice(0, HH_MM_LENGTH), item.endItem?.slice(0, HH_MM_LENGTH)].join("|"))
    .sort();
}

function pauseStartAfterPrevious(items, beforeTask) {
  const sorted = [...items].sort((a, b) => a.startItem.localeCompare(b.startItem));
  const index = sorted.findIndex((item) => item.shift?.abbreviation === beforeTask);
  if (index < 1) throw new Error(`task ${beforeTask} is missing in the Tuesday template or has no predecessor`);
  return sorted[index - 1].endItem.slice(0, HH_MM_LENGTH);
}

function absenceRow(page, abbreviation) {
  const exact = new RegExp(`^\\s*${abbreviation.replace(REGEX_SPECIAL_CHARS, "\\$&")}\\s*$`);
  return page.locator(SEL_ABSENCE_ROWS).filter({ has: page.locator(SEL_ABSENCE_CELL).filter({ hasText: exact }) }).first();
}

function assertInViewport(box, viewport, what) {
  if (!box || box.y < 0 || box.y + box.height > viewport.height) {
    throw new Error(`${what} is not fully inside the viewport (${JSON.stringify(box)}) - enlarge the viewport or shrink the zone`);
  }
}

/**
 * Tuesday template (filled by the seed script with four tasks): the "Employment" tab lists the container absences; the
 * unpaid break is dragged between two tasks (the lunch gap), its end time is set in the time dialog (double-click on
 * the row) and the template is saved. The API check compares the break times and the four untouched tasks; afterwards
 * the break is removed again by resetting the Tuesday template through the seed script.
 */
export async function takeContainerPause(take) {
  const { page, api, options, recorder, mouse, report, script, viewport } = take;
  log(`Tuesday template check before the take: ${await resetTuesday(options)}`);
  const before = await tuesdayItems(api);
  if (!isSeededTuesday(before)) throw new Error(`Tuesday template holds ${before.length} items instead of ${TUESDAY_ITEM_COUNT} plain tasks - check the demo data!`);
  const original = itemSnapshot(before);
  const expectedStart = pauseStartAfterPrevious(before, script.beforeTask);
  const expectedEnd = `${script.endHours}:${script.endMinutes}`;
  report.expectedPause = `${expectedStart}-${expectedEnd}`;
  await openContainerEditor(take, containerId(), () => page.locator(SEL_WEEKDAY_BUTTONS).nth(TUESDAY_BUTTON_INDEX).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS }));
  await selectWeekdayBeforeRecording(page, TUESDAY_BUTTON_INDEX);
  const rows = page.locator(SEL_SELECTED_ROWS);
  await rows.nth(TUESDAY_ITEM_COUNT - 1).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  report.rowsBefore = await rows.count();
  if (report.rowsBefore !== TUESDAY_ITEM_COUNT) throw new Error(`Tuesday shows ${report.rowsBefore} rows instead of ${TUESDAY_ITEM_COUNT}`);
  report.listFit = await fitSelectedList(take, TUESDAY_ITEM_COUNT);
  let saved = false;
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(center(await rows.first().boundingBox()), MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    await mouse.clickLocator(page.locator(SEL_EMPLOYMENT_TAB), MOVE.normal);
    const source = absenceRow(page, script.absence);
    await source.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    await revealInPane(take, source, { moveMs: MOVE.normal, pauseMs: BEAT.field });
    const target = rows.filter({ hasText: script.beforeTask }).first();
    const targetBox = await target.boundingBox();
    assertInViewport(targetBox, viewport, `task row ${script.beforeTask}`);
    const targetIndex = await rows.evaluateAll((els, text) => els.findIndex((el) => el.textContent.includes(text)), script.beforeTask);
    const from = center(await source.boundingBox());
    const to = { x: targetBox.x + targetBox.width / HALF, y: targetBox.y + targetBox.height * DROP_ROW_FRACTION };
    await mouse.moveTo(from, MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    await mouse.drag(from, to, MOVE.drag);
    await page.waitForTimeout(BEAT.afterDrop);
    await page.waitForFunction(
      ({ selector, count }) => document.querySelectorAll(selector).length === count,
      { selector: SEL_SELECTED_ROWS, count: TUESDAY_ITEM_COUNT + 1 },
      { timeout: S.READY_TIMEOUT_MS },
    );
    report.rowsAfterDrop = await rows.count();
    report.pauseRowIndex = await rows.evaluateAll((els, cls) => els.findIndex((el) => el.classList.contains(cls)), ABSENCE_ITEM_CLASS);
    if (report.rowsAfterDrop !== TUESDAY_ITEM_COUNT + 1 || report.pauseRowIndex !== targetIndex) {
      throw new Error(`break landed at row ${report.pauseRowIndex} of ${report.rowsAfterDrop} instead of row ${targetIndex} of ${TUESDAY_ITEM_COUNT + 1}`);
    }
    await page.waitForTimeout(BEAT.menu);
    report.listGrown = await growListToContent(take, { durationMs: MOVE.drag });
    await page.waitForTimeout(BEAT.afterDrop);
    const pauseRow = page.locator(SEL_SELECTED_ABSENCE_ROWS).first();
    const pauseBox = await pauseRow.boundingBox();
    assertInViewport(pauseBox, viewport, "break row");
    await mouse.doubleClick(center(pauseBox), MOVE.normal);
    await waitModalAtRest(page);
    report.dialogTitle = (await page.locator(SEL_MODAL_TITLE).first().innerText()).trim();
    await page.waitForTimeout(BEAT.menu);
    const endInput = page.locator(SEL_MODAL_TIME_INPUT).nth(END_TIME_INPUT_INDEX);
    await typeIntoField(take, endInput.locator(SEL_TIME_HOURS), script.endHours);
    await typeIntoField(take, endInput.locator(SEL_TIME_MINUTES), script.endMinutes);
    await page.waitForTimeout(BEAT.beforeSave);
    await mouse.clickLocator(page.locator(SEL_MODAL_SAVE), MOVE.normal);
    await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: SAVE_TIMEOUT_MS });
    await page.waitForTimeout(BEAT.afterDrop);
    report.pauseRowText = (await pauseRow.innerText()).replace(/\s+/g, " ").trim();
    if (!report.pauseRowText.includes(`${expectedStart} - ${expectedEnd}`)) {
      report.failure = `break row shows "${report.pauseRowText}" instead of ${expectedStart} - ${expectedEnd}`;
    }
    const ruler = await page.locator(SEL_TIME_RULER).boundingBox();
    await mouse.moveTo({ x: ruler.x + ruler.width / HALF, y: ruler.y + ruler.height / HALF }, MOVE.normal);
    await page.waitForTimeout(BEAT.ruler);
    const response = page.waitForResponse(
      (r) => r.url().includes(TEMPLATES_API(containerId())) && r.request().method() !== "GET",
      { timeout: SAVE_TIMEOUT_MS },
    );
    await mouse.clickLocator(page.locator(SEL_SAVE), MOVE.normal);
    const result = await response;
    if (!result.ok()) throw new Error(`template save -> HTTP ${result.status()}`);
    saved = true;
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    await mouse.moveTo({ x: ruler.x + ruler.width / HALF, y: ruler.y + ruler.height - PARK_OFFSET.y }, MOVE.normal);
    await page.waitForTimeout(BEAT.result);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.finalHold);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    report.listFullyVisible = await listFullyVisible(page).catch(() => false);
    const after = await tuesdayItems(api);
    const pauses = after.filter((item) => item.absenceId);
    const pause = pauses[0];
    report.savedItems = after.length;
    report.savedPause = pause ? `${pause.startItem?.slice(0, HH_MM_LENGTH)}-${pause.endItem?.slice(0, HH_MM_LENGTH)}` : null;
    const tasksKept = sameSnapshot(original, itemSnapshot(after.filter((item) => !item.absenceId)));
    const persisted = saved && after.length === TUESDAY_ITEM_COUNT + 1 && pauses.length === 1 && report.savedPause === report.expectedPause && tasksKept;
    report.publishable = persisted && report.listFullyVisible === true && !report.failure;
    if (!persisted && !report.failure) {
      report.failure = `list fully visible: ${report.listFullyVisible}, saved Tuesday template: ${after.length} items, breaks [${pauses.map((p) => `${p.startItem}-${p.endItem}`)}], expected ${report.expectedPause}, tasks unchanged: ${tasksKept}`;
    }
    report.lockReleased = await leaveEditor(page);
    await page.close();
    report.reset = await resetTuesday(options);
    const restored = await tuesdayItems(api);
    report.tuesdayRestored = isSeededTuesday(restored) && sameSnapshot(original, itemSnapshot(restored));
    if (!report.tuesdayRestored) throw new Error("Tuesday template differs from the seed state after the reset - check the demo data!");
    log(`Tuesday template restored (was ${after.length} items)`);
  }
}

export const CONTAINER_TAKE_RUNNERS = {
  [VIDEO_CONTAINER_FILL]: takeContainerFill,
  [VIDEO_CONTAINER_SPLIT]: takeContainerSplit,
  [VIDEO_CONTAINER_PAUSE]: takeContainerPause,
};
