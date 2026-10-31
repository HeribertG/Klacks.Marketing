// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story takes of the two Spitex clips, team version with two tours (plan: docs/knowledge/spitex-container-story-plan-2026-10-29.md; demo data lib/spitex-demo.mjs, seeded by
 * seed-spitex-demo.mjs into klacks_marketing_spitex). Both take the chat panel of Klacksy at 1280x720 and keep it open from its first click to
 * the end (the story builder paints a cover over the panel's settings rows for the whole time the panel is open).
 * spitex-orders-tour (clip A): the planner goes through the open Spitex orders with Klacksy (order review: the guided action is offered,
 * the proposals are taken without expenses, the held execute_order_review is confirmed), the sealed orders show up as plannable shifts, Klacksy cuts
 * the shifts with several weekdays into one part per weekday (split_shifts_by_weekday preview, then apply) and the take opens the cut page of one
 * order, where the parts stand as one row per weekday. One sentence then builds the two weekly tours (build_weekly_tours, patients split by location,
 * a patient stays in one tour all week); the app opens the container page of the first tour, the take closes the chat panel (the map lies under it at
 * 1280 px), shows the Monday and the fuller Thursday of the tour, switches the tour map on, enlarges it, then opens the second tour the same way. The
 * take ends on the container page and leaves it through its back link (releases the container lock) so the database copy can become the start of clip B.
 * spitex-tour-finish (clip B, needs the database copy after a publishable clip A): the container page of the first area's tour is opened with the map on,
 * Klacksy adds the lunch break at 12:00 to all weekdays of both tours and optimizes the routes (the page reloads, the take checks its rows and the map with
 * the chat panel closed), books one tour for NURSE and the other for SECOND_NURSE for the whole week (assign_container_week twice) and opens the schedule of the team.
 * Every message after the first waits for its condition (checked on the API, never on the answer text alone): recipeOffered, reviewStarted,
 * confirmationPending, executed, bundleHeld (A); breakHeld, routeStale, breakDone, assignHeld, booked (B). A "yes" fallback is skipped when its effect is
 * already there; any other message whose condition is not met is not sent and the take is not publishable. Captions are tied to the messages that always
 * happen (script field "cue"), never to a fallback of their own. publishable = every expected call made, no skill error, every page reached and read
 * (rows, map, schedule), the stored state is the story (A: orders sealed and cut, TWO containers, each holding on every weekday exactly the visits of one
 * area with visit and travel times and route info, the tour call names the group, two tours and the demo week; B: on Thursday of both tours one
 * break item 12:00-12:30, no visit overlapping a break on any day, route info, each tour nurse booked on every day of the demo week and her other days
 * unchanged, final page the schedule of the Spitex group in the demo week listing the team).
 * @param take - page, api, options, recorder, mouse, report, script, captions, viewport, scale, finalHoldMs (see recordTake)
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { CAPTION_ID } from "../lib/caption-overlay.mjs";
import { SEL_ASSISTANT_CLOSE, SEL_ASSISTANT_INPUT, SKILL_ERROR_PREFIX, sendChatMessage } from "../lib/klacksy-chat.mjs";
import { CANVAS_SETTLE_MS, HALF, HTTP_POST, SEL_GRID_CANVAS, SEL_NAME_ROWS, gridBox, openSchedule } from "../lib/schedule-grid.mjs";
import { SEL_READONLY, SEL_SELECTED_LIST, SEL_SELECTED_ROWS, SEL_TIME_RULER, SEL_WEEKDAY_BUTTONS, leaveEditor } from "../lib/container-editor.mjs";
import * as D from "../lib/spitex-demo.mjs";
import * as T from "../lib/spitex-tour-state.mjs";
import { shiftGeometry } from "../lib/schedule-timeline.mjs";

export const VIDEO_SPITEX_ORDERS_TOUR = "spitex-orders-tour";
export const VIDEO_SPITEX_TOUR_FINISH = "spitex-tour-finish";
export const SPITEX_VIDEOS = [VIDEO_SPITEX_ORDERS_TOUR, VIDEO_SPITEX_TOUR_FINISH];
export const SPITEX_ORDERS_TOUR_CUES = Object.freeze({ request: "request", accept: "accept", confirm: "confirm", cut: "cut", cutParts: "cutParts", bundle: "bundle", visits: "visits", weekdays: "weekdays", map: "map", secondTour: "secondTour" });
export const SPITEX_TOUR_FINISH_CUES = Object.freeze({ break: "break", breakRow: "breakRow", map: "map", pdf: "pdf", assign: "assign", schedule: "schedule", containers: "containers" });
export const SPITEX_ORDERS_TOUR_FINAL_HOLD_MS = 2000;
export const SPITEX_TOUR_FINISH_FINAL_HOLD_MS = 3000;
export const SPITEX_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
const SHIFT_LIST_ROW_SIZE_KEY = "SELECTED_ROW_ORDER_SHIFT";
const SHIFT_LIST_ROWS_PER_PAGE = "10";
export const SPITEX_INIT_SCRIPTS = Object.freeze([
  Object.freeze({ fn: ({ key, rows }) => localStorage.setItem(key, rows), arg: Object.freeze({ key: SHIFT_LIST_ROW_SIZE_KEY, rows: SHIFT_LIST_ROWS_PER_PAGE }) }),
]);

const RECIPE_OFFERED = "recipeOffered";
const REVIEW_STARTED = "reviewStarted";
const CONFIRMATION_PENDING = "confirmationPending";
const REVIEW_REMAINING = "reviewRemaining";
const REMAINING_PENDING = "remainingPending";
const EXECUTED = "executed";
const SPLIT_PREVIEWED = "splitPreviewed";
const SPLIT_DONE = "splitDone";
const BUNDLE_HELD = "bundleHeld";
const BREAK_OFFERED = "breakOffered";
const BREAK_HELD = "breakHeld";
const ROUTE_STALE = "routeStale";
const BREAK_DONE = "breakDone";
const ASSIGN_HELD = "assignHeld";
const BOOKED = "booked";

const START_SKILL = "start_order_review";
const DECISION_SKILL = "set_order_review_decision";
const PREVIEW_SKILL = "preview_order_review";
const EXECUTE_SKILL = "execute_order_review";
const CONFIRM_SKILL = "confirm_pending_action";
const SPLIT_SKILL = "split_shifts_by_weekday";
const BUNDLE_SKILL = "build_weekly_tours";
const BREAK_SKILL = "add_container_template_break";
const OPTIMIZE_SKILL = "optimize_container_route";
const PLACE_WORK_SKILL = "assign_container_week";
const SCHEDULE_SKILL = "open_schedule";
const LOOKUP_ONLY_SKILL = "get_page_controls";
const EXPECTED_CALLS_A = [[START_SKILL], [DECISION_SKILL], [PREVIEW_SKILL, EXECUTE_SKILL], [EXECUTE_SKILL, CONFIRM_SKILL], [SPLIT_SKILL], [BUNDLE_SKILL]];
const EXPECTED_CALLS_B = [[BREAK_SKILL], [PLACE_WORK_SKILL], [SCHEDULE_SKILL]];

const CUT_ROUTE = "/workplace/cut-shift";
const SEL_CUT_BUTTONS = "[id^='shift-cut-btn-']";
const CUT_ROW_ORDER = D.PATIENTS[0].order.name;
const CUT_PARTS_SHOWN = D.PATIENTS[0].order.weekdays.length;
const SEL_CUT_ROWS = "app-cut-shift-table tbody tr";
const WEEKDAY_MONDAY_BUTTON = 1;
const CONTAINER_BACK_STEPS_MAX = 8;
const BEAT = { intro: 800, cutHold: 5000, listHold: 900, pagePoll: 250, containerHold: 2500, mapHold: 4000, refreshMapHold: 3500, scheduleHold: 4000, startMapHold: 2000, breakRowHold: 4000 };
export const SPITEX_CHAT_PACE = Object.freeze({ typeDelayMs: 14, readAnswerMs: 1300, fastFactor: 20 });
const TEAM_ROWS_MIN = D.TEAM.length;
const BREAK_ROW_LABEL = /pause|pausa|break/i;
const GRID = Object.freeze({ rulerShare: 0.16, neighbourShare: 0.2, marginPx: 6, dragMs: 700, wheelPx: 70, wheelPauseMs: 380, wheelTicks: 4, holdMs: 1800 });
const SEL_CONTENT_SPLIT = ".content > as-split";
const SEL_GRID_ZONE = ".zone-center";
const SEL_PDF_BUTTON = "app-icon-route-file";
const BREAK_HIGHLIGHT_STYLE_ID = "spitex-break-highlight";
const BREAK_HIGHLIGHT_CSS = "#selected-tasks-list tr.absence-item td { background: #fff3b0 !important; } #selected-tasks-list tr.absence-item { outline: 3px solid #e0a800; outline-offset: -3px; }";
const PDF = Object.freeze({ popupTimeoutMs: 45000, blobPollMs: 250, holdMs: 4500, renderWidthPx: 1400, fastFactor: 8, overlayId: "spitex-pdf-overlay" });
const PYTHON = process.env.PYTHON ?? "python";
const PDF_PAGE_TO_PNG = "import fitz,sys;d=fitz.open(sys.argv[1]);p=d[0];z=int(sys.argv[3])/p.rect.width;p.get_pixmap(matrix=fitz.Matrix(z,z)).save(sys.argv[2])";
const PAGE_TIMEOUT_MS = 20000;
const REFRESH_TIMEOUT_MS = 25000;
const SCHEDULE_TIMEOUT_MS = 45000;
const EDIT_ADDRESS_ROUTE = "/workplace/edit-address/";
const EDIT_SHIFT_ROUTE = "/workplace/edit-shift/";
const MOVE_NORMAL_MS = 700;
const YES_REPLY_MARKER = "=yes";
const CONFIRMATION_REQUIRED = /confirmation required/i;
const LOG_PREVIEW_CHARS = 220;
const STRAIGHT_LINE_WORDING = /luftlinie|straight[- ]line|vol d'oiseau|linea d'aria/i;
const CHAT_PANEL_PX = 450;
const MAP_MIN_BOX = Object.freeze({ width: 300, height: 200 });
const VIEWPORT_MARGIN_PX = 8;
const CAPTION_GAP_PX = 6;
const MAP_CAPTION_COVER_MAX = 0.1;
const LIST_SCROLL = Object.freeze({ x: 500, y: 450, maxTicks: 14, tickPx: 100, tickPauseMs: 150 });
const TABLE_ROWS_PER_ITEM = 2;

const SHIFT_ROUTE = "/workplace/shift";
const SCHEDULE_ROUTE = "/workplace/schedule";
const CONTAINER_ROUTE = "/workplace/container-template";
const SEL_SHIFT_LIST = "#allShiftForm";
const SEL_SHIFT_ROWS = "#allShiftForm tbody tr";
const SEL_ABSENCE_ROWS = "#selected-tasks-list tr.absence-item";
const SEL_MAP_TOGGLE = "button.route-map-toggle";
const SEL_MAP_CANVAS = ".route-map-canvas";
const SEL_STOP_MARKERS = ".route-map-stop-marker";
const SEL_ROAD_PATH = ".route-map-canvas .leaflet-overlay-pane path";
const SEL_TILE_LOADED = ".route-map-canvas .leaflet-tile-loaded";
const SEL_MAP_HINT = ".route-map-hint";
const SEL_MAP_ZOOM_IN = ".route-map-canvas .leaflet-control-zoom-in";
const MAP_ENLARGED_MIN_HEIGHT = 200;
const MAP_NEIGHBOUR_MIN_SHARE = 0.2;
const MAP_GUTTER_MARGIN_PX = 6;
const MAP_DRAG_MS = 900;
const SEL_GEO_NOTICE = ".zone-route-map app-geo-service-notice";
const DIRECTIONS_PART = "Routing/Directions";
const SCHEDULE_GROUP_PARAM = "groupId";
const SCHEDULE_CLIENT_PARAM = "clientId";
const SCHEDULE_DATE_PARAM = "date";
const SCHEDULE_DAYS_TO_DEMO_WEEK = 22;
const SCHEDULE_WHEEL_PAUSE_MS = 90;
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const SEL_SHIFT_SCROLL_DOWN = ".vScrollAreaShift .arrow-thumb";
const SHIFT_LIST_TOP_Y = 330;
const SHIFT_LIST_TICKS_MAX = 70;
const SHIFT_LIST_WHEEL_PAUSE_MS = 45;
const WEEK = Object.freeze({ from: "2026-11-23", until: "2026-11-29" });

const PAGE_ORDERS = Object.freeze({ key: "orders", path: SHIFT_ROUTE, params: Object.freeze({ view: "orders" }), table: "#allShiftForm app-original-table" });
const PAGE_PLANNABLE = Object.freeze({ key: "plannable", path: SHIFT_ROUTE, params: Object.freeze({ view: "plannable" }), table: "#allShiftForm app-shift-table" });
const PAGE_CONTAINER = Object.freeze({ key: "container", pattern: T.CONTAINER_ROUTE_PATTERN });
const PAGE_CUT = Object.freeze({ key: "cut", path: CUT_ROUTE });
const PAGE_SCHEDULE = Object.freeze({ key: "schedule", path: SCHEDULE_ROUTE, params: Object.freeze({}) });

function log(tag, message) {
  console.log(`[${tag}] ${message}`);
}

const sentTurns = (turns) => turns.filter((t) => t.sent);
const callNames = (turn) => new Set((turn?.calls ?? []).map((c) => c.name));
const calledSkills = (turns) => new Set(sentTurns(turns).flatMap((t) => [...callNames(t)]));
const callOf = (turns, name) => sentTurns(turns).flatMap((t) => t.calls ?? []).find((c) => c.name === name) ?? null;
const isGuidedOffer = (turn) => Boolean(turn) && (turn.calls ?? []).length === 0 && (turn.content ?? "").includes(YES_REPLY_MARKER);
const isHeld = (turn) => Boolean(turn) && ((turn.results ?? []).some((r) => CONFIRMATION_REQUIRED.test(r.result)) || (turn.content ?? "").includes(YES_REPLY_MARKER));
const containerIdOf = (url) => (new URL(url).pathname.match(/\/([0-9a-f-]{36})$/i) ?? [])[1] ?? null;

function pathMatches(pathname, expected) {
  return expected.pattern ? expected.pattern.test(pathname) : pathname === expected.path;
}

function pageMatches(url, expected) {
  const parsed = new URL(url);
  if (!pathMatches(parsed.pathname, expected)) return false;
  return Object.entries(expected.params ?? {}).every(([key, value]) => parsed.searchParams.get(key) === value);
}

async function waitForUrl(page, expected, visited, timeoutMs = PAGE_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const requested = visited.find((url) => pageMatches(url, expected));
    if (requested && pathMatches(new URL(page.url()).pathname, expected)) return requested;
    await page.waitForTimeout(BEAT.pagePoll);
  }
  return null;
}

