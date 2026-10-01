// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Idempotently seeds the container demo data for the "fill container" and "split container" marketing videos through the
 * real REST API of a running Klacks demo instance: one container shift assigned to the demo group, a Monday task set that
 * is meant to be dragged into the container, a Tuesday task set that fills the Tuesday template, an EMPTY Monday template
 * and a FILLED Tuesday template (one task straddles the 11:00 split point). Existing objects are found by name and
 * abbreviation and reset to the defined state; ids always come from the server. The run ends with a self-check of the
 * Zone 3 list (Containers/available-tasks with the parameters the UI sends for Monday) and of both templates.
 * Tasks already placed in any container template are hidden from Zone 3 for every weekday (the UI never passes
 * excludeContainerId), which is why the Tuesday template uses its own task set.
 * A template editor that is open (or was closed without leaving the page in-app) holds the container template lock until it
 * goes stale (about 90 s); --lock-wait-s makes the script poll for the lock instead of failing at once.
 * CLI: --reset-monday (only empties the Monday template; fast restore for the fill take)
 *      --reset-tuesday (only restores the Tuesday template to exactly its four seeded tasks; fast restore for the pause take)
 *      --lock-wait-s <n>  --api-url  --group-id
 * Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL, KLACKS_DEMO_GROUP_ID.
 */

import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { request as playwrightRequest } from "playwright-core";
import * as S from "./lib/klacks-demo-session.mjs";

const API_BASE = "/api/backend/";
const SHIFTS_PATH = "Shifts";
const SHIFT_LIST_PATH = "Shifts/GetSimpleList";
const GROUPS_PATH = "Groups";
const CONTAINERS_PATH = "Containers";
const AVAILABLE_TASKS_PATH = "Containers/available-tasks";
const TEMPLATES_SEGMENT = "templates";
const LOCK_ACQUIRE_PATH = "ContainerLocks/Acquire";
const LOCK_RELEASE_PATH = "ContainerLocks";
const LOCK_RESOURCE_TYPE = "ContainerTemplate";
const INSTANCE_ID_HEADER = "X-Instance-Id";
const INSTANCE_ID_PREFIX = "marketing-seed-";
const LOCK_POLL_INTERVAL_MS = 5000;
const MS_PER_SECOND = 1000;

const HTTP_GET = "GET";
const HTTP_POST = "POST";
const HTTP_PUT = "PUT";
const HTTP_DELETE = "DELETE";

const SHIFT_TYPE_TASK = 0;
const SHIFT_TYPE_CONTAINER = 1;
const SHIFT_STATUS_ORIGINAL_SHIFT = 2;
const FILTER_TYPE_SHIFT = 1;
const FILTER_TYPE_CONTAINER = 2;
const LIST_PAGE_SIZE = 100;
const FIRST_PAGE = 0;
const TRANSPORT_MODE_DEFAULT = 0;

const WEEKDAY_MONDAY = 1;
const WEEKDAY_TUESDAY = 2;
const WEEKDAY_FLAG_BY_NUMBER = {
  0: "isSunday",
  1: "isMonday",
  2: "isTuesday",
  3: "isWednesday",
  4: "isThursday",
  5: "isFriday",
  6: "isSaturday",
};
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const SHIFT_FROM_DATE = "2025-01-01";
const ZERO_TIME = "00:00:00";
const MINUTES_PER_HOUR = 60;
const SPLIT_POINT_MINUTES = 11 * MINUTES_PER_HOUR;

const CONTAINER_DEF = {
  name: "Tour Winterthur",
  abbreviation: "TOUR",
  description: "Tagestour Winterthur",
  start: "07:00:00",
  end: "15:00:00",
  weekdays: ALL_WEEKDAYS,
};

const MONDAY_TASK_DEFS = [
  { name: "Kontrollgang Areal", abbreviation: "KGA", start: "07:30:00", end: "08:30:00" },
  { name: "Materialausgabe", abbreviation: "MAT", start: "09:00:00", end: "10:00:00" },
  { name: "Reinigung Halle", abbreviation: "RGH", start: "10:30:00", end: "12:00:00" },
  { name: "Kundentermin", abbreviation: "KUT", start: "13:00:00", end: "14:00:00" },
  { name: "Rapport", abbreviation: "RAP", start: "14:15:00", end: "14:45:00" },
].map((task) => ({ ...task, weekdays: [WEEKDAY_MONDAY] }));

