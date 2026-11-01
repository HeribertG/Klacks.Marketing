// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip S0 "Zwei Varianten, ein Ja" (series Szenarien, security demo Bern, lib/security-demo.mjs). It needs a throw-away copy of the stage database klacks_marketing_security_bern_s1
 * (December planned by the AutoWizard and accepted, no on-call days) and --group-id of "Bern Objektschutz".
 * scenario-variants (1280x720): the first variant is created through the selector dialog of the schedule, the nights of the script move from the source employee to candidate A by drag and drop inside the
 * scenario, the error list shows the rest warning. In a cut region the second variant is created through the API and the same nights move to candidate B;
 * the page is reloaded so the selector lists it, and variant A is selected again, so the cut ends in the picture it started in. The selector switches to variant B (the error list holds only the rows of the plan again, hours in the row header),
 * "Zum Original" shows the untouched plan, variant B is accepted through the banner. Accepting variant A afterwards is answered with the stale warning of the app naming variant B; the dialog is cancelled, variant A is rejected.
 * The stage carries the row order of the story (source, A, B on top), the row slider stands at 100 for the moves so the app draws the text at full size. The script of capture-app-videos.scripts.json names the people,
 * the nights, the beats and the layout; the captions come from simple-videos.<culture>.json.
 * Safety rules: variant B is accepted exactly once and only after its group and from/until dates were checked to be the group and December; no override and no "Trotzdem übernehmen" is ever clicked; an accept of variant A that answers 200
 * aborts the take; the stale attempt only clicks the cancel button of the dialog.
 * Publishable criterion (report.publishable, every part is read from the API or the page, not from a recording): every moved work is a scenario copy, the real plan is unchanged until the accept; variant A shows a rest row in the error list, variant B
 * and the original show exactly the rows of the plan (with the info rows off), variant B stays below the contract maximum; exactly one accept answered 200, the attempt on variant A answered 409 SCENARIO_STALE and named variant B in the dialog; variant B is Accepted, variant A Rejected, no active scenario is left;
 * the real December differs from the December before the take exactly by the moved nights (compared by employee, day and times, an accept writes new ids); no error toast; no HTTP error besides the stale answer; no text "Winterthur" or "Uster" on the page at the checkpoints.
 * Period hours: PeriodHoursService ignores ReplacementWithin; this take moves whole works only, it holds no replacement, so the hours of the row header are valid. report.hours lists what the row headers draw per token.
 * Cultures de, en, fr, it: the names of the variants come from the script entry, the rest warning of the error list and the lines of the stale dialog from lib/ui-texts.mjs (whitespace is collapsed on both sides, French writes a space before the colon).
 * Since v1.0.55 the dialog creates variant A for the planning period of the plan (December) and the days outside it are locked in the scenario view.
 * @param take - page, api, options, recorder, mouse, report, captions, script, viewport, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import { CANVAS_SETTLE_MS, CELL_WIDTH_PX, HALF, HTTP_POST, SCHEDULE_ROUTE_PART, SUB_ROW_HEIGHT_PX, dateKey, gridBox, openSchedule, rowBoxes, worksIn } from "../lib/schedule-grid.mjs";
import { SCENARIO_STATUS_ACCEPTED, activeScenarios, createScenario, getScenario, periodHours, realFilter, reassignWork, scenarioCopyOf, scenarioFilter } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import { checkPage, useRowOrder } from "./replacement-takes.mjs";
import { clickSelector, decideViaBanner, expectBanner, flag, holdWithPoster, trackNetwork } from "./scenario-takes.mjs";
import { checkStage, measure, readToasts, scrollColumns, setRowSlider, trackHttpErrors, watchToasts } from "./security-takes.mjs";
import { staleAcceptedLine, uiTexts } from "../lib/ui-texts.mjs";

export const VIDEO_SCENARIO_VARIANTS = "scenario-variants";
export const SCENARIO_VARIANTS_CUES = Object.freeze({
  plan: "plan",
  copy: "copy",
  move: "move",
  rest: "rest",
  variantB: "variantB",
  hours: "hours",
  original: "original",
  yes: "yes",
  stale: "stale",
  discard: "discard",
});
export const SCENARIO_VARIANTS_FINAL_HOLD_MS = 3500;

