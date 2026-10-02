// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Definition of the weekly demo group of the video scenario-autowizard, shared by seed-scenario-week-demo.mjs, reset-scenario-demo.mjs and
 * takes/scenario-takes.mjs so seed and takes cannot drift apart. The AutoWizard button plans the WHOLE payment period of the shown group, and the
 * demo group Winterthur has a monthly period (an accept would replace a whole month), so the take runs in its own sibling group with a WEEKLY
 * payment interval. The group owns four shifts exclusively (so the Winterthur shift list and every other video stay untouched) and has six
 * existing Winterthur employees as members; the plan week is the same 02.-08.11.2026 that klacksy-plans-week uses.
 * @param WEEK_GROUP - name/description of the weekly group (a place name plus a compass word reads the same in every language)
 * @param WEEK_SHIFTS - the shift definitions of the group; names and abbreviations must not exist anywhere else in the database
 * @param WEEK_EMPLOYEES - existing demo employees (found by last/first name inside the Winterthur group) that become members
 * @param api - authenticated ScheduleApi (see lib/schedule-grid.mjs): json(), schedule(filter)
 */

import { WEEKDAY_MONDAY, WEEKDAY_TUESDAY, WEEKDAY_WEDNESDAY, WEEKDAY_THURSDAY, findGroupNodeByName } from "./klacks-demo-api.mjs";
import { dateKey, monthFilter } from "./schedule-grid.mjs";
import { PLAN_WEEK, SCHEDULE_ROW_LIMIT, realFilter } from "./scenario-demo.mjs";

export const PAYMENT_INTERVAL_WEEKLY = 0;
export const PAYMENT_INTERVAL_MONTHLY = 2;
export const GROUPS_TREE_API = "/api/backend/Groups/tree";
export const GROUPS_API = "/api/backend/Groups";
export const SCHEDULE_NOTES_API = "/api/backend/ScheduleNotes";
export const SEED_SCRIPT_NAME = "seed-scenario-week-demo.mjs";
export const BREAK_ENTRY_TYPE = 3;
export const GROUP_ITEM_VALID_FROM = "2026-01-01T00:00:00Z";

const WEEKDAY_FRIDAY = 5;
const WEEKDAY_SATURDAY = 6;
const WEEKDAY_SUNDAY = 0;
const WORKDAYS = [WEEKDAY_MONDAY, WEEKDAY_TUESDAY, WEEKDAY_WEDNESDAY, WEEKDAY_THURSDAY, WEEKDAY_FRIDAY];
const WEEKEND_DAYS = [WEEKDAY_SATURDAY, WEEKDAY_SUNDAY];
const EARLY_EMPLOYEES = 2;
const WEEKEND_EMPLOYEES = 2;

export const WEEK_GROUP = {
  name: "Winterthur Nord",
  description: "Wochenplan-Gruppe (Demo-Seed für das Video scenario-autowizard: wöchentliche Abrechnungsperiode, nicht Teil der Gruppe Winterthur)",
};

export const WEEK_SHIFTS = [
  { key: "early", name: "Frühdienst Nord", abbreviation: "FDN", start: "06:00:00", end: "14:00:00", weekdays: WORKDAYS, quantity: 1, sumEmployees: EARLY_EMPLOYEES },
  { key: "late", name: "Spätdienst Nord", abbreviation: "SDN", start: "14:00:00", end: "22:00:00", weekdays: WORKDAYS, quantity: 1, sumEmployees: 1 },
  { key: "day", name: "Tagdienst Nord", abbreviation: "TDN", start: "09:00:00", end: "17:00:00", weekdays: WORKDAYS, quantity: 1, sumEmployees: 1 },
  { key: "weekend", name: "Wochenenddienst Nord", abbreviation: "WDN", start: "08:00:00", end: "16:00:00", weekdays: WEEKEND_DAYS, quantity: 1, sumEmployees: WEEKEND_EMPLOYEES },
];
export const WEEK_ABBREVIATIONS = WEEK_SHIFTS.map((shift) => shift.abbreviation);

export const WEEK_EMPLOYEES = [
  { name: "Freud", firstName: "Noah" },
  { name: "Hoffmann", firstName: "Raphael" },
  { name: "Leonhardt", firstName: "Sarah" },
  { name: "Maillard", firstName: "Clara" },
  { name: "Roth", firstName: "Lukas" },
  { name: "Weber", firstName: "Max" },
];

export const employeeLabel = (employee) => `${employee.firstName} ${employee.name}`;

export function shiftSlotsPerWeek() {
  return WEEK_SHIFTS.reduce((sum, shift) => sum + shift.weekdays.length * shift.quantity * shift.sumEmployees, 0);
}