const TUESDAY_TASK_DEFS = [
  { name: "Fahrzeugkontrolle", abbreviation: "FZK", start: "07:15:00", end: "08:30:00" },
  { name: "Warenannahme", abbreviation: "WAN", start: "09:00:00", end: "10:15:00" },
  { name: "Objektbegehung", abbreviation: "OBG", start: "10:30:00", end: "11:30:00" },
  { name: "Dokumentation", abbreviation: "DOK", start: "13:00:00", end: "14:30:00" },
].map((task) => ({ ...task, weekdays: [WEEKDAY_TUESDAY] }));

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

function durationHours(start, end) {
  return (timeToMinutes(end) - timeToMinutes(start)) / MINUTES_PER_HOUR;
}

function weekdayFlags(weekdays) {
  return Object.fromEntries(
    Object.entries(WEEKDAY_FLAG_BY_NUMBER).map(([number, flag]) => [flag, weekdays.includes(Number(number))]),
  );
}

function readOptions() {
  const { values } = parseArgs({
    options: {
      "reset-monday": { type: "boolean", default: false },
      "reset-tuesday": { type: "boolean", default: false },
      "api-url": { type: "string" },
      "group-id": { type: "string" },
      "lock-wait-s": { type: "string" },
    },
  });
  const lockWaitS = Number(values["lock-wait-s"] ?? 0);
  if (!Number.isFinite(lockWaitS) || lockWaitS < 0) throw new Error("--lock-wait-s must be a non-negative number");
  if (values["reset-monday"] && values["reset-tuesday"]) throw new Error("--reset-monday and --reset-tuesday cannot be combined");
  return {
    ...S.readSessionOptions(values),
    resetMondayOnly: values["reset-monday"],
    resetTuesdayOnly: values["reset-tuesday"],
    lockWaitMs: lockWaitS * MS_PER_SECOND,
  };
}

class KlacksApi {
  constructor(context, apiUrl, token) {
    this.context = context;
    this.base = `${apiUrl}${API_BASE}`;
    this.headers = { ...S.bearer(token) };
  }

