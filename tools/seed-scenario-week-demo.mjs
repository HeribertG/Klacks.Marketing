// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Idempotently seeds the weekly demo group of the video scenario-autowizard through the real REST API of a running Klacks demo instance. The
 * definition lives in lib/scenario-week-demo.mjs (shared with takes/scenario-takes.mjs and reset-scenario-demo.mjs). The AutoWizard button plans
 * the whole payment period of the shown group and the demo group Winterthur is monthly, so the take needs a group with a WEEKLY payment interval.
 * It creates / resets:
 *   - the group "Winterthur Nord" as a sibling of the demo group (same parent and calendar selection as Winterthur, paymentInterval Weekly = 0);
 *     the configuration of Winterthur is never changed,
 *   - four shifts that belong EXCLUSIVELY to this group (so the shift list of Winterthur and every other video stays untouched):
 *     Frühdienst Nord (2 employees, Mo-Fr), Spätdienst Nord, Tagdienst Nord (Mo-Fr), Wochenenddienst Nord (2 employees, Sa-So),
 *   - six existing employees of the demo group (Freud, Hoffmann, Leonhardt, Maillard, Roth, Weber) as members of the group; only the group item
 *     is added (PUT Clients with skipAddressValidation = true), their contracts are not touched.
 * Existing objects are found by name (group in the whole tree, shifts by name + abbreviation + type, employees by name inside the demo group) and
 * reset to the defined state; ids always come from the server. The seed refuses to run when a shift with the same name/abbreviation lives in
 * another group (it would be moved out of that group), when the existing group is not weekly or differs from the demo group in calendar selection
 * or parent (a PUT of the group could drop its members and shifts, so it is never repaired automatically), and when members have absences or
 * notes in the plan week (an AutoWizard accept would delete them).
 * The self-check reads everything back: shifts only in the new group and not in the demo group's shift list, exactly the six members, the plan
 * week without active scenarios, and the demo group's October (118 works) untouched.
 * CLI: --api-url  --group-id
 * Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL, KLACKS_DEMO_GROUP_ID.
 */

import { parseArgs } from "node:util";
import { request as playwrightRequest } from "playwright-core";
import * as S from "./lib/klacks-demo-session.mjs";
import {
  KlacksApi,
  HTTP_GET,
  HTTP_POST,
  SHIFTS_PATH,
  SHIFT_TYPE_TASK,
  WEEKDAY_FLAG_BY_NUMBER,
  GROUPS_PATH,
  CLIENTS_PATH,
  loadGroup,
  ensureSiblingGroup,
  searchShifts,
  findShifts,
  ensureShift,
  loadGroupEmployees,
  isMemberOf,
  ensureGroupMembership,
  durationHours,
} from "./lib/klacks-demo-api.mjs";
import { ScheduleApi, snapshotOf, worksIn } from "./lib/schedule-grid.mjs";
import { OCTOBER, OCTOBER_RANGE, PLAN_WEEK, activeScenarios, realFilter } from "./lib/scenario-demo.mjs";
import {
  WEEK_GROUP,
  WEEK_SHIFTS,
  WEEK_ABBREVIATIONS,
  WEEK_EMPLOYEES,
  PAYMENT_INTERVAL_WEEKLY,
  GROUP_ITEM_VALID_FROM,
  employeeLabel,
  shiftSlotsPerWeek,
  verifyWeekGroupResource,
  weekGroupFilter,
  groupMonthFilter,
  assertNoAbsencesOrNotes,
} from "./lib/scenario-week-demo.mjs";

const SHIFT_SCHEDULE_PATH = "Shifts/Schedule";
const SCHEDULE_ROW_LIMIT = 500;
const HH_MM_LENGTH = 5;
const MAX_WORK_DAYS_PER_WEEK = 5;
const WORK_TIME_TOLERANCE = 1e-3;
const PLAN_WEEK_PARTS = { startDate: PLAN_WEEK.from, endDate: PLAN_WEEK.until };

function readOptions() {
  const { values } = parseArgs({
    options: {
      "api-url": { type: "string" },
      "group-id": { type: "string" },
    },
  });
  return S.readSessionOptions(values);
}

const hhmm = (time) => String(time ?? "").slice(0, HH_MM_LENGTH);
const nearlyEqual = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= WORK_TIME_TOLERANCE;

function assertPlan() {
  const problems = [];
  const abbreviations = WEEK_SHIFTS.map((shift) => shift.abbreviation);
  if (new Set(abbreviations).size !== abbreviations.length) problems.push("Shift abbreviations are not unique");
  const names = WEEK_SHIFTS.map((shift) => shift.name);
  if (new Set(names).size !== names.length) problems.push("Shift names are not unique");
  const employees = WEEK_EMPLOYEES.map(employeeLabel);
  if (new Set(employees).size !== employees.length) problems.push("Employees are not unique");
  if (shiftSlotsPerWeek() > WEEK_EMPLOYEES.length * MAX_WORK_DAYS_PER_WEEK) problems.push("The weekly demand exceeds five work days per employee");
  if (problems.length > 0) throw new Error(`Seed plan is inconsistent: ${problems.join("; ")}`);
}

