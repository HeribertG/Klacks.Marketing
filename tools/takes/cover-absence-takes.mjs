// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Carousel take "Ausfall decken" (cover-absence, 1280x800, no captions) of the website's daily operations carousel: right-click on an October work
 * of the demo group, "Ausfall decken...", the dialog is pre-filled with employee and day, the absence type from capture-app-videos.scripts.json is
 * chosen, "Vorschlag erstellen" shows the review (one covered slot, direct stand-in), "Fertig" opens the proposal as a scenario, the absent row
 * and then the stand-in row are scrolled into view and the cell tooltip of the moved work names the absent person, the banner accepts the scenario and the real plan shows the
 * work at the stand-in (moved icon, tooltip "Übernommen von ..."). Nobody is contacted: the escalation roster stays off (asserted on the request body).
 * The accept changes the plan, so the take runs only on a throw-away copy of the demo database (KLACKS_COVER_ABSENCE_THROWAWAY=1, one fresh copy
 * per culture) and restores nothing.
 * Publishable criterion (read from the API, not from the screen): the cover request has notifyEscalationRoster=false and no override; the proposal
 * holds one covered and no open slot on the direct tier; exactly one accept; after the accept the stand-in holds the work with movedFromClientId of
 * the absent person, the absent person has no work on that day, every other October work is unchanged (compared by person, day, shift and times
 * without the id: the accept writes the works of the scenario day as new rows); the moved icon is drawn on the stand-in's
 * cell after the accept; the tooltip names the absent person; the dialog title holds no "Recovery" and no bracket.
 * @param take - page, api, options, recorder, mouse, report, culture, script, viewport, scale (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import { CANVAS_SETTLE_MS, HALF, HTTP_POST, cellCenter, dateKey, openSchedule, snapshotOf } from "../lib/schedule-grid.mjs";
import { OCTOBER, OCTOBER_RANGE, SCENARIO_STATUS_ACCEPTED, activeScenarios, getScenario, monthRealFilter } from "../lib/scenario-demo.mjs";
import { decideViaBanner, flag } from "./scenario-takes.mjs";
import { checkMovedIcon, hoverMovedNote } from "./replacement-takes.mjs";
import { pickAbsentWork, rowTextVisible, scrollRowToTop, scrollUntilRowTextVisible, visibleGridBand } from "./simple-story-takes.mjs";

export const VIDEO_COVER_ABSENCE = "cover-absence";
export const COVER_ABSENCE_VIDEOS = [VIDEO_COVER_ABSENCE];
export const COVER_ABSENCE_CSS = ".recovery-phone { filter: blur(6px) !important; } .modal-backdrop.show { opacity: 0.16 !important; }";

const THROWAWAY_ENV = "KLACKS_COVER_ABSENCE_THROWAWAY";
const SEL_OPEN_MENU = "app-context-menu .menu-container[style*='display: block']";
const SEL_MENU_COVER_ABSENCE = "#coverAbsence";
const SEL_DIALOG_TITLE = `${SEL_MODAL} .modal-title`;
const SEL_RECOVERY_ABSENCE = `${SEL_MODAL} select#recovery-absence`;
const SEL_RECOVERY_NOTIFY = `${SEL_MODAL} input#recovery-notify-roster`;
const SEL_RECOVERY_OVERRIDE = `${SEL_MODAL} input#recovery-override`;
const SEL_RECOVERY_SUBMIT = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_RECOVERY_COVERED = `${SEL_MODAL} .recovery-list-covered .recovery-covered`;
const SEL_RECOVERY_REVIEW = `${SEL_MODAL} .recovery-scenario`;
const SEL_BANNER = "#scenario-banner";
const COVER_ABSENCE_PATH = /\/Recovery\/CoverAbsence$/i;
const SCENARIO_ACCEPT_PATH = /\/AnalyseScenarios\/[0-9a-f-]{36}\/Accept/i;
const OLD_TITLE_PATTERN = /recovery|[()（）]/i;
const DIRECT_TIER = 0;
const WORK_ENTRY_TYPE = 0;
const SCROLL_TICK_PAUSE_MS = 250;
const SCROLL_GESTURE_PAUSE_MS = 60;
const SAVE_TIMEOUT_MS = 60000;
const BANNER_TIMEOUT_MS = 60000;
const REVIEW_REAL_TIME_MS = 4000;
const FAST_FACTOR_VALIDATION = 4;
const CUT = Number.POSITIVE_INFINITY;
const REVIEW_POINTER_RATIO = 0.7;
const BEAT = { intro: 700, hover: 300, menu: 500, field: 700, form: 1400, review: 2600, banner: 900, scrolled: 500, absent: 1800, note: 1800, acceptLead: 600, finalHold: 3000 };
const MOVE = { short: 350, normal: 650 };

const log = (...args) => console.log("  ", ...args);
const fullName = (client) => `${client.firstName} ${client.name}`;
const worksOnDay = (data, clientId, day) => data.entries.filter((entry) => entry.entryType === WORK_ENTRY_TYPE && entry.clientId === clientId && dateKey(entry.entryDate) === day);

async function chooseAbsence(take) {
  const { page, mouse, script } = take;
  const absence = page.locator(SEL_RECOVERY_ABSENCE);
  const box = await absence.boundingBox();
  await mouse.moveTo({ x: box.x + box.width / HALF, y: box.y + box.height / HALF }, MOVE.normal);
  await absence.selectOption({ label: script.absenceName });
  await page.waitForTimeout(BEAT.field);
  if (await page.locator(SEL_RECOVERY_NOTIFY).isChecked()) throw new Error("the escalation roster checkbox is checked - refusing to submit");
  if ((await page.locator(SEL_RECOVERY_OVERRIDE).count()) > 0 && await page.locator(SEL_RECOVERY_OVERRIDE).isChecked()) throw new Error("the override checkbox is checked - refusing to submit");
}

/** Submits the dialog, cuts a slow proposal to a quarter and checks the outcome: one covered slot on the direct tier, nothing open. */
async function proposeCover(take) {
  const { page, mouse, recorder, report } = take;
  const coverResponse = page.waitForResponse((response) => response.request().method() === HTTP_POST && COVER_ABSENCE_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  coverResponse.catch(() => {});
  await mouse.clickLocator(page.locator(SEL_RECOVERY_SUBMIT), MOVE.normal);
  const reviewShown = page.locator(SEL_RECOVERY_REVIEW).waitFor({ state: "visible", timeout: SAVE_TIMEOUT_MS });
  const fast = await Promise.race([reviewShown.then(() => false), page.waitForTimeout(REVIEW_REAL_TIME_MS).then(() => true)]);
  if (fast) await recorder.beginFast(FAST_FACTOR_VALIDATION);
  const response = await coverResponse;
  await reviewShown;
  await recorder.endFast();
  const body = response.request().postDataJSON();
  report.request = { notifyEscalationRoster: body?.notifyEscalationRoster, overrideBlock: body?.overrideBlock ?? null, date: body?.date, untilDate: body?.untilDate ?? null };
  if (body?.notifyEscalationRoster !== false) flag(report, `the cover request carried notifyEscalationRoster=${body?.notifyEscalationRoster}`);
  if (body?.overrideBlock) flag(report, "the cover request carried overrideBlock");
  if (!response.ok()) throw new Error(`CoverAbsence returned HTTP ${response.status()}`);
  const outcome = await response.json();
  report.outcome = {
    scenarioId: outcome.scenarioId,
    covered: outcome.covered.map((slot) => ({ name: slot.replacementName, tier: slot.tier, clientId: slot.replacementClientId })),
    uncovered: outcome.uncovered.map((slot) => slot.reason),
    warnings: outcome.complianceWarnings.length,
  };
  log(`proposal: ${JSON.stringify(report.outcome)}`);
  if (outcome.covered.length !== 1 || outcome.uncovered.length !== 0) flag(report, `expected one covered and no open slot, got ${outcome.covered.length} / ${outcome.uncovered.length}`);
  else if (outcome.covered[0].tier !== DIRECT_TIER) flag(report, `the stand-in is tier ${outcome.covered[0].tier}, not a direct replacement`);
  return outcome;
}

/** The proof of the take, read back from the API after the accept. */
async function verifyAccepted(take, ctx) {
  const { api, report } = take;
  report.acceptedStatus = (await getScenario(api, ctx.scenarioId)).status;
  if (report.acceptedStatus !== SCENARIO_STATUS_ACCEPTED) flag(report, `the scenario status is ${report.acceptedStatus} after the accept`);
  if (ctx.acceptRequests.count !== 1) flag(report, `${ctx.acceptRequests.count} accept requests were sent instead of one`);
  const after = await api.schedule(ctx.octoberFilter);
  const moved = worksOnDay(after, ctx.standInId, ctx.pick.day).filter((work) => work.abbreviation === ctx.pick.work.abbreviation);
  const leftOnAbsent = worksOnDay(after, ctx.pick.client.id, ctx.pick.day);
  report.realPlan = {
    standIn: moved.map((work) => ({ shift: work.abbreviation, from: work.startTime, until: work.endTime, movedFromAbsent: work.movedFromClientId === ctx.pick.client.id })),
    absentWorks: leftOnAbsent.map((work) => work.abbreviation),
  };
  if (moved.length !== 1 || moved[0].movedFromClientId !== ctx.pick.client.id) flag(report, `the stand-in does not hold the ${ctx.pick.work.abbreviation} moved from ${fullName(ctx.pick.client)} on ${ctx.pick.day}`);
  if (leftOnAbsent.length !== 0) flag(report, `${fullName(ctx.pick.client)} still holds ${leftOnAbsent.length} work(s) on ${ctx.pick.day}`);
  const touched = new Set([`${ctx.pick.client.id}|${ctx.pick.day}`, `${ctx.standInId}|${ctx.pick.day}`]);
  const untouched = (snapshot) => snapshot
    .map((key) => key.split("|").slice(1).join("|"))
    .filter((key) => !touched.has(key.split("|").slice(0, 2).join("|")))
    .sort();
  const beforeRest = untouched(ctx.before);
  const afterRest = untouched(snapshotOf(after, OCTOBER_RANGE));
  report.otherWorksUnchanged = beforeRest.length === afterRest.length && beforeRest.every((key, index) => key === afterRest[index]);
  if (!report.otherWorksUnchanged) flag(report, "October works outside the absent day of the two people changed");
  return moved[0];
}

async function takeCoverAbsence(take) {
  const { page, api, options, recorder, mouse, report, script, viewport, scale } = take;
  if (process.env[THROWAWAY_ENV] !== "1") throw new Error(`${VIDEO_COVER_ABSENCE} accepts a scenario and changes the plan: run it only on a throw-away copy of the demo database and set ${THROWAWAY_ENV}=1`);
  if (!script?.absenceName) throw new Error(`the ${report.video} script for ${take.culture} lacks absenceName in capture-app-videos.scripts.json`);
  const active = await activeScenarios(api, options.groupId);
  if (active.length > 0) throw new Error(`${active.length} active scenario(s) exist for the demo group - use a fresh copy of the demo database`);
  const { filter, data } = await openSchedule(page, options);
  const octoberFilter = monthRealFilter(filter, OCTOBER);
  const before = snapshotOf(await api.schedule(octoberFilter), OCTOBER_RANGE);
  if (before.length !== OCTOBER_RANGE.expectedWorks) throw new Error(`October has ${before.length} works, expected ${OCTOBER_RANGE.expectedWorks} - use a fresh copy of the demo database`);
  const pick = pickAbsentWork(data, filter);
  report.absent = { client: fullName(pick.client), day: pick.day, work: `${pick.work.abbreviation} ${pick.work.startTime}-${pick.work.endTime}` };
  log(`absent: ${report.absent.client} on ${pick.day} (${report.absent.work})`);
  const preBand = await visibleGridBand(page);
  await page.mouse.move(preBand.wheelPoint.x, preBand.wheelPoint.y);
  await scrollRowToTop(page, pick.row, SCROLL_TICK_PAUSE_MS);
  await page.mouse.move(mouse.x, mouse.y);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
  const cell = await cellCenter(page, pick.row, pick.dayIndex, isRtl);
  const ctx = { pick, octoberFilter, before, acceptRequests: { count: 0 }, scenarioId: null, standInId: null };
  page.on("request", (request) => {
    if (request.method() === HTTP_POST && SCENARIO_ACCEPT_PATH.test(new URL(request.url()).pathname)) ctx.acceptRequests.count += 1;
  });

  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(cell, MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    await mouse.rightClick(cell, MOVE.short);
    const item = page.locator(`${SEL_OPEN_MENU} ${SEL_MENU_COVER_ABSENCE}`).first();
    await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    await page.waitForTimeout(BEAT.menu);
    await mouse.clickLocator(item, MOVE.normal);
    await waitModalAtRest(page);
    report.dialogTitle = (await page.locator(SEL_DIALOG_TITLE).first().innerText()).trim();
    if (OLD_TITLE_PATTERN.test(report.dialogTitle)) flag(report, `the dialog title "${report.dialogTitle}" still carries the old wording`);
    await page.waitForTimeout(BEAT.field);
    await chooseAbsence(take);
    await page.waitForTimeout(BEAT.form - BEAT.field);
    const outcome = await proposeCover(take);
    ctx.scenarioId = outcome.scenarioId;
    ctx.standInId = outcome.covered[0]?.replacementClientId;
    await page.locator(SEL_RECOVERY_COVERED).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    const coveredBox = await page.locator(SEL_RECOVERY_COVERED).first().boundingBox();
    await mouse.moveTo({ x: coveredBox.x + coveredBox.width * REVIEW_POINTER_RATIO, y: coveredBox.y + coveredBox.height / HALF }, MOVE.normal);
    await page.waitForTimeout(BEAT.review);
    await mouse.clickLocator(page.locator(SEL_RECOVERY_SUBMIT), MOVE.normal);
    await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
    await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: BANNER_TIMEOUT_MS });
    await page.waitForTimeout(BEAT.banner);

    const standInRow = data.clients.findIndex((client) => client.id === ctx.standInId);
    if (standInRow < 0) throw new Error("the stand-in is not a row of the demo group");
    report.standInRow = standInRow;
    report.standIn = fullName(data.clients[standInRow]);
    const band = await visibleGridBand(page);
    await mouse.moveTo(band.wheelPoint, MOVE.normal);
    await scrollRowToTop(page, pick.row, SCROLL_GESTURE_PAUSE_MS);
    report.scenarioAbsentRowVisible = await rowTextVisible(page, pick.row);
    if (!report.scenarioAbsentRowVisible) flag(report, `the absent row ${pick.row} is not visible in the scenario`);
    await page.waitForTimeout(BEAT.absent);
    await scrollUntilRowTextVisible(page, standInRow, SCROLL_GESTURE_PAUSE_MS);
    await page.waitForTimeout(BEAT.scrolled);
    report.scenarioStandInRowVisible = await rowTextVisible(page, standInRow);
    if (!report.scenarioStandInRowVisible) flag(report, `the stand-in row ${standInRow} is not visible in the scenario`);
    await hoverMovedNote(take, await cellCenter(page, standInRow, pick.dayIndex, isRtl), pick.client.firstName);
    await page.waitForTimeout(BEAT.note);

    await page.waitForTimeout(BEAT.acceptLead);
    await decideViaBanner(take, "accept", { cutReload: true });
    await verifyAccepted(take, ctx);

    await recorder.beginFast(CUT);
    await page.mouse.move(band.wheelPoint.x, band.wheelPoint.y);
    await scrollRowToTop(page, pick.row, SCROLL_TICK_PAUSE_MS);
    await scrollUntilRowTextVisible(page, standInRow, SCROLL_TICK_PAUSE_MS);
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    const acceptedCell = await cellCenter(page, standInRow, pick.dayIndex, isRtl);
    await checkMovedIcon(take, acceptedCell, `cover-absence-${take.culture}-accepted`);
    await recorder.endFast();
    report.acceptedRowsVisible = { absent: await rowTextVisible(page, pick.row), standIn: await rowTextVisible(page, standInRow) };
    if (!report.acceptedRowsVisible.standIn) flag(report, `the stand-in row ${standInRow} is not visible after the accept`);
    await hoverMovedNote(take, acceptedCell, pick.client.firstName);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.finalHold);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: viewport.width * scale, height: viewport.height * scale } });
  }
}

export const COVER_ABSENCE_TAKE_RUNNERS = {
  [VIDEO_COVER_ABSENCE]: takeCoverAbsence,
};