const SEL_SELECTOR_BTN = "#scenario-selector-btn";
const SEL_SELECTOR_CREATE = "#scenario-selector-create-item";
const selectorItem = (id) => `[data-scenario-id="${id}"]`;
const SEL_NAME_INPUT = "#scenario-name-input";
const SEL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_BANNER = "#scenario-banner";
const SEL_BANNER_ACCEPT = "#scenario-banner-accept-btn";
const SEL_BANNER_EXIT = "#scenario-banner-exit-btn";
const SEL_CONFIRM = "#modal-delete-confirm";
const SEL_CANCEL = "#modal-delete-cancel";
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
const HTTP_CONFLICT = 409;
const STALE_CODE = "SCENARIO_STALE";
const SCENARIO_CREATE_PATH = /\/AnalyseScenarios\/?$/i;
const SCENARIO_ACCEPT_PATH = /\/AnalyseScenarios\/[0-9a-f-]{36}\/Accept/i;
const REASSIGN_ROUTE = /\/Works\/([0-9a-f-]{36})\/ReassignClient/i;
const WATCHED_ERROR_PATH = /\/AnalyseScenarios|\/Works\/|\/Accept/i;
const SCENARIO_STATUS_REJECTED = 2;
const SAVE_TIMEOUT_MS = 30000;
const RELOAD_TIMEOUT_MS = 20000;
const DECIDE_TIMEOUT_MS = 120000;
const ERROR_ROW_TIMEOUT_MS = 20000;
const ERROR_LIST_POLL_MS = 250;
const TYPE_DELAY_MS = 45;
const CUT = Number.POSITIVE_INFINITY;
const MOVE = { short: 350, normal: 650, drag: 1100 };

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

function waitReload(take, token) {
  const { page, options } = take;
  const loaded = page.waitForResponse((response) => response.request().method() === HTTP_POST && response.url().includes(SCHEDULE_ROUTE_PART)
    && response.request().postDataJSON()?.selectedGroup === options.groupId && (token === undefined ? Boolean(tokenOfResponse(response)) : tokenOfResponse(response) === token), { timeout: RELOAD_TIMEOUT_MS });
  loaded.catch(() => {});
  return loaded;
}

async function settled(take, reload, label) {
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
  const gutters = await page.locator(SEL_SPLIT_GUTTER).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, direction: element.parentElement?.getAttribute("direction") };
  }));
  const gutter = gutters.find((candidate) => candidate.direction === SPLIT_DIRECTION_VERTICAL);
  if (!gutter) throw new Error("the splitter between the grid and the shift area was not found");
  await mouse.drag({ x: gutter.x, y: gutter.y }, { x: gutter.x, y: script.splitY }, MOVE.normal);
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
  const response = await created;
  if (!response.ok()) throw new Error(`creating the scenario returned HTTP ${response.status()}`);
  const scenario = await response.json();
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await expectBanner(take, name);
  await settled(take, reload, "create");
  return scenario;
}

