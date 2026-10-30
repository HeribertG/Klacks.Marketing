// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared definition of the Spitex demo (story clips A/B "Klacksy plans home-care visits in two weekly tours"): the group "Spitex Winterthur",
 * the base branch, twenty-four patients with FIXED coordinates in two clusters several kilometres apart (Wülflingen/Veltheim in the west,
 * Seen in the east; twelve each), the nursing team of the group with its regular shifts in DEMO_WEEK, and the twenty-four open TimeRange
 * orders (one per patient, each on a weekly pattern, all in the group), used by seed-spitex-demo.mjs and the takes so seed and takes cannot
 * drift apart. There are no subgroups: Klacksy splits the patients into two tours by location, a patient stays in one tour all week, and
 * the clusters are only used to CHECK that each tour stays in one area. The tours are unevenly full on purpose (5 visits on Mon/Wed/Fri,
 * 4 on Tue, 7 on Thu per tour). Coordinates are the Nominatim (OpenStreetMap) result of the street address on 2026-10-29/30, stored as
 * fixed values; the names are fictional.
 * @param CLUSTERS - the two areas of the patients (verification only, never written to the database)
 * @param PATIENTS - customers (type 2, natural persons) with the address the order is fulfilled at, their cluster, the order they get and
 *   its weekly pattern (PATTERN_MON_WED_FRI, PATTERN_TUE_THU, PATTERN_THU)
 * @param TEAM - the employees of the group with contract, membership and group membership valid on DEMO_DAY
 * @param NURSE / SECOND_NURSE - the two team members that are free all of DEMO_WEEK and take one tour each in clip B
 * @param TOUR_WINDOW - the day budget of a tour (08:00-15:30): MAX_VISITS_PER_DAY visits of one cluster fit
 * @param REGULAR_SHIFTS / TEAM_WEEK - the regular shifts of the team and who works which of them on which day of the demo week
 * @param ORDER - the shared TimeRange pattern: window 08:00-17:00, 45 minutes of work, valid in DEMO_WEEK
 */

import { WEEKDAY_MONDAY, WEEKDAY_TUESDAY, WEEKDAY_WEDNESDAY, WEEKDAY_THURSDAY, WEEKDAY_FLAG_BY_NUMBER, MINUTES_PER_HOUR, minutesToWorkTime } from "./klacks-demo-api.mjs";

export const DEMO_DAY = "2026-11-26";
export const DEMO_WEEKDAY = WEEKDAY_THURSDAY;
const WEEKDAY_FRIDAY = 5;
export const PATTERN_MON_WED_FRI = Object.freeze([WEEKDAY_MONDAY, WEEKDAY_WEDNESDAY, WEEKDAY_FRIDAY]);
export const PATTERN_TUE_THU = Object.freeze([WEEKDAY_TUESDAY, WEEKDAY_THURSDAY]);
export const PATTERN_THU = Object.freeze([WEEKDAY_THURSDAY]);
export const WORK_WEEKDAYS = Object.freeze([WEEKDAY_MONDAY, WEEKDAY_TUESDAY, WEEKDAY_WEDNESDAY, WEEKDAY_THURSDAY, WEEKDAY_FRIDAY]);
export const MAX_VISITS_PER_DAY = 8;
export const DEMO_WEEKDAY_FLAG = WEEKDAY_FLAG_BY_NUMBER[DEMO_WEEKDAY];

export const RECORDING_API_PORT = ":5011";
export const STORY_FIRST_NAME = "Sandra";
export const ADDRESS_VALID_FROM = "2020-01-01T00:00:00Z";
export const EMPLOYMENT_VALID_FROM = "2025-01-01T00:00:00Z";
export const CONTRACT_FROM_DATE = "2025-01-01";
export const GROUP_MEMBER_VALID_FROM = "2026-01-01T00:00:00Z";
export const NURSE_CONTRACT_NAME = "Vollzeit 160 ZH";

export const CLIENT_TYPE_EMPLOYEE = 0;
export const CLIENT_TYPE_CUSTOMER = 2;
export const GENDER_FEMALE = 0;
export const GENDER_MALE = 1;
export const ADDRESS_TYPE_MAIN = 0;
export const COUNTRY_CODE = "CH";
export const STATE_CODE = "ZH";
export const CITY = "Winterthur";
export const COORDINATE_TOLERANCE = 1e-6;
export const WINTERTHUR_BOUNDS = { latMin: 47.43, latMax: 47.55, lonMin: 8.63, lonMax: 8.83 };

