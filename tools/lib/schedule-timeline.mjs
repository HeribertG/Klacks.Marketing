// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Timeline-view helpers for the video takes. In the timeline ("Tagesverlauf") every employee occupies ONE row of
 * cellHeight = 50 * 6 * rowHeightFactor px (zoom 1); day columns run along x (90 px each, like the table) and the time
 * of day runs along y INSIDE the row: y = rowTop + (minutes - displayFrom) * cellHeight / totalMinutes. The canvas
 * has a 30 px day header; the vertical scroll position (whole rows) is not readable from the DOM, so callers pass the
 * number of rows they scrolled. The shift section below keeps its table geometry (38 px rows, no header).
 * Mirrors Klacks.Ui: BaseSettingsService, ShiftSettingsService, ScheduleTimelineRangeService, ScheduleViewModeService,
 * TimelineBlockHitTestService.computeBlockRange.
 * @param page - Playwright page showing the schedule
 * @param range - TIMELINE_RANGE_FULL ("full", 00-24) or TIMELINE_RANGE_DAY ("day", 06-19)
 * @param rowHeightFactor - timeline row height factor seeded into sessionStorage (0.5..2)
 */

import * as S from "./klacks-demo-session.mjs";

export const STORAGE_TIMELINE_RANGE = "klacks.schedule.timelineViewRange";
export const SESSION_ROW_HEIGHT_FACTOR = "klacks.schedule.timelineRowHeightFactor";
export const TIMELINE_RANGE_FULL = "full";
export const TIMELINE_RANGE_DAY = "day";
export const RANGE_MINUTES = {
  [TIMELINE_RANGE_FULL]: { from: 0, total: 24 * 60 },
  [TIMELINE_RANGE_DAY]: { from: 6 * 60, total: 13 * 60 },
};
const RANGE_MENU_INDEX = { [TIMELINE_RANGE_FULL]: 0, [TIMELINE_RANGE_DAY]: 1 };

export const TIMELINE_CELL_WIDTH_PX = 90;
export const TIMELINE_HEADER_PX = 30;
const TABLE_CELL_HEIGHT_PX = 50;
const TIMELINE_HEIGHT_MULTIPLIER = 6;
export const SHIFT_ROW_HEIGHT_PX = 38;
const MINUTES_PER_HOUR = 60;
const HALF = 2;

export const SEL_VIEW_MODE_INPUT = "#schedule-view-mode-toggle";
export const SEL_VIEW_MODE_SWITCH = "label.main-switch[for='schedule-view-mode-toggle']";
export const SEL_RANGE_DROPDOWN = "#timeline-range-dropdown";
export const SEL_RANGE_ITEMS = "[aria-labelledby='timeline-range-dropdown'] .dropdown-item";
export const SEL_TIMELINE_CANVAS = "canvas[id^='timeline-template-canvas']";
export const SEL_TABLE_CANVAS = "#schedule-grid-surface canvas[id^='template-canvas']";
export const SEL_SHIFT_CANVAS = "#shift-section-container canvas[id^='template-canvas']";

const RANGE_SETTLE_MS = 1200;

export const timelineCellHeight = (rowHeightFactor) => TABLE_CELL_HEIGHT_PX * TIMELINE_HEIGHT_MULTIPLIER * rowHeightFactor;

export function minutesOf(time) {
  const [h, m] = String(time).split(":").map(Number);
  return h * MINUTES_PER_HOUR + m;
}

/**
 * Seeds the timeline range (localStorage) and row height factor (sessionStorage) on the current origin. Both services
 * read storage only when they are constructed, so this must run BEFORE the schedule route is opened.
 */
export async function seedTimelineStorage(page, { range, rowHeightFactor }) {
  await page.evaluate((s) => {
    localStorage.setItem(s.rangeKey, s.range);
    sessionStorage.setItem(s.factorKey, String(s.factor));
  }, { rangeKey: STORAGE_TIMELINE_RANGE, range, factorKey: SESSION_ROW_HEIGHT_FACTOR, factor: rowHeightFactor });
}

export async function readViewState(page) {
  return page.evaluate((k) => ({
    viewMode: localStorage.getItem(k.mode),
    range: localStorage.getItem(k.range),
    factor: sessionStorage.getItem(k.factor),
  }), { mode: S.STORAGE_VIEW_MODE, range: STORAGE_TIMELINE_RANGE, factor: SESSION_ROW_HEIGHT_FACTOR });
}

/**
 * Switches table -> timeline through the header toggle (clicked with the visible cursor when a mouse is given) and
 * waits until the timeline canvas replaced the table canvas and the mode is persisted.
 */
export async function switchToTimeline(page, mouse, moveMs) {
  const toggle = page.locator(SEL_VIEW_MODE_SWITCH);
  await toggle.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (mouse) await mouse.clickLocator(toggle, moveMs);
  else await toggle.click();
  await page.locator(SEL_TIMELINE_CANVAS).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  const state = await readViewState(page);
  if (state.viewMode !== S.VIEW_MODE_TIMELINE || !(await page.locator(SEL_VIEW_MODE_INPUT).isChecked())) {
    throw new Error(`view mode toggle did not switch to the timeline (viewMode=${state.viewMode})`);
  }
}

/**
 * Opens the range dropdown and picks "24 Std-Ansicht" (full) or "Tagesansicht" (day); asserts the persisted value.
 */
