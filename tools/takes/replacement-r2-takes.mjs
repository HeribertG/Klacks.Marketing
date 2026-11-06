// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip R2 "Eine Woche krank" (series Replacement, security demo Biel, lib/security-demo.mjs). It needs a throw-away copy of the stage database klacks_marketing_security_biel_r2 on which
 * seed-security-demo.mjs --site biel --stage r2 has run (it keeps the plan and adds what lets one duty stay open: the reception duty needs a qualification the whole team holds, so nobody is borrowed from
 * another group, the four people free on 18.12. carry a FREE command, the on-call day of 18.12. is dropped) and --group-id of "Biel Objektschutz". The take refuses a copy without that seed.
 * replacement-r2 (1280x720): right-click on Elsa Dubach's RVN of 14.12., "Ausfall decken...", the dialog with "Wie lange?" until 18.12. The review holds four covered duties and one duty under "Offen geblieben"
 * with the reason of the app. "Fertig" shows the scenario: KU on all five days, Elsa's duties of Monday to Thursday stand in the rows of Yannick, Luc, Marc and Tanja (cover move, Api 45b217e7b, v1.0.57:
 * the dialog means "not started", the whole work moves, work.movedFromClientId = Elsa, no replacement ABL). The banner accepts it; the duty nobody covers (Friday EMP) is deleted and its slot in the shift area
 * stays open. The cut after the accept shows the schedule with the shift area and the planning commands on (the grid only repaints them with the next layout change): the moved icon (two arrows, top-left
 * of the cell, drawn since Ui d20a5e6f8) on Yannick's moved RVN, the tooltip of Yannick's RVN naming Elsa, the open EMP of Friday, Zoe's FREE. The planner closes the gap by hand: the open EMP is dragged from the shift area onto Zoe's Friday.
 * Nobody is contacted by Klacks in this take: the roster checkbox stays off,
 * so no escalation chain exists; the escalation page is not part of the clip (its texts announce notifications, and all chains would only be registered, with nothing to acknowledge).
 * The row slider stands at 100 so the app draws the text at full size; on the copy the rows of the story are moved to the top with the row order of the app. REPLACEMENT_CSS lightens the modal backdrop and blurs the phone numbers (cosmetic only).
 * The waits (spinner of the proposal, way to "Fertig", reload after the accept, reload of the replacement) are cut regions.
 * Publishable criterion (report.publishable, every part is read from the API, not from the screen): the cover request names Elsa, 14.-18.12., notifyEscalationRoster=false and no override; the proposal holds exactly the four covered and the
 * one open duty of the storyboard, every name is a team member; the scenario belongs to the group and spans 14.-18.12.; exactly one accept, status Accepted; the real plan shows five KU breaks and no work on Elsa, each of her
 * four covered duties on the proposed person with movedFromClientId = Elsa, no replacement WorkChange in the week, nobody holding the EMP of Friday before the manual step, Zoe holding it (not moved) after it;
 * the moved icon is drawn on Yannick's RVN after the accept (checkMovedIcon; the rows of the other three are below the frame in that scene); the tooltip of Yannick's RVN names Elsa; every other work of December is unchanged;
 * nobody who is free on Friday lacks a FREE command, no escalation chain exists; no error toast, no HTTP error on a recovery or work change call; no text "Winterthur" or "Uster" on the page at the checkpoints. An accept refused with HTTP 409 aborts the take.
 * Cultures de, en, fr, it: script.absenceName as in R1, script.untilDateTyped is the date as the datepicker of that language writes it (de 18.12.2026, en 12/18/2026, fr and it 18/12/2026; the app parses the typed layout of the active language).
 * @param take - page, api, options, recorder, mouse, report, captions, script, viewport, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import { CANVAS_SETTLE_MS, CELL_WIDTH_PX, HALF, HTTP_POST, SUB_ROW_HEIGHT_PX, dateKey, gridBox, openSchedule, rowBoxes, worksIn } from "../lib/schedule-grid.mjs";
