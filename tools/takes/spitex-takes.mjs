// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story takes of the two Spitex clips (plan: docs/knowledge/spitex-container-story-plan-2026-10-29.md; demo data lib/spitex-demo.mjs, seeded by
 * seed-spitex-demo.mjs into klacks_marketing_spitex). Both take the chat panel of Klacksy at 1280x720 and keep it open from its first click to
 * the end (the story builder paints a cover over the panel's settings rows for the whole time the panel is open).
 * spitex-orders-tour (clip A): the planner goes through the eight open Spitex orders with Klacksy (order review, same dialogue as simple-order-review:
 * the guided action is offered, the proposals are taken without expenses, the held execute_order_review is confirmed), the sealed orders show up as
 * plannable shifts, then one sentence bundles the Thursday visits in Winterthur into a container (bundle_nearby_timerange_shifts_into_container);
 * the app opens the container page, the take waits for the eight visits, shows them, switches the tour map on and holds it. The take ends on the
 * container page and leaves it through its back link (releases the container lock) so the database copy can become the start of clip B.
 * spitex-tour-finish (clip B, needs the database copy after a publishable clip A): the container page of the tour is opened with the map on,
 * Klacksy adds the lunch break at 12:00 and optimizes the route again (the page reloads, the take checks its rows and the map), books the tour for the
 * nurse on Thursday (place_work) and opens the schedule on the group and week (open_schedule).
 * Every message after the first waits for its condition (checked on the API, never on the answer text alone): recipeOffered, reviewStarted,
 * confirmationPending, executed, bundleHeld (A); breakHeld, routeStale, breakDone, assignHeld, booked (B). A "yes" fallback is skipped when its effect is
 * already there; any other message whose condition is not met is not sent and the take is not publishable. Captions are tied to the messages that always
 * happen (script field "cue"), never to a fallback of their own. publishable = every expected call made, no skill error, every page reached and read
 * (rows, map, schedule), the stored state is the story (A: orders sealed, ONE container holding exactly the eight Spitex visits with visit and
 * travel times and route info, bundle called with weekday 4, the Spitex group and a date range around DEMO_DAY; B: one break item 12:00-12:30,
 * no visit overlapping it, route info, the nurse booked on DEMO_DAY only, final page schedule of the Spitex group in the week of DEMO_DAY).
 * @param take - page, api, options, recorder, mouse, report, script, captions, viewport, scale, finalHoldMs (see recordTake)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { SEL_ASSISTANT_INPUT, SKILL_ERROR_PREFIX, sendChatMessage } from "../lib/klacksy-chat.mjs";
import { CANVAS_SETTLE_MS, HALF, HTTP_POST, SEL_GRID_CANVAS, SEL_NAME_ROWS, openSchedule } from "../lib/schedule-grid.mjs";
import { SEL_READONLY, SEL_SELECTED_ROWS, SEL_TIME_RULER, SEL_WEEKDAY_BUTTONS, leaveEditor } from "../lib/container-editor.mjs";
import * as D from "../lib/spitex-demo.mjs";
import * as T from "../lib/spitex-tour-state.mjs";

export const VIDEO_SPITEX_ORDERS_TOUR = "spitex-orders-tour";
export const VIDEO_SPITEX_TOUR_FINISH = "spitex-tour-finish";
export const SPITEX_VIDEOS = [VIDEO_SPITEX_ORDERS_TOUR, VIDEO_SPITEX_TOUR_FINISH];
export const SPITEX_ORDERS_TOUR_CUES = Object.freeze({ request: "request", accept: "accept", confirm: "confirm", bundle: "bundle", visits: "visits", map: "map" });
export const SPITEX_TOUR_FINISH_CUES = Object.freeze({ break: "break", map: "map", assign: "assign", schedule: "schedule" });
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
const EXECUTED = "executed";
const BUNDLE_HELD = "bundleHeld";
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
const BUNDLE_SKILL = "bundle_nearby_timerange_shifts_into_container";
const BREAK_SKILL = "add_container_template_break";
const OPTIMIZE_SKILL = "optimize_container_route";
const PLACE_WORK_SKILL = "place_work";
const SCHEDULE_SKILL = "open_schedule";
const EXPECTED_CALLS_A = [[START_SKILL], [DECISION_SKILL], [PREVIEW_SKILL, EXECUTE_SKILL], [EXECUTE_SKILL, CONFIRM_SKILL], [BUNDLE_SKILL]];
const EXPECTED_CALLS_B = [[BREAK_SKILL], [PLACE_WORK_SKILL], [SCHEDULE_SKILL]];

const BEAT = { intro: 1200, listHold: 2500, pagePoll: 250, containerHold: 3500, mapHold: 6000, refreshMapHold: 5000, scheduleHold: 5000, startMapHold: 2500 };
const PAGE_TIMEOUT_MS = 20000;
const REFRESH_TIMEOUT_MS = 25000;
const MOVE_NORMAL_MS = 700;
const YES_REPLY_MARKER = "=yes";
const CONFIRMATION_REQUIRED = /confirmation required/i;
const LOG_PREVIEW_CHARS = 220;
const CHAT_PANEL_PX = 450;
const MAP_MIN_BOX = Object.freeze({ width: 300, height: 150 });
const VIEWPORT_MARGIN_PX = 8;
const LIST_SCROLL = Object.freeze({ x: 500, y: 450, maxTicks: 14, tickPx: 100, tickPauseMs: 150 });

const SHIFT_ROUTE = "/workplace/shift";
const SCHEDULE_ROUTE = "/workplace/schedule";
const CONTAINER_ROUTE = "/workplace/container-template";
const SEL_SHIFT_LIST = "#allShiftForm";
const SEL_SHIFT_ROWS = "#allShiftForm tbody tr";
const SEL_MAP_TOGGLE = "button.route-map-toggle";
const SEL_MAP_CANVAS = ".route-map-canvas";
const SEL_STOP_MARKERS = ".route-map-stop-marker";
const SEL_ROAD_PATH = ".route-map-canvas .leaflet-overlay-pane path";
const SEL_TILE_LOADED = ".route-map-canvas .leaflet-tile-loaded";
const SEL_MAP_HINT = ".route-map-hint";
const SEL_GEO_NOTICE = ".zone-route-map app-geo-service-notice";
const DIRECTIONS_PART = "Routing/Directions";
const SCHEDULE_GROUP_PARAM = "groupId";
const SCHEDULE_DATE_PARAM = "date";
const WEEK = Object.freeze({ from: "2026-11-02", until: "2026-11-08" });

const PAGE_ORDERS = Object.freeze({ key: "orders", path: SHIFT_ROUTE, params: Object.freeze({ view: "orders" }), table: "#allShiftForm app-original-table" });
const PAGE_PLANNABLE = Object.freeze({ key: "plannable", path: SHIFT_ROUTE, params: Object.freeze({ view: "plannable" }), table: "#allShiftForm app-shift-table" });
const PAGE_CONTAINER = Object.freeze({ key: "container", pattern: T.CONTAINER_ROUTE_PATTERN });
const PAGE_SCHEDULE = Object.freeze({ key: "schedule", path: SCHEDULE_ROUTE, params: Object.freeze({}) });

function log(tag, message) {
  console.log(`[${tag}] ${message}`);
}

const sentTurns = (turns) => turns.filter((t) => t.sent);
const callNames = (turn) => new Set((turn?.calls ?? []).map((c) => c.name));
const calledSkills = (turns) => new Set(sentTurns(turns).flatMap((t) => [...callNames(t)]));
const callOf = (turns, name) => sentTurns(turns).flatMap((t) => t.calls ?? []).find((c) => c.name === name) ?? null;
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

async function waitForUrl(page, expected, visited) {
  const deadline = Date.now() + PAGE_TIMEOUT_MS;
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
    if (shown.length >= T.VISIT_COUNT) break;
    await page.waitForTimeout(BEAT.pagePoll);
  }
  const firstRow = table ? await page.locator(SEL_SHIFT_ROWS).first().innerText().catch(() => "") : "";
  return { table, rows: await page.locator(SEL_SHIFT_ROWS).count(), ordersShown: shown, firstRowIsOrder: T.SPITEX_ORDERS.some((o) => firstRow.includes(o.name)) };
}

