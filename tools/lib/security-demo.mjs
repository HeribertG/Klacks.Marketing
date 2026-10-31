// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Definition of the security demo world of the clip series "Monatsplanung" (Bern) and "Replacement" (Biel), shared by tools/seed-security-demo.mjs and the
 * takes: the two object protection groups of canton Bern, their teams, the December orders with their cuts, wishes, vacations and planning commands per
 * stage, plus the capacity calculation and the plan evaluation of the self-check. Pure data and functions, no I/O; ids always come from the server.
 * Demand and capacity are computed from the same definitions, so the 90-100 % utilisation of the team cannot drift away from the seed.
 * @param site - key of SITES (bern, biel); one database carries exactly one site
 * @param stage - key of STAGES; the stages of a site are cumulative
 */

import { timeToMinutes, ALL_WEEKDAYS } from "./klacks-demo-api.mjs";

export const RECORDING_API_PORT = ":5011";
export const STORY_FIRST_NAME = "Sandra";
export const CANTON_PARENT_REFERENCE_GROUP = "Bern";
export const FOREIGN_NAME_FRAGMENT = "Winterthur";
export const NEUTRAL_TOWN = "Uster";

export const PERIOD = Object.freeze({ from: "2026-12-01", until: "2026-12-31", year: 2026, month: 12, isoWeek: 49 });
export const HOLIDAYS = Object.freeze(["2026-12-25", "2026-12-26"]);
export const PAYMENT_INTERVAL_MONTHLY = 2;

export const ADDRESS_VALID_FROM = "2020-01-01T00:00:00Z";
export const EMPLOYMENT_VALID_FROM = "2025-01-01T00:00:00Z";
export const CONTRACT_FROM_DATE = "2025-01-01";
export const GROUP_MEMBER_VALID_FROM = "2026-01-01T00:00:00Z";
export const CLIENT_TYPE_EMPLOYEE = 0;
export const GENDER_FEMALE = 0;
export const GENDER_MALE = 1;
export const ADDRESS_TYPE_MAIN = 0;
export const COUNTRY_CODE = "CH";
export const STATE_CODE = "BE";

export const CONTRACT_REFERENCE = "Vollzeit 160 BE";
export const SCHEDULING_RULE_NAME = "CH Sicherheitsdienst Standard";
export const HOLIDAY_WORK_EXEMPTION_TEXT = "Objektschutz rund um die Uhr, Dienst an Feiertagen vorgesehen";
export const CONTRACTS = Object.freeze({
  full: Object.freeze({ name: "Objektschutz Vollzeit BE", guaranteed: 160, minimum: 120, maximum: 200, percent: 100 }),
  part80: Object.freeze({ name: "Objektschutz Teilzeit 80 % BE", guaranteed: 128, minimum: 112, maximum: 144, percent: 80 }),
  part60: Object.freeze({ name: "Objektschutz Teilzeit 60 % BE", guaranteed: 96, minimum: 84, maximum: 108, percent: 60 }),
});

const MONDAY_TO_FRIDAY = Object.freeze([1, 2, 3, 4, 5]);

export const ORDERS = Object.freeze([
  Object.freeze({
    key: "object",
    name: "Objektdienst 24h",
    abbreviation: "OBJ",
    start: "07:00:00",
    end: "07:00:00",
    workTime: 24,
    weekdays: ALL_WEEKDAYS,
    onHolidays: true,
    parts: Object.freeze([
      Object.freeze({ name: "Objekt Tag", abbreviation: "OBT", start: "07:00:00", end: "15:00:00" }),
      Object.freeze({ name: "Objekt Abend", abbreviation: "OBA", start: "15:00:00", end: "23:00:00" }),
      Object.freeze({ name: "Objekt Nacht", abbreviation: "OBN", start: "23:00:00", end: "07:00:00" }),
    ]),
  }),
  Object.freeze({
    key: "patrol",
    name: "Revierdienst",
    abbreviation: "REV",
    start: "07:00:00",
    end: "19:00:00",
    workTime: 12,
    weekdays: ALL_WEEKDAYS,
    onHolidays: false,
    keepsWeekdayOnHolidays: true,
    parts: Object.freeze([
      Object.freeze({ name: "Revier Vormittag", abbreviation: "RVM", start: "07:00:00", end: "13:00:00" }),
      Object.freeze({ name: "Revier Nachmittag", abbreviation: "RVN", start: "13:00:00", end: "19:00:00" }),
    ]),
  }),
  Object.freeze({
    key: "reception",
    name: "Empfang",
    abbreviation: "EMP",
    start: "08:00:00",
    end: "16:30:00",
    workTime: 8.5,
    weekdays: MONDAY_TO_FRIDAY,
    onHolidays: false,
    keepsWeekdayOnHolidays: true,
    parts: null,
  }),
]);

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SATURDAY_INDEX = 6;
const MS_PER_DAY = 86400000;
const DAYS_PER_WEEK = 7;
const ISO_DATE_LENGTH = 10;

