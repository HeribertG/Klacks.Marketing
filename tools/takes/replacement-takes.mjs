// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip R1 "05:40" (series Replacement, security demo Biel, lib/security-demo.mjs). It needs a throw-away copy of the stage database
 * klacks_marketing_security_biel_r1 (the accept changes the plan, phone numbers are added, so the master is never recorded on) and --group-id of "Biel Objektschutz".
 * replacement-r1 (1280x720): right-click on Max Wenger's RVN of 06.12., "Ausfall decken...", the review shows the proposed stand-in with the tier the app draws. The planner records
 * "Abgelehnt", opens the alternatives and records "Zugesagt" for Tanja Moser. That answer makes her the stand-in of the scenario (the server switches it, nobody is contacted); the dialog follows
 * by itself, so there is no manual step. "Fertig" shows the scenario, the banner accepts it. Since the cover move (Api 45b217e7b, v1.0.57) the dialog means "not started": the accept moves Max's whole RVN
 * to Tanja (work.movedFromClientId = Max), no replacement (ABL) is created. Since Ui d20a5e6f8 the grid draws the moved icon (two arrows, top-left of the cell) on her RVN, in the scenario and in the
 * real plan; the cell tooltip "Übernommen von Max Wenger" (app-tooltip, left visible by the capture CSS of this take) names the origin. The day 06.12. was chosen on purpose: of Max's days it is the one with an on-call proposal, Tanja as
 * "Passt in den Block" and no rest-day hint in the review. A failed switch aborts the take, there is no manual fallback. The row slider stands at 100 so the app draws the text at full size; there are no post zooms.
 * On the copy the rows of the three people are moved to the top with the row order of the app (per-user sort preference), so they stand together in the frame at 100 and no row scrolling is needed.
 * The chat is not used: the skill cover_absence has no review step, no outcome buttons and no alternatives. Nobody is contacted by Klacks in this take; the escalation roster stays off.
 * The waits (button spinner of the proposal, alternatives list, reload after "Zugesagt", the way to "Fertig") are cut regions; the hints below the alternatives still speak about the first stand-in after
 * the switch, the cut to the scenario keeps that hint list out of the picture (the harmony line at the top of the dialog stays, it is the app state). REPLACEMENT_CSS lightens the modal backdrop so the plan stays readable behind the dialog (cosmetic only).
 * Publishable criterion (report.publishable, every part is read from the API, not from the screen): the cover request has notifyEscalationRoster=false and no override, for Max on 06.12.;
 * the proposal holds one covered and no open slot on tier 5 (on call, own group); the recorded "Zugesagt" answers isScenarioReplacement=true and the scenario then holds Tanja on Max's work, nobody on the first stand-in;
 * the scenario belongs to the group and covers only 06.12.; exactly one accept, scenario status Accepted; the real plan shows the KU break and no work on Max on 06.12., the RVN on Tanja with
 * movedFromClientId = Max, no RVN on the first stand-in and no replacement WorkChange on that day; the moved icon is drawn on Tanja's RVN in the scenario and after the accept (checkMovedIcon: screenshot of the
 * top-left cell corner inside a cut region, the top-right corner of the same cell as control, crops in <frames>/replacement-icon-checks); the tooltip of Tanja's RVN names Max; every other work of December is unchanged; the request book holds Declined (not applied) for the first stand-in and Accepted (applied) for Tanja;
 * no error toast; no HTTP error on a recovery or work change call; no text "Winterthur" or "Uster" on the page at the checkpoints; every name of the alternatives is a team member. An accept refused with HTTP 409 aborts the take.
 * Captions come from simple-videos.<culture>.json, the beats from the script entry in capture-app-videos.scripts.json, so timing changes need no code change.
 * Cultures de, en, fr, it: script.absenceName is the name of the absence type in that language (checkAbsenceLabel compares it with the names of the copy before anything is recorded), the captions come from simple-videos.<culture>.json.
 * @param take - page, api, options, recorder, mouse, report, captions, script, viewport, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import * as S from "../lib/klacks-demo-session.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import { CANVAS_SETTLE_MS, CELL_WIDTH_PX, HALF, HTTP_POST, SUB_ROW_HEIGHT_PX, dateKey, gridBox, openSchedule, rowBoxes, worksIn } from "../lib/schedule-grid.mjs";
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
  follows: "follows",
  scenario: "scenario",
  cells: "cells",
  accept: "accept",
  absent: "absent",
  standIn: "standIn",
});
export const REPLACEMENT_TOOLTIP = "app-tooltip > div.tooltip";
export const REPLACEMENT_R1_FINAL_HOLD_MS = 3500;
export const REPLACEMENT_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
export const REPLACEMENT_CSS = ".recovery-phone { filter: blur(6px) !important; } .modal-backdrop.show { opacity: 0.16 !important; }";

