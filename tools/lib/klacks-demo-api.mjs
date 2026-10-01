// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared REST helpers of the demo seed scripts (seed-container-demo, seed-route-demo): authenticated API client, idempotent
 * shift upsert (find by name + abbreviation + type, reset to the defined state), container template lock handling and
 * container template read/write. Ids always come from the server.
 * @param context - Playwright APIRequestContext used for all HTTP calls
 * @param apiUrl - Base URL of the demo API (without the /api/backend/ suffix)
 * @param token - JWT of the demo account
 */

import { randomUUID } from "node:crypto";
import * as S from "./klacks-demo-session.mjs";

export const API_BASE = "/api/backend/";
export const SHIFTS_PATH = "Shifts";
export const SHIFT_LIST_PATH = "Shifts/GetSimpleList";
export const GROUPS_PATH = "Groups";
export const GROUPS_TREE_PATH = "Groups/tree";
export const CONTAINERS_PATH = "Containers";
export const AVAILABLE_TASKS_PATH = "Containers/available-tasks";
export const TEMPLATES_SEGMENT = "templates";
export const LOCK_ACQUIRE_PATH = "ContainerLocks/Acquire";
export const LOCK_RELEASE_PATH = "ContainerLocks";
export const LOCK_RESOURCE_TYPE = "ContainerTemplate";
export const INSTANCE_ID_HEADER = "X-Instance-Id";
export const INSTANCE_ID_PREFIX = "marketing-seed-";
export const LOCK_POLL_INTERVAL_MS = 5000;
export const MS_PER_SECOND = 1000;

export const HTTP_GET = "GET";
export const HTTP_POST = "POST";
export const HTTP_PUT = "PUT";
export const HTTP_DELETE = "DELETE";

export const SHIFT_TYPE_TASK = 0;
export const SHIFT_TYPE_CONTAINER = 1;
export const SHIFT_STATUS_ORIGINAL_SHIFT = 2;
export const FILTER_TYPE_SHIFT = 1;
export const FILTER_TYPE_CONTAINER = 2;
export const LIST_PAGE_SIZE = 100;
export const FIRST_PAGE = 0;
export const TRANSPORT_MODE_DEFAULT = 0;

export const WEEKDAY_MONDAY = 1;
export const WEEKDAY_TUESDAY = 2;
export const WEEKDAY_WEDNESDAY = 3;
export const WEEKDAY_THURSDAY = 4;
export const WEEKDAY_FLAG_BY_NUMBER = {
  0: "isSunday",
  1: "isMonday",
  2: "isTuesday",
  3: "isWednesday",
  4: "isThursday",
  5: "isFriday",
  6: "isSaturday",
};
export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export const SHIFT_FROM_DATE = "2025-01-01";
export const ZERO_TIME = "00:00:00";
export const MINUTES_PER_HOUR = 60;
const WORK_TIME_DECIMALS = 4;
const NUMERIC_TOLERANCE = 1e-4;

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

export function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export function durationHours(start, end) {
  return (timeToMinutes(end) - timeToMinutes(start)) / MINUTES_PER_HOUR;
}

export function minutesToWorkTime(minutes) {
  const factor = 10 ** WORK_TIME_DECIMALS;
  return Math.round((minutes / MINUTES_PER_HOUR) * factor) / factor;
}

export function weekdayFlags(weekdays) {
  return Object.fromEntries(
    Object.entries(WEEKDAY_FLAG_BY_NUMBER).map(([number, flag]) => [flag, weekdays.includes(Number(number))]),
  );
}

export class KlacksApi {
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

export async function loadGroup(api, groupId) {
  const group = await api.call(HTTP_GET, `${GROUPS_PATH}/${groupId}`);
  return { id: group.id, name: group.name, description: group.description ?? "" };
}

function findGroupNodeByName(nodes, name) {
  for (const node of nodes ?? []) {
    if (node.name === name) return node;
    const nested = findGroupNodeByName(node.children, name);
    if (nested) return nested;
  }
  return null;
}

/**
 * Finds the group by name in the whole tree or creates it as a sibling of the reference group (same parent, same payment
 * interval and calendar selection), so the new group never appears below or inside the reference group.
 */
export async function ensureSiblingGroup(api, name, description, referenceGroupId) {
  const tree = await api.call(HTTP_GET, GROUPS_TREE_PATH);
  const existing = findGroupNodeByName(tree?.nodes, name);
  if (existing) return { id: existing.id, name: existing.name, description: existing.description ?? "", action: "unchanged" };
  const reference = await api.call(HTTP_GET, `${GROUPS_PATH}/${referenceGroupId}`);
  const created = await api.call(HTTP_POST, GROUPS_PATH, {
    data: {
      name,
      description,
      parent: reference.parent ?? null,
      validFrom: reference.validFrom,
      validUntil: null,
      paymentInterval: reference.paymentInterval,
      calendarSelectionId: reference.calendarSelectionId ?? null,
    },
  });
  return { id: created.id, name: created.name, description: created.description ?? "", action: "created" };
}

export function shiftBody(def, shiftType, group) {
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
    workTime: def.workTime ?? durationHours(def.start, def.end),
    isTimeRange: def.isTimeRange ?? false,
    clientId: def.clientId ?? null,
    ...weekdayFlags(def.weekdays),
    groups: [group],
  };
}

