// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip R1 "05:40" (series Replacement, security demo Biel, lib/security-demo.mjs). It needs a throw-away copy of the stage database
 * klacks_marketing_security_biel_r1 (the accept changes the plan, phone numbers are added, so the master is never recorded on) and --group-id of "Biel Objektschutz".
 * replacement-r1 (1280x720): right-click on Max Wenger's OBT of 15.12., "Ausfall decken...", the review shows the proposed stand-in with the tier the app draws. The planner records
 * "Abgelehnt", opens the alternatives and records "Zugesagt" for Tanja Moser. Those answers only record contacts; the app says so in the dialog and the scenario still names the first
 * stand-in. So the take does what a planner has to do: "Fertig", delete the ABL of the proposal, set Tanja through "Ablösung...", accept through the banner. The replacement dialog in edit mode
 * is not usable here (GET Works/Changes of a scenario change answers 404), therefore delete and new entry. The row slider stands at 100 so the app draws the text at full size; there are no post zooms.
 * On the copy the rows of the three people are moved to the top with the row order of the app (per-user sort preference), so they stand together in the frame at 100 and no row scrolling is needed.
 * The chat is not used: the skill cover_absence has no review step, no outcome buttons and no alternatives. Nobody is contacted by Klacks in this take; the escalation roster stays off.
 * Publishable criterion (report.publishable, every part is read from the API after the accept, not from the screen): the cover request has notifyEscalationRoster=false and no override, for Max on 15.12.;
 * the proposal holds one covered and no open slot; the stage gave the first stand-in on tier 5 (on call, own group); the scenario belongs to the group and covers only 15.12.; exactly one accept,
 * scenario status Accepted; the real plan shows the KU break on Max on 15.12., a replacement WorkChange on his OBT naming Tanja, its mirror in Tanja's row and no WorkChange on the first stand-in;
 * every other work of December is unchanged; the request book holds Declined (not applied) for the first stand-in and Accepted (applied) for Tanja; no error toast; no HTTP error on a
 * recovery or work change call; no text "Winterthur" or "Uster" on the page at the checkpoints; every name of the alternatives is a team member. An accept refused with HTTP 409 aborts the take.
 * Captions come from simple-videos.<culture>.json, the beats from the script entry in capture-app-videos.scripts.json, so timing changes need no code change.
 * @param take - page, api, options, recorder, mouse, report, captions, script, viewport, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import { CANVAS_SETTLE_MS, CELL_WIDTH_PX, HALF, HTTP_DELETE, HTTP_POST, SUB_ROW_HEIGHT_PX, dateKey, gridBox, openSchedule, rowBoxes, worksIn } from "../lib/schedule-grid.mjs";
import { SCENARIO_STATUS_ACCEPTED, getScenario, realFilter, scenarioFilter } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import { decideViaBanner, expectBanner, flag, holdWithPoster, trackNetwork } from "./scenario-takes.mjs";
import { checkStage, fitAllRows, measure, readToasts, scrollColumns, setRowSlider, trackHttpErrors, watchToasts } from "./security-takes.mjs";

export const VIDEO_REPLACEMENT_R1 = "replacement-r1";
export const REPLACEMENT_VIDEOS = [VIDEO_REPLACEMENT_R1];
export const REPLACEMENT_R1_CUES = Object.freeze({
  report: "report",
  form: "form",
  why: "why",
  call: "call",
  refused: "refused",
  alternatives: "alternatives",
  yes: "yes",
  scenario: "scenario",
  stillLuc: "stillLuc",
  swap: "swap",
  cells: "cells",
  accept: "accept",
  absent: "absent",
  standIn: "standIn",
});
export const REPLACEMENT_R1_FINAL_HOLD_MS = 3500;
export const REPLACEMENT_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
export const REPLACEMENT_CSS = ".recovery-phone { filter: blur(6px) !important; }";