const ABSENT_DAY = "2026-12-06";
const ABSENT_FIRST_NAME = "Max";
const STAND_IN_FIRST_NAME = "Tanja";
const STAND_IN_FULL_NAME = "Tanja Moser";
const FIRST_NAME_OF_PROPOSAL = "Selina";
const ABSENT_SHIFT = "RVN";
const ON_CALL_TIER = 5;
const WORK_CHANGE_ENTRY_TYPE = 1;
const BREAK_ENTRY_TYPE = 3;
const REPLACEMENT_TYPES = Object.freeze([2, 3, 9]);
const WORK_ENTRY_TYPE = 0;
const MOVED_NOTE_ORIGIN = "Max Wenger";
const HOVER_WIGGLE = Object.freeze({ px: 6, steps: 4 });
const OUTCOME_ACCEPTED = "Accepted";
const OUTCOME_DECLINED = "Declined";
const COLUMNS_SCROLLED = 0;
const SUB_ROW_FIRST = 0;
const ROWS = Object.freeze({ absent: 0, firstStandIn: 1, standIn: 2 });
const SORT_ICON_OFFSET = Object.freeze({ x: -19, y: 16 });
const INDIVIDUAL_ACTIVE_CLASS = "individual-active";
const HEAD_POINTER_RATIO = 0.75;
const NAME_POINTER_GAP_PX = 30;
const MENU_COVER_ABSENCE = "#coverAbsence";
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
const SEL_RECOVERY_NAME = ".recovery-name";
const SEL_BANNER = "#scenario-banner";
const SEL_SORT_INDIVIDUAL = "#client-filter-individual-button";
const SEL_RECOVERY_SPINNER = `${SEL_MODAL} .spinner-border`;
const COVER_ABSENCE_PATH = /\/Recovery\/CoverAbsence$/i;
const CANDIDATES_PATH = /\/Recovery\/Candidates$/i;
const RECORD_REQUEST_PATH = /\/Recovery\/Requests$/i;
const WATCHED_ERROR_PATH = /\/Recovery\/|\/Works\/Changes|\/AnalyseScenarios\//i;
const REQUESTS_API = "/api/backend/Recovery/Requests";
const ABSENCES_API = "/api/backend/Absences";
const CLIENTS_API = "/api/backend/Clients";
const SORT_ORDER_API = "/api/backend/clientsortpreferences";
const HTTP_PUT = "PUT";
const PHONE_TYPE_PRIVATE_CELL = 1;
const PHONES = Object.freeze({ Selina: "+41 32 555 01 21", Tanja: "+41 32 555 01 42", Marc: "+41 32 555 01 63" });
const FORBIDDEN_TEXTS = Object.freeze([D.FOREIGN_NAME_FRAGMENT, D.NEUTRAL_TOWN]);
const SAVE_TIMEOUT_MS = 30000;
const COVER_TIMEOUT_MS = 60000;
const CURSOR_ID = "capture-cursor";
const ICON_CORNER = Object.freeze({ inset: 2, size: 16 });
const ICON_INK_DELTA = 90;
const ICON_MIN_INK_PX = 12;
const ICON_MAX_EMPTY_INK_PX = 3;
const RGB_CHANNELS = 3;
const ICON_SHOT_DIR = "replacement-icon-checks";
const CUT = Number.POSITIVE_INFINITY;
const MOVE = { normal: 650 };