async function lastRowInside(page, viewport) {
  const box = await page.locator(SEL_SHIFT_ROWS).last().boundingBox().catch(() => null);
  return Boolean(box) && box.y >= 0 && box.y + box.height <= viewport.height - VIEWPORT_MARGIN_PX;
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
  const box = await page.locator(SEL_MAP_CANVAS).first().boundingBox().catch(() => null);
  entry.mapBox = box ? { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } : null;
  entry.mapInsideView = Boolean(box) && box.width >= MAP_MIN_BOX.width && box.height >= MAP_MIN_BOX.height
    && box.x >= 0 && box.y >= 0 && box.y + box.height <= viewport.height + 1 && box.x + box.width <= viewport.width - (chatOpen ? CHAT_PANEL_PX : 0) + VIEWPORT_MARGIN_PX;
  if (caption) await captions?.show(caption);
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
  if (!entry.mapInsideView) problems.push(`${label}: the map is not fully readable next to the chat panel (${JSON.stringify(entry.mapBox)})`);
  return problems;
}

async function waitForContainerEditor(page) {
  await page.locator(SEL_WEEKDAY_BUTTONS).first().waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS });
  await page.locator(SEL_TIME_RULER).waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS });
  return (await page.locator(SEL_READONLY).count()) === 0;
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

