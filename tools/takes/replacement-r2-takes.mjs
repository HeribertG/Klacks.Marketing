// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip R2 "Eine Woche krank" (series Replacement, security demo Biel, lib/security-demo.mjs). It needs a throw-away copy of the stage database klacks_marketing_security_biel_r2 on which
 * seed-security-demo.mjs --site biel --stage r2 has run (it keeps the plan and adds what lets one duty stay open: the reception duty needs a qualification the whole team holds, so nobody is borrowed from
 * another group, the four people free on 18.12. carry a FREE command, the on-call day of 18.12. is dropped) and --group-id of "Biel Objektschutz". The take refuses a copy without that seed.
 * replacement-r2 (1280x720): right-click on Elsa Dubach's RVN of 14.12., "Ausfall decken...", the dialog with "Wie lange?" until 18.12. The review holds four covered duties and one duty under "Offen geblieben"
 * with the reason of the app. "Fertig" shows the scenario: KU on all five days, an ABL on four of them, none on Friday. The banner accepts it. The cut after the accept switches the planning commands on (the grid only repaints them with the next layout change): Zoe's FREE stands in the Friday
 * column. The planner resolves the rest by hand on the real plan: right-click on Elsa's EMP of 18.12., "Ablösung...", position "Am Anfang" with the 8:30 h of the duty, Zoe. Nobody is contacted by Klacks in this take: the roster checkbox stays off,
 * so no escalation chain exists; the escalation page is not part of the clip (its texts announce notifications, and all chains would only be registered, with nothing to acknowledge).
 * The row slider stands at 100 so the app draws the text at full size; on the copy the rows of the story are moved to the top with the row order of the app. REPLACEMENT_CSS lightens the modal backdrop and blurs the phone numbers (cosmetic only).
 * The waits (spinner of the proposal, way to "Fertig", reload after the accept, reload of the replacement) are cut regions.
 * Publishable criterion (report.publishable, every part is read from the API, not from the screen): the cover request names Elsa, 14.-18.12., notifyEscalationRoster=false and no override; the proposal holds exactly the four covered and the
 * one open duty of the storyboard, every name is a team member; the scenario belongs to the group and spans 14.-18.12.; exactly one accept, status Accepted; the real plan shows five KU breaks on Elsa, a replacement WorkChange on each of her
 * four covered works naming the proposed person with its mirror row, none on Friday before the manual step, exactly one on Friday after it, naming Zoe, with its mirror row; every other work of December is unchanged;
 * nobody who is free on Friday lacks a FREE command, no escalation chain exists; no error toast, no HTTP error on a recovery or work change call; no text "Winterthur" or "Uster" on the page at the checkpoints. An accept refused with HTTP 409 aborts the take.
 * @param take - page, api, options, recorder, mouse, report, captions, script, viewport, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import { CANVAS_SETTLE_MS, CELL_WIDTH_PX, HALF, HTTP_POST, SUB_ROW_HEIGHT_PX, dateKey, gridBox, openSchedule, rowBoxes, worksIn } from "../lib/schedule-grid.mjs";
import { SCENARIO_STATUS_ACCEPTED, getScenario, realFilter } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import { ENTRY_TYPE_BREAK, ENTRY_TYPE_COMMAND } from "../lib/security-plan-check.mjs";
import { checkPage, openMenuItem, settleDialog, useRowOrder } from "./replacement-takes.mjs";
import { decideViaBanner, expectBanner, flag, holdWithPoster, trackNetwork } from "./scenario-takes.mjs";
import { checkStage, fitAllRows, measure, readToasts, scrollColumns, scrollRowsToTop, setRowSlider, showRowAtTop, trackHttpErrors, watchToasts } from "./security-takes.mjs";

export const VIDEO_REPLACEMENT_R2 = "replacement-r2";
export const REPLACEMENT_R2_CUES = Object.freeze({
  report: "report",
  form: "form",
  week: "week",
  result: "result",
  open: "open",
  scenario: "scenario",
  cells: "cells",
  standIns: "standIns",
  answers: "answers",
  accept: "accept",
  why: "why",
  manual: "manual",
  pick: "pick",
  done: "done",
});
export const REPLACEMENT_R2_FINAL_HOLD_MS = 3500;

