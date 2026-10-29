// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared definition of the Spitex demo (story clips A/B "Klacksy plans home-care visits in a container"): the group, the base
 * branch, the eight patients with FIXED coordinates, the nurse and the eight open TimeRange orders (one per patient, all on one
 * Thursday), used by seed-spitex-demo.mjs and the takes so seed and takes cannot drift apart. Coordinates are the Nominatim
 * (OpenStreetMap) result of the street address on 2026-10-29, stored as fixed values; the names are fictional.
 * @param PATIENTS - customers (type 2, natural persons) with the address the order is fulfilled at and the order they get
 * @param NURSE - the one employee with contract, membership and group membership valid on DEMO_DAY
 * @param ORDER - the shared TimeRange pattern: window 08:00-17:00, 45 minutes of work, DEMO_DAY only
 */

import { WEEKDAY_THURSDAY, WEEKDAY_FLAG_BY_NUMBER, MINUTES_PER_HOUR, minutesToWorkTime } from "./klacks-demo-api.mjs";

export const DEMO_DAY = "2026-11-05";
export const DEMO_WEEKDAY = WEEKDAY_THURSDAY;
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

export const BRANCH = {
  name: "Spitex-Stützpunkt Winterthur",
  street: "Technikumstrasse 20",
  zip: "8400",
  city: CITY,
  lat: 47.4980042,
  lon: 8.7299946,
};
export const BASE_ADDRESS = `${BRANCH.street}, ${BRANCH.zip} ${BRANCH.city}`;

export const NURSE = {
  firstName: "Sabrina",
  name: "Arnold",
  gender: GENDER_FEMALE,
  street: "Büelrainstrasse 20",
  zip: "8400",
  city: CITY,
  lat: 47.4953911,
  lon: 8.7285807,
};

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

const patient = (key, firstName, name, gender, street, zip, lat, lon, abbreviation) => Object.freeze({
  key, firstName, name, gender, street, zip, city: CITY, lat, lon,
  order: Object.freeze({ name: `Hausbesuch ${name}`, abbreviation }),
});

export const PATIENTS = Object.freeze([
  patient("hofstetter", "Margrit", "Hofstetter", GENDER_FEMALE, "Im Lee 5", "8400", 47.5032827, 8.7395517, "SXHO"),
  patient("brunner", "Ernst", "Brunner", GENDER_MALE, "Mattenbachstrasse 40", "8400", 47.4911389, 8.7387296, "SXBR"),
  patient("keller", "Rosmarie", "Keller", GENDER_FEMALE, "Oberseenerstrasse 94", "8405", 47.4800642, 8.7731295, "SXKE"),
  patient("zbinden", "Walter", "Zbinden", GENDER_MALE, "Zürcherstrasse 100", "8406", 47.492012, 8.7071228, "SXZB"),
  patient("marti", "Elsbeth", "Marti", GENDER_FEMALE, "Wülflingerstrasse 60", "8400", 47.5069737, 8.7129011, "SXMA"),
  patient("gerber", "Hans-Peter", "Gerber", GENDER_MALE, "Rychenbergstrasse 100", "8400", 47.5058768, 8.735205, "SXGE"),
  patient("schaerer", "Annemarie", "Schärer", GENDER_FEMALE, "Hegistrasse 20", "8411", 47.500462, 8.7477781, "SXSC"),
  patient("wyss", "Fritz", "Wyss", GENDER_MALE, "Gutstrasse 30", "8400", 47.4910374, 8.732895, "SXWY"),
]);

export const SPITEX_ABBREVIATIONS = Object.freeze(PATIENTS.map((p) => p.order.abbreviation));

export function inWinterthur(point) {
  return point.lat >= WINTERTHUR_BOUNDS.latMin && point.lat <= WINTERTHUR_BOUNDS.latMax
    && point.lon >= WINTERTHUR_BOUNDS.lonMin && point.lon <= WINTERTHUR_BOUNDS.lonMax;
}

export function assertPlan() {
  const problems = [];
  for (const point of [BRANCH, NURSE, ...PATIENTS]) {
    if (!inWinterthur(point)) problems.push(`${point.name ?? point.street} lies outside Winterthur`);
  }
  if (new Set(SPITEX_ABBREVIATIONS).size !== SPITEX_ABBREVIATIONS.length) problems.push("order abbreviations are not unique");
  if (new Set(PATIENTS.map((p) => `${p.firstName} ${p.name}`)).size !== PATIENTS.length) problems.push("patient names are not unique");
  if (new Set(PATIENTS.map((p) => `${p.lat},${p.lon}`)).size !== PATIENTS.length) problems.push("patient coordinates are not unique");
  if (new Date(`${DEMO_DAY}T12:00:00Z`).getUTCDay() !== DEMO_WEEKDAY) problems.push(`${DEMO_DAY} is not weekday ${DEMO_WEEKDAY}`);
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
