// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take simple-order-review (story video 3 "Neue Bestellungen"): the planner asks Klacksy to go through the open orders,
 * Klacksy starts the order review and the app opens the shift list on the open orders (Dienste > Bestellungen); the planner
 * takes all proposals without expenses, Klacksy relays the server preview, and only after the planner's yes are the orders
 * sealed and cut - the app then shows the new plannable shifts (view=plannable) and Klacksy offers the schedule; on the
 * planner's yes open_schedule opens the schedule on the group and week of the new shifts. Every message after the first waits
 * for its condition: recipeOffered (Klacksy asks whether to start the guided action; skipped when the review already
 * started), reviewStarted (start_order_review ran and nothing is sealed yet), confirmationPending (a preview or a held
 * execute_order_review, orders still open; skipped once every order is sealed) and executed (every order sealed by the
 * previous answer and the plannable shifts on screen). A message whose condition is not met is not sent and the take is not
 * publishable. After every navigation the take waits until the page shows the orders (list rows or schedule grid) and holds
 * it so the viewer can read it; report.pages records what was on screen. The shift list removes view/from/until from the URL
 * once it applied them, so the requested URL is taken from the navigations of the turn and the list kind from its table
 * (orders: app-original-table, plannable shifts: app-shift-table). On the schedule the shift pane is only two rows high
 * at 720 px and lists the group's shifts by name, so Sandra's cursor drags the split up and scrolls the pane to the new
 * "Rund um die Uhr" shifts (a visible user action that only moves the view; the pane is a canvas, so this is checked on
 * frames, not in the DOM). The take seals the seeded orders
 * (lib/order-review-demo.mjs), so every take needs a fresh copy of the seeded database; it refuses to record unless every
 * seeded order is open.
 * The take presets the shift list to five rows per page (the list's own "Anzahl Zeilen" setting) so all four orders fit
 * on the first page at 1280x720 next to the chat panel.
 * @param take - page, api, options, recorder, mouse, report, script, captions, viewport, scale (see recordTake)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { SEL_ASSISTANT_INPUT, SKILL_ERROR_PREFIX, sendChatMessage } from "../lib/klacksy-chat.mjs";
import { CANVAS_SETTLE_MS, HALF, HTTP_POST, SEL_GRID_CANVAS, openSchedule } from "../lib/schedule-grid.mjs";
import { ORDERS, ORDER_FROM, ORDER_UNTIL, orderStatusCounts } from "../lib/order-review-demo.mjs";

export const VIDEO_SIMPLE_ORDER_REVIEW = "simple-order-review";
export const ORDER_REVIEW_VIDEOS = [VIDEO_SIMPLE_ORDER_REVIEW];
export const SIMPLE_ORDER_REVIEW_CUES = { request: "request", accept: "accept", confirm: "confirm", schedule: "schedule" };
export const SIMPLE_ORDER_REVIEW_FINAL_HOLD_MS = 5000;
export const ORDER_REVIEW_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
const SHIFT_LIST_ROW_SIZE_KEY = "SELECTED_ROW_ORDER_SHIFT";
const SHIFT_LIST_ROWS_PER_PAGE = "5";
export const ORDER_REVIEW_INIT_SCRIPTS = Object.freeze([
  Object.freeze({ fn: ({ key, rows }) => localStorage.setItem(key, rows), arg: Object.freeze({ key: SHIFT_LIST_ROW_SIZE_KEY, rows: SHIFT_LIST_ROWS_PER_PAGE }) }),
]);

const RECIPE_OFFERED = "recipeOffered";
const REVIEW_STARTED = "reviewStarted";
const CONFIRMATION_PENDING = "confirmationPending";
const EXECUTED = "executed";
const START_SKILL = "start_order_review";
const DECISION_SKILL = "set_order_review_decision";
const PREVIEW_SKILL = "preview_order_review";
const EXECUTE_SKILL = "execute_order_review";
const CONFIRM_SKILL = "confirm_pending_action";
const SCHEDULE_SKILL = "open_schedule";
const EXPECTED_CALLS = [[START_SKILL], [DECISION_SKILL], [PREVIEW_SKILL, EXECUTE_SKILL], [EXECUTE_SKILL, CONFIRM_SKILL], [SCHEDULE_SKILL]];
const BEAT = { intro: 1200, pageHold: 4000, pagePoll: 250 };
const PAGE_TIMEOUT_MS = 20000;
const MOVE_NORMAL_MS = 700;
const YES_REPLY_MARKER = "=yes";
const LOG_PREVIEW_CHARS = 220;

const SHIFT_ROUTE = "/workplace/shift";
const SCHEDULE_ROUTE = "/workplace/schedule";
const SEL_SHIFT_LIST = "#allShiftForm";
const SEL_SHIFT_ROWS = "#allShiftForm tbody tr";
const PAGE_ORDERS = Object.freeze({ key: "orders", path: SHIFT_ROUTE, params: Object.freeze({ view: "orders" }), table: "#allShiftForm app-original-table", ordersNeeded: ORDERS.length });
const PAGE_PLANNABLE = Object.freeze({ key: "plannable", path: SHIFT_ROUTE, params: Object.freeze({ view: "plannable" }), table: "#allShiftForm app-shift-table", ordersNeeded: 1 });
const PAGE_SCHEDULE = Object.freeze({ key: "schedule", path: SCHEDULE_ROUTE, params: Object.freeze({}), table: null });
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const SHIFT_PANE_TOP_Y = 330;
const SHIFT_PANE_SCROLL = Object.freeze({ x: 500, y: 550, ticks: 10, tickPx: 100, tickPauseMs: 150 });
const MOVE_DRAG_MS = 900;
const SCHEDULE_GROUP_PARAM = "groupId";
const SCHEDULE_DATE_PARAM = "date";

function log(message) {
  console.log(`[order-review] ${message}`);
}

function cueFor(message) {
  if (message.sendWhen === EXECUTED) return SIMPLE_ORDER_REVIEW_CUES.schedule;
  if (message.sendWhen === CONFIRMATION_PENDING) return SIMPLE_ORDER_REVIEW_CUES.confirm;
  if (message.sendWhen === REVIEW_STARTED) return SIMPLE_ORDER_REVIEW_CUES.accept;
  return SIMPLE_ORDER_REVIEW_CUES.request;
}

function sentTurns(turns) {
  return turns.filter((t) => t.sent);
}

function callNames(turn) {
  return new Set((turn?.calls ?? []).map((c) => c.name));
}

function calledSkills(turns) {
  return new Set(sentTurns(turns).flatMap((t) => [...callNames(t)]));
}

function sealedTotal(counts) {
  return Object.values(counts).reduce((sum, c) => sum + c.sealed, 0);
}

function openTotal(counts) {
  return Object.values(counts).reduce((sum, c) => sum + c.open, 0);
}

function allSealed(counts) {
  return sealedTotal(counts) === ORDERS.length && openTotal(counts) === 0;
}

function skipReason(message, turns, counts) {
  if (message.sendWhen === RECIPE_OFFERED && calledSkills(turns).has(START_SKILL)) return "the order review already started";
  if (message.sendWhen === CONFIRMATION_PENDING && allSealed(counts)) return "every order is already sealed";
  return null;
}

function notSentReason(message, turns, counts, url, pages) {
  const called = calledSkills(turns);
  const last = sentTurns(turns).at(-1);
  const lastCalls = callNames(last);
  if (message.sendWhen === EXECUTED) {
    if (!allSealed(counts)) return "the orders were not all sealed";
    if (!lastCalls.has(EXECUTE_SKILL) && !lastCalls.has(CONFIRM_SKILL)) return "the previous answer did not execute the review";
    const shown = pages.at(-1);
    if (shown?.page !== PAGE_PLANNABLE.key || !shown.reached) return `the plannable shifts are not on screen (${url})`;
    return null;
  }
  if (sealedTotal(counts) > 0) return "orders already sealed";
  if (message.sendWhen === RECIPE_OFFERED && !(last?.content ?? "").includes(YES_REPLY_MARKER)) return "Klacksy did not offer the guided order review";
  if (message.sendWhen === REVIEW_STARTED && !called.has(START_SKILL)) return "Klacksy did not start the order review";
  if (message.sendWhen === CONFIRMATION_PENDING && !lastCalls.has(PREVIEW_SKILL) && !lastCalls.has(EXECUTE_SKILL)) {
    return "Klacksy showed no preview to confirm";
  }
  return null;
}

function pageMatches(url, expected) {
  const parsed = new URL(url);
  if (parsed.pathname !== expected.path) return false;
  return Object.entries(expected.params).every(([key, value]) => parsed.searchParams.get(key) === value);
}

function expectedPage(turn, counts) {
  const calls = callNames(turn);
  if (calls.has(SCHEDULE_SKILL)) return PAGE_SCHEDULE;
  if ((calls.has(EXECUTE_SKILL) || calls.has(CONFIRM_SKILL)) && allSealed(counts)) return PAGE_PLANNABLE;
  if (calls.has(START_SKILL) && sealedTotal(counts) === 0) return PAGE_ORDERS;
  return null;
}

async function waitForUrl(page, expected, visited) {
  const deadline = Date.now() + PAGE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const requested = visited.find((url) => pageMatches(url, expected));
    if (requested && new URL(page.url()).pathname === expected.path) return requested;
    await page.waitForTimeout(BEAT.pagePoll);
  }
  return null;
}