const FIRST_DAY = "2026-12-14";
const LAST_DAY = "2026-12-18";
const LAST_DAY_TYPED = "18.12.2026";
const ABSENT_FIRST_NAME = "Elsa";
const HAND_FIRST_NAME = "Zoe";
const HAND_LAST_NAME = "Gerber";
const HAND_DURATION = Object.freeze({ hours: "08", minutes: "30" });
const SELECT_ALL = "Control+A";
const STORY_ROWS = Object.freeze(["Elsa", "Zoe", "Yannick", "Luc", "Marc", "Tanja"]);
const COVERED = Object.freeze({ "2026-12-14": "Yannick", "2026-12-15": "Luc", "2026-12-16": "Marc", "2026-12-17": "Tanja" });
const OPEN_REASON = "no eligible candidate";
const EXPECTED_SHIFTS = Object.freeze({ "2026-12-14": "RVN", "2026-12-15": "RVM", "2026-12-16": "OBT", "2026-12-17": "OBT", "2026-12-18": "EMP" });
const PHONES = Object.freeze({ Yannick: "+41 32 555 01 84", Luc: "+41 32 555 01 35", Marc: "+41 32 555 01 63", Tanja: "+41 32 555 01 42" });
const PHONE_TYPE_PRIVATE_CELL = 1;
const WORK_CHANGE_ENTRY_TYPE = 1;
const REPLACEMENT_TYPES = Object.freeze([2, 3, 9]);
const COLUMNS_SCROLLED = 12;
const SUB_ROW_ABSENCE = 0;
const SUB_ROW_WORK = 1;
const SUB_ROW_FIRST_BEFORE_ABSENCE = 0;
const ROWS = Object.freeze({ absent: 0, hand: 1, firstStandIn: 2 });
const MENU_COVER_ABSENCE = "#coverAbsence";
const MENU_REPLACEMENT = "#replacement";
const SEL_RECOVERY_ABSENCE = `${SEL_MODAL} select#recovery-absence`;
const SEL_RECOVERY_UNTIL = `${SEL_MODAL} input#recovery-until-date`;
const SEL_RECOVERY_NOTIFY = `${SEL_MODAL} input#recovery-notify-roster`;
const SEL_RECOVERY_OVERRIDE = `${SEL_MODAL} input#recovery-override`;
const SEL_RECOVERY_CLIENT = `${SEL_MODAL} #recovery-client`;
const SEL_RECOVERY_SUBMIT = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_RECOVERY_REVIEW = `${SEL_MODAL} .recovery-scenario`;
const SEL_RECOVERY_INTRO = `${SEL_MODAL} .recovery-description`;
const SEL_RECOVERY_UNCOVERED = `${SEL_MODAL} .recovery-uncovered`;
const SEL_BANNER = "#scenario-banner";
const SEL_COMMANDS_TOGGLE = "#schedule-commands-toggle";
const SEL_REPLACEMENT_HOURS = `${SEL_MODAL} #replDurationHours`;
const SEL_REPLACEMENT_MINUTES = `${SEL_MODAL} #replDurationMinutes`;
const SEL_REPLACEMENT_SEARCH = `${SEL_MODAL} input#replaceClient`;
const SEL_REPLACEMENT_RESULT = `${SEL_MODAL} .search-result-item`;
const SEL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const COVER_ABSENCE_PATH = /\/Recovery\/CoverAbsence$/i;
const WORK_CHANGES_PATH = /\/Works\/Changes$/i;
const WATCHED_ERROR_PATH = /\/Recovery\/|\/Works\/Changes|\/AnalyseScenarios\//i;
const CLIENTS_API = "/api/backend/Clients";
const SORT_ORDER_API = "/api/backend/clientsortpreferences";
const CHAINS_API = "/api/backend/assistant/escalation-chains";
const HTTP_PUT = "PUT";
const SAVE_TIMEOUT_MS = 30000;
const COVER_TIMEOUT_MS = 60000;
const TYPE_DELAY_MS = 40;
const CUT = Number.POSITIVE_INFINITY;
const MOVE = { normal: 650 };

