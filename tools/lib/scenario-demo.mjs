// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared helpers of the scenario takes (takes/scenario-takes.mjs, reset-scenario-demo.mjs): the scenario REST calls, token-aware
 * schedule reads (real data is always read with analyseToken = null, scenario data with the scenario's token), period hours per token,
 * the free-move and rest-conflict pickers (the rest-conflict picker is shared with takes/rule-takes.mjs), the plan-week reset and the AutoWizard
 * job polling. capture-app-videos.mjs keeps its own copies of the plan-week reset and the job polling because it runs main() on import and
 * cannot be imported.
 * @param api - authenticated ScheduleApi (see lib/schedule-grid.mjs): json(), schedule(filter)
 * @param groupId - demo group whose scenarios are read, created and deleted
 * @param token - analyse token of a scenario (null reads the real plan)
 */

import { HTTP_DELETE, HTTP_POST, WORKS_API, dateKey, monthFilter, worksIn } from "./schedule-grid.mjs";

export const SCENARIOS_API = "/api/backend/AnalyseScenarios";
export const PERIOD_HOURS_API = "/api/backend/Works/PeriodHours";
export const AUTO_WIZARD_STATUS_API = "/api/backend/AutoWizard/Status";
export const AUTO_WIZARD_CANCEL_API = "/api/backend/AutoWizard/Cancel";
export const SCENARIO_STATUS_ACTIVE = 0;
export const SCENARIO_STATUS_ACCEPTED = 1;
export const JOB_STATUS_RUNNING = "running";
export const JOB_STATUS_COMPLETED = "completed";
export const SCHEDULE_ROW_LIMIT = 500;
export const JOB_POLL_MS = 5000;
export const JOB_READY_TIMEOUT_MS = 16 * 60 * 1000;
const JOB_CANCEL_TIMEOUT_MS = 2 * 60 * 1000;

export const OCTOBER = { year: 2026, month: 10, isoWeek: 41 };
export const NOVEMBER = { year: 2026, month: 11, isoWeek: 45 };
export const OCTOBER_RANGE = { from: "2026-10-01", until: "2026-10-31", expectedWorks: 118 };
export const PLAN_WEEK = { from: "2026-11-02", until: "2026-11-08" };

const ISO_SUNDAY = 7;
const DAYS_PER_WEEK = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const MS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * MINUTES_PER_HOUR * 1000;
const MIN_REST_HOURS = 11;
const PREFERRED_REST_HOURS = 9;
const MIN_REST_DAYS_PER_WEEK = 2;
const MAX_CONSECUTIVE_DAYS = 6;
const ISO_DATE_LENGTH = 10;
const DEFAULT_FREE_DAYS_AROUND = 1;

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, ISO_DATE_LENGTH);
}

export const dayDiff = (fromIso, toIso) => Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / MS_PER_DAY);

function hoursOf(time) {
  const [h, m] = String(time).split(":").map(Number);
  return h + m / MINUTES_PER_HOUR;
}

function isoWeekDays(isoDate) {
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay() || ISO_SUNDAY;
  const monday = addDays(isoDate, 1 - weekday);
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) => addDays(monday, i));
}

export function realFilter(base, extra = {}) {
  return { ...base, startRow: 0, rowCount: SCHEDULE_ROW_LIMIT, ...extra, analyseToken: null };
}

export function scenarioFilter(base, token, extra = {}) {
  return { ...base, startRow: 0, rowCount: SCHEDULE_ROW_LIMIT, ...extra, analyseToken: token };
}

export const monthRealFilter = (base, period) => realFilter(base, { selectedGroup: base.selectedGroup, ...monthFilter(period) });

export async function listScenarios(api, groupId) {
  return (await api.json(`${SCENARIOS_API}?groupId=${groupId}`)) ?? [];
}

export async function activeScenarios(api, groupId) {
  return (await listScenarios(api, groupId)).filter((scenario) => scenario.status === SCENARIO_STATUS_ACTIVE);
}

export function createScenario(api, { name, groupId, fromDate, untilDate }) {
  return api.json(SCENARIOS_API, { method: HTTP_POST, data: { name, groupId, fromDate, untilDate } });
}

export function getScenario(api, id) {
  return api.json(`${SCENARIOS_API}/${id}`);
}

export function deleteScenario(api, id) {
  return api.json(`${SCENARIOS_API}/${id}`, { method: HTTP_DELETE });
}

export function reassignWork(api, workId, targetClientId) {
  return api.json(`${WORKS_API}/${workId}/ReassignClient`, { method: HTTP_POST, data: { targetClientId } });
}

export function deleteWork(api, workId, period) {
  return api.json(`${WORKS_API}/${workId}?periodStart=${period.from}&periodEnd=${period.until}`, { method: HTTP_DELETE });
}