export function partHours(part) {
  const minutes = timeToMinutes(part.end) - timeToMinutes(part.start);
  return (minutes > 0 ? minutes : minutes + HOURS_PER_DAY * MINUTES_PER_HOUR) / MINUTES_PER_HOUR;
}

export const plannableParts = (order) => order.parts ?? [{ name: order.name, abbreviation: order.abbreviation, start: order.start, end: order.end }];
export const plannableAbbreviations = () => ORDERS.flatMap((order) => plannableParts(order).map((part) => part.abbreviation));

export function addDays(isoDate, days) {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH);
}

export function datesBetween(from, until) {
  const dates = [];
  for (let day = from; day <= until; day = addDays(day, 1)) dates.push(day);
  return dates;
}

const weekdayOf = (isoDate) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();

export function isoWeekOf(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const thursday = new Date(date.getTime() + (3 - ((date.getUTCDay() + SATURDAY_INDEX) % DAYS_PER_WEEK)) * MS_PER_DAY);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return `${thursday.getUTCFullYear()}-W${String(Math.ceil(((thursday.getTime() - yearStart) / MS_PER_DAY + 1) / DAYS_PER_WEEK)).padStart(2, "0")}`;
}

export function demandOf(order) {
  const days = datesBetween(PERIOD.from, PERIOD.until).filter((day) => {
    if (HOLIDAYS.includes(day) && order.onHolidays) return true;
    return order.weekdays.includes(weekdayOf(day));
  }).length;
  const parts = plannableParts(order);
  const hours = days * parts.reduce((sum, part) => sum + partHours(part), 0);
  return { order: order.abbreviation, days, slots: days * parts.length, hours };
}

const person = (key, firstName, name, gender, contract, street, zip, city, lat, lon) => Object.freeze({ key, firstName, name, gender, contract, street, zip, city, lat, lon });
const inBern = (key, firstName, name, gender, contract, street, lat, lon) => person(key, firstName, name, gender, contract, street, "3013", "Bern", lat, lon);
const inBiel = (key, firstName, name, gender, contract, street, lat, lon) => person(key, firstName, name, gender, contract, street, "2502", "Biel/Bienne", lat, lon);

const BERN_TEAM = Object.freeze([
  inBern("clara", "Clara", "Morel", GENDER_FEMALE, "full", "Lorrainestrasse 14", 46.9587, 7.4441),
  inBern("amir", "Amir", "Haddad", GENDER_MALE, "full", "Breitenrainstrasse 31", 46.9612, 7.4552),
  inBern("jonas", "Jonas", "Vogel", GENDER_MALE, "full", "Moserstrasse 8", 46.9574, 7.4497),
  inBern("lena", "Lena", "Rossi", GENDER_FEMALE, "full", "Polygonstrasse 22", 46.9589, 7.4562),
  inBern("tobias", "Tobias", "Frey", GENDER_MALE, "full", "Scheibenstrasse 41", 46.9633, 7.4471),
  inBern("nadia", "Nadia", "Bianchi", GENDER_FEMALE, "full", "Viktoriastrasse 57", 46.9571, 7.4525),
  inBern("luca", "Luca", "Steiner", GENDER_MALE, "part80", "Kasernenstrasse 19", 46.9601, 7.4613),
  inBern("sina", "Sina", "Graf", GENDER_FEMALE, "part80", "Lagerhausweg 6", 46.9622, 7.4436),
  inBern("mia", "Mia", "Baer", GENDER_FEMALE, "part60", "Wylerstrasse 27", 46.9645, 7.4503),
  inBern("priya", "Priya", "Nair", GENDER_FEMALE, "part60", "Spitalackerstrasse 12", 46.9558, 7.4531),
]);