function pickEmployee(clients, employee) {
  const matches = clients.filter((client) => client.name === employee.name && client.firstName === employee.firstName);
  if (matches.length !== 1) throw new Error(`Needs exactly one demo employee ${employeeLabel(employee)} in the demo group, found ${matches.length}.`);
  return matches[0];
}

async function ensureWeeklyGroup(api, demoGroup) {
  const group = await ensureSiblingGroup(api, WEEK_GROUP.name, WEEK_GROUP.description, demoGroup.id, { paymentInterval: PAYMENT_INTERVAL_WEEKLY });
  const problems = verifyWeekGroupResource(await api.call(HTTP_GET, `${GROUPS_PATH}/${group.id}`), await api.call(HTTP_GET, `${GROUPS_PATH}/${demoGroup.id}`));
  if (problems.length > 0) {
    throw new Error(`The existing group "${WEEK_GROUP.name}" (${group.id}) is not usable: ${problems.join("; ")}. Fix it in the app (a PUT from here could drop its members and shifts).`);
  }
  return group;
}

async function assertNoForeignShifts(api, group) {
  for (const def of WEEK_SHIFTS) {
    const sameAbbreviation = (await searchShifts(api, def.abbreviation, SHIFT_TYPE_TASK, { anyKind: true }))
      .filter((shift) => shift.abbreviation === def.abbreviation && shift.name !== def.name);
    if (sameAbbreviation.length > 0) throw new Error(`The abbreviation ${def.abbreviation} is already used by "${sameAbbreviation[0].name}" - choose another abbreviation in lib/scenario-week-demo.mjs.`);
    for (const match of await findShifts(api, def, SHIFT_TYPE_TASK, { anyKind: true })) {
      const stored = await api.call(HTTP_GET, `${SHIFTS_PATH}/${match.id}`);
      const foreign = (stored.groups ?? []).filter((entry) => entry.id !== group.id);
      if (foreign.length > 0) {
        throw new Error(`Shift "${def.name}" (${def.abbreviation}) already exists in the group "${foreign[0].name}" - the seed would move it out of that group. Choose another name in lib/scenario-week-demo.mjs.`);
      }
    }
  }
}

function verifyShift(stored, def, group, problems) {
  const label = def.abbreviation;
  const flags = Object.values(WEEKDAY_FLAG_BY_NUMBER);
  const active = flags.filter((flag) => stored[flag]).sort();
  const expected = def.weekdays.map((number) => WEEKDAY_FLAG_BY_NUMBER[number]).sort();
  if (JSON.stringify(active) !== JSON.stringify(expected)) problems.push(`${label} weekdays are ${active.join(",")}`);
  if (stored.quantity !== def.quantity) problems.push(`${label} quantity is ${stored.quantity}, expected ${def.quantity}`);
  if (stored.sumEmployees !== def.sumEmployees) problems.push(`${label} sumEmployees is ${stored.sumEmployees}, expected ${def.sumEmployees}`);
  if (stored.isSporadic || stored.isTimeRange) problems.push(`${label} must be a plain shift (sporadic ${stored.isSporadic}, time range ${stored.isTimeRange})`);
  if (hhmm(stored.startShift) !== hhmm(def.start) || hhmm(stored.endShift) !== hhmm(def.end)) problems.push(`${label} window ${hhmm(stored.startShift)}-${hhmm(stored.endShift)} differs`);
  if (!nearlyEqual(stored.workTime, durationHours(def.start, def.end))) problems.push(`${label} work time is ${stored.workTime}, expected ${durationHours(def.start, def.end)}`);
  const groupIds = (stored.groups ?? []).map((entry) => entry.id);
  if (groupIds.length !== 1 || groupIds[0] !== group.id) problems.push(`${label} is not exclusively in "${group.name}" (groups: ${groupIds.join(",") || "none"})`);
  if (stored.untilDate != null) problems.push(`${label} has an end date ${stored.untilDate}`);
}

async function readShiftListOfGroup(api, groupId) {
  const response = await api.call(HTTP_POST, SHIFT_SCHEDULE_PATH, {
    data: { ...PLAN_WEEK_PARTS, selectedGroup: groupId, holidayDates: [], startRow: 0, rowCount: SCHEDULE_ROW_LIMIT },
  });
  return response?.shifts ?? [];
}

async function verifyMembers(api, group, employees, problems) {
  const members = await loadGroupEmployees(api, group.id);
  const expectedIds = new Set(employees.map((entry) => entry.id));
  const actualIds = new Set(members.map((client) => client.id));
  const missing = employees.filter((entry) => !actualIds.has(entry.id)).map((entry) => employeeLabel(entry.definition));
  const surplus = members.filter((client) => !expectedIds.has(client.id)).map((client) => `${client.firstName} ${client.name}`);
  if (missing.length > 0) problems.push(`members missing in the group: ${missing.join(", ")}`);
  if (surplus.length > 0) problems.push(`unexpected members in the group (remove them in the app): ${surplus.join(", ")}`);
  for (const { id, definition } of employees) {
    const client = await api.call(HTTP_GET, `${CLIENTS_PATH}/${id}`);
    if (!isMemberOf(client, group.id)) problems.push(`${employeeLabel(definition)} is not a member of "${group.name}"`);
  }
  return members.length;
}