const log = (...args) => console.log("  ", ...args);
const fullName = (client) => `${client.firstName} ${client.name}`;
const keyOfWork = (work) => [work.clientId, dateKey(work.entryDate), work.entryId, work.startTime, work.endTime].join("|");
const isAbsenceDay = (work) => { const day = dateKey(work.entryDate); return day >= FIRST_DAY && day <= LAST_DAY; };
const otherWorks = (data, absentId) => worksIn(data, D.PERIOD.from, D.PERIOD.until).filter((work) => !(work.clientId === absentId && isAbsenceDay(work))).map(keyOfWork).sort();
const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const onDay = (data, clientId, day) => data.entries.filter((entry) => entry.clientId === clientId && dateKey(entry.entryDate) === day);
const replacementsOf = (entries) => entries.filter((entry) => entry.entryType === WORK_CHANGE_ENTRY_TYPE && REPLACEMENT_TYPES.includes(entry.workChangeType));
const pauseOf = (take, beat) => take.page.waitForTimeout(take.script.beats[beat]);
const clientNamed = (clients, firstName) => {
  const client = clients.find((entry) => entry.firstName === firstName);
  if (!client) throw new Error(`${firstName} is not in the schedule of the group`);
  return client;
};

/** The stage carries no phone numbers; on the throw-away copy the people of the proposal get one, the review blurs them. */
async function addPhones(take, clients) {
  for (const [firstName, value] of Object.entries(PHONES)) {
    const client = await take.api.json(`${CLIENTS_API}/${clientNamed(clients, firstName).id}`);
    const communications = [...(client.communications ?? []), { type: PHONE_TYPE_PRIVATE_CELL, value, prefix: "", description: "" }];
    await take.api.json(CLIENTS_API, { method: HTTP_PUT, data: { ...client, communications } });
  }
}

async function orderRows(take, clients, groupId) {
  const story = STORY_ROWS.map((firstName) => clientNamed(clients, firstName));
  const ordered = [...story, ...clients.filter((client) => !story.includes(client))];
  await take.api.json(`${SORT_ORDER_API}/${groupId}`, { method: HTTP_PUT, data: ordered.map((client, sortOrder) => ({ clientId: client.id, sortOrder })) });
}

/** Everything the take may assume about the seeded copy; a mismatch refuses the take before anything is recorded. */
async function checkPlan(take, filter) {
  const { api, report } = take;
  if (filter.periodStartDate !== D.PERIOD.from || filter.periodEndDate !== D.PERIOD.until) throw new Error(`the schedule shows ${filter.periodStartDate}..${filter.periodEndDate} instead of December`);
  const decemberFilter = realFilter(filter);
  const data = await api.schedule(decemberFilter);
  const absent = clientNamed(data.clients, ABSENT_FIRST_NAME);
  for (const [day, shift] of Object.entries(EXPECTED_SHIFTS)) {
    const entries = onDay(data, absent.id, day);
    if (entries.length !== 1 || entries[0].abbreviation !== shift) throw new Error(`${absent.firstName} holds ${entries.map((entry) => entry.abbreviation).join(",") || "nothing"} on ${day} instead of ${shift} alone`);
  }
  const friday = checkFriday(data, absent.id);
  if (friday.neither.length > 0) throw new Error(`${friday.neither.join(", ")} neither work nor carry a command on ${LAST_DAY}: run seed-security-demo.mjs --stage r2 on the copy`);
  const chains = await api.json(CHAINS_API);
  if (chains.length > 0) throw new Error(`${chains.length} escalation chains exist on the copy`);
  report.stage = { employees: data.clients.map(fullName), worksInDecember: worksIn(data, D.PERIOD.from, D.PERIOD.until).length, friday };
  return { decemberFilter, data, absent };
}