  async call(method, path, { data, query, headers } = {}) {
    const search = query ? `?${new URLSearchParams(query).toString()}` : "";
    const response = await S.apiRequest(this.context, `${this.base}${path}${search}`, {
      method,
      data,
      headers: { ...this.headers, ...headers },
    });
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
}

async function loadGroup(api, groupId) {
  const group = await api.call(HTTP_GET, `${GROUPS_PATH}/${groupId}`);
  return { id: group.id, name: group.name, description: group.description ?? "" };
}

function shiftBody(def, shiftType, group) {
  return {
    name: def.name,
    abbreviation: def.abbreviation,
    description: def.description ?? "",
    status: SHIFT_STATUS_ORIGINAL_SHIFT,
    shiftType,
    fromDate: SHIFT_FROM_DATE,
    startShift: def.start,
    endShift: def.end,
    quantity: 1,
    sumEmployees: 1,
    workTime: durationHours(def.start, def.end),
    ...weekdayFlags(def.weekdays),
    groups: [group],
  };
}

async function findShifts(api, def, shiftType) {
  const filterType = shiftType === SHIFT_TYPE_CONTAINER ? FILTER_TYPE_CONTAINER : FILTER_TYPE_SHIFT;
  const result = await api.call(HTTP_POST, SHIFT_LIST_PATH, {
    data: {
      searchString: def.abbreviation,
      filterType,
      activeDateRange: true,
      formerDateRange: true,
      futureDateRange: true,
      includeClientName: false,
      isSealedOrder: false,
      isTimeRange: false,
      isSporadic: false,
      numberOfItemsPerPage: LIST_PAGE_SIZE,
      requiredPage: FIRST_PAGE,
      orderBy: "",
      sortOrder: "",
    },
  });
  return (result.shifts ?? []).filter(
    (shift) =>
      shift.name === def.name &&
      shift.abbreviation === def.abbreviation &&
      shift.shiftType === shiftType &&
      shift.status === SHIFT_STATUS_ORIGINAL_SHIFT,
  );
}

function shiftDiffersFromDefinition(existing, desired, groupId) {
  const fields = ["startShift", "endShift", "workTime", "fromDate", "status", "shiftType", ...Object.values(WEEKDAY_FLAG_BY_NUMBER)];
  const fieldDiffers = fields.some((field) => existing[field] !== desired[field]);
  const inGroup = (existing.groups ?? []).some((group) => group.id === groupId);
  return fieldDiffers || !inGroup || existing.untilDate != null;
}

async function ensureShift(api, def, shiftType, group) {
  const matches = await findShifts(api, def, shiftType);
  if (matches.length > 1) {
    throw new Error(`Ambiguous: ${matches.length} shifts named "${def.name}" (${def.abbreviation}) of type ${shiftType}.`);
  }
  const desired = shiftBody(def, shiftType, group);
  if (matches.length === 0) {
    const created = await api.call(HTTP_POST, SHIFTS_PATH, { data: desired });
    return { id: created.id, action: "created" };
  }
  const existing = await api.call(HTTP_GET, `${SHIFTS_PATH}/${matches[0].id}`);
  if (!shiftDiffersFromDefinition(existing, desired, group.id)) {
    return { id: existing.id, action: "unchanged" };
  }
  const groups = (existing.groups ?? []).some((g) => g.id === group.id) ? existing.groups : [...(existing.groups ?? []), group];
  await api.call(HTTP_PUT, SHIFTS_PATH, {
    data: { ...existing, ...desired, id: existing.id, groups, untilDate: null, client: undefined },
  });
  return { id: existing.id, action: "updated" };
}

async function acquireTemplateLock(api, containerId, instanceId, waitMs) {
  const deadline = Date.now() + waitMs;
  for (;;) {
    const lock = await api.call(HTTP_POST, LOCK_ACQUIRE_PATH, {
      data: { resourceType: LOCK_RESOURCE_TYPE, resourceId: containerId, instanceId },
    });
    if (lock.acquired) return lock;
    if (Date.now() >= deadline) {
      throw new Error(
        `Container template is locked by ${lock.userName} (instance ${lock.instanceId}); leave the editor page in the app or pass --lock-wait-s 100 to wait for the lock to go stale.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_INTERVAL_MS));
  }
}

async function withTemplateLock(api, containerId, lockWaitMs, work) {
  const instanceId = `${INSTANCE_ID_PREFIX}${randomUUID()}`;
  const lock = await acquireTemplateLock(api, containerId, instanceId, lockWaitMs);
  try {
    return await work(instanceId);
  } finally {
    await api.call(HTTP_DELETE, `${LOCK_RELEASE_PATH}/${lock.id}`);
  }
}

function templateItemBody(task, weekday) {
  return {
    shiftId: task.id,
    weekday,
    startItem: task.start,
    endItem: task.end,
    briefingTime: ZERO_TIME,
    debriefingTime: ZERO_TIME,
    travelTimeAfter: ZERO_TIME,
    travelTimeBefore: ZERO_TIME,
    transportMode: TRANSPORT_MODE_DEFAULT,
  };
}

function templateBody(container, weekday, items) {
  return {
    containerId: container.id,
    fromTime: container.start,
    untilTime: container.end,
    weekday,
    isWeekdayAndHoliday: false,
    isHoliday: false,
    transportMode: TRANSPORT_MODE_DEFAULT,
    containerTemplateItems: items,
  };
}

function stripNested(template) {
  return {
    ...template,
    containerTemplateItems: (template.containerTemplateItems ?? []).map(({ shift, absence, ...item }) => item),
  };
}

function isPlainTemplate(template, weekday) {
  return template.weekday === weekday && !template.isHoliday && !template.isWeekdayAndHoliday;
}

function mergeItemsById(desiredItems, existingItems) {
  const remaining = [...existingItems];
  return desiredItems.map((item) => {
    const index = remaining.findIndex((existing) => existing.shiftId === item.shiftId);
    if (index < 0) return item;
    const [match] = remaining.splice(index, 1);
    const { shift, absence, ...kept } = match;
    return { ...kept, ...item, id: match.id, containerTemplateId: match.containerTemplateId };
  });
}

async function writeTemplates(api, container, desiredTemplates, lockWaitMs) {
  return withTemplateLock(api, container.id, lockWaitMs, async (instanceId) => {
    const path = `${CONTAINERS_PATH}/${container.id}/${TEMPLATES_SEGMENT}`;
    const existing = await api.call(HTTP_GET, path);
    const headers = { [INSTANCE_ID_HEADER]: instanceId };
    if (existing.length === 0) {
      await api.call(HTTP_POST, path, { data: desiredTemplates, headers });
      return;
    }
    const merged = desiredTemplates.map((desired) => {
      const current = existing.find((template) => isPlainTemplate(template, desired.weekday));
      if (!current) return desired;
      return {
        ...stripNested(current),
        ...desired,
        id: current.id,
        containerTemplateItems: mergeItemsById(desired.containerTemplateItems, current.containerTemplateItems ?? []),
      };
    });
    await api.call(HTTP_PUT, path, { data: merged, headers });
  });
}

async function readTemplates(api, containerId) {
  return api.call(HTTP_GET, `${CONTAINERS_PATH}/${containerId}/${TEMPLATES_SEGMENT}`);
}

async function resetMondayTemplate(api, container, lockWaitMs) {
  const existing = await readTemplates(api, container.id);
  const monday = existing.find((template) => isPlainTemplate(template, WEEKDAY_MONDAY));
  if (monday && (monday.containerTemplateItems ?? []).length === 0) {
    return "unchanged";
  }
  const keep = existing.filter((template) => !isPlainTemplate(template, WEEKDAY_MONDAY)).map(stripNested);
  const emptyMonday = monday
    ? { ...stripNested(monday), containerTemplateItems: [] }
    : templateBody(container, WEEKDAY_MONDAY, []);
  await writeTemplates(api, container, [emptyMonday, ...keep], lockWaitMs);
  return "emptied";
}

const HH_MM_LENGTH = 5;

function itemMatchesTask(item, task) {
  return item.shiftId === task.id
    && !item.absenceId
    && String(item.startItem).slice(0, HH_MM_LENGTH) === task.start.slice(0, HH_MM_LENGTH)
    && String(item.endItem).slice(0, HH_MM_LENGTH) === task.end.slice(0, HH_MM_LENGTH);
}

function tuesdayMatchesSeed(tuesday, tuesdayTasks) {
  const items = tuesday?.containerTemplateItems ?? [];
  return items.length === tuesdayTasks.length && tuesdayTasks.every((task) => items.some((item) => itemMatchesTask(item, task)));
}

async function resetTuesdayTemplate(api, container, tuesdayTasks, lockWaitMs) {
  const existing = await readTemplates(api, container.id);
  const tuesday = existing.find((template) => isPlainTemplate(template, WEEKDAY_TUESDAY));
  if (tuesdayMatchesSeed(tuesday, tuesdayTasks)) {
    return "unchanged";
  }
  const keep = existing.filter((template) => !isPlainTemplate(template, WEEKDAY_TUESDAY)).map(stripNested);
  const items = tuesdayTasks.map((task) => templateItemBody(task, WEEKDAY_TUESDAY));
  const seededTuesday = tuesday
    ? { ...stripNested(tuesday), containerTemplateItems: items }
    : templateBody(container, WEEKDAY_TUESDAY, items);
  await writeTemplates(api, container, [seededTuesday, ...keep], lockWaitMs);
  const verified = (await readTemplates(api, container.id)).find((template) => isPlainTemplate(template, WEEKDAY_TUESDAY));
  if (!tuesdayMatchesSeed(verified, tuesdayTasks)) {
    throw new Error("Tuesday template does not hold exactly the four seeded tasks after the reset");
  }
  return "restored";
}

async function readMondayZone3(api, container) {
  return api.call(HTTP_GET, AVAILABLE_TASKS_PATH, {
    query: {
      containerId: container.id,
      weekday: String(WEEKDAY_MONDAY),
      fromTime: container.start,
      untilTime: container.end,
      isHoliday: "false",
      isWeekdayAndHoliday: "false",
    },
  });
}

async function verify(api, container, mondayTasks, tuesdayTasks, { checkTuesday }) {
  const problems = [];
  const zone3 = await readMondayZone3(api, container);
  const zoneIds = new Set(zone3.map((task) => task.id));
  for (const task of mondayTasks) {
    if (!zoneIds.has(task.id)) problems.push(`Zone 3 (Monday) misses ${task.name}`);
  }
  for (const task of tuesdayTasks) {
    if (zoneIds.has(task.id)) problems.push(`Zone 3 (Monday) unexpectedly lists Tuesday task ${task.name}`);
  }
  const templates = await readTemplates(api, container.id);
  const monday = templates.find((template) => isPlainTemplate(template, WEEKDAY_MONDAY));
  const tuesday = templates.find((template) => isPlainTemplate(template, WEEKDAY_TUESDAY));
  if (!monday) problems.push("Monday template does not exist");
  else if ((monday.containerTemplateItems ?? []).length !== 0) problems.push("Monday template is not empty");
  if (checkTuesday) {
    const tuesdayIds = (tuesday?.containerTemplateItems ?? []).map((item) => item.shiftId).sort();
    const expectedIds = tuesdayTasks.map((task) => task.id).sort();
    if (JSON.stringify(tuesdayIds) !== JSON.stringify(expectedIds)) problems.push("Tuesday template does not hold exactly the Tuesday tasks");
  }
  if (problems.length > 0) throw new Error(`Self-check failed: ${problems.join("; ")}`);
  return {
    zone3Names: zone3.map((task) => `${task.abbreviation} ${task.startShift}-${task.endShift}`),
    templates: templates.map((template) => ({
      weekday: template.weekday,
      items: (template.containerTemplateItems ?? []).length,
    })),
  };
}

function assertSplitPointStraddled(tasks) {
  const straddles = tasks.some(
    (task) => timeToMinutes(task.start) < SPLIT_POINT_MINUTES && timeToMinutes(task.end) > SPLIT_POINT_MINUTES,
  );
  if (!straddles) throw new Error("Tuesday task set must contain a task that straddles the split point.");
}

async function ensureTasks(api, defs, group) {
  const tasks = [];
  for (const def of defs) {
    const result = await ensureShift(api, def, SHIFT_TYPE_TASK, group);
    tasks.push({ ...def, id: result.id, action: result.action });
  }
  return tasks;
}

async function findExistingTasks(api, defs) {
  const tasks = [];
  for (const def of defs) {
    const [match] = await findShifts(api, def, SHIFT_TYPE_TASK);
    if (!match) throw new Error(`Task "${def.name}" (${def.abbreviation}) does not exist; run without a --reset-* flag first.`);
    tasks.push({ ...def, id: match.id });
  }
  return tasks;
}

async function main() {
  const options = readOptions();
  assertSplitPointStraddled(TUESDAY_TASK_DEFS);
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await S.apiLogin(context, options);
    const api = new KlacksApi(context, options.apiUrl, token);
    const group = await loadGroup(api, options.groupId);

    const containerMatches = await findShifts(api, CONTAINER_DEF, SHIFT_TYPE_CONTAINER);
    if (options.resetTuesdayOnly) {
      if (containerMatches.length !== 1) throw new Error(`--reset-tuesday needs exactly one existing container, found ${containerMatches.length}. Run without the flag first.`);
      const container = { id: containerMatches[0].id, start: CONTAINER_DEF.start, end: CONTAINER_DEF.end };
      const tuesdayTasks = await findExistingTasks(api, TUESDAY_TASK_DEFS);
      const action = await resetTuesdayTemplate(api, container, tuesdayTasks, options.lockWaitMs);
      const items = ((await readTemplates(api, container.id)).find((template) => isPlainTemplate(template, WEEKDAY_TUESDAY))?.containerTemplateItems ?? [])
        .map((item) => `${item.startItem}-${item.endItem}`);
      console.log(JSON.stringify({ mode: "reset-tuesday", containerId: container.id, tuesdayTemplate: action, items }));
      return;
    }

    if (options.resetMondayOnly) {
      if (containerMatches.length !== 1) throw new Error(`--reset-monday needs exactly one existing container, found ${containerMatches.length}. Run without the flag first.`);
      const container = { id: containerMatches[0].id, start: CONTAINER_DEF.start, end: CONTAINER_DEF.end };
      const action = await resetMondayTemplate(api, container, options.lockWaitMs);
      const mondayTasks = await findExistingTasks(api, MONDAY_TASK_DEFS);
      const checked = await verify(api, container, mondayTasks, [], { checkTuesday: false });
      console.log(JSON.stringify({ mode: "reset-monday", containerId: container.id, mondayTemplate: action, ...checked }, null, 2));
      return;
    }

    const containerResult = await ensureShift(api, CONTAINER_DEF, SHIFT_TYPE_CONTAINER, group);
    const container = { id: containerResult.id, start: CONTAINER_DEF.start, end: CONTAINER_DEF.end };
    const mondayTasks = await ensureTasks(api, MONDAY_TASK_DEFS, group);
    const tuesdayTasks = await ensureTasks(api, TUESDAY_TASK_DEFS, group);

    await writeTemplates(api, container, [
      templateBody(container, WEEKDAY_MONDAY, []),
      templateBody(container, WEEKDAY_TUESDAY, tuesdayTasks.map((task) => templateItemBody(task, WEEKDAY_TUESDAY))),
    ], options.lockWaitMs);

    const checked = await verify(api, container, mondayTasks, tuesdayTasks, { checkTuesday: true });
    const summary = {
      mode: "seed",
      groupId: group.id,
      container: { id: container.id, name: CONTAINER_DEF.name, abbreviation: CONTAINER_DEF.abbreviation, action: containerResult.action },
      mondayTasks: mondayTasks.map(({ id, name, abbreviation, start, end, action }) => ({ id, name, abbreviation, start, end, action })),
      tuesdayTasks: tuesdayTasks.map(({ id, name, abbreviation, start, end, action }) => ({ id, name, abbreviation, start, end, action })),
      ...checked,
    };
    console.log(`containerId=${container.id}`);
    for (const task of [...mondayTasks, ...tuesdayTasks]) console.log(`task ${task.abbreviation}=${task.id}`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
