// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Video takes for the schedule timeline ("Tagesverlauf"): switching the October schedule from table to the 24-hour
 * timeline and scrolling through days/rows so night and day shifts become visible (no data change), and dragging a
 * shift from the shift section onto a free employee on a weekday of the October day view (06-19), so the dropped block
 * sits in a full plan. The drag take verifies the created work through the API, deletes every work it created and
 * verifies October is identical again (118 works).
 * Moving the created block to another employee is deliberately NOT shown: the timeline canvas only selects blocks on
 * mousedown (TimelineGridEventsDirective.respondToLeftButtonMouseDown); the hold-then-drag cell move exists only in
 * GridTemplateEventsDirective, which is bound to the table and shift surfaces.
 * @param take - page, api, options, recorder, mouse, report, culture, script, viewport, scale (see recordTake)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import {
  CANVAS_SETTLE_MS,
  HTTP_DELETE,
  HTTP_POST,
  WORKS_API,
  dateKey,
  monthFilter,
  openSchedule,
  sameSnapshot,
  snapshotOf,
  worksIn,
} from "../lib/schedule-grid.mjs";
import {
  SEL_TABLE_CANVAS,
  SEL_TIMELINE_CANVAS,
  TIMELINE_RANGE_DAY,
  TIMELINE_RANGE_FULL,
  blockCenter,
  captureShiftSchedules,
  chooseTimelineRange,
  minutesOf,
  readViewState,
  rowTop,
  seedTimelineStorage,
  shiftCellCenter,
  shiftGeometry,
  shiftRowOrder,
  switchToTimeline,
  timelineGeometry,
  wheelTimeline,
} from "../lib/schedule-timeline.mjs";

export const VIDEO_TIMELINE_24H = "timeline-24h";
export const VIDEO_TIMELINE_DAY_DRAGDROP = "timeline-day-dragdrop";
export const TIMELINE_VIDEOS = [VIDEO_TIMELINE_24H, VIDEO_TIMELINE_DAY_DRAGDROP];

const OCTOBER = { year: 2026, month: 10 };
const OCTOBER_RANGE = { from: "2026-10-01", until: "2026-10-31", expectedWorks: 118 };

const OVERVIEW = { rowHeightFactor: 0.65, scrollDays: 7, scrollRows: 2, minVisibleRows: 2 };
const DRAGDROP = { rowHeightFactor: 0.5, minVisibleRows: 2, pickDays: { min: 2, max: 6 } };