async function ordersInList(page) {
  const text = await page.locator(SEL_SHIFT_LIST).innerText().catch(() => "");
  return T.SPITEX_ORDERS.filter((o) => text.includes(o.name) || text.includes(o.abbreviation)).map((o) => o.abbreviation);
}

async function waitForOrderRows(page, expected) {
  const table = await page.locator(expected.table).waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
  const deadline = Date.now() + PAGE_TIMEOUT_MS;
  let shown = [];
  while (table && Date.now() < deadline) {
    shown = await ordersInList(page);
    if (shown.length >= ordersExpectedOnPage(await page.locator(SEL_SHIFT_ROWS).count())) break;
    await page.waitForTimeout(BEAT.pagePoll);
  }
  const firstRow = table ? await page.locator(SEL_SHIFT_ROWS).first().innerText().catch(() => "") : "";
  return { table, rows: await page.locator(SEL_SHIFT_ROWS).count(), ordersShown: shown, firstRowIsOrder: T.SPITEX_ORDERS.some((o) => firstRow.includes(o.name)) };
}

/** The list sizes its page to the window height (two table rows per item), so the first page may hold fewer than all orders. */
function ordersExpectedOnPage(rows) {
  const items = Math.floor(rows / TABLE_ROWS_PER_ITEM);
  return items > 0 ? Math.min(T.VISIT_COUNT, items) : T.VISIT_COUNT;
}

async function captionBox(page) {
  return page.locator(`#${CAPTION_ID}`).boundingBox().catch(() => null);
}

async function lastRowInside(page, viewport) {
  const box = await page.locator(SEL_SHIFT_ROWS).last().boundingBox().catch(() => null);
  const caption = await captionBox(page);
  const bottomLimit = Math.min(viewport.height - VIEWPORT_MARGIN_PX, caption ? caption.y - CAPTION_GAP_PX : Number.POSITIVE_INFINITY);
  return Boolean(box) && box.y >= 0 && box.y + box.height <= bottomLimit;
}

