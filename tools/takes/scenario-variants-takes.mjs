// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip S0 v2 "Zwei Varianten, ein Ja" (series Szenarien, security demo Bern, lib/security-demo.mjs). It needs a throw-away copy of the stage database
 * klacks_marketing_security_bern_s4 (bern_s1 migrated by 1.0.63, December planned and accepted, no on-call days, corrected by scenario-keys-demo/seed-s0-rest-days.mjs so the
 * real December breaks no rule: the error list is empty) and --group-id of "Bern Objektschutz".
 * scenario-variants (1280x720): the variant A is created through the selector dialog of the schedule and the nights of the script move from the source employee to candidate A by drag
 * and drop inside the scenario; inside a cut the splitter is set higher (script.errorListSplitY: the grid redraws in steps while it is dragged, and from the start the third
 * story row would be hidden) and the error list shows what Klacks warns about (rest time, more than MaxConsecutiveDays days in a row and more). The variant B is created through the
 * same dialog in the picture (the wait of the app for a new scenario, about 15 s on the recording machine, is a cut, for A as well); inside a cut the page is framed again on B (row slider,
 * columns, splitter as for A), then the same nights move to candidate B by drag and drop in the picture, so the viewer sees them go to B; the error list of B is then raised like the
 * one of A and shown empty, and inside a cut the splitter goes back to the overview height. The open selector shows both variants, variant B is accepted through the banner, and the real plan shows the nights of candidate B with an empty error
 * list. Variant A stays an active scenario (nothing is shown about it after the accept).
 * The stage carries the row order of the story (source, A, B on top), the row slider stands at 100 for the moves so the app draws the text at full size. The script of
 * capture-app-videos.scripts.json names the people, the nights, the beats and the layout; the captions come from simple-videos.<culture>.json.
 * Safety rules: variant B is accepted exactly once and only after its group and from/until dates were checked to be the group and December; no override and no "Trotzdem
 * übernehmen" is ever clicked.
 * Publishable criterion (report.publishable, every part is read from the API or the page, not from a recording): the error list of the real December is empty at the start; every moved
 * work is a scenario copy, the real plan is unchanged until the accept; variant A shows the rest row and the consecutive-days row in its error list; the error list of variant B is
 * empty and B stays below the contract maximum; the open selector lists both variants; exactly one accept answered 200; variant B is Accepted; the real December differs from the
 * December before the take exactly by the moved nights (compared by employee, day and times, an accept writes new ids) and its error list is empty after the accept; no error toast;
 * no HTTP error; no text "Winterthur" or "Uster" on the page at the checkpoints.
 * Period hours: PeriodHoursService ignores ReplacementWithin; this take moves whole works only, it holds no replacement, so the hours of the row header are valid.
 * Cultures de, en, fr, it: the names of the variants come from the script entry, the rest warning of the error list from lib/ui-texts.mjs.
 * @param take - page, api, options, recorder, mouse, report, captions, script, viewport, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import { CANVAS_SETTLE_MS, CELL_WIDTH_PX, HALF, HTTP_POST, SCHEDULE_ROUTE_PART, SUB_ROW_HEIGHT_PX, dateKey, gridBox, openSchedule, rowBoxes, worksIn } from "../lib/schedule-grid.mjs";
import { SCENARIO_STATUS_ACCEPTED, activeScenarios, getScenario, periodHours, realFilter, scenarioCopyOf, scenarioFilter } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import { checkPage, useRowOrder } from "./replacement-takes.mjs";
import { clickSelector, decideViaBanner, expectBanner, flag, holdWithPoster, trackNetwork } from "./scenario-takes.mjs";
import { checkStage, measure, readToasts, scrollColumns, setRowSlider, trackHttpErrors, watchToasts } from "./security-takes.mjs";
import { uiTexts } from "../lib/ui-texts.mjs";

export const VIDEO_SCENARIO_VARIANTS = "scenario-variants";
export const SCENARIO_VARIANTS_CUES = Object.freeze({
  plan: "plan",
  copy: "copy",
  move: "move",
  rest: "rest",
  variantB: "variantB",
  clean: "clean",
  both: "both",
  yes: "yes",
  real: "real",
});
export const SCENARIO_VARIANTS_FINAL_HOLD_MS = 2500;