const ABSENT_DAY = "2026-12-15";
const ABSENT_FIRST_NAME = "Max";
const STAND_IN_FIRST_NAME = "Tanja";
const STAND_IN_FULL_NAME = "Tanja Moser";
const STAND_IN_RESULT = "Moser Tanja";
const STAND_IN_SEARCH = "Moser";
const FIRST_NAME_OF_PROPOSAL = "Luc";
const ABSENT_SHIFT = "OBT";
const ON_CALL_TIER = 5;
const SHIFT_HOURS = "8";
const SHIFT_MINUTES = "0";
const WORK_CHANGE_ENTRY_TYPE = 1;
const BREAK_ENTRY_TYPE = 3;
const REPLACEMENT_TYPES = Object.freeze([2, 3, 9]);
const OUTCOME_ACCEPTED = "Accepted";
const OUTCOME_DECLINED = "Declined";
const COLUMNS_SCROLLED = 11;
const SUB_ROW_FIRST = 0;
const SUB_ROW_SECOND = 1;
const SUB_ROW_THIRD = 2;
const ROWS = Object.freeze({ absent: 0, firstStandIn: 1, standIn: 2 });
const SORT_ICON_OFFSET = Object.freeze({ x: -19, y: 16 });
const INDIVIDUAL_ACTIVE_CLASS = "individual-active";
const HEAD_POINTER_RATIO = 0.75;
const MENU_COVER_ABSENCE = "#coverAbsence";
const MENU_DELETE = "#del";
const MENU_REPLACEMENT = "#replacement";
const SEL_OPEN_MENU = "app-context-menu .menu-container[style*='display: block']";
const SEL_RECOVERY_ABSENCE = `${SEL_MODAL} select#recovery-absence`;
const SEL_RECOVERY_NOTIFY = `${SEL_MODAL} input#recovery-notify-roster`;
const SEL_RECOVERY_OVERRIDE = `${SEL_MODAL} input#recovery-override`;
const SEL_RECOVERY_CLIENT = `${SEL_MODAL} #recovery-client`;
const SEL_RECOVERY_SUBMIT = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_RECOVERY_REVIEW = `${SEL_MODAL} .recovery-scenario`;
const SEL_RECOVERY_COVERED = `${SEL_MODAL} .recovery-covered`;
const SEL_RECOVERY_TIER = `${SEL_MODAL} .recovery-tier`;
const SEL_RECOVERY_DECLINE = `${SEL_MODAL} .recovery-covered-actions button[data-outcome='${OUTCOME_DECLINED}']`;
const SEL_RECOVERY_ALTERNATIVES = `${SEL_MODAL} .recovery-alternatives-toggle`;
const SEL_RECOVERY_ALTERNATIVE = `${SEL_MODAL} .recovery-alternative`;
const SEL_RECOVERY_HEAD = ".recovery-covered-head";
const SEL_BANNER = "#scenario-banner";
const SEL_SORT_INDIVIDUAL = "#client-filter-individual-button";
const SEL_REPLACEMENT_SEARCH = `${SEL_MODAL} input#replaceClient`;
const SEL_REPLACEMENT_RESULT = `${SEL_MODAL} .search-result-item`;
const SEL_REPLACEMENT_HOURS = `${SEL_MODAL} #replDurationHours`;
const SEL_REPLACEMENT_MINUTES = `${SEL_MODAL} #replDurationMinutes`;
const SEL_REPLACEMENT_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const COVER_ABSENCE_PATH = /\/Recovery\/CoverAbsence$/i;
const CANDIDATES_PATH = /\/Recovery\/Candidates$/i;
const RECORD_REQUEST_PATH = /\/Recovery\/Requests$/i;
const WORK_CHANGES_PATH = /\/Works\/Changes(\/[0-9a-f-]{36})?$/i;
const WATCHED_ERROR_PATH = /\/Recovery\/|\/Works\/Changes|\/AnalyseScenarios\//i;
const REQUESTS_API = "/api/backend/Recovery/Requests";
const CLIENTS_API = "/api/backend/Clients";
const SORT_ORDER_API = "/api/backend/clientsortpreferences";
const HTTP_PUT = "PUT";
const PHONE_TYPE_PRIVATE_CELL = 1;
const PHONES = Object.freeze({ Luc: "+41 32 555 01 21", Tanja: "+41 32 555 01 42", Marc: "+41 32 555 01 63" });
const FORBIDDEN_TEXTS = Object.freeze([D.FOREIGN_NAME_FRAGMENT, D.NEUTRAL_TOWN]);
const SAVE_TIMEOUT_MS = 30000;
const COVER_TIMEOUT_MS = 60000;
const REVIEW_REAL_TIME_MS = 4000;
const FAST_FACTOR_REVIEW = 4;
const CUT = Number.POSITIVE_INFINITY;
const TYPE_DELAY_MS = 60;
const MOVE = { short: 400, normal: 650 };

