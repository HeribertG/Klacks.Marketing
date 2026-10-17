// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story takes of the simple start page with cue-based captions (lib/caption-overlay.mjs, tools/simple-videos.<culture>.json).
 * simple-cover-absence ("Ausfall decken", about 20 s): right-click on an October work of the demo group, "Ausfall decken...", the
 * recovery dialog is pre-filled with employee and day, the absence type from capture-app-videos.scripts.json is chosen, "Vorschlag
 * erstellen" shows the review step (covered / open, tier, stand-in), "Fertig" leaves the proposal selected as a scenario in the plan,
 * then the stand-in's row is scrolled into view. The dialog never accepts; the take never clicks Accept either. The escalation
 * roster stays off (asserted on the request body), the created scenario is deleted afterwards and October of the demo group must
 * still hold its 118 works, no real absence and no active scenario. Phone numbers in the review step are blurred (privacy).
 * simple-planning-progress ("Planung mit Fortschritt", about 18 s): the AutoWizard button plans the week 02.-08.11. of the weekly
 * group "Winterthur Nord" (lib/scenario-week-demo.mjs); the thin progress line under the schedule header stays visible while the run
 * is in progress (first seconds in real time, the rest time-compressed with badge), the finished proposal is shown as a scenario and
 * is never accepted. The take crops the header area (the screencast delivers CSS-pixel frames, a higher device scale adds nothing). The striped bar
 * with percentage of the wizard dialog is not part of this flow: that dialog opens only from the admin test menu (Ctrl+Shift+H).
 * Cleanup stops the job, empties the plan week (resetPlanWeek deletes the scenarios overlapping it) and verifies that October and
 * November outside the plan week of the demo group are unchanged.
 * @param take - page, api, options, recorder, mouse, report, culture, script, captions, viewport, scale (see recordTake)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import {
  BREAK_ENTRY_TYPE,
  assertNoAbsencesOrNotes,
  groupMonthFilter,
  requireWeekGroup,
} from "../lib/scenario-week-demo.mjs";
import {
  CANVAS_SETTLE_MS,
  HALF,
  HTTP_POST,
  SUB_ROW_HEIGHT_PX,
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
  activeScenarios,
  addDays,
  deleteScenario,
  getScenario,
  monthRealFilter,
  realFilter,
  resetPlanWeek,
  scenarioFilter,
  stopJob,
  waitForJob,
} from "../lib/scenario-demo.mjs";
import { openPlanWeek } from "./scenario-takes.mjs";

export const VIDEO_SIMPLE_COVER_ABSENCE = "simple-cover-absence";
export const VIDEO_SIMPLE_PLANNING_PROGRESS = "simple-planning-progress";
export const SIMPLE_STORY_VIDEOS = [VIDEO_SIMPLE_COVER_ABSENCE, VIDEO_SIMPLE_PLANNING_PROGRESS];
export const SIMPLE_COVER_ABSENCE_CUES = { openMenu: "openMenu", form: "form", review: "review", decide: "decide" };
export const SIMPLE_PLANNING_PROGRESS_CUES = { start: "start", progress: "progress", result: "result" };

const PROGRESS_CROP_CSS = { x: 100, y: 0, width: 960, height: 600 };
const PROGRESS_CAPTION_TOP_PX = 520;
const PROGRESS_CAPTION_START_PX = 124;
export const SIMPLE_STORY_CSS = {
  [VIDEO_SIMPLE_COVER_ABSENCE]: ".recovery-phone { filter: blur(6px) !important; }",
  [VIDEO_SIMPLE_PLANNING_PROGRESS]: `#capture-caption { top: ${PROGRESS_CAPTION_TOP_PX}px !important; bottom: auto !important; `
    + `inset-inline-start: ${PROGRESS_CAPTION_START_PX}px !important; }`,
};

const SEL_OPEN_MENU = "app-context-menu .menu-container[style*='display: block']";
const SEL_MENU_COVER_ABSENCE = "#coverAbsence";
const SEL_RECOVERY_ABSENCE = `${SEL_MODAL} select#recovery-absence`;
const SEL_RECOVERY_NOTIFY = `${SEL_MODAL} input#recovery-notify-roster`;
const SEL_RECOVERY_OVERRIDE = `${SEL_MODAL} input#recovery-override`;
const SEL_RECOVERY_SUBMIT = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_RECOVERY_COVERED = `${SEL_MODAL} .recovery-list-covered .recovery-covered`;
const SEL_RECOVERY_REVIEW = `${SEL_MODAL} .recovery-scenario`;
const SEL_BANNER = "#scenario-banner";
const SEL_WIZARD_BUTTON = "#schedule-wizard-btn";
const SEL_WIZARD_DROPDOWN = ".wizard-dropdown";
const SEL_PROGRESS_LINE = "app-progress-line .progress-line-bar";