const DAY_WINDOW = { from: 6 * 60, until: 19 * 60 };
const NIGHT_START_BEFORE = 6 * 60;
const NIGHT_END_AFTER = 22 * 60;
const SHIFT_TYPE_TASK = 0;
const SEED_ROUTE_SHIFT_PATTERN = /^(KT\d{2}|ST\d{2}|KTW|STW)$/;
const ISO_SATURDAY = 6;
const ISO_SUNDAY = 7;
const SPORADIC_NONE = 0;
const WORKS_POST_PATH = /\/api\/backend\/Works\/?$/i;
const SHIFT_CAPTURE = { quietMs: 2000, timeoutMs: 60000 };
const SAVE_TIMEOUT_MS = 30000;
const SEL_MODAL = "ngb-modal-window";
const PARK_OFFSET = { x: 140, y: 60 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HALF = 2;

const BEAT = { intro: 700, hover: 400, menu: 450, afterSwitch: 1200, afterRange: 1400, wheel: 650, between: 900, afterDrop: 1600, result: 900, finalHold: 3500 };
const MOVE = { short: 350, normal: 650, drag: 2800 };

const log = (...args) => console.log("  ", ...args);
const fullFrame = (take) => ({ x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale });
const dayIndexOf = (filter, isoDate) => Math.round((Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${filter.periodStartDate}T00:00:00Z`)) / MS_PER_DAY);
const isoWeekday = (isoDate) => new Date(`${isoDate}T00:00:00Z`).getUTCDay() || ISO_SUNDAY;
const addDays = (isoDate, days) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);

function isNightWork(work) {
  const start = minutesOf(work.startTime);
  const end = minutesOf(work.endTime);
  return end <= start || start < NIGHT_START_BEFORE || end > NIGHT_END_AFTER;
}

function isDayWork(work) {
  const start = minutesOf(work.startTime);
  const end = minutesOf(work.endTime);
  return end > start && start >= DAY_WINDOW.from && end <= DAY_WINDOW.until;
}

async function assertTableStart(page) {
  const state = await readViewState(page);
  if (state.viewMode !== S.VIEW_MODE_TABLE) throw new Error(`schedule did not open in table mode (viewMode=${state.viewMode})`);
  await page.locator(SEL_TABLE_CANVAS).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (await page.locator(SEL_TIMELINE_CANVAS).count()) throw new Error("timeline canvas present although the table should be shown");
}

async function octoberSnapshot(api, filter) {
  return snapshotOf(await api.schedule({ ...filter, ...monthFilter(OCTOBER) }), OCTOBER_RANGE);
}

/**
 * Counts the night and day works inside the rows/day columns the viewer sees before and after scrolling, so the
 * take is only publishable when both kinds really appear on screen.
 */
function shownWorks(data, filter, frames) {
  const rowOf = new Map(data.clients.map((c, i) => [c.id, i]));
  const works = worksIn(data, filter.periodStartDate, filter.periodEndDate).filter((w) => {
    const row = rowOf.get(w.clientId);
    const col = dayIndexOf(filter, dateKey(w.entryDate));
    return frames.some((f) => row >= f.row && row < f.row + f.rows && col >= f.col && col < f.col + f.cols);
  });
  return { night: works.filter(isNightWork).length, day: works.filter(isDayWork).length };
}

export async function takeTimeline24h(take) {
  const { page, api, options, recorder, mouse, report } = take;
  await seedTimelineStorage(page, { range: TIMELINE_RANGE_DAY, rowHeightFactor: OVERVIEW.rowHeightFactor });
  const { filter, data } = await openSchedule(page, options);
  const before = snapshotOf(data, OCTOBER_RANGE);
  if (before.length !== OCTOBER_RANGE.expectedWorks) {
    throw new Error(`October has ${before.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  }
  await assertTableStart(page);
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await switchToTimeline(page, mouse, MOVE.normal);
    await page.waitForTimeout(BEAT.afterSwitch);
    await chooseTimelineRange(page, mouse, TIMELINE_RANGE_FULL, MOVE.normal, BEAT.menu);
    const geometry = await timelineGeometry(page, { range: TIMELINE_RANGE_FULL, rowHeightFactor: OVERVIEW.rowHeightFactor });
    report.geometry = { cellHeight: geometry.cellHeight, visibleRows: geometry.visibleRows, visibleColumns: geometry.visibleColumns, canvasHeight: geometry.box.height, canvasWidth: geometry.box.width };
    log(`timeline: ${geometry.visibleRows} rows x ${geometry.visibleColumns} days visible (row ${geometry.cellHeight}px)`);
    if (geometry.visibleRows < OVERVIEW.minVisibleRows) throw new Error(`only ${geometry.visibleRows} employee rows visible in the timeline`);
    await page.waitForTimeout(BEAT.afterRange);
    const centre = { x: geometry.box.x + geometry.box.width / HALF, y: geometry.box.y + geometry.box.height / HALF };
    await wheelTimeline(page, mouse, centre, { dx: 1, ticks: OVERVIEW.scrollDays, pauseMs: BEAT.wheel });
    await page.waitForTimeout(BEAT.between);
    const rowsToScroll = Math.max(0, Math.min(OVERVIEW.scrollRows, data.clients.length - geometry.visibleRows));
    await wheelTimeline(page, mouse, centre, { dy: 1, ticks: rowsToScroll, pauseMs: BEAT.wheel });
    report.scrolled = { days: OVERVIEW.scrollDays, rows: rowsToScroll };
    report.shown = shownWorks(data, filter, [
      { row: 0, rows: geometry.visibleRows, col: 0, cols: geometry.visibleColumns },
      { row: 0, rows: geometry.visibleRows, col: OVERVIEW.scrollDays, cols: geometry.visibleColumns },
      { row: rowsToScroll, rows: geometry.visibleRows, col: OVERVIEW.scrollDays, cols: geometry.visibleColumns },
    ]);
    log(`shown works: ${report.shown.night} night, ${report.shown.day} day`);
    if (report.shown.night === 0 || report.shown.day === 0) report.failure = `framed rows/days show ${JSON.stringify(report.shown)} - need night and day shifts`;
    await mouse.moveTo({ x: geometry.box.x + geometry.box.width - PARK_OFFSET.x, y: geometry.box.y + PARK_OFFSET.y }, MOVE.normal);
    await page.waitForTimeout(BEAT.result);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.finalHold);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    report.octoberRestored = sameSnapshot(before, await octoberSnapshot(api, filter));
    if (!report.octoberRestored) throw new Error("October changed during the timeline take - check the demo data!");
    log("October unchanged");
  }
}

