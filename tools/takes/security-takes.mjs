// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip "Der Dezember steht" (series Monatsplanung, security demo Bern, lib/security-demo.mjs). It needs a throw-away copy of the stage database
 * klacks_marketing_security_bern_m3 (the accept replaces December, so the master is never recorded on) and --group-id of "Bern Objektschutz".
 * security-month-plan (1280x720): the cut page of the 24-hour object order shows its three shifts; the schedule of December opens with the slider at 50 and the shift
 * area collapsed so all ten rows fit. Detail stretches raise the row slider of the app to 100 in the picture (cursor at the slider, arrow keys) and scroll to their rows: text
 * at 50 % is not readable at 1280 px even under a 2x crop. The take shows the guaranteed hours at 100, back at 50 the planning commands are switched on and the end of the month shows the
 * booked vacation; the AutoWizard button (never the chat) plans the month, time-compressed with the badge; the proposal opens as a scenario, the take shows the vacation and the
 * commands that stayed at 100 (Mia's FREE day, then the vacation rows), switches the commands off (a day with work and command needs a higher row), the planned rows with their hours,
 * back at 50 it scrolls down to the last two rows (the banner takes their room), the summary dialog and accepts once through the banner; the way back to the start of the month, the wait for the reloaded plan and a page reload after the accept (it drops the row a command made taller, so all ten rows stand in the last picture) are cut.
 * Publishable criterion (report.publishable, every part is read from the API, not from the screen): before the accept the start request names the group of the take, December
 * 1-31, 10 agents and 6 shifts; the scenario belongs to that group and lies inside December; the real December is still empty; stage 3 ran; exactly one accept
 * request, scenario status Accepted, real December works > 0; every vacation day booked with no work inside; every planning command held; no error toast; every slot of
 * the job summary filled (report.coverage; the wizard is not deterministic, KLACKS_SECURITY_ACCEPT_GAP=1 lets a take with a gap pass, the summary dialog states the gap then). Layout findings (rows out of view, a row made taller by a command) only land in report.layoutNotes, they never block a take. report.perPerson lists the hours that
 * the row headers draw, so a caption never has to guess them. An accept refused with HTTP 409 aborts the take (no override is ever clicked).
 * @param take - page, api, options, recorder, mouse, report, captions, viewport, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { CANVAS_SETTLE_MS, HALF, HTTP_POST, dateKey, gridBox, openSchedule, rowBoxes, worksIn } from "../lib/schedule-grid.mjs";
import { JOB_STATUS_COMPLETED, SCENARIO_STATUS_ACCEPTED, activeScenarios, getScenario, periodHours, realFilter, scenarioFilter, stopJob, waitForJob } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import * as P from "../lib/security-plan-check.mjs";
import { clickSelector, decideViaBanner, expectBanner, flag, holdWithPoster, trackNetwork } from "./scenario-takes.mjs";

export const VIDEO_SECURITY_MONTH_PLAN = "security-month-plan";
export const SECURITY_VIDEOS = [VIDEO_SECURITY_MONTH_PLAN];
export const SECURITY_MONTH_PLAN_CUES = Object.freeze({
  cut: "cut",
  team: "team",
  targets: "targets",
  wishes: "wishes",
  run: "run",
  proposal: "proposal",
  free: "free",
  vacation: "vacation",
  filled: "filled",
  overview: "overview",
  summary: "summary",
  accept: "accept",
});
export const SECURITY_MONTH_PLAN_FINAL_HOLD_MS = 3500;
export const SECURITY_VIEWPORT = Object.freeze({ width: 1280, height: 720 });

const CUT_ROUTE = "/workplace/cut-shift";
const SEL_CUT_ROWS = "app-cut-shift-table tbody tr";
const SEL_WIZARD_BUTTON = "#schedule-wizard-btn";
const SEL_WIZARD_DROPDOWN = ".wizard-dropdown";
const SEL_COMMANDS_TOGGLE = "#schedule-commands-toggle";
const SEL_BANNER = "#scenario-banner";
const SEL_SUMMARY_BUTTON = "#scenario-banner-summary-btn";
const SEL_SUMMARY_TOTAL = "#scenario-summary-total";
const SEL_SUMMARY_CLOSE = "#scenario-summary-close-btn";
const SEL_MODAL = "ngb-modal-window";
const SEL_ZOOM_POINTER = "#schedule-zoom-slider .ngx-slider-pointer";
const SEL_ZOOM_VALUE = "#schedule-zoom-slider .ngx-slider-model-value";
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const SEL_TOASTS = "app-toasts";
const SPLIT_DIRECTION_VERTICAL = "vertical";
const KEY_HOME = "Home";
const SHIFT_LIST_API = "/api/backend/Shifts/GetSimpleList";
const GROUPS_API = "/api/backend/Groups";
const AUTO_WIZARD_START_PATH = /\/AutoWizard\/Start/i;
const SHIFT_LIST_PAGE_SIZE = 100;
const OBJECT_FIRST_PART = "OBT";
const CUT = Number.POSITIVE_INFINITY;
const FAST_FACTOR_WIZARD = 40;
const ENV_ACCEPT_GAP = "KLACKS_SECURITY_ACCEPT_GAP";
const TEAM_SIZE = 10;
const PLANNED_SHIFTS = 6;
const CUT_ROWS_PER_PART = 2;
const VACATION_FIRST_ROW_NAME = "Amir";
const CUT_PARTS = 3;
const VIEWPORT_OVERSHOOT_PX = 40;
const KEY_ARROW_RIGHT = "ArrowRight";
const SLIDER_STEPS_TO_DETAIL = 5;
const SLIDER_KEY_PAUSE_MS = 130;
const SLIDER_DETAIL_VALUE = 100;
const SLIDER_OVERVIEW_VALUE = 50;
const WHEEL = Object.freeze({ deltaPx: 60, pauseMs: 70, columnsToMidMonth: 11, columnsToMonthEnd: 11, columnsHome: 22, maxRowTicks: 30, overviewTickPx: 25 });
const GRID_TOP_MARGIN_PX = 44;
const SAVE_TIMEOUT_MS = 30000;
const BANNER_TIMEOUT_MS = 60000;
const HTTP_ERROR_FIRST = 400;
const ERROR_TOAST = /fehlgeschlagen|fehler|konnte nicht|nicht m.glich|failed|error/i;
const BEAT = { open: 600, cut: 4500, team: 2200, slider: 500, targets: 3200, toggle: 400, wishes: 2200, run: 1000, proposal: 2400, free: 3000, vacation: 3000, scrolled: 500, filled: 3500, overview: 2200, summary: 4000, closed: 400, acceptLead: 800 };
const MOVE = { short: 400, normal: 650 };

const log = (...args) => console.log("  ", ...args);
const fullName = (client) => `${client.firstName} ${client.name}`;
const rowsOf = (data, type) => data.entries.filter((entry) => entry.entryType === type);

/** The list of sealed orders does not carry the cut order; the first part of the cut points to it (originalId), as on the shift list of the app. */
async function sealedObjectOrderId(api) {
  const result = await api.json(SHIFT_LIST_API, {
    method: HTTP_POST,
    data: {
      searchString: OBJECT_FIRST_PART,
      filterType: 1,
      activeDateRange: true,
      formerDateRange: true,
      futureDateRange: true,
      includeClientName: false,
      isSealedOrder: false,
      isTimeRange: false,
      isSporadic: false,
      numberOfItemsPerPage: SHIFT_LIST_PAGE_SIZE,
      requiredPage: 0,
      orderBy: "",
      sortOrder: "",
    },
  });
  const part = (result?.shifts ?? []).find((shift) => shift.abbreviation === OBJECT_FIRST_PART && shift.originalId);
  if (!part) throw new Error(`the cut part ${OBJECT_FIRST_PART} of the object order is missing`);
  return part.originalId;
}

function rowIndexOf(clients, firstName) {
  const index = clients.findIndex((client) => client.firstName === firstName);
  if (index < 0) throw new Error(`${firstName} is not in the schedule of the group`);
  return index;
}

function memberIdsOf(clients, site) {
  const ids = {};
  for (const member of site.team) {
    const client = clients.find((entry) => entry.firstName === member.firstName && entry.name === member.name);
    if (!client) throw new Error(`${member.firstName} ${member.name} is not in the schedule of the group`);
    ids[member.key] = client.id;
  }
  return ids;
}

/** Everything the take may assume about the stage; a mismatch refuses the take before anything is recorded. */
export async function checkStage(take, site) {
  const { api, options, report } = take;
  const group = await api.json(`${GROUPS_API}/${options.groupId}`);
  if (group.name !== site.group.name) throw new Error(`--group-id is "${group.name}", this take needs "${site.group.name}" on a copy of its stage database`);
  const active = await activeScenarios(api, options.groupId);
  if (active.length > 0) throw new Error(`${active.length} active scenario(s) exist for ${group.name} - use a fresh copy of the stage database`);
  report.group = { id: group.id, name: group.name };
}

async function checkDecember(take, site, filter) {
  const { api, report } = take;
  if (filter.periodStartDate !== D.PERIOD.from || filter.periodEndDate !== D.PERIOD.until) {
    throw new Error(`the schedule shows ${filter.periodStartDate}..${filter.periodEndDate} instead of December - an AutoWizard run would plan and accept the wrong period`);
  }
  const decemberFilter = realFilter(filter);
  const data = await take.api.schedule(decemberFilter);
  if (data.clients.length !== TEAM_SIZE) throw new Error(`the group shows ${data.clients.length} employees instead of ${TEAM_SIZE}`);
  const works = worksIn(data, D.PERIOD.from, D.PERIOD.until).length;
  if (works !== 0) throw new Error(`December holds ${works} works - use a fresh copy of the stage database`);
  const commands = rowsOf(data, P.ENTRY_TYPE_COMMAND).length;
  if (commands !== site.commands.length) throw new Error(`December holds ${commands} planning commands instead of ${site.commands.length}`);
  report.stage = { employees: data.clients.map(fullName), breaks: rowsOf(data, P.ENTRY_TYPE_BREAK).length, commands, api: api.constructor.name };
  return { decemberFilter, memberIds: memberIdsOf(data.clients, site), vacationRow: rowIndexOf(data.clients, VACATION_FIRST_ROW_NAME) };
}

/** Minimum zoom and collapsed shift area: the only layout in which all ten rows fit into 720 px. Runs inside a cut region. */
export async function fitAllRows(take) {
  const { page, mouse } = take;
  const pointer = page.locator(SEL_ZOOM_POINTER).first();
  await pointer.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await pointer.focus();
  await page.keyboard.press(KEY_HOME);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const gutters = await page.locator(SEL_SPLIT_GUTTER).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, direction: element.parentElement?.getAttribute("direction") };
  }));
  const gutter = gutters.find((candidate) => candidate.direction === SPLIT_DIRECTION_VERTICAL);
  if (!gutter) throw new Error("the splitter between the grid and the shift area was not found");
  await mouse.drag({ x: gutter.x, y: gutter.y }, { x: gutter.x, y: take.viewport.height + VIEWPORT_OVERSHOOT_PX }, MOVE.normal);
  await page.locator(SEL_ZOOM_POINTER).first().evaluate((element) => element.blur());
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