async function ordersInList(page) {
  const text = await page.locator(SEL_SHIFT_LIST).innerText().catch(() => "");
  return ORDERS.filter((o) => text.includes(o.name) || text.includes(o.abbreviation)).map((o) => o.abbreviation);
}

async function waitForOrderRows(page, expected) {
  const table = await page.locator(expected.table).waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
  const deadline = Date.now() + PAGE_TIMEOUT_MS;
  let shown = [];
  while (table && Date.now() < deadline) {
    shown = await ordersInList(page);
    if (shown.length >= expected.ordersNeeded) break;
    await page.waitForTimeout(BEAT.pagePoll);
  }
  const firstRow = table ? await page.locator(SEL_SHIFT_ROWS).first().innerText().catch(() => "") : "";
  const firstRowIsOrder = ORDERS.some((o) => firstRow.includes(o.name));
  return { table, rows: await page.locator(SEL_SHIFT_ROWS).count(), ordersShown: shown, firstRowIsOrder };
}

async function waitForSchedule(page) {
  const grid = page.locator(SEL_GRID_CANVAS).first();
  const visible = await grid.waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  return { gridVisible: visible };
}

async function horizontalGutter(page) {
  const gutters = page.locator(SEL_SPLIT_GUTTER);
  for (let i = 0; i < await gutters.count(); i++) {
    const box = await gutters.nth(i).boundingBox();
    if (box && box.width > box.height) return box;
  }
  return null;
}

