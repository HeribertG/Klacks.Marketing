// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Idempotently seeds the demo data for the five shift-feature marketing videos (shift-sporadic, shift-time-range, shift-sum-employees,
 * shift-quantity, shift-qualification) through the real REST API of a running Klacks demo instance. The definition lives in
 * lib/shift-feature-demo.mjs (shared with takes/shift-feature-takes.mjs). It creates / resets:
 *   - the group "Besondere Dienste Winterthur" as a sibling of the demo group (shifts and employees live ONLY there, so the shift list of
 *     the demo group and with it every other Dienstplan video stays untouched; the takes open this group's schedule in December 2026),
 *   - five shifts (all weekdays Mon-Fri): sporadic "Fensterreinigung" (scope week, quantity 2 = days per week, 1 employee per day), time-range
 *     "Medikamentenlieferung" (window 08:00-14:00, 45 min), "Inventur" (3 employees), "Kontrollgang" (3 per day), "Gabelstapler-Einsatz",
 *   - the mandatory qualification "Staplerschein" (taken from the existing catalog by name, never created) on "Gabelstapler-Einsatz",
 *   - the five demo employees Albrecht, Baier, Bauer, Doering, Eisenmann (existing employees of the demo group) as members of the group;
 *     Albrecht and Bauer additionally hold the qualification, the other three do not.
 * Existing objects are found by name + abbreviation (employees by name in the demo group) and reset to the defined state; ids always come
 * from the server. Employees are written through PUT Clients with skipAddressValidation = true so that no geocoder overwrites their addresses;
 * only group membership and qualification rows are changed, and only when they differ.
 * The self-check reads everything back and fails when a seed shift is in another group, appears in the demo group's shift list or already has
 * works in December 2026.
 * CLI: --reset-works (deletes every work of the five seed shifts in December 2026 and verifies none is left; use after an aborted take)
 *      --api-url  --group-id
 * Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL, KLACKS_DEMO_GROUP_ID.
 */

import { parseArgs } from "node:util";
import { request as playwrightRequest } from "playwright-core";
import * as S from "./lib/klacks-demo-session.mjs";
import {
  KlacksApi,
  HTTP_GET,
  HTTP_POST,
  HTTP_PUT,
  HTTP_DELETE,
  SHIFTS_PATH,
  SHIFT_TYPE_TASK,
  WEEKDAY_FLAG_BY_NUMBER,
  GROUPS_PATH,
  GROUPS_TREE_PATH,
  loadGroup,
  findGroupNodeByName,
  ensureSiblingGroup,
  findShifts,
  ensureShift,
  timeToMinutes,
} from "./lib/klacks-demo-api.mjs";
import {
  FEATURE_GROUP,
  FEATURE_SHIFT_LIST,
  FEATURE_SHIFTS,
  SHIFT_KEY,
  FEATURE_ABBREVIATIONS,
  FEATURE_EMPLOYEES,
  FEATURE_PERIOD_RANGE,
  GROUP_ITEM_VALID_FROM,
  QUALIFICATION_LOOKUP,
  QUALIFICATION_REQUIRED_MIN_LEVEL,
  QUALIFICATION_EMPLOYEE_LEVEL,
  QUALIFICATION_VALID_FROM,
  QUALIFICATION_VALID_UNTIL,
  employeeLabel,
} from "./lib/shift-feature-demo.mjs";

const QUALIFICATION_LIST_PATH = "Qualification/GetQualificationList";
const REQUIRED_QUALIFICATIONS_PATH = "Shifts/RequiredQualifications";
const CLIENTS_PATH = "Clients";
const GROUP_MEMBERS_SEGMENT = "members";
const WORK_ENTRY_TYPE = 0;
const SHIFT_SCHEDULE_PATH = "Shifts/Schedule";
const WORKS_PATH = "Works";
const WORK_SCHEDULE_PATH = "Works/Schedule";
const SCHEDULE_ROW_LIMIT = 500;
const WORK_TIME_TOLERANCE = 1e-3;
const DEMO_PERIOD_PARTS = { startDate: FEATURE_PERIOD_RANGE.from, endDate: FEATURE_PERIOD_RANGE.until };
const WORK_FILTER_DEFAULTS = {
  searchString: "",
  orderBy: "name",
  sortOrder: "asc",
  showEmployees: true,
  showExtern: true,
  individualSort: false,
  startRow: 0,
  rowCount: SCHEDULE_ROW_LIMIT,
};
const HH_MM_LENGTH = 5;
const SHIFT_LIST_VISIBLE_ROWS_MAX = FEATURE_SHIFT_LIST.length;

function readOptions() {
  const { values } = parseArgs({
    options: {
      "reset-works": { type: "boolean", default: false },
      "api-url": { type: "string" },
      "group-id": { type: "string" },
    },
  });
  return { ...S.readSessionOptions(values), resetWorks: values["reset-works"] };
}

const hhmm = (time) => String(time ?? "").slice(0, HH_MM_LENGTH);
const dateKey = (value) => String(value ?? "").slice(0, FEATURE_PERIOD_RANGE.from.length);
const nearlyEqual = (a, b, tolerance) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tolerance;

function assertPlan() {
  const problems = [];
  const abbreviations = FEATURE_SHIFT_LIST.map((shift) => shift.abbreviation);
  if (new Set(abbreviations).size !== abbreviations.length) problems.push("Shift abbreviations are not unique");
  const names = FEATURE_SHIFT_LIST.map((shift) => shift.name);
  if (new Set(names).size !== names.length) problems.push("Shift names are not unique");
  const timeRange = FEATURE_SHIFTS[SHIFT_KEY.timeRange];
  const windowMinutes = timeToMinutes(timeRange.end) - timeToMinutes(timeRange.start);
  if (timeRange.workTime * 60 > windowMinutes) problems.push("Time-range duration is longer than its window");
  if (FEATURE_EMPLOYEES.every((employee) => employee.qualified) || FEATURE_EMPLOYEES.every((employee) => !employee.qualified)) {
    problems.push("The employees must include qualified and unqualified ones");
  }
  if (problems.length > 0) throw new Error(`Seed plan is inconsistent: ${problems.join("; ")}`);
}

function localizedName(qualification) {
  const name = qualification.name;
  if (typeof name === "string") return { de: name };
  return name ?? {};
}

async function resolveQualification(api) {
  const list = (await api.call(HTTP_GET, QUALIFICATION_LIST_PATH)) ?? [];
  const byLanguage = (language) => list.filter((entry) => !entry.isDeleted && localizedName(entry)[language] === QUALIFICATION_LOOKUP[language]);
  for (const language of Object.keys(QUALIFICATION_LOOKUP)) {
    const matches = byLanguage(language);
    if (matches.length > 1) throw new Error(`Ambiguous: ${matches.length} qualifications named "${QUALIFICATION_LOOKUP[language]}" (${language}).`);
    if (matches.length === 1) return { id: matches[0].id, name: QUALIFICATION_LOOKUP[language], isTimeLimited: Boolean(matches[0].isTimeLimited) };
  }
  throw new Error(`Qualification "${QUALIFICATION_LOOKUP.de}" / "${QUALIFICATION_LOOKUP.en}" does not exist in the catalog.`);
}

async function ensureRequiredQualification(api, shift, qualification) {
  const rows = (await api.call(HTTP_GET, `${REQUIRED_QUALIFICATIONS_PATH}/${shift.id}`)) ?? [];
  const other = rows.filter((row) => row.qualificationId !== qualification.id);
  for (const row of other) await api.call(HTTP_DELETE, `${REQUIRED_QUALIFICATIONS_PATH}/${row.id}`);
  const existing = rows.find((row) => row.qualificationId === qualification.id);
  if (existing && existing.isMandatory && existing.minLevel === QUALIFICATION_REQUIRED_MIN_LEVEL && other.length === 0) return "unchanged";
  await api.call(HTTP_POST, REQUIRED_QUALIFICATIONS_PATH, {
    data: { shiftId: shift.id, qualificationId: qualification.id, isMandatory: true, minLevel: QUALIFICATION_REQUIRED_MIN_LEVEL },
  });
  return existing ? "updated" : "created";
}

async function removeRequiredQualifications(api, shift) {
  const rows = (await api.call(HTTP_GET, `${REQUIRED_QUALIFICATIONS_PATH}/${shift.id}`)) ?? [];
  for (const row of rows) await api.call(HTTP_DELETE, `${REQUIRED_QUALIFICATIONS_PATH}/${row.id}`);
  return rows.length;
}

async function loadDemoEmployees(api, demoGroupId) {
  const members = (await api.call(HTTP_GET, `${GROUPS_PATH}/${demoGroupId}/${GROUP_MEMBERS_SEGMENT}`)) ?? [];
  const clientIds = [...new Set(members.map((member) => member.clientId ?? member.client?.id).filter(Boolean))];
  const clients = [];
  for (const id of clientIds) clients.push(await api.call(HTTP_GET, `${CLIENTS_PATH}/${id}`));
  return clients.filter((client) => client && !client.isDeleted);
}

function pickEmployee(clients, employee) {
  const matches = clients.filter((client) => client.name === employee.name && client.firstName === employee.firstName);
  if (matches.length !== 1) throw new Error(`Needs exactly one demo employee ${employee.firstName} ${employee.name} in the demo group, found ${matches.length}.`);
  return matches[0];
}

function memberOf(client, groupId) {
  return (client.groupItems ?? []).some((item) => item.groupId === groupId);
}

function qualificationRow(client, qualificationId) {
  return (client.qualifications ?? []).find((row) => row.qualificationId === qualificationId) ?? null;
}

function qualificationMatches(row, qualification) {
  return Boolean(row)
    && row.level === QUALIFICATION_EMPLOYEE_LEVEL
    && (!qualification.isTimeLimited || (dateKey(row.validUntil) === QUALIFICATION_VALID_UNTIL && dateKey(row.validFrom) === QUALIFICATION_VALID_FROM));
}

function desiredQualification(client, qualification) {
  return {
    clientId: client.id,
    qualificationId: qualification.id,
    level: QUALIFICATION_EMPLOYEE_LEVEL,
    validFrom: qualification.isTimeLimited ? QUALIFICATION_VALID_FROM : null,
    validUntil: qualification.isTimeLimited ? QUALIFICATION_VALID_UNTIL : null,
    note: null,
  };
}

async function ensureEmployee(api, client, employee, group, qualification) {
  const changes = [];
  let groupItems = client.groupItems ?? [];
  if (!memberOf(client, group.id)) {
    groupItems = [...groupItems, { groupId: group.id, clientId: client.id, groupName: group.name, description: group.description, validFrom: GROUP_ITEM_VALID_FROM, validUntil: null }];
    changes.push("group");
  }
  let qualifications = client.qualifications ?? [];
  const row = qualificationRow(client, qualification.id);
  if (employee.qualified && !qualificationMatches(row, qualification)) {
    qualifications = [...qualifications.filter((entry) => entry.qualificationId !== qualification.id), { ...(row ?? {}), ...desiredQualification(client, qualification) }];
    changes.push("qualification added");
  } else if (!employee.qualified && row) {
    qualifications = qualifications.filter((entry) => entry.qualificationId !== qualification.id);
    changes.push("qualification removed");
  }
  if (changes.length === 0) return { id: client.id, action: "unchanged", changes };
  await api.call(HTTP_PUT, CLIENTS_PATH, {
    data: { ...client, groupItems, qualifications, skipAddressValidation: true },
  });
  return { id: client.id, action: "updated", changes };
}

async function readSchedulesOfGroup(api, groupId) {
  const response = await api.call(HTTP_POST, SHIFT_SCHEDULE_PATH, {
    data: { ...DEMO_PERIOD_PARTS, selectedGroup: groupId, holidayDates: [], startRow: 0, rowCount: SCHEDULE_ROW_LIMIT },
  });
  return response?.shifts ?? [];
}

async function worksOfSeedShifts(api, group, shifts) {
  const ids = new Set(shifts.map((shift) => shift.id));
  const data = await api.call(HTTP_POST, WORK_SCHEDULE_PATH, {
    data: {
      ...WORK_FILTER_DEFAULTS,
      ...DEMO_PERIOD_PARTS,
      periodStartDate: FEATURE_PERIOD_RANGE.from,
      periodEndDate: FEATURE_PERIOD_RANGE.until,
      selectedGroup: group.id,
    },
  });
  return (data?.entries ?? []).filter((entry) => entry.entryType === WORK_ENTRY_TYPE && ids.has(entry.entryId));
}

async function deleteSeedWorks(api, group, shifts) {
  const works = await worksOfSeedShifts(api, group, shifts);
  for (const work of works) {
    await api.call(HTTP_DELETE, `${WORKS_PATH}/${work.id}`, { query: { periodStart: FEATURE_PERIOD_RANGE.from, periodEnd: FEATURE_PERIOD_RANGE.until } });
  }
  return works.length;
}

function verifyShift(stored, def, group, problems) {
  const label = def.abbreviation;
  const activeWeekdays = Object.values(WEEKDAY_FLAG_BY_NUMBER).filter((flag) => stored[flag]);
  const expectedWeekdays = def.weekdays.map((number) => WEEKDAY_FLAG_BY_NUMBER[number]);
  if (JSON.stringify([...activeWeekdays].sort()) !== JSON.stringify([...expectedWeekdays].sort())) problems.push(`${label} weekdays are ${activeWeekdays.join(",")}`);
  if (stored.quantity !== def.quantity) problems.push(`${label} quantity is ${stored.quantity}, expected ${def.quantity}`);
  if (stored.sumEmployees !== def.sumEmployees) problems.push(`${label} sumEmployees is ${stored.sumEmployees}, expected ${def.sumEmployees}`);
  if (Boolean(stored.isSporadic) !== Boolean(def.isSporadic)) problems.push(`${label} isSporadic is ${stored.isSporadic}`);
  if (def.isSporadic && stored.sporadicScope !== def.sporadicScope) problems.push(`${label} sporadicScope is ${stored.sporadicScope}, expected ${def.sporadicScope}`);
  if (Boolean(stored.isTimeRange) !== Boolean(def.isTimeRange)) problems.push(`${label} isTimeRange is ${stored.isTimeRange}`);
  if (hhmm(stored.startShift) !== hhmm(def.start) || hhmm(stored.endShift) !== hhmm(def.end)) problems.push(`${label} window ${hhmm(stored.startShift)}-${hhmm(stored.endShift)} differs`);
  if (def.workTime !== undefined && !nearlyEqual(stored.workTime, def.workTime, WORK_TIME_TOLERANCE)) problems.push(`${label} work time is ${stored.workTime}, expected ${def.workTime}`);
  const groupIds = (stored.groups ?? []).map((entry) => entry.id);
  if (groupIds.length !== 1 || groupIds[0] !== group.id) problems.push(`${label} is not exclusively in "${group.name}" (groups: ${groupIds.join(",") || "none"})`);
  if (stored.untilDate != null) problems.push(`${label} has an end date ${stored.untilDate}`);
}

async function verifyShifts(api, shifts, group, problems) {
  for (const shift of shifts) {
    verifyShift(await api.call(HTTP_GET, `${SHIFTS_PATH}/${shift.id}`), shift.def, group, problems);
  }
}

async function verifyRequiredQualification(api, shifts, qualification, problems) {
  const state = {};
  for (const shift of shifts) {
    const rows = (await api.call(HTTP_GET, `${REQUIRED_QUALIFICATIONS_PATH}/${shift.id}`)) ?? [];
    const expected = shift.def.key === SHIFT_KEY.qualification;
    if (!expected && rows.length > 0) problems.push(`${shift.def.abbreviation} unexpectedly requires ${rows.length} qualification(s)`);
    if (expected) {
      const [row] = rows;
      if (rows.length !== 1 || row.qualificationId !== qualification.id || !row.isMandatory || row.minLevel !== QUALIFICATION_REQUIRED_MIN_LEVEL) {
        problems.push(`${shift.def.abbreviation} does not require exactly the mandatory qualification "${qualification.name}" at level ${QUALIFICATION_REQUIRED_MIN_LEVEL}`);
      }
      state[shift.def.abbreviation] = rows.map((entry) => ({ qualificationId: entry.qualificationId, mandatory: entry.isMandatory, minLevel: entry.minLevel }));
    }
  }
  return state;
}

async function verifyEmployees(api, employees, group, qualification, problems) {
  const state = [];
  for (const { definition, id } of employees) {
    const client = await api.call(HTTP_GET, `${CLIENTS_PATH}/${id}`);
    const label = employeeLabel(definition);
    if (!memberOf(client, group.id)) problems.push(`${label} is not a member of "${group.name}"`);
    const row = qualificationRow(client, qualification.id);
    if (definition.qualified && !qualificationMatches(row, qualification)) problems.push(`${label} does not hold the qualification at level ${QUALIFICATION_EMPLOYEE_LEVEL}`);
    if (!definition.qualified && row) problems.push(`${label} holds the qualification although it must be missing`);
    state.push({ employee: label, qualified: Boolean(row) });
  }
  return state;
}

async function verifyGroupSchedule(api, demoGroup, group, problems) {
  const demoRows = await readSchedulesOfGroup(api, demoGroup.id);
  const polluting = [...new Set(demoRows.map((row) => row.abbreviation).filter((abbreviation) => FEATURE_ABBREVIATIONS.includes(abbreviation)))];
  if (polluting.length > 0) problems.push(`The shift list of the group "${demoGroup.name}" shows ${polluting.join(", ")}`);
  const rows = await readSchedulesOfGroup(api, group.id);
  const abbreviations = [...new Set(rows.map((row) => row.abbreviation))].sort();
  if (JSON.stringify(abbreviations) !== JSON.stringify([...FEATURE_ABBREVIATIONS].sort())) {
    problems.push(`The shift list of "${group.name}" shows ${abbreviations.join(", ") || "nothing"} instead of ${FEATURE_ABBREVIATIONS.join(", ")}`);
  }
  if (abbreviations.length > SHIFT_LIST_VISIBLE_ROWS_MAX) problems.push("The shift list of the feature group shows more shifts than the seed defines");
  const engaged = rows.filter((row) => row.engaged > 0 || row.sporadicStatus > 0);
  if (engaged.length > 0) problems.push(`${engaged.length} shift cells of "${group.name}" in December are already engaged or sealed`);
  return { demoGroupRows: demoRows.length, demoGroupSeedShifts: polluting, featureGroupShifts: abbreviations, featureGroupCells: rows.length };
}

async function runResetWorks(api) {
  const group = await findFeatureGroup(api);
  const shifts = await findSeedShifts(api);
  const deleted = await deleteSeedWorks(api, group, shifts);
  const left = (await worksOfSeedShifts(api, group, shifts)).length;
  if (left !== 0) throw new Error(`${left} works of the seed shifts are left in December after the reset`);
  return { mode: "reset-works", group: { id: group.id, name: group.name }, deletedWorks: deleted, remainingWorks: left };
}

async function findFeatureGroup(api) {
  const tree = await api.call(HTTP_GET, GROUPS_TREE_PATH);
  const node = findGroupNodeByName(tree?.nodes, FEATURE_GROUP.name);
  if (!node) throw new Error(`Group "${FEATURE_GROUP.name}" does not exist; run without --reset-works first.`);
  return { id: node.id, name: node.name, description: node.description ?? "" };
}

async function findSeedShifts(api) {
  const shifts = [];
  for (const def of FEATURE_SHIFT_LIST) {
    const matches = await findShifts(api, def, SHIFT_TYPE_TASK, { anyKind: true });
    if (matches.length !== 1) throw new Error(`Needs exactly one shift "${def.name}" (${def.abbreviation}), found ${matches.length}; run without --reset-works first.`);
    shifts.push({ id: matches[0].id, def });
  }
  return shifts;
}

async function runSeed(api, demoGroup) {
  const problems = [];
  const group = await ensureSiblingGroup(api, FEATURE_GROUP.name, FEATURE_GROUP.description, demoGroup.id);
  const qualification = await resolveQualification(api);

  const shifts = [];
  for (const def of FEATURE_SHIFT_LIST) {
    const result = await ensureShift(api, def, SHIFT_TYPE_TASK, group, { anyKind: true, exclusiveGroup: true });
    shifts.push({ id: result.id, def, action: result.action });
  }
  const qualificationShift = shifts.find((shift) => shift.def.key === SHIFT_KEY.qualification);
  const requiredActions = {};
  for (const shift of shifts) {
    requiredActions[shift.def.abbreviation] = shift === qualificationShift
      ? await ensureRequiredQualification(api, shift, qualification)
      : `removed ${await removeRequiredQualifications(api, shift)}`;
  }

  const demoEmployees = await loadDemoEmployees(api, demoGroup.id);
  const employees = [];
  for (const definition of FEATURE_EMPLOYEES) {
    const client = pickEmployee(demoEmployees, definition);
    const result = await ensureEmployee(api, client, definition, group, qualification);
    employees.push({ definition, id: client.id, action: result.action, changes: result.changes });
  }

  await verifyShifts(api, shifts, group, problems);
  const required = await verifyRequiredQualification(api, shifts, qualification, problems);
  const employeeState = await verifyEmployees(api, employees, group, qualification, problems);
  const schedule = await verifyGroupSchedule(api, demoGroup, group, problems);
  const seedWorks = (await worksOfSeedShifts(api, group, shifts)).length;
  if (seedWorks > 0) problems.push(`${seedWorks} works of the seed shifts already exist in December - run with --reset-works`);

  if (problems.length > 0) throw new Error(`Self-check failed: ${problems.join("; ")}`);
  return {
    mode: "seed",
    demoGroupId: demoGroup.id,
    featureGroup: { id: group.id, name: group.name, action: group.action },
    qualification: { id: qualification.id, name: qualification.name, timeLimited: qualification.isTimeLimited },
    shifts: shifts.map(({ id, def, action }) => ({ id, name: def.name, abbreviation: def.abbreviation, action, quantity: def.quantity, sumEmployees: def.sumEmployees })),
    requiredQualifications: { actions: requiredActions, state: required },
    employees: employees.map(({ definition, id, action, changes }) => ({ employee: employeeLabel(definition), id, action, changes })),
    employeeState,
    schedule,
  };
}

async function main() {
  const options = readOptions();
  assertPlan();
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await S.apiLogin(context, options);
    const api = new KlacksApi(context, options.apiUrl, token);
    const demoGroup = await loadGroup(api, options.groupId);
    const summary = options.resetWorks ? await runResetWorks(api) : await runSeed(api, demoGroup);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