const log = (...args) => console.log("  ", ...args);
const fullName = (client) => `${client.firstName} ${client.name}`;
const keyOfWork = (work) => [work.clientId, dateKey(work.entryDate), work.entryId, work.startTime, work.endTime].join("|");
const worksOutsideDay = (data) => worksIn(data, D.PERIOD.from, D.PERIOD.until).filter((work) => dateKey(work.entryDate) !== ABSENT_DAY).map(keyOfWork).sort();
const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const onDay = (data, clientId) => data.entries.filter((entry) => entry.clientId === clientId && dateKey(entry.entryDate) === ABSENT_DAY);
const replacementsOf = (entries) => entries.filter((entry) => entry.entryType === WORK_CHANGE_ENTRY_TYPE && REPLACEMENT_TYPES.includes(entry.workChangeType));
const pauseOf = (take, beat) => take.page.waitForTimeout(take.script.beats[beat]);

function rowOf(clients, firstName) {
  const index = clients.findIndex((client) => client.firstName === firstName);
  if (index < 0) throw new Error(`${firstName} is not in the schedule of the group`);
  return index;
}

/** The stage carries no phone numbers; on the throw-away copy the three people the planner calls get one, the review blurs them. */
async function addPhones(take, clients) {
  for (const [firstName, value] of Object.entries(PHONES)) {
    const id = clients[rowOf(clients, firstName)].id;
    const client = await take.api.json(`${CLIENTS_API}/${id}`);
    const communications = [...(client.communications ?? []), { type: PHONE_TYPE_PRIVATE_CELL, value, prefix: "", description: "" }];
    await take.api.json(CLIENTS_API, { method: HTTP_PUT, data: { ...client, communications } });
  }
}

/** The row order a planner would drag: the three people of the story on top, the others behind them. */
async function orderRows(take, clients, groupId) {
  const story = [ABSENT_FIRST_NAME, FIRST_NAME_OF_PROPOSAL, STAND_IN_FIRST_NAME].map((firstName) => clients[rowOf(clients, firstName)]);
  const ordered = [...story, ...clients.filter((client) => !story.includes(client))];
  await take.api.json(`${SORT_ORDER_API}/${groupId}`, { method: HTTP_PUT, data: ordered.map((client, sortOrder) => ({ clientId: client.id, sortOrder })) });
}

/** Everything the take may assume about the plan of the Biel stage; a mismatch refuses the take before anything is recorded. */
async function checkPlan(take, filter) {
  const { api, report } = take;
  if (filter.periodStartDate !== D.PERIOD.from || filter.periodEndDate !== D.PERIOD.until) throw new Error(`the schedule shows ${filter.periodStartDate}..${filter.periodEndDate} instead of December`);
  const decemberFilter = realFilter(filter);
  const data = await api.schedule(decemberFilter);
  const absent = data.clients[rowOf(data.clients, ABSENT_FIRST_NAME)];
  const entries = onDay(data, absent.id);
  if (entries.length !== 1 || entries[0].abbreviation !== ABSENT_SHIFT) throw new Error(`${absent.firstName} holds ${entries.map((entry) => entry.abbreviation).join(",") || "nothing"} on ${ABSENT_DAY} instead of ${ABSENT_SHIFT} alone`);
  report.stage = { employees: data.clients.map(fullName), absentWork: `${entries[0].abbreviation} ${entries[0].startTime}-${entries[0].endTime}`, worksInDecember: worksIn(data, D.PERIOD.from, D.PERIOD.until).length };
  return { decemberFilter, data };
}

function cellOf(grid, boxes, row, subRow) {
  const visibleColumn = Number(ABSENT_DAY.slice(-2)) - 1 - COLUMNS_SCROLLED;
  return { x: grid.x + (visibleColumn + 1 / HALF) * CELL_WIDTH_PX, y: boxes[row].top + (subRow + 1 / HALF) * SUB_ROW_HEIGHT_PX };
}

const cell = async (take, row, subRow) => cellOf(await gridBox(take.page), await rowBoxes(take.page), row, subRow);

async function openMenuItem(take, target, selector) {
  const { page, mouse } = take;
  await mouse.rightClick(target, MOVE.normal);
  const item = page.locator(`${SEL_OPEN_MENU} ${selector}`).first();
  await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await pauseOf(take, "menu");
  await mouse.clickLocator(item, MOVE.normal);
}

