// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads and judges the state of the Spitex story (clips A "spitex-orders-tour" and B "spitex-tour-finish", demo data of
 * lib/spitex-demo.mjs) through the REST API of the recording backend: the eight Spitex orders by status, the Spitex group, the containers
 * built from the Spitex shifts, the Thursday template of a container (visits, break, route info) and the works of the nurse. The judging
 * functions are pure (template in, list of problems out) so tools/spitex-takes.selftest.mjs can run them without a browser.
 * The visit window of a TimeRange item is TimeRangeStartItem/TimeRangeEndItem (the item's own StartItem/EndItem is the order window),
 * a break is an item with an AbsenceId and fixed StartItem/EndItem.
 * @param post - async (apiPath, body) => parsed JSON (POST), as in takes/order-review-takes.mjs
 * @param api - ScheduleApi/DemoApi of the take (json(apiPath, init))
 */

import { HTTP_POST, SHIFT_LIST_PATH, SHIFT_TYPE_CONTAINER, FILTER_TYPE_CONTAINER, LIST_PAGE_SIZE, FIRST_PAGE } from "./klacks-demo-api.mjs";
import { SHIFT_STATUS_OPEN_ORDER, SHIFT_STATUS_SEALED_ORDER, ordersWithStatus } from "./order-review-demo.mjs";
import { buildScheduleFilter } from "./klacks-demo-session.mjs";
import { SCHEDULE_API, WORK_ENTRY_TYPE, dateKey } from "./schedule-grid.mjs";
import * as D from "./spitex-demo.mjs";

export const SPITEX_ORDERS = Object.freeze(D.PATIENTS.map((p) => Object.freeze({ name: p.order.name, abbreviation: p.order.abbreviation })));
export const VISIT_COUNT = SPITEX_ORDERS.length;
export const BREAK_START = "12:00";
export const BREAK_MINUTES = 30;
export const CONTAINER_ROUTE_PATTERN = /^\/workplace\/container-template\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const NOVEMBER_2026 = Object.freeze({ year: 2026, month: 11, isoWeek: 45 });

export const RECORDING_WINDOW = Object.freeze({ from: "2026-10-30", until: D.DEMO_DAY });
export const ENV_ANY_DATE = "KLACKS_SPITEX_ANY_DATE";

const API_ROOT = "/api/backend/";
const GROUPS_TREE_API = `${API_ROOT}Groups/tree`;
const SHIFT_LIST_API = `${API_ROOT}${SHIFT_LIST_PATH}`;
const containerTemplatesApi = (containerId) => `${API_ROOT}Containers/${containerId}/templates`;
const findClientApi = (name, firstName) => `${API_ROOT}Clients/FindClient/%20/${encodeURIComponent(name)}/${encodeURIComponent(firstName)}`;
const MINUTES_PER_HOUR = 60;
const HH_MM_LENGTH = 5;
const SPITEX_ABBREVIATION_SET = new Set(D.SPITEX_ABBREVIATIONS);

export const hhmm = (time) => String(time ?? "").slice(0, HH_MM_LENGTH);

export function clockMinutes(time) {
  const [hours, minutes] = hhmm(time).split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * MINUTES_PER_HOUR + minutes : null;
}

export async function spitexOrderCounts(post) {
  const counts = {};
  for (const order of SPITEX_ORDERS) {
    counts[order.abbreviation] = {
      open: (await ordersWithStatus(post, order.abbreviation, SHIFT_STATUS_OPEN_ORDER)).length,
      sealed: (await ordersWithStatus(post, order.abbreviation, SHIFT_STATUS_SEALED_ORDER)).length,
    };
  }
  return counts;
}

export const sealedTotal = (counts) => Object.values(counts).reduce((sum, c) => sum + c.sealed, 0);
export const openTotal = (counts) => Object.values(counts).reduce((sum, c) => sum + c.open, 0);
export const allSealed = (counts) => sealedTotal(counts) === VISIT_COUNT && openTotal(counts) === 0;
export const noneSealed = (counts) => sealedTotal(counts) === 0 && openTotal(counts) === VISIT_COUNT;

function findNode(nodes, name) {
  for (const node of nodes ?? []) {
    if (node.name === name) return node;
    const nested = findNode(node.children, name);
    if (nested) return nested;
  }
  return null;
}

export async function spitexGroup(api) {
  const tree = await api.json(GROUPS_TREE_API);
  const node = findNode(tree?.nodes, D.GROUP.name);
  if (!node) throw new Error(`group "${D.GROUP.name}" not found - seed the Spitex demo first`);
  return { id: node.id, name: node.name };
}

async function containerPage(post, sealed, page) {
  const result = await post(SHIFT_LIST_API, {
    searchString: "",
    filterType: FILTER_TYPE_CONTAINER,
    activeDateRange: true,
    formerDateRange: true,
    futureDateRange: true,
    includeClientName: false,
    isSealedOrder: sealed,
    isTimeRange: false,
    isSporadic: false,
    numberOfItemsPerPage: LIST_PAGE_SIZE,
    requiredPage: page,
    orderBy: "",
    sortOrder: "",
  });
  return result?.shifts ?? [];
}

export async function listContainers(post) {
  const found = new Map();
  for (const sealed of [false, true]) {
    for (let page = FIRST_PAGE; ; page += 1) {
      const shifts = await containerPage(post, sealed, page);
      for (const shift of shifts) if (shift.shiftType === SHIFT_TYPE_CONTAINER) found.set(shift.id, shift);
      if (shifts.length < LIST_PAGE_SIZE) break;
    }
  }
  return [...found.values()];
}

export async function containerTemplate(api, containerId) {
  const templates = (await api.json(containerTemplatesApi(containerId))) ?? [];
  return templates.find((t) => t.weekday === D.DEMO_WEEKDAY && !t.isHoliday && !t.isWeekdayAndHoliday) ?? null;
}

export const taskItems = (template) => (template?.containerTemplateItems ?? []).filter((i) => i.shiftId && !i.absenceId);
export const breakItems = (template) => (template?.containerTemplateItems ?? []).filter((i) => i.absenceId);
export const spitexItems = (template) => taskItems(template).filter((i) => SPITEX_ABBREVIATION_SET.has(i.shift?.abbreviation));

export async function spitexContainers(api, post) {
  const found = [];
  for (const container of await listContainers(post)) {
    const template = await containerTemplate(api, container.id);
    if (spitexItems(template).length > 0) found.push({ id: container.id, name: container.name, template });
  }
  return found;
}

export function visitWindow(item) {
  return { start: clockMinutes(item.timeRangeStartItem), end: clockMinutes(item.timeRangeEndItem) };
}

function sortedVisits(template) {
  return taskItems(template)
    .map((item) => ({ item, ...visitWindow(item) }))
    .filter((v) => v.start !== null && v.end !== null)
    .sort((a, b) => a.start - b.start);
}

export function visitProblems(template) {
  if (!template) return [`no template for weekday ${D.DEMO_WEEKDAY}`];
  const problems = [];
  const tasks = taskItems(template);
  const abbreviations = tasks.map((i) => i.shift?.abbreviation ?? "?");
  const foreign = abbreviations.filter((a) => !SPITEX_ABBREVIATION_SET.has(a));
  const missing = D.SPITEX_ABBREVIATIONS.filter((a) => !abbreviations.includes(a));
  if (foreign.length > 0) problems.push(`foreign task(s) in the container: ${foreign.join(",")}`);
  if (missing.length > 0) problems.push(`Spitex order(s) missing in the container: ${missing.join(",")}`);
  if (tasks.length !== VISIT_COUNT) problems.push(`${tasks.length} visits in the container, expected ${VISIT_COUNT}`);
  if (new Set(abbreviations).size !== abbreviations.length) problems.push("a Spitex order is in the container twice");
  if (!template.routeInfo) problems.push("the template has no route info");
  else {
    if ((template.routeInfo.optimizedRoute ?? []).length < VISIT_COUNT) problems.push("the route info lists fewer stops than visits");
    if (!(template.routeInfo.totalDistanceKm > 0)) problems.push("the route info has no distance");
  }
  if (!template.startBase || !template.endBase) problems.push("the template has no start/end base");
  const windowFrom = clockMinutes(D.ORDER.start);
  const windowUntil = clockMinutes(D.ORDER.end);
  for (const item of tasks) {
    const label = item.shift?.abbreviation ?? "?";
    const { start, end } = visitWindow(item);
    if (start === null || end === null) problems.push(`${label} has no visit time`);
    else {
      if (end - start !== D.ORDER.visitMinutes) problems.push(`${label} visit is ${end - start} min, expected ${D.ORDER.visitMinutes}`);
      if (start < windowFrom || end > windowUntil) problems.push(`${label} visit ${hhmm(item.timeRangeStartItem)}-${hhmm(item.timeRangeEndItem)} lies outside the order window`);
    }
    if (item.travelTimeBefore === null || item.travelTimeBefore === undefined || item.travelTimeAfter === null || item.travelTimeAfter === undefined) {
      problems.push(`${label} has no travel times`);
    }
  }
  const visits = sortedVisits(template);
  visits.forEach((visit, index) => {
    if (index > 0 && visit.start < visits[index - 1].end) problems.push(`${visit.item.shift?.abbreviation} overlaps ${visits[index - 1].item.shift?.abbreviation}`);
  });
  return problems;
}

export function breakProblems(template) {
  const breaks = breakItems(template);
  if (breaks.length !== 1) return [`${breaks.length} break items in the template, expected 1`];
  const [item] = breaks;
  const problems = [];
  const start = clockMinutes(item.startItem);
  const end = clockMinutes(item.endItem);
  if (hhmm(item.startItem) !== BREAK_START) problems.push(`the break starts at ${hhmm(item.startItem)}, expected ${BREAK_START}`);
  if (start === null || end === null || end - start !== BREAK_MINUTES) problems.push(`the break lasts ${start === null || end === null ? "?" : end - start} min, expected ${BREAK_MINUTES}`);
  else {
    for (const visit of sortedVisits(template)) {
      if (visit.start < end && visit.end > start) problems.push(`${visit.item.shift?.abbreviation} overlaps the break`);
    }
  }
  return problems;
}

export function templateSummary(template) {
  if (!template) return null;
  return {
    startBase: template.startBase ?? null,
    endBase: template.endBase ?? null,
    totalDistanceKm: template.routeInfo?.totalDistanceKm ?? null,
    estimatedTravelTime: template.routeInfo?.estimatedTravelTime ?? null,
    stops: (template.routeInfo?.optimizedRoute ?? []).length,
    visits: sortedVisits(template).map((v) => `${v.item.shift?.abbreviation} ${hhmm(v.item.timeRangeStartItem)}-${hhmm(v.item.timeRangeEndItem)}`),
    breaks: breakItems(template).map((i) => `${hhmm(i.startItem)}-${hhmm(i.endItem)}`),
  };
}

export function bundleParameterProblems(parameters, group) {
  if (!parameters) return ["the bundle call carries no parameters"];
  const problems = [];
  const weekday = Number(parameters.weekday);
  if (weekday !== D.DEMO_WEEKDAY) problems.push(`bundle weekday ${parameters.weekday}, expected ${D.DEMO_WEEKDAY} (Thursday)`);
  const fromDate = dateKey(parameters.fromDate ?? "");
  const untilDate = parameters.untilDate ? dateKey(parameters.untilDate) : null;
  if (!fromDate || fromDate > D.DEMO_DAY) problems.push(`bundle fromDate ${parameters.fromDate} is after ${D.DEMO_DAY}`);
  if (untilDate && untilDate < D.DEMO_DAY) problems.push(`bundle untilDate ${parameters.untilDate} is before ${D.DEMO_DAY}`);
  if (!String(parameters.groupIds ?? "").toLowerCase().includes(group.id.toLowerCase())) problems.push(`bundle groupIds "${parameters.groupIds ?? ""}" do not name the group "${group.name}"`);
  if (!String(parameters.location ?? "").toLowerCase().includes(D.CITY.toLowerCase())) problems.push(`bundle location "${parameters.location ?? ""}" is not ${D.CITY}`);
  return problems;
}

export async function findNurse(api) {
  const found = (await api.json(findClientApi(D.NURSE.name, D.NURSE.firstName))) ?? [];
  const matches = found.filter((c) => c.name === D.NURSE.name && c.firstName === D.NURSE.firstName && !c.isDeleted && c.type === D.CLIENT_TYPE_EMPLOYEE);
  if (matches.length !== 1) throw new Error(`expected exactly one nurse ${D.NURSE.firstName} ${D.NURSE.name}, found ${matches.length}`);
  return { id: matches[0].id };
}

export async function nurseWorks(api, group, nurse) {
  const data = await api.json(SCHEDULE_API, { method: HTTP_POST, data: buildScheduleFilter(group.id, NOVEMBER_2026) });
  const works = (data?.entries ?? []).filter((e) => e.entryType === WORK_ENTRY_TYPE && e.clientId === nurse.id);
  return {
    all: works.length,
    onDemoDay: works.filter((e) => dateKey(e.entryDate) === D.DEMO_DAY).length,
    otherDays: works.filter((e) => dateKey(e.entryDate) !== D.DEMO_DAY).length,
    rows: works.filter((e) => dateKey(e.entryDate) === D.DEMO_DAY).map((e) => `${hhmm(e.startTime)}-${hhmm(e.endTime)}`),
  };
}

/**
 * The sentences "the visits on Thursday" / "the tour on Thursday" carry no date, so the language model resolves "Thursday" from today's date:
 * only from the day after the last Thursday before DEMO_DAY up to DEMO_DAY itself that is DEMO_DAY. Returns the reason when a take started
 * on `now` would be judged against the wrong Thursday, null inside the window (or with KLACKS_SPITEX_ANY_DATE=1).
 * @param now - the recording machine's current date (local calendar day)
 * @param env - process environment, only KLACKS_SPITEX_ANY_DATE is read
 */
export function recordingDateProblem(now = new Date(), env = process.env) {
  if (env[ENV_ANY_DATE] === "1") return null;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (today >= RECORDING_WINDOW.from && today <= RECORDING_WINDOW.until) return null;
  return `today is ${today}: "Thursday" only means ${D.DEMO_DAY} from ${RECORDING_WINDOW.from} to ${RECORDING_WINDOW.until} (set ${ENV_ANY_DATE}=1 to record anyway and expect the date checks to fail)`;
}