const COVER_ABSENCE_PATH = /\/Recovery\/CoverAbsence$/i;
const AUTO_WIZARD_START_PATH = /\/AutoWizard\/Start/i;
const SCENARIO_ACCEPT_PATH = /\/AnalyseScenarios\/[0-9a-f-]{36}\/Accept/i;
const DIRECT_TIER = 0;
const PICK_ROWS = { min: 7, max: 8 };
const PICK_DAYS = { min: 3, max: 8 };
const ISO_SATURDAY = 6;
const ISO_SUNDAY = 7;
const MS_PER_DAY = 86400000;
const NOVEMBER_FIRST = "2026-11-01";
const NOVEMBER_LAST = "2026-11-30";
const GRID_HEADER_HEIGHT_PX = 30;
const SCROLL_TICK_DELTA = 100;
const SCROLL_TICK_PAUSE_MS = 250;
const SCROLL_GESTURE_PAUSE_MS = 60;
const MAX_SCROLL_TICKS = 40;
const REVIEW_POINTER_RATIO = 0.7;
const PARK_OFFSET = { x: 70, y: 60 };

const SAVE_TIMEOUT_MS = 60000;
const BANNER_TIMEOUT_MS = 60000;
const REVIEW_REAL_TIME_MS = 4000;
const FAST_FACTOR_VALIDATION = 4;
const FAST_FACTOR_WIZARD = 4;
const BEAT = { intro: 600, hover: 300, menu: 500, field: 700, form: 1500, review: 2800, banner: 700, scrolled: 600, decide: 1400, finalHold: 2000 };
const PROGRESS_BEAT = { intro: 900, start: 2600, progress: 2800, result: 3800 };
const MOVE = { short: 350, normal: 650 };

const log = (...args) => console.log("  ", ...args);

function flag(report, message) {
  report.failure ??= message;
  log(`! ${message}`);
}

function isoWeekday(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay() || ISO_SUNDAY;
}