async function checkPage(take, label) {
  const text = await take.page.evaluate(() => document.body.innerText);
  const found = FORBIDDEN_TEXTS.filter((word) => text.includes(word));
  (take.report.textChecks ??= []).push({ label, found });
  if (found.length > 0) flag(take.report, `"${found.join(", ")}" is on the page at "${label}"`);
}

async function propose(take, ctx) {
  const { page, recorder, mouse, report, script } = take;
  const absence = page.locator(SEL_RECOVERY_ABSENCE);
  await absence.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  const named = (await page.locator(SEL_RECOVERY_CLIENT).innerText()).trim();
  if (!named.startsWith(ABSENT_FIRST_NAME)) throw new Error(`the recovery dialog names ${named}`);
  const box = await absence.boundingBox();
  await mouse.moveTo({ x: box.x + box.width / HALF, y: box.y + box.height / HALF }, MOVE.normal);
  [ctx.absenceId] = await absence.selectOption({ label: script.absenceName });
  await pauseOf(take, "form");
  if (await page.locator(SEL_RECOVERY_NOTIFY).isChecked()) throw new Error("the escalation roster checkbox is checked - refusing to submit");
  if ((await page.locator(SEL_RECOVERY_OVERRIDE).count()) > 0 && await page.locator(SEL_RECOVERY_OVERRIDE).isChecked()) throw new Error("the override checkbox is checked - refusing to submit");
  const coverResponse = page.waitForResponse((response) => response.request().method() === HTTP_POST && COVER_ABSENCE_PATH.test(new URL(response.url()).pathname), { timeout: COVER_TIMEOUT_MS });
  coverResponse.catch(() => {});
  await mouse.clickLocator(page.locator(SEL_RECOVERY_SUBMIT), MOVE.normal);
  const reviewShown = page.locator(SEL_RECOVERY_REVIEW).waitFor({ state: "visible", timeout: COVER_TIMEOUT_MS });
  const fast = await Promise.race([reviewShown.then(() => false), page.waitForTimeout(REVIEW_REAL_TIME_MS).then(() => true)]);
  if (fast) await recorder.beginFast(FAST_FACTOR_REVIEW);
  const response = await coverResponse;
  await reviewShown;
  await recorder.endFast();
  if (!response.ok()) throw new Error(`CoverAbsence returned HTTP ${response.status()}`);
  const body = response.request().postDataJSON();
  report.request = { clientId: body?.clientId, date: body?.date, notifyEscalationRoster: body?.notifyEscalationRoster, overrideBlock: body?.overrideBlock ?? null };
  if (dateKey(body?.date) !== ABSENT_DAY) throw new Error(`the cover request names ${body?.date} instead of ${ABSENT_DAY} - the right-click hit the wrong column`);
  if (body?.clientId !== ctx.absent.id) throw new Error("the cover request names another employee - the right-click hit the wrong row");
  if (body?.notifyEscalationRoster !== false || body?.overrideBlock) flag(report, `the cover request carried roster=${body?.notifyEscalationRoster} override=${body?.overrideBlock}`);
  const outcome = await response.json();
  ctx.outcome = outcome;
  report.outcome = {
    scenarioName: outcome.scenarioName,
    covered: outcome.covered.map((slot) => ({ name: slot.replacementName, tier: slot.tier, from: slot.startTime, until: slot.endTime })),
    uncovered: outcome.uncovered.map((slot) => slot.reason),
    warnings: outcome.complianceWarnings.map((warning) => warning.comment),
  };
  log(`proposal: ${JSON.stringify(report.outcome)}`);
  if (outcome.covered.length !== 1 || outcome.uncovered.length !== 0) throw new Error(`expected one covered and no open slot, got ${outcome.covered.length} / ${outcome.uncovered.length}`);
  const [slot] = outcome.covered;
  if (!slot.replacementName.startsWith(FIRST_NAME_OF_PROPOSAL) || slot.tier !== ON_CALL_TIER) throw new Error(`the proposal is ${slot.replacementName} on tier ${slot.tier}, the storyboard expects ${FIRST_NAME_OF_PROPOSAL} on tier ${ON_CALL_TIER}`);
  report.tierShown = (await page.locator(SEL_RECOVERY_TIER).first().innerText()).trim();
}