export async function measure(take, label) {
  const grid = await gridBox(take.page);
  const rows = await rowBoxes(take.page);
  (take.report.geometry ??= []).push({ label, grid, rows: rows.map((row) => Math.round(row.top)), rowHeight: rows[0]?.height, lastBottom: Math.round(rows.at(-1).top + rows.at(-1).height) });
}

async function assertAllRowsFit(take) {
  await measure(take, "rows");
  const { lastBottom } = take.report.geometry.at(-1);
  if (lastBottom > take.viewport.height) (take.report.layoutNotes ??= []).push(`the ten rows end at ${lastBottom} px, below the ${take.viewport.height} px frame`);
}

async function pointWheelAtGrid(take) {
  const grid = await gridBox(take.page);
  await take.mouse.moveTo({ x: grid.x + grid.width / HALF, y: grid.y + grid.height / HALF }, MOVE.normal);
  return grid;
}

/** One wheel tick moves the grid by exactly one column. */
export async function scrollColumns(take, ticks, direction) {
  await pointWheelAtGrid(take);
  for (let tick = 0; tick < ticks; tick++) {
    await take.page.mouse.wheel(direction * WHEEL.deltaPx, 0);
    await take.page.waitForTimeout(WHEEL.pauseMs);
  }
  await take.page.waitForTimeout(BEAT.scrolled);
}