const SEL_SELECTOR_BTN = "#scenario-selector-btn";
const SEL_SELECTOR_CREATE = "#scenario-selector-create-item";
const selectorItem = (id) => `[data-scenario-id="${id}"]`;
const SEL_NAME_INPUT = "#scenario-name-input";
const SEL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_SHIFT_TABS = "#shift-tabs .nav-link";
const SEL_ERROR_ROWS = "app-schedule-error-list tr.table-row";
const SEL_INFO_FILTER = "#info-filter-btn";
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const SEL_ZOOM_POINTER = "#schedule-zoom-slider .ngx-slider-pointer";
const SPLIT_DIRECTION_VERTICAL = "vertical";
const ERROR_TAB_INDEX = 1;
const CLASS_ACTIVE = "active";
const KEY_HOME = "Home";
const SELECT_ALL = "Control+A";
const SORT_ORDER_API = "/api/backend/clientsortpreferences";
const HTTP_PUT = "PUT";
const SCENARIO_CREATE_PATH = /\/AnalyseScenarios\/?$/i;
const SCENARIO_ACCEPT_PATH = /\/AnalyseScenarios\/[0-9a-f-]{36}\/Accept/i;
const REASSIGN_ROUTE = /\/Works\/([0-9a-f-]{36})\/ReassignClient/i;
const WATCHED_ERROR_PATH = /\/AnalyseScenarios|\/Works\/|\/Accept/i;
const SAVE_TIMEOUT_MS = 30000;
const RELOAD_TIMEOUT_MS = 60000;
const ERROR_ROW_TIMEOUT_MS = 20000;
const ERROR_LIST_POLL_MS = 250;
const TYPE_DELAY_MS = 45;
const CUT = Number.POSITIVE_INFINITY;
const MOVE = { short: 300, normal: 550, drag: 1000 };
const CONSECUTIVE_ROW = /\b\d+\b[^0-9]*\(max\. ?\d+\)/;
const KEY_ESCAPE = "Escape";
const ERROR_LIST_CURSOR_OFFSET_PX = 120;

const fullName = (client) => `${client.firstName} ${client.name}`;
const pauseOf = (take, beat) => take.page.waitForTimeout(take.script.beats[beat]);
const semanticKey = (work) => [work.clientId, dateKey(work.entryDate), work.startTime, work.endTime].join("|");
const semanticPlan = (data) => worksIn(data, D.PERIOD.from, D.PERIOD.until).map(semanticKey).sort();
const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const visibleErrorRows = (page) => page.locator(SEL_ERROR_ROWS).evaluateAll((elements) => elements.map((element) => element.innerText.replace(/\s+/g, " ").trim()));
const clientNamed = (clients, firstName) => {
  const client = clients.find((entry) => entry.firstName === firstName);
  if (!client) throw new Error(`${firstName} is not in the schedule of the group`);
  return client;
};
const tokenOfResponse = (response) => response.request().postDataJSON()?.analyseToken ?? null;

export function waitReload(take, token) {
  const { page, options } = take;
  const loaded = page.waitForResponse((response) => response.request().method() === HTTP_POST && response.url().includes(SCHEDULE_ROUTE_PART)
    && response.request().postDataJSON()?.selectedGroup === options.groupId && (token === undefined ? Boolean(tokenOfResponse(response)) : tokenOfResponse(response) === token), { timeout: RELOAD_TIMEOUT_MS });
  loaded.catch(() => {});
  return loaded;
}

export async function settled(take, reload, label) {
  const seen = await reload.then(() => true, () => false);
  if (!seen) flag(take.report, `no schedule reload after "${label}"`);
  await take.page.waitForTimeout(CANVAS_SETTLE_MS);
}

async function orderRows(take, clients, firstNames) {
  const story = firstNames.map((firstName) => clientNamed(clients, firstName));
  const ordered = [...story, ...clients.filter((client) => !story.includes(client))];
  await take.api.json(`${SORT_ORDER_API}/${take.options.groupId}`, { method: HTTP_PUT, data: ordered.map((client, sortOrder) => ({ clientId: client.id, sortOrder })) });
}