import { SCENARIO_STATUS_ACCEPTED, getScenario, realFilter } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import { ENTRY_TYPE_BREAK, ENTRY_TYPE_COMMAND } from "../lib/security-plan-check.mjs";
import { checkAbsenceLabel, checkMovedIcon, checkPage, hoverMovedNote, lockLevelsOf, openMenuItem, settleDialog, useRowOrder } from "./replacement-takes.mjs";
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
  moved: "moved",
  gap: "gap",
  why: "why",
  pick: "pick",
  done: "done",
});
export const REPLACEMENT_R2_FINAL_HOLD_MS = 3500;

const FIRST_DAY = "2026-12-14";
const LAST_DAY = "2026-12-18";
const DEFAULT_LAST_DAY_TYPED = "18.12.2026";
const ABSENT_FIRST_NAME = "Elsa";
const HAND_FIRST_NAME = "Zoe";
const OPEN_SHIFT = "EMP";
const ORIGIN_FULL_NAME = "Elsa Dubach";
const WORK_ENTRY_TYPE = 0;
const SHIFT_AREA_CANVAS = "app-shift-section canvas";
const SHIFT_AREA_FIRST_ROW_CENTER_PX = 19;
const SHIFT_GUTTER_Y = 528;
const SHIFT_AREA_MAX_TOP = 620;
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const SPLIT_DIRECTION_VERTICAL = "vertical";
const DRAG_STEPS = 24;
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
const COVER_ABSENCE_PATH = /\/Recovery\/CoverAbsence$/i;
const WATCHED_ERROR_PATH = /\/Recovery\/|\/Works\/Changes|\/AnalyseScenarios\//i;
const CLIENTS_API = "/api/backend/Clients";
const SORT_ORDER_API = "/api/backend/clientsortpreferences";
const CHAINS_API = "/api/backend/assistant/escalation-chains";
const HTTP_PUT = "PUT";
const SAVE_TIMEOUT_MS = 30000;
const COVER_TIMEOUT_MS = 60000;
const CUT = Number.POSITIVE_INFINITY;
const MOVE = { normal: 650, drag: 1400 };
const SAVE_SETTLE_MS = 2500;

const log = (...args) => console.log("  ", ...args);
const fullName = (client) => `${client.firstName} ${client.name}`;
const keyOfWork = (work) => [work.clientId, dateKey(work.entryDate), work.entryId, work.startTime, work.endTime].join("|");
const isAbsenceDay = (work) => { const day = dateKey(work.entryDate); return day >= FIRST_DAY && day <= LAST_DAY; };
const otherWorks = (data, absentId) => worksIn(data, D.PERIOD.from, D.PERIOD.until).filter((work) => !(work.clientId === absentId && isAbsenceDay(work))).map(keyOfWork).sort();
const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const onDay = (data, clientId, day) => data.entries.filter((entry) => entry.clientId === clientId && dateKey(entry.entryDate) === day);
const replacementsOf = (entries) => entries.filter((entry) => entry.entryType === WORK_CHANGE_ENTRY_TYPE && REPLACEMENT_TYPES.includes(entry.workChangeType));
const worksOf = (entries) => entries.filter((entry) => entry.entryType === WORK_ENTRY_TYPE);
const inWeek = (data) => data.entries.filter(isAbsenceDay);
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
  const typed = take.script.untilDateTyped ?? DEFAULT_LAST_DAY_TYPED;
  await mouse.clickLocator(field, MOVE.normal);
  await page.waitForTimeout(take.script.beats.field);
  await field.fill(typed);
  await page.keyboard.press("Tab");
  if (!(await field.inputValue()).startsWith(typed)) throw new Error(`the until field of the recovery dialog shows ${await field.inputValue()} instead of ${typed}`);
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

/** Layout after the accept: like frameWeek, but the splitter is pulled up so the shift area shows its first rows (the reception duty first) and the open slot of Friday is in the picture. */
async function frameWeekWithShifts(take) {
  const { page, mouse } = take;
  await useRowOrder(take);
  const gutters = await page.locator(SEL_SPLIT_GUTTER).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, direction: element.parentElement?.getAttribute("direction") };
  }));
  const gutter = gutters.find((candidate) => candidate.direction === SPLIT_DIRECTION_VERTICAL);
  if (!gutter) throw new Error("the splitter between the grid and the shift area was not found");
  await mouse.drag({ x: gutter.x, y: Math.min(gutter.y, take.viewport.height - 2) }, { x: gutter.x, y: SHIFT_GUTTER_Y }, MOVE.normal);
  await setRowSlider(take, false);
  await setRowSlider(take, true);
  await scrollColumns(take, COLUMNS_SCROLLED, 1);
  const shifts = await page.locator(SHIFT_AREA_CANVAS).first().boundingBox();
  if (!shifts || shifts.y > SHIFT_AREA_MAX_TOP) throw new Error(`the shift area starts at ${shifts?.y} px, the open slot would not be readable`);
}