async function showContainerPage(take, turnIndex, visited, cues) {
  const { page, captions } = take;
  const requested = await waitForUrl(page, PAGE_CONTAINER, visited);
  const entry = { turn: turnIndex, page: PAGE_CONTAINER.key, requested, url: page.url(), reached: requested !== null };
  if (!requested) return entry;
  entry.containerId = containerIdOf(requested);
  entry.editable = await waitForContainerEditor(page).catch(() => false);
  entry.rows = await countAtLeast(page, SEL_SELECTED_ROWS, T.VISIT_COUNT, PAGE_TIMEOUT_MS);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await captions?.show(cues.visits);
  await page.waitForTimeout(BEAT.containerHold);
  entry.map = await showMap(take, { caption: cues.map, holdMs: BEAT.mapHold, chatOpen: true });
  return entry;
}

async function waitForSchedule(page) {
  const grid = page.locator(SEL_GRID_CANVAS).first();
  const visible = await grid.waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const names = await page.locator(SEL_NAME_ROWS).allInnerTexts().catch(() => []);
  return { gridVisible: visible, nurseRow: names.some((n) => n.includes(D.NURSE.name)) };
}

async function showSchedule(take, turnIndex, visited) {
  const { page } = take;
  const requested = await waitForUrl(page, PAGE_SCHEDULE, visited);
  const entry = { turn: turnIndex, page: PAGE_SCHEDULE.key, requested, url: page.url(), reached: requested !== null };
  if (requested) {
    const params = new URL(requested).searchParams;
    Object.assign(entry, { groupId: params.get(SCHEDULE_GROUP_PARAM), date: params.get(SCHEDULE_DATE_PARAM) }, await waitForSchedule(page));
    await page.waitForTimeout(BEAT.scheduleHold);
  }
  return entry;
}

