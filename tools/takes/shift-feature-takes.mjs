// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Video takes for the special shift features in the December 2026 schedule of the group "Besondere Dienste Winterthur" (demo data from
 * seed-shift-features-demo.mjs, definition in lib/shift-feature-demo.mjs): shift-sporadic (sporadic shift booked on two days of a week, the
 * remaining days are blocked), shift-time-range (drop opens the start dialog, a start outside the window is refused, a valid one is booked),
 * shift-sum-employees (a shift that needs three employees fills 1/3 -> 3/3), shift-quantity (a task that occurs three times per day fills
 * 1/3 -> 3/3) and shift-qualification (the employee with the mandatory qualification is booked, the one without is refused with an error toast).
 * Every shift is booked by dragging its cell from the shift section onto the employee row, like a user does. Every take verifies the persisted
 * result through the API, deletes every work of the five seed shifts afterwards and verifies that none is left and that October of the demo
 * group is unchanged (118 works).
 * The sporadic status (booked/blocked) is only refreshed by the app after a reload, so that take cuts a reload out of the video (cut region, no badge).
 * @param take - page, api, options, recorder, mouse, report, culture, viewport, scale (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { waitModalAtRest } from "../lib/modal.mjs";
import {
  CANVAS_SETTLE_MS,
  CELL_WIDTH_PX,
  SUB_ROW_HEIGHT_PX,
  HTTP_DELETE,
  HTTP_POST,
  WORKS_API,
  WORK_ENTRY_TYPE,
  cellCenter,
  dateKey,
  gridBox,
  monthFilter,
  openSchedule,
  rowBoxes,
  sameSnapshot,
  snapshotOf,
} from "../lib/schedule-grid.mjs";
import { SHIFT_ROW_HEIGHT_PX, captureShiftSchedules, shiftGeometry, shiftCellCenter, shiftRowOrder } from "../lib/schedule-timeline.mjs";
import { findGroupNodeByName } from "../lib/klacks-demo-api.mjs";
import {
  FEATURE_GROUP,
  FEATURE_SHIFTS,
  FEATURE_ABBREVIATIONS,
  FEATURE_EMPLOYEES,
  FEATURE_PERIOD_RANGE,
  SHIFT_KEY,
  employeeDefinition,
  employeeLabel,
} from "../lib/shift-feature-demo.mjs";

export const VIDEO_SHIFT_SPORADIC = "shift-sporadic";
export const VIDEO_SHIFT_TIME_RANGE = "shift-time-range";
export const VIDEO_SHIFT_SUM_EMPLOYEES = "shift-sum-employees";
export const VIDEO_SHIFT_QUANTITY = "shift-quantity";
export const VIDEO_SHIFT_QUALIFICATION = "shift-qualification";
export const SHIFT_FEATURE_VIDEOS = [
  VIDEO_SHIFT_SPORADIC,
  VIDEO_SHIFT_TIME_RANGE,
  VIDEO_SHIFT_SUM_EMPLOYEES,
  VIDEO_SHIFT_QUANTITY,
  VIDEO_SHIFT_QUALIFICATION,
];

const OCTOBER = { year: 2026, month: 10 };
const OCTOBER_RANGE = { from: "2026-10-01", until: "2026-10-31", expectedWorks: 118 };
const GROUPS_TREE_API = "/api/backend/Groups/tree";
const SHIFT_SCHEDULE_API = "/api/backend/Shifts/Schedule";
const SCHEDULE_ROW_LIMIT = 500;
const WORKS_POST_PATH = /\/api\/backend\/Works\/?$/i;
const SHIFT_CAPTURE = { quietMs: 2000, timeoutMs: 60000 };
const SAVE_TIMEOUT_MS = 30000;
const TOAST_TIMEOUT_MS = 15000;
const HH_MM_LENGTH = 5;
const HTTP_CONFLICT = 409;
const SPORADIC_NONE = 0;
const SPORADIC_BOOKED = 1;
const SPORADIC_BLOCKED = 2;
const CUT = Number.POSITIVE_INFINITY;
const HALF = 2;
const SELECT_ALL = "Control+A";
const TYPE_DELAY_MS = 70;

const SEL_MODAL = "ngb-modal-window";
const SEL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_WINDOW_HINT = `${SEL_MODAL} .window-hint`;
const SEL_DIALOG_ERROR = `${SEL_MODAL} .error-message`;
const SEL_START_HOURS = `${SEL_MODAL} #trwStartHours`;
const SEL_START_MINUTES = `${SEL_MODAL} #trwStartMinutes`;
const SEL_ERROR_TOAST = "app-toasts ngb-toast.bg-danger";

const DAY = { first: 0, second: 1, third: 2, fourth: 3, nextWeek: 6 };
const TIME_RANGE_WRONG_START = { hours: "13", minutes: "30" };
const TIME_RANGE_RIGHT_START = { hours: "10" };
const TIME_RANGE_BOOKED = { start: "10:30", end: "11:15" };
const SPORADIC_BOOKED_DAYS = [DAY.first, DAY.third];
const SPORADIC_BLOCKED_DAYS = [DAY.second, DAY.fourth];
const GRID_HEADER_HEIGHT_PX = 30;
const SECTION_SPLIT_TARGET_Y_PX = 492;
const SEL_SECTION_GUTTER = ".as-split-gutter";
const SPLIT_DIRECTION_VERTICAL = "vertical";
const SPLIT_SETTLE_MS = 1500;
const SPLIT_STEPS = 6;
const HEADER_HOVER_OFFSET_PX = 90;
const PARK_OFFSET = { x: 170, y: 45 };
const EDGE_MARGIN_PX = 30;

const BEAT = { intro: 700, hover: 400, showRow: 1500, between: 900, afterDrop: 1300, dialog: 1400, error: 2200, result: 900, finalHold: 3500, toastHold: 5000 };
const MOVE = { short: 350, normal: 650, drag: 1100 };

const log = (...args) => console.log("  ", ...args);
const fullFrame = (take) => ({ x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale });
const hhmm = (time) => String(time ?? "").slice(0, HH_MM_LENGTH);
const addDays = (isoDate, days) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 24 * 60 * 60 * 1000).toISOString().slice(0, FEATURE_PERIOD_RANGE.from.length);