/** The Friday slot of the reception duty in the shift area: same column as the grid, first row of the shift canvas. */
async function openSlotCell(take) {
  const grid = await gridBox(take.page);
  const shifts = await take.page.locator(SHIFT_AREA_CANVAS).first().boundingBox();
  if (!shifts) throw new Error("the shift area is not in the picture");
  const visibleColumn = Number(LAST_DAY.slice(-2)) - 1 - COLUMNS_SCROLLED;
  return { x: grid.x + (visibleColumn + 1 / HALF) * CELL_WIDTH_PX, y: shifts.y + SHIFT_AREA_FIRST_ROW_CENTER_PX };
}

/** Elsa's duty of the day stands on the stand-in, moved from Elsa. */
function movedDuty(data, ctx, day, firstName) {
  const standIn = clientNamed(data.clients, firstName);
  const duty = worksOf(onDay(data, standIn.id, day)).filter((entry) => entry.abbreviation === EXPECTED_SHIFTS[day]);
  return { standIn: firstName, shift: EXPECTED_SHIFTS[day], count: duty.length, movedFromAbsent: duty.length === 1 && duty[0].movedFromClientId === ctx.absent.id };
}

/** The state of the accepted proposal, read before the manual step: four duties moved, Friday's duty gone, nobody holds it. */
async function verifyAccepted(take, ctx) {
  const { api, report } = take;
  report.acceptRequests = ctx.acceptRequests;
  if (ctx.acceptRequests !== 1) flag(report, `${ctx.acceptRequests} accept requests were sent instead of one`);
  report.acceptedStatus = (await getScenario(api, ctx.scenario.id)).status;
  if (report.acceptedStatus !== SCENARIO_STATUS_ACCEPTED) flag(report, `the scenario status is ${report.acceptedStatus} after the accept`);
  const real = await api.schedule(ctx.decemberFilter);
  const moved = Object.entries(COVERED).map(([day, firstName]) => ({ day, ...movedDuty(real, ctx, day, firstName) }));
  for (const duty of moved) if (!duty.movedFromAbsent) flag(report, `${duty.shift} of ${duty.day} is not on ${duty.standIn} as moved from ${ABSENT_FIRST_NAME}`);
  const elsaWorks = worksOf(inWeek(real).filter((entry) => entry.clientId === ctx.absent.id)).map((entry) => `${dateKey(entry.entryDate)} ${entry.abbreviation}`);
  const fridayEmp = worksOf(real.entries.filter((entry) => dateKey(entry.entryDate) === LAST_DAY && entry.abbreviation === OPEN_SHIFT)).length;
  report.acceptedPlan = { moved, elsaWorks, fridayEmpHolders: fridayEmp, replacements: replacementsOf(inWeek(real)).length };
  if (elsaWorks.length !== 0) flag(report, `${ABSENT_FIRST_NAME} still holds ${elsaWorks.join(", ")}`);
  if (fridayEmp !== 0) flag(report, `the ${OPEN_SHIFT} of ${LAST_DAY} is held by ${fridayEmp} work(s) before the manual step`);
  if (report.acceptedPlan.replacements !== 0) flag(report, `${report.acceptedPlan.replacements} replacement WorkChanges in the week, the cover should have moved the works`);
  report.friday = checkFriday(real, ctx.absent.id);
  ctx.movedLock = Object.fromEntries(Object.entries(COVERED).map(([day, firstName]) => {
    const duty = worksOf(onDay(real, clientNamed(real.clients, firstName).id, day)).find((entry) => entry.abbreviation === EXPECTED_SHIFTS[day]);
    return [day, Boolean(duty?.lockLevel)];
  }));
  report.lockLevelsDecember = lockLevelsOf(real, D.PERIOD.from, D.PERIOD.until);
}