const BIEL_TEAM = Object.freeze([
  inBiel("max", "Max", "Wenger", GENDER_MALE, "full", "Bahnhofstrasse 24", 47.1341, 7.2459),
  inBiel("elsa", "Elsa", "Dubach", GENDER_FEMALE, "full", "Dufourstrasse 9", 47.1379, 7.2502),
  inBiel("luc", "Luc", "Rochat", GENDER_MALE, "full", "Murtenstrasse 33", 47.1322, 7.2487),
  inBiel("nora", "Nora", "Favre", GENDER_FEMALE, "full", "Silbergasse 5", 47.1356, 7.2433),
  inBiel("yannick", "Yannick", "Perret", GENDER_MALE, "full", "Zentralstrasse 62", 47.1368, 7.2469),
  inBiel("selina", "Selina", "Hofer", GENDER_FEMALE, "full", "Neuengasse 17", 47.1385, 7.2445),
  inBiel("marc", "Marc", "Aebi", GENDER_MALE, "part80", "Aarbergstrasse 48", 47.1309, 7.2521),
  inBiel("tanja", "Tanja", "Moser", GENDER_FEMALE, "part80", "Mattenstrasse 11", 47.1393, 7.2537),
  inBiel("ivan", "Ivan", "Petrovic", GENDER_MALE, "part60", "Gurzelenstrasse 3", 47.1297, 7.2478),
  inBiel("zoe", "Zoe", "Gerber", GENDER_FEMALE, "part60", "Spitalstrasse 21", 47.1402, 7.2511),
]);

const CLARA_VACATION = Object.freeze({ key: "clara", from: "2026-12-24", until: "2027-01-03" });
const AMIR_VACATION = Object.freeze({ key: "amir", from: "2026-12-28", until: "2026-12-31" });
const SELINA_VACATION = Object.freeze({ key: "selina", from: "2026-12-21", until: "2026-12-27" });
const TANJA_VACATION = Object.freeze({ key: "tanja", from: "2026-12-28", until: "2027-01-03" });

export const COMMAND_FREE = "FREE";
export const COMMAND_NIGHT = "NIGHT";
export const COMMAND_NO_NIGHT = "-NIGHT";

const commandRange = (key, keyword, from, until) => datesBetween(from, until).map((day) => Object.freeze({ key, keyword, day }));

const BERN_COMMANDS = Object.freeze([
  ...commandRange("jonas", COMMAND_NO_NIGHT, "2026-12-07", "2026-12-11"),
  ...commandRange("lena", COMMAND_NIGHT, "2026-12-14", "2026-12-18"),
  Object.freeze({ key: "mia", keyword: COMMAND_NO_NIGHT, day: "2026-12-17" }),
  Object.freeze({ key: "mia", keyword: COMMAND_FREE, day: "2026-12-18" }),
]);

export const SITES = Object.freeze({
  bern: Object.freeze({
    key: "bern",
    group: Object.freeze({ name: "Bern Objektschutz", description: "Objektschutz Bern, Demo-Team" }),
    team: BERN_TEAM,
    vacations: Object.freeze([CLARA_VACATION, AMIR_VACATION]),
    commands: BERN_COMMANDS,
    stages: Object.freeze(["m1", "m2", "m3"]),
  }),
  biel: Object.freeze({
    key: "biel",
    group: Object.freeze({ name: "Biel Objektschutz", description: "Objektschutz Biel, Demo-Team" }),
    team: BIEL_TEAM,
    vacations: Object.freeze([SELINA_VACATION, TANJA_VACATION]),
    commands: Object.freeze([]),
    stages: Object.freeze(["r1", "r2"]),
    storyWorkDays: Object.freeze([
      Object.freeze({ key: "max", days: Object.freeze(["2026-12-09"]) }),
      Object.freeze({ key: "elsa", days: Object.freeze(["2026-12-14", "2026-12-15", "2026-12-16", "2026-12-17", "2026-12-18"]) }),
    ]),
  }),
});