async function resolveFeatureGroup(api) {
  const tree = await api.json(GROUPS_TREE_API);
  const node = findGroupNodeByName(tree?.nodes, FEATURE_GROUP.name);
  if (!node) throw new Error(`group "${FEATURE_GROUP.name}" does not exist - run seed-shift-features-demo.mjs first`);
  return { id: node.id, name: node.name };
}

async function readShiftCells(api, groupId) {
  const response = await api.json(SHIFT_SCHEDULE_API, {
    method: HTTP_POST,
    data: { startDate: FEATURE_PERIOD_RANGE.from, endDate: FEATURE_PERIOD_RANGE.until, selectedGroup: groupId, holidayDates: [], startRow: 0, rowCount: SCHEDULE_ROW_LIMIT },
  });
  return response?.shifts ?? [];
}

const cellOf = (cells, abbreviation, day) => cells.find((cell) => cell.abbreviation === abbreviation && dateKey(cell.date) === day) ?? null;

function featureWorks(data, shiftIds) {
  const ids = new Set(shiftIds.values());
  return data.entries.filter((entry) => entry.entryType === WORK_ENTRY_TYPE && ids.has(entry.entryId));
}

/**
 * Drags the splitter between the employee grid and the shift section up so that the first three employee rows and all five shift rows
 * are completely visible in the 1280x800 viewport (the default 70/30 split shows only two shift rows). The split is not persisted by
 * the app, so it has to be repeated after every reload of the schedule.
 */
async function arrangeSections(take) {
  const { page } = take;
  const gutters = await page.locator(SEL_SECTION_GUTTER).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, direction: element.parentElement?.getAttribute("direction") };
  }));
  const gutter = gutters.find((candidate) => candidate.direction === SPLIT_DIRECTION_VERTICAL);
  if (!gutter) throw new Error("the splitter between the employee grid and the shift section was not found");
  await page.mouse.move(gutter.x, gutter.y);
  await page.mouse.down();
  await page.mouse.move(gutter.x, SECTION_SPLIT_TARGET_Y_PX, { steps: SPLIT_STEPS });
  await page.mouse.up();
  await page.waitForTimeout(SPLIT_SETTLE_MS);
}

/**
 * Opens the December schedule of the feature group, checks the start state (exactly the five seed shifts, no work of them, nothing engaged
 * or sealed, October of the demo group intact) and measures the geometry the drags need. Nothing is recorded yet.
 */