function hasMembership(client, day) {
  if (client.groupItemValidFrom && dateKey(client.groupItemValidFrom) > day) return false;
  if (client.groupItemValidUntil && dateKey(client.groupItemValidUntil) < day) return false;
  return true;
}

function droppableShift(s) {
  const start = minutesOf(s.startShift);
  const end = minutesOf(s.endShift);
  return s.shiftType === SHIFT_TYPE_TASK && !s.isTimeRange && (s.sporadicStatus ?? SPORADIC_NONE) === SPORADIC_NONE
    && s.engaged < s.sumEmployees * s.quantity && end > start && start >= DAY_WINDOW.from && end <= DAY_WINDOW.until;
}

/**
 * Picks day, employee and shift: an October weekday in the visible columns (weekdays carry the fuller plan), the lowest visible
 * employee row that is completely free that day and the longest day-view shift whose shift-section row is visible.
 */
function pickDrop(data, filter, shiftSchedules, shiftOrder, geometry, shiftRows) {
  const busy = new Set(data.entries.map((e) => `${e.clientId}|${dateKey(e.entryDate)}`));
  const lastDay = Math.min(DRAGDROP.pickDays.max, geometry.visibleColumns - 1);
  for (let index = DRAGDROP.pickDays.min; index <= lastDay; index++) {
    const day = addDays(filter.periodStartDate, index);
    if (day < OCTOBER_RANGE.from || day > OCTOBER_RANGE.until || isoWeekday(day) >= ISO_SATURDAY) continue;
    const rows = data.clients.slice(0, geometry.visibleRows).map((client, row) => ({ client, row }))
      .filter(({ client }) => !busy.has(`${client.id}|${day}`) && hasMembership(client, day));
    if (rows.length === 0) continue;
    const shifts = shiftSchedules
      .filter((s) => dateKey(s.date) === day && droppableShift(s))
      .map((s) => ({ shift: s, shiftRow: shiftOrder.indexOf(s.shiftId) }))
      .filter(({ shiftRow }) => shiftRow >= 0 && shiftRow < shiftRows)
      .sort((a, b) => (minutesOf(b.shift.endShift) - minutesOf(b.shift.startShift)) - (minutesOf(a.shift.endShift) - minutesOf(a.shift.startShift))
        || a.shiftRow - b.shiftRow);
    if (shifts.length === 0) continue;
    const target = rows[rows.length - 1];
    return { day, dayIndex: index, ...target, ...shifts[0] };
  }
  throw new Error("no free employee/weekday with a droppable day shift in the visible October rows/columns");
}

function octoberWorks(data) {
  return worksIn(data, OCTOBER_RANGE.from, OCTOBER_RANGE.until);
}

async function deleteWorks(api, ids) {
  for (const id of ids) {
    await api.json(`${WORKS_API}/${id}?periodStart=${OCTOBER_RANGE.from}&periodEnd=${OCTOBER_RANGE.until}`, { method: HTTP_DELETE });
  }
}