async function verifyPlanWeek(schedule, group, demoGroup, problems) {
  const weekFilter = weekGroupFilter(group.id);
  const data = await schedule.schedule(realFilter(weekFilter));
  const worksInPlanWeek = worksIn(data, PLAN_WEEK.from, PLAN_WEEK.until).length;
  const absences = worksInPlanWeek > 0
    ? "not checked: the plan week holds works (work pauses cannot be told from absences) - run reset-scenario-demo.mjs --plan-week first"
    : await assertNoAbsencesOrNotes(schedule, data).catch((error) => {
      problems.push(error.message);
      return null;
    });
  const active = await activeScenarios(schedule, group.id);
  const activeOverlapping = active.length;
  if (activeOverlapping > 0) problems.push(`${activeOverlapping} active scenario(s) exist for the group - run reset-scenario-demo.mjs`);
  const october = snapshotOf(await schedule.schedule(groupMonthFilter(weekFilter, demoGroup.id, OCTOBER)), OCTOBER_RANGE).length;
  if (october !== OCTOBER_RANGE.expectedWorks) problems.push(`October of "${demoGroup.name}" holds ${october} works instead of ${OCTOBER_RANGE.expectedWorks}`);
  return { worksInPlanWeek, absences, activeScenarios: activeOverlapping, demoGroupOctoberWorks: october };
}

async function runSeed(api, schedule, demoGroup) {
  const problems = [];
  const group = await ensureWeeklyGroup(api, demoGroup);
  await assertNoForeignShifts(api, group);

  const shifts = [];
  for (const def of WEEK_SHIFTS) {
    const result = await ensureShift(api, def, SHIFT_TYPE_TASK, group, { anyKind: true, exclusiveGroup: true });
    shifts.push({ id: result.id, def, action: result.action });
  }

  const demoEmployees = await loadGroupEmployees(api, demoGroup.id);
  const employees = [];
  for (const definition of WEEK_EMPLOYEES) {
    const client = pickEmployee(demoEmployees, definition);
    const action = await ensureGroupMembership(api, client, group, GROUP_ITEM_VALID_FROM);
    employees.push({ definition, id: client.id, action });
  }

  for (const shift of shifts) verifyShift(await api.call(HTTP_GET, `${SHIFTS_PATH}/${shift.id}`), shift.def, group, problems);
  const memberCount = await verifyMembers(api, group, employees, problems);

  const demoRows = await readShiftListOfGroup(api, demoGroup.id);
  const polluting = [...new Set(demoRows.map((row) => row.abbreviation).filter((abbreviation) => WEEK_ABBREVIATIONS.includes(abbreviation)))];
  if (polluting.length > 0) problems.push(`The shift list of the group "${demoGroup.name}" shows ${polluting.join(", ")}`);
  const groupRows = await readShiftListOfGroup(api, group.id);
  const listed = [...new Set(groupRows.map((row) => row.abbreviation))].sort();
  if (JSON.stringify(listed) !== JSON.stringify([...WEEK_ABBREVIATIONS].sort())) {
    problems.push(`The shift list of "${group.name}" shows ${listed.join(", ") || "nothing"} instead of ${WEEK_ABBREVIATIONS.join(", ")}`);
  }

  const planWeek = await verifyPlanWeek(schedule, group, demoGroup, problems);
  if (problems.length > 0) throw new Error(`Self-check failed: ${problems.join("; ")}`);
  return {
    mode: "seed",
    demoGroupId: demoGroup.id,
    weekGroup: { id: group.id, name: group.name, action: group.action, paymentInterval: PAYMENT_INTERVAL_WEEKLY },
    shifts: shifts.map(({ id, def, action }) => ({ id, name: def.name, abbreviation: def.abbreviation, action, sumEmployees: def.sumEmployees, weekdays: def.weekdays })),
    employees: employees.map(({ definition, id, action }) => ({ employee: employeeLabel(definition), id, action })),
    memberCount,
    weeklyDemandSlots: shiftSlotsPerWeek(),
    shiftListOfDemoGroupPolluted: polluting,
    shiftListOfWeekGroup: listed,
    planWeek,
  };
}

async function main() {
  const options = readOptions();
  assertPlan();
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await S.apiLogin(context, options);
    const api = new KlacksApi(context, options.apiUrl, token);
    const schedule = new ScheduleApi(context, options, token);
    const demoGroup = await loadGroup(api, options.groupId);
    console.log(JSON.stringify(await runSeed(api, schedule, demoGroup), null, 2));
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