async function prepare(take) {
  const { page, api, options, report } = take;
  const group = await resolveFeatureGroup(api);
  const featureOptions = { ...options, groupId: group.id };
  const capture = captureShiftSchedules(page, { ...SHIFT_CAPTURE, groupId: group.id });
  const { filter, data } = await openSchedule(page, featureOptions);
  const shiftSchedules = await capture.settle();

  const shiftIds = new Map();
  for (const cell of shiftSchedules) shiftIds.set(cell.abbreviation, cell.shiftId);
  const listed = [...shiftIds.keys()].sort();
  if (JSON.stringify(listed) !== JSON.stringify([...FEATURE_ABBREVIATIONS].sort())) {
    throw new Error(`the shift list of "${group.name}" shows ${listed.join(", ") || "nothing"} instead of ${FEATURE_ABBREVIATIONS.join(", ")} - run seed-shift-features-demo.mjs`);
  }
  const used = shiftSchedules.filter((cell) => cell.engaged > 0 || (cell.sporadicStatus ?? SPORADIC_NONE) !== SPORADIC_NONE);
  if (used.length > 0) throw new Error(`${used.length} shift cells are already engaged or sealed - run seed-shift-features-demo.mjs --reset-works`);
  const existing = featureWorks(data, shiftIds);
  if (existing.length > 0) throw new Error(`${existing.length} works of the seed shifts already exist in December - run seed-shift-features-demo.mjs --reset-works`);

  const outsideMembership = data.clients.filter((client) => client.groupItemValidFrom && dateKey(client.groupItemValidFrom) > filter.periodStartDate);
  if (outsideMembership.length > 0) throw new Error(`${outsideMembership.length} employees are not yet group members on ${filter.periodStartDate} - run seed-shift-features-demo.mjs`);

  const octoberFilter = { ...filter, selectedGroup: options.groupId, startRow: 0, rowCount: SCHEDULE_ROW_LIMIT, ...monthFilter(OCTOBER) };
  const octoberBefore = snapshotOf(await api.schedule(octoberFilter), OCTOBER_RANGE);
  if (octoberBefore.length !== OCTOBER_RANGE.expectedWorks) {
    throw new Error(`October has ${octoberBefore.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  }

  const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
  await arrangeSections(take);
  await page.mouse.move(take.mouse.x, take.mouse.y);
  const grid = await gridBox(page);
  const shiftSection = await shiftGeometry(page);
  const order = await shiftRowOrder(page, shiftSchedules);
  const ctx = {
    group, featureOptions, filter, data, shiftIds, isRtl, grid, shiftSection, order, octoberFilter, octoberBefore,
    visibleColumns: Math.floor(grid.width / CELL_WIDTH_PX),
  };
  report.geometry = { visibleColumns: ctx.visibleColumns, shiftRows: shiftSection.visibleRows, employees: data.clients.length, firstDay: filter.periodStartDate };
  report.shiftOrder = order.map((id) => [...shiftIds.entries()].find(([, value]) => value === id)?.[0]);
  log(`group "${group.name}": ${data.clients.length} employees, ${ctx.visibleColumns} days and ${shiftSection.visibleRows} shift rows visible; shift order ${report.shiftOrder.join(", ")}`);
  return ctx;
}

function shiftRowOf(ctx, def) {
  const row = ctx.order.indexOf(ctx.shiftIds.get(def.abbreviation));
  if (row < 0) throw new Error(`shift ${def.abbreviation} is not in the shift section`);
  if (row >= ctx.shiftSection.visibleRows) {
    throw new Error(`shift row of ${def.abbreviation} is ${row} but only ${ctx.shiftSection.visibleRows} shift rows are visible`);
  }
  return row;
}

async function ensureDayVisible(ctx, dayIndex) {
  if (dayIndex >= ctx.visibleColumns) throw new Error(`day column ${dayIndex} is not visible (${ctx.visibleColumns} columns)`);
}

async function ensureEmployeeRowsVisible(take, ctx, rows) {
  const boxes = await rowBoxes(take.page);
  const visibleTop = ctx.grid.y + GRID_HEADER_HEIGHT_PX;
  const visibleBottom = ctx.grid.y + ctx.grid.height;
  for (const row of rows) {
    const box = boxes[row];
    if (!box || box.top < visibleTop || box.top + box.height > visibleBottom) throw new Error(`employee row ${row} is not completely visible in the grid`);
  }
}

function rowOfEmployee(ctx, definition) {
  const row = ctx.data.clients.findIndex((client) => client.name === definition.name && client.firstName === definition.firstName);
  if (row < 0) throw new Error(`employee ${employeeLabel(definition)} is not in the schedule of "${ctx.group.name}"`);
  return row;
}

function waitWorkPost(page) {
  const posted = page.waitForResponse(
    (r) => r.request().method() === HTTP_POST && WORKS_POST_PATH.test(new URL(r.url()).pathname),
    { timeout: SAVE_TIMEOUT_MS },
  );
  posted.catch(() => {});
  return posted;
}

async function dragShift(take, ctx, def, dayIndex, row) {
  const { page, mouse } = take;
  await ensureDayVisible(ctx, dayIndex);
  const source = shiftCellCenter(ctx.shiftSection, shiftRowOf(ctx, def), dayIndex, ctx.isRtl);
  const target = await cellCenter(page, row, dayIndex, ctx.isRtl);
  await mouse.moveTo(source, MOVE.normal);
  await page.waitForTimeout(BEAT.hover);
  await mouse.drag(source, target, MOVE.drag);
  return { source, target };
}

function checkPost(ctx, response, def, dayIndex, row) {
  const body = response.request().postDataJSON() ?? {};
  const expectedDay = addDays(ctx.filter.periodStartDate, dayIndex);
  const expectedClient = ctx.data.clients[row].id;
  const landed = body.shiftId === ctx.shiftIds.get(def.abbreviation) && body.clientId === expectedClient && dateKey(body.currentDate) === expectedDay;
  return { landed, body, expectedDay };
}

async function bookByDrag(take, ctx, def, dayIndex, row) {
  const { page, report } = take;
  const posted = waitWorkPost(page);
  const { target } = await dragShift(take, ctx, def, dayIndex, row);
  const response = await posted;
  const check = checkPost(ctx, response, def, dayIndex, row);
  const entry = { shift: def.abbreviation, day: check.expectedDay, employee: employeeLabel(ctx.data.clients[row]), status: response.status() };
  (report.bookings ??= []).push(entry);
  log(`drop ${entry.shift} ${entry.day} -> ${entry.employee}: HTTP ${entry.status}`);
  if (!check.landed) throw new Error(`drop landed elsewhere: ${JSON.stringify(check.body)} (expected ${def.abbreviation} / ${entry.day} / ${entry.employee})`);
  return { response, target, ok: response.ok() };
}

async function typeInto(take, selector, text) {
  const { page, mouse } = take;
  const field = page.locator(selector);
  await field.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(field, MOVE.short);
  await page.keyboard.press(SELECT_ALL);
  await field.pressSequentially(text, { delay: TYPE_DELAY_MS });
  await page.waitForTimeout(BEAT.hover);
}

async function parkCursor(take, ctx, anchor) {
  const { mouse, viewport } = take;
  const x = Math.min(anchor.x + PARK_OFFSET.x, viewport.width - EDGE_MARGIN_PX);
  const y = Math.min(anchor.y + PARK_OFFSET.y, viewport.height - EDGE_MARGIN_PX);
  await mouse.moveTo({ x, y }, MOVE.normal);
}

async function cleanup(take, ctx) {
  const { api, report } = take;
  const works = featureWorks(await api.schedule(ctx.filter), ctx.shiftIds);
  for (const work of works) {
    await api.json(`${WORKS_API}/${work.id}?periodStart=${ctx.filter.periodStartDate}&periodEnd=${ctx.filter.periodEndDate}`, { method: HTTP_DELETE });
  }
  const left = featureWorks(await api.schedule(ctx.filter), ctx.shiftIds).length;
  const octoberAfter = snapshotOf(await api.schedule(ctx.octoberFilter), OCTOBER_RANGE);
  report.cleanup = { createdWorks: works.length, remainingWorks: left, octoberWorks: octoberAfter.length };
  report.octoberRestored = sameSnapshot(ctx.octoberBefore, octoberAfter);
  if (left !== 0) throw new Error(`${left} works of the seed shifts are left after the cleanup - run seed-shift-features-demo.mjs --reset-works`);
  if (!report.octoberRestored) throw new Error("October differs after the take - check the demo data!");
  log(`removed ${works.length} created works; none left, October unchanged (${octoberAfter.length} works)`);
}

async function runRecorded(take, ctx, scene) {
  const { recorder, report } = take;
  await recorder.start();
  try {
    await scene();
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    await cleanup(take, ctx);
  }
}

async function holdWithPoster(take, holdMs) {
  const { page, report } = take;
  await page.waitForTimeout(BEAT.result);
  report.posterAt = ScreenRecorder.now();
  await page.waitForTimeout(holdMs);
}

async function persistedWorks(take, ctx, def) {
  const works = featureWorks(await take.api.schedule(ctx.filter), ctx.shiftIds).filter((work) => work.entryId === ctx.shiftIds.get(def.abbreviation));
  return works.map((work) => ({ id: work.id, clientId: work.clientId, day: dateKey(work.entryDate), from: hhmm(work.startTime), until: hhmm(work.endTime) }));
}

export async function takeShiftSporadic(take) {
  const { page, api, mouse, report } = take;
  const ctx = await prepare(take);
  const def = FEATURE_SHIFTS[SHIFT_KEY.sporadic];
  const row = 0;
  await ensureEmployeeRowsVisible(take, ctx, [row]);
  const cells = await readShiftCells(api, ctx.group.id);
  const days = [...SPORADIC_BOOKED_DAYS, ...SPORADIC_BLOCKED_DAYS].map((index) => addDays(ctx.filter.periodStartDate, index));
  for (const day of days) {
    if (cellOf(cells, def.abbreviation, day)?.sporadicStatus !== SPORADIC_NONE) throw new Error(`${def.abbreviation} on ${day} is not free at the start`);
  }
  const shiftRow = shiftRowOf(ctx, def);
  const header = {
    x: ctx.isRtl ? ctx.shiftSection.box.x + ctx.shiftSection.box.width + HEADER_HOVER_OFFSET_PX : ctx.shiftSection.box.x - HEADER_HOVER_OFFSET_PX,
    y: ctx.shiftSection.box.y + shiftRow * SHIFT_ROW_HEIGHT_PX + SHIFT_ROW_HEIGHT_PX / HALF,
  };
  await runRecorded(take, ctx, async () => {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(header, MOVE.normal);
    await page.waitForTimeout(BEAT.showRow);
    let last = null;
    for (const dayIndex of SPORADIC_BOOKED_DAYS) {
      const booked = await bookByDrag(take, ctx, def, dayIndex, row);
      if (!booked.ok) throw new Error(`booking ${def.abbreviation} was refused (HTTP ${booked.response.status()})`);
      last = booked.target;
      await page.waitForTimeout(BEAT.afterDrop);
    }
    await page.waitForTimeout(BEAT.between);
    await mouse.moveTo(header, MOVE.normal);
    const reloaded = captureShiftSchedules(page, { ...SHIFT_CAPTURE, groupId: ctx.group.id });
    await take.recorder.beginFast(CUT);
    await openSchedule(page, ctx.featureOptions);
    const refreshed = await reloaded.settle();
    await arrangeSections(take);
    await take.recorder.endFast();
    await page.mouse.move(mouse.x, mouse.y);
    const status = (index) => cellOf(refreshed, def.abbreviation, addDays(ctx.filter.periodStartDate, index))?.sporadicStatus;
    report.statusAfterReload = Object.fromEntries([...SPORADIC_BOOKED_DAYS, ...SPORADIC_BLOCKED_DAYS, DAY.nextWeek].map((index) => [index, status(index)]));
    const ok = SPORADIC_BOOKED_DAYS.every((index) => status(index) === SPORADIC_BOOKED)
      && SPORADIC_BLOCKED_DAYS.every((index) => status(index) === SPORADIC_BLOCKED)
      && status(DAY.nextWeek) === SPORADIC_NONE;
    if (!ok) report.failure = `sporadic status after the reload is ${JSON.stringify(report.statusAfterReload)} (expected booked on ${SPORADIC_BOOKED_DAYS}, blocked on ${SPORADIC_BLOCKED_DAYS}, free next week)`;
    report.works = await persistedWorks(take, ctx, def);
    if (report.works.length !== SPORADIC_BOOKED_DAYS.length) report.failure = report.failure ?? `expected ${SPORADIC_BOOKED_DAYS.length} works, found ${report.works.length}`;
    await parkCursor(take, ctx, last ?? header);
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    await holdWithPoster(take, BEAT.finalHold);
  });
}

export async function takeShiftTimeRange(take) {
  const { page, mouse, report } = take;
  const ctx = await prepare(take);
  const def = FEATURE_SHIFTS[SHIFT_KEY.timeRange];
  const row = 0;
  await ensureEmployeeRowsVisible(take, ctx, [row]);
  await runRecorded(take, ctx, async () => {
    await page.waitForTimeout(BEAT.intro);
    const posted = waitWorkPost(page);
    const { target } = await dragShift(take, ctx, def, DAY.second, row);
    await waitModalAtRest(page);
    report.windowHint = (await page.locator(SEL_WINDOW_HINT).innerText()).replace(/\s+/g, " ").trim();
    await page.waitForTimeout(BEAT.dialog);
    await typeInto(take, SEL_START_HOURS, TIME_RANGE_WRONG_START.hours);
    await typeInto(take, SEL_START_MINUTES, TIME_RANGE_WRONG_START.minutes);
    const error = page.locator(SEL_DIALOG_ERROR);
    const errorShown = await error.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS }).then(() => true, () => false);
    report.outsideWindowError = errorShown ? (await error.innerText()).replace(/\s+/g, " ").trim() : null;
    report.saveDisabledOutsideWindow = await page.locator(SEL_SAVE).isDisabled();
    if (!errorShown || !report.saveDisabledOutsideWindow) report.failure = "a start outside the time window did not show the error with a disabled save button";
    await page.waitForTimeout(BEAT.error);
    await typeInto(take, SEL_START_HOURS, TIME_RANGE_RIGHT_START.hours);
    await error.waitFor({ state: "hidden", timeout: S.READY_TIMEOUT_MS }).catch(() => { report.failure = report.failure ?? "the error did not disappear after a valid start"; });
    await page.waitForTimeout(BEAT.dialog);
    await mouse.clickLocator(page.locator(SEL_SAVE), MOVE.normal);
    const response = await posted;
    const check = checkPost(ctx, response, def, DAY.second, row);
    report.posted = { status: response.status(), startTime: check.body.startTime, endTime: check.body.endTime, workTime: check.body.workTime };
    if (!response.ok() || !check.landed) report.failure = report.failure ?? `booking returned HTTP ${response.status()} / landed ${check.landed}`;
    await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    report.works = await persistedWorks(take, ctx, def);
    const [work] = report.works;
    if (report.works.length !== 1 || work.from !== TIME_RANGE_BOOKED.start || work.until !== TIME_RANGE_BOOKED.end) {
      report.failure = report.failure ?? `expected one work ${TIME_RANGE_BOOKED.start}-${TIME_RANGE_BOOKED.end}, found ${JSON.stringify(report.works)}`;
    }
    await page.waitForTimeout(BEAT.afterDrop);
    await parkCursor(take, ctx, target);
    await holdWithPoster(take, BEAT.finalHold);
  });
}

async function takeFillShift(take, key) {
  const { page, api, mouse, report } = take;
  const ctx = await prepare(take);
  const def = FEATURE_SHIFTS[key];
  const needed = def.sumEmployees * def.quantity;
  const rows = Array.from({ length: needed }, (_, index) => index);
  if (ctx.data.clients.length < needed) throw new Error(`only ${ctx.data.clients.length} employees in "${ctx.group.name}", need ${needed}`);
  await ensureEmployeeRowsVisible(take, ctx, rows);
  shiftRowOf(ctx, def);
  const day = addDays(ctx.filter.periodStartDate, DAY.first);
  await runRecorded(take, ctx, async () => {
    await page.waitForTimeout(BEAT.intro);
    const sourceCell = shiftCellCenter(ctx.shiftSection, shiftRowOf(ctx, def), DAY.first, ctx.isRtl);
    await mouse.moveTo(sourceCell, MOVE.normal);
    await page.waitForTimeout(BEAT.showRow);
    let last = null;
    for (const row of rows) {
      const booked = await bookByDrag(take, ctx, def, DAY.first, row);
      if (!booked.ok) throw new Error(`booking ${def.abbreviation} for employee row ${row} was refused (HTTP ${booked.response.status()})`);
      last = booked.target;
      await page.waitForTimeout(BEAT.afterDrop);
    }
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    const cell = cellOf(await readShiftCells(api, ctx.group.id), def.abbreviation, day);
    report.cellAfter = { engaged: cell?.engaged, sumEmployees: cell?.sumEmployees, quantity: cell?.quantity };
    if (cell?.engaged !== needed) report.failure = `the cell of ${def.abbreviation} on ${day} shows ${cell?.engaged} engaged instead of ${needed}`;
    report.works = await persistedWorks(take, ctx, def);
    if (report.works.length !== needed) report.failure = report.failure ?? `expected ${needed} works, found ${report.works.length}`;
    await parkCursor(take, ctx, last);
    await holdWithPoster(take, BEAT.finalHold);
  });
}

export const takeShiftSumEmployees = (take) => takeFillShift(take, SHIFT_KEY.sumEmployees);

export const takeShiftQuantity = (take) => takeFillShift(take, SHIFT_KEY.quantity);

export async function takeShiftQualification(take) {
  const { page, api, mouse, report } = take;
  const ctx = await prepare(take);
  const def = FEATURE_SHIFTS[SHIFT_KEY.qualification];
  const qualified = FEATURE_EMPLOYEES.find((employee) => employee.qualified);
  const unqualified = FEATURE_EMPLOYEES.find((employee) => !employee.qualified);
  const qualifiedRow = rowOfEmployee(ctx, qualified);
  const unqualifiedRow = rowOfEmployee(ctx, unqualified);
  await ensureEmployeeRowsVisible(take, ctx, [qualifiedRow, unqualifiedRow]);
  report.employees = { qualified: employeeLabel(qualified), unqualified: employeeLabel(unqualified) };
  const holder = await api.json(`/api/backend/Clients/${ctx.data.clients[qualifiedRow].id}`);
  const other = await api.json(`/api/backend/Clients/${ctx.data.clients[unqualifiedRow].id}`);
  if ((holder.qualifications ?? []).length === 0 || (other.qualifications ?? []).length > 0) {
    throw new Error("the qualification state of the demo employees differs from the seed - run seed-shift-features-demo.mjs");
  }
  if (!employeeDefinition(ctx.data.clients[qualifiedRow]) || !employeeDefinition(ctx.data.clients[unqualifiedRow])) throw new Error("unexpected employees in the schedule");
  await runRecorded(take, ctx, async () => {
    await page.waitForTimeout(BEAT.intro);
    const accepted = await bookByDrag(take, ctx, def, DAY.first, qualifiedRow);
    if (!accepted.ok) report.failure = `the employee with the qualification was refused (HTTP ${accepted.response.status()})`;
    await page.waitForTimeout(BEAT.afterDrop + BEAT.between);
    const rejected = await bookByDrag(take, ctx, def, DAY.second, unqualifiedRow);
    report.refusedStatus = rejected.response.status();
    if (rejected.response.status() !== HTTP_CONFLICT) report.failure = report.failure ?? `the employee without the qualification got HTTP ${rejected.response.status()} instead of ${HTTP_CONFLICT}`;
    const toast = page.locator(SEL_ERROR_TOAST).first();
    const toastShown = await toast.waitFor({ state: "visible", timeout: TOAST_TIMEOUT_MS }).then(() => true, () => false);
    report.errorToast = toastShown ? (await toast.innerText()).replace(/\s+/g, " ").trim() : null;
    if (!toastShown) report.failure = report.failure ?? "no error toast appeared after the refused booking";
    await parkCursor(take, ctx, rejected.target);
    await holdWithPoster(take, BEAT.toastHold);
    report.works = await persistedWorks(take, ctx, def);
    if (report.works.length !== 1 || report.works[0].clientId !== ctx.data.clients[qualifiedRow].id) {
      report.failure = report.failure ?? `expected exactly one work for the qualified employee, found ${JSON.stringify(report.works)}`;
    }
  });
}

export const SHIFT_FEATURE_TAKE_RUNNERS = {
  [VIDEO_SHIFT_SPORADIC]: takeShiftSporadic,
  [VIDEO_SHIFT_TIME_RANGE]: takeShiftTimeRange,
  [VIDEO_SHIFT_SUM_EMPLOYEES]: takeShiftSumEmployees,
  [VIDEO_SHIFT_QUANTITY]: takeShiftQuantity,
  [VIDEO_SHIFT_QUALIFICATION]: takeShiftQualification,
};