const WEEK_FILTER_DEFAULTS = {
  searchString: "",
  orderBy: "name",
  sortOrder: "asc",
  showEmployees: true,
  showExtern: true,
  individualSort: false,
  startRow: 0,
  rowCount: SCHEDULE_ROW_LIMIT,
};

/**
 * Schedule filter of the weekly group for the plan week (what the UI posts after navigating to that week), for scripts that run without a browser.
 */
export const weekGroupFilter = (groupId) => ({
  ...WEEK_FILTER_DEFAULTS,
  selectedGroup: groupId,
  paymentInterval: PAYMENT_INTERVAL_WEEKLY,
  startDate: PLAN_WEEK.from,
  endDate: PLAN_WEEK.until,
  periodStartDate: PLAN_WEEK.from,
  periodEndDate: PLAN_WEEK.until,
});

/**
 * Real-data filter for one calendar month of ANOTHER group (the demo group Winterthur) taken from a filter that was posted for the weekly group:
 * group, payment interval and period fields are replaced so nothing of the weekly view leaks into the monthly snapshot.
 */
export const groupMonthFilter = (base, groupId, period) => realFilter(base, {
  selectedGroup: groupId,
  paymentInterval: PAYMENT_INTERVAL_MONTHLY,
  currentMonth: period.month,
  currentYear: period.year,
  currentWeek: period.isoWeek,
  ...monthFilter(period),
});

export async function findWeekGroup(api) {
  const tree = await api.json(GROUPS_TREE_API);
  const node = findGroupNodeByName(tree?.nodes, WEEK_GROUP.name);
  return node ? { id: node.id, name: node.name } : null;
}

/**
 * Returns the weekly group or throws; the group must have a weekly payment interval and the calendar selection and parent of the demo group
 * (otherwise the AutoWizard would plan a different period or the holidays would differ).
 */
export async function requireWeekGroup(api, demoGroupId) {
  const found = await findWeekGroup(api);
  if (!found) throw new Error(`the group "${WEEK_GROUP.name}" does not exist - run ${SEED_SCRIPT_NAME} first`);
  const problems = verifyWeekGroupResource(await api.json(`${GROUPS_API}/${found.id}`), await api.json(`${GROUPS_API}/${demoGroupId}`));
  if (problems.length > 0) throw new Error(`the group "${WEEK_GROUP.name}" is not set up for the take: ${problems.join("; ")} - fix it or run ${SEED_SCRIPT_NAME}`);
  return found;
}

export function verifyWeekGroupResource(group, demoGroup) {
  const problems = [];
  if (group.paymentInterval !== PAYMENT_INTERVAL_WEEKLY) problems.push(`payment interval is ${group.paymentInterval}, expected ${PAYMENT_INTERVAL_WEEKLY} (weekly)`);
  if ((group.calendarSelectionId ?? null) !== (demoGroup.calendarSelectionId ?? null)) problems.push("calendar selection differs from the demo group");
  if ((group.parent ?? null) !== (demoGroup.parent ?? null)) problems.push("group is not a sibling of the demo group");
  if (group.validUntil != null) problems.push(`group ends on ${group.validUntil}`);
  return problems;
}

/**
 * AutoWizard accept soft-deletes the real BREAKS and SCHEDULE NOTES of every client of the group inside the accepted range (works only on the
 * group's own shifts), and the employees are shared with Winterthur. Fails when any break entry or note of a member lies inside the plan week.
 * The schedule entries carry no parent-work id, so work pauses cannot be told from absences: run it only when the plan week holds no works
 * (after resetPlanWeek).
 * @param data - real schedule data of the weekly group for the plan week (api.schedule(realFilter(weekFilter)))
 */
export async function assertNoAbsencesOrNotes(api, data) {
  const inPlanWeek = (value) => dateKey(value) >= PLAN_WEEK.from && dateKey(value) <= PLAN_WEEK.until;
  const members = new Set(data.clients.map((client) => client.id));
  const breaks = data.entries.filter((entry) => entry.entryType === BREAK_ENTRY_TYPE && members.has(entry.clientId) && inPlanWeek(entry.entryDate));
  const notes = ((await api.json(SCHEDULE_NOTES_API)) ?? []).filter((note) => !note.analyseToken && members.has(note.clientId) && inPlanWeek(note.currentDate));
  if (breaks.length > 0 || notes.length > 0) {
    throw new Error(`${breaks.length} absence(s) and ${notes.length} note(s) of the members lie in the plan week ${PLAN_WEEK.from}..${PLAN_WEEK.until}; an AutoWizard accept would delete them - remove them first`);
  }
  return { breaks: breaks.length, notes: notes.length };
}