export async function periodHours(api, clientIds, range, token) {
  return api.json(PERIOD_HOURS_API, {
    method: HTTP_POST,
    data: { clientIds, startDate: range.from, endDate: range.until, analyseToken: token ?? undefined },
  });
}

export function sameWork(a, b) {
  return a.clientId === b.clientId && dateKey(a.entryDate) === dateKey(b.entryDate) && a.startTime === b.startTime && a.endTime === b.endTime;
}

/**
 * Finds the scenario copy of a real work: scenario works get new ids and cloned shifts, so the match is client + day + times.
 * Exactly one copy must exist, otherwise the drag target would be ambiguous.
 */
export function scenarioCopyOf(scenarioData, realWork, range) {
  const copies = worksIn(scenarioData, range.from, range.until).filter((work) => sameWork(work, realWork));
  if (copies.length !== 1) throw new Error(`expected one scenario copy of work ${realWork.id}, found ${copies.length}`);
  return copies[0];
}

export const workIdSet = (data, range) => new Set(worksIn(data, range.from, range.until).map((work) => work.id));

function entriesOfClientDay(data, clientId, day) {
  return data.entries.filter((entry) => entry.clientId === clientId && dateKey(entry.entryDate) === day);
}

/**
 * Picks a work that can be moved to an adjacent employee without any side effect worth noticing: the source cell holds exactly one entry,
 * the target employee has no entry on that day or the days around it (so no rest or consecutive-day finding appears) and is a group
 * member on that day. Only the top visible rows and the first visible days are considered, so the cells stay on screen when the
 * scenario banner makes the grid shorter.
 * @param constraints - maxRow (last employee row considered), maxDay (last day index considered), targets (how many target employees to return), optional freeDaysAround (days before and after that must be free for a target, default 1), optional maxSpan (largest allowed distance between the first and last row involved, so all rows fit on screen together)
 */
export function pickFreeMove(data, filter, constraints) {
  const rowOf = new Map(data.clients.map((client, index) => [client.id, index]));
  const candidates = [];
  const works = worksIn(data, filter.periodStartDate, filter.periodEndDate)
    .filter((work) => !work.isReplacementEntry && !work.isGroupRestricted && !work.lockLevel);
  for (const work of works) {
    const row = rowOf.get(work.clientId);
    const day = dateKey(work.entryDate);
    const dayIndex = dayDiff(filter.periodStartDate, day);
    if (row === undefined || row > constraints.maxRow || dayIndex < 0 || dayIndex > constraints.maxDay) continue;
    if (entriesOfClientDay(data, work.clientId, day).length !== 1) continue;
    const targets = [];
    for (let targetRow = 0; targetRow <= constraints.maxRow; targetRow++) {
      const target = data.clients[targetRow];
      if (!target || targetRow === row) continue;
      if (target.groupItemValidFrom && dateKey(target.groupItemValidFrom) > day) continue;
      const reach = constraints.freeDaysAround ?? DEFAULT_FREE_DAYS_AROUND;
      const around = Array.from({ length: 2 * reach + 1 }, (_, index) => addDays(day, index - reach));
      if (around.some((d) => entriesOfClientDay(data, target.id, d).length > 0)) continue;
      targets.push({ row: targetRow, client: target });
    }
    if (targets.length < constraints.targets) continue;
    targets.sort((a, b) => Math.abs(a.row - row) - Math.abs(b.row - row));
    const chosen = targets.slice(0, constraints.targets);
    const rows = [row, ...chosen.map((target) => target.row)];
    if (constraints.maxSpan !== undefined && Math.max(...rows) - Math.min(...rows) > constraints.maxSpan) continue;
    candidates.push({ work, row, client: data.clients[row], day, dayIndex, targets: chosen });
  }
  candidates.sort((a, b) => a.dayIndex - b.dayIndex || a.row - b.row);
  if (candidates.length === 0) throw new Error(`no work in rows 0-${constraints.maxRow} / days 0-${constraints.maxDay} can be moved to ${constraints.targets} free employee(s)`);
  return candidates[0];
}

function busyRun(busy, clientId, fromIso, step) {
  let run = 0;
  for (let day = addDays(fromIso, step); busy.has(`${clientId}|${day}`); day = addDays(day, step)) run++;
  return run;
}

function keepsOtherRules(busy, clientId, day) {
  const freeDays = isoWeekDays(day).filter((d) => !busy.has(`${clientId}|${d}`)).length;
  const consecutive = busyRun(busy, clientId, day, -1) + 1 + busyRun(busy, clientId, day, 1);
  return freeDays - 1 >= MIN_REST_DAYS_PER_WEEK && consecutive <= MAX_CONSECUTIVE_DAYS;
}

/**
 * Rest-conflict picker (moving the early shift onto the late client's free next day produces exactly
 * one rest-time warning and no other finding); only pairs whose rows are at most maxRowDistance apart and whose day lies
 * within the first maxDay days qualify, so both rows and the drop day fit on screen next to the error list.
 */