/** @param cutWait - the dark grid with spinner of the reload is left out of the video; off inside a cut region */
async function selectVariant(take, scenario, { cutWait = true } = {}) {
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

/** Variant B is a sibling of A on the same plan: same nights, other employee. It spans December like A: since v1.0.55 the dialog of the app sends the planning period, before it sent the visible weeks around it (28.11.-03.01.). It runs inside a cut region. */
async function prepareVariantB(take, ctx) {
  const { api, options, script } = take;
  const scenario = await createScenario(api, { name: script.variantB.scenarioName, groupId: options.groupId, fromDate: D.PERIOD.from, untilDate: D.PERIOD.until });
  ctx.variantB = scenario;
  const data = await api.schedule(scenarioFilter(ctx.decemberFilter, scenario.token));
  for (const work of ctx.nights) await reassignWork(api, scenarioCopyOf(data, work, D.PERIOD).id, ctx.b.id);
  return scenario;
}

async function reframeOnVariantA(take, ctx) {
  const { page, options, script } = take;
  const { data } = await openSchedule(page, options);
  ctx.rowOf = new Map(data.clients.map((client, index) => [client.id, index]));
  await frameOverview(take);
  await watchToasts(page);
  await infoRowsOff(take);
  await page.waitForFunction((selector) => document.querySelectorAll(selector).length >= 2, "[data-scenario-id]", { state: "attached", timeout: S.READY_TIMEOUT_MS }).catch(() => {});
  await selectVariant(take, ctx.variantA, { cutWait: false });
  await setRowSlider(take, true);
  await scrollColumns(take, script.columnsScrolled, 1);
  await page.locator(SEL_ZOOM_POINTER).first().evaluate((element) => element.blur());
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

/** The second accept: the app must answer with its stale warning; only the cancel button of that dialog is ever clicked. */
async function attemptVariantA(take, ctx) {
  const { page, mouse, report, script } = take;
  const ui = uiTexts(take.culture);
  const answered = page.waitForResponse((response) => response.request().method() === HTTP_POST && SCENARIO_ACCEPT_PATH.test(new URL(response.url()).pathname), { timeout: DECIDE_TIMEOUT_MS });
  answered.catch(() => {});
  await clickSelector(take, SEL_BANNER_ACCEPT, MOVE.normal);
  await waitModalAtRest(page);
  await pauseOf(take, "confirm");
  await mouse.clickLocator(page.locator(SEL_CONFIRM), MOVE.normal);
  const response = await answered;
  const body = await response.json().catch(() => null);
  report.staleAttempt = { status: response.status(), code: body?.code ?? body?.errorCode ?? null, names: body?.acceptedScenarioNames ?? null, changed: body?.changedEntryCount ?? null };
  if (response.ok()) throw new Error("the accept of variant A was answered with 200 - it replaced variant B");
  if (response.status() !== HTTP_CONFLICT) throw new Error(`the accept of variant A answered HTTP ${response.status()} instead of the stale conflict`);
  await page.waitForFunction(([selector, name]) => {
    const open = document.querySelectorAll(selector);
    return open.length === 1 && open[0].textContent.includes(name);
  }, [SEL_MODAL, script.variantB.scenarioName], { timeout: S.READY_TIMEOUT_MS });
  await page.locator(SEL_CANCEL).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await waitModalAtRest(page);
  const dialog = (await page.locator(SEL_MODAL).innerText()).replace(/\s+/g, " ").trim();
  report.staleDialog = dialog;
  if (!dialog.includes(staleAcceptedLine(take.culture, script.variantB.scenarioName))) flag(report, `the stale dialog does not name variant B: ${dialog}`);
  if (JSON.stringify(body ?? {}).indexOf(STALE_CODE) < 0 && !dialog.includes(ui.staleTitle)) flag(report, "the conflict is no stale conflict");
  await pauseOf(take, "stale");
  await mouse.clickLocator(page.locator(SEL_CANCEL), MOVE.normal);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await expectBanner(take, ctx.variantA.name);
  if ((await getScenario(take.api, ctx.variantA.id)).status === SCENARIO_STATUS_ACCEPTED) throw new Error("variant A is accepted after the cancel");
}

/** The published proof of the take: only states read back from the API after the last click. */
async function verifyFinished(take, ctx) {
  const { api, options, report } = take;
  const a = await getScenario(api, ctx.variantA.id);
  const b = await getScenario(api, ctx.variantB.id);
  report.finalStatus = { variantA: a.status, variantB: b.status, active: (await activeScenarios(api, options.groupId)).length };
  if (a.status !== SCENARIO_STATUS_REJECTED) flag(report, `variant A ends in status ${a.status}`);
  if (b.status !== SCENARIO_STATUS_ACCEPTED) flag(report, `variant B ends in status ${b.status}`);
  if (report.finalStatus.active !== 0) flag(report, `${report.finalStatus.active} scenarios are still active`);
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
  if (report.staleAttempt?.status !== HTTP_CONFLICT) flag(report, "no stale conflict was recorded");
  const watched = (report.httpErrors ?? []).filter((line) => WATCHED_ERROR_PATH.test(line) && !line.startsWith(`${HTTP_CONFLICT} `));
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
    report.restRowInA = await waitRestRow(page, ui.restRow);
    report.errorRowsInA = await visibleErrorRows(page);
    if (!report.restRowInA) flag(report, "the rest warning did not appear in the error list of variant A");
    await pauseOf(take, "rest");
    await checkPage(take, "rest warning");

    await recorder.beginFast(CUT);
    await prepareVariantB(take, ctx);
    await reframeOnVariantA(take, ctx);
    await waitRestRow(page, ui.restRow);
    await readHours(take, ctx, "variantB", ctx.variantB.token);
    await captions.show(cues.variantB);
    await recorder.endFast();
    await pauseOf(take, "variantLead");
    await selectVariant(take, ctx.variantB);
    report.listOfPlanInB = await waitListOfPlan(page, report.errorRowsAtStart);
    report.errorRowsInB = await visibleErrorRows(page);
    if (!report.listOfPlanInB) flag(report, `variant B adds rows to the error list of the plan: ${report.errorRowsInB.join(" | ")}`);
    checkContractMaximum(take, ctx);
    await pauseOf(take, "variantB");
    await captions.show(cues.hours);
    const boxes = await rowBoxes(page);
    await mouse.moveTo({ x: (await gridBox(page)).x - CELL_WIDTH_PX, y: boxes[2].top + SUB_ROW_HEIGHT_PX / HALF }, MOVE.normal);
    await pauseOf(take, "hours");

    await captions.show(cues.original);
    const reloadOriginal = waitReload(take, null);
    await clickSelector(take, SEL_BANNER_EXIT, MOVE.normal);
    await recorder.beginFast(CUT);
    await page.locator(SEL_BANNER).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
    await settled(take, reloadOriginal, "exit");
    await recorder.endFast();
    report.listOfPlanInOriginal = await waitListOfPlan(page, report.errorRowsAtStart);
    report.errorRowsInOriginal = await visibleErrorRows(page);
    if (!report.listOfPlanInOriginal) flag(report, `the error list of the original changed: ${report.errorRowsInOriginal.join(" | ")}`);
    await pauseOf(take, "original");
    await checkPage(take, "original");

    await captions.show(cues.yes);
    await selectVariant(take, ctx.variantB);
    await pauseOf(take, "acceptLead");
    await assertVariantB(take, ctx);
    await decideViaBanner(take, "accept", { cutReload: true });
    await readHours(take, ctx, "accepted", null);
    await pauseOf(take, "yes");

    await captions.show(cues.stale);
    await pauseOf(take, "staleLead");
    await selectVariant(take, ctx.variantA);
    await attemptVariantA(take, ctx);

    await captions.show(cues.discard);
    await decideViaBanner(take, "reject", { cutReload: true });
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