export const STAGES = Object.freeze({
  m1: Object.freeze({ wishes: true, vacations: false, commands: false, planned: false }),
  m2: Object.freeze({ wishes: false, vacations: true, commands: false, planned: false }),
  m3: Object.freeze({ wishes: false, vacations: true, commands: true, planned: false }),
  r1: Object.freeze({ wishes: false, vacations: true, commands: true, planned: true }),
  r2: Object.freeze({ wishes: false, vacations: true, commands: true, planned: true }),
});

const VACATION_DIVISOR_DAYS = 22.5;

/** Vacation counts only on weekdays that are no official holiday (absence type Ferien: no Saturday, Sunday, holiday); measured: guaranteed hours / 22.5 per such day. */
function vacationHoursOf(vacation, member) {
  const until = vacation.until > PERIOD.until ? PERIOD.until : vacation.until;
  const counted = datesBetween(vacation.from, until).filter((day) => ![0, SATURDAY_INDEX].includes(weekdayOf(day)) && !HOLIDAYS.includes(day)).length;
  return (counted * CONTRACTS[member.contract].guaranteed) / VACATION_DIVISOR_DAYS;
}

/**
 * Capacity calculation of the plan: demand = plannable hours of December as the wizard expands them, capacity = guaranteed hours of the team minus the
 * hours its vacation covers.
 */
export function capacityOf(site) {
  const demand = ORDERS.map(demandOf);
  const demandHours = demand.reduce((sum, entry) => sum + entry.hours, 0);
  const demandSlots = demand.reduce((sum, entry) => sum + entry.slots, 0);
  const guaranteed = site.team.reduce((sum, member) => sum + (CONTRACTS[member.contract]?.guaranteed ?? 0), 0);
  const vacationHours = site.vacations.reduce((sum, vacation) => sum + vacationHoursOf(vacation, site.team.find((member) => member.key === vacation.key)), 0);
  const capacity = guaranteed - vacationHours;
  return { demand, demandHours, demandSlots, guaranteed, vacationHours: Math.round(vacationHours * 10) / 10, capacity: Math.round(capacity * 10) / 10, utilisationPercent: Math.round((demandHours / capacity) * 1000) / 10 };
}

export function assertPlan() {
  const problems = [];
  for (const site of Object.values(SITES)) {
    const labels = site.team.map((member) => `${member.firstName} ${member.name}`);
    if (new Set(labels).size !== labels.length) problems.push(`${site.key}: duplicate team members`);
    for (const entry of [...site.vacations, ...site.commands]) {
      if (!site.team.some((member) => member.key === entry.key)) problems.push(`${site.key}: unknown member ${entry.key}`);
    }
    for (const member of site.team) {
      if (member.contract && !CONTRACTS[member.contract]) problems.push(`${member.key}: unknown contract ${member.contract}`);
    }
    for (const { key, keyword, day } of site.commands) {
      if (keyword !== COMMAND_FREE) continue;
      const before = addDays(day, -1);
      if (!site.commands.some((entry) => entry.key === key && entry.day === before && entry.keyword === COMMAND_NO_NIGHT)) {
        problems.push(`${key}: FREE on ${day} needs -NIGHT on ${before}, a night part of the day before would run into the free day`);
      }
    }
  }
  const abbreviations = plannableAbbreviations();
  if (new Set(abbreviations).size !== abbreviations.length) problems.push("plannable abbreviations are not unique");
  for (const order of ORDERS) {
    const hours = plannableParts(order).reduce((sum, part) => sum + partHours(part), 0);
    if (Math.abs(hours - order.workTime) > 1e-6) problems.push(`${order.abbreviation}: parts cover ${hours} h of ${order.workTime} h`);
  }
  if (problems.length > 0) throw new Error(`Seed plan is inconsistent: ${problems.join("; ")}`);
}