/** Wheel steps of the row scrollbar are not whole rows, so the rows are measured after every tick until the goal is met. */
async function scrollRowsUntil(take, direction, reached, label) {
  const { page, report } = take;
  await pointWheelAtGrid(take);
  for (let tick = 0; tick < WHEEL.maxRowTicks; tick++) {
    if (reached(await rowBoxes(page), await gridBox(page))) {
      await page.waitForTimeout(BEAT.scrolled);
      return;
    }
    await page.mouse.wheel(0, direction * WHEEL.deltaPx);
    await page.waitForTimeout(WHEEL.pauseMs);
  }
  (report.layoutNotes ??= []).push(`the rows could not be scrolled to "${label}"`);
}

const rowsAtTop = (take) => scrollRowsUntil(take, -1, (rows, grid) => rows[0].top >= grid.y, "first row");
const rowAtTop = (take, index) => scrollRowsUntil(take, 1, (rows, grid) => rows[index].top <= grid.y + GRID_TOP_MARGIN_PX, `row ${index}`);

/** Scrolling on until the name column reports the goal would run the canvas past its last row (dark band), so the ticks are computed once from the unscrolled rows. */
async function lastRowInView(take) {
  const { page } = take;
  const rows = await rowBoxes(page);
  const grid = await gridBox(page);
  const ticks = Math.ceil((rows.at(-1).top + rows.at(-1).height - (grid.y + grid.height)) / WHEEL.overviewTickPx);
  await pointWheelAtGrid(take);
  for (let tick = 0; tick < ticks; tick++) {
    await page.mouse.wheel(0, WHEEL.deltaPx);
    await page.waitForTimeout(WHEEL.pauseMs);
  }
  await page.waitForTimeout(BEAT.scrolled);
}