function checkFriday(data, absentId) {
  const others = data.clients.filter((client) => client.id !== absentId);
  const working = others.filter((client) => onDay(data, client.id, LAST_DAY).some((entry) => entry.entryType === 0)).map(fullName);
  const free = others.filter((client) => onDay(data, client.id, LAST_DAY).some((entry) => entry.entryType === ENTRY_TYPE_COMMAND)).map(fullName);
  return { working, free, neither: others.map(fullName).filter((name) => !working.includes(name) && !free.includes(name)) };
}

function cellOf(grid, boxes, day, row, subRow) {
  const visibleColumn = Number(day.slice(-2)) - 1 - COLUMNS_SCROLLED;
  return { x: grid.x + (visibleColumn + 1 / HALF) * CELL_WIDTH_PX, y: boxes[row].top + (subRow + 1 / HALF) * SUB_ROW_HEIGHT_PX };
}

const cell = async (take, day, row, subRow) => cellOf(await gridBox(take.page), await rowBoxes(take.page), day, row, subRow);

async function typeUntil(take) {
  const { page, mouse } = take;
  const field = page.locator(SEL_RECOVERY_UNTIL);
  await mouse.clickLocator(field, MOVE.normal);
  await page.waitForTimeout(take.script.beats.field);
  await field.fill(LAST_DAY_TYPED);
  await page.keyboard.press("Tab");
  if (!(await field.inputValue()).startsWith(LAST_DAY_TYPED)) throw new Error(`the field "Wie lange?" shows ${await field.inputValue()}`);
}

async function propose(take, ctx) {
  const { page, recorder, mouse, report, script, captions } = take;
  const cues = REPLACEMENT_R2_CUES;
  const absence = page.locator(SEL_RECOVERY_ABSENCE);
  await absence.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  const named = (await page.locator(SEL_RECOVERY_CLIENT).innerText()).trim();
  if (!named.startsWith(ABSENT_FIRST_NAME)) throw new Error(`the recovery dialog names ${named}`);
  await captions.show(cues.week);
  await typeUntil(take);
  await pauseOf(take, "until");
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
  await captions.show(cues.result);
  await recorder.endFast();
  if (!response.ok()) throw new Error(`CoverAbsence returned HTTP ${response.status()}`);
  const body = response.request().postDataJSON();
  report.request = { clientId: body?.clientId, date: body?.date, untilDate: body?.untilDate, notifyEscalationRoster: body?.notifyEscalationRoster, overrideBlock: body?.overrideBlock ?? null };
  if (dateKey(body?.date) !== FIRST_DAY) throw new Error(`the cover request names ${body?.date} instead of ${FIRST_DAY} - the right-click hit the wrong column`);
  if (dateKey(body?.untilDate) !== LAST_DAY) throw new Error(`the cover request ends on ${body?.untilDate} instead of ${LAST_DAY}`);
  if (body?.clientId !== ctx.absent.id) throw new Error("the cover request names another employee - the right-click hit the wrong row");
  if (body?.notifyEscalationRoster !== false || body?.overrideBlock) flag(report, `the cover request carried roster=${body?.notifyEscalationRoster} override=${body?.overrideBlock}`);
  const outcome = await response.json();
  ctx.outcome = outcome;
  report.outcome = {
    scenarioName: outcome.scenarioName,
    covered: outcome.covered.map((slot) => ({ day: dateKey(slot.date), name: slot.replacementName, tier: slot.tier, from: slot.startTime, until: slot.endTime })),
    uncovered: outcome.uncovered.map((slot) => ({ day: dateKey(slot.date), reason: slot.reason, from: slot.startTime, until: slot.endTime })),
    warnings: outcome.complianceWarnings.map((warning) => ({ day: dateKey(warning.date), name: warning.clientName, comment: warning.comment })),
  };
  log(`proposal: ${JSON.stringify(report.outcome)}`);
  checkProposal(outcome);
  report.intro = (await page.locator(SEL_RECOVERY_INTRO).first().innerText()).trim();
}