/** The moved icon on Yannick's RVN (the duty the tooltip scene hovers), checked inside the cut after the accept; the rows of the other three stand-ins are below the frame there. */
async function checkMovedIcons(take, ctx) {
  const [day, firstName] = Object.entries(COVERED)[0];
  await checkMovedIcon(take, await cell(take, day, ROWS.firstStandIn, SUB_ROW_WORK), `r2-accepted-${firstName}`, { expectLock: ctx.movedLock[day] });
}


/** The planner drags the open reception duty of Friday from the shift area onto Zoe's Friday (she has FREE, she agreed on the phone). The drop goes to the second sub-row: the first holds her FREE command, a drop there is refused. */
async function fillGapByHand(take) {
  const { page, mouse, captions, recorder } = take;
  const from = await openSlotCell(take);
  const to = await cell(take, LAST_DAY, ROWS.hand, SUB_ROW_WORK);
  await captions.show(REPLACEMENT_R2_CUES.pick);
  await mouse.moveTo(from, MOVE.normal);
  await pauseOf(take, "picked");
  await mouse.drag(from, to, MOVE.drag);
  await recorder.beginFast(CUT);
  await page.waitForTimeout(SAVE_SETTLE_MS);
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
  const zoeFriday = worksOf(onDay(real, hand.id, LAST_DAY));
  const moved = Object.entries(COVERED).map(([day, firstName]) => ({ day, ...movedDuty(real, ctx, day, firstName) }));
  report.finalPlan = { kuDays: ku, moved, zoeWorksFriday: zoeFriday.map((entry) => ({ shift: entry.abbreviation, from: entry.startTime, until: entry.endTime, moved: Boolean(entry.movedFromClientId) })), replacements: replacementsOf(inWeek(real)).length };
  if (ku.length !== days.length) flag(report, `KU on ${ku.length} days instead of ${days.length}`);
  if (zoeFriday.length !== 1 || zoeFriday[0].abbreviation !== OPEN_SHIFT) flag(report, `${HAND_FIRST_NAME} holds ${zoeFriday.map((entry) => entry.abbreviation).join(",") || "nothing"} on ${LAST_DAY} instead of ${OPEN_SHIFT}`);
  for (const duty of moved) if (!duty.movedFromAbsent) flag(report, `${duty.shift} of ${duty.day} is no longer on ${duty.standIn} as moved from ${ABSENT_FIRST_NAME}`);
  if (report.finalPlan.replacements !== 0) flag(report, `${report.finalPlan.replacements} replacement WorkChanges in the week`);
  const handKey = (work) => work.clientId === hand.id && dateKey(work.entryDate) === LAST_DAY;
  const movedKeys = new Set(Object.entries(COVERED).map(([day, firstName]) => `${clientNamed(real.clients, firstName).id}|${day}|${EXPECTED_SHIFTS[day]}`));
  const isStoryWork = (work) => handKey(work) || movedKeys.has(`${work.clientId}|${dateKey(work.entryDate)}|${work.abbreviation}`);
  const after = worksIn(real, D.PERIOD.from, D.PERIOD.until).filter((work) => !isStoryWork(work) && !(work.clientId === ctx.absent.id && isAbsenceDay(work))).map(keyOfWork).sort();
  report.otherWorksUnchanged = sameList(ctx.otherWorksBefore, after);
  if (!report.otherWorksUnchanged) flag(report, "works outside Elsa's week and the moved duties changed");
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
  await checkAbsenceLabel(take, script.absenceName);
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
    await frameWeekWithShifts(take);
    await measure(take, "accepted");
    await checkMovedIcons(take, ctx);
    await captions.show(cues.moved);
    await recorder.endFast();
    await hoverMovedNote(take, await cell(take, FIRST_DAY, ROWS.firstStandIn, SUB_ROW_WORK), ORIGIN_FULL_NAME);
    await pauseOf(take, "moved");
    await captions.show(cues.gap);
    await mouse.moveTo(await openSlotCell(take), MOVE.normal);
    await pauseOf(take, "gap");
    await captions.show(cues.why);
    await mouse.moveTo(await cell(take, LAST_DAY, ROWS.hand, SUB_ROW_FIRST_BEFORE_ABSENCE), MOVE.normal);
    await pauseOf(take, "why");
    await fillGapByHand(take);
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