function turnProblems(turns, expectedCalls, navigationAllowed) {
  const problems = [];
  sentTurns(turns).forEach((turn, i) => {
    if (turn.errors.length > 0) problems.push(`answer ${i + 1}: chat error ${turn.errors.join("; ")}`);
    if (turn.content.trim() === "") problems.push(`answer ${i + 1} has no text`);
    if (turn.navigateTo && !navigationAllowed(turn)) problems.push(`answer ${i + 1} navigated to ${turn.navigateTo} unexpectedly`);
    const failed = turn.results.find((r) => r.result.startsWith(SKILL_ERROR_PREFIX));
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
  const post = (apiPath, data) => api.json(apiPath, { method: HTTP_POST, data });
  const group = await T.spitexGroup(api);
  report.group = group;
  report.ordersBefore = await T.spitexOrderCounts(post);
  if (!T.noneSealed(report.ordersBefore)) {
    throw new Error(`the Spitex orders are not all open (${JSON.stringify(report.ordersBefore)}) - copy the seeded database again`);
  }
  const containersBefore = await T.spitexContainers(api, post);
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
      return { counts, containers: T.allSealed(counts) ? await T.spitexContainers(api, post) : [] };
    },
    skipReason(message, turns, state) {
      if (message.sendWhen === RECIPE_OFFERED && calledSkills(turns).has(START_SKILL)) return "the order review already started";
      if (message.sendWhen === CONFIRMATION_PENDING && T.allSealed(state.counts)) return "every order is already sealed";
      if (message.sendWhen === BUNDLE_HELD && state.containers.length > 0) return "the container exists already";
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
      if (message.sendWhen === BUNDLE_HELD) {
        if (!T.allSealed(state.counts)) return "the orders are not sealed";
        if (!isHeld(last)) return "Klacksy neither created the container nor held the bundle for a yes";
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
      if (state.containers.length > 0 && !shown(PAGE_CONTAINER.key)) entry = await showContainerPage(take, turnIndex, visited, cues);
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
    const problems = [...turnProblems(report.turns, EXPECTED_CALLS_A, (turn) => navigationOfOrdersTour(turn.navigateTo))];
    const notSent = report.turns.find((t) => !t.sent && !t.skipped);
    if (notSent) problems.unshift(`not sent: ${notSent.reason}`);
    problems.push(...ordersTourPageProblems(report.pages));
    if (!T.allSealed(report.ordersAfter)) problems.push(`orders after the take: ${JSON.stringify(report.ordersAfter)}`);
    if (containers.length !== 1) problems.push(`${containers.length} containers hold Spitex visits, expected 1`);
    else problems.push(...T.visitProblems(containers[0].template), ...noBreakYet(containers[0].template));
    report.bundleParameters = callOf(report.turns, BUNDLE_SKILL)?.parameters ?? null;
    problems.push(...T.bundleParameterProblems(report.bundleParameters, group));
    if (!T.CONTAINER_ROUTE_PATTERN.test(new URL(report.finalUrl).pathname)) problems.push("the take did not end on the container page");
    report.failure = report.failure ?? (problems.join("; ") || null);
    report.publishable = report.failure === null;
  }
}

function navigationOfOrdersTour(target) {
  const path = String(target).split("?")[0];
  return path === SHIFT_ROUTE || T.CONTAINER_ROUTE_PATTERN.test(path);
}

const noBreakYet = (template) => (T.breakItems(template).length > 0 ? ["the template already holds a break item"] : []);

function ordersTourPageProblems(pages) {
  const problems = [];
  const find = (key) => pages.find((p) => p.page === key);
  for (const expected of [PAGE_ORDERS, PAGE_PLANNABLE]) {
    const entry = find(expected.key);
    if (!entry?.reached) problems.push(`the ${expected.key} list was not opened`);
    else if (!entry.table) problems.push(`the ${expected.key} list did not show its table`);
    else if (entry.ordersShown.length < T.VISIT_COUNT || !entry.firstRowIsOrder) problems.push(`the ${expected.key} list showed ${entry.ordersShown.join(",") || "none"} of the orders`);
    else if (!entry.lastRowVisible) problems.push(`the ${expected.key} list was not scrolled to its last row`);
  }
  const container = find(PAGE_CONTAINER.key);
  if (!container?.reached) problems.push("the container page was not opened");
  else {
    if (!container.editable) problems.push("the container page is read-only (foreign lock)");
    if (container.rows < T.VISIT_COUNT) problems.push(`the container page lists ${container.rows} rows, expected ${T.VISIT_COUNT}`);
    problems.push(...mapProblems(container.map ?? { toggle: false }, "container page"));
  }
  return problems;
}

async function takeSpitexTourFinish(take) {
  const { page, api, options, recorder, mouse, report, viewport, scale } = take;
  const tag = "spitex-tour-finish";
  const post = (apiPath, data) => api.json(apiPath, { method: HTTP_POST, data });
  const group = await T.spitexGroup(api);
  const nurse = await T.findNurse(api);
  report.group = group;
  report.nurse = nurse;
  report.ordersBefore = await T.spitexOrderCounts(post);
  if (!T.allSealed(report.ordersBefore)) throw new Error(`the Spitex orders are not sealed (${JSON.stringify(report.ordersBefore)}) - record clip A first and copy its database`);
  const containers = await T.spitexContainers(api, post);
  if (containers.length !== 1) throw new Error(`${containers.length} containers hold Spitex visits, expected 1 - copy the database of a publishable clip A`);
  const [container] = containers;
  const startProblems = [...T.visitProblems(container.template), ...noBreakYet(container.template)];
  if (startProblems.length > 0) throw new Error(`the container is not in the state after clip A: ${startProblems.join("; ")}`);
  report.worksBefore = await T.nurseWorks(api, group, nurse);
  if (report.worksBefore.all > 0) throw new Error(`the nurse is booked already (${JSON.stringify(report.worksBefore)}) - copy the database of clip A again`);
  report.containerId = container.id;
  report.templateBefore = T.templateSummary(container.template);
  await page.goto(`${options.uiUrl}${CONTAINER_ROUTE}/${container.id}`, { timeout: S.NAV_TIMEOUT_MS });
  report.editableBefore = await waitForContainerEditor(page);
  report.rowsBefore = await countAtLeast(page, SEL_SELECTED_ROWS, T.VISIT_COUNT, PAGE_TIMEOUT_MS);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  report.turns = [];
  report.pages = [];
  const visited = trackNavigations(page);
  const cues = SPITEX_TOUR_FINISH_CUES;
  const flow = {
    visited,
    firstCue: cues.break,
    async readState() {
      const template = await T.containerTemplate(api, container.id);
      const breaks = T.breakItems(template).length;
      return { template, breaks, breakProblems: breaks === 1 ? T.breakProblems(template) : ["no break"], works: await T.nurseWorks(api, group, nurse) };
    },
    skipReason(message, turns, state) {
      if (message.sendWhen === BREAK_HELD && state.breaks > 0) return "the break exists already";
      if (message.sendWhen === ROUTE_STALE && state.breaks === 1 && state.breakProblems.length === 0) return "the route is optimized around the break already";
      if (message.sendWhen === ASSIGN_HELD && state.works.onDemoDay > 0) return "the tour is booked already";
      return null;
    },
    notSentReason(message, turns, state) {
      const last = sentTurns(turns).at(-1);
      if (message.sendWhen === BREAK_HELD) return isHeld(last) ? null : "Klacksy neither added the break nor held it for a yes";
      if (message.sendWhen === ROUTE_STALE) return state.breaks === 1 ? null : "there is no break to optimize around";
      if (message.sendWhen === BREAK_DONE) return state.breakProblems.length === 0 ? null : `the break is not in place (${state.breakProblems.join("; ")})`;
      if (message.sendWhen === ASSIGN_HELD) return isHeld(last) ? null : "Klacksy neither booked the tour nor held it for a yes";
      if (message.sendWhen === BOOKED) return state.works.onDemoDay > 0 ? null : "the tour is not booked";
      return null;
    },
    async afterTurn(turn, state, turnIndex) {
      const calls = callNames(turn);
      const shown = (key) => report.pages.some((p) => p.page === key);
      let entry = null;
      if (state.breaks > 0 && state.breakProblems.length === 0 && !shown("container-refresh")) {
        const rows = await countAtLeast(page, SEL_SELECTED_ROWS, T.VISIT_COUNT + 1, REFRESH_TIMEOUT_MS);
        entry = { turn: turnIndex, page: "container-refresh", url: page.url(), reached: true, rows };
        await page.waitForTimeout(CANVAS_SETTLE_MS);
        entry.map = await showMap(take, { caption: cues.map, holdMs: BEAT.refreshMapHold, chatOpen: true });
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
    report.startMap = await showMap(take, { caption: null, holdMs: BEAT.startMapHold, chatOpen: false });
    await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE_NORMAL_MS);
    await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    await driveChat(take, tag, flow);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(take.finalHoldMs ?? SPITEX_TOUR_FINISH_FINAL_HOLD_MS);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullViewportCrop(viewport, scale) });
    report.finalUrl = page.url();
    const template = await T.containerTemplate(api, container.id);
    report.templateAfter = T.templateSummary(template);
    report.worksAfter = await T.nurseWorks(api, group, nurse);
    const problems = [...turnProblems(report.turns, EXPECTED_CALLS_B, (turn) => callNames(turn).has(SCHEDULE_SKILL))];
    const notSent = report.turns.find((t) => !t.sent && !t.skipped);
    if (notSent) problems.unshift(`not sent: ${notSent.reason}`);
    problems.push(...tourFinishProblems(report, group, nurse, container.id, template));
    report.failure = report.failure ?? (problems.join("; ") || null);
    report.publishable = report.failure === null;
  }
}

function reoptimized(turns) {
  const breakCall = callOf(turns, BREAK_SKILL);
  return calledSkills(turns).has(OPTIMIZE_SKILL) || String(breakCall?.parameters?.reoptimizeRoute).toLowerCase() === "true";
}

function tourFinishProblems(report, group, nurse, containerId, template) {
  const problems = [...T.visitProblems(template), ...T.breakProblems(template)];
  if (!reoptimized(report.turns)) problems.push(`the route was not optimized again (no ${OPTIMIZE_SKILL} call and no reoptimizeRoute=true)`);
  const breakParameters = callOf(report.turns, BREAK_SKILL)?.parameters ?? {};
  if (String(breakParameters.containerId ?? "").toLowerCase() !== containerId.toLowerCase()) problems.push(`the break went to container ${breakParameters.containerId}, not to ${containerId}`);
  const placed = callOf(report.turns, PLACE_WORK_SKILL)?.parameters ?? {};
  if (String(placed.clientId ?? "").toLowerCase() !== nurse.id.toLowerCase()) problems.push(`place_work booked client ${placed.clientId}, not ${D.NURSE.firstName} ${D.NURSE.name}`);
  if (String(placed.shiftId ?? "").toLowerCase() !== containerId.toLowerCase()) problems.push(`place_work booked shift ${placed.shiftId}, not the tour container`);
  if (String(placed.date ?? "").slice(0, D.DEMO_DAY.length) !== D.DEMO_DAY) problems.push(`place_work booked on ${placed.date}, not on ${D.DEMO_DAY}`);
  if (report.worksAfter.onDemoDay < 1) problems.push("the nurse has no work on the demo day");
  if (report.worksAfter.otherDays > 0) problems.push(`the nurse has ${report.worksAfter.otherDays} works on other days`);
  const find = (key) => report.pages.find((p) => p.page === key);
  const refresh = find("container-refresh");
  if (!refresh?.reached) problems.push("the container page was not shown after the break");
  else {
    if (refresh.rows < T.VISIT_COUNT + 1) problems.push(`the container page lists ${refresh.rows} rows after the break, expected ${T.VISIT_COUNT + 1} (page not refreshed)`);
    problems.push(...mapProblems(refresh.map ?? { toggle: false }, "container page after the break"));
  }
  problems.push(...mapProblems(report.startMap ?? { toggle: false }, "container page before the break"));
  if (!report.editableBefore) problems.push("the container page is read-only (foreign lock)");
  const schedule = find(PAGE_SCHEDULE.key);
  if (!schedule?.reached) problems.push("the schedule was not opened");
  else {
    if (!schedule.gridVisible) problems.push("the schedule grid was not visible");
    if (!schedule.nurseRow) problems.push(`the schedule does not list ${D.NURSE.name}`);
    if (schedule.groupId !== group.id) problems.push(`the schedule opened on group ${schedule.groupId}, not on "${group.name}"`);
    if (!schedule.date || schedule.date < WEEK.from || schedule.date > WEEK.until) problems.push(`the schedule opened on ${schedule.date}, not in the week of ${D.DEMO_DAY}`);
  }
  if (new URL(report.finalUrl).pathname !== SCHEDULE_ROUTE) problems.push(`the take ended on ${report.finalUrl}, not on the schedule`);
  return problems;
}

export const SPITEX_TAKE_RUNNERS = {
  [VIDEO_SPITEX_ORDERS_TOUR]: takeSpitexOrdersTour,
  [VIDEO_SPITEX_TOUR_FINISH]: takeSpitexTourFinish,
};