/** The visible operation of the row slider of the header: the cursor goes to the handle, the keyboard moves it in steps of 10. */
export async function setRowSlider(take, detail) {
  const { page, mouse, report } = take;
  const pointer = page.locator(SEL_ZOOM_POINTER).first();
  await mouse.clickLocator(pointer, MOVE.normal);
  await pointer.focus();
  if (detail) {
    for (let step = 0; step < SLIDER_STEPS_TO_DETAIL; step++) {
      await page.keyboard.press(KEY_ARROW_RIGHT);
      await page.waitForTimeout(SLIDER_KEY_PAUSE_MS);
    }
  } else {
    await page.keyboard.press(KEY_HOME);
  }
  await pointer.evaluate((element) => element.blur());
  await page.waitForTimeout(BEAT.slider);
  const value = Number((await page.locator(SEL_ZOOM_VALUE).first().innerText()).trim());
  (report.sliderSteps ??= []).push({ detail, value });
  if (value !== (detail ? SLIDER_DETAIL_VALUE : SLIDER_OVERVIEW_VALUE)) throw new Error(`the row slider shows ${value} instead of ${detail ? SLIDER_DETAIL_VALUE : SLIDER_OVERVIEW_VALUE}`);
}

/** The noise CSS hides toasts, a hidden error is still an error: every toast text is collected and an error text fails the take. */
export async function watchToasts(page) {
  await page.evaluate((selector) => {
    window.__captureToasts = [];
    const read = () => {
      const text = document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim();
      if (text && !window.__captureToasts.includes(text)) window.__captureToasts.push(text);
    };
    new MutationObserver(read).observe(document.body, { childList: true, subtree: true, characterData: true });
  }, SEL_TOASTS);
}

