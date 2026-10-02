// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Video takes of the website's "rule violations" carousel, recorded on the demo group's schedule (1280x800, table view): rest-conflict
 * (an early shift moved onto the day after someone's late shift -> rest-time warning), rule-collision (a customer appointment dropped
 * from the shift list onto an employee who already works a day shift at that time -> red collision error; Klacks still saves it),
 * rule-consecutive-days (three morning shifts moved onto an employee inside one ISO week -> first the missing second rest day, then the
 * seventh consecutive working day is warned) and rule-holiday-work (a day shift dropped onto 25 December -> holiday-work warning from the
 * holiday calendar). Every finding is shown live in the error list without a period reload; info rows are switched off through the
 * list's own filter (before the recording, or with the cursor after the list was reopened from the shift tab, because the list resets
 * its filter when it is recreated), and the list must hold no error or warning before the take.
 * The grid scrolls one sub-row per wheel event and auto-scrolls while a drag hovers its first (when scrolled) or last fully visible
 * sub-row or its first/last visible column, so every drag source and target is kept one sub-row / column away from those edges.
 * The shift list is scrolled (one row per wheel event) until the demonstrated shift is its top row.
 * Every take restores what it touched (deletes the works it created, reassigns moved works back) and verifies that October of the demo
 * group is identical to the start (118 works) and that December of the demo group has no works; the numbers land in the take report.
 * @param take - page, api, options, recorder, mouse, report, culture, viewport, scale (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import {
  CANVAS_SETTLE_MS,
  CELL_WIDTH_PX,
  SUB_ROW_HEIGHT_PX,
  HTTP_POST,
  cellCenter,
  dateKey,
  gridBox,
  monthFilter,
  openSchedule,
  rowBoxes,
  sameSnapshot,
  snapshotOf,
  worksIn,
} from "../lib/schedule-grid.mjs";
import { SHIFT_ROW_HEIGHT_PX, captureShiftSchedules, shiftCellCenter, shiftGeometry, shiftRowOrder } from "../lib/schedule-timeline.mjs";
import { dayDiff, pickRestConflict, reassignWork, deleteWork } from "../lib/scenario-demo.mjs";

export const VIDEO_REST_CONFLICT = "rest-conflict";
export const VIDEO_RULE_COLLISION = "rule-collision";
export const VIDEO_RULE_CONSECUTIVE_DAYS = "rule-consecutive-days";
export const VIDEO_RULE_HOLIDAY_WORK = "rule-holiday-work";
export const RULE_VIDEOS = [VIDEO_REST_CONFLICT, VIDEO_RULE_COLLISION, VIDEO_RULE_CONSECUTIVE_DAYS, VIDEO_RULE_HOLIDAY_WORK];

const OCTOBER = { year: 2026, month: 10 };
const DECEMBER = { year: 2026, month: 12 };
const OCTOBER_RANGE = { from: "2026-10-01", until: "2026-10-31", expectedWorks: 118 };
const DECEMBER_RANGE = { from: "2026-12-01", until: "2026-12-31", expectedWorks: 0 };
const SCHEDULE_ROW_LIMIT = 500;

const COLLISION = { day: "2026-10-05", employee: { name: "Maillard", firstName: "Clara" }, shift: "KUT", existing: "TS" };
const CONSECUTIVE = {
  employee: { name: "Hoffmann", firstName: "Raphael" },
  firstVisibleDay: "2026-10-17",
  moves: [
    { day: "2026-10-20", from: { name: "Eisenmann", firstName: "Lilly" }, shift: "MOR" },
    { day: "2026-10-21", from: { name: "Eisenmann", firstName: "Lilly" }, shift: "MOR" },
    { day: "2026-10-19", from: { name: "Leonhardt", firstName: "Sarah" }, shift: "MOR" },
  ],
  warningsAfterMove: [0, 1, 2],
  raiseListPx: 60,
};
const HOLIDAY = { day: "2026-12-25", employee: { name: "Bauer", firstName: "Marius" }, shift: "TS", firstVisibleDay: "2026-12-21" };
const REST_CONFLICT_LIMITS = { maxRowDistance: 1 };
const EDGE_COLUMNS = 1;

const SEL_SHIFT_TABS = "#shift-tabs .nav-link";
const SHIFT_TAB_INDEX = 0;
const ERROR_TAB_INDEX = 1;
const SEL_ERROR_ROWS = "app-schedule-error-list tr.table-row";
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const SPLIT_DIRECTION_VERTICAL = "vertical";
const SEL_INFO_FILTER = "#info-filter-btn";
const SEL_SHIFT_SCROLL_DOWN = ".vScrollAreaShift .arrow-thumb";
const ATTR_ARIA_DISABLED = "aria-disabled";
const TRUE_STRING = "true";
const CLASS_ACTIVE = "active";
const ROW_TYPE_ERROR = "error";
const ROW_TYPE_WARNING = "warning";
const ROW_TYPES = [ROW_TYPE_ERROR, ROW_TYPE_WARNING, "info"];
const GRID_HEADER_HEIGHT_PX = 30;
const ROW_TOLERANCE_PX = 3;
const SECOND_SUB_ROW = 1;
const REASSIGN_ROUTE = /\/Works\/([0-9a-f-]{36})\/ReassignClient/i;
const WORKS_POST_PATH = /\/api\/backend\/Works\/?$/i;
const SHIFT_CAPTURE = { quietMs: 1500, timeoutMs: 60000 };
const SAVE_TIMEOUT_MS = 30000;
const FINDING_TIMEOUT_MS = 20000;
const FINDING_POLL_MS = 200;
const WHEEL_PAUSE_MS = 220;
const MAX_WHEEL_TICKS = 40;
const HH_MM_LENGTH = 5;
const HALF = 2;
const PARK_INSET_PX = 260;
const EDGE_MARGIN_PX = 30;

const BEAT = { intro: 1200, hover: 450, showContext: 1300, afterDrop: 1200, beforeTab: 700, afterTab: 900, between: 1600, scroll: 900, result: 700, finalHold: 5000 };
const MOVE = { short: 400, normal: 700, drag: 1100 };

const log = (...args) => console.log("  ", ...args);
const fullFrame = (take) => ({ x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale });
const hhmm = (time) => String(time ?? "").slice(0, HH_MM_LENGTH);
const sameEmployee = (client, person) => client.name === person.name && client.firstName === person.firstName;
const label = (person) => `${person.firstName} ${person.name}`;

function flag(report, message) {
  report.failure = report.failure ?? message;
  log(`! ${message}`);
}

function rowOfEmployee(data, person) {
  const row = data.clients.findIndex((client) => sameEmployee(client, person));
  if (row < 0) throw new Error(`employee ${label(person)} is not in the demo group's schedule`);
  return row;
}

function worksOf(data, person, day, abbreviation = null) {
  const client = data.clients.find((candidate) => sameEmployee(candidate, person));
  return worksIn(data, day, day).filter((work) => work.clientId === client?.id && (!abbreviation || work.abbreviation === abbreviation));
}

async function demoState(api, groupFilter) {
  const october = snapshotOf(await api.schedule({ ...groupFilter, ...monthFilter(OCTOBER) }), OCTOBER_RANGE);
  const december = worksIn(await api.schedule({ ...groupFilter, ...monthFilter(DECEMBER) }), DECEMBER_RANGE.from, DECEMBER_RANGE.until);
  return { october, decemberWorks: december.length };
}

/**
 * Opens the schedule of the take's period, checks the protected demo state (October 118 works, December empty) and returns the context
 * every take shares. Nothing is recorded yet.
 */
async function prepare(take) {
  const { page, api, options, report } = take;
  const capture = captureShiftSchedules(page, { ...SHIFT_CAPTURE, groupId: options.groupId });
  const { filter, data } = await openSchedule(page, options);
  const shiftSchedules = await capture.settle();
  const groupFilter = { ...filter, selectedGroup: options.groupId, startRow: 0, rowCount: SCHEDULE_ROW_LIMIT, analyseToken: null };
  const before = await demoState(api, groupFilter);
  report.demoStateBefore = { octoberWorks: before.october.length, decemberWorks: before.decemberWorks };
  if (before.october.length !== OCTOBER_RANGE.expectedWorks) {
    throw new Error(`October has ${before.october.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  }
  if (before.decemberWorks !== DECEMBER_RANGE.expectedWorks) {
    throw new Error(`December has ${before.decemberWorks} works, expected ${DECEMBER_RANGE.expectedWorks} - refusing to record`);
  }
  const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
  const grid = await gridBox(page);
  return {
    filter, data, shiftSchedules, groupFilter, isRtl, before,
    visibleColumns: Math.floor(grid.width / CELL_WIDTH_PX),
    columnOffset: 0,
    originalClient: new Map(worksIn(data, filter.periodStartDate, filter.periodEndDate).map((work) => [work.id.toLowerCase(), work.clientId])),
    reassigned: new Set(),
    created: new Set(),
  };
}

/**
 * Visible column of a day; throws when the day would sit on a column that makes a drag auto-scroll the grid sideways.
 */
function columnOf(ctx, day) {
  const column = dayDiff(ctx.filter.periodStartDate, day) - ctx.columnOffset;
  const first = ctx.columnOffset > 0 ? EDGE_COLUMNS : 0;
  if (column < first || column > ctx.visibleColumns - 1 - EDGE_COLUMNS) {
    throw new Error(`day ${day} lands on visible column ${column} (usable ${first}..${ctx.visibleColumns - 1 - EDGE_COLUMNS})`);
  }
  return column;
}

async function openTab(take, index, withMouse) {
  const tab = take.page.locator(SEL_SHIFT_TABS).nth(index);
  if (withMouse) await take.mouse.clickLocator(tab, MOVE.normal);
  else await tab.click();
  await take.page.waitForTimeout(withMouse ? BEAT.afterTab : CANVAS_SETTLE_MS);
}

async function isInfoFilterActive(page) {
  return ((await page.locator(SEL_INFO_FILTER).getAttribute("class")) ?? "").split(/\s+/).includes(CLASS_ACTIVE);
}

/**
 * Switches the info rows of the error list off through its own filter button - with the visible cursor during a recording.
 */
async function switchOffInfoRows(take, withMouse) {
  const { page, mouse } = take;
  const info = page.locator(SEL_INFO_FILTER);
  await info.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (await isInfoFilterActive(page)) {
    if (withMouse) await mouse.clickLocator(info, MOVE.normal);
    else await info.click();
  }
  if (await isInfoFilterActive(page)) throw new Error("info filter of the error list could not be switched off");
  await page.evaluate(() => document.activeElement?.blur());
}

/**
 * The error list's rows as { type, text }; type comes from the row icon (icon-error / icon-warning / icon-info).
 */
function errorRows(page) {
  return page.locator(SEL_ERROR_ROWS).evaluateAll((elements, types) => elements.map((element) => {
    const icon = element.querySelector("fa-icon");
    const classes = (icon?.getAttribute("class") ?? "").split(/\s+/);
    const type = types.find((candidate) => classes.includes(`icon-${candidate}`)) ?? null;
    return { type, text: element.innerText.replace(/\s+/g, " ").trim() };
  }), ROW_TYPES);
}

/**
 * Prepares the error list for the recording: error tab, info rows off, and the list must be empty (no error, no warning).
 */
async function emptyErrorList(take) {
  await openTab(take, ERROR_TAB_INDEX, false);
  await switchOffInfoRows(take, false);
  await take.page.waitForTimeout(CANVAS_SETTLE_MS);
  const rows = await errorRows(take.page);
  take.report.errorRowsBefore = rows;
  if (rows.length > 0) throw new Error(`the error list (info rows off) is not empty before the take: ${rows.map((row) => row.text).join(" | ")}`);
}

/**
 * Waits until the error list holds a row of the given type for the employee that satisfies the predicate; returns all rows then.
 */
async function waitForFinding(take, { type, person, matches = () => true }) {
  const deadline = Date.now() + FINDING_TIMEOUT_MS;
  let rows = [];
  while (Date.now() < deadline) {
    rows = await errorRows(take.page);
    const index = rows.findIndex((row) => row.type === type && row.text.includes(person.name) && matches(row.text));
    if (index >= 0) return { hit: rows[index], index, rows };
    await take.page.waitForTimeout(FINDING_POLL_MS);
  }
  return { hit: null, index: -1, rows };
}

async function waitForRowCount(take, count) {
  const deadline = Date.now() + FINDING_TIMEOUT_MS;
  let rows = await errorRows(take.page);
  while (Date.now() < deadline && rows.length !== count) {
    await take.page.waitForTimeout(FINDING_POLL_MS);
    rows = await errorRows(take.page);
  }
  return rows;
}

/**
 * Scrolls the shift list (shift tab, one row per wheel event) until the shift is its top row, or until the list cannot scroll further;
 * returns the shift's visible row.
 */
async function scrollShiftListTo(take, ctx, abbreviation) {
  const { page, report } = take;
  await openTab(take, SHIFT_TAB_INDEX, false);
  const shift = ctx.shiftSchedules.find((cell) => cell.abbreviation === abbreviation);
  if (!shift) throw new Error(`shift ${abbreviation} is not in the shift list of the demo group`);
  const order = await shiftRowOrder(page, ctx.shiftSchedules);
  const index = order.indexOf(shift.shiftId);
  const section = await shiftGeometry(page);
  await page.mouse.move(section.box.x + section.box.width / HALF, section.box.y + SHIFT_ROW_HEIGHT_PX / HALF);
  let offset = 0;
  const atBottom = async () => (await page.locator(SEL_SHIFT_SCROLL_DOWN).last().getAttribute(ATTR_ARIA_DISABLED)) === TRUE_STRING;
  while (offset < index && !(await atBottom())) {
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(WHEEL_PAUSE_MS);
    offset++;
  }
  await page.mouse.move(take.mouse.x, take.mouse.y);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const row = index - offset;
  report.shiftList = { rows: order.length, index, offset, visibleRow: row, visibleRows: section.visibleRows };
  if (row < 0 || row >= section.visibleRows) throw new Error(`shift ${abbreviation} is on shift row ${row}, only ${section.visibleRows} rows are visible`);
  return { shiftId: shift.shiftId, row };
}

async function wheelGrid(take, { dx = 0, dy = 0 }, ticks) {
  const { page } = take;
  const grid = await gridBox(page);
  await page.mouse.move(grid.x + grid.width / HALF, grid.y + grid.height / HALF);
  for (let tick = 0; tick < ticks; tick++) {
    await page.mouse.wheel(dx, dy);
    await page.waitForTimeout(WHEEL_PAUSE_MS);
  }
  await page.mouse.move(take.mouse.x, take.mouse.y);
}

/**
 * Scrolls the grid horizontally (one day per wheel event) so that firstDay is the first visible column.
 */
async function showFromDay(take, ctx, firstDay) {
  const offset = dayDiff(ctx.filter.periodStartDate, firstDay);
  await wheelGrid(take, { dx: 1 }, offset);
  ctx.columnOffset = offset;
  take.report.columnOffset = offset;
}

/**
 * Scrolls the grid vertically (one sub-row per wheel event) until all given rows are completely visible with one free sub-row above
 * (unless the grid is scrolled to the top) and below, so a drag onto them never triggers the grid's edge auto-scroll. With a visible
 * cursor (inRecording) the wheel is turned where the cursor is.
 */
async function scrollForDrag(take, rows, { inRecording = false } = {}) {
  const { page, mouse } = take;
  const grid = await gridBox(page);
  const visibleTop = grid.y + GRID_HEADER_HEIGHT_PX;
  const visibleBottom = grid.y + grid.height;
  const wheelPoint = { x: grid.x + grid.width / HALF, y: grid.y + grid.height / HALF };
  if (inRecording) await mouse.moveTo(wheelPoint, MOVE.normal);
  for (let tick = 0; tick < MAX_WHEEL_TICKS; tick++) {
    const boxes = await rowBoxes(page);
    const top = Math.min(...rows.map((row) => boxes[row].top));
    const bottom = Math.max(...rows.map((row) => boxes[row].top + boxes[row].height));
    const atTop = boxes[0].top >= visibleTop - ROW_TOLERANCE_PX;
    const needUp = !atTop && top < visibleTop + SUB_ROW_HEIGHT_PX - ROW_TOLERANCE_PX;
    const needDown = bottom > visibleBottom - SUB_ROW_HEIGHT_PX + ROW_TOLERANCE_PX;
    if (!needUp && !needDown) return;
    if (needUp && needDown) throw new Error(`rows ${rows.join(",")} do not fit into the grid with a free sub-row above and below`);
    if (!inRecording) await page.mouse.move(wheelPoint.x, wheelPoint.y);
    await page.mouse.wheel(0, needUp ? -1 : 1);
    await page.waitForTimeout(inRecording ? BEAT.scroll / HALF : WHEEL_PAUSE_MS);
  }
  throw new Error(`rows ${rows.join(",")} could not be scrolled into view`);
}

/**
 * Drags the splitter between the grid and the error list up with the visible cursor, so the error list shows more rows.
 */
async function raiseErrorList(take, px) {
  const { page, mouse } = take;
  const gutters = await page.locator(SEL_SPLIT_GUTTER).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, direction: element.parentElement?.getAttribute("direction") };
  }));
  const gutter = gutters.find((candidate) => candidate.direction === SPLIT_DIRECTION_VERTICAL);
  if (!gutter) throw new Error("the splitter between the grid and the error list was not found");
  await mouse.drag({ x: gutter.x, y: gutter.y }, { x: gutter.x, y: gutter.y - px }, MOVE.drag);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

function trackRequests(take, ctx) {
  take.page.on("request", (request) => {
    const match = request.url().match(REASSIGN_ROUTE);
    if (match) ctx.reassigned.add(match[1].toLowerCase());
  });
  take.page.on("response", async (response) => {
    if (!isWorkPost(response) || !response.ok()) return;
    const body = await response.json().catch(() => null);
    if (body?.id) ctx.created.add(String(body.id).toLowerCase());
  });
}

function waitResponse(page, predicate) {
  const pending = page.waitForResponse(predicate, { timeout: SAVE_TIMEOUT_MS });
  pending.catch(() => {});
  return pending;
}

function isWorkPost(response) {
  return response.request().method() === HTTP_POST && WORKS_POST_PATH.test(new URL(response.url()).pathname);
}

async function cleanup(take, ctx) {
  const { api, report } = take;
  const problems = [];
  for (const id of ctx.reassigned) {
    const original = ctx.originalClient.get(id);
    if (original) await reassignWork(api, id, original).catch((error) => problems.push(`restore ${id}: ${error.message}`));
  }
  const period = { from: ctx.filter.periodStartDate, until: ctx.filter.periodEndDate };
  for (const id of ctx.created) await deleteWork(api, id, period).catch((error) => problems.push(`delete ${id}: ${error.message}`));
  const after = await demoState(api, ctx.groupFilter);
  report.demoStateAfter = { octoberWorks: after.october.length, octoberIdentical: sameSnapshot(ctx.before.october, after.october), decemberWorks: after.decemberWorks };
  report.cleanup = { reassignedBack: ctx.reassigned.size, deletedWorks: ctx.created.size, problems };
  if (problems.length > 0) throw new Error(`cleanup incomplete: ${problems.join("; ")}`);
  if (!report.demoStateAfter.octoberIdentical) throw new Error("October differs after the take - check the demo data!");
  if (after.decemberWorks !== DECEMBER_RANGE.expectedWorks) throw new Error(`December has ${after.decemberWorks} works after the take - check the demo data!`);
  log(`restored: ${ctx.reassigned.size} reassigned back, ${ctx.created.size} deleted; October ${after.october.length} works identical, December ${after.decemberWorks} works`);
}

async function runRecorded(take, ctx, scene) {
  const { page, mouse, recorder, report } = take;
  trackRequests(take, ctx);
  const grid = await gridBox(page);
  await mouse.moveTo({ x: grid.x + grid.width / HALF, y: grid.y + grid.height - GRID_HEADER_HEIGHT_PX }, 1);
  await recorder.start();
  try {
    await scene();
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    await cleanup(take, ctx);
  }
}

/**
 * Parks the cursor on free space beside the finding's text and holds the result (poster frame at the start of the hold).
 */
async function holdOnFinding(take, ctx, finding, holdMs = BEAT.finalHold) {
  const { page, mouse, viewport, report } = take;
  const box = await page.locator(SEL_ERROR_ROWS).nth(finding.index).boundingBox();
  if (box) {
    const x = ctx.isRtl ? Math.max(EDGE_MARGIN_PX, box.x + PARK_INSET_PX / HALF) : Math.min(viewport.width - EDGE_MARGIN_PX, box.x + box.width - PARK_INSET_PX);
    await mouse.moveTo({ x, y: Math.min(viewport.height - EDGE_MARGIN_PX, box.y + box.height / HALF) }, MOVE.normal);
  }
  await page.waitForTimeout(BEAT.result);
  report.posterAt = ScreenRecorder.now();
  await page.waitForTimeout(holdMs);
}

async function reassignByDrag(take, ctx, { fromRow, toRow, day, expectedId, targetClientId }) {
  const { page, mouse, report } = take;
  const column = columnOf(ctx, day);
  const source = await cellCenter(page, fromRow, column, ctx.isRtl);
  const target = await cellCenter(page, toRow, column, ctx.isRtl);
  const reassign = waitResponse(page, (response) => REASSIGN_ROUTE.test(response.url()));
  await mouse.moveTo(source, MOVE.normal);
  await page.waitForTimeout(BEAT.hover);
  await mouse.drag(source, target, MOVE.drag);
  const response = await reassign;
  const movedId = response.url().match(REASSIGN_ROUTE)[1].toLowerCase();
  const to = response.request().postDataJSON()?.targetClientId;
  (report.moves ??= []).push({ movedId, to, status: response.status() });
  if (movedId !== String(expectedId).toLowerCase()) flag(report, `the drag moved ${movedId} instead of ${expectedId}`);
  if (to !== targetClientId) flag(report, `the drag reassigned to ${to} instead of ${targetClientId}`);
  if (!response.ok()) flag(report, `the reassign returned HTTP ${response.status()}`);
  return target;
}

async function bookFromShiftList(take, ctx, { shiftId, shiftRow, day, row, subRow = 0 }) {
  const { page, mouse, report } = take;
  const column = columnOf(ctx, day);
  const section = await shiftGeometry(page);
  const source = shiftCellCenter(section, shiftRow, column, ctx.isRtl);
  const cell = await cellCenter(page, row, column, ctx.isRtl);
  const target = { x: cell.x, y: cell.y + subRow * SUB_ROW_HEIGHT_PX };
  const posted = waitResponse(page, isWorkPost);
  await mouse.moveTo(source, MOVE.normal);
  await page.waitForTimeout(BEAT.hover);
  await mouse.drag(source, target, MOVE.drag);
  const response = await posted;
  const body = response.request().postDataJSON() ?? {};
  report.booking = { status: response.status(), shiftId: body.shiftId, clientId: body.clientId, day: dateKey(body.currentDate) };
  const landed = body.shiftId === shiftId && body.clientId === ctx.data.clients[row].id && dateKey(body.currentDate) === day;
  if (!landed) flag(report, `the drop landed elsewhere: ${JSON.stringify(report.booking)} (expected ${shiftId} / ${day} / row ${row})`);
  if (!response.ok()) flag(report, `the booking returned HTTP ${response.status()}`);
  return target;
}

/**
 * After a drop from the shift list: opens the error list with the cursor, hides its info rows (the reopened list starts with all
 * filters on) and waits for the single expected finding.
 */
async function revealFinding(take, ctx, expected) {
  const { page, report } = take;
  await page.waitForTimeout(BEAT.beforeTab);
  await openTab(take, ERROR_TAB_INDEX, true);
  await switchOffInfoRows(take, true);
  await page.waitForTimeout(BEAT.hover);
  const finding = await waitForFinding(take, expected);
  report.errorRowsAfter = finding.rows;
  if (!finding.hit) return finding;
  report.findingText = finding.hit.text;
  if (finding.rows.length !== 1) flag(report, `the error list shows ${finding.rows.length} rows instead of only the demonstrated finding`);
  return finding;
}

export async function takeRestConflict(take) {
  const { page, mouse, report } = take;
  const ctx = await prepare(take);
  const pick = pickRestConflict(ctx.data, ctx.filter, { ...REST_CONFLICT_LIMITS, maxDay: ctx.visibleColumns - 1 - EDGE_COLUMNS });
  Object.assign(report, {
    move: `${pick.early.abbreviation} ${pick.next} ${label(pick.earlyClient)} -> ${label(pick.lateClient)}`,
    after: `${pick.late.abbreviation} ${pick.day} ${hhmm(pick.late.startTime)}-${hhmm(pick.late.endTime)}`,
    restHours: pick.rest,
  });
  log(`move ${report.move} (after ${report.after}, rest ${pick.rest} h)`);
  await emptyErrorList(take);
  await scrollForDrag(take, [pick.lateRow, pick.earlyRow]);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await runRecorded(take, ctx, async () => {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(await cellCenter(page, pick.lateRow, columnOf(ctx, pick.day), ctx.isRtl), MOVE.normal);
    await page.waitForTimeout(BEAT.showContext);
    await reassignByDrag(take, ctx, { fromRow: pick.earlyRow, toRow: pick.lateRow, day: pick.next, expectedId: pick.early.id, targetClientId: pick.lateClient.id });
    const finding = await waitForFinding(take, {
      type: ROW_TYPE_WARNING,
      person: pick.lateClient,
      matches: (text) => text.includes(hhmm(pick.late.endTime)) && text.includes(hhmm(pick.early.startTime)),
    });
    report.errorRowsAfter = finding.rows;
    if (!finding.hit) {
      flag(report, "the rest warning did not appear in the error list");
      await page.waitForTimeout(BEAT.finalHold);
      return;
    }
    report.findingText = finding.hit.text;
    if (finding.rows.length !== 1) flag(report, `the error list shows ${finding.rows.length} rows instead of only the rest warning`);
    await holdOnFinding(take, ctx, finding);
  });
}

export async function takeRuleCollision(take) {
  const { page, mouse, report } = take;
  const ctx = await prepare(take);
  const row = rowOfEmployee(ctx.data, COLLISION.employee);
  const [existing] = worksOf(ctx.data, COLLISION.employee, COLLISION.day, COLLISION.existing);
  if (!existing || worksOf(ctx.data, COLLISION.employee, COLLISION.day).length !== 1) {
    throw new Error(`${label(COLLISION.employee)} does not have exactly one ${COLLISION.existing} on ${COLLISION.day}`);
  }
  report.existing = `${existing.abbreviation} ${hhmm(existing.startTime)}-${hhmm(existing.endTime)}`;
  await emptyErrorList(take);
  const shift = await scrollShiftListTo(take, ctx, COLLISION.shift);
  await scrollForDrag(take, [row]);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await runRecorded(take, ctx, async () => {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(await cellCenter(page, row, columnOf(ctx, COLLISION.day), ctx.isRtl), MOVE.normal);
    await page.waitForTimeout(BEAT.showContext);
    await bookFromShiftList(take, ctx, { shiftId: shift.shiftId, shiftRow: shift.row, day: COLLISION.day, row, subRow: SECOND_SUB_ROW });
    const finding = await revealFinding(take, ctx, {
      type: ROW_TYPE_ERROR,
      person: COLLISION.employee,
      matches: (text) => text.includes(hhmm(existing.startTime)) && text.includes(hhmm(existing.endTime)),
    });
    if (!finding.hit) {
      flag(report, "the collision error did not appear in the error list");
      await page.waitForTimeout(BEAT.finalHold);
      return;
    }
    await holdOnFinding(take, ctx, finding);
  });
}

export async function takeRuleConsecutiveDays(take) {
  const { page, report } = take;
  const ctx = await prepare(take);
  const targetRow = rowOfEmployee(ctx.data, CONSECUTIVE.employee);
  const target = ctx.data.clients[targetRow];
  const moves = CONSECUTIVE.moves.map((move) => {
    const works = worksOf(ctx.data, move.from, move.day, move.shift);
    if (works.length !== 1 || worksOf(ctx.data, move.from, move.day).length !== 1) throw new Error(`${label(move.from)} does not have exactly one work (${move.shift}) on ${move.day}`);
    if (worksOf(ctx.data, CONSECUTIVE.employee, move.day).length > 0) throw new Error(`${label(CONSECUTIVE.employee)} already works on ${move.day}`);
    return { ...move, work: works[0], fromRow: rowOfEmployee(ctx.data, move.from) };
  });
  report.plan = moves.map((move) => `${move.shift} ${move.day} ${label(move.from)} -> ${label(CONSECUTIVE.employee)}`);
  await emptyErrorList(take);
  await showFromDay(take, ctx, CONSECUTIVE.firstVisibleDay);
  moves.forEach((move) => columnOf(ctx, move.day));
  await scrollForDrag(take, [moves[0].fromRow, targetRow]);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await runRecorded(take, ctx, async () => {
    await page.waitForTimeout(BEAT.intro);
    report.findings = [];
    for (const [index, move] of moves.entries()) {
      const rows = [move.fromRow, targetRow];
      const before = JSON.stringify(await rowBoxes(page));
      await scrollForDrag(take, rows, { inRecording: true });
      if (JSON.stringify(await rowBoxes(page)) !== before) await page.waitForTimeout(BEAT.scroll);
      await reassignByDrag(take, ctx, { fromRow: move.fromRow, toRow: targetRow, day: move.day, expectedId: move.work.id, targetClientId: target.id });
      await page.waitForTimeout(BEAT.afterDrop);
      const expected = CONSECUTIVE.warningsAfterMove[index];
      const rowsNow = await waitForRowCount(take, expected);
      report.findings.push({ afterMove: index + 1, rows: rowsNow });
      const warnings = rowsNow.filter((row) => row.type === ROW_TYPE_WARNING && row.text.includes(CONSECUTIVE.employee.name));
      if (rowsNow.length !== expected || warnings.length !== expected) {
        flag(report, `after move ${index + 1} the error list shows ${rowsNow.map((row) => row.text).join(" | ") || "nothing"} instead of ${expected} warning(s) for ${CONSECUTIVE.employee.name}`);
      }
      if (index < moves.length - 1) {
        await page.waitForTimeout(BEAT.between);
      } else if (warnings.length > 0) {
        await page.waitForTimeout(BEAT.hover);
        await raiseErrorList(take, CONSECUTIVE.raiseListPx);
        await holdOnFinding(take, ctx, { hit: warnings[warnings.length - 1], index: rowsNow.indexOf(warnings[warnings.length - 1]) });
      } else {
        await page.waitForTimeout(BEAT.finalHold);
      }
    }
  });
}

export async function takeRuleHolidayWork(take) {
  const { page, mouse, report } = take;
  const ctx = await prepare(take);
  const row = rowOfEmployee(ctx.data, HOLIDAY.employee);
  if (worksOf(ctx.data, HOLIDAY.employee, HOLIDAY.day).length > 0) throw new Error(`${label(HOLIDAY.employee)} already works on ${HOLIDAY.day}`);
  const offered = ctx.shiftSchedules.some((cell) => cell.abbreviation === HOLIDAY.shift && dateKey(cell.date) === HOLIDAY.day);
  if (!offered) throw new Error(`${HOLIDAY.shift} is not offered on ${HOLIDAY.day}`);
  await emptyErrorList(take);
  const shift = await scrollShiftListTo(take, ctx, HOLIDAY.shift);
  await showFromDay(take, ctx, HOLIDAY.firstVisibleDay);
  columnOf(ctx, HOLIDAY.day);
  await scrollForDrag(take, [row]);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await runRecorded(take, ctx, async () => {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(await cellCenter(page, row, columnOf(ctx, HOLIDAY.day), ctx.isRtl), MOVE.normal);
    await page.waitForTimeout(BEAT.showContext);
    await bookFromShiftList(take, ctx, { shiftId: shift.shiftId, shiftRow: shift.row, day: HOLIDAY.day, row });
    const finding = await revealFinding(take, ctx, { type: ROW_TYPE_WARNING, person: HOLIDAY.employee });
    if (!finding.hit) {
      flag(report, "the holiday-work warning did not appear in the error list");
      await page.waitForTimeout(BEAT.finalHold);
      return;
    }
    await holdOnFinding(take, ctx, finding);
  });
}

export const RULE_TAKE_RUNNERS = {
  [VIDEO_REST_CONFLICT]: takeRestConflict,
  [VIDEO_RULE_COLLISION]: takeRuleCollision,
  [VIDEO_RULE_CONSECUTIVE_DAYS]: takeRuleConsecutiveDays,
  [VIDEO_RULE_HOLIDAY_WORK]: takeRuleHolidayWork,
};