export async function takeTimelineDayDragDrop(take) {
  const { page, api, options, recorder, mouse, report } = take;
  await seedTimelineStorage(page, { range: TIMELINE_RANGE_FULL, rowHeightFactor: DRAGDROP.rowHeightFactor });
  const shiftCapture = captureShiftSchedules(page, SHIFT_CAPTURE);
  const { filter, data } = await openSchedule(page, options);
  const shiftSchedules = await shiftCapture.settle();
  const listedShifts = [...new Set(shiftSchedules.map((s) => s.abbreviation))];
  report.shiftListCount = listedShifts.length;
  report.seedShiftsInList = listedShifts.filter((abbreviation) => SEED_ROUTE_SHIFT_PATTERN.test(abbreviation));
  if (report.seedShiftsInList.length > 0) throw new Error(`the shift list shows route-seed shifts ${report.seedShiftsInList.join(", ")} - check the group of the seed shifts`);
  const octoberBefore = snapshotOf(data, OCTOBER_RANGE);
  if (octoberBefore.length !== OCTOBER_RANGE.expectedWorks) {
    throw new Error(`October has ${octoberBefore.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  }
  const knownIds = new Set(octoberWorks(data).map((w) => w.id));
  await assertTableStart(page);
  await switchToTimeline(page, null);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
  const geometry = await timelineGeometry(page, { range: TIMELINE_RANGE_DAY, rowHeightFactor: DRAGDROP.rowHeightFactor });
  const shiftSection = await shiftGeometry(page);
  report.geometry = { cellHeight: geometry.cellHeight, visibleRows: geometry.visibleRows, visibleColumns: geometry.visibleColumns, shiftRows: shiftSection.visibleRows };
  log(`timeline: ${geometry.visibleRows} rows x ${geometry.visibleColumns} days, shift section ${shiftSection.visibleRows} rows`);
  if (geometry.visibleRows < DRAGDROP.minVisibleRows) throw new Error(`only ${geometry.visibleRows} employee rows visible in the timeline`);
  const pick = pickDrop(data, filter, shiftSchedules, await shiftRowOrder(page, shiftSchedules), geometry, shiftSection.visibleRows);
  Object.assign(report, {
    drop: `${pick.shift.abbreviation} ${pick.shift.startShift}-${pick.shift.endShift} -> ${pick.client.firstName} ${pick.client.name} on ${pick.day}`,
    shiftRow: pick.shiftRow,
    clientRow: pick.row,
  });
  log(`drop ${report.drop} (shift row ${pick.shiftRow}, employee row ${pick.row})`);
  const source = shiftCellCenter(shiftSection, pick.shiftRow, pick.dayIndex, isRtl);
  try {
    await recorder.start();
    await page.waitForTimeout(BEAT.intro);
    await chooseTimelineRange(page, mouse, TIMELINE_RANGE_DAY, MOVE.normal, BEAT.menu);
    const target = blockCenter(geometry, pick.row, pick.dayIndex, pick.shift.startShift, pick.shift.endShift, isRtl);
    const top = rowTop(geometry, pick.row);
    const insideCanvas = target.x > geometry.box.x && target.x < geometry.box.x + geometry.box.width;
    if (!insideCanvas || target.y <= top || target.y >= top + geometry.cellHeight) throw new Error("drop target outside the employee row");
    await mouse.moveTo(source, MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    const created = page.waitForResponse(
      (r) => r.request().method() === HTTP_POST && WORKS_POST_PATH.test(new URL(r.url()).pathname),
      { timeout: SAVE_TIMEOUT_MS },
    );
    report.dragWindow = { from: ScreenRecorder.now() };
    await mouse.drag(source, target, MOVE.drag);
    report.dragWindow.to = ScreenRecorder.now();
    const response = await created;
    const body = response.request().postDataJSON() ?? {};
    report.posted = { status: response.status(), shiftId: body.shiftId, clientId: body.clientId, currentDate: body.currentDate };
    if (!response.ok()) throw new Error(`POST Works -> HTTP ${response.status()}`);
    if (body.shiftId !== pick.shift.shiftId || body.clientId !== pick.client.id || dateKey(body.currentDate) !== pick.day) {
      throw new Error(`drop landed elsewhere: ${JSON.stringify(report.posted)} (expected ${pick.shift.shiftId} / ${pick.client.id} / ${pick.day})`);
    }
    if (await page.locator(SEL_MODAL).count()) throw new Error("a dialog opened after the drop (time-range shift?)");
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    const after = octoberWorks(await api.schedule(filter)).filter((w) => !knownIds.has(w.id));
    report.createdWorks = after.map((w) => ({ id: w.id, clientId: w.clientId, day: dateKey(w.entryDate), shiftId: w.entryId, from: w.startTime, until: w.endTime }));
    const ok = after.length === 1 && after[0].clientId === pick.client.id && dateKey(after[0].entryDate) === pick.day
      && after[0].entryId === pick.shift.shiftId;
    if (!ok) report.failure = `expected exactly one new work for the dropped shift, found ${JSON.stringify(report.createdWorks)}`;
    await page.waitForTimeout(BEAT.afterDrop);
    await mouse.moveTo({ x: target.x + PARK_OFFSET.x, y: target.y + PARK_OFFSET.y }, MOVE.normal);
    await page.waitForTimeout(BEAT.result);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.finalHold);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    const leftovers = octoberWorks(await api.schedule(filter)).filter((w) => !knownIds.has(w.id)).map((w) => w.id);
    await deleteWorks(api, leftovers);
    const restored = snapshotOf(await api.schedule(filter), OCTOBER_RANGE);
    report.octoberWorks = restored.length;
    report.octoberRestored = sameSnapshot(octoberBefore, restored);
    if (!report.octoberRestored) throw new Error(`October differs after the cleanup (${restored.length} works) - check the demo data!`);
    log(`removed ${leftovers.length} created works; October identical again (${restored.length} works)`);
  }
}

export const TIMELINE_TAKE_RUNNERS = {
  [VIDEO_TIMELINE_24H]: takeTimeline24h,
  [VIDEO_TIMELINE_DAY_DRAGDROP]: takeTimelineDayDragDrop,
};
