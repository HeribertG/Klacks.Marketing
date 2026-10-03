// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Definition of the demo data of the five shift-feature videos (sporadic shift, time-range shift, several employees per shift,
 * the same task several times per day at different times (a time-range shift with quantity 3), mandatory qualification), shared by seed-shift-features-demo.mjs and takes/shift-feature-takes.mjs so seed and
 * takes cannot drift apart. The shifts live EXCLUSIVELY in their own group (sibling of the demo group) together with five demo
 * employees, so the shift list of the schedule shows exactly these five shifts and no other demo video is affected.
 * @param FEATURE_GROUP - name/description of the exclusive group the shifts and the five employees belong to
 * @param FEATURE_SHIFTS - the five shift definitions by key (see SHIFT_KEY)
 * @param FEATURE_EMPLOYEES - existing demo employees (found by last/first name) that are added to the group; qualified ones get the qualification
 */

import {
  SPORADIC_SCOPE_WEEK,
  WEEKDAY_MONDAY,
  WEEKDAY_TUESDAY,
  WEEKDAY_WEDNESDAY,
  WEEKDAY_THURSDAY,
  minutesToWorkTime,
} from "./klacks-demo-api.mjs";

const WEEKDAY_FRIDAY = 5;

export const FEATURE_GROUP = {
  name: "Besondere Dienste Winterthur",
  description: "Sporadische Dienste, Zeitbereichsdienste und Dienste mit Besetzung/Qualifikation (Demo-Seed, nicht im Dienstplan der Gruppe Winterthur)",
};

export const FEATURE_PERIOD = { year: 2026, month: 12, isoWeek: 50 };
export const FEATURE_PERIOD_RANGE = { from: "2026-12-01", until: "2026-12-31" };
export const GROUP_ITEM_VALID_FROM = "2026-01-01T00:00:00Z";

export const SHIFT_KEY = {
  sporadic: "sporadic",
  timeRange: "timeRange",
  sumEmployees: "sumEmployees",
  quantity: "quantity",
  qualification: "qualification",
};

const WORKDAYS = [WEEKDAY_MONDAY, WEEKDAY_TUESDAY, WEEKDAY_WEDNESDAY, WEEKDAY_THURSDAY, WEEKDAY_FRIDAY];
const SPORADIC_DAYS_PER_WEEK = 2;
const TIME_RANGE_MINUTES = 45;
const SUM_EMPLOYEES_NEEDED = 3;
const QUANTITY_PER_DAY = 3;
const PATROL_ROUND_MINUTES = 45;

export const FEATURE_SHIFTS = {
  [SHIFT_KEY.sporadic]: {
    key: SHIFT_KEY.sporadic,
    name: "Fensterreinigung",
    abbreviation: "FEN",
    description: "Sporadischer Dienst: höchstens zwei Tage pro Woche",
    start: "08:00:00",
    end: "12:00:00",
    weekdays: WORKDAYS,
    isSporadic: true,
    sporadicScope: SPORADIC_SCOPE_WEEK,
    quantity: SPORADIC_DAYS_PER_WEEK,
    sumEmployees: 1,
  },
  [SHIFT_KEY.timeRange]: {
    key: SHIFT_KEY.timeRange,
    name: "Medikamentenlieferung",
    abbreviation: "MDL",
    description: "Zeitbereichsdienst: Fenster 08:00-14:00, Dauer 45 Minuten",
    start: "08:00:00",
    end: "14:00:00",
    weekdays: WORKDAYS,
    isTimeRange: true,
    workTime: minutesToWorkTime(TIME_RANGE_MINUTES),
    quantity: 1,
    sumEmployees: 1,
  },
  [SHIFT_KEY.sumEmployees]: {
    key: SHIFT_KEY.sumEmployees,
    name: "Inventur",
    abbreviation: "INV",
    description: "Dienst mit drei benötigten Mitarbeitenden",
    start: "09:00:00",
    end: "15:00:00",
    weekdays: WORKDAYS,
    quantity: 1,
    sumEmployees: SUM_EMPLOYEES_NEEDED,
  },
  [SHIFT_KEY.quantity]: {
    key: SHIFT_KEY.quantity,
    name: "Kontrollgang",
    abbreviation: "KGG",
    description: "Zeitbereichsdienst, dreimal pro Tag zu verschiedenen Zeiten: Fenster 08:00-18:00, Dauer 45 Minuten",
    start: "08:00:00",
    end: "18:00:00",
    weekdays: WORKDAYS,
    isTimeRange: true,
    workTime: minutesToWorkTime(PATROL_ROUND_MINUTES),
    quantity: QUANTITY_PER_DAY,
    sumEmployees: 1,
  },
  [SHIFT_KEY.qualification]: {
    key: SHIFT_KEY.qualification,
    name: "Gabelstapler-Einsatz",
    abbreviation: "GSE",
    description: "Dienst mit Pflicht-Qualifikation Staplerschein",
    start: "07:00:00",
    end: "15:00:00",
    weekdays: WORKDAYS,
    quantity: 1,
    sumEmployees: 1,
  },
};

export const FEATURE_SHIFT_LIST = Object.values(FEATURE_SHIFTS);
export const FEATURE_ABBREVIATIONS = FEATURE_SHIFT_LIST.map((shift) => shift.abbreviation);

export const QUALIFICATION_LOOKUP = { de: "Staplerschein", en: "Forklift Licence" };
export const QUALIFICATION_REQUIRED_MIN_LEVEL = 2;
export const QUALIFICATION_EMPLOYEE_LEVEL = 3;
export const QUALIFICATION_VALID_FROM = "2024-01-01";
export const QUALIFICATION_VALID_UNTIL = "2030-12-31";

export const FEATURE_EMPLOYEES = [
  { name: "Albrecht", firstName: "Elias", qualified: true },
  { name: "Baier", firstName: "Mia", qualified: false },
  { name: "Bauer", firstName: "Marius", qualified: true },
  { name: "Döring", firstName: "Elsa", qualified: false },
  { name: "Eisenmann", firstName: "Lilly", qualified: false },
];

export function employeeLabel(client) {
  return `${client.firstName} ${client.name}`;
}

export function employeeDefinition(client) {
  return FEATURE_EMPLOYEES.find((employee) => employee.name === client.name && employee.firstName === client.firstName) ?? null;
}