function coveredShare(box, cover) {
  if (!box || !cover) return 0;
  const width = Math.min(box.x + box.width, cover.x + cover.width) - Math.max(box.x, cover.x);
  const height = Math.min(box.y + box.height, cover.y + cover.height) - Math.max(box.y, cover.y);
  return width > 0 && height > 0 ? (width * height) / (box.width * box.height) : 0;
}

async function scrollListToEnd(page, mouse, viewport) {
  let scrolled = false;
  if (!(await lastRowInside(page, viewport))) {
    await mouse.moveTo({ x: LIST_SCROLL.x, y: LIST_SCROLL.y }, MOVE_NORMAL_MS);
    for (let tick = 0; tick < LIST_SCROLL.maxTicks && !(await lastRowInside(page, viewport)); tick++) {
      await page.mouse.wheel(0, LIST_SCROLL.tickPx);
      scrolled = true;
      await page.waitForTimeout(LIST_SCROLL.tickPauseMs);
    }
  }
  return { listScrolled: scrolled, lastRowVisible: await lastRowInside(page, viewport) };
}

async function countAtLeast(page, selector, wanted, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let count = await page.locator(selector).count();
  while (count < wanted && Date.now() < deadline) {
    await page.waitForTimeout(BEAT.pagePoll);
    count = await page.locator(selector).count();
  }
  return count;
}

/** Gutters of the vertical split around the tour map and the share of the split each neighbour zone must keep (its minSize). */
function mapGutters(mapCanvas) {
  const split = mapCanvas.closest(".zone-route-map")?.closest("as-split");
  if (!split) return null;
  const rect = split.getBoundingClientRect();
  const gutters = [...split.querySelectorAll(":scope > .as-split-gutter")].map((g) => g.getBoundingClientRect());
  if (gutters.length < 2) return null;
  const center = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  return { top: rect.y, bottom: rect.y + rect.height, height: rect.height, upper: center(gutters[0]), lower: center(gutters[1]) };
}

/**
 * The map opens in a narrow band (about 120 px at 1280x720); the planner drags both split gutters to give it most of the height and zooms in once
 * (the map keeps its fitted zoom when its box grows).
 */
async function enlargeMap(take) {
  const { page, mouse } = take;
  const canvas = page.locator(SEL_MAP_CANVAS).first();
  const before = await canvas.boundingBox().catch(() => null);
  if (!before || before.height >= MAP_ENLARGED_MIN_HEIGHT) return { enlarged: false, height: before ? Math.round(before.height) : null };
  const g = await canvas.evaluate(mapGutters).catch(() => null);
  if (!g) return { enlarged: false, height: Math.round(before.height) };
  const keep = g.height * MAP_NEIGHBOUR_MIN_SHARE + MAP_GUTTER_MARGIN_PX;
  await mouse.drag(g.upper, { x: g.upper.x, y: g.top + keep }, MAP_DRAG_MS);
  const lower = (await canvas.evaluate(mapGutters).catch(() => null))?.lower ?? g.lower;
  await mouse.drag(lower, { x: lower.x, y: g.bottom - keep }, MAP_DRAG_MS);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const zoomIn = page.locator(SEL_MAP_ZOOM_IN).first();
  if (await zoomIn.isVisible().catch(() => false)) await mouse.clickLocator(zoomIn, MOVE_NORMAL_MS);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const after = await canvas.boundingBox().catch(() => null);
  return { enlarged: true, height: after ? Math.round(after.height) : null };
}

/** The map of the page start stays on through the reload; it is switched off so the grid gets the room first. */
async function toggleMapOff(page) {
  const toggle = page.locator(SEL_MAP_TOGGLE).first();
  if ((await toggle.getAttribute("aria-pressed").catch(() => null)) === "true") {
    await toggle.click().catch(() => null);
    await page.waitForTimeout(CANVAS_SETTLE_MS);
  }
}

async function showMap(take, { caption, holdMs, chatOpen, stopsNeeded = T.VISIT_COUNT }) {
  const { page, mouse, captions, viewport } = take;
  const entry = { toggle: false };
  const directions = page.waitForResponse((r) => r.url().includes(DIRECTIONS_PART), { timeout: PAGE_TIMEOUT_MS }).then((r) => r.status(), () => null);
  entry.toggle = await page.locator(SEL_MAP_TOGGLE).waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
  if (!entry.toggle) return entry;
  const pressed = (await page.locator(SEL_MAP_TOGGLE).getAttribute("aria-pressed")) === "true";
  if (!pressed) await mouse.clickLocator(page.locator(SEL_MAP_TOGGLE), MOVE_NORMAL_MS);
  entry.stops = await countAtLeast(page, SEL_STOP_MARKERS, stopsNeeded, PAGE_TIMEOUT_MS);
  entry.road = (await countAtLeast(page, SEL_ROAD_PATH, 1, PAGE_TIMEOUT_MS)) > 0;
  entry.tiles = (await countAtLeast(page, SEL_TILE_LOADED, 1, PAGE_TIMEOUT_MS)) > 0;
  entry.directionsStatus = pressed ? "map was already on" : await directions;
  entry.estimatedHint = await page.locator(SEL_MAP_HINT).count();
  entry.geoNotice = await page.locator(SEL_GEO_NOTICE).count();
  entry.resize = await enlargeMap(take);
  const box = await page.locator(SEL_MAP_CANVAS).first().boundingBox().catch(() => null);
  entry.mapBox = box ? { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } : null;
  entry.mapInsideView = Boolean(box) && box.width >= MAP_MIN_BOX.width && box.height >= MAP_MIN_BOX.height
    && box.x >= 0 && box.y >= 0 && box.y + box.height <= viewport.height + 1 && box.x + box.width <= viewport.width - (chatOpen ? CHAT_PANEL_PX : 0) + VIEWPORT_MARGIN_PX;
  if (caption) await captions?.show(caption);
  entry.captionCoversMap = Number(coveredShare(box, await captionBox(page)).toFixed(2));
  await page.waitForTimeout(holdMs);
  return entry;
}

function mapProblems(entry, label, stopsNeeded = T.VISIT_COUNT) {
  if (!entry.toggle) return [`${label}: the tour map toggle never appeared (start/end base or route info missing)`];
  const problems = [];
  if ((entry.stops ?? 0) !== stopsNeeded) problems.push(`${label}: the map shows ${entry.stops ?? 0} stop markers, expected ${stopsNeeded}`);
  if (!entry.road) problems.push(`${label}: the map has no route line`);
  if (!entry.tiles) problems.push(`${label}: no map tile was loaded`);
  if (entry.estimatedHint > 0) problems.push(`${label}: the map shows the estimated straight line, not the road route`);
  if (entry.geoNotice > 0) problems.push(`${label}: the map is replaced by the geo service notice`);
  if (entry.captionCoversMap > MAP_CAPTION_COVER_MAX) problems.push(`${label}: the caption covers ${Math.round(entry.captionCoversMap * 100)} % of the map`);
  if (!entry.mapInsideView) problems.push(`${label}: the map is not fully readable next to the chat panel (${JSON.stringify(entry.mapBox)})`);
  return problems;
}

async function waitForContainerEditor(page) {
  await page.locator(SEL_WEEKDAY_BUTTONS).first().waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS });
  await page.locator(SEL_TIME_RULER).waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS });
  return (await page.locator(SEL_READONLY).count()) === 0;
}

/** The tour map spans the right part of the container page, which the open chat panel covers at 1280 px: the panel is closed for the map. */
async function closeChatPanel(take) {
  const { page, mouse } = take;
  if (!(await page.locator(SEL_ASSISTANT_INPUT).isVisible().catch(() => false))) return true;
  await mouse.clickLocator(page.locator(SEL_ASSISTANT_CLOSE), MOVE_NORMAL_MS);
  return page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "hidden", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
}

async function openChatPanel(take) {
  const { page, mouse } = take;
  if (await page.locator(SEL_ASSISTANT_INPUT).isVisible().catch(() => false)) return true;
  await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE_NORMAL_MS);
  return page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS }).then(() => true, () => false);
}