const dayIndexOf = (filter, isoDate) => Math.round((Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${filter.periodStartDate}T00:00:00Z`)) / MS_PER_DAY);

/**
 * Picks a weekday work in the upper visible rows that is the only entry of its employee on that day and is not locked, so the
 * right-click hits exactly this work and the absence replaces one shift.
 */
function pickAbsentWork(data, filter) {
  const rowOf = new Map(data.clients.map((client, index) => [client.id, index]));
  const perClientDay = new Map();
  for (const entry of data.entries) {
    const key = `${entry.clientId}|${dateKey(entry.entryDate)}`;
    perClientDay.set(key, (perClientDay.get(key) ?? 0) + 1);
  }
  const candidates = worksIn(data, filter.periodStartDate, filter.periodEndDate)
    .filter((work) => !work.lockLevel && !work.isGroupRestricted && !work.isReplacementEntry)
    .map((work) => ({ work, row: rowOf.get(work.clientId), day: dateKey(work.entryDate) }))
    .filter(({ work, row, day }) => row >= PICK_ROWS.min && row <= PICK_ROWS.max
      && dayIndexOf(filter, day) >= PICK_DAYS.min && dayIndexOf(filter, day) <= PICK_DAYS.max
      && isoWeekday(day) < ISO_SATURDAY
      && perClientDay.get(`${work.clientId}|${day}`) === 1);
  candidates.sort((a, b) => a.day.localeCompare(b.day) || a.row - b.row);
  if (candidates.length === 0) throw new Error("no suitable work in the framed October rows/days");
  const pick = candidates[0];
  return { ...pick, client: data.clients[pick.row], dayIndex: dayIndexOf(filter, pick.day) };
}

const realBreaksIn = (data, range) => data.entries.filter((entry) => entry.entryType === BREAK_ENTRY_TYPE
  && dateKey(entry.entryDate) >= range.from && dateKey(entry.entryDate) <= range.until);

async function visibleGridBand(page) {
  const grid = await gridBox(page);
  return { top: grid.y + GRID_HEADER_HEIGHT_PX, bottom: grid.y + grid.height, wheelPoint: { x: grid.x + grid.width / HALF, y: grid.y + grid.height / HALF } };
}

/**
 * Scrolls the grid until the given employee row is the first visible row (one wheel event moves one sub-row), so the absent
 * employee and the stand-in rows below it fit on screen together, also after the scenario banner made the grid shorter.
 * Loading the scenario resets the scroll position, so the take scrolls once before the recording and once after "Fertig".
 * @param pauseMs - pause between two wheel events (short inside the recording, so the scroll reads as one gesture)
 */
async function scrollRowToTop(page, row, pauseMs) {
  const band = await visibleGridBand(page);
  for (let tick = 0; tick < MAX_SCROLL_TICKS; tick++) {
    const box = (await rowBoxes(page))[row];
    if (!box) throw new Error(`employee row ${row} does not exist`);
    if (box.top >= band.top && box.top < band.top + SUB_ROW_HEIGHT_PX) return;
    await page.mouse.wheel(0, box.top < band.top ? -SCROLL_TICK_DELTA : SCROLL_TICK_DELTA);
    await page.waitForTimeout(pauseMs);
  }
  throw new Error(`employee row ${row} could not be scrolled to the top of the grid`);
}

/** Scrolls down (or up) one sub-row per wheel event until the cell text of the employee row is visible; the stand-in row of the proposal. */
async function scrollUntilRowTextVisible(page, row, pauseMs) {
  const band = await visibleGridBand(page);
  for (let tick = 0; tick < MAX_SCROLL_TICKS; tick++) {
    if (await rowTextVisible(page, row)) return;
    const box = (await rowBoxes(page))[row];
    if (!box) throw new Error(`employee row ${row} does not exist`);
    await page.mouse.wheel(0, box.top < band.top ? -SCROLL_TICK_DELTA : SCROLL_TICK_DELTA);
    await page.waitForTimeout(pauseMs);
  }
  throw new Error(`employee row ${row} could not be scrolled into view`);
}

/** True when the first sub-row of the employee row (where the cell text is drawn) lies completely inside the visible grid band. */
async function rowTextVisible(page, row) {
  const band = await visibleGridBand(page);
  const box = (await rowBoxes(page))[row];
  return Boolean(box) && box.top >= band.top && box.top + SUB_ROW_HEIGHT_PX <= band.bottom;
}

async function takeSimpleCoverAbsence(take) {
  const { page, api, options, recorder, mouse, report, script, captions, viewport, scale } = take;
  if (!script?.absenceName) throw new Error(`the ${report.video} script for ${take.culture} lacks absenceName in capture-app-videos.scripts.json`);
  if (!captions) throw new Error(`${VIDEO_SIMPLE_COVER_ABSENCE} needs captions`);
  const active = await activeScenarios(api, options.groupId);
  if (active.length > 0) throw new Error(`${active.length} active scenario(s) exist for the demo group - run reset-scenario-demo.mjs`);
  const { filter, data } = await openSchedule(page, options);
  const octoberFilter = monthRealFilter(filter, OCTOBER);
  const octoberData = await api.schedule(octoberFilter);
  const before = snapshotOf(octoberData, OCTOBER_RANGE);
  if (before.length !== OCTOBER_RANGE.expectedWorks) throw new Error(`October has ${before.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  const breaksBefore = realBreaksIn(octoberData, OCTOBER_RANGE).length;
  const pick = pickAbsentWork(data, filter);
  report.absent = { client: `${pick.client.firstName} ${pick.client.name}`, day: pick.day, work: `${pick.work.abbreviation} ${pick.work.startTime}-${pick.work.endTime}` };
  log(`absent: ${report.absent.client} on ${pick.day} (${report.absent.work})`);
  const preBand = await visibleGridBand(page);
  await page.mouse.move(preBand.wheelPoint.x, preBand.wheelPoint.y);
  await scrollRowToTop(page, pick.row, SCROLL_TICK_PAUSE_MS);
  await page.mouse.move(mouse.x, mouse.y);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
  const cell = await cellCenter(page, pick.row, pick.dayIndex, isRtl);
  const created = [];
  page.on("request", (request) => {
    if (request.method() === HTTP_POST && SCENARIO_ACCEPT_PATH.test(new URL(request.url()).pathname)) report.acceptRequests = (report.acceptRequests ?? 0) + 1;
  });

  await recorder.start();
  try {
    await captions.show(SIMPLE_COVER_ABSENCE_CUES.openMenu);
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(cell, MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    await mouse.rightClick(cell, MOVE.short);
    const item = page.locator(`${SEL_OPEN_MENU} ${SEL_MENU_COVER_ABSENCE}`).first();
    await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    await page.waitForTimeout(BEAT.menu);
    await mouse.clickLocator(item, MOVE.normal);
    await waitModalAtRest(page);
    await captions.show(SIMPLE_COVER_ABSENCE_CUES.form);
    await page.waitForTimeout(BEAT.field);
    const absence = page.locator(SEL_RECOVERY_ABSENCE);
    await mouse.moveTo(await absence.boundingBox().then((box) => ({ x: box.x + box.width / HALF, y: box.y + box.height / HALF })), MOVE.normal);
    await absence.selectOption({ label: script.absenceName });
    await page.waitForTimeout(BEAT.field);
    if (await page.locator(SEL_RECOVERY_NOTIFY).isChecked()) throw new Error("the escalation roster checkbox is checked - refusing to submit");
    if ((await page.locator(SEL_RECOVERY_OVERRIDE).count()) > 0 && await page.locator(SEL_RECOVERY_OVERRIDE).isChecked()) throw new Error("the override checkbox is checked - refusing to submit");
    await page.waitForTimeout(BEAT.form - BEAT.field);
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
    if (!response.ok()) throw new Error(`CoverAbsence returned HTTP ${response.status()}`);
    const outcome = await response.json();
    created.push(outcome.scenarioId);
    report.outcome = {
      scenarioName: outcome.scenarioName,
      covered: outcome.covered.map((slot) => ({ name: slot.replacementName, tier: slot.tier, clientId: slot.replacementClientId, from: slot.startTime, until: slot.endTime })),
      uncovered: outcome.uncovered.map((slot) => slot.reason),
      warnings: outcome.complianceWarnings.length,
    };
    log(`proposal: ${JSON.stringify(report.outcome)}`);
    if (outcome.covered.length !== 1 || outcome.uncovered.length !== 0) flag(report, `expected one covered and no open slot, got ${outcome.covered.length} / ${outcome.uncovered.length}`);
    else if (outcome.covered[0].tier !== DIRECT_TIER) flag(report, `the stand-in is tier ${outcome.covered[0].tier}, not a direct replacement`);
    await page.locator(SEL_RECOVERY_COVERED).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    await captions.show(SIMPLE_COVER_ABSENCE_CUES.review);
    await mouse.moveTo(await page.locator(SEL_RECOVERY_COVERED).first().boundingBox().then((box) => ({ x: box.x + box.width * REVIEW_POINTER_RATIO, y: box.y + box.height / HALF })), MOVE.normal);
    await page.waitForTimeout(BEAT.review);
    await mouse.clickLocator(page.locator(SEL_RECOVERY_SUBMIT), MOVE.normal);
    await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
    await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: BANNER_TIMEOUT_MS });
    await captions.show(SIMPLE_COVER_ABSENCE_CUES.decide);
    await page.waitForTimeout(BEAT.banner);
    const band = await visibleGridBand(page);
    await mouse.moveTo(band.wheelPoint, MOVE.normal);
    await scrollRowToTop(page, pick.row, SCROLL_GESTURE_PAUSE_MS);
    await page.waitForTimeout(BEAT.scrolled);
    const shownCell = await cellCenter(page, pick.row, pick.dayIndex, isRtl);
    await mouse.moveTo({ x: shownCell.x + PARK_OFFSET.x, y: shownCell.y + PARK_OFFSET.y }, MOVE.normal);
    report.absentRowVisible = await rowTextVisible(page, pick.row);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.decide);
    const standIn = outcome.covered[0]?.replacementClientId;
    report.standInRow = data.clients.findIndex((client) => client.id === standIn);
    await scrollUntilRowTextVisible(page, report.standInRow, SCROLL_GESTURE_PAUSE_MS);
    await page.waitForTimeout(BEAT.scrolled);
    report.standInRowVisible = await rowTextVisible(page, report.standInRow);
    if (!report.absentRowVisible || !report.standInRowVisible) flag(report, `absent row ${pick.row} visible: ${report.absentRowVisible}, stand-in row ${report.standInRow} visible: ${report.standInRowVisible}`);
    await page.waitForTimeout(BEAT.finalHold);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: viewport.width * scale, height: viewport.height * scale } });
    const problems = [];
    for (const id of created) await deleteScenario(api, id).catch((error) => problems.push(`delete scenario ${id}: ${error.message}`));
    const left = await activeScenarios(api, options.groupId);
    const after = await api.schedule(octoberFilter);
    report.cleanup = { deletedScenarios: created.length, activeScenariosLeft: left.length, acceptRequests: report.acceptRequests ?? 0, problems };
    report.octoberRestored = sameSnapshot(before, snapshotOf(after, OCTOBER_RANGE)) && realBreaksIn(after, OCTOBER_RANGE).length === breaksBefore;
    if (problems.length > 0 || left.length > 0) throw new Error(`cleanup incomplete: ${problems.join("; ") || `${left.length} active scenario(s) left`} - run reset-scenario-demo.mjs`);
    if (!report.octoberRestored) throw new Error("October differs after the take - check the demo data!");
    if (report.acceptRequests) throw new Error(`${report.acceptRequests} accept request(s) were sent - check the demo data!`);
    log(`deleted ${created.length} scenario(s); none active, October unchanged (${before.length} works, ${breaksBefore} real absences)`);
  }
}