/** Row slider at its overview value and the splitter at the height of the script: the error list stays in the picture, unlike the collapsed layout of the month plan take. */
async function frameOverview(take) {
  const { page, mouse, script } = take;
  await useRowOrder(take);
  const pointer = page.locator(SEL_ZOOM_POINTER).first();
  await pointer.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await pointer.focus();
  await page.keyboard.press(KEY_HOME);
  await pointer.evaluate((element) => element.blur());
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await dragSplitter(take, script.splitY);
}

/** The splitter between the grid and the shift area, dragged by the cursor to the height y. */
async function dragSplitter(take, y) {
  const { page, mouse } = take;
  const gutters = await page.locator(SEL_SPLIT_GUTTER).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, direction: element.parentElement?.getAttribute("direction") };
  }));
  const gutter = gutters.find((candidate) => candidate.direction === SPLIT_DIRECTION_VERTICAL);
  if (!gutter) throw new Error("the splitter between the grid and the shift area was not found");
  await mouse.drag({ x: gutter.x, y: gutter.y }, { x: gutter.x, y }, MOVE.normal);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

async function infoRowsOff(take) {
  const { page } = take;
  await page.locator(SEL_SHIFT_TABS).nth(ERROR_TAB_INDEX).click();
  const info = page.locator(SEL_INFO_FILTER);
  await info.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (((await info.getAttribute("class")) ?? "").split(/\s+/).includes(CLASS_ACTIVE)) await info.click();
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

async function createVariantInPicture(take, name) {
  const { page, mouse } = take;
  await clickSelector(take, SEL_SELECTOR_BTN, MOVE.normal);
  await pauseOf(take, "menu");
  await clickSelector(take, SEL_SELECTOR_CREATE, MOVE.normal);
  await waitModalAtRest(page);
  const field = page.locator(SEL_NAME_INPUT);
  await field.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(field, MOVE.short);
  await page.keyboard.press(SELECT_ALL);
  await field.pressSequentially(name, { delay: TYPE_DELAY_MS });
  await pauseOf(take, "typed");
  const created = page.waitForResponse((response) => response.request().method() === HTTP_POST && SCENARIO_CREATE_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  created.catch(() => {});
  const reload = waitReload(take);
  await mouse.clickLocator(page.locator(SEL_SAVE), MOVE.normal);
  await take.recorder.beginFast(CUT);
  const response = await created;
  if (!response.ok()) throw new Error(`creating the scenario returned HTTP ${response.status()}`);
  const scenario = await response.json();
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await expectBanner(take, name);
  await settled(take, reload, "create");
  await take.recorder.endFast();
  return scenario;
}

/** @param cutWait - the dark grid with spinner of the reload is left out of the video; off inside a cut region */
export async function selectVariant(take, scenario, { cutWait = true } = {}) {
  const { recorder } = take;
  const reload = waitReload(take, scenario.token);
  await clickSelector(take, SEL_SELECTOR_BTN, MOVE.normal);
  await pauseOf(take, "menu");
  await clickSelector(take, selectorItem(scenario.id), MOVE.normal);
  if (cutWait) await recorder.beginFast(CUT);
  await expectBanner(take, scenario.name);
  await settled(take, reload, `select ${scenario.name}`);
  if (cutWait) await recorder.endFast();
}

function cellOf(grid, boxes, script, day, row) {
  const column = Number(day.slice(-2)) - 1 - script.columnsScrolled;
  return { x: grid.x + (column + 1 / HALF) * CELL_WIDTH_PX, y: boxes[row].top + SUB_ROW_HEIGHT_PX / HALF };
}

async function moveNight(take, ctx, day, toRow, expectedId) {
  const { page, mouse, report, script } = take;
  const grid = await gridBox(page);
  const boxes = await rowBoxes(page);
  const source = cellOf(grid, boxes, script, day, 0);
  const target = cellOf(grid, boxes, script, day, toRow);
  const reassign = page.waitForResponse((response) => REASSIGN_ROUTE.test(response.url()), { timeout: SAVE_TIMEOUT_MS });
  reassign.catch(() => {});
  await mouse.moveTo(source, MOVE.normal);
  await page.waitForTimeout(script.beats.hover);
  await mouse.drag(source, target, MOVE.drag);
  const response = await reassign;
  const movedId = response.url().match(REASSIGN_ROUTE)[1].toLowerCase();
  (report.drags ??= []).push({ day, movedId, status: response.status() });
  if (ctx.realIds.has(movedId)) flag(report, `the drag moved the REAL work ${movedId}`);
  if (movedId !== String(expectedId).toLowerCase()) flag(report, `the drag on ${day} moved ${movedId} instead of the scenario copy ${expectedId}`);
  if (!response.ok()) flag(report, `the reassign on ${day} returned HTTP ${response.status()}`);
  await page.waitForTimeout(script.beats.afterDrop);
}

async function waitListOfPlan(page, expected) {
  const sorted = [...expected].sort();
  const deadline = Date.now() + ERROR_ROW_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (sameList(sorted, (await visibleErrorRows(page)).sort())) return true;
    await page.waitForTimeout(ERROR_LIST_POLL_MS);
  }
  return false;
}

async function waitRestRow(page, restRow) {
  const row = page.locator(SEL_ERROR_ROWS).filter({ hasText: restRow }).first();
  const seen = await row.waitFor({ state: "visible", timeout: ERROR_ROW_TIMEOUT_MS }).then(() => true, () => false);
  if (seen) await row.scrollIntoViewIfNeeded();
  return seen;
}

async function readHours(take, ctx, label, token) {
  const { api, report } = take;
  const ids = [ctx.source.id, ctx.a.id, ctx.b.id];
  const hours = await periodHours(api, ids, D.PERIOD, token);
  (report.hours ??= {})[label] = Object.fromEntries([ctx.source, ctx.a, ctx.b].map((client) => [client.firstName, hours[client.id] ?? null]));
}

/** The caption says B stays below the maximum of the contract: both the hours and the total of the row header (hours + surcharges) must. */
function checkContractMaximum(take, ctx) {
  const { report, script } = take;
  const hours = report.hours.variantB[ctx.b.firstName];
  const maximum = D.CONTRACTS[D.SITES.bern.team.find((member) => member.firstName === ctx.b.firstName).contract].maximum;
  report.contractCheck = { hours: hours?.hours, surcharges: hours?.surcharges, maximum };
  if (!hours || hours.hours + (hours.surcharges ?? 0) > maximum) flag(report, `${script.variantB.firstName} exceeds the contract maximum ${maximum}`);
}

/** The check before the only accept of the take. */
async function assertVariantB(take, ctx) {
  const { api, options, report } = take;
  const scenario = await getScenario(api, ctx.variantB.id);
  report.acceptGuard = { groupId: scenario.groupId, from: dateKey(scenario.fromDate), until: dateKey(scenario.untilDate) };
  if (scenario.groupId !== options.groupId) throw new Error(`variant B belongs to group ${scenario.groupId} - accepting it would replace data of another group`);
  if (report.acceptGuard.from !== D.PERIOD.from || report.acceptGuard.until !== D.PERIOD.until) throw new Error(`variant B spans ${report.acceptGuard.from}..${report.acceptGuard.until} instead of December`);
  const real = await api.schedule(ctx.decemberFilter);
  if (!sameList(ctx.planBefore, semanticPlan(real))) throw new Error("the real plan changed before the accept");
}

/** Inside a cut: the page is opened again and framed on variant B as it was for variant A, so the drags to candidate B happen in the picture. */
async function frameVariantBInCut(take, ctx) {
  const { page, options, script } = take;
  await openSchedule(page, options);
  await frameOverview(take);
  await watchToasts(page);
  await infoRowsOff(take);
  await page.waitForFunction((selector) => document.querySelectorAll(selector).length >= 2, "[data-scenario-id]", { state: "attached", timeout: S.READY_TIMEOUT_MS }).catch(() => {});
  await selectVariant(take, ctx.variantB, { cutWait: false });
  await setRowSlider(take, true);
  await scrollColumns(take, script.columnsScrolled, 1);
  await page.locator(SEL_ZOOM_POINTER).first().evaluate((element) => element.blur());
}

/** The error list of variant A: the rest row and the consecutive-days row must be there (otherwise the app does not show what the caption says: a product finding). */
async function readWarningsOfA(take) {
  const { page, report } = take;
  const ui = uiTexts(take.culture);
  report.restRowInA = await waitRestRow(page, ui.restRow);
  report.errorRowsInA = await visibleErrorRows(page);
  report.consecutiveRowInA = report.errorRowsInA.find((row) => CONSECUTIVE_ROW.test(row) && row.includes(take.script.variantA.firstName)) ?? null;
  if (!report.restRowInA) flag(report, "the rest warning did not appear in the error list of variant A");
  if (!report.consecutiveRowInA) flag(report, `the error list of variant A does not show the run of consecutive days (product finding): ${report.errorRowsInA.join(" | ")}`);
}

/** The rows of the error list that lie completely inside the viewport (the list is cut by the bottom of the page). */
const shownErrorRows = (page) => page.locator(SEL_ERROR_ROWS).evaluateAll((elements) => elements.filter((element) => {
  const box = element.getBoundingClientRect();
  return box.height > 0 && box.top >= 0 && box.bottom <= window.innerHeight;
}).map((element) => element.innerText.replace(/\s+/g, " ").trim()));

/** The error list of variant B framed as the one of variant A (tab clicked in the picture, splitter raised inside a cut): the viewer sees that it is empty. */
async function showEmptyListOfB(take) {
  const { page, mouse, recorder, report, script } = take;
  await mouse.clickLocator(page.locator(SEL_SHIFT_TABS).nth(ERROR_TAB_INDEX), MOVE.normal);
  await recorder.beginFast(CUT);
  await dragSplitter(take, script.errorListSplitY);
  await mouse.moveTo({ x: take.viewport.width / HALF, y: script.errorListSplitY + ERROR_LIST_CURSOR_OFFSET_PX }, MOVE.short);
  await recorder.endFast();
  report.errorRowsShownInB = await shownErrorRows(page);
  if (report.errorRowsShownInB.length > 0) flag(report, `the shown error list of variant B is not empty: ${report.errorRowsShownInB.join(" | ")}`);
}

/** The selector opened in the picture: both variants must be listed; the menu is closed with Escape (its own close, nothing is selected). */
async function showBothVariants(take, ctx) {
  const { page, report } = take;
  await clickSelector(take, SEL_SELECTOR_BTN, MOVE.normal);
  await page.locator(selectorItem(ctx.variantA.id)).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.locator(selectorItem(ctx.variantB.id)).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  report.selectorItems = await page.locator("[data-scenario-id]").evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().width > 0).map((element) => element.innerText.replace(/\s+/g, " ").trim()));
  const box = await page.locator(selectorItem(ctx.variantB.id)).boundingBox();
  if (box) await take.mouse.moveTo({ x: box.x + box.width / HALF, y: box.y + box.height / HALF }, MOVE.short);
  await pauseOf(take, "both");
  await page.keyboard.press(KEY_ESCAPE);
  await page.locator(selectorItem(ctx.variantA.id)).waitFor({ state: "hidden", timeout: S.READY_TIMEOUT_MS }).catch(() => {});
}