/** Rect of the gutters of the split that holds `zoneSelector` and the split's own rect (both in viewport pixels). */
async function splitAround(page, zoneSelector) {
  return page.locator(zoneSelector).first().evaluate((zone) => {
    const split = zone.closest("as-split");
    if (!split) return null;
    const rect = split.getBoundingClientRect();
    const zoneRect = zone.getBoundingClientRect();
    const gutters = [...split.querySelectorAll(":scope > .as-split-gutter")]
      .map((g) => g.getBoundingClientRect())
      .filter((g) => g.width > 0 && g.height > 0)
      .map((g) => ({ x: g.x + g.width / 2, y: g.y + g.height / 2 }));
    return { top: rect.y, bottom: rect.y + rect.height, height: rect.height, zoneBottom: zoneRect.y + zoneRect.height, gutters };
  }).catch(() => null);
}

/**
 * Gives the "Zugewiesene Aufgaben" grid the room to be read: the time ruler on the left is narrowed to its minimum and the gutter below the
 * grid is dragged down, then the grid scrolls through its rows (visit times, work time, patient and address, the break row).
 */
async function showGrid(take, holdMs = GRID.holdMs) {
  const { page, mouse } = take;
  const entry = {};
  const content = await page.locator(SEL_CONTENT_SPLIT).first().evaluate((split) => {
    const rect = split.getBoundingClientRect();
    const gutter = split.querySelector(":scope > .as-split-gutter")?.getBoundingClientRect();
    return gutter ? { left: rect.x, width: rect.width, gutter: { x: gutter.x + gutter.width / 2, y: gutter.y + gutter.height / 2 } } : null;
  }).catch(() => null);
  if (content) {
    await mouse.drag(content.gutter, { x: content.left + content.width * GRID.rulerShare, y: content.gutter.y }, GRID.dragMs);
    entry.rulerNarrowed = true;
  }
  const split = await splitAround(page, SEL_GRID_ZONE);
  const below = split?.gutters.find((g) => g.y >= split.zoneBottom - GRID.marginPx);
  if (below) {
    await mouse.drag(below, { x: below.x, y: split.bottom - split.height * GRID.neighbourShare - GRID.marginPx }, GRID.dragMs);
    entry.gridEnlarged = true;
  }
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const box = await page.locator(SEL_SELECTED_LIST).first().boundingBox().catch(() => null);
  entry.gridBox = box ? { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } : null;
  if (box) {
    await mouse.moveTo({ x: box.x + box.width / HALF, y: box.y + box.height / HALF }, MOVE_NORMAL_MS);
    for (let tick = 0; tick < GRID.wheelTicks; tick++) {
      await page.mouse.wheel(0, GRID.wheelPx);
      await page.waitForTimeout(GRID.wheelPauseMs);
    }
  }
  entry.visibleRows = await page.locator(SEL_SELECTED_ROWS).evaluateAll((rows) => rows.filter((r) => {
    const b = r.getBoundingClientRect();
    return b.height > 0 && b.y >= 0 && b.y + b.height <= window.innerHeight;
  }).length).catch(() => 0);
  await page.waitForTimeout(holdMs);
  return entry;
}

/** Marks the break row of the grid (an annotation of the clip, like the captions) and scrolls it into the middle of the grid. */
async function highlightBreakRow(page) {
  await page.evaluate(({ id, css }) => {
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, { id: BREAK_HIGHLIGHT_STYLE_ID, css: BREAK_HIGHLIGHT_CSS });
  const row = page.locator(SEL_ABSENCE_ROWS).first();
  await row.evaluate((r) => r.scrollIntoView({ block: "center", behavior: "smooth" })).catch(() => null);
  return row.innerText().then((t) => t.replace(/\s+/g, " ").trim(), () => "");
}

async function removeBreakHighlight(page) {
  await page.evaluate((id) => document.getElementById(id)?.remove(), BREAK_HIGHLIGHT_STYLE_ID).catch(() => null);
}

function framesDirOf(take) {
  const dir = take.report.framesDir ?? path.join(os.tmpdir(), "spitex-pdf");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Prints the route of the open tour (route PDF export of the grid toolbar): the app hands the generated PDF to a new tab as a blob URL, which
 * headless Chromium downloads instead of showing; the take keeps the blob when the URL is created, closes the tab, renders page 1 with PyMuPDF and shows that image over the app for PDF.holdMs (headless Chromium has no PDF
 * viewer). The wait for the generation runs fast-forward.
 */
async function showRoutePdf(take, caption) {
  const { page, mouse, recorder, captions } = take;
  const entry = { button: false };
  const button = page.locator(SEL_PDF_BUTTON).first();
  entry.button = await button.isVisible().catch(() => false);
  if (!entry.button) return entry;
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL);
    window.__spitexPdfBlob = null;
    URL.createObjectURL = (blob) => {
      window.__spitexPdfBlob = blob;
      return create(blob);
    };
  });
  await mouse.clickLocator(button, MOVE_NORMAL_MS);
  await recorder.beginFast(PDF.fastFactor);
  try {
    const deadline = Date.now() + PDF.popupTimeoutMs;
    while (!(await page.evaluate(() => Boolean(window.__spitexPdfBlob))) && Date.now() < deadline) await page.waitForTimeout(PDF.blobPollMs);
    const bytes = await page.evaluate(async () => (window.__spitexPdfBlob ? Array.from(new Uint8Array(await window.__spitexPdfBlob.arrayBuffer())) : []));
    if (bytes.length === 0) return entry;
    const dir = framesDirOf(take);
    const pdfFile = path.join(dir, "route.pdf");
    const pngFile = path.join(dir, "route-page1.png");
    writeFileSync(pdfFile, Buffer.from(bytes));
    execFileSync(PYTHON, ["-I", "-c", PDF_PAGE_TO_PNG, pdfFile, pngFile, String(PDF.renderWidthPx)]);
    entry.pdfBytes = bytes.length;
    entry.image = readFileSync(pngFile).toString("base64");
  } finally {
    for (const other of page.context().pages()) if (other !== page) await other.close().catch(() => null);
    await page.bringToFront().catch(() => null);
    await recorder.endFast();
  }
  await page.evaluate(({ id, src }) => {
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(32,44,44,0.82);display:flex;align-items:center;justify-content:center";
    const img = document.createElement("img");
    img.src = src;
    img.style.cssText = "max-height:94vh;max-width:70vw;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,0.45);border-radius:4px";
    overlay.appendChild(img);
    document.body.appendChild(overlay);
  }, { id: PDF.overlayId, src: `data:image/png;base64,${entry.image}` });
  delete entry.image;
  entry.shown = true;
  if (caption) await captions?.show(caption);
  await page.waitForTimeout(PDF.holdMs);
  await page.evaluate((id) => document.getElementById(id)?.remove(), PDF.overlayId);
  return entry;
}

async function showOrderList(take, expected, turnIndex, visited) {
  const { page, mouse, viewport } = take;
  const requested = await waitForUrl(page, expected, visited);
  const entry = { turn: turnIndex, page: expected.key, requested, url: page.url(), reached: requested !== null };
  if (requested) {
    Object.assign(entry, await waitForOrderRows(page, expected));
    await page.waitForTimeout(BEAT.listHold);
    Object.assign(entry, await scrollListToEnd(page, mouse, viewport));
    await page.waitForTimeout(BEAT.listHold);
  }
  return entry;
}