async function revealNewShifts(page, mouse) {
  const gutter = await horizontalGutter(page);
  if (!gutter) return { shiftPaneRevealed: false };
  const centerX = gutter.x + gutter.width / HALF;
  await mouse.drag({ x: centerX, y: gutter.y + gutter.height / HALF }, { x: centerX, y: SHIFT_PANE_TOP_Y }, MOVE_DRAG_MS);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await mouse.moveTo({ x: SHIFT_PANE_SCROLL.x, y: SHIFT_PANE_SCROLL.y }, MOVE_NORMAL_MS);
  for (let tick = 0; tick < SHIFT_PANE_SCROLL.ticks; tick++) {
    await page.mouse.wheel(0, SHIFT_PANE_SCROLL.tickPx);
    await page.waitForTimeout(SHIFT_PANE_SCROLL.tickPauseMs);
  }
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  return { shiftPaneRevealed: true };
}

async function showPage(page, mouse, expected, turnIndex, visited) {
  const requested = await waitForUrl(page, expected, visited);
  const entry = { turn: turnIndex, page: expected.key, requested, url: page.url(), reached: requested !== null };
  if (requested) {
    if (expected === PAGE_SCHEDULE) {
      const params = new URL(requested).searchParams;
      Object.assign(entry, { groupId: params.get(SCHEDULE_GROUP_PARAM), date: params.get(SCHEDULE_DATE_PARAM) }, await waitForSchedule(page));
      Object.assign(entry, await revealNewShifts(page, mouse));
    } else {
      Object.assign(entry, await waitForOrderRows(page, expected));
    }
    await page.waitForTimeout(BEAT.pageHold);
  }
  log(`page ${expected.key}: ${JSON.stringify(entry)}`);
  return entry;
}

function pageProblems(pages) {
  const problems = [];
  const find = (key) => pages.find((p) => p.page === key);
  for (const expected of [PAGE_ORDERS, PAGE_PLANNABLE]) {
    const entry = find(expected.key);
    if (!entry?.reached) problems.push(`the ${expected.key} list was not opened`);
    else if (!entry.table) problems.push(`the ${expected.key} list did not show its table`);
    else if (entry.ordersShown.length < expected.ordersNeeded || !entry.firstRowIsOrder) {
      problems.push(`the ${expected.key} list showed ${entry.ordersShown.join(",") || "none"} of the orders on its first page`);
    }
  }
  const schedule = find(PAGE_SCHEDULE.key);
  if (!schedule?.reached) problems.push("the schedule was not opened");
  else {
    if (!schedule.gridVisible) problems.push("the schedule grid was not visible");
    if (!schedule.shiftPaneRevealed) problems.push("the shift pane of the schedule was not opened up");
    if (!schedule.groupId) problems.push("the schedule opened without a group");
    if (!schedule.date || schedule.date < ORDER_FROM || schedule.date > ORDER_UNTIL) problems.push(`the schedule opened on ${schedule.date}, not in the order week`);
  }
  return problems;
}