/** The published proof of the take: only states read back from the API after the last click. */
async function verifyFinished(take, ctx) {
  const { page, api, options, report } = take;
  const a = await getScenario(api, ctx.variantA.id);
  const b = await getScenario(api, ctx.variantB.id);
  report.finalStatus = { variantA: a.status, variantB: b.status, active: (await activeScenarios(api, options.groupId)).length };
  if (b.status !== SCENARIO_STATUS_ACCEPTED) flag(report, `variant B ends in status ${b.status}`);
  if (a.status === SCENARIO_STATUS_ACCEPTED) flag(report, "variant A is accepted");
  const real = await api.schedule(ctx.decemberFilter);
  const expected = ctx.planBefore.map((key) => {
    const night = ctx.nights.find((work) => semanticKey(work) === key);
    return night ? semanticKey({ ...night, clientId: ctx.b.id }) : key;
  }).sort();
  const after = semanticPlan(real);
  report.realPlan = { works: after.length, nightsOnB: ctx.nights.filter((work) => after.includes(semanticKey({ ...work, clientId: ctx.b.id }))).length, onlyTheNightsMoved: sameList(expected, after) };
  if (!report.realPlan.onlyTheNightsMoved) flag(report, "the real December differs by more than the moved nights");
  report.okAccepts = ctx.okAccepts;
  if (ctx.okAccepts !== 1) flag(report, `${ctx.okAccepts} accepts answered 200 instead of one`);
  report.errorRowsAfterAccept = await visibleErrorRows(page);
  if (report.errorRowsAfterAccept.length > 0) flag(report, `the error list of the real plan is not empty after the accept: ${report.errorRowsAfterAccept.join(" | ")}`);
  const watched = (report.httpErrors ?? []).filter((line) => WATCHED_ERROR_PATH.test(line));
  if (watched.length > 0) flag(report, `HTTP errors: ${watched.join("; ")}`);
}