export async function findShifts(api, def, shiftType, { timeRange = false } = {}) {
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
      isTimeRange: timeRange,
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

function valuesDiffer(existing, desired) {
  if (typeof existing === "number" && typeof desired === "number") {
    return Math.abs(existing - desired) > NUMERIC_TOLERANCE;
  }
  return (existing ?? null) !== (desired ?? null);
}

export function shiftDiffersFromDefinition(existing, desired, groupId, { exclusiveGroup = false } = {}) {
  const fields = [
    "startShift", "endShift", "workTime", "fromDate", "status", "shiftType", "isTimeRange", "clientId",
    ...Object.values(WEEKDAY_FLAG_BY_NUMBER),
  ];
  const fieldDiffers = fields.some((field) => valuesDiffer(existing[field], desired[field]));
  const existingGroups = existing.groups ?? [];
  const inGroup = existingGroups.some((group) => group.id === groupId);
  const hasForeignGroup = exclusiveGroup && existingGroups.some((group) => group.id !== groupId);
  return fieldDiffers || !inGroup || hasForeignGroup || existing.untilDate != null;
}

export async function ensureShift(api, def, shiftType, group, { timeRange = false, exclusiveGroup = false } = {}) {
  const matches = await findShifts(api, def, shiftType, { timeRange });
  if (matches.length > 1) {
    throw new Error(`Ambiguous: ${matches.length} shifts named "${def.name}" (${def.abbreviation}) of type ${shiftType}.`);
  }
  const desired = shiftBody(def, shiftType, group);
  if (matches.length === 0) {
    const created = await api.call(HTTP_POST, SHIFTS_PATH, { data: desired });
    return { id: created.id, action: "created" };
  }
  const existing = await api.call(HTTP_GET, `${SHIFTS_PATH}/${matches[0].id}`);
  if (!shiftDiffersFromDefinition(existing, desired, group.id, { exclusiveGroup })) {
    return { id: existing.id, action: "unchanged" };
  }
  const keptGroups = (existing.groups ?? []).some((g) => g.id === group.id) ? existing.groups : [...(existing.groups ?? []), group];
  const groups = exclusiveGroup ? [group] : keptGroups;
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

export async function withTemplateLock(api, containerId, lockWaitMs, work) {
  const instanceId = `${INSTANCE_ID_PREFIX}${randomUUID()}`;
  const lock = await acquireTemplateLock(api, containerId, instanceId, lockWaitMs);
  try {
    return await work(instanceId);
  } finally {
    await api.call(HTTP_DELETE, `${LOCK_RELEASE_PATH}/${lock.id}`);
  }
}

export function templateItemBody(task, weekday) {
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

export function templateBody(container, weekday, items, extras = {}) {
  return {
    containerId: container.id,
    fromTime: container.start,
    untilTime: container.end,
    weekday,
    isWeekdayAndHoliday: false,
    isHoliday: false,
    transportMode: TRANSPORT_MODE_DEFAULT,
    containerTemplateItems: items,
    ...extras,
  };
}

export function stripNested(template) {
  return {
    ...template,
    containerTemplateItems: (template.containerTemplateItems ?? []).map(({ shift, absence, ...item }) => item),
  };
}

export function isPlainTemplate(template, weekday) {
  return template.weekday === weekday && !template.isHoliday && !template.isWeekdayAndHoliday;
}

export function mergeItemsById(desiredItems, existingItems) {
  const remaining = [...existingItems];
  return desiredItems.map((item) => {
    const index = remaining.findIndex((existing) => existing.shiftId === item.shiftId);
    if (index < 0) return item;
    const [match] = remaining.splice(index, 1);
    const { shift, absence, ...kept } = match;
    return { ...kept, ...item, id: match.id, containerTemplateId: match.containerTemplateId };
  });
}

export async function writeTemplates(api, container, desiredTemplates, lockWaitMs) {
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

export async function readTemplates(api, containerId) {
  return api.call(HTTP_GET, `${CONTAINERS_PATH}/${containerId}/${TEMPLATES_SEGMENT}`);
}

export async function readAvailableTasks(api, container, weekday) {
  return api.call(HTTP_GET, AVAILABLE_TASKS_PATH, {
    query: {
      containerId: container.id,
      weekday: String(weekday),
      fromTime: container.start,
      untilTime: container.end,
      isHoliday: "false",
      isWeekdayAndHoliday: "false",
    },
  });
}
