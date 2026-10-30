// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads and judges the state of the Spitex story (clips A "spitex-orders-tour" and B "spitex-tour-finish", demo data of
 * lib/spitex-demo.mjs) through the REST API of the recording backend: the sixteen Spitex orders by status, the Spitex group, the
 * containers built from the Spitex shifts (two tours, each checked to stay in one patient cluster), the Thursday template of a container (visits,
 * break, route info) and the works of a nurse. The judging
 * functions are pure (template in, list of problems out) so tools/spitex-takes.selftest.mjs can run them without a browser.
 * The visit window of a TimeRange item is TimeRangeStartItem/TimeRangeEndItem (the item's own StartItem/EndItem is the order window),
 * a break is an item with an AbsenceId and fixed StartItem/EndItem.
 * @param post - async (apiPath, body) => parsed JSON (POST), as in takes/order-review-takes.mjs
 * @param api - ScheduleApi/DemoApi of the take (json(apiPath, init))
 */

import { HTTP_POST, SHIFT_LIST_PATH, SHIFT_TYPE_CONTAINER, FILTER_TYPE_CONTAINER, FILTER_TYPE_SHIFT, LIST_PAGE_SIZE, FIRST_PAGE } from "./klacks-demo-api.mjs";
import { SHIFT_STATUS_OPEN_ORDER, SHIFT_STATUS_SEALED_ORDER, ordersWithStatus } from "./order-review-demo.mjs";
import { buildScheduleFilter } from "./klacks-demo-session.mjs";
import { SCHEDULE_API, WORK_ENTRY_TYPE, dateKey } from "./schedule-grid.mjs";
import * as D from "./spitex-demo.mjs";

export const SPITEX_ORDERS = Object.freeze(D.PATIENTS.map((p) => Object.freeze({ name: p.order.name, abbreviation: p.order.abbreviation })));
export const ORDER_COUNT = SPITEX_ORDERS.length;
export const VISIT_COUNT = D.areaPatientsOn(D.AREA_KEYS[0], D.DEMO_WEEKDAY).length;
export const SHIFT_STATUS_SPLIT = 3;
export const SPLIT_PART_COUNT = D.PATIENTS.reduce((sum, p) => sum + (p.order.weekdays.length > 1 ? p.order.weekdays.length : 0), 0);
export const TOUR_COUNT = D.AREA_KEYS.length;
export const BREAK_START = "12:00";
export const BREAK_MINUTES = 30;
export const CONTAINER_ROUTE_PATTERN = /^\/workplace\/container-template\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const NOVEMBER_2026 = Object.freeze({ year: 2026, month: 11, isoWeek: 48 });

export const RECORDING_WINDOW = Object.freeze({ from: `${D.DEMO_DAY.slice(0, 4)}-01-01`, until: D.DEMO_DAY });
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

/** Weekday parts the cut produced; the Thursday-only orders stay plannable shifts without a part. */
export async function splitPartTotal(post) {
  let total = 0;
  for (let page = FIRST_PAGE; ; page += 1) {
    const result = await post(SHIFT_LIST_API, {
      searchString: "",
      filterType: FILTER_TYPE_SHIFT,
      activeDateRange: true,
      formerDateRange: true,
      futureDateRange: true,
      includeClientName: false,
      isSealedOrder: false,
      isTimeRange: true,
      isSporadic: false,
      numberOfItemsPerPage: LIST_PAGE_SIZE,
      requiredPage: page,
      orderBy: "",
      sortOrder: "",
    });
    const shifts = result?.shifts ?? [];
    total += shifts.filter((s) => s.status === SHIFT_STATUS_SPLIT && SPITEX_ABBREVIATION_SET.has(s.abbreviation)).length;
    if (shifts.length < LIST_PAGE_SIZE) return total;
  }
}

export const sealedTotal = (counts) => Object.values(counts).reduce((sum, c) => sum + c.sealed, 0);
export const openTotal = (counts) => Object.values(counts).reduce((sum, c) => sum + c.open, 0);
export const allSealed = (counts) => sealedTotal(counts) === ORDER_COUNT && openTotal(counts) === 0;
export const noneSealed = (counts) => sealedTotal(counts) === 0 && openTotal(counts) === ORDER_COUNT;

function findNode(nodes, name) {
  for (const node of nodes ?? []) {
    if (node.name === name) return node;
    const nested = findNode(node.children, name);
    if (nested) return nested;
  }
  return null;
}

async function groupByName(api, name) {
  const tree = await api.json(GROUPS_TREE_API);
  const node = findNode(tree?.nodes, name);
  if (!node) throw new Error(`group "${name}" not found - seed the Spitex demo first`);
  return { id: node.id, name: node.name };
}

export const spitexGroup = (api) => groupByName(api, D.GROUP.name);

/** The patient cluster whose orders a container holds, null when it holds none or orders of both clusters (a mixed tour). */
export function containerArea(template) {
  const abbreviations = taskItems(template).map((i) => i.shift?.abbreviation);
  const areas = new Set(D.PATIENTS.filter((p) => abbreviations.includes(p.order.abbreviation)).map((p) => p.area));
  return areas.size === 1 ? [...areas][0] : null;
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

export async function containerTemplates(api, containerId) {
  return (await api.json(containerTemplatesApi(containerId))) ?? [];
}

export const templateOn = (templates, weekday) => templates.find((t) => t.weekday === weekday && !t.isHoliday && !t.isWeekdayAndHoliday) ?? null;

export async function containerTemplate(api, containerId) {
  return templateOn(await containerTemplates(api, containerId), D.DEMO_WEEKDAY);
}

export const taskItems = (template) => (template?.containerTemplateItems ?? []).filter((i) => i.shiftId && !i.absenceId);
export const breakItems = (template) => (template?.containerTemplateItems ?? []).filter((i) => i.absenceId);
export const spitexItems = (template) => taskItems(template).filter((i) => SPITEX_ABBREVIATION_SET.has(i.shift?.abbreviation));

/**
 * Containers that hold Spitex visits. ignoreIds skips containers known before the take (the base data has many; reading every template
 * on each check would put seconds of idle time into the recording).
 */
export async function spitexContainers(api, post, ignoreIds = new Set()) {
  const found = [];
  for (const container of await listContainers(post)) {
    if (ignoreIds.has(container.id)) continue;
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

export function visitProblems(template, area, weekday = D.DEMO_WEEKDAY) {
  if (!template) return [`no template for weekday ${weekday}`];
  if (!area) return ["the container does not hold the orders of exactly one area"];
  const problems = [];
  const tasks = taskItems(template);
  const abbreviations = tasks.map((i) => i.shift?.abbreviation ?? "?");
  const expected = D.areaAbbreviationsOn(area, weekday);
  const foreign = abbreviations.filter((a) => !expected.includes(a));
  const missing = expected.filter((a) => !abbreviations.includes(a));
  if (foreign.length > 0) problems.push(`${area}: task(s) of another area or group in the container: ${foreign.join(",")}`);
  if (missing.length > 0) problems.push(`${area}: order(s) missing in the container: ${missing.join(",")}`);
  if (tasks.length !== expected.length) problems.push(`weekday ${weekday}: ${tasks.length} visits in the container, expected ${expected.length}`);
  if (new Set(abbreviations).size !== abbreviations.length) problems.push("a Spitex order is in the container twice");
  if (!template.routeInfo) problems.push("the template has no route info");
  else {
    if ((template.routeInfo.optimizedRoute ?? []).length < expected.length) problems.push("the route info lists fewer stops than visits");
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

/** The tour holds the visits of one area on every weekday, so a patient stays in the same tour all week. */
export function weekProblems(templates, area) {
  return D.WORK_WEEKDAYS.flatMap((weekday) => visitProblems(templateOn(templates, weekday), area, weekday).map((p) => `weekday ${weekday}: ${p}`));
}

/** A day whose last visit ends before the break keeps no break; every other day holds exactly the fixed break. */
export function weekBreakProblems(templates) {
  const problems = [];
  for (const weekday of D.WORK_WEEKDAYS) {
    const template = templateOn(templates, weekday);
    const breaks = breakItems(template).length;
    if (weekday === D.DEMO_WEEKDAY && breaks !== 1) problems.push(`weekday ${weekday}: ${breaks} breaks, expected 1`);
    if (breaks > 0) problems.push(...breakProblems(template).map((p) => `weekday ${weekday}: ${p}`));
  }
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
  if (!group) return ["no group to compare the tour call with"];
  if (!parameters) return ["the tour call carries no parameters"];
  const problems = [];
  if (Number(parameters.tourCount) !== TOUR_COUNT) problems.push(`tourCount ${parameters.tourCount}, expected ${TOUR_COUNT}`);
  const fromDate = dateKey(parameters.fromDate ?? "");
  const untilDate = parameters.untilDate ? dateKey(parameters.untilDate) : null;
  const firstDay = D.DEMO_WEEK[0];
  const lastDay = D.DEMO_WEEK[D.DEMO_WEEK.length - 1];
  if (!fromDate || fromDate > firstDay) problems.push(`tour fromDate ${parameters.fromDate} is after ${firstDay}`);
  if (untilDate && untilDate < lastDay) problems.push(`tour untilDate ${parameters.untilDate} is before ${lastDay}`);
  const byId = String(parameters.groupIds ?? "").toLowerCase().includes(group.id.toLowerCase());
  const byName = String(parameters.groupName ?? "").trim().toLowerCase() === group.name.toLowerCase();
  if (!byId && !byName) problems.push(`bundle groupName "${parameters.groupName ?? ""}" / groupIds "${parameters.groupIds ?? ""}" do not name the group "${group.name}"`);
  if (!String(parameters.location ?? "").toLowerCase().includes(D.CITY.toLowerCase())) problems.push(`bundle location "${parameters.location ?? ""}" is not ${D.CITY}`);
  return problems;
}

export async function findNurse(api, person = D.NURSE) {
  const found = (await api.json(findClientApi(person.name, person.firstName))) ?? [];
  const matches = found.filter((c) => c.name === person.name && c.firstName === person.firstName && !c.isDeleted && c.type === D.CLIENT_TYPE_EMPLOYEE);
  if (matches.length !== 1) throw new Error(`expected exactly one nurse ${person.firstName} ${person.name}, found ${matches.length}`);
  return { id: matches[0].id, key: person.key, name: `${person.firstName} ${person.name}`, lastName: person.name };
}

export async function nurseWorks(api, group, nurse) {
  const data = await api.json(SCHEDULE_API, { method: HTTP_POST, data: { ...buildScheduleFilter(group.id, NOVEMBER_2026), startDate: D.DEMO_PERIOD.from, endDate: D.DEMO_PERIOD.until } });
  const works = (data?.entries ?? []).filter((e) => e.entryType === WORK_ENTRY_TYPE && e.clientId === nurse.id);
  return {
    all: works.length,
    onDemoDay: works.filter((e) => dateKey(e.entryDate) === D.DEMO_DAY).length,
    inDemoWeek: works.filter((e) => D.DEMO_WEEK.includes(dateKey(e.entryDate))).length,
    otherDays: works.filter((e) => !D.DEMO_WEEK.includes(dateKey(e.entryDate))).length,
    rows: works.filter((e) => dateKey(e.entryDate) === D.DEMO_DAY).map((e) => `${hhmm(e.startTime)}-${hhmm(e.endTime)}`),
  };
}

/**
 * The sentences name the days ("23. bis 27. November") but no year, so the language model takes the year from today's date: only from
 * January 1 of DEMO_DAY's year up to DEMO_DAY itself does that date mean DEMO_DAY (afterwards it is in the past or the next year). Returns the
 * reason when a take started on `now` would be judged against the wrong date, null inside the window (or with KLACKS_SPITEX_ANY_DATE=1).
 * @param now - the recording machine's current date (local calendar day)
 * @param env - process environment, only KLACKS_SPITEX_ANY_DATE is read
 */
export function recordingDateProblem(now = new Date(), env = process.env) {
  if (env[ENV_ANY_DATE] === "1") return null;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (today >= RECORDING_WINDOW.from && today <= RECORDING_WINDOW.until) return null;
  return `today is ${today}: the sentences only mean ${D.DEMO_DAY} from ${RECORDING_WINDOW.from} to ${RECORDING_WINDOW.until} (set ${ENV_ANY_DATE}=1 to record anyway and expect the date checks to fail)`;
}