function checkProposal(outcome) {
  const expected = Object.entries(COVERED);
  if (outcome.covered.length !== expected.length) throw new Error(`${outcome.covered.length} covered duties instead of ${expected.length}`);
  for (const [day, firstName] of expected) {
    const slot = outcome.covered.find((entry) => dateKey(entry.date) === day);
    if (!slot?.replacementName.startsWith(firstName)) throw new Error(`the stand-in of ${day} is ${slot?.replacementName} instead of ${firstName}`);
  }
  if (outcome.uncovered.length !== 1 || dateKey(outcome.uncovered[0].date) !== LAST_DAY || outcome.uncovered[0].reason !== OPEN_REASON) throw new Error(`the open duties are ${JSON.stringify(outcome.uncovered)}`);
}

/** The review is taller than the frame: the list scrolls in one soft move so "Offen geblieben" stands in the picture. */
async function showOpenSlot(take) {
  const { page, mouse } = take;
  const open = page.locator(SEL_RECOVERY_UNCOVERED).first();
  const review = await page.locator(SEL_RECOVERY_REVIEW).boundingBox();
  await mouse.moveTo({ x: review.x + review.width / HALF, y: review.y }, MOVE.normal);
  await open.evaluate((element) => element.scrollIntoView({ behavior: "smooth", block: "center" }));
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const box = await open.boundingBox();
  await mouse.moveTo({ x: box.x + box.width / HALF, y: box.y + box.height / HALF }, MOVE.normal);
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
  await captions.show(REPLACEMENT_R2_CUES.scenario);
  await recorder.endFast();
  ctx.scenario = await getScenario(api, ctx.outcome.scenarioId);
  report.scenario = { id: ctx.scenario.id, name: ctx.scenario.name, groupId: ctx.scenario.groupId, from: dateKey(ctx.scenario.fromDate), until: dateKey(ctx.scenario.untilDate) };
  if (ctx.scenario.groupId !== options.groupId) throw new Error(`the scenario belongs to group ${ctx.scenario.groupId} - accepting it would replace data of another group`);
  if (report.scenario.from !== FIRST_DAY || report.scenario.until !== LAST_DAY) throw new Error(`the scenario spans ${report.scenario.from}..${report.scenario.until} instead of ${FIRST_DAY}..${LAST_DAY}`);
  await expectBanner(take, ctx.scenario.name);
  await measure(take, "scenario");
}

/** Layout of every picture: the story rows on top, the shift area collapsed, slider at 100, Monday as the second column so all five days and Saturday stand in the frame. */
async function frameWeek(take) {
  await useRowOrder(take);
  await fitAllRows(take);
  await setRowSlider(take, true);
  await scrollColumns(take, COLUMNS_SCROLLED, 1);
}

/** The state of the accepted proposal, read before the manual step: Friday has the KU but no replacement yet. */
async function verifyAccepted(take, ctx) {
  const { api, report } = take;
  report.acceptRequests = ctx.acceptRequests;
  if (ctx.acceptRequests !== 1) flag(report, `${ctx.acceptRequests} accept requests were sent instead of one`);
  report.acceptedStatus = (await getScenario(api, ctx.scenario.id)).status;
  if (report.acceptedStatus !== SCENARIO_STATUS_ACCEPTED) flag(report, `the scenario status is ${report.acceptedStatus} after the accept`);
  const real = await api.schedule(ctx.decemberFilter);
  const proposed = {};
  for (const [day, firstName] of Object.entries(COVERED)) {
    const standIn = clientNamed(real.clients, firstName);
    const change = replacementsOf(onDay(real, ctx.absent.id, day));
    const mirror = replacementsOf(onDay(real, standIn.id, day));
    proposed[day] = { replacement: change.map((entry) => entry.replaceClientId === standIn.id), mirrors: mirror.length };
    if (change.length !== 1 || change[0].replaceClientId !== standIn.id) flag(report, `the replacement on ${day} is not ${firstName}`);
    if (mirror.length !== 1) flag(report, `${firstName} shows ${mirror.length} replacements on ${day}`);
  }
  report.acceptedPlan = { proposed, fridayReplacements: replacementsOf(onDay(real, ctx.absent.id, LAST_DAY)).length };
  if (report.acceptedPlan.fridayReplacements !== 0) flag(report, "Friday holds a replacement before the manual step");
  report.friday = checkFriday(real, ctx.absent.id);
}