export function pickRestConflict(data, filter, constraints) {
  const works = worksIn(data, filter.periodStartDate, filter.periodEndDate)
    .filter((e) => !e.isReplacementEntry && !e.isGroupRestricted && !e.lockLevel);
  const rowOf = new Map(data.clients.map((c, i) => [c.id, i]));
  const busy = new Set(data.entries.map((e) => `${e.clientId}|${dateKey(e.entryDate)}`));
  const candidates = [];
  for (const late of works) {
    const lateEnd = hoursOf(late.endTime);
    if (lateEnd <= hoursOf(late.startTime)) continue;
    const day = dateKey(late.entryDate);
    const next = addDays(day, 1);
    if (dayDiff(filter.periodStartDate, next) > constraints.maxDay) continue;
    if (busy.has(`${late.clientId}|${next}`)) continue;
    if (!keepsOtherRules(busy, late.clientId, next)) continue;
    const lateRow = rowOf.get(late.clientId);
    const lateClient = data.clients[lateRow];
    if (lateClient?.groupItemValidFrom && dateKey(lateClient.groupItemValidFrom) > next) continue;
    for (const early of works) {
      if (early.clientId === late.clientId || dateKey(early.entryDate) !== next) continue;
      const rest = HOURS_PER_DAY - lateEnd + hoursOf(early.startTime);
      if (rest >= MIN_REST_HOURS) continue;
      const earlyRow = rowOf.get(early.clientId);
      if (Math.abs(lateRow - earlyRow) > constraints.maxRowDistance) continue;
      candidates.push({
        late, early, rest, day, next, lateClient, lateRow, earlyRow,
        earlyClient: data.clients[earlyRow],
        score: [Math.abs(rest - PREFERRED_REST_HOURS), Math.abs(lateRow - earlyRow), dayDiff(filter.periodStartDate, day)],
      });
    }
  }
  candidates.sort((a, b) => a.score[0] - b.score[0] || a.score[1] - b.score[1] || a.score[2] - b.score[2]);
  if (candidates.length === 0) throw new Error("no work pair within the framed rows and days produces a rest-time conflict");
  return candidates[0];
}

export function overlapsPlanWeek(scenario) {
  return dateKey(scenario.fromDate) <= PLAN_WEEK.until && dateKey(scenario.untilDate) >= PLAN_WEEK.from;
}

/**
 * Deletes every work of the group's employees in the plan week and every scenario overlapping it, then verifies the week is empty.
 * The plan week is reserved for the AutoWizard take, like in the klacksy-plans-week take.
 */
export async function resetPlanWeek(api, groupId, weekFilter, report) {
  const data = await api.schedule(realFilter(weekFilter));
  const groupClients = new Set(data.clients.map((c) => c.id));
  const works = worksIn(data, PLAN_WEEK.from, PLAN_WEEK.until).filter((w) => groupClients.has(w.clientId));
  for (const work of works) await deleteWork(api, work.id, { from: weekFilter.periodStartDate, until: weekFilter.periodEndDate });
  const overlapping = (await listScenarios(api, groupId)).filter(overlapsPlanWeek);
  for (const scenario of overlapping) await deleteScenario(api, scenario.id);
  const left = worksIn(await api.schedule(realFilter(weekFilter)), PLAN_WEEK.from, PLAN_WEEK.until).length;
  report.reset = { groupClients: groupClients.size, deletedWorks: works.length, deletedScenarios: overlapping.length, remainingWorks: left };
  if (left !== 0) throw new Error(`plan week still has ${left} works after reset`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cancels an AutoWizard job that is still running and waits until it has left the running state, so it cannot create a scenario after the plan week was reset.
 * Returns the final status ("completed" jobs need no cancel).
 */
export async function stopJob(api, jobId) {
  let status = await api.json(`${AUTO_WIZARD_STATUS_API}/${jobId}`);
  if (status?.status !== JOB_STATUS_RUNNING) return status?.status ?? null;
  await api.json(AUTO_WIZARD_CANCEL_API, { method: HTTP_POST, data: { jobId } });
  const deadline = Date.now() + JOB_CANCEL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    status = await api.json(`${AUTO_WIZARD_STATUS_API}/${jobId}`);
    if (status?.status !== JOB_STATUS_RUNNING) return status?.status ?? null;
    await sleep(JOB_POLL_MS);
  }
  throw new Error(`AutoWizard job ${jobId} is still running after the cancel request`);
}

export async function waitForJob(api, page, jobId, timeoutMs = JOB_READY_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let status = null;
  while (Date.now() < deadline) {
    status = await api.json(`${AUTO_WIZARD_STATUS_API}/${jobId}`);
    if (status && status.status !== JOB_STATUS_RUNNING) return status;
    await page.waitForTimeout(JOB_POLL_MS);
  }
  return status;
}