/** Opens the cut page of one order through the scissors of its row: the parts stand there as one row per weekday, the view of the clip. */
async function showCutPage(take, turnIndex, cues) {
  const { page, mouse, captions } = take;
  const entry = { turn: turnIndex, page: PAGE_CUT.key, reached: false };
  await closeChatPanel(take);
  const row = page.locator(SEL_SHIFT_ROWS).filter({ hasText: CUT_ROW_ORDER }).first();
  const scissors = row.locator(SEL_CUT_BUTTONS);
  entry.clicked = await scissors.isVisible().catch(() => false);
  if (!entry.clicked) return entry;
  await mouse.clickLocator(scissors, MOVE_NORMAL_MS);
  entry.reached = await page.waitForURL((url) => url.pathname.startsWith(CUT_ROUTE), { timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
  if (!entry.reached) return entry;
  entry.rows = await countAtLeast(page, SEL_CUT_ROWS, CUT_PARTS_SHOWN, PAGE_TIMEOUT_MS);
  await captions?.show(cues.cutParts);
  await page.waitForTimeout(BEAT.cutHold);
  entry.panelReopened = await openChatPanel(take);
  return entry;
}

async function selectWeekday(take, weekday, expectedRows) {
  const { page, mouse } = take;
  await mouse.clickLocator(page.locator(SEL_WEEKDAY_BUTTONS).nth(weekday - 1), MOVE_NORMAL_MS);
  const rows = await countAtLeast(page, SEL_SELECTED_ROWS, expectedRows, PAGE_TIMEOUT_MS);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  return rows;
}

/** Monday and the fuller Thursday of one tour, grid and map; tours differ per day on purpose. */
async function showTourWeek(take, cues) {
  const { captions } = take;
  const entry = {};
  entry.mondayRows = await selectWeekday(take, WEEKDAY_MONDAY_BUTTON, D.areaPatientsOn(D.AREA_KEYS[0], WEEKDAY_MONDAY_BUTTON).length);
  await captions?.show(cues.visits);
  entry.grid = await showGrid(take, BEAT.containerHold);
  await captions?.show(cues.weekdays);
  entry.rows = await selectWeekday(take, D.DEMO_WEEKDAY, T.VISIT_COUNT);
  await take.page.waitForTimeout(BEAT.containerHold);
  entry.map = await showMap(take, { caption: cues.map, holdMs: BEAT.mapHold, chatOpen: false });
  return entry;
}

async function showContainerPage(take, turnIndex, visited, cues, containers) {
  const { page, captions, recorder, options } = take;
  const requested = await waitForUrl(page, PAGE_CONTAINER, visited);
  const entry = { turn: turnIndex, page: PAGE_CONTAINER.key, requested, url: page.url(), reached: requested !== null };
  if (!requested) return entry;
  entry.containerId = containerIdOf(requested);
  entry.editable = await waitForContainerEditor(page).catch(() => false);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  entry.panelClosed = await closeChatPanel(take);
  Object.assign(entry, await showTourWeek(take, cues));
  const other = containers.find((c) => c.id.toLowerCase() !== String(entry.containerId).toLowerCase());
  if (other) {
    entry.lockReleased = await leaveEditor(page);
    await recorder.beginFast(PDF.fastFactor);
    await page.goto(`${options.uiUrl}${CONTAINER_ROUTE}/${other.id}`, { timeout: S.NAV_TIMEOUT_MS });
    entry.secondEditable = await waitForContainerEditor(page).catch(() => false);
    await recorder.endFast();
    await captions?.show(cues.secondTour);
    entry.second = await showTourWeek(take, cues);
  }
  return entry;
}

/** Name lookups of Klacksy may leave the container page; the history brings it back without reloading the app, so the chat stays open. */
async function returnToContainerPage(page) {
  for (let step = 0; step < CONTAINER_BACK_STEPS_MAX && !T.CONTAINER_ROUTE_PATTERN.test(new URL(page.url()).pathname); step++) {
    await page.goBack({ timeout: PAGE_TIMEOUT_MS }).catch(() => null);
    await page.waitForTimeout(BEAT.pagePoll);
  }
  return T.CONTAINER_ROUTE_PATTERN.test(new URL(page.url()).pathname);
}

async function waitForSchedule(page) {
  const grid = page.locator(SEL_GRID_CANVAS).first();
  const visible = await grid.waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const names = await page.locator(SEL_NAME_ROWS).allInnerTexts().catch(() => []);
  return { gridVisible: visible, names: names.map((n) => n.replace(/\s+/g, " ").trim()) };
}

/** The month opens on its first day; one wheel event moves the grid by one day, so the tours of the demo week come into view. */
async function scrollScheduleToDemoWeek(take) {
  const { page, mouse } = take;
  const grid = await gridBox(page);
  await mouse.moveTo({ x: grid.x + grid.width / HALF, y: grid.y + grid.height / HALF }, MOVE_NORMAL_MS);
  for (let day = 0; day < SCHEDULE_DAYS_TO_DEMO_WEEK; day++) {
    await page.mouse.wheel(1, 0);
    await page.waitForTimeout(SCHEDULE_WHEEL_PAUSE_MS);
  }
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

/**
 * The containers stand in the shift list below the schedule, sorted by name after all visits: the planner pulls the list up and scrolls to its end,
 * so the two tours are on screen with the week they are planned in.
 */
async function showContainerRows(take) {
  const { page, mouse, captions } = take;
  const gutters = page.locator(SEL_SPLIT_GUTTER);
  for (let i = 0; i < await gutters.count(); i++) {
    const box = await gutters.nth(i).boundingBox();
    if (box && box.width > box.height) {
      const x = box.x + box.width / HALF;
      await mouse.drag({ x, y: box.y + box.height / HALF }, { x, y: SHIFT_LIST_TOP_Y }, MAP_DRAG_MS);
      break;
    }
  }
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const section = await shiftGeometry(page);
  await mouse.moveTo({ x: section.box.x + section.box.width / HALF, y: section.box.y + section.box.height / HALF }, MOVE_NORMAL_MS);
  await captions?.show(SPITEX_TOUR_FINISH_CUES.containers);
  const atBottom = async () => (await page.locator(SEL_SHIFT_SCROLL_DOWN).last().getAttribute("aria-disabled")) === "true";
  for (let tick = 0; tick < SHIFT_LIST_TICKS_MAX && !(await atBottom()); tick++) {
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(SHIFT_LIST_WHEEL_PAUSE_MS);
  }
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  return atBottom();
}

async function showSchedule(take, turnIndex, visited) {
  const { page } = take;
  const requested = await waitForUrl(page, PAGE_SCHEDULE, visited, SCHEDULE_TIMEOUT_MS);
  const entry = { turn: turnIndex, page: PAGE_SCHEDULE.key, requested, url: page.url(), reached: requested !== null };
  entry.locationHref = await page.evaluate(() => location.href).catch(() => null);
  entry.visited = [...visited];
  if (requested) {
    const params = new URL(requested).searchParams;
    Object.assign(entry, { groupId: params.get(SCHEDULE_GROUP_PARAM), clientId: params.get(SCHEDULE_CLIENT_PARAM), date: params.get(SCHEDULE_DATE_PARAM) }, await waitForSchedule(page));
    entry.panelClosed = await closeChatPanel(take);
    await scrollScheduleToDemoWeek(take);
    await page.waitForTimeout(BEAT.scheduleHold);
    entry.containersShown = await showContainerRows(take);
    await page.waitForTimeout(BEAT.scheduleHold);
  }
  return entry;
}

function turnProblems(turns, expectedCalls, navigationAllowed) {
  const problems = [];
  sentTurns(turns).forEach((turn, i) => {
    if (turn.errors.length > 0) problems.push(`answer ${i + 1}: chat error ${turn.errors.join("; ")}`);
    if (turn.content.trim() === "") problems.push(`answer ${i + 1} has no text`);
    if (STRAIGHT_LINE_WORDING.test(turn.content)) problems.push(`answer ${i + 1} calls the travel times straight-line estimates`);
    if (turn.navigateTo && !navigationAllowed(turn)) problems.push(`answer ${i + 1} navigated to ${turn.navigateTo} unexpectedly`);
    const failed = turn.results.find((r) => r.result.startsWith(SKILL_ERROR_PREFIX) && r.name !== LOOKUP_ONLY_SKILL);
    if (failed) problems.push(`answer ${i + 1}: ${failed.name} failed: ${failed.result}`);
  });
  const called = calledSkills(turns);
  for (const alternatives of expectedCalls) {
    if (!alternatives.some((name) => called.has(name))) problems.push(`expected skill call ${alternatives.join(" or ")} is missing`);
  }
  return problems;
}

function fullViewportCrop(viewport, scale) {
  const even = (value) => {
    const px = Math.round(value * scale);
    return px - (px % HALF);
  };
  return { x: 0, y: 0, width: even(viewport.width), height: even(viewport.height) };
}

async function driveChat(take, tag, flow) {
  const { report, script, captions } = take;
  const messages = script?.messages ?? [];
  if (messages.length === 0) throw new Error(`${tag} needs a script`);
  for (const message of messages) {
    if (message.sendWhen) {
      const state = await flow.readState();
      const skipped = flow.skipReason(message, report.turns, state);
      if (skipped) {
        report.turns.push({ prompt: message.text, sent: false, skipped: true, reason: skipped });
        log(tag, `skipped (${skipped}): ${message.text}`);
        continue;
      }
      const reason = flow.notSentReason(message, report.turns, state, report.pages);
      if (reason) {
        report.turns.push({ prompt: message.text, sent: false, reason });
        log(tag, `not sent (${reason}): ${message.text}`);
        break;
      }
    }
    await captions?.show(message.cue ?? flow.firstCue);
    log(tag, `prompt: ${message.text}`);
    flow.visited.length = 0;
    const turn = await sendChatMessage(take, message.text);
    report.turns.push({ prompt: message.text, sent: true, ...turn });
    log(tag, `calls: ${turn.calls.map((c) => c.name).join(", ") || "-"}; answer: ${turn.content.replace(/\s+/g, " ").slice(0, LOG_PREVIEW_CHARS)}`);
    await flow.afterTurn(turn, await flow.readState(), sentTurns(report.turns).length);
  }
}

function trackNavigations(page) {
  const visited = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) visited.push(frame.url());
  });
  return visited;
}