async function typeDuration(take, selector, text) {
  const { page, mouse } = take;
  const field = page.locator(selector);
  await mouse.clickLocator(field, MOVE.normal);
  await page.keyboard.press(SELECT_ALL);
  await field.pressSequentially(text, { delay: TYPE_DELAY_MS });
}

async function replaceByHand(take) {
  const { page, mouse, captions, recorder } = take;
  const target = await cell(take, LAST_DAY, ROWS.absent, SUB_ROW_WORK);
  await mouse.moveTo(target, MOVE.normal);
  await pauseOf(take, "hover");
  await openMenuItem(take, target, MENU_REPLACEMENT);
  await waitModalAtRest(page);
  await captions.show(REPLACEMENT_R2_CUES.pick);
  const search = page.locator(SEL_REPLACEMENT_SEARCH);
  await mouse.clickLocator(search, MOVE.normal);
  await search.pressSequentially(HAND_LAST_NAME, { delay: TYPE_DELAY_MS });
  const result = page.locator(SEL_REPLACEMENT_RESULT).filter({ hasText: HAND_FIRST_NAME }).first();
  await result.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await pauseOf(take, "field");
  await mouse.clickLocator(result, MOVE.normal);
  await pauseOf(take, "field");
  await typeDuration(take, SEL_REPLACEMENT_HOURS, HAND_DURATION.hours);
  await typeDuration(take, SEL_REPLACEMENT_MINUTES, HAND_DURATION.minutes);
  await pauseOf(take, "picked");
  await page.locator(SEL_SAVE).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  const saved = page.waitForResponse((response) => response.request().method() === HTTP_POST && WORK_CHANGES_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  saved.catch(() => {});
  await mouse.clickLocator(page.locator(SEL_SAVE), MOVE.normal);
  await recorder.beginFast(CUT);
  const response = await saved;
  if (!response.ok()) throw new Error(`the replacement returned HTTP ${response.status()}`);
  const body = response.request().postDataJSON();
  take.report.manualRequest = { type: body?.type, startTime: body?.startTime, endTime: body?.endTime, changeTime: body?.changeTime, replaceClientId: body?.replaceClientId };
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await captions.show(REPLACEMENT_R2_CUES.done);
  await recorder.endFast();
}

/** The published proof of the take: only states read back from the API after the last click. */
async function verifyFinished(take, ctx) {
  const { api, report } = take;
  const real = await api.schedule(ctx.decemberFilter);
  const hand = clientNamed(real.clients, HAND_FIRST_NAME);
  const days = Object.keys(EXPECTED_SHIFTS);
  const ku = days.filter((day) => onDay(real, ctx.absent.id, day).some((entry) => entry.entryType === ENTRY_TYPE_BREAK && entry.entryId === ctx.absenceId));
  const friday = replacementsOf(onDay(real, ctx.absent.id, LAST_DAY));
  const mirror = replacementsOf(onDay(real, hand.id, LAST_DAY));
  report.finalPlan = { kuDays: ku, fridayReplacement: friday.map((entry) => ({ replaced: entry.replaceClientId === hand.id, from: entry.startTime, until: entry.endTime })), fridayMirrors: mirror.length, zoeWorksFriday: onDay(real, hand.id, LAST_DAY).map((entry) => entry.abbreviation) };
  if (ku.length !== days.length) flag(report, `KU on ${ku.length} days instead of ${days.length}`);
  if (friday.length !== 1 || friday[0].replaceClientId !== hand.id) flag(report, `the replacement of ${LAST_DAY} is not ${HAND_FIRST_NAME}`);
  if (mirror.length !== 1) flag(report, `${HAND_FIRST_NAME} shows ${mirror.length} replacements on ${LAST_DAY}`);
  report.otherWorksUnchanged = sameList(ctx.otherWorksBefore, otherWorks(real, ctx.absent.id));
  if (!report.otherWorksUnchanged) flag(report, "works outside Elsa's week changed");
  report.escalationChains = (await api.json(CHAINS_API)).length;
  if (report.escalationChains !== 0) flag(report, `${report.escalationChains} escalation chains exist`);
  const strangers = [...report.outcome.covered.map((slot) => slot.name)].filter((name) => !report.stage.employees.includes(name));
  if (strangers.length > 0) flag(report, `stand-ins outside the team: ${strangers.join(", ")}`);
  const watched = (report.httpErrors ?? []).filter((line) => WATCHED_ERROR_PATH.test(line));
  if (watched.length > 0) flag(report, `HTTP errors: ${watched.join("; ")}`);
}

export async function takeReplacementR2(take) {
  const { page, options, recorder, mouse, report, captions, script } = take;
  if (!script?.absenceName || !script?.beats) throw new Error(`the ${report.video} script lacks absenceName or beats in capture-app-videos.scripts.json`);
  const cues = REPLACEMENT_R2_CUES;
  await checkStage(take, D.SITES.biel);
  const first = await openSchedule(page, options);
  await addPhones(take, first.data.clients);
  await orderRows(take, first.data.clients, options.groupId);
  const { filter } = await openSchedule(page, options);
  const { decemberFilter, data, absent } = await checkPlan(take, filter);
  const ctx = {
    created: [], reassigned: [], acceptRequests: 0, scheduleTokens: [], realIds: new Set(), originalClient: new Map(),
    decemberFilter, absent, otherWorksBefore: otherWorks(data, absent.id),
  };
  trackNetwork(take, ctx);
  trackHttpErrors(take);
  await frameWeek(take);
  await watchToasts(page);
  await measure(take, "start");
  await checkPage(take, "start");

  await recorder.start();
  try {
    await captions.show(cues.report);
    await pauseOf(take, "intro");
    const target = await cell(take, FIRST_DAY, ROWS.absent, SUB_ROW_FIRST_BEFORE_ABSENCE);
    await mouse.moveTo(target, MOVE.normal);
    await pauseOf(take, "hover");
    await openMenuItem(take, target, MENU_COVER_ABSENCE);
    await waitModalAtRest(page);
    await captions.show(cues.form);
    await pauseOf(take, "formLead");
    await propose(take, ctx);
    await pauseOf(take, "result");
    await captions.show(cues.open);
    await showOpenSlot(take);
    await pauseOf(take, "open");
    await checkPage(take, "review");

    await openProposalAsScenario(take, ctx);
    await mouse.moveTo(await cell(take, LAST_DAY, ROWS.absent, SUB_ROW_ABSENCE), MOVE.normal);
    await pauseOf(take, "scenario");
    await captions.show(cues.cells);
    await pauseOf(take, "cells");
    await captions.show(cues.standIns);
    await showRowAtTop(take, ROWS.firstStandIn);
    await pauseOf(take, "standIns");
    await showRowAtTop(take, ROWS.firstStandIn + 1);
    await pauseOf(take, "standIns");
    await captions.show(cues.answers);
    await pauseOf(take, "answers");
    await checkPage(take, "scenario");
    await scrollRowsToTop(take);

    await captions.show(cues.accept);
    await pauseOf(take, "acceptLead");
    await decideViaBanner(take, "accept", { cutReload: true });
    await verifyAccepted(take, ctx);
    await recorder.beginFast(CUT);
    await openSchedule(page, options);
    await page.locator(SEL_COMMANDS_TOGGLE).click();
    await frameWeek(take);
    await measure(take, "accepted");
    await captions.show(cues.why);
    await recorder.endFast();
    await mouse.moveTo(await cell(take, LAST_DAY, ROWS.hand, SUB_ROW_FIRST_BEFORE_ABSENCE), MOVE.normal);
    await pauseOf(take, "why");
    await captions.show(cues.manual);
    await pauseOf(take, "manual");
    await replaceByHand(take);
    await verifyFinished(take, ctx);
    await readToasts(take);
    await mouse.moveTo(await cell(take, LAST_DAY, ROWS.hand, SUB_ROW_FIRST_BEFORE_ABSENCE), MOVE.normal);
    await checkPage(take, "finished");
    await holdWithPoster(take, take.finalHoldMs);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale } });
  }
}