export const GROUP = {
  name: "Spitex Winterthur",
  description: "Spitex-Einsätze Winterthur (Demo-Seed für die Spitex-Clips)",
};

export const AREA_WEST = "west";
export const AREA_EAST = "east";
export const CLUSTERS = Object.freeze({
  [AREA_WEST]: Object.freeze({ key: AREA_WEST, label: "Wülflingen/Veltheim" }),
  [AREA_EAST]: Object.freeze({ key: AREA_EAST, label: "Seen" }),
});
export const AREA_KEYS = Object.freeze([AREA_WEST, AREA_EAST]);
export const TOUR_WINDOW = Object.freeze({ from: "08:00", until: "15:30" });

export const BRANCH = {
  name: "Spitex-Stützpunkt Winterthur",
  street: "Technikumstrasse 20",
  zip: "8400",
  city: CITY,
  lat: 47.4980042,
  lon: 8.7299946,
};
export const BASE_ADDRESS = `${BRANCH.street}, ${BRANCH.zip} ${BRANCH.city}`;

const person = (key, firstName, name, gender, street, zip, lat, lon) => Object.freeze({ key, firstName, name, gender, street, zip, city: CITY, lat, lon });

export const TEAM = Object.freeze([
  person("arnold", "Sabrina", "Arnold", GENDER_FEMALE, "Büelrainstrasse 20", "8400", 47.4953911, 8.7285807),
  person("frei", "Daniela", "Frei", GENDER_FEMALE, "Lindstrasse 20", "8400", 47.5067741, 8.7269145),
  person("baumann", "Thomas", "Baumann", GENDER_MALE, "Bankstrasse 10", "8400", 47.5006913, 8.7256918),
  person("steiner", "Nicole", "Steiner", GENDER_FEMALE, "St. Gallerstrasse 50", "8400", 47.4980409, 8.7396236),
  person("graf", "Martina", "Graf", GENDER_FEMALE, "Stadthausstrasse 10", "8400", 47.5004741, 8.7268217),
  person("kunz", "Reto", "Kunz", GENDER_MALE, "Frauenfelderstrasse 30", "8404", 47.5073109, 8.7588058),
]);
export const NURSE = TEAM[0];
export const SECOND_NURSE = TEAM[1];
export const TOUR_NURSES = Object.freeze([NURSE, SECOND_NURSE]);

export const REGULAR_SHIFTS = Object.freeze({
  early: Object.freeze({ key: "early", name: "Spitex Frühdienst", abbreviation: "SFD", start: "07:00:00", end: "15:30:00" }),
  late: Object.freeze({ key: "late", name: "Spitex Spätdienst", abbreviation: "SSD", start: "13:00:00", end: "21:30:00" }),
});
export const DEMO_WEEK = Object.freeze(["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"]);
export const DEMO_PERIOD = Object.freeze({ from: "2026-11-01", until: "2026-11-30" });
const EARLY = REGULAR_SHIFTS.early.key;
const LATE = REGULAR_SHIFTS.late.key;
export const TEAM_WEEK = Object.freeze({
  arnold: Object.freeze([null, null, null, null, null]),
  frei: Object.freeze([null, null, null, null, null]),
  baumann: Object.freeze([EARLY, null, EARLY, EARLY, LATE]),
  steiner: Object.freeze([LATE, EARLY, null, LATE, EARLY]),
  graf: Object.freeze([null, LATE, LATE, EARLY, EARLY]),
  kunz: Object.freeze([EARLY, EARLY, null, LATE, null]),
});

export const ORDER = Object.freeze({
  start: "08:00:00",
  end: "17:00:00",
  visitMinutes: 45,
  quantity: 1,
  sumEmployees: 1,
  isTimeRange: true,
  isSporadic: false,
});
export const ORDER_WORK_TIME = minutesToWorkTime(ORDER.visitMinutes);
export const WORK_TIME_TOLERANCE = 1e-3;
export { MINUTES_PER_HOUR };

const patient = (area, key, firstName, name, gender, street, zip, lat, lon, abbreviation, weekdays) => Object.freeze({
  area, key, firstName, name, gender, street, zip, city: CITY, lat, lon,
  order: Object.freeze({ name: `Hausbesuch ${name}`, abbreviation, weekdays }),
});