function turnProblems(turns) {
  const problems = [];
  sentTurns(turns).forEach((turn, i) => {
    if (turn.errors.length > 0) problems.push(`answer ${i + 1}: chat error ${turn.errors.join("; ")}`);
    if (turn.content.trim() === "") problems.push(`answer ${i + 1} has no text`);
    if (turn.navigateTo && !callNames(turn).has(SCHEDULE_SKILL)) problems.push(`answer ${i + 1} navigated to ${turn.navigateTo} without open_schedule`);
    const failed = turn.results.find((r) => r.result.startsWith(SKILL_ERROR_PREFIX));
    if (failed) problems.push(`answer ${i + 1}: ${failed.name} failed: ${failed.result}`);
  });
  const called = calledSkills(turns);
  for (const alternatives of EXPECTED_CALLS) {
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

async function takeSimpleOrderReview(take) {
  const { page, api, options, recorder, mouse, report, script, captions, viewport, scale } = take;
  const messages = script?.messages ?? [];
  if (messages.length === 0) throw new Error(`${VIDEO_SIMPLE_ORDER_REVIEW} needs a script`);
  const post = (apiPath, data) => api.json(apiPath, { method: HTTP_POST, data });
  report.ordersBefore = await orderStatusCounts(post);
  if (openTotal(report.ordersBefore) !== ORDERS.length || sealedTotal(report.ordersBefore) !== 0) {
    throw new Error(`seeded orders are not all open (${JSON.stringify(report.ordersBefore)}) - copy the seeded database again`);
  }
  await openSchedule(page, options);
  report.turns = [];
  report.pages = [];
  const visited = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) visited.push(frame.url());
  });
  try {
    await recorder.start();
    await page.waitForTimeout(BEAT.intro);
    await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE_NORMAL_MS);
    await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    for (const message of messages) {
      if (message.sendWhen) {
        const counts = await orderStatusCounts(post);
        const skipped = skipReason(message, report.turns, counts);
        if (skipped) {
          report.turns.push({ prompt: message.text, sent: false, skipped: true, reason: skipped });
          log(`skipped (${skipped}): ${message.text}`);
          continue;
        }
        const reason = notSentReason(message, report.turns, counts, page.url(), report.pages);
        if (reason) {
          report.turns.push({ prompt: message.text, sent: false, reason });
          log(`not sent (${reason}): ${message.text}`);
          break;
        }
      }
      await captions?.show(cueFor(message));
      log(`prompt: ${message.text}`);
      visited.length = 0;
      const turn = await sendChatMessage(take, message.text);
      report.turns.push({ prompt: message.text, sent: true, ...turn });
      log(`calls: ${turn.calls.map((c) => c.name).join(", ") || "-"}; answer: ${turn.content.replace(/\s+/g, " ").slice(0, LOG_PREVIEW_CHARS)}`);
      const expected = expectedPage(turn, await orderStatusCounts(post));
      if (expected) report.pages.push(await showPage(page, mouse, expected, sentTurns(report.turns).length, visited));
    }
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(take.finalHoldMs ?? SIMPLE_ORDER_REVIEW_FINAL_HOLD_MS);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullViewportCrop(viewport, scale) });
    report.finalUrl = page.url();
    report.ordersAfter = await orderStatusCounts(post);
    const problems = [...turnProblems(report.turns), ...pageProblems(report.pages)];
    const notSent = report.turns.find((t) => !t.sent && !t.skipped);
    if (notSent) problems.unshift(`not sent: ${notSent.reason}`);
    if (!allSealed(report.ordersAfter)) problems.push(`orders after the take: ${JSON.stringify(report.ordersAfter)}`);
    if (new URL(report.finalUrl).pathname !== SCHEDULE_ROUTE) problems.push(`the take ended on ${report.finalUrl}, not on the schedule`);
    report.failure = report.failure ?? (problems.join("; ") || null);
    report.publishable = report.failure === null;
  }
}

export const ORDER_REVIEW_TAKE_RUNNERS = {
  [VIDEO_SIMPLE_ORDER_REVIEW]: takeSimpleOrderReview,
};