async function recordAnswers(take) {
  const { page, mouse, captions, report } = take;
  const cues = REPLACEMENT_R1_CUES;
  await page.locator(SEL_RECOVERY_COVERED).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await captions.show(cues.why);
  const tier = await page.locator(SEL_RECOVERY_TIER).first().boundingBox();
  await mouse.moveTo({ x: tier.x + tier.width / HALF, y: tier.y + tier.height / HALF }, MOVE.normal);
  await pauseOf(take, "why");
  await captions.show(cues.call);
  await pauseOf(take, "call");
  await captions.show(cues.refused);
  await mouse.clickLocator(page.locator(SEL_RECOVERY_DECLINE).first(), MOVE.normal);
  await pauseOf(take, "refused");
  const candidates = page.waitForResponse((response) => CANDIDATES_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  candidates.catch(() => {});
  await captions.show(cues.alternatives);
  await mouse.clickLocator(page.locator(SEL_RECOVERY_ALTERNATIVES).first(), MOVE.normal);
  report.candidates = ((await (await candidates).json()).eligible ?? []).map((candidate) => ({ name: candidate.name, isOnCall: candidate.isOnCall, rhythmDelta: candidate.rhythmDelta }));
  const alternative = page.locator(SEL_RECOVERY_ALTERNATIVE).filter({ hasText: STAND_IN_FULL_NAME }).first();
  await alternative.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  const strangers = report.candidates.map((candidate) => candidate.name).filter((name) => !report.stage.employees.includes(name));
  if (strangers.length > 0) flag(report, `alternatives outside the team: ${strangers.join(", ")}`);
  await alternative.scrollIntoViewIfNeeded();
  const head = await alternative.locator(SEL_RECOVERY_HEAD).boundingBox();
  await mouse.moveTo({ x: head.x + head.width * HEAD_POINTER_RATIO, y: head.y + head.height / HALF }, MOVE.normal);
  await pauseOf(take, "alternatives");
  await checkPage(take, "alternatives");
  await captions.show(cues.yes);
  const saved = page.waitForResponse((response) => response.request().method() === HTTP_POST && RECORD_REQUEST_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  saved.catch(() => {});
  await mouse.clickLocator(alternative.locator(`button[data-outcome='${OUTCOME_ACCEPTED}']`), MOVE.normal);
  const response = await saved;
  if (!response.ok()) throw new Error(`recording the answer of ${STAND_IN_FULL_NAME} returned HTTP ${response.status()}`);
  await pauseOf(take, "yes");
}

/** The scenario still names the first stand-in: the ABL in the absent row is deleted and the OBT above it gets the person who said yes. */
async function swapStandIn(take, ctx) {
  const { page, mouse, captions, api, report } = take;
  const cues = REPLACEMENT_R1_CUES;
  await captions.show(cues.stillLuc);
  const deleted = page.waitForResponse((response) => response.request().method() === HTTP_DELETE && WORK_CHANGES_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  deleted.catch(() => {});
  await openMenuItem(take, await cell(take, ROWS.absent, SUB_ROW_THIRD), MENU_DELETE);
  if (!(await deleted).ok()) throw new Error("deleting the proposed replacement failed");
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await captions.show(cues.swap);
  await openMenuItem(take, await cell(take, ROWS.absent, SUB_ROW_SECOND), MENU_REPLACEMENT);
  await page.locator(SEL_REPLACEMENT_SEARCH).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await waitModalAtRest(page);
  await mouse.clickLocator(page.locator(SEL_REPLACEMENT_SEARCH), MOVE.normal);
  await page.locator(SEL_REPLACEMENT_SEARCH).pressSequentially(STAND_IN_SEARCH, { delay: TYPE_DELAY_MS });
  const result = page.locator(SEL_REPLACEMENT_RESULT).filter({ hasText: STAND_IN_RESULT }).first();
  await result.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(result, MOVE.short);
  await page.locator(SEL_REPLACEMENT_HOURS).fill(SHIFT_HOURS);
  await page.locator(SEL_REPLACEMENT_MINUTES).fill(SHIFT_MINUTES);
  await pauseOf(take, "swap");
  const saved = page.waitForResponse((response) => response.request().method() === HTTP_POST && WORK_CHANGES_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  saved.catch(() => {});
  await mouse.clickLocator(page.locator(SEL_REPLACEMENT_SAVE), MOVE.normal);
  if (!(await saved).ok()) throw new Error("saving the replacement failed");
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const scenarioData = await api.schedule(scenarioFilter(ctx.decemberFilter, ctx.scenario.token));
  report.scenarioReplacement = replacementsOf(onDay(scenarioData, ctx.absent.id)).map((entry) => entry.replaceClientId);
  if (report.scenarioReplacement.length !== 1 || report.scenarioReplacement[0] !== ctx.standIn.id) flag(report, `the scenario replacement is ${JSON.stringify(report.scenarioReplacement)} instead of ${STAND_IN_FULL_NAME}`);
}

/** The published proof of the take: only states read back from the API after the accept. */
async function verifyAccepted(take, ctx) {
  const { api, report } = take;
  report.acceptRequests = ctx.acceptRequests;
  if (ctx.acceptRequests !== 1) flag(report, `${ctx.acceptRequests} accept requests were sent instead of one`);
  report.acceptedStatus = (await getScenario(api, ctx.scenario.id)).status;
  if (report.acceptedStatus !== SCENARIO_STATUS_ACCEPTED) flag(report, `the scenario status is ${report.acceptedStatus} after the accept`);
  const real = await api.schedule(ctx.decemberFilter);
  const absentEntries = onDay(real, ctx.absent.id);
  const ku = absentEntries.filter((entry) => entry.entryType === BREAK_ENTRY_TYPE && entry.entryId === ctx.absenceId);
  const change = replacementsOf(absentEntries);
  const mirror = replacementsOf(onDay(real, ctx.standIn.id));
  const declinedChanges = replacementsOf(onDay(real, ctx.firstStandIn.id));
  report.realPlan = { ku: ku.length, replacement: change.map((entry) => entry.replaceClientId), mirror: mirror.map((entry) => entry.replaceClientId), declinedChanges: declinedChanges.length };
  if (ku.length !== 1) flag(report, `${ku.length} KU breaks on ${ABSENT_DAY} instead of one`);
  if (change.length !== 1 || change[0].replaceClientId !== ctx.standIn.id) flag(report, `the replacement on ${ABSENT_DAY} is not ${STAND_IN_FULL_NAME}`);
  if (mirror.length !== 1) flag(report, `${STAND_IN_FULL_NAME} shows ${mirror.length} replacements on ${ABSENT_DAY}`);
  if (declinedChanges.length !== 0) flag(report, "the stand-in who declined still holds the replacement");
  report.otherWorksUnchanged = sameList(ctx.otherWorksBefore, worksOutsideDay(real));
  if (!report.otherWorksUnchanged) flag(report, "works outside the absent day changed");
  const requests = await api.json(`${REQUESTS_API}?analyseToken=${ctx.scenario.token}&absentClientId=${ctx.absent.id}`);
  const of = (id) => requests.find((request) => request.candidateClientId === id);
  report.requestBook = requests.map((request) => ({ candidate: request.candidateClientId, source: request.source, outcome: request.outcome, applied: Boolean(request.appliedAtUtc) }));
  if (of(ctx.firstStandIn.id)?.outcome !== OUTCOME_DECLINED || of(ctx.firstStandIn.id)?.appliedAtUtc) flag(report, "the request book does not hold the declined, unapplied first stand-in");
  if (of(ctx.standIn.id)?.outcome !== OUTCOME_ACCEPTED || !of(ctx.standIn.id)?.appliedAtUtc) flag(report, `the request book does not hold ${STAND_IN_FULL_NAME} as accepted and applied`);
  const watched = (report.httpErrors ?? []).filter((line) => WATCHED_ERROR_PATH.test(line));
  if (watched.length > 0) flag(report, `HTTP errors: ${watched.join("; ")}`);
}

/** The stored row order only applies with the sort mode "individual" of the row header; a page load resets it. Runs inside a cut region. */
async function useRowOrder(take) {
  const { page } = take;
  const grid = await gridBox(page);
  const icon = { x: grid.x + SORT_ICON_OFFSET.x, y: grid.y + SORT_ICON_OFFSET.y };
  await page.mouse.move(icon.x, icon.y);
  await page.mouse.click(icon.x, icon.y);
  const button = page.locator(SEL_SORT_INDIVIDUAL);
  await button.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (!(await button.getAttribute("class")).includes(INDIVIDUAL_ACTIVE_CLASS)) await button.click();
  await page.mouse.move(grid.x + grid.width / HALF, grid.y + grid.height / HALF);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

/** Layout of every picture: the story rows on top, the shift area collapsed, slider at 100, the columns moved so the absent day stands in the frame. */
async function frameDay(take) {
  await useRowOrder(take);
  await fitAllRows(take);
  await setRowSlider(take, true);
  await scrollColumns(take, COLUMNS_SCROLLED, 1);
}

async function openProposalAsScenario(take, ctx) {
  const { page, api, mouse, report, options } = take;
  const done = page.locator(SEL_RECOVERY_SUBMIT);
  await done.scrollIntoViewIfNeeded();
  await mouse.clickLocator(done, MOVE.normal);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: COVER_TIMEOUT_MS });
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  ctx.scenario = await getScenario(api, ctx.outcome.scenarioId);
  report.scenario = { id: ctx.scenario.id, name: ctx.scenario.name, groupId: ctx.scenario.groupId, from: dateKey(ctx.scenario.fromDate), until: dateKey(ctx.scenario.untilDate) };
  if (ctx.scenario.groupId !== options.groupId) throw new Error(`the scenario belongs to group ${ctx.scenario.groupId} - accepting it would replace data of another group`);
  if (report.scenario.from !== ABSENT_DAY || report.scenario.until !== ABSENT_DAY) throw new Error(`the scenario spans ${report.scenario.from}..${report.scenario.until} instead of ${ABSENT_DAY}`);
  await expectBanner(take, ctx.scenario.name);
  await measure(take, "scenario");
}

export async function takeReplacementR1(take) {
  const { page, options, recorder, mouse, report, captions, script } = take;
  if (!script?.absenceName || !script?.beats) throw new Error(`the ${report.video} script lacks absenceName or beats in capture-app-videos.scripts.json`);
  const cues = REPLACEMENT_R1_CUES;
  await checkStage(take, D.SITES.biel);
  const first = await openSchedule(page, options);
  await addPhones(take, first.data.clients);
  await orderRows(take, first.data.clients, options.groupId);
  const { filter, data } = await openSchedule(page, options);
  const { decemberFilter, data: december } = await checkPlan(take, filter);
  const ctx = {
    created: [], reassigned: [], acceptRequests: 0, scheduleTokens: [], realIds: new Set(), originalClient: new Map(),
    decemberFilter, otherWorksBefore: worksOutsideDay(december),
    absent: data.clients[rowOf(data.clients, ABSENT_FIRST_NAME)], firstStandIn: data.clients[rowOf(data.clients, FIRST_NAME_OF_PROPOSAL)], standIn: data.clients[rowOf(data.clients, STAND_IN_FIRST_NAME)],
  };
  trackNetwork(take, ctx);
  trackHttpErrors(take);
  await frameDay(take);
  await watchToasts(page);
  await measure(take, "start");
  await checkPage(take, "start");

  await recorder.start();
  try {
    await captions.show(cues.report);
    await pauseOf(take, "intro");
    const target = await cell(take, ROWS.absent, SUB_ROW_FIRST);
    await mouse.moveTo(target, MOVE.normal);
    await pauseOf(take, "hover");
    await openMenuItem(take, target, MENU_COVER_ABSENCE);
    await waitModalAtRest(page);
    await captions.show(cues.form);
    await pauseOf(take, "field");
    await propose(take, ctx);
    await recordAnswers(take);

    await captions.show(cues.scenario);
    await openProposalAsScenario(take, ctx);
    await pauseOf(take, "scenario");

    await swapStandIn(take, ctx);
    await captions.show(cues.cells);
    await pauseOf(take, "cells");
    await checkPage(take, "swapped");

    await captions.show(cues.accept);
    await pauseOf(take, "acceptLead");
    await decideViaBanner(take, "accept", { cutReload: true });
    await verifyAccepted(take, ctx);
    await readToasts(take);
    await recorder.beginFast(CUT);
    await openSchedule(page, options);
    await frameDay(take);
    await measure(take, "accepted");
    await recorder.endFast();
    await captions.show(cues.absent);
    await mouse.moveTo(await cell(take, ROWS.absent, SUB_ROW_FIRST), MOVE.normal);
    await pauseOf(take, "absent");
    await captions.show(cues.standIn);
    await mouse.moveTo(await cell(take, ROWS.standIn, SUB_ROW_FIRST), MOVE.normal);
    await checkPage(take, "accepted");
    await holdWithPoster(take, take.finalHoldMs);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale } });
  }
}

export const REPLACEMENT_TAKE_RUNNERS = {
  [VIDEO_REPLACEMENT_R1]: takeReplacementR1,
};