export const PATIENTS = Object.freeze([
  patient(AREA_WEST, "bachmann", "Erika", "Bachmann", GENDER_FEMALE, "Oberfeldstrasse 40", "8408", 47.5068606, 8.7030865, "SXBA", PATTERN_MON_WED_FRI),
  patient(AREA_WEST, "marti", "Elsbeth", "Marti", GENDER_FEMALE, "Wülflingerstrasse 60", "8400", 47.5069737, 8.7129011, "SXMA", PATTERN_MON_WED_FRI),
  patient(AREA_WEST, "luethi", "Heidi", "Lüthi", GENDER_FEMALE, "Bachtelstrasse 30", "8400", 47.5096046, 8.7187385, "SXLU", PATTERN_MON_WED_FRI),
  patient(AREA_WEST, "studer", "Bruno", "Studer", GENDER_MALE, "Wülflingerstrasse 250", "8408", 47.5107931, 8.6945357, "SXST", PATTERN_MON_WED_FRI),
  patient(AREA_WEST, "gerber", "Hans-Peter", "Gerber", GENDER_MALE, "Hohfurristrasse 10", "8408", 47.5090163, 8.694647, "SXGE", PATTERN_MON_WED_FRI),
  patient(AREA_WEST, "hofstetter", "Margrit", "Hofstetter", GENDER_FEMALE, "Weinbergstrasse 50", "8408", 47.5103254, 8.7103597, "SXHO", PATTERN_TUE_THU),
  patient(AREA_WEST, "egli", "Kurt", "Egli", GENDER_MALE, "Wülflingerstrasse 200", "8408", 47.5134791, 8.6858329, "SXEG", PATTERN_TUE_THU),
  patient(AREA_WEST, "zbinden", "Walter", "Zbinden", GENDER_MALE, "Wässerwiesenstrasse 30", "8408", 47.5134307, 8.683298, "SXZB", PATTERN_TUE_THU),
  patient(AREA_WEST, "ammann", "Lydia", "Ammann", GENDER_FEMALE, "Schaffhauserstrasse 40", "8400", 47.5084337, 8.7232903, "SXAM", PATTERN_TUE_THU),
  patient(AREA_WEST, "bosshard", "Emil", "Bosshard", GENDER_MALE, "Neuwiesenstrasse 30", "8400", 47.5037934, 8.7222248, "SXBO", PATTERN_THU),
  patient(AREA_WEST, "ziegler", "Klara", "Ziegler", GENDER_FEMALE, "Wülflingerstrasse 120", "8408", 47.5085416, 8.7081346, "SXZI", PATTERN_THU),
  patient(AREA_WEST, "fehr", "Otto", "Fehr", GENDER_MALE, "Wülflingerstrasse 90", "8400", 47.5077552, 8.7108465, "SXFE", PATTERN_THU),
  patient(AREA_EAST, "keller", "Rosmarie", "Keller", GENDER_FEMALE, "Oberseenerstrasse 94", "8405", 47.4800642, 8.7731295, "SXKE", PATTERN_MON_WED_FRI),
  patient(AREA_EAST, "hess", "Verena", "Hess", GENDER_FEMALE, "Oberseenerstrasse 150", "8405", 47.4780009, 8.7748775, "SXHE", PATTERN_MON_WED_FRI),
  patient(AREA_EAST, "brunner", "Ernst", "Brunner", GENDER_MALE, "Oberseenerstrasse 100", "8405", 47.4799666, 8.7736962, "SXBR", PATTERN_MON_WED_FRI),
  patient(AREA_EAST, "wyss", "Fritz", "Wyss", GENDER_MALE, "Kanzleistrasse 20", "8405", 47.4844745, 8.7633688, "SXWY", PATTERN_MON_WED_FRI),
  patient(AREA_EAST, "kaufmann", "Ruth", "Kaufmann", GENDER_FEMALE, "Hinterdorfstrasse 10", "8405", 47.4848061, 8.7608266, "SXKA", PATTERN_MON_WED_FRI),
  patient(AREA_EAST, "widmer", "Paul", "Widmer", GENDER_MALE, "Landvogt-Waser-Strasse 50", "8405", 47.4866977, 8.7622842, "SXWI", PATTERN_TUE_THU),
  patient(AREA_EAST, "schaerer", "Annemarie", "Schärer", GENDER_FEMALE, "Tösstalstrasse 250", "8405", 47.4835236, 8.760516, "SXSC", PATTERN_TUE_THU),
  patient(AREA_EAST, "lehmann", "Josef", "Lehmann", GENDER_MALE, "Tösstalstrasse 100", "8400", 47.4921516, 8.7443823, "SXLE", PATTERN_TUE_THU),
  patient(AREA_EAST, "meili", "Hedwig", "Meili", GENDER_FEMALE, "Oberseenerstrasse 60", "8405", 47.4796555, 8.7696716, "SXME", PATTERN_TUE_THU),
  patient(AREA_EAST, "sigg", "Alfred", "Sigg", GENDER_MALE, "Oberseenerstrasse 40", "8405", 47.4812556, 8.7667425, "SXSI", PATTERN_THU),
  patient(AREA_EAST, "weber", "Gertrud", "Weber", GENDER_FEMALE, "Tösstalstrasse 180", "8405", 47.4884086, 8.751785, "SXWE", PATTERN_THU),
  patient(AREA_EAST, "ott", "Max", "Ott", GENDER_MALE, "Oberseenerstrasse 70", "8405", 47.4794218, 8.7718236, "SXOT", PATTERN_THU),
]);