export async function takeScenarioVariants(take) {
  const { page, api, options, recorder, mouse, report, captions, script } = take;
  if (!script?.beats || !script?.variantA || !script?.variantB || !script?.nights) throw new Error(`the ${report.video} script lacks beats, variantA, variantB or nights in capture-app-videos.scripts.json`);
  const cues = SCENARIO_VARIANTS_CUES;
  const ui = uiTexts(take.culture);
  await checkStage(take, D.SITES.bern);
  const first = await openSchedule(page, options);
  await orderRows(take, first.data.clients, [script.source, script.variantA.firstName, script.variantB.firstName]);
  const { filter } = await openSchedule(page, options);
  if (filter.periodStartDate !== D.PERIOD.from || filter.periodEndDate !== D.PERIOD.until) throw new Error(`the schedule shows ${filter.periodStartDate}..${filter.periodEndDate} instead of December`);
  const decemberFilter = realFilter(filter);
  const data = await api.schedule(decemberFilter);
  const source = clientNamed(data.clients, script.source);
  const a = clientNamed(data.clients, script.variantA.firstName);
  const b = clientNamed(data.clients, script.variantB.firstName);
  const onDay = (clientId, day) => data.entries.filter((entry) => entry.clientId === clientId && dateKey(entry.entryDate) === day);
  const nights = script.nights.map((day) => {
    const works = onDay(source.id, day).filter((entry) => entry.entryType === 0);
    if (works.length !== 1 || works[0].abbreviation !== script.shift) throw new Error(`${source.firstName} holds ${works.map((work) => work.abbreviation).join(",") || "nothing"} on ${day} instead of ${script.shift}`);
    return works[0];
  });
  for (const day of script.nights) {
    if (onDay(a.id, day).some((entry) => entry.entryType === 0) || onDay(b.id, day).some((entry) => entry.entryType === 0)) throw new Error(`a candidate already works on ${day}`);
  }
  const realIds = new Set(worksIn(data, D.PERIOD.from, D.PERIOD.until).map((work) => work.id));
  const ctx = { created: [], reassigned: [], acceptRequests: 0, scheduleTokens: [], realIds, originalClient: new Map(), displayedHours: new Map(), decemberFilter, source, a, b, nights, okAccepts: 0, planBefore: semanticPlan(data) };
  trackNetwork(take, ctx);
  trackHttpErrors(take);
  page.on("response", (response) => {
    if (response.request().method() === HTTP_POST && SCENARIO_ACCEPT_PATH.test(new URL(response.url()).pathname) && response.ok()) ctx.okAccepts++;
  });
  report.story = { source: fullName(source), a: fullName(a), b: fullName(b), nights: script.nights, works: data.clients.length };
  await frameOverview(take);
  await watchToasts(page);
  await infoRowsOff(take);
  await measure(take, "start");
  await checkPage(take, "start");
  report.errorRowsAtStart = await visibleErrorRows(page);
  if (report.errorRowsAtStart.length > 0) throw new Error(`the error list of the real December is not empty: ${report.errorRowsAtStart.join(" | ")} - use klacks_marketing_security_bern_s4`);
  await readHours(take, ctx, "original", null);

  await recorder.start();
  try {
    await captions.show(cues.plan);
    await pauseOf(take, "plan");
    await captions.show(cues.copy);
    await pauseOf(take, "copyLead");
    ctx.variantA = await createVariantInPicture(take, script.variantA.scenarioName);
    report.variantA = { id: ctx.variantA.id, from: dateKey(ctx.variantA.fromDate), until: dateKey(ctx.variantA.untilDate), name: ctx.variantA.name };
    await pauseOf(take, "copy");
    await checkPage(take, "variant A");

    await captions.show(cues.move);
    await setRowSlider(take, true);
    await scrollColumns(take, script.columnsScrolled, 1);
    await measure(take, "detail");
    const copies = await api.schedule(scenarioFilter(decemberFilter, ctx.variantA.token));
    for (const [index, work] of nights.entries()) await moveNight(take, ctx, script.nights[index], 1, scenarioCopyOf(copies, work, D.PERIOD).id);
    await pauseOf(take, "moved");
    if (!sameList(ctx.planBefore, semanticPlan(await api.schedule(decemberFilter)))) flag(report, "the real plan changed by the moves in the scenario");
    await readHours(take, ctx, "variantA", ctx.variantA.token);

    await captions.show(cues.rest);
    await mouse.clickLocator(page.locator(SEL_SHIFT_TABS).nth(ERROR_TAB_INDEX), MOVE.normal);
    await recorder.beginFast(CUT);
    await dragSplitter(take, script.errorListSplitY);
    await mouse.moveTo({ x: take.viewport.width / HALF, y: script.errorListSplitY + ERROR_LIST_CURSOR_OFFSET_PX }, MOVE.short);
    await recorder.endFast();
    await readWarningsOfA(take);
    report.errorRowsShownInA = await shownErrorRows(page);
    if (!report.errorRowsShownInA.some((row) => CONSECUTIVE_ROW.test(row))) flag(report, `the consecutive-days row is not inside the visible error list: ${report.errorRowsShownInA.join(" | ")}`);
    await pauseOf(take, "rest");
    await checkPage(take, "rest warning");

    await captions.show(cues.variantB);
    await pauseOf(take, "variantLead");
    ctx.variantB = await createVariantInPicture(take, script.variantB.scenarioName);
    await recorder.beginFast(CUT);
    await frameVariantBInCut(take, ctx);
    await page.locator(SEL_SHIFT_TABS).nth(ERROR_TAB_INDEX).click();
    await recorder.endFast();
    const copiesB = await api.schedule(scenarioFilter(decemberFilter, ctx.variantB.token));
    for (const [index, work] of nights.entries()) await moveNight(take, ctx, script.nights[index], 2, scenarioCopyOf(copiesB, work, D.PERIOD).id);
    await pauseOf(take, "moved");
    if (!sameList(ctx.planBefore, semanticPlan(await api.schedule(decemberFilter)))) flag(report, "the real plan changed by the moves in variant B");
    report.listOfPlanInB = await waitListOfPlan(page, []);
    report.errorRowsInB = await visibleErrorRows(page);
    await readHours(take, ctx, "variantB", ctx.variantB.token);
    if (!report.listOfPlanInB) flag(report, `the error list of variant B is not empty: ${report.errorRowsInB.join(" | ")}`);
    checkContractMaximum(take, ctx);
    await pauseOf(take, "variantB");
    await captions.show(cues.clean);
    await showEmptyListOfB(take);
    await pauseOf(take, "clean");
    await checkPage(take, "variant B");
    await recorder.beginFast(CUT);
    await dragSplitter(take, script.splitY);
    await recorder.endFast();

    await captions.show(cues.both);
    await showBothVariants(take, ctx);

    await captions.show(cues.yes);
    await pauseOf(take, "acceptLead");
    await assertVariantB(take, ctx);
    await decideViaBanner(take, "accept", { cutReload: true });
    await readHours(take, ctx, "accepted", null);
    await pauseOf(take, "yes");

    await captions.show(cues.real);
    await page.locator(SEL_SHIFT_TABS).nth(ERROR_TAB_INDEX).click();
    await waitListOfPlan(page, []);
    await pauseOf(take, "real");
    await verifyFinished(take, ctx);
    await readToasts(take);
    await checkPage(take, "finished");
    await mouse.moveTo({ x: take.viewport.width / HALF, y: take.viewport.height / HALF }, MOVE.normal);
    await holdWithPoster(take, take.finalHoldMs);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale } });
  }
}