export async function chooseTimelineRange(page, mouse, range, moveMs, beatMs) {
  const dropdown = page.locator(SEL_RANGE_DROPDOWN);
  await dropdown.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(dropdown, moveMs);
  const item = page.locator(SEL_RANGE_ITEMS).nth(RANGE_MENU_INDEX[range]);
  await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(beatMs);
  await mouse.clickLocator(item, moveMs);
  await page.waitForFunction((k) => localStorage.getItem(k.key) === k.range, { key: STORAGE_TIMELINE_RANGE, range }, {
    timeout: S.READY_TIMEOUT_MS,
  });
  await page.waitForTimeout(RANGE_SETTLE_MS);
}

export async function timelineBox(page) {
  const box = await page.locator(SEL_TIMELINE_CANVAS).first().boundingBox();
  if (!box) throw new Error("timeline canvas not found");
  return box;
}

export async function shiftBox(page) {
  const box = await page.locator(SEL_SHIFT_CANVAS).first().boundingBox();
  if (!box) throw new Error("shift section canvas not found");
  return box;
}

/**
 * Measured timeline geometry: canvas box, row height, how many employee rows / day columns are fully visible.
 */
export async function timelineGeometry(page, { range, rowHeightFactor }) {
  const box = await timelineBox(page);
  const cellHeight = timelineCellHeight(rowHeightFactor);
  return {
    box,
    range,
    cellHeight,
    visibleRows: Math.floor((box.height - TIMELINE_HEADER_PX) / cellHeight),
    visibleColumns: Math.floor(box.width / TIMELINE_CELL_WIDTH_PX),
    pixelsPerMinute: cellHeight / RANGE_MINUTES[range].total,
  };
}

export function rowTop(geometry, row, vScroll = 0) {
  return geometry.box.y + TIMELINE_HEADER_PX + (row - vScroll) * geometry.cellHeight;
}

export function dayX(geometry, visibleColumn, isRtl) {
  return isRtl
    ? geometry.box.x + geometry.box.width - (visibleColumn + 1) * TIMELINE_CELL_WIDTH_PX + TIMELINE_CELL_WIDTH_PX / HALF
    : geometry.box.x + visibleColumn * TIMELINE_CELL_WIDTH_PX + TIMELINE_CELL_WIDTH_PX / HALF;
}

/**
 * y of a time of day inside an employee row (clamped to the visible range), as drawn by the timeline renderer.
 */
export function timeY(geometry, row, time, vScroll = 0) {
  const { from, total } = RANGE_MINUTES[geometry.range];
  const minutes = Math.min(Math.max(minutesOf(time), from), from + total);
  return rowTop(geometry, row, vScroll) + (minutes - from) * geometry.pixelsPerMinute;
}

/**
 * Centre of a time block (start..end on the same day) of an employee row at a visible day column.
 */
export function blockCenter(geometry, row, visibleColumn, start, end, isRtl, vScroll = 0) {
  return {
    x: dayX(geometry, visibleColumn, isRtl),
    y: (timeY(geometry, row, start, vScroll) + timeY(geometry, row, end, vScroll)) / HALF,
  };
}

export async function shiftGeometry(page) {
  const box = await shiftBox(page);
  return { box, visibleRows: Math.floor(box.height / SHIFT_ROW_HEIGHT_PX) };
}

export function shiftCellCenter(shift, row, visibleColumn, isRtl) {
  const x = isRtl
    ? shift.box.x + shift.box.width - (visibleColumn + 1) * TIMELINE_CELL_WIDTH_PX + TIMELINE_CELL_WIDTH_PX / HALF
    : shift.box.x + visibleColumn * TIMELINE_CELL_WIDTH_PX + TIMELINE_CELL_WIDTH_PX / HALF;
  return { x, y: shift.box.y + row * SHIFT_ROW_HEIGHT_PX + SHIFT_ROW_HEIGHT_PX / HALF };
}

/**
 * Collects the chunked POST /Shifts/Schedule responses the shift section loads; register BEFORE navigating.
 * settle() waits until no new chunk arrived for quietMs and returns the shift-date rows.
 */
export function captureShiftSchedules(page, { quietMs, timeoutMs }) {
  const rows = [];
  let lastAt = Date.now();
  let pending = 0;
  const onResponse = async (r) => {
    if (!r.url().includes("/Shifts/Schedule") || r.request().method() !== "POST") return;
    pending++;
    try {
      const body = await r.json().catch(() => null);
      rows.push(...(body?.shifts ?? []));
    } finally {
      pending--;
      lastAt = Date.now();
    }
  };
  page.on("response", onResponse);
  return {
    async settle() {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline && (pending > 0 || rows.length === 0 || Date.now() - lastAt < quietMs)) {
        await page.waitForTimeout(quietMs / HALF);
      }
      page.off("response", onResponse);
      if (rows.length === 0) throw new Error("the shift section loaded no shift schedules");
      return rows;
    },
  };
}

/**
 * Shift section row order exactly as ShiftDataService builds it: unique shifts sorted by shiftName with the
 * browser's localeCompare (evaluated in the page so the app's collation is used).
 */
export async function shiftRowOrder(page, shiftSchedules) {
  const byId = new Map();
  for (const s of shiftSchedules) if (!byId.has(s.shiftId)) byId.set(s.shiftId, { shiftId: s.shiftId, shiftName: s.shiftName });
  const sortedIds = await page.evaluate(
    (list) => list.sort((a, b) => a.shiftName.localeCompare(b.shiftName)).map((s) => s.shiftId),
    [...byId.values()],
  );
  return sortedIds;
}

/**
 * Wheel ticks over the timeline canvas: the timeline moves exactly one day (deltaX) or one row (deltaY) per event.
 */
export async function wheelTimeline(page, mouse, point, { dx = 0, dy = 0, ticks, pauseMs }) {
  await mouse.moveTo(point);
  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(dx, dy);
    await page.waitForTimeout(pauseMs);
  }
}