export async function readToasts(take) {
  const toasts = await take.page.evaluate(() => window.__captureToasts ?? []);
  take.report.toasts = toasts;
  const errors = toasts.filter((text) => ERROR_TOAST.test(text));
  if (errors.length > 0) flag(take.report, `error toast during the take: ${errors.join(" | ")}`);
}

export function trackHttpErrors(take) {
  take.report.httpErrors = [];
  take.page.on("response", (response) => {
    if (response.status() >= HTTP_ERROR_FIRST) take.report.httpErrors.push(`${response.status()} ${response.request().method()} ${new URL(response.url()).pathname}`);
  });
}

async function startWizard(take, ctx) {
  const { page, mouse, options, report } = take;
  if ((await page.locator(SEL_WIZARD_BUTTON).count()) === 0) throw new Error("the AutoWizard button is not shown - the demo account needs the Admin role");
  if ((await page.locator(SEL_WIZARD_DROPDOWN).count()) > 0) throw new Error("the wizard button is in dropdown mode - reload the page");
  const started = page.waitForResponse((response) => response.request().method() === HTTP_POST && AUTO_WIZARD_START_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  started.catch(() => {});
  await clickSelector(take, SEL_WIZARD_BUTTON, MOVE.normal);
  const response = await started;
  if (!response.ok()) throw new Error(`the AutoWizard start returned HTTP ${response.status()}`);
  const request = response.request().postDataJSON();
  report.startRequest = { groupId: request.groupId, periodFrom: request.periodFrom, periodUntil: request.periodUntil, agents: request.agentIds?.length, shifts: request.shiftIds?.length };
  ctx.jobId = (await response.json()).jobId;
  if (request.groupId !== options.groupId) throw new Error(`the AutoWizard was started for group ${request.groupId} instead of ${options.groupId}`);
  if (request.periodFrom !== D.PERIOD.from || request.periodUntil !== D.PERIOD.until) throw new Error(`the AutoWizard was started for ${request.periodFrom}..${request.periodUntil} instead of December`);
  if (request.agentIds?.length !== TEAM_SIZE || request.shiftIds?.length !== PLANNED_SHIFTS) {
    throw new Error(`the AutoWizard was started with ${request.agentIds?.length} agents and ${request.shiftIds?.length} shifts instead of ${TEAM_SIZE} and ${PLANNED_SHIFTS}`);
  }
  await mouse.moveTo({ x: take.viewport.width / HALF, y: take.viewport.height / HALF }, MOVE.normal);
}

async function waitForProposal(take, ctx) {
  const { page, api, recorder, report, options } = take;
  await recorder.beginFast(FAST_FACTOR_WIZARD);
  let job;
  try {
    job = await waitForJob(api, page, ctx.jobId);
    await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: BANNER_TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(CANVAS_SETTLE_MS);
  } finally {
    await recorder.endFast();
  }
  const result = job?.result;
  const summary = result?.summary ?? {};
  report.job = { id: ctx.jobId, status: job?.status ?? null, reason: job?.reason ?? null, finalScenarioId: result?.finalScenarioId ?? null, finalScenarioName: result?.finalScenarioName ?? null, harmonizationSkipped: result?.harmonizationSkipped ?? null, harmonizationSkippedReason: result?.harmonizationSkippedReason ?? null, complianceViolations: (result?.complianceViolations ?? []).length };
  report.coverage = { filled: summary.filledSlots ?? null, demanded: summary.demandedSlots ?? null, perShift: (summary.shifts ?? []).map((shift) => `${shift.abbreviation} ${shift.filledSlots}/${shift.demandedSlots}`) };
  log(`job ${ctx.jobId}: ${report.job.status}, ${report.coverage.filled}/${report.coverage.demanded} slots`);
  if (report.coverage.filled !== report.coverage.demanded && !process.env[ENV_ACCEPT_GAP]) flag(report, `the plan covers ${report.coverage.filled} of ${report.coverage.demanded} slots; set ${ENV_ACCEPT_GAP} to publish a take with a stated gap`);
  if (job?.status !== JOB_STATUS_COMPLETED || !report.job.finalScenarioId) throw new Error(`the AutoWizard did not complete (${report.job.status}${report.job.reason ? `: ${report.job.reason}` : ""})`);
  if (report.job.harmonizationSkipped !== false) flag(report, `stage 3 did not run: ${report.job.harmonizationSkippedReason ?? report.job.reason ?? "unknown"}`);
  const scenario = await getScenario(api, report.job.finalScenarioId);
  report.scenario = { id: scenario.id, name: scenario.name, groupId: scenario.groupId, from: dateKey(scenario.fromDate), until: dateKey(scenario.untilDate) };
  if (scenario.groupId !== options.groupId) throw new Error(`the scenario belongs to group ${scenario.groupId} instead of ${options.groupId} - accepting it would replace real data of another group`);
  if (report.scenario.from < D.PERIOD.from || report.scenario.until > D.PERIOD.until) throw new Error(`the scenario spans ${report.scenario.from}..${report.scenario.until}, outside December - accepting it would replace real data elsewhere`);
  await expectBanner(take, scenario.name);
  ctx.scenario = scenario;
  return scenario;
}

async function showSummary(take) {
  const { page, report } = take;
  await clickSelector(take, SEL_SUMMARY_BUTTON, MOVE.normal);
  const total = page.locator(SEL_SUMMARY_TOTAL);
  await total.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  report.summaryDialog = (await total.innerText()).trim();
  await take.captions.show(SECURITY_MONTH_PLAN_CUES.summary);
  await page.waitForTimeout(BEAT.summary);
  await clickSelector(take, SEL_SUMMARY_CLOSE, MOVE.short);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(BEAT.closed);
}

/** The published proof of the take: only numbers and states read back from the API after the accept. */
async function verifyAccepted(take, ctx, site, decemberFilter, memberIds) {
  const { api, report } = take;
  report.acceptRequests = ctx.acceptRequests;
  if (ctx.acceptRequests !== 1) flag(report, `${ctx.acceptRequests} accept requests were sent instead of one`);
  report.acceptedStatus = (await getScenario(api, ctx.scenario.id)).status;
  if (report.acceptedStatus !== SCENARIO_STATUS_ACCEPTED) flag(report, `the scenario status is ${report.acceptedStatus} after the accept`);
  const real = await api.schedule(decemberFilter);
  report.realWorksAfterAccept = worksIn(real, D.PERIOD.from, D.PERIOD.until).length;
  if (report.realWorksAfterAccept === 0) flag(report, "no works landed in December after the accept");
  const hours = await periodHours(api, Object.values(memberIds), { from: D.PERIOD.from, until: D.PERIOD.until }, null);
  const evaluation = P.evaluatePlan(real, site, memberIds, hours);
  report.vacationFindings = evaluation.vacationFindings;
  report.vacationCover = evaluation.vacationCover;
  report.commandFindings = evaluation.commandFindings;
  report.openSlots = evaluation.openSlots;
  report.maxWeekHours = evaluation.maxWeekHours;
  report.perPerson = evaluation.perPerson.map((person) => ({ member: person.member, guaranteed: person.target, shown: person.headerPeriodHours, works: person.works, nights: person.nights, longestRun: person.longestRun }));
  if (evaluation.vacationFindings.length > 0) flag(report, `vacation did not hold: ${evaluation.vacationFindings.join("; ")}`);
  if (evaluation.commandFindings.length > 0) flag(report, `planning commands did not hold: ${evaluation.commandFindings.join("; ")}`);
}

export async function takeSecurityMonthPlan(take) {
  const { page, api, options, recorder, mouse, report, captions } = take;
  const site = D.SITES.bern;
  const cues = SECURITY_MONTH_PLAN_CUES;
  await checkStage(take, site);
  const { filter } = await openSchedule(page, options);
  const { decemberFilter, memberIds, vacationRow } = await checkDecember(take, site, filter);
  const orderId = await sealedObjectOrderId(api);
  await page.goto(`${options.uiUrl}${CUT_ROUTE}/${orderId}`, { timeout: S.NAV_TIMEOUT_MS, waitUntil: "domcontentloaded" });
  await page.locator(SEL_CUT_ROWS).nth(CUT_PARTS * CUT_ROWS_PER_PART - 1).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(BEAT.open);
  const ctx = { created: [], reassigned: [], acceptRequests: 0, scheduleTokens: [], realIds: new Set(), originalClient: new Map() };
  trackNetwork(take, ctx);
  trackHttpErrors(take);

  await recorder.start();
  try {
    await captions.show(cues.cut);
    await page.waitForTimeout(BEAT.cut);
    await recorder.beginFast(CUT);
    await captions.hide();
    await openSchedule(page, options);
    await fitAllRows(take);
    await watchToasts(page);
    await recorder.endFast();
    await assertAllRowsFit(take);

    await captions.show(cues.team);
    await page.waitForTimeout(BEAT.team);
    await captions.show(cues.targets);
    await setRowSlider(take, true);
    await page.waitForTimeout(BEAT.targets);

    await captions.show(cues.wishes);
    await setRowSlider(take, false);
    await clickSelector(take, SEL_COMMANDS_TOGGLE, MOVE.normal);
    await page.waitForTimeout(BEAT.toggle);
    await scrollColumns(take, WHEEL.columnsToMidMonth, 1);
    await measure(take, "commands on, end of the month");
    await page.waitForTimeout(BEAT.wishes);

    await captions.show(cues.run);
    await page.waitForTimeout(BEAT.run);
    await startWizard(take, ctx);
    const scenario = await waitForProposal(take, ctx);
    await measure(take, "proposal");
    report.scenarioLoaded = ctx.scheduleTokens.includes(scenario.token);
    if (!report.scenarioLoaded) flag(report, "the schedule never loaded the AutoWizard scenario after the banner appeared");
    report.plannedWorksInScenario = worksIn(await api.schedule(scenarioFilter(decemberFilter, scenario.token)), D.PERIOD.from, D.PERIOD.until).length;
    if (report.plannedWorksInScenario === 0) flag(report, "the scenario holds no works in December");
    report.realWorksBeforeAccept = worksIn(await api.schedule(decemberFilter), D.PERIOD.from, D.PERIOD.until).length;
    if (report.realWorksBeforeAccept !== 0) flag(report, "the real December is not empty before the accept");

    await captions.show(cues.proposal);
    await page.waitForTimeout(BEAT.proposal);
    await captions.show(cues.free);
    await setRowSlider(take, true);
    await measure(take, "detail, FREE day");
    await page.waitForTimeout(BEAT.free);
    await captions.show(cues.vacation);
    await scrollColumns(take, WHEEL.columnsToMonthEnd, 1);
    await rowAtTop(take, vacationRow);
    await page.waitForTimeout(BEAT.vacation);

    await recorder.beginFast(CUT);
    await clickSelector(take, SEL_COMMANDS_TOGGLE, MOVE.short);
    await scrollColumns(take, WHEEL.columnsHome, -1);
    await rowsAtTop(take);
    await recorder.endFast();
    await captions.show(cues.filled);
    await page.waitForTimeout(BEAT.filled);

    await captions.show(cues.overview);
    await setRowSlider(take, false);
    await lastRowInView(take);
    await measure(take, "overview, last rows");
    await page.waitForTimeout(BEAT.overview);
    await showSummary(take);

    await captions.show(cues.accept);
    await page.waitForTimeout(BEAT.acceptLead);
    await decideViaBanner(take, "accept", { cutReload: true });
    await measure(take, "accepted");
    await verifyAccepted(take, ctx, site, decemberFilter, memberIds);
    await readToasts(take);
    await recorder.beginFast(CUT);
    await openSchedule(page, options);
    await fitAllRows(take);
    await recorder.endFast();
    await mouse.moveTo({ x: take.viewport.width / HALF, y: take.viewport.height / HALF }, MOVE.normal);
    await holdWithPoster(take, take.finalHoldMs);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale } });
    if (ctx.jobId && !ctx.scenario) report.jobStopped = await stopJob(api, ctx.jobId).catch((error) => error.message);
  }
}

export const SECURITY_TAKE_RUNNERS = {
  [VIDEO_SECURITY_MONTH_PLAN]: takeSecurityMonthPlan,
};