export const SPITEX_ABBREVIATIONS = Object.freeze(PATIENTS.map((p) => p.order.abbreviation));
export const areaPatients = (area) => PATIENTS.filter((p) => p.area === area);
export const areaAbbreviations = (area) => areaPatients(area).map((p) => p.order.abbreviation);
export const areaPatientsOn = (area, weekday) => areaPatients(area).filter((p) => p.order.weekdays.includes(weekday));
export const areaAbbreviationsOn = (area, weekday) => areaPatientsOn(area, weekday).map((p) => p.order.abbreviation);
export const PATIENTS_PER_TOUR = PATIENTS.length / AREA_KEYS.length;

export function inWinterthur(point) {
  return point.lat >= WINTERTHUR_BOUNDS.latMin && point.lat <= WINTERTHUR_BOUNDS.latMax
    && point.lon >= WINTERTHUR_BOUNDS.lonMin && point.lon <= WINTERTHUR_BOUNDS.lonMax;
}

export function assertPlan() {
  const problems = [];
  for (const point of [BRANCH, ...TEAM, ...PATIENTS]) {
    if (!inWinterthur(point)) problems.push(`${point.name ?? point.street} lies outside Winterthur`);
  }
  if (new Set(SPITEX_ABBREVIATIONS).size !== SPITEX_ABBREVIATIONS.length) problems.push("order abbreviations are not unique");
  if (new Set(PATIENTS.map((p) => `${p.firstName} ${p.name}`)).size !== PATIENTS.length) problems.push("patient names are not unique");
  if (new Set(PATIENTS.map((p) => `${p.lat},${p.lon}`)).size !== PATIENTS.length) problems.push("patient coordinates are not unique");
  if (new Date(`${DEMO_DAY}T12:00:00Z`).getUTCDay() !== DEMO_WEEKDAY) problems.push(`${DEMO_DAY} is not weekday ${DEMO_WEEKDAY}`);
  if (new Set(TEAM.map((t) => `${t.firstName} ${t.name}`)).size !== TEAM.length) problems.push("team names are not unique");
  for (const area of AREA_KEYS) {
    if (areaPatients(area).length !== PATIENTS_PER_TOUR) problems.push(`area ${area} has ${areaPatients(area).length} patients`);
    for (const weekday of WORK_WEEKDAYS) {
      const visits = areaPatientsOn(area, weekday).length;
      if (visits === 0 || visits > MAX_VISITS_PER_DAY) problems.push(`area ${area} has ${visits} visits on weekday ${weekday}`);
    }
  }
  for (const member of TEAM) {
    const week = TEAM_WEEK[member.key];
    if (!week || week.length !== DEMO_WEEK.length) problems.push(`no week plan for ${member.key}`);
    else if (TOUR_NURSES.includes(member) && week.some(Boolean)) problems.push(`${member.key} takes a tour but works a regular shift in the demo week`);
  }
  if (problems.length > 0) throw new Error(`Spitex plan is inconsistent: ${problems.join("; ")}`);
}

export function dateOnly(value) {
  return String(value ?? "").slice(0, DEMO_DAY.length);
}

export function activeOnDemoDay(validFrom, validUntil) {
  const from = dateOnly(validFrom);
  const until = dateOnly(validUntil);
  return (!from || from <= DEMO_DAY) && (!until || until >= DEMO_DAY);
}