async function takeSpitexOrdersTour(take) {
  const { page, api, options, recorder, mouse, report, viewport, scale } = take;
  const tag = "spitex-orders-tour";
  take.chatPace = SPITEX_CHAT_PACE;
  const post = (apiPath, data) => api.json(apiPath, { method: HTTP_POST, data });
  const dateProblem = T.recordingDateProblem();
  if (dateProblem) throw new Error(dateProblem);
  const group = await T.spitexGroup(api);
  report.group = group;
  report.ordersBefore = await T.spitexOrderCounts(post);
  if (!T.noneSealed(report.ordersBefore)) {
    throw new Error(`the Spitex orders are not all open (${JSON.stringify(report.ordersBefore)}) - copy the seeded database again`);
  }
  const containersBefore = await T.spitexContainers(api, post);
  const knownContainers = new Set((await T.listContainers(post)).map((c) => c.id));
  if (containersBefore.length > 0) throw new Error(`a Spitex container exists already (${containersBefore.map((c) => c.name).join(", ")}) - copy the seeded database again`);
  await openSchedule(page, { ...options, groupId: group.id });
  report.turns = [];
  report.pages = [];
  const visited = trackNavigations(page);
  const cues = SPITEX_ORDERS_TOUR_CUES;
  const flow = {
    visited,
    firstCue: cues.request,
    async readState() {
      const counts = await T.spitexOrderCounts(post);
      const sealed = T.allSealed(counts);
      return { counts, splitParts: sealed ? await T.splitPartTotal(post) : 0, containers: sealed ? await T.spitexContainers(api, post, knownContainers) : [] };
    },
    skipReason(message, turns, state) {
      if (message.sendWhen === RECIPE_OFFERED && calledSkills(turns).has(START_SKILL)) return "the order review already started";
      if (message.sendWhen === CONFIRMATION_PENDING && T.sealedTotal(state.counts) > 0) return "the first bundle is sealed already";
      if ((message.sendWhen === REVIEW_REMAINING || message.sendWhen === REMAINING_PENDING) && T.allSealed(state.counts)) return "every order is already sealed";
      if (message.sendWhen === BUNDLE_HELD && state.containers.length >= T.TOUR_COUNT) return "both tours exist already";
      if (message.sendWhen === SPLIT_PREVIEWED && state.splitParts >= T.SPLIT_PART_COUNT) return "the shifts are cut already";
      return null;
    },
    notSentReason(message, turns, state, pages) {
      const called = calledSkills(turns);
      const last = sentTurns(turns).at(-1);
      const lastCalls = callNames(last);
      if (message.sendWhen === EXECUTED) {
        if (!T.allSealed(state.counts)) return "the orders were not all sealed";
        if (!lastCalls.has(EXECUTE_SKILL) && !lastCalls.has(CONFIRM_SKILL)) return "the previous answer did not execute the review";
        if (state.containers.length > 0) return "a container exists before the bundle sentence";
        const shown = pages.find((p) => p.page === PAGE_PLANNABLE.key);
        if (!shown?.reached) return "the plannable shifts were not on screen";
        return null;
      }
      if (message.sendWhen === REVIEW_REMAINING || message.sendWhen === REMAINING_PENDING) return T.sealedTotal(state.counts) > 0 ? null : "no bundle was sealed yet";
      if (message.sendWhen === SPLIT_PREVIEWED) return lastCalls.has(SPLIT_SKILL) ? null : "Klacksy showed no cut preview";
      if (message.sendWhen === SPLIT_DONE) return state.splitParts === T.SPLIT_PART_COUNT ? null : `the cut made ${state.splitParts} parts, expected ${T.SPLIT_PART_COUNT}`;
      if (message.sendWhen === BUNDLE_HELD) {
        if (!T.allSealed(state.counts)) return "the orders are not sealed";
        if (!isHeld(last)) return "Klacksy neither created both tours nor held them for a yes";
        return null;
      }
      if (T.sealedTotal(state.counts) > 0) return "orders already sealed";
      if (message.sendWhen === RECIPE_OFFERED && !(last?.content ?? "").includes(YES_REPLY_MARKER)) return "Klacksy did not offer the guided order review";
      if (message.sendWhen === REVIEW_STARTED && !called.has(START_SKILL)) return "Klacksy did not start the order review";
      if (message.sendWhen === CONFIRMATION_PENDING && !lastCalls.has(PREVIEW_SKILL) && !lastCalls.has(EXECUTE_SKILL)) return "Klacksy showed no preview to confirm";
      return null;
    },
    async afterTurn(turn, state, turnIndex) {
      const calls = callNames(turn);
      const shown = (key) => report.pages.some((p) => p.page === key);
      let entry = null;
      if (state.containers.length >= T.TOUR_COUNT && !shown(PAGE_CONTAINER.key)) entry = await showContainerPage(take, turnIndex, visited, cues, state.containers);
      else if (state.splitParts === T.SPLIT_PART_COUNT && !shown(PAGE_CUT.key)) entry = await showCutPage(take, turnIndex, cues);
      else if ((calls.has(EXECUTE_SKILL) || calls.has(CONFIRM_SKILL)) && T.allSealed(state.counts) && !shown(PAGE_PLANNABLE.key)) {
        entry = await showOrderList(take, PAGE_PLANNABLE, turnIndex, visited);
      } else if (calls.has(START_SKILL) && T.sealedTotal(state.counts) === 0 && !shown(PAGE_ORDERS.key)) {
        entry = await showOrderList(take, PAGE_ORDERS, turnIndex, visited);
      }
      if (entry) {
        report.pages.push(entry);
        log(tag, `page ${entry.page}: ${JSON.stringify(entry)}`);
      }
    },
  };
  try {
    await recorder.start();
    await page.waitForTimeout(BEAT.intro);
    await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE_NORMAL_MS);
    await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    await driveChat(take, tag, flow);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(take.finalHoldMs ?? SPITEX_ORDERS_TOUR_FINAL_HOLD_MS);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullViewportCrop(viewport, scale) });
    report.finalUrl = page.url();
    report.lockReleased = await leaveEditor(page);
    report.ordersAfter = await T.spitexOrderCounts(post);
    const containers = await T.spitexContainers(api, post);
    report.containers = containers.map((c) => ({ id: c.id, name: c.name, summary: T.templateSummary(c.template) }));
    report.splitParts = await T.splitPartTotal(post);
    const problems = [...turnProblems(report.turns, EXPECTED_CALLS_A, (turn) => navigationOfOrdersTour(turn.navigateTo))];
    const notSent = report.turns.find((t) => !t.sent && !t.skipped);
    if (notSent) problems.unshift(`not sent: ${notSent.reason}`);
    problems.push(...ordersTourPageProblems(report.pages));
    if (!T.allSealed(report.ordersAfter)) problems.push(`orders after the take: ${JSON.stringify(report.ordersAfter)}`);
    if (report.splitParts !== T.SPLIT_PART_COUNT) problems.push(`the cut made ${report.splitParts} parts, expected ${T.SPLIT_PART_COUNT}`);
    problems.push(...await weekToursProblems(api, containers));
    report.bundleParameters = callsOf(report.turns, BUNDLE_SKILL).map((c) => c.parameters);
    problems.push(...bundleCallsProblems(report.bundleParameters, group));
    if (!T.CONTAINER_ROUTE_PATTERN.test(new URL(report.finalUrl).pathname)) problems.push("the take did not end on the container page");
    report.failure = report.failure ?? (problems.join("; ") || null);
    report.publishable = report.failure === null;
  }
}

const callsOf = (turns, name) => sentTurns(turns).flatMap((t) => t.calls ?? []).filter((c) => c.name === name);

async function weekToursProblems(api, containers) {
  const problems = toursProblems(containers);
  for (const container of containers) {
    const area = T.containerArea(container.template);
    if (area) problems.push(...T.weekProblems(await T.containerTemplates(api, container.id), area).map((p) => `${container.name}: ${p}`));
  }
  return problems;
}