const log = (...args) => console.log("  ", ...args);
const fullName = (client) => `${client.firstName} ${client.name}`;
const keyOfWork = (work) => [work.clientId, dateKey(work.entryDate), work.entryId, work.startTime, work.endTime].join("|");
const worksOutsideDay = (data) => worksIn(data, D.PERIOD.from, D.PERIOD.until).filter((work) => dateKey(work.entryDate) !== ABSENT_DAY).map(keyOfWork).sort();
const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const onDay = (data, clientId) => data.entries.filter((entry) => entry.clientId === clientId && dateKey(entry.entryDate) === ABSENT_DAY);
const replacementsOf = (entries) => entries.filter((entry) => entry.entryType === WORK_CHANGE_ENTRY_TYPE && REPLACEMENT_TYPES.includes(entry.workChangeType));
const worksOf = (entries) => entries.filter((entry) => entry.entryType === WORK_ENTRY_TYPE);
const shiftsOf = (entries) => worksOf(entries).map((entry) => entry.abbreviation);
const onAbsentDay = (data) => data.entries.filter((entry) => dateKey(entry.entryDate) === ABSENT_DAY);
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

/** The select of the recovery dialog is chosen by its label, which is the name of the absence type in the language of the take: refused before anything is recorded when this copy names it differently. */
export async function checkAbsenceLabel(take, label) {
  const result = await take.api.json(ABSENCES_API);
  const list = Array.isArray(result) ? result : result?.absences ?? [];
  const names = list.map((absence) => absence.name?.[take.culture]).filter(Boolean);
  take.report.absenceNames = names;
  if (names.length > 0 && !names.includes(label)) throw new Error(`the absence type "${label}" is not named like that in ${take.culture} on this copy (names: ${names.join(", ")})`);
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

export async function openMenuItem(take, target, selector) {
  const { page, mouse } = take;
  await mouse.rightClick(target, MOVE.normal);
  const item = page.locator(`${SEL_OPEN_MENU} ${selector}`).first();
  await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await pauseOf(take, "menu");
  await mouse.clickLocator(item, MOVE.normal);
}

export async function checkPage(take, label) {
  const text = await take.page.evaluate(() => document.body.innerText);
  const found = FORBIDDEN_TEXTS.filter((word) => text.includes(word));
  (take.report.textChecks ??= []).push({ label, found });
  if (found.length > 0) flag(take.report, `"${found.join(", ")}" is on the page at "${label}"`);
}

/** Inside a cut region: the dialog holds the awaited element, no spinner is left and the page has stopped moving. */
export async function settleDialog(take, selector) {
  const { page } = take;
  await page.locator(selector).first().waitFor({ state: "visible", timeout: COVER_TIMEOUT_MS });
  await page.locator(SEL_RECOVERY_SPINNER).first().waitFor({ state: "detached", timeout: COVER_TIMEOUT_MS });
  await waitModalAtRest(page);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

async function propose(take, ctx) {
  const { page, recorder, mouse, report, script, captions } = take;
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
  await recorder.beginFast(CUT);
  const response = await coverResponse;
  if (response.ok()) await settleDialog(take, SEL_RECOVERY_REVIEW);
  await captions.show(REPLACEMENT_R1_CUES.why);
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

async function recordAnswers(take, ctx) {
  const { page, mouse, captions, report, recorder } = take;
  const cues = REPLACEMENT_R1_CUES;
  await page.locator(SEL_RECOVERY_COVERED).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
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
  await recorder.beginFast(CUT);
  report.candidates = ((await (await candidates).json()).eligible ?? []).map((candidate) => ({ name: candidate.name, isOnCall: candidate.isOnCall, rhythmDelta: candidate.rhythmDelta }));
  const alternative = page.locator(SEL_RECOVERY_ALTERNATIVE).filter({ hasText: STAND_IN_FULL_NAME }).first();
  await settleDialog(take, `${SEL_RECOVERY_ALTERNATIVE}:has-text("${STAND_IN_FULL_NAME}")`);
  await recorder.endFast();
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
  await recorder.beginFast(CUT);
  const response = await saved;
  if (!response.ok()) throw new Error(`recording the answer of ${STAND_IN_FULL_NAME} returned HTTP ${response.status()}`);
  const answer = await response.json();
  report.answer = { isScenarioReplacement: answer.isScenarioReplacement, outcome: answer.outcome };
  if (answer.isScenarioReplacement !== true) throw new Error(`the answer of ${STAND_IN_FULL_NAME} did not switch the scenario - there is no manual fallback in this take`);
  const coveredHead = page.locator(SEL_RECOVERY_COVERED).first().locator(SEL_RECOVERY_HEAD).first();
  await coveredHead.filter({ hasText: STAND_IN_FULL_NAME }).waitFor({ state: "visible", timeout: SAVE_TIMEOUT_MS });
  await settleDialog(take, SEL_RECOVERY_COVERED);
  await coveredHead.scrollIntoViewIfNeeded();
  const name = await coveredHead.locator(SEL_RECOVERY_NAME).boundingBox();
  await mouse.moveTo({ x: name.x + name.width + NAME_POINTER_GAP_PX, y: name.y + name.height / HALF }, MOVE.normal);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await recorder.endFast();
  await pauseOf(take, "yes");
  await captions.show(cues.follows);
  await pauseOf(take, "follows");
  await checkScenarioSwitched(take, ctx);
}

/** The switch itself, read from the scenario: Max's RVN stands in Tanja's row, Max and the first stand-in hold no RVN there, nothing is a replacement. */
async function checkScenarioSwitched(take, ctx) {
  const { api, report } = take;
  const scenarioData = await api.schedule(scenarioFilter(ctx.decemberFilter, ctx.outcome.token));
  const onStandIn = worksOf(onDay(scenarioData, ctx.standIn.id)).filter((entry) => entry.abbreviation === ABSENT_SHIFT);
  report.scenarioMove = {
    absent: shiftsOf(onDay(scenarioData, ctx.absent.id)),
    standIn: onStandIn.map((entry) => ({ shift: entry.abbreviation, movedFromAbsent: entry.movedFromClientId === ctx.absent.id })),
    firstStandIn: shiftsOf(onDay(scenarioData, ctx.firstStandIn.id)),
    replacements: replacementsOf(onAbsentDay(scenarioData)).length,
  };
  if (report.scenarioMove.absent.includes(ABSENT_SHIFT)) flag(report, `${ABSENT_FIRST_NAME} still holds ${ABSENT_SHIFT} in the scenario`);
  if (onStandIn.length !== 1) flag(report, `${STAND_IN_FULL_NAME} holds ${onStandIn.length} ${ABSENT_SHIFT} in the scenario instead of one`);
  if (report.scenarioMove.firstStandIn.includes(ABSENT_SHIFT)) flag(report, "the first stand-in still holds the RVN in the scenario");
  if (report.scenarioMove.replacements !== 0) flag(report, "the scenario holds a replacement instead of a move");
  ctx.scenarioMovedLock = Boolean(onStandIn[0]?.lockLevel);
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
  const moved = worksOf(onDay(real, ctx.standIn.id)).filter((entry) => entry.abbreviation === ABSENT_SHIFT);
  report.realPlan = {
    ku: ku.length,
    absentWorks: shiftsOf(absentEntries),
    standIn: moved.map((entry) => ({ shift: entry.abbreviation, from: entry.startTime, until: entry.endTime, movedFromAbsent: entry.movedFromClientId === ctx.absent.id })),
    firstStandIn: shiftsOf(onDay(real, ctx.firstStandIn.id)),
    replacements: replacementsOf(onAbsentDay(real)).length,
  };
  if (ku.length !== 1) flag(report, `${ku.length} KU breaks on ${ABSENT_DAY} instead of one`);
  if (report.realPlan.absentWorks.length !== 0) flag(report, `${ABSENT_FIRST_NAME} still holds ${report.realPlan.absentWorks.join(",")} on ${ABSENT_DAY}`);
  if (moved.length !== 1 || moved[0].movedFromClientId !== ctx.absent.id) flag(report, `${STAND_IN_FULL_NAME} does not hold the RVN moved from ${ABSENT_FIRST_NAME} on ${ABSENT_DAY}`);
  if (report.realPlan.firstStandIn.includes(ABSENT_SHIFT)) flag(report, "the stand-in who declined holds the RVN");
  if (report.realPlan.replacements !== 0) flag(report, `${report.realPlan.replacements} replacement WorkChanges on ${ABSENT_DAY}, the cover should have moved the work`);
  ctx.realMovedLock = Boolean(moved[0]?.lockLevel);
  report.lockLevelsDecember = lockLevelsOf(real, D.PERIOD.from, D.PERIOD.until);
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

/** Rests the visible cursor on a moved work so the grid shows its cell tooltip ("Übernommen von ..."); a small wiggle makes the grid see the move. The tooltip must name the origin. */
export async function hoverMovedNote(take, target, originName) {
  const { page, mouse, report } = take;
  await mouse.moveTo(target, MOVE.normal);
  await page.mouse.move(target.x + HOVER_WIGGLE.px, target.y, { steps: HOVER_WIGGLE.steps });
  await page.mouse.move(target.x, target.y, { steps: HOVER_WIGGLE.steps });
  const tooltip = page.locator(REPLACEMENT_TOOLTIP).first();
  await tooltip.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS }).catch(() => {});
  const text = (await tooltip.isVisible().catch(() => false)) ? (await tooltip.innerText()).trim() : "";
  (report.movedNotes ??= []).push(text);
  if (!text.includes(originName)) flag(report, `the moved work shows the tooltip "${text}" instead of naming ${originName}`);
}

/** Pixels of a corner clip that differ from its most frequent colour (the cell background) by more than ICON_INK_DELTA (sum over R, G, B). */
async function inkOf(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const counts = new Map();
  for (let i = 0; i < data.length; i += RGB_CHANNELS) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const background = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const bg = [(background >> 16) & 0xff, (background >> 8) & 0xff, background & 0xff];
  let ink = 0;
  for (let i = 0; i < data.length; i += RGB_CHANNELS) {
    if (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > ICON_INK_DELTA) ink += 1;
  }
  return { ink, pixels: info.width * info.height, background: `#${background.toString(16).padStart(6, "0")}` };
}

/**
 * Proof that the grid draws the moved icon (Ui d20a5e6f8, pp-icon-work-moved, top-left corner of the cell): inside a cut region the cursor overlay is hidden, the top-left corner of the
 * cell is screenshot (CSS pixels) and must hold drawn strokes; the top-right corner of the same cell is the control (it holds the lock icon only when the work has a lock level), so a dirty
 * or shifted cell cannot pass. Both crops are written next to the frames for a visual check. center is the cell centre as cellOf computes it.
 * @param expectLock - true when the work carries a lock level (then the top-right corner must hold the lock icon instead of being empty)
 */
export async function checkMovedIcon(take, center, label, { expectLock = false } = {}) {
  const { page, report } = take;
  const left = center.x - CELL_WIDTH_PX / HALF;
  const top = center.y - SUB_ROW_HEIGHT_PX / HALF;
  const clipAt = (x) => ({ x, y: top + ICON_CORNER.inset, width: ICON_CORNER.size, height: ICON_CORNER.size });
  await page.evaluate((id) => { const cursor = document.getElementById(id); if (cursor) cursor.style.visibility = "hidden"; }, CURSOR_ID);
  try {
    const moved = await page.screenshot({ clip: clipAt(left + ICON_CORNER.inset), scale: "css" });
    const control = await page.screenshot({ clip: clipAt(left + CELL_WIDTH_PX - ICON_CORNER.inset - ICON_CORNER.size), scale: "css" });
    const dir = path.join(process.env.KLACKS_VIDEO_FRAMES_DIR ?? os.tmpdir(), ICON_SHOT_DIR);
    await mkdir(dir, { recursive: true });
    const name = label.replace(/[^A-Za-z0-9-]+/g, "-");
    await sharp(moved).resize({ width: ICON_CORNER.size * 8, kernel: "nearest" }).toFile(path.join(dir, `${name}-moved-corner.png`));
    await sharp(control).resize({ width: ICON_CORNER.size * 8, kernel: "nearest" }).toFile(path.join(dir, `${name}-control-corner.png`));
    const result = { label, movedCorner: await inkOf(moved), controlCorner: await inkOf(control), expectLock };
    (report.movedIcons ??= []).push(result);
    log(`moved icon ${label}: ${JSON.stringify(result)}`);
    const iconDrawn = result.movedCorner.ink >= ICON_MIN_INK_PX;
    const controlOk = expectLock ? result.controlCorner.ink >= ICON_MIN_INK_PX : result.controlCorner.ink <= ICON_MAX_EMPTY_INK_PX;
    result.ok = iconDrawn && controlOk;
    if (!iconDrawn) flag(report, `the moved icon is not drawn at "${label}" (${result.movedCorner.ink} ink pixels)`);
    if (!controlOk) flag(report, `the control corner at "${label}" holds ${result.controlCorner.ink} ink pixels (lock expected: ${expectLock}) - the cell geometry is off`);
  } finally {
    await page.evaluate((id) => { const cursor = document.getElementById(id); if (cursor) cursor.style.visibility = ""; }, CURSOR_ID);
  }
}

/** Lock levels of the works of the period, read from the API: the grid draws a lock icon (top-right) for every level above 0. */
export function lockLevelsOf(data, from, until) {
  const levels = {};
  for (const work of worksIn(data, from, until)) levels[work.lockLevel ?? 0] = (levels[work.lockLevel ?? 0] ?? 0) + 1;
  return levels;
}

/** The stored row order only applies with the sort mode "individual" of the row header; a page load resets it. Runs inside a cut region. */
export async function useRowOrder(take) {
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
  const { page, api, report, options, recorder, captions } = take;
  await recorder.beginFast(CUT);
  const done = page.locator(SEL_RECOVERY_SUBMIT);
  await done.scrollIntoViewIfNeeded();
  await done.click();
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: COVER_TIMEOUT_MS });
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await checkMovedIcon(take, await cell(take, ROWS.standIn, SUB_ROW_FIRST), "r1-scenario-tanja", { expectLock: ctx.scenarioMovedLock });
  await captions.show(REPLACEMENT_R1_CUES.scenario);
  await recorder.endFast();
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
  await checkAbsenceLabel(take, script.absenceName);
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
    await recordAnswers(take, ctx);

    await openProposalAsScenario(take, ctx);
    await pauseOf(take, "scenario");

    await captions.show(cues.cells);
    await mouse.moveTo(await cell(take, ROWS.standIn, SUB_ROW_FIRST), MOVE.normal);
    await pauseOf(take, "cells");
    await checkPage(take, "scenario");

    await captions.show(cues.accept);
    await pauseOf(take, "acceptLead");
    await decideViaBanner(take, "accept", { cutReload: true });
    await verifyAccepted(take, ctx);
    await readToasts(take);
    await recorder.beginFast(CUT);
    await openSchedule(page, options);
    await frameDay(take);
    await measure(take, "accepted");
    await checkMovedIcon(take, await cell(take, ROWS.standIn, SUB_ROW_FIRST), "r1-accepted-tanja", { expectLock: ctx.realMovedLock });
    await recorder.endFast();
    await captions.show(cues.absent);
    await mouse.moveTo(await cell(take, ROWS.absent, SUB_ROW_FIRST), MOVE.normal);
    await pauseOf(take, "absent");
    await captions.show(cues.standIn);
    await hoverMovedNote(take, await cell(take, ROWS.standIn, SUB_ROW_FIRST), MOVED_NOTE_ORIGIN);
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
