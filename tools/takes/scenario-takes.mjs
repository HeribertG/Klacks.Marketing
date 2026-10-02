// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Video takes of the scenario carousel ("Szenarien: Planen ohne Risiko") in the schedule of the demo group Winterthur (scenario-autowizard: the weekly group
 * "Winterthur Nord", see lib/scenario-week-demo.mjs and seed-scenario-week-demo.mjs):
 * scenario-create (create a scenario through the selector dialog, move a work inside it, "Zum Original" shows the unchanged plan, reopen the scenario),
 * scenario-autowizard (the AutoWizard button plans the week 02.-08.11. of the weekly group as a scenario - time-compressed -, "Zum Original" shows the empty
 * week, the scenario is accepted through the banner), scenario-compare (two prepared variants A and B are switched with the selector, the hours column of
 * the employee rows (info spot "worked hours", drawn on the row-header canvas from the schedule response of the token) differs per token, both are
 * discarded through the banner) and scenario-rule-violation (a move inside a scenario produces a rest-time warning in the error list, "Zum Original"
 * shows the clean list again).
 * Safety rules: only scenario-autowizard ever clicks Accept, and only once, only after the scenario's group and from/until dates were checked to be the weekly
 * group and to lie inside the plan week; the other takes never accept. Real data is always read with analyseToken = null and compared against a snapshot
 * taken before the take (October 118 works of Winterthur, in scenario-autowizard also Winterthur's November outside the plan week); every take deletes the
 * scenarios it created (also after a UI reject, which keeps a Rejected row) and restores a real work that a drag moved by mistake. The plan week of
 * scenario-autowizard is reset before and after the take like in klacksy-plans-week.
 * Scenario names that are typed come from capture-app-videos.scripts.json (scenario-create / scenario-rule-violation: scenarioName, scenario-compare: variantA, variantB).
 * @param take - page, api, options, recorder, mouse, report, culture, script, viewport, scale (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { waitModalAtRest } from "../lib/modal.mjs";
import {
  CANVAS_SETTLE_MS,
  CELL_WIDTH_PX,
  HALF,
  HTTP_POST,
  SCHEDULE_ROUTE_PART,
  cellCenter,
  dateKey,
  gridBox,
  openSchedule,
  rowBoxes,
  sameSnapshot,
  snapshotOf,
  worksIn,
} from "../lib/schedule-grid.mjs";
import {
  JOB_STATUS_COMPLETED,
  NOVEMBER,
  OCTOBER,
  OCTOBER_RANGE,
  PLAN_WEEK,
  SCENARIO_STATUS_ACCEPTED,
  activeScenarios,
  addDays,
  createScenario,
  dayDiff,
  deleteScenario,
  getScenario,
  monthRealFilter,
  overlapsPlanWeek,
  periodHours,
  pickFreeMove,
  pickRestConflict,
  realFilter,
  reassignWork,
  resetPlanWeek,
  scenarioCopyOf,
  scenarioFilter,
  stopJob,
  waitForJob,
  workIdSet,
} from "../lib/scenario-demo.mjs";
import { assertNoAbsencesOrNotes, groupMonthFilter, requireWeekGroup } from "../lib/scenario-week-demo.mjs";

export const VIDEO_SCENARIO_CREATE = "scenario-create";
export const VIDEO_SCENARIO_AUTOWIZARD = "scenario-autowizard";
export const VIDEO_SCENARIO_COMPARE = "scenario-compare";
export const VIDEO_SCENARIO_RULE_VIOLATION = "scenario-rule-violation";
export const SCENARIO_VIDEOS = [VIDEO_SCENARIO_CREATE, VIDEO_SCENARIO_AUTOWIZARD, VIDEO_SCENARIO_COMPARE, VIDEO_SCENARIO_RULE_VIOLATION];

const SEL_SELECTOR_BTN = "#scenario-selector-btn";
const SEL_SELECTOR_CREATE = "#scenario-selector-create-item";
const SEL_SELECTOR_ITEMS = "[data-scenario-id]";
const selectorItem = (id) => `[data-scenario-id="${id}"]`;
const SEL_NAME_INPUT = "#scenario-name-input";
const SEL_BANNER = "#scenario-banner";
const SEL_BANNER_NAME = "#scenario-banner-name";
const SEL_BANNER_ACCEPT = "#scenario-banner-accept-btn";
const SEL_BANNER_REJECT = "#scenario-banner-reject-btn";
const SEL_BANNER_EXIT = "#scenario-banner-exit-btn";
const SEL_CONFIRM = "#modal-delete-confirm";
const SEL_MODAL = "ngb-modal-window";
const SEL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_WIZARD_BUTTON = "#schedule-wizard-btn";
const SEL_NEXT_PERIOD = "#schedule-next-btn";
const SEL_PREVIOUS_PERIOD = "#schedule-prev-btn";
const SEL_WIZARD_DROPDOWN = ".wizard-dropdown";
const SEL_SHIFT_TABS = "#shift-tabs .nav-link";
const SEL_ERROR_ROWS = "app-schedule-error-list tr.table-row";
const SEL_INFO_FILTER = "#info-filter-btn";
const ERROR_TAB_INDEX = 1;
const CLASS_ACTIVE = "active";

const SCENARIO_CREATE_PATH = /\/AnalyseScenarios\/?$/i;
const SCENARIO_ACCEPT_PATH = /\/AnalyseScenarios\/[0-9a-f-]{36}\/Accept/i;
const SCENARIO_REJECT_PATH = /\/AnalyseScenarios\/[0-9a-f-]{36}\/Reject/i;
const REASSIGN_ROUTE = /\/Works\/([0-9a-f-]{36})\/ReassignClient/i;
const AUTO_WIZARD_START_PATH = /\/AutoWizard\/Start/i;
const ANY_TOKEN = Symbol("any-token");
const ORIGINAL_KEY = "original";
const SEL_ROW_HEADER_CANVAS = "#scheduleRowCanvas";
const HTTP_CONFLICT = 409;
const GRID_HEADER_HEIGHT_PX = 30;
const DAYS_PER_WEEK = 7;

const SAVE_TIMEOUT_MS = 30000;
const RELOAD_TIMEOUT_MS = 20000;
const DECIDE_TIMEOUT_MS = 120000;
const BANNER_TIMEOUT_MS = 60000;
const HOURS_TIMEOUT_MS = 30000;
const HOURS_POLL_MS = 500;
const ERROR_ROW_TIMEOUT_MS = 20000;
const ERROR_LIST_POLL_MS = 250;
const SCROLL_TICK_DELTA = 100;
const SCROLL_TICK_PAUSE_MS = 250;
const MAX_SCROLL_TICKS = 12;
const HOURS_EPSILON = 1e-6;
const HH_MM_LENGTH = 5;
const SELECT_ALL = "Control+A";
const TYPE_DELAY_MS = 70;
const FAST_FACTOR_WIZARD = 40;
const SINGLE_ACCEPT = 1;
const NEXT_DAY_OFFSET = 1;
const PLAN_WEEK_DAY_AFTER = addDays(PLAN_WEEK.until, NEXT_DAY_OFFSET);
const PLAN_WEEK_DAY_BEFORE = addDays(PLAN_WEEK.from, -NEXT_DAY_OFFSET);
const NOVEMBER_FIRST = "2026-11-01";
const NOVEMBER_LAST = "2026-11-30";

const SINGLE_MOVE_LIMITS = { maxRow: 3, maxDay: 5, targets: 1 };
const COMPARE_MOVE_LIMITS = { maxRow: 5, maxDay: 8, targets: 2, maxSpan: 2, freeDaysAround: 0 };
const RULE_LIMITS = { maxDay: 5, maxRowDistance: 3 };

const BEAT = { intro: 700, hover: 400, menu: 450, dialog: 1200, afterDrop: 1500, show: 2800, switched: 2200, warning: 3200, finalHold: 3500 };
const MOVE = { short: 350, normal: 650, drag: 1100 };

const log = (...args) => console.log("  ", ...args);
const fullFrame = (take) => ({ x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale });
const oneLine = (text) => String(text).replace(/\s+/g, " ").trim();
const hhmm = (time) => String(time ?? "").slice(0, HH_MM_LENGTH);
const tokenOf = (response) => response.request().postDataJSON()?.analyseToken ?? null;

function flag(report, message) {
  report.failure ??= message;
  log(`! ${message}`);
}

/**
 * Opens the October schedule of the demo group, refuses to start when active scenarios exist (they would show up in the selector and are
 * not ours to delete), takes the real-plan snapshot (118 works) and the id set of the real works.
 */
async function openOctober(take) {
  const { page, api, options, report } = take;
  const active = await activeScenarios(api, options.groupId);
  if (active.length > 0) throw new Error(`${active.length} active scenario(s) exist for the demo group - run reset-scenario-demo.mjs`);
  const { filter, data } = await openSchedule(page, options);
  const octoberFilter = monthRealFilter(filter, OCTOBER);
  const realData = await api.schedule(octoberFilter);
  const before = snapshotOf(realData, OCTOBER_RANGE);
  if (before.length !== OCTOBER_RANGE.expectedWorks) throw new Error(`October has ${before.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
  const ctx = {
    filter, data, octoberFilter, before, isRtl,
    realIds: workIdSet(realData, OCTOBER_RANGE),
    originalClient: new Map(worksIn(realData, OCTOBER_RANGE.from, OCTOBER_RANGE.until).map((work) => [work.id, work.clientId])),
    created: [],
    reassigned: [],
    acceptRequests: 0,
    scheduleTokens: [],
  };
  trackNetwork(take, ctx);
  report.octoberWorksBefore = before.length;
  log(`group ${options.groupId}: ${data.clients.length} employees, October ${before.length} works, no active scenario`);
  return ctx;
}

const tokenKey = (token) => token ?? ORIGINAL_KEY;
const idKey = (id) => String(id).toLowerCase();

/**
 * Remembers the period hours the schedule shows per token: the response of a schedule load carries periodHours per client (the row header draws
 * "hours + surcharges" from exactly this map), chunk loads of the same token are merged.
 */
async function rememberDisplayedHours(store, response) {
  const body = await response.json().catch(() => null);
  if (!body?.periodHours) return;
  const key = tokenKey(tokenOf(response));
  const merged = store.get(key) ?? new Map();
  for (const [clientId, hours] of Object.entries(body.periodHours)) merged.set(idKey(clientId), hours);
  store.set(key, merged);
}

const displayedTotal = (store, token, clientId) => {
  const hours = store.get(tokenKey(token))?.get(idKey(clientId));
  return hours ? (hours.hours ?? 0) + (hours.surcharges ?? 0) : null;
};

function trackNetwork(take, ctx) {
  const { page } = take;
  page.on("response", async (response) => {
    const { pathname } = new URL(response.url());
    const method = response.request().method();
    if (method !== HTTP_POST) return;
    if (SCENARIO_CREATE_PATH.test(pathname) && response.ok()) {
      const scenario = await response.json().catch(() => null);
      if (scenario?.id && !ctx.created.some((entry) => entry.id === scenario.id)) ctx.created.push(scenario);
    }
    if (response.url().includes(SCHEDULE_ROUTE_PART)) {
      ctx.scheduleTokens.push(tokenOf(response));
      if (ctx.displayedHours) await rememberDisplayedHours(ctx.displayedHours, response);
    }
  });
  page.on("request", (request) => {
    if (request.method() !== HTTP_POST) return;
    const { pathname } = new URL(request.url());
    const reassigned = pathname.match(REASSIGN_ROUTE);
    if (reassigned) ctx.reassigned.push(reassigned[1].toLowerCase());
    if (SCENARIO_ACCEPT_PATH.test(pathname)) ctx.acceptRequests++;
  });
}

function waitScheduleReload(take, expectedToken) {
  const { page, options } = take;
  const loaded = page.waitForResponse((response) => {
    if (response.request().method() !== HTTP_POST || !response.url().includes(SCHEDULE_ROUTE_PART)) return false;
    if (response.request().postDataJSON()?.selectedGroup !== options.groupId) return false;
    return expectedToken === ANY_TOKEN ? Boolean(tokenOf(response)) : tokenOf(response) === expectedToken;
  }, { timeout: RELOAD_TIMEOUT_MS });
  loaded.catch(() => {});
  return loaded;
}

async function settleAfter(take, reload, label) {
  const seen = await reload.then(() => true, () => false);
  (take.report.reloads ??= []).push({ label, seen });
  if (!seen) flag(take.report, `no schedule reload with the expected scenario token after "${label}"`);
  await take.page.waitForTimeout(CANVAS_SETTLE_MS);
}

async function clickSelector(take, selector, moveMs) {
  const { page, mouse } = take;
  const element = page.locator(selector);
  await element.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(element, moveMs);
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

async function openSelector(take) {
  await clickSelector(take, SEL_SELECTOR_BTN, MOVE.normal);
  await take.page.waitForTimeout(BEAT.menu);
}

async function expectBanner(take, name) {
  const { page, report } = take;
  await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: BANNER_TIMEOUT_MS });
  const shown = oneLine(await page.locator(SEL_BANNER_NAME).innerText());
  report.bannerNames = [...(report.bannerNames ?? []), shown];
  if (name && shown !== name) flag(report, `the banner shows "${shown}" instead of "${name}"`);
}

async function createScenarioViaUi(take, name) {
  const { page, mouse, report } = take;
  await openSelector(take);
  await clickSelector(take, SEL_SELECTOR_CREATE, MOVE.normal);
  await waitModalAtRest(page);
  await typeInto(take, SEL_NAME_INPUT, name);
  const created = page.waitForResponse(
    (response) => response.request().method() === HTTP_POST && SCENARIO_CREATE_PATH.test(new URL(response.url()).pathname),
    { timeout: SAVE_TIMEOUT_MS },
  );
  created.catch(() => {});
  const reload = waitScheduleReload(take, ANY_TOKEN);
  await page.waitForTimeout(BEAT.dialog);
  await mouse.clickLocator(page.locator(SEL_SAVE), MOVE.normal);
  const response = await created;
  if (!response.ok()) throw new Error(`creating the scenario returned HTTP ${response.status()}`);
  const scenario = await response.json();
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await expectBanner(take, name);
  await settleAfter(take, reload, "create");
  report.scenario = { id: scenario.id, name: scenario.name, from: dateKey(scenario.fromDate), until: dateKey(scenario.untilDate) };
  return scenario;
}

async function exitToOriginal(take) {
  const { page } = take;
  const reload = waitScheduleReload(take, null);
  await clickSelector(take, SEL_BANNER_EXIT, MOVE.normal);
  await page.locator(SEL_BANNER).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await settleAfter(take, reload, "exit");
}

async function selectScenario(take, scenario) {
  const reload = waitScheduleReload(take, scenario.token);
  await openSelector(take);
  await clickSelector(take, selectorItem(scenario.id), MOVE.normal);
  await expectBanner(take, scenario.name);
  await settleAfter(take, reload, `select ${scenario.name}`);
}

async function decideViaBanner(take, kind) {
  const { page, mouse, report } = take;
  const accept = kind === "accept";
  const decided = page.waitForResponse(
    (response) => response.request().method() === HTTP_POST && (accept ? SCENARIO_ACCEPT_PATH : SCENARIO_REJECT_PATH).test(new URL(response.url()).pathname),
    { timeout: DECIDE_TIMEOUT_MS },
  );
  decided.catch(() => {});
  const reload = waitScheduleReload(take, null);
  await clickSelector(take, accept ? SEL_BANNER_ACCEPT : SEL_BANNER_REJECT, MOVE.normal);
  await waitModalAtRest(page);
  await page.waitForTimeout(BEAT.dialog);
  await mouse.clickLocator(page.locator(SEL_CONFIRM), MOVE.normal);
  const response = await decided;
  (report.decisions ??= []).push({ kind, status: response.status() });
  if (!response.ok()) {
    throw new Error(`${kind} was refused with HTTP ${response.status()}${response.status() === HTTP_CONFLICT ? " (compliance gate - no override is clicked in a take)" : ""}`);
  }
  await page.locator(SEL_BANNER).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await settleAfter(take, reload, kind);
}

async function assertRowsAndDayVisible(take, rows, dayIndex) {
  const { page } = take;
  const grid = await gridBox(page);
  if (dayIndex >= Math.floor(grid.width / CELL_WIDTH_PX)) throw new Error(`day column ${dayIndex} is not visible (${Math.floor(grid.width / CELL_WIDTH_PX)} columns)`);
  const boxes = await rowBoxes(page);
  const visibleTop = grid.y + GRID_HEADER_HEIGHT_PX;
  const visibleBottom = grid.y + grid.height;
  for (const row of rows) {
    const box = boxes[row];
    if (!box || box.top < visibleTop || box.top + box.height > visibleBottom) throw new Error(`employee row ${row} is not completely visible while the scenario banner is shown`);
  }
}

async function scrollRowsIntoView(take, rows) {
  const { page, mouse } = take;
  const grid = await gridBox(page);
  const visibleTop = grid.y + GRID_HEADER_HEIGHT_PX;
  const visibleBottom = grid.y + grid.height;
  const wheelPoint = { x: grid.x + grid.width / HALF, y: grid.y + grid.height / HALF };
  for (let tick = 0; tick < MAX_SCROLL_TICKS; tick++) {
    const boxes = await rowBoxes(page);
    const top = Math.min(...rows.map((row) => boxes[row].top));
    const bottom = Math.max(...rows.map((row) => boxes[row].top + boxes[row].height));
    if (top >= visibleTop && bottom <= visibleBottom) return;
    await page.mouse.move(wheelPoint.x, wheelPoint.y);
    Object.assign(mouse, wheelPoint);
    await page.mouse.wheel(0, top < visibleTop ? -SCROLL_TICK_DELTA : SCROLL_TICK_DELTA);
    await page.waitForTimeout(SCROLL_TICK_PAUSE_MS);
  }
  throw new Error(`rows ${rows.join(",")} could not be scrolled into view`);
}

/**
 * Drags the work of one cell onto another employee's cell of the same day, like a user does, and checks that the reassign request
 * addresses the expected id. A drop on a real work (id in the real id set) is recorded as failure; cleanup then restores it.
 */
async function dragWork(take, ctx, { fromRow, toRow, dayIndex, expectedId }) {
  const { page, mouse, report } = take;
  await assertRowsAndDayVisible(take, [fromRow, toRow], dayIndex);
  const source = await cellCenter(page, fromRow, dayIndex, ctx.isRtl);
  const target = await cellCenter(page, toRow, dayIndex, ctx.isRtl);
  const reassign = page.waitForResponse((response) => REASSIGN_ROUTE.test(response.url()), { timeout: SAVE_TIMEOUT_MS });
  reassign.catch(() => {});
  await mouse.moveTo(source, MOVE.normal);
  await page.waitForTimeout(BEAT.hover);
  await mouse.drag(source, target, MOVE.drag);
  const response = await reassign;
  const movedId = response.url().match(REASSIGN_ROUTE)[1].toLowerCase();
  report.drag = { movedId, status: response.status() };
  if (ctx.realIds.has(movedId)) flag(report, `the drag moved the REAL work ${movedId} - it is restored by the cleanup`);
  if (movedId !== String(expectedId).toLowerCase()) flag(report, `the drag moved ${movedId} instead of the scenario copy ${expectedId}`);
  if (!response.ok()) flag(report, `the reassign returned HTTP ${response.status()}`);
  await page.waitForTimeout(BEAT.afterDrop);
  return { source, target };
}

async function holdWithPoster(take, holdMs) {
  const { page, report } = take;
  report.posterAt = ScreenRecorder.now();
  await page.waitForTimeout(holdMs);
}

async function verifyRealUnchanged(take, ctx, label) {
  const after = snapshotOf(await take.api.schedule(ctx.octoberFilter), OCTOBER_RANGE);
  const same = sameSnapshot(ctx.before, after);
  (take.report.realChecks ??= []).push({ label, works: after.length, same });
  if (!same) flag(take.report, `the real October plan differs after "${label}"`);
  return same;
}

async function cleanup(take, ctx) {
  const { api, options, report } = take;
  const problems = [];
  for (const id of new Set(ctx.reassigned)) {
    const original = ctx.originalClient.get(id);
    if (ctx.realIds.has(id) && original) await reassignWork(api, id, original).catch((error) => problems.push(`restore ${id}: ${error.message}`));
  }
  for (const scenario of ctx.created) await deleteScenario(api, scenario.id).catch((error) => problems.push(`delete scenario ${scenario.id}: ${error.message}`));
  const active = await activeScenarios(api, options.groupId);
  const after = snapshotOf(await api.schedule(ctx.octoberFilter), OCTOBER_RANGE);
  report.cleanup = { deletedScenarios: ctx.created.length, activeScenariosLeft: active.length, octoberWorks: after.length, problems };
  report.octoberRestored = sameSnapshot(ctx.before, after);
  if (problems.length > 0 || active.length > 0) throw new Error(`cleanup incomplete: ${problems.join("; ") || `${active.length} active scenario(s) left`} - run reset-scenario-demo.mjs`);
  if (!report.octoberRestored) throw new Error("October differs after the take - check the demo data!");
  log(`deleted ${ctx.created.length} scenario(s); none active, October unchanged (${after.length} works)`);
}

async function runRecorded(take, cleanupFn, scene) {
  const { recorder, report } = take;
  await recorder.start();
  try {
    await scene();
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    await cleanupFn();
  }
}

function requireScript(take, keys) {
  const missing = keys.filter((key) => !take.script?.[key]);
  if (missing.length > 0) throw new Error(`the ${take.report.video} script for ${take.culture} lacks ${missing.join(", ")} in capture-app-videos.scripts.json`);
}

export async function takeScenarioCreate(take) {
  const { page, api, mouse, report, script } = take;
  requireScript(take, ["scenarioName"]);
  const ctx = await openOctober(take);
  const move = pickFreeMove(ctx.data, ctx.filter, SINGLE_MOVE_LIMITS);
  const target = move.targets[0];
  report.move = { work: `${move.work.abbreviation} ${move.day} ${hhmm(move.work.startTime)}-${hhmm(move.work.endTime)}`, from: `${move.client.firstName} ${move.client.name}`, to: `${target.client.firstName} ${target.client.name}` };
  log(`move ${report.move.work}: ${report.move.from} -> ${report.move.to}`);
  await runRecorded(take, () => cleanup(take, ctx), async () => {
    await page.waitForTimeout(BEAT.intro);
    const scenario = await createScenarioViaUi(take, script.scenarioName);
    await page.waitForTimeout(BEAT.show);
    const copy = scenarioCopyOf(await api.schedule(scenarioFilter(ctx.octoberFilter, scenario.token)), move.work, OCTOBER_RANGE);
    await dragWork(take, ctx, { fromRow: move.row, toRow: target.row, dayIndex: move.dayIndex, expectedId: copy.id });
    await page.waitForTimeout(BEAT.show);
    const moved = worksIn(await api.schedule(scenarioFilter(ctx.octoberFilter, scenario.token)), OCTOBER_RANGE.from, OCTOBER_RANGE.until).find((work) => work.id === copy.id);
    report.movedInScenario = moved?.clientId === target.client.id;
    if (!report.movedInScenario) flag(report, "the moved work does not belong to the target employee inside the scenario");
    await verifyRealUnchanged(take, ctx, "after the drag in the scenario");
    await exitToOriginal(take);
    await mouse.moveTo({ x: take.viewport.width / HALF, y: take.viewport.height / HALF }, MOVE.normal);
    await page.waitForTimeout(BEAT.show);
    await selectScenario(take, scenario);
    await holdWithPoster(take, BEAT.finalHold);
  });
}

async function openPlanWeek(take) {
  const { page, options } = take;
  let opened = await openSchedule(page, options);
  const periodDays = dayDiff(opened.filter.periodStartDate, opened.filter.periodEndDate) + 1;
  if (periodDays !== DAYS_PER_WEEK) {
    throw new Error(`the schedule of the group ${options.groupId} shows a ${periodDays}-day period (${opened.filter.periodStartDate}..${opened.filter.periodEndDate}); the AutoWizard button plans the group's whole payment period, so this take needs the weekly group of seed-scenario-week-demo.mjs - an accept would replace the real data of the whole period`);
  }
  const weeks = dayDiff(opened.filter.periodStartDate, PLAN_WEEK.from) / DAYS_PER_WEEK;
  if (!Number.isInteger(weeks)) throw new Error(`the weekly period starts on ${opened.filter.periodStartDate}, which is not aligned with the plan week ${PLAN_WEEK.from}`);
  for (let step = 0; step < Math.abs(weeks); step++) {
    const loaded = page.waitForResponse((response) => response.request().method() === HTTP_POST && response.url().includes(SCHEDULE_ROUTE_PART) && response.request().postDataJSON()?.selectedGroup === options.groupId, { timeout: RELOAD_TIMEOUT_MS });
    await page.locator(weeks > 0 ? SEL_NEXT_PERIOD : SEL_PREVIOUS_PERIOD).click();
    const response = await loaded;
    opened = { filter: response.request().postDataJSON(), data: await response.json() };
    await page.waitForTimeout(CANVAS_SETTLE_MS);
  }
  if (opened.filter.periodStartDate !== PLAN_WEEK.from || opened.filter.periodEndDate !== PLAN_WEEK.until) {
    throw new Error(`the schedule shows ${opened.filter.periodStartDate}..${opened.filter.periodEndDate} instead of the plan week ${PLAN_WEEK.from}..${PLAN_WEEK.until} - an AutoWizard run would plan and accept the wrong period`);
  }
  return opened;
}

const outsidePlanWeek = (data) => [
  ...snapshotOf(data, { from: NOVEMBER_FIRST, until: PLAN_WEEK_DAY_BEFORE }),
  ...snapshotOf(data, { from: PLAN_WEEK_DAY_AFTER, until: NOVEMBER_LAST }),
].sort();

export async function takeScenarioAutoWizard(take) {
  const { page, api, options, mouse, recorder, report } = take;
  const demoGroupId = options.groupId;
  const weekGroup = await requireWeekGroup(api, demoGroupId);
  const weekTake = { ...take, options: { ...options, groupId: weekGroup.id } };
  report.weekGroup = { id: weekGroup.id, name: weekGroup.name };
  const first = await openPlanWeek(weekTake);
  const strangers = (await activeScenarios(api, weekGroup.id)).filter((scenario) => !overlapsPlanWeek(scenario));
  if (strangers.length > 0) throw new Error(`${strangers.length} active scenario(s) outside the plan week exist for "${weekGroup.name}" - run reset-scenario-demo.mjs`);
  const octoberFilter = groupMonthFilter(first.filter, demoGroupId, OCTOBER);
  const novemberFilter = groupMonthFilter(first.filter, demoGroupId, NOVEMBER);
  const octoberBefore = snapshotOf(await api.schedule(octoberFilter), OCTOBER_RANGE);
  if (octoberBefore.length !== OCTOBER_RANGE.expectedWorks) throw new Error(`October of the demo group has ${octoberBefore.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  await resetPlanWeek(api, weekGroup.id, first.filter, report);
  log(`plan week ${PLAN_WEEK.from}..${PLAN_WEEK.until} of "${weekGroup.name}" reset: ${JSON.stringify(report.reset)}`);
  report.absencesAndNotes = await assertNoAbsencesOrNotes(api, await api.schedule(realFilter(first.filter)));
  const outsideBefore = outsidePlanWeek(await api.schedule(novemberFilter));
  const { filter } = await openPlanWeek(weekTake);
  const weekFilter = realFilter(filter);
  if ((await page.locator(SEL_WIZARD_BUTTON).count()) === 0) throw new Error("the AutoWizard button is not shown - the demo account needs the Admin role");
  if ((await page.locator(SEL_WIZARD_DROPDOWN).count()) > 0) throw new Error("the wizard button is in dropdown mode - reload the page");
  const ctx = { created: [], reassigned: [], acceptRequests: 0, scheduleTokens: [], realIds: new Set(), originalClient: new Map() };
  trackNetwork(weekTake, ctx);

  const cleanupWeek = async () => {
    if (ctx.jobId) report.jobStopped = await stopJob(api, ctx.jobId);
    await resetPlanWeek(api, weekGroup.id, filter, report);
    const octoberAfter = snapshotOf(await api.schedule(octoberFilter), OCTOBER_RANGE);
    const outsideAfter = outsidePlanWeek(await api.schedule(novemberFilter));
    report.octoberRestored = sameSnapshot(octoberBefore, octoberAfter);
    report.outsideWeekRestored = sameSnapshot(outsideBefore, outsideAfter);
    if (!report.octoberRestored || !report.outsideWeekRestored) throw new Error("October or November outside the plan week of the demo group changed during the take - check the demo data!");
    log("plan week reset; October and November outside the plan week of the demo group unchanged");
  };

  await runRecorded(weekTake, cleanupWeek, async () => {
    await page.waitForTimeout(BEAT.intro);
    const started = page.waitForResponse((response) => response.request().method() === HTTP_POST && AUTO_WIZARD_START_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
    started.catch(() => {});
    await clickSelector(weekTake, SEL_WIZARD_BUTTON, MOVE.normal);
    const startResponse = await started;
    if (!startResponse.ok()) throw new Error(`the AutoWizard start returned HTTP ${startResponse.status()}`);
    report.startRequest = startResponse.request().postDataJSON();
    const { jobId } = await startResponse.json();
    ctx.jobId = jobId;
    if (report.startRequest?.groupId !== weekGroup.id) throw new Error(`the AutoWizard was started for group ${report.startRequest?.groupId} instead of the weekly group ${weekGroup.id}`);
    if (report.startRequest?.periodFrom !== PLAN_WEEK.from || report.startRequest?.periodUntil !== PLAN_WEEK.until) {
      throw new Error(`the AutoWizard was started for ${report.startRequest?.periodFrom}..${report.startRequest?.periodUntil} instead of the plan week`);
    }
    await mouse.moveTo({ x: take.viewport.width / HALF, y: take.viewport.height / HALF }, MOVE.normal);
    await recorder.beginFast(FAST_FACTOR_WIZARD);
    let job;
    try {
      job = await waitForJob(api, page, jobId);
      await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: BANNER_TIMEOUT_MS }).catch(() => {});
    } finally {
      await recorder.endFast();
    }
    report.job = { id: jobId, status: job?.status ?? null, reason: job?.reason ?? null, finalScenarioId: job?.result?.finalScenarioId ?? null, finalScenarioName: job?.result?.finalScenarioName ?? null, harmonizationSkipped: job?.result?.harmonizationSkipped ?? null, harmonizationSkippedReason: job?.result?.harmonizationSkippedReason ?? null };
    log(`job ${jobId}: ${report.job.status}${report.job.reason ? ` (${report.job.reason})` : ""}`);
    if (job?.status !== JOB_STATUS_COMPLETED || !report.job.finalScenarioId) throw new Error(`the AutoWizard did not complete (${report.job.status})`);
    ctx.finalScenarioId = report.job.finalScenarioId;
    const scenario = await getScenario(api, ctx.finalScenarioId);
    ctx.created.push(scenario);
    report.scenario = { id: scenario.id, name: scenario.name, groupId: scenario.groupId, from: dateKey(scenario.fromDate), until: dateKey(scenario.untilDate) };
    if (scenario.groupId !== weekGroup.id) {
      throw new Error(`the scenario belongs to group ${scenario.groupId} instead of the weekly group ${weekGroup.id} - accepting it would replace real data of another group`);
    }
    if (dateKey(scenario.fromDate) < PLAN_WEEK.from || dateKey(scenario.untilDate) > PLAN_WEEK.until) {
      throw new Error(`the scenario spans ${report.scenario.from}..${report.scenario.until}, outside the plan week - accepting it would replace real data elsewhere`);
    }
    await expectBanner(weekTake, scenario.name);
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    report.scenarioLoaded = ctx.scheduleTokens.includes(scenario.token);
    if (!report.scenarioLoaded) flag(report, "the schedule never loaded the AutoWizard scenario after the banner appeared");
    const planned = worksIn(await api.schedule(scenarioFilter(weekFilter, scenario.token)), PLAN_WEEK.from, PLAN_WEEK.until).length;
    report.plannedWorksInScenario = planned;
    if (planned === 0) flag(report, "the scenario holds no works in the plan week");
    await page.waitForTimeout(BEAT.show);
    await exitToOriginal(weekTake);
    report.realWorksBeforeAccept = worksIn(await api.schedule(weekFilter), PLAN_WEEK.from, PLAN_WEEK.until).length;
    if (report.realWorksBeforeAccept !== 0) flag(report, "the original week is not empty before the accept");
    await page.waitForTimeout(BEAT.show);
    await selectScenario(weekTake, scenario);
    await page.waitForTimeout(BEAT.switched);
    await decideViaBanner(weekTake, "accept");
    report.acceptRequests = ctx.acceptRequests;
    if (ctx.acceptRequests !== SINGLE_ACCEPT) flag(report, `${ctx.acceptRequests} accept requests were sent instead of one`);
    report.acceptedStatus = (await getScenario(api, scenario.id)).status;
    if (report.acceptedStatus !== SCENARIO_STATUS_ACCEPTED) flag(report, `the scenario status is ${report.acceptedStatus} after the accept`);
    report.realWorksAfterAccept = worksIn(await api.schedule(weekFilter), PLAN_WEEK.from, PLAN_WEEK.until).length;
    if (report.realWorksAfterAccept === 0) flag(report, "no works landed in the plan week after the accept");
    report.octoberUnchanged = sameSnapshot(octoberBefore, snapshotOf(await api.schedule(octoberFilter), OCTOBER_RANGE));
    report.outsideWeekUnchanged = sameSnapshot(outsideBefore, outsidePlanWeek(await api.schedule(novemberFilter)));
    if (!report.octoberUnchanged || !report.outsideWeekUnchanged) flag(report, "the accept changed data outside the plan week");
    if (report.job.harmonizationSkipped !== false) flag(report, `stage 3 did not run: ${report.job.harmonizationSkippedReason ?? report.job.reason ?? "unknown"}`);
    await holdWithPoster(weekTake, BEAT.finalHold);
  });
}

async function waitHoursDiffer(take, clientIds, range, token, baseline, check) {
  const { api } = take;
  const deadline = Date.now() + HOURS_TIMEOUT_MS;
  let hours = null;
  while (Date.now() < deadline) {
    hours = await periodHours(api, clientIds, range, token);
    if (check(hours, baseline)) return hours;
    await take.page.waitForTimeout(HOURS_POLL_MS);
  }
  return hours;
}

async function assertRowHeaderInViewport(take) {
  const box = await take.page.locator(SEL_ROW_HEADER_CANVAS).boundingBox();
  if (!box || box.width <= 0 || box.x < 0 || box.x + box.width > take.viewport.width + 1) {
    throw new Error(`the row-header canvas (name column with the hours info spots) is not inside the ${take.viewport.width}px wide viewport: ${JSON.stringify(box)}`);
  }
  return box;
}

/**
 * Checks the numbers the row header draws (slot 2 "worked hours" = hours + surcharges of the schedule response of the token): the employee that
 * receives the work in a variant must show more hours there than in the original and in the other variant. Mismatches are flagged, so the take
 * is encoded as a test take instead of being published.
 * @param shown - { source, variantA, variantB } with { id, label } of the employees and scenario of each variant
 */
function verifyDisplayedHours(take, ctx, shown) {
  const { report } = take;
  const store = ctx.displayedHours;
  const employees = [shown.source, shown.variantA.target, shown.variantB.target];
  report.displayedHours = Object.fromEntries(employees.map((employee) => [employee.label, {
    original: displayedTotal(store, null, employee.id),
    variantA: displayedTotal(store, shown.variantA.scenario.token, employee.id),
    variantB: displayedTotal(store, shown.variantB.scenario.token, employee.id),
  }]));
  const missing = Object.entries(report.displayedHours).filter(([, hours]) => Object.values(hours).some((value) => value === null));
  if (missing.length > 0) {
    flag(report, `the schedule responses carried no period hours for ${missing.map(([label]) => label).join(", ")}`);
    return;
  }
  const raised = (variant, key, otherKey) => {
    const hours = report.displayedHours[variant.target.label];
    return hours[key] > hours.original + HOURS_EPSILON && hours[otherKey] <= hours.original + HOURS_EPSILON;
  };
  if (!raised(shown.variantA, "variantA", "variantB") || !raised(shown.variantB, "variantB", "variantA")) {
    flag(report, "the hours column does not differ between original, variant A and variant B for the employees that receive the work");
  }
}

export async function takeScenarioCompare(take) {
  const { page, api, options, report } = take;
  requireScript(take, ["variantA", "variantB"]);
  const ctx = await openOctober(take);
  ctx.displayedHours = new Map();
  const move = pickFreeMove(ctx.data, ctx.filter, COMPARE_MOVE_LIMITS);
  const [targetA, targetB] = move.targets;
  const range = { from: ctx.filter.periodStartDate, until: ctx.filter.periodEndDate };
  const clientIds = [move.client.id, targetA.client.id, targetB.client.id];
  const labelOf = (client) => `${client.firstName} ${client.name}`;
  const shownRows = [move.row, targetA.row, targetB.row];
  report.move = { work: `${move.work.abbreviation} ${move.day}`, source: move.client.name, variantA: targetA.client.name, variantB: targetB.client.name };

  const cleanupCompare = () => cleanup(take, ctx);
  try {
    const baseline = await periodHours(api, clientIds, range, null);
    const variants = [];
    for (const [name, target] of [[take.script.variantA, targetA], [take.script.variantB, targetB]]) {
      const scenario = await createScenario(api, { name, groupId: options.groupId, fromDate: range.from, untilDate: range.until });
      ctx.created.push(scenario);
      const copy = scenarioCopyOf(await api.schedule(scenarioFilter(ctx.octoberFilter, scenario.token)), move.work, OCTOBER_RANGE);
      await reassignWork(api, copy.id, target.client.id);
      const hours = await waitHoursDiffer(take, clientIds, range, scenario.token, baseline, (current, base) => current[target.client.id]?.hours > base[target.client.id]?.hours + HOURS_EPSILON);
      variants.push({ scenario, target, hours });
    }
    const [variantA, variantB] = variants;
    report.periodHours = {
      original: baseline,
      variantA: variantA.hours,
      variantB: variantB.hours,
    };
    const differs = (variant, other) => variant.hours[variant.target.client.id]?.hours > baseline[variant.target.client.id]?.hours + HOURS_EPSILON
      && other.hours[variant.target.client.id]?.hours <= baseline[variant.target.client.id]?.hours + HOURS_EPSILON;
    if (!differs(variantA, variantB) || !differs(variantB, variantA)) throw new Error("the period hours of variant A, variant B and the original do not differ as expected - the comparison would show nothing");
    await openSchedule(page, options);
    await page.waitForFunction((selector) => document.querySelectorAll(selector).length === 2, SEL_SELECTOR_ITEMS, { timeout: S.READY_TIMEOUT_MS });
    report.rowHeaderCanvas = await assertRowHeaderInViewport(take);
    ctx.variants = variants.map((variant) => variant.scenario);
  } catch (error) {
    await cleanupCompare().catch((cleanupError) => log(`! cleanup after a failed setup: ${cleanupError.message}`));
    throw error;
  }

  const [scenarioA, scenarioB] = ctx.variants;
  const keepRowsVisible = () => scrollRowsIntoView(take, shownRows);
  await runRecorded(take, cleanupCompare, async () => {
    await page.waitForTimeout(BEAT.intro);
    await selectScenario(take, scenarioA);
    await keepRowsVisible();
    await holdWithPoster(take, BEAT.switched);
    await selectScenario(take, scenarioB);
    await keepRowsVisible();
    await page.waitForTimeout(BEAT.switched);
    await exitToOriginal(take);
    await keepRowsVisible();
    verifyDisplayedHours(take, ctx, {
      source: { id: move.client.id, label: labelOf(move.client) },
      variantA: { scenario: scenarioA, target: { id: targetA.client.id, label: labelOf(targetA.client) } },
      variantB: { scenario: scenarioB, target: { id: targetB.client.id, label: labelOf(targetB.client) } },
    });
    await page.waitForTimeout(BEAT.switched);
    await selectScenario(take, scenarioA);
    await decideViaBanner(take, "reject");
    await page.waitForTimeout(BEAT.hover);
    await selectScenario(take, scenarioB);
    await decideViaBanner(take, "reject");
    report.activeAfterRejects = (await activeScenarios(api, options.groupId)).length;
    if (report.activeAfterRejects !== 0) flag(report, `${report.activeAfterRejects} scenario(s) are still active after both rejects`);
    await verifyRealUnchanged(take, ctx, "after both rejects");
    await page.waitForTimeout(BEAT.finalHold);
  });
}

function errorRowFor(page, pick) {
  return page.locator(SEL_ERROR_ROWS)
    .filter({ hasText: pick.day })
    .filter({ hasText: pick.lateClient.name })
    .filter({ hasText: hhmm(pick.late.endTime) })
    .filter({ hasText: hhmm(pick.early.startTime) });
}

const visibleErrorRows = (page) => page.locator(SEL_ERROR_ROWS).evaluateAll((elements) => elements.map((element) => element.innerText.replace(/\s+/g, " ").trim()));

async function switchOffInfoRows(take) {
  const info = take.page.locator(SEL_INFO_FILTER);
  await info.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  const isActive = async () => ((await info.getAttribute("class")) ?? "").split(/\s+/).includes(CLASS_ACTIVE);
  if (await isActive()) await take.mouse.clickLocator(info, MOVE.normal);
  if (await isActive()) throw new Error("info filter of the error list could not be switched off");
}

async function waitErrorListEmpty(page) {
  const deadline = Date.now() + ERROR_ROW_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if ((await visibleErrorRows(page)).length === 0) return true;
    await page.waitForTimeout(ERROR_LIST_POLL_MS);
  }
  return false;
}

export async function takeScenarioRuleViolation(take) {
  const { page, api, mouse, report, script } = take;
  requireScript(take, ["scenarioName"]);
  const ctx = await openOctober(take);
  const pick = pickRestConflict(ctx.data, ctx.filter, RULE_LIMITS);
  const dayIndex = dayDiff(ctx.filter.periodStartDate, pick.next);
  report.move = { early: `${pick.early.abbreviation} ${pick.next} ${pick.earlyClient.firstName} ${pick.earlyClient.name}`, to: `${pick.lateClient.firstName} ${pick.lateClient.name}`, after: `${pick.late.abbreviation} ${pick.day} ${hhmm(pick.late.startTime)}-${hhmm(pick.late.endTime)}`, restHours: pick.rest };
  log(`move ${report.move.early} -> ${report.move.to} (after ${report.move.after}, rest ${pick.rest} h)`);
  await runRecorded(take, () => cleanup(take, ctx), async () => {
    await page.waitForTimeout(BEAT.intro);
    const scenario = await createScenarioViaUi(take, script.scenarioName);
    await mouse.clickLocator(page.locator(SEL_SHIFT_TABS).nth(ERROR_TAB_INDEX), MOVE.normal);
    await switchOffInfoRows(take);
    await scrollRowsIntoView(take, [pick.lateRow, pick.earlyRow]);
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    const rowsBefore = await visibleErrorRows(page);
    if (rowsBefore.length > 0) throw new Error(`the scenario's error list (info rows off) is not empty before the move: ${rowsBefore.join(" | ")}`);
    const copy = scenarioCopyOf(await api.schedule(scenarioFilter(ctx.octoberFilter, scenario.token)), pick.early, OCTOBER_RANGE);
    await dragWork(take, ctx, { fromRow: pick.earlyRow, toRow: pick.lateRow, dayIndex, expectedId: copy.id });
    await mouse.click(await cellCenter(page, pick.lateRow, dayIndex, ctx.isRtl), MOVE.short);
    const row = errorRowFor(page, pick).first();
    report.warningInScenario = await row.waitFor({ state: "visible", timeout: ERROR_ROW_TIMEOUT_MS }).then(() => true, () => false);
    report.errorRowsInScenario = await visibleErrorRows(page);
    if (!report.warningInScenario) flag(report, "the rest warning did not appear in the scenario's error list");
    else if (report.errorRowsInScenario.length !== 1) flag(report, `the error list shows ${report.errorRowsInScenario.length} rows instead of only the demonstrated warning`);
    await holdWithPoster(take, BEAT.warning);
    await verifyRealUnchanged(take, ctx, "after the rule violation in the scenario");
    await exitToOriginal(take);
    report.originalListEmpty = await waitErrorListEmpty(page);
    report.errorRowsInOriginal = await visibleErrorRows(page);
    if (!report.originalListEmpty) flag(report, `the original plan's error list is not empty after "Zum Original": ${report.errorRowsInOriginal.join(" | ")}`);
    await page.waitForTimeout(BEAT.warning);
  });
}

export const SCENARIO_TAKE_RUNNERS = {
  [VIDEO_SCENARIO_CREATE]: takeScenarioCreate,
  [VIDEO_SCENARIO_AUTOWIZARD]: takeScenarioAutoWizard,
  [VIDEO_SCENARIO_COMPARE]: takeScenarioCompare,
  [VIDEO_SCENARIO_RULE_VIOLATION]: takeScenarioRuleViolation,
};