const outsidePlanWeek = (data) => [
  ...snapshotOf(data, { from: NOVEMBER_FIRST, until: addDays(PLAN_WEEK.from, -1) }),
  ...snapshotOf(data, { from: addDays(PLAN_WEEK.until, 1), until: NOVEMBER_LAST }),
].sort();

async function takeSimplePlanningProgress(take) {
  const { page, api, options, recorder, mouse, report, captions, scale } = take;
  if (!captions) throw new Error(`${VIDEO_SIMPLE_PLANNING_PROGRESS} needs captions`);
  const demoGroupId = options.groupId;
  const weekGroup = await requireWeekGroup(api, demoGroupId);
  const weekTake = { ...take, options: { ...options, groupId: weekGroup.id } };
  report.weekGroup = { id: weekGroup.id, name: weekGroup.name };
  const first = await openPlanWeek(weekTake);
  const strangers = (await activeScenarios(api, weekGroup.id)).filter((scenario) => dateKey(scenario.fromDate) > PLAN_WEEK.until || dateKey(scenario.untilDate) < PLAN_WEEK.from);
  if (strangers.length > 0) throw new Error(`${strangers.length} active scenario(s) outside the plan week exist for "${weekGroup.name}" - run reset-scenario-demo.mjs`);
  const octoberFilter = groupMonthFilter(first.filter, demoGroupId, OCTOBER);
  const novemberFilter = groupMonthFilter(first.filter, demoGroupId, NOVEMBER);
  const octoberBefore = snapshotOf(await api.schedule(octoberFilter), OCTOBER_RANGE);
  if (octoberBefore.length !== OCTOBER_RANGE.expectedWorks) throw new Error(`October of the demo group has ${octoberBefore.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  await resetPlanWeek(api, weekGroup.id, first.filter, report);
  report.absencesAndNotes = await assertNoAbsencesOrNotes(api, await api.schedule(realFilter(first.filter)));
  const outsideBefore = outsidePlanWeek(await api.schedule(novemberFilter));
  const { filter } = await openPlanWeek(weekTake);
  if ((await page.locator(SEL_WIZARD_BUTTON).count()) === 0) throw new Error("the AutoWizard button is not shown - the demo account needs the Admin role");
  if ((await page.locator(SEL_WIZARD_DROPDOWN).count()) > 0) throw new Error("the wizard button is in dropdown mode - reload the page");
  let jobId = null;
  page.on("request", (request) => {
    if (request.method() === HTTP_POST && SCENARIO_ACCEPT_PATH.test(new URL(request.url()).pathname)) report.acceptRequests = (report.acceptRequests ?? 0) + 1;
  });

  await recorder.start();
  try {
    await page.waitForTimeout(PROGRESS_BEAT.intro);
    await captions.show(SIMPLE_PLANNING_PROGRESS_CUES.start);
    const started = page.waitForResponse((response) => response.request().method() === HTTP_POST && AUTO_WIZARD_START_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
    started.catch(() => {});
    await mouse.clickLocator(page.locator(SEL_WIZARD_BUTTON), MOVE.normal);
    const startResponse = await started;
    if (!startResponse.ok()) throw new Error(`the AutoWizard start returned HTTP ${startResponse.status()}`);
    report.startRequest = startResponse.request().postDataJSON();
    jobId = (await startResponse.json()).jobId;
    if (report.startRequest?.groupId !== weekGroup.id) throw new Error(`the AutoWizard was started for group ${report.startRequest?.groupId} instead of the weekly group ${weekGroup.id}`);
    if (report.startRequest?.periodFrom !== PLAN_WEEK.from || report.startRequest?.periodUntil !== PLAN_WEEK.until) {
      throw new Error(`the AutoWizard was started for ${report.startRequest?.periodFrom}..${report.startRequest?.periodUntil} instead of the plan week`);
    }
    report.progressLineShown = await page.locator(SEL_PROGRESS_LINE).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS }).then(() => true, () => false);
    if (!report.progressLineShown) flag(report, "the progress line did not appear after the start");
    await mouse.moveTo({ x: PROGRESS_CROP_CSS.x + PROGRESS_CROP_CSS.width / HALF, y: PROGRESS_CROP_CSS.height / HALF }, MOVE.normal);
    await page.waitForTimeout(PROGRESS_BEAT.start);
    await captions.show(SIMPLE_PLANNING_PROGRESS_CUES.progress);
    await page.waitForTimeout(PROGRESS_BEAT.progress);
    report.progressLineAfterRealTime = await page.locator(SEL_PROGRESS_LINE).isVisible();
    if (!report.progressLineAfterRealTime) flag(report, "the progress line was gone before the time-compressed part started");
    await recorder.beginFast(FAST_FACTOR_WIZARD);
    let job;
    try {
      job = await waitForJob(api, page, jobId);
      await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: BANNER_TIMEOUT_MS }).catch(() => {});
      await page.waitForTimeout(CANVAS_SETTLE_MS);
    } finally {
      await recorder.endFast();
    }
    report.job = { id: jobId, status: job?.status ?? null, reason: job?.reason ?? null, finalScenarioId: job?.result?.finalScenarioId ?? null, harmonizationSkipped: job?.result?.harmonizationSkipped ?? null };
    log(`job ${jobId}: ${report.job.status}`);
    if (job?.status !== JOB_STATUS_COMPLETED || !report.job.finalScenarioId) throw new Error(`the AutoWizard did not complete (${report.job.status})`);
    const scenario = await getScenario(api, report.job.finalScenarioId);
    report.scenario = { name: scenario.name, groupId: scenario.groupId, from: dateKey(scenario.fromDate), until: dateKey(scenario.untilDate) };
    report.bannerShown = await page.locator(SEL_BANNER).isVisible();
    if (!report.bannerShown) flag(report, "the scenario banner did not appear after the run");
    report.progressLineAfterRun = await page.locator(SEL_PROGRESS_LINE).isVisible();
    if (report.progressLineAfterRun) flag(report, "the progress line is still shown after the run completed");
    report.plannedWorksInScenario = worksIn(await api.schedule(scenarioFilter(filter, scenario.token)), PLAN_WEEK.from, PLAN_WEEK.until).length;
    if (report.plannedWorksInScenario === 0) flag(report, "the scenario holds no works in the plan week");
    await captions.show(SIMPLE_PLANNING_PROGRESS_CUES.result);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(PROGRESS_BEAT.result);
    report.publishable = !report.failure;
  } finally {
    const crop = Object.fromEntries(Object.entries(PROGRESS_CROP_CSS).map(([key, value]) => [key, value * scale]));
    await recorder.stop({ posterAt: report.posterAt ?? null, crop });
    if (jobId) report.jobStopped = await stopJob(api, jobId);
    await resetPlanWeek(api, weekGroup.id, filter, report);
    report.octoberRestored = sameSnapshot(octoberBefore, snapshotOf(await api.schedule(octoberFilter), OCTOBER_RANGE));
    report.outsideWeekRestored = sameSnapshot(outsideBefore, outsidePlanWeek(await api.schedule(novemberFilter)));
    if (report.acceptRequests) throw new Error(`${report.acceptRequests} accept request(s) were sent - check the demo data!`);
    if (!report.octoberRestored || !report.outsideWeekRestored) throw new Error("October or November outside the plan week of the demo group changed during the take - check the demo data!");
    log("plan week reset; October and November outside the plan week of the demo group unchanged");
  }
}

export const SIMPLE_STORY_TAKE_RUNNERS = {
  [VIDEO_SIMPLE_COVER_ABSENCE]: takeSimpleCoverAbsence,
  [VIDEO_SIMPLE_PLANNING_PROGRESS]: takeSimplePlanningProgress,
};