function toursProblems(containers) {
  if (containers.length !== T.TOUR_COUNT) return [`${containers.length} containers hold Spitex visits, expected ${T.TOUR_COUNT}`];
  const problems = [];
  const areas = containers.map((c) => T.containerArea(c.template));
  if (new Set(areas.filter(Boolean)).size !== T.TOUR_COUNT) problems.push(`the tours do not cover both areas (${areas.join(",")})`);
  containers.forEach((c, i) => problems.push(...T.visitProblems(c.template, areas[i]), ...noBreakYet(c.template)));
  return problems;
}

/** The tour call names the Spitex group, two tours, the demo week and the tour window. */
function bundleCallsProblems(calls, group) {
  const problems = [];
  if (calls.length < 1) problems.push("no tour call");
  calls.forEach((parameters, i) => {
    problems.push(...T.bundleParameterProblems(parameters, group).map((p) => `bundle call ${i + 1}: ${p}`));
    if (parameters?.untilTime && T.hhmm(parameters.untilTime) !== D.TOUR_WINDOW.until) problems.push(`bundle call ${i + 1}: untilTime ${parameters.untilTime}, expected ${D.TOUR_WINDOW.until}`);
  });
  return problems;
}

function navigationOfOrdersTour(target) {
  const path = String(target).split("?")[0];
  return path === SHIFT_ROUTE || path.startsWith(CUT_ROUTE) || T.CONTAINER_ROUTE_PATTERN.test(path);
}

const noBreakYet = (template) => (T.breakItems(template).length > 0 ? ["the template already holds a break item"] : []);

function ordersTourPageProblems(pages) {
  const problems = [];
  const find = (key) => pages.find((p) => p.page === key);
  for (const expected of [PAGE_ORDERS, PAGE_PLANNABLE]) {
    const entry = find(expected.key);
    if (!entry?.reached) problems.push(`the ${expected.key} list was not opened`);
    else if (!entry.table) problems.push(`the ${expected.key} list did not show its table`);
    else if (entry.ordersShown.length < ordersExpectedOnPage(entry.rows) || !entry.firstRowIsOrder) problems.push(`the ${expected.key} list showed ${entry.ordersShown.join(",") || "none"} of the orders`);
    else if (!entry.lastRowVisible) problems.push(`the ${expected.key} list was not scrolled to its last row`);
  }
  const cut = find(PAGE_CUT.key);
  if (!cut?.reached) problems.push("the cut page was not opened");
  else if (cut.rows < CUT_PARTS_SHOWN) problems.push(`the cut page lists ${cut.rows} rows, expected at least ${CUT_PARTS_SHOWN}`);
  const container = find(PAGE_CONTAINER.key);
  if (!container?.reached) problems.push("the container page was not opened");
  else {
    if (!container.editable) problems.push("the container page is read-only (foreign lock)");
    if (!container.panelClosed) problems.push("the chat panel did not close before the map");
    if (container.rows < T.VISIT_COUNT) problems.push(`the container page lists ${container.rows} rows, expected ${T.VISIT_COUNT}`);
    problems.push(...mapProblems(container.map ?? { toggle: false }, "container page"));
    if (!container.second) problems.push("the second tour was not shown");
    else problems.push(...mapProblems(container.second.map ?? { toggle: false }, "second tour"));
  }
  return problems;
}

async function tourState(api, group, tours, nurses) {
  const state = { tours: {}, works: {} };
  for (const area of D.AREA_KEYS) {
    const templates = await T.containerTemplates(api, tours[area].id);
    const template = T.templateOn(templates, D.DEMO_WEEKDAY);
    state.tours[area] = { template, templates, breaks: T.breakItems(template).length, breakProblems: T.weekBreakProblems(templates) };
  }
  for (const nurse of nurses) state.works[nurse.key] = await T.nurseWorks(api, group, nurse);
  const all = Object.values(state.tours);
  state.allBreaks = all.every((t) => t.breaks > 0);
  state.someBreak = all.some((t) => t.breaks > 0);
  state.breakProblems = all.flatMap((t) => t.breakProblems);
  state.allBooked = nurses.every((n) => state.works[n.key].inDemoWeek === D.DEMO_WEEK.length);
  state.someBooked = nurses.some((n) => state.works[n.key].onDemoDay > 0);
  return state;
}

async function takeSpitexTourFinish(take) {
  const { page, api, options, recorder, mouse, report, viewport, scale } = take;
  const tag = "spitex-tour-finish";
  take.chatPace = SPITEX_CHAT_PACE;
  const post = (apiPath, data) => api.json(apiPath, { method: HTTP_POST, data });
  const dateProblem = T.recordingDateProblem();
  if (dateProblem) throw new Error(dateProblem);
  const group = await T.spitexGroup(api);
  const nurses = [];
  for (const person of D.TOUR_NURSES) nurses.push(await T.findNurse(api, person));
  report.group = group;
  report.nurses = nurses;
  report.ordersBefore = await T.spitexOrderCounts(post);
  if (!T.allSealed(report.ordersBefore)) throw new Error(`the Spitex orders are not sealed (${JSON.stringify(report.ordersBefore)}) - record clip A first and copy its database`);
  const containers = await T.spitexContainers(api, post);
  const startProblems = toursProblems(containers);
  if (startProblems.length > 0) throw new Error(`the tours are not in the state after clip A: ${startProblems.join("; ")}`);
  const tours = {};
  for (const container of containers) tours[T.containerArea(container.template)] = container;
  const shownTour = tours[D.AREA_KEYS[0]];
  report.tours = Object.fromEntries(D.AREA_KEYS.map((area) => [area, { id: tours[area].id, name: tours[area].name, before: T.templateSummary(tours[area].template) }]));
  report.worksBefore = {};
  for (const nurse of nurses) {
    report.worksBefore[nurse.key] = await T.nurseWorks(api, group, nurse);
    if (report.worksBefore[nurse.key].inDemoWeek > 0) throw new Error(`${nurse.name} is booked in the demo week already - copy the database of clip A again`);
  }
  await page.goto(`${options.uiUrl}${CONTAINER_ROUTE}/${shownTour.id}`, { timeout: S.NAV_TIMEOUT_MS });
  report.editableBefore = await waitForContainerEditor(page);
  report.rowsBefore = await countAtLeast(page, SEL_SELECTED_ROWS, 1, PAGE_TIMEOUT_MS);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  report.turns = [];
  report.pages = [];
  const visited = trackNavigations(page);
  const cues = SPITEX_TOUR_FINISH_CUES;
  const flow = {
    visited,
    firstCue: cues.break,
    readState: () => tourState(api, group, tours, nurses),
    skipReason(message, turns, state) {
      if (message.sendWhen === BREAK_OFFERED && !isGuidedOffer(sentTurns(turns).at(-1))) return "Klacksy offered no guided action";
      if (message.sendWhen === BREAK_HELD && state.allBreaks) return "both breaks exist already";
      if (message.sendWhen === ROUTE_STALE && state.allBreaks && state.breakProblems.length === 0) return "both routes are optimized around the break already";
      if (message.sendWhen === ASSIGN_HELD && state.allBooked) return "both tours are booked already";
      return null;
    },
    notSentReason(message, turns, state) {
      const last = sentTurns(turns).at(-1);
      if (message.sendWhen === BREAK_HELD) return isHeld(last) || state.someBreak ? null : "Klacksy neither added the breaks nor held them for a yes";
      if (message.sendWhen === ROUTE_STALE) return state.someBreak ? null : "there is no break to optimize around";
      if (message.sendWhen === BREAK_DONE) return state.breakProblems.length === 0 ? null : `the breaks are not in place (${state.breakProblems.join("; ")})`;
      if (message.sendWhen === ASSIGN_HELD) return isHeld(last) || state.someBooked ? null : "Klacksy neither booked the tours nor held them for a yes";
      if (message.sendWhen === BOOKED) return state.allBooked ? null : "not both tours are booked";
      return null;
    },
    async afterTurn(turn, state, turnIndex) {
      const calls = callNames(turn);
      const shown = (key) => report.pages.some((p) => p.page === key);
      let entry = null;
      if (state.allBreaks && state.breakProblems.length === 0 && !shown("container-refresh")) {
        const back = await returnToContainerPage(page);
        await page.locator(SEL_WEEKDAY_BUTTONS).first().waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).catch(() => null);
        entry = { turn: turnIndex, page: "container-refresh", url: page.url(), reached: back };
        entry.panelClosed = await closeChatPanel(take);
        entry.rows = await selectWeekday(take, D.DEMO_WEEKDAY, T.VISIT_COUNT + 1);
        entry.breakRows = await page.locator(SEL_ABSENCE_ROWS).count();
        await page.waitForTimeout(CANVAS_SETTLE_MS);
        await toggleMapOff(page);
        entry.grid = await showGrid(take, 0);
        entry.breakRowText = await highlightBreakRow(page);
        await take.captions?.show(cues.breakRow);
        await page.waitForTimeout(BEAT.breakRowHold);
        await removeBreakHighlight(page);
        entry.map = await showMap(take, { caption: cues.map, holdMs: BEAT.refreshMapHold, chatOpen: false });
        entry.pdf = await showRoutePdf(take, cues.pdf);
        entry.panelReopened = await openChatPanel(take);
      } else if (calls.has(SCHEDULE_SKILL) && !shown(PAGE_SCHEDULE.key)) {
        entry = await showSchedule(take, turnIndex, visited);
      }
      if (entry) {
        report.pages.push(entry);
        log(tag, `page ${entry.page}: ${JSON.stringify(entry)}`);
      }
    },
  };
  try {
    await recorder.start();
    await page.waitForTimeout(BEAT.intro);
    await selectWeekday(take, D.DEMO_WEEKDAY, T.VISIT_COUNT);
    report.startMap = await showMap(take, { caption: null, holdMs: BEAT.startMapHold, chatOpen: false });
    await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE_NORMAL_MS);
    await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    await driveChat(take, tag, flow);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(take.finalHoldMs ?? SPITEX_TOUR_FINISH_FINAL_HOLD_MS);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullViewportCrop(viewport, scale) });
    report.finalUrl = page.url();
    const state = await tourState(api, group, tours, nurses);
    report.toursAfter = Object.fromEntries(D.AREA_KEYS.map((area) => [area, T.templateSummary(state.tours[area].template)]));
    report.worksAfter = state.works;
    const nurseIds = Object.values(nurses).map((n) => n.id.toLowerCase());
    const showsLookup = (turn) => String(turn.navigateTo ?? "").startsWith(EDIT_SHIFT_ROUTE) || nurseIds.some((id) => String(turn.navigateTo ?? "").toLowerCase() === `${EDIT_ADDRESS_ROUTE}${id}`);
    const problems = [...turnProblems(report.turns, EXPECTED_CALLS_B, (turn) => callNames(turn).has(SCHEDULE_SKILL) || showsLookup(turn))];
    const notSent = report.turns.find((t) => !t.sent && !t.skipped);
    if (notSent) problems.unshift(`not sent: ${notSent.reason}`);
    problems.push(...tourFinishProblems(report, group, nurses, tours, state));
    report.failure = report.failure ?? (problems.join("; ") || null);
    report.publishable = report.failure === null;
  }
}

function reoptimized(turns, containerId) {
  const same = (c) => String(c.parameters?.containerId ?? "").toLowerCase() === containerId.toLowerCase();
  return callsOf(turns, OPTIMIZE_SKILL).some(same)
    || callsOf(turns, BREAK_SKILL).some((c) => same(c) && String(c.parameters?.reoptimizeRoute).toLowerCase() === "true");
}

function tourFinishProblems(report, group, nurses, tours, state) {
  const problems = [];
  const placed = callsOf(report.turns, PLACE_WORK_SKILL).map((c) => c.parameters ?? {});
  const bookedNurses = new Set();
  for (const area of D.AREA_KEYS) {
    const tour = tours[area];
    problems.push(...T.weekProblems(state.tours[area].templates, area), ...T.weekBreakProblems(state.tours[area].templates).map((p) => `${area}: ${p}`));
    if (!callsOf(report.turns, BREAK_SKILL).some((c) => String(c.parameters?.containerId ?? "").toLowerCase() === tour.id.toLowerCase())) problems.push(`no break call for ${tour.name}`);
    if (!reoptimized(report.turns, tour.id)) problems.push(`the route of ${tour.name} was not optimized again`);
    const bookings = placed.filter((p) => String(p.containerId ?? "").toLowerCase() === tour.id.toLowerCase());
    if (bookings.length !== 1) problems.push(`${tour.name} was assigned ${bookings.length} times, expected once`);
    for (const booking of bookings) {
      const nurse = nurses.find((n) => n.id.toLowerCase() === String(booking.clientId ?? "").toLowerCase());
      if (!nurse) problems.push(`${tour.name} was booked for client ${booking.clientId}, not for one of the tour nurses`);
      else bookedNurses.add(nurse.key);
      if (String(booking.fromDate ?? "").slice(0, D.DEMO_DAY.length) > D.DEMO_WEEK[0] || String(booking.untilDate ?? "").slice(0, D.DEMO_DAY.length) < D.DEMO_WEEK[D.DEMO_WEEK.length - 1]) problems.push(`${tour.name} was booked ${booking.fromDate}..${booking.untilDate}, not the demo week`);
    }
  }
  if (bookedNurses.size !== nurses.length) problems.push(`the tours went to ${bookedNurses.size} different nurse(s), expected ${nurses.length}`);
  for (const nurse of nurses) {
    const after = report.worksAfter[nurse.key];
    const before = report.worksBefore[nurse.key];
    if (after.inDemoWeek !== D.DEMO_WEEK.length) problems.push(`${nurse.name} has ${after.inDemoWeek} works in the demo week, expected ${D.DEMO_WEEK.length}`);
    if (after.otherDays !== before.otherDays) problems.push(`${nurse.name} has ${after.otherDays} works on other days, before ${before.otherDays}`);
  }
  const find = (key) => report.pages.find((p) => p.page === key);
  const refresh = find("container-refresh");
  if (!refresh?.reached) problems.push("the container page was not shown after the breaks");
  else {
    if (refresh.breakRows < 1) problems.push("the container page shows no break row after the break (page not refreshed)");
    if (!BREAK_ROW_LABEL.test(refresh.breakRowText ?? "") ||!(refresh.breakRowText ?? "").includes(T.BREAK_START)) problems.push(`the break row reads "${refresh.breakRowText}", not the unpaid break at ${T.BREAK_START}`);
    if (!refresh.pdf?.shown) problems.push(`the route PDF was not shown (${JSON.stringify(refresh.pdf)})`);
    if (!refresh.panelClosed || !refresh.panelReopened) problems.push("the chat panel was not closed for the map and opened again");
    if (refresh.rows < T.VISIT_COUNT + 1) problems.push(`the container page lists ${refresh.rows} rows after the break, expected ${T.VISIT_COUNT + 1} (page not refreshed)`);
    problems.push(...mapProblems(refresh.map ?? { toggle: false }, "container page after the break"));
  }
  problems.push(...mapProblems(report.startMap ?? { toggle: false }, "container page before the break"));
  if (!report.editableBefore) problems.push("the container page is read-only (foreign lock)");
  const schedule = find(PAGE_SCHEDULE.key);
  if (!schedule?.reached) problems.push("the schedule was not opened");
  else {
    if (!schedule.gridVisible) problems.push("the schedule grid was not visible");
    if (schedule.names.some(Boolean)) for (const nurse of Object.values(nurses)) if (!schedule.names.some((n) => n.includes(nurse.lastName))) problems.push(`the schedule does not list ${nurse.name}`);
    if (schedule.names.length < TEAM_ROWS_MIN) problems.push(`the schedule lists ${schedule.names.length} people, expected the team of ${TEAM_ROWS_MIN}`);
    if (!schedule.containersShown) problems.push("the shift list was not scrolled to the containers");
    if (schedule.groupId !== group.id) problems.push(`the schedule opened on group ${schedule.groupId} / client ${schedule.clientId}, not on "${group.name}"`);
    if (!schedule.date || schedule.date < WEEK.from || schedule.date > WEEK.until) problems.push(`the schedule opened on ${schedule.date}, not in the week of ${D.DEMO_DAY}`);
  }
  if (new URL(report.finalUrl).pathname !== SCHEDULE_ROUTE) problems.push(`the take ended on ${report.finalUrl}, not on the schedule`);
  return problems;
}

export const SPITEX_TAKE_RUNNERS = {
  [VIDEO_SPITEX_ORDERS_TOUR]: takeSpitexOrdersTour,
  [VIDEO_SPITEX_TOUR_FINISH]: takeSpitexTourFinish,
};
