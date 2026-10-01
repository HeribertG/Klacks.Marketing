// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Idempotently seeds the demo data for the "container autofill" and "optimize route" marketing videos through the real REST
 * API of a running Klacks demo instance. It creates: one branch (the base address of both tours, Winterthur), ten fictional
 * customers with FIXED coordinates, two container shifts (the autofill container is deliberately short, 07:30-10:30, so the autofill
 * picks four of the ten tasks (KT05 is deliberately 45 min so the fifth task never fits the 3 h budget by a clear margin) with the tolerance slider on "exact": the "selected tasks" pane of the editor shows at most four
 * rows of time-window tasks at 1280x800), ten time-range tasks for the autofill tour (Wednesday) and four
 * time-range tasks for the route tour (Thursday; the selected-task pane shows at most four rows of such tasks at 1280x800; two
 * earlier route tasks ST05/ST06 are deleted again), an EMPTY Wednesday template and a Thursday template that is filled by hand in a
 * deliberately inefficient visiting order. Start and end base of both templates are the branch address. Existing objects are
 * found by name and abbreviation (customers by company name) and reset to the defined state; ids always come from the server.
 *
 * Group: both containers and all 14 tasks live EXCLUSIVELY in their own group "Kundendienst Winterthur" (created as a sibling of
 * the demo group when missing; shifts that were seeded earlier into the demo group are moved out). The shift list of the
 * schedule shows the shifts of the SELECTED group only, so the time-window tasks and containers would otherwise pollute every
 * Dienstplan video of the demo group; the container autofill/Zone 3 pool is the shift set of the CONTAINER's group
 * (ContainerAvailableTasksService), so autofill and route optimization keep working in the own group. The self-check fails when a seed
 * shift is in more than that one group or appears in the shift list of the demo group.
 *
 * Why two new containers instead of a free weekday in "Tour Winterthur": the template PUT deletes every weekday template that is
 * not part of the payload, so seed-container-demo (which writes Monday and Tuesday only) would wipe a Wednesday template added
 * there; separate containers also isolate lock, reset and weekday tabs (a container with a single active weekday opens straight
 * on that day). Tasks placed in ANY container template are hidden from every Zone 3 and from the autofill pool (the UI never
 * passes excludeContainerId), which is why the two videos use separate task records and separate weekdays.
 *
 * Coordinates: customers are written through POST/PUT Clients with skipAddressValidation = true. Only that path keeps the
 * coordinates of the body: Addresses POST/PUT (and Clients without the flag) geocode through Nominatim and overwrite latitude and
 * longitude (or store none when the geocoder is unreachable). The self-check reads every customer back and fails if a stored
 * coordinate differs from the hard-coded one. The BASE address is a branch (a plain string) and is geocoded live by the backend on
 * every autofill/route click (in-memory cache, lost on API restart); the live check at the end warms that cache and the OSRM matrix.
 *
 * A template editor that is open (or was closed without leaving the page in-app) holds the container template lock until it goes
 * stale (about 90 s); --lock-wait-s makes the script poll for the lock instead of failing at once.
 * CLI: --reset-autofill (only empties the Wednesday template and clears its route info; fast restore for the autofill take)
 *      --reset-route (only restores the Thursday template to the hand-filled bad order and clears its route info)
 *      --skip-live-check (skips the autofill/optimize-route computations of the self-check; they need Nominatim and OSRM)
 *      --lock-wait-s <n>  --api-url  --group-id
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
  SHIFT_TYPE_CONTAINER,
  WEEKDAY_WEDNESDAY,
  WEEKDAY_THURSDAY,
  WEEKDAY_FLAG_BY_NUMBER,
  MS_PER_SECOND,
  TRANSPORT_MODE_DEFAULT,
  loadGroup,
  ensureSiblingGroup,
  findShifts,
  ensureShift,
  writeTemplates,
  readTemplates,
  readAvailableTasks,
  templateBody,
  templateItemBody,
  stripNested,
  isPlainTemplate,
  timeToMinutes,
  minutesToTime,
  minutesToWorkTime,
} from "./lib/klacks-demo-api.mjs";

const BRANCH_LIST_PATH = "Branch/GetBranchList";
const BRANCH_ADD_PATH = "Branch/AddBranch";
const BRANCH_PUT_PATH = "Branch/PutBranch";
const CLIENTS_PATH = "Clients";
const CLIENT_FIND_PATH = "Clients/FindClient";
const ROUTE_AUTOFILL_PATH = "RouteOptimization/autofill";
const ROUTE_OPTIMIZE_PATH = "RouteOptimization/optimize-route";
const SHIFT_SCHEDULE_PATH = "Shifts/Schedule";
const URL_BLANK_SEGMENT = "%20";
const SEED_ABBREVIATION_PATTERN = /^(KT\d{2}|ST\d{2}|KTW|STW)$/;
const DEMO_SCHEDULE_PERIODS = [
  { startDate: "2026-09-01", endDate: "2026-09-30" },
  { startDate: "2026-10-01", endDate: "2026-10-31" },
  { startDate: "2026-11-01", endDate: "2026-11-30" },
];

const CLIENT_TYPE_CUSTOMER = 2;
const GENDER_LEGAL_ENTITY = 3;
const ADDRESS_TYPE_CUSTOMER = 0;
const ADDRESS_VALID_FROM = "2020-01-01T00:00:00Z";
const COUNTRY_CODE = "CH";
const STATE_CODE = "ZH";
const CITY = "Winterthur";

const COORDINATE_TOLERANCE = 1e-6;
const WORK_TIME_TOLERANCE = 1e-3;
const AUTOFILL_TIME_RANGE_TOLERANCE = 1;
const MIN_TASK_MINUTES = 20;
const MAX_TASK_MINUTES = 60;
const MIN_AUTOFILL_SELECTION = 3;
const MAX_AUTOFILL_SELECTION = 4;
const SCHEDULE_ROW_LIMIT = 500;
const MIN_DETOUR_FACTOR = 1.25;
const HH_MM_LENGTH = 5;
const EARTH_RADIUS_KM = 6371;
const DEGREES_TO_RADIANS = Math.PI / 180;
const WINTERTHUR_BOUNDS = { latMin: 47.43, latMax: 47.55, lonMin: 8.63, lonMax: 8.83 };

const BASE_BRANCH = {
  name: "Kellerwind Zentrale",
  street: "Neuwiesenstrasse 20",
  zip: "8401",
  city: CITY,
  lat: 47.50244,
  lon: 8.7215068,
};
const BASE_ADDRESS = `${BASE_BRANCH.street}, ${BASE_BRANCH.zip} ${BASE_BRANCH.city}`;

const SERVICE_GROUP_DEF = {
  name: "Kundendienst Winterthur",
  description: "Kundendienst-Touren Winterthur (Demo-Seed, nicht im Dienstplan der Gruppe Winterthur)",
};

const CUSTOMERS = [
  { key: "zimt", company: "Zimtkater Café GmbH", street: "Unterer Graben 5", zip: "8400", lat: 47.4986048, lon: 8.7308135 },
  { key: "birn", company: "Birnbaum Physio GmbH", street: "Rychenbergstrasse 40", zip: "8400", lat: 47.5089233, lon: 8.7273892 },
  { key: "linden", company: "Lindenhof Treuhand AG", street: "Pflanzschulstrasse 20", zip: "8400", lat: 47.49692, lon: 8.7404999 },
  { key: "sonn", company: "Sonnhalde Optik AG", street: "Römerstrasse 150", zip: "8404", lat: 47.506081, lon: 8.7539695 },
  { key: "eule", company: "Eulenbach Verlag GmbH", street: "Sulzerallee 40", zip: "8404", lat: 47.5012473, lon: 8.7603469 },
  { key: "hasel", company: "Haselweg Gärtnerei AG", street: "Oberseenerstrasse 50", zip: "8405", lat: 47.4803193, lon: 8.7683437 },
  { key: "brunn", company: "Brunnmatt Bäckerei AG", street: "Gutstrasse 10", zip: "8400", lat: 47.4898567, lon: 8.73389 },
  { key: "tann", company: "Tannenblick Immobilien AG", street: "Zürcherstrasse 61", zip: "8406", lat: 47.4944071, lon: 8.7116667 },
  { key: "rab", company: "Rabenstein Metallbau GmbH", street: "Klosterstrasse 20", zip: "8406", lat: 47.4883632, lon: 8.704101 },
  { key: "fuchs", company: "Fuchsberg Weinhandel AG", street: "Wülflingerstrasse 215", zip: "8408", lat: 47.5102924, lon: 8.699378 },
].map((customer) => ({ ...customer, city: CITY }));

const AUTOFILL_CONTAINER_DEF = {
  name: "Kundentour Winterthur",
  abbreviation: "KTW",
  description: "Kundenbesuche Winterthur",
  start: "07:30:00",
  end: "10:30:00",
  weekdays: [WEEKDAY_WEDNESDAY],
};

const ROUTE_CONTAINER_DEF = {
  name: "Servicetour Winterthur",
  abbreviation: "STW",
  description: "Lieferungen Winterthur",
  start: "08:00:00",
  end: "14:00:00",
  weekdays: [WEEKDAY_THURSDAY],
};

const AUTOFILL_TASK_DEFS = [
  { customerKey: "zimt", name: "Kaffeemaschine warten", abbreviation: "KT01", start: "07:30:00", end: "10:30:00", minutes: 30 },
  { customerKey: "birn", name: "Hygienekontrolle", abbreviation: "KT02", start: "08:00:00", end: "12:00:00", minutes: 45 },
  { customerKey: "linden", name: "Aktenabholung", abbreviation: "KT03", start: "09:00:00", end: "13:30:00", minutes: 20 },
  { customerKey: "sonn", name: "Filialkontrolle", abbreviation: "KT04", start: "07:30:00", end: "11:30:00", minutes: 30 },
  { customerKey: "eule", name: "Paketübergabe", abbreviation: "KT05", start: "10:00:00", end: "13:30:00", minutes: 45 },
  { customerKey: "hasel", name: "Bewässerung prüfen", abbreviation: "KT06", start: "08:00:00", end: "13:30:00", minutes: 60 },
  { customerKey: "brunn", name: "Ofenwartung", abbreviation: "KT07", start: "07:30:00", end: "10:30:00", minutes: 45 },
  { customerKey: "tann", name: "Hauswartkontrolle", abbreviation: "KT08", start: "09:00:00", end: "13:30:00", minutes: 40 },
  { customerKey: "rab", name: "Brandschutzkontrolle", abbreviation: "KT09", start: "08:30:00", end: "13:00:00", minutes: 50 },
  { customerKey: "fuchs", name: "Kühlraum prüfen", abbreviation: "KT10", start: "10:00:00", end: "13:30:00", minutes: 35 },
].map((task) => ({ ...task, weekdays: [WEEKDAY_WEDNESDAY], isTimeRange: true, workTime: minutesToWorkTime(task.minutes) }));

const ROUTE_WINDOW = { start: "08:00:00", end: "14:00:00" };

const RETIRED_TASK_DEFS = [
  { name: "Kaffeelieferung", abbreviation: "ST05" },
  { name: "Mehllieferung", abbreviation: "ST06" },
];

const ROUTE_TASK_DEFS = [
  { customerKey: "rab", name: "Werkzeuglieferung", abbreviation: "ST01", minutes: 45, slotStart: "08:00:00" },
  { customerKey: "sonn", name: "Ersatzteillieferung", abbreviation: "ST02", minutes: 30, slotStart: "09:10:00" },
  { customerKey: "fuchs", name: "Getränkelieferung", abbreviation: "ST03", minutes: 30, slotStart: "10:10:00" },
  { customerKey: "hasel", name: "Pflanzenlieferung", abbreviation: "ST04", minutes: 45, slotStart: "11:10:00" },
].map((task) => ({
  ...task,
  ...ROUTE_WINDOW,
  slotEnd: minutesToTime(timeToMinutes(task.slotStart) + task.minutes),
  weekdays: [WEEKDAY_THURSDAY],
  isTimeRange: true,
  workTime: minutesToWorkTime(task.minutes),
}));

function toRadians(degrees) {
  return degrees * DEGREES_TO_RADIANS;
}

function haversineKm(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function customerByKey(key) {
  const customer = CUSTOMERS.find((entry) => entry.key === key);
  if (!customer) throw new Error(`Unknown customer key "${key}".`);
  return customer;
}

function loopLengthKm(order) {
  const points = [BASE_BRANCH, ...order.map(customerByKey), BASE_BRANCH];
  return points.slice(1).reduce((sum, point, index) => sum + haversineKm(points[index], point), 0);
}

function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
}

function shortestLoopKm(keys) {
  return Math.min(...permutations(keys).map(loopLengthKm));
}

function detourFactor() {
  const keys = ROUTE_TASK_DEFS.map((task) => task.customerKey);
  return loopLengthKm(keys) / shortestLoopKm(keys);
}

function assertPlan() {
  const problems = [];
  const inBounds = (point) =>
    point.lat >= WINTERTHUR_BOUNDS.latMin && point.lat <= WINTERTHUR_BOUNDS.latMax &&
    point.lon >= WINTERTHUR_BOUNDS.lonMin && point.lon <= WINTERTHUR_BOUNDS.lonMax;
  for (const point of [BASE_BRANCH, ...CUSTOMERS]) {
    if (!inBounds(point)) problems.push(`${point.company ?? point.name} lies outside Winterthur`);
  }
  const abbreviations = [...AUTOFILL_TASK_DEFS, ...ROUTE_TASK_DEFS].map((task) => task.abbreviation);
  if (new Set(abbreviations).size !== abbreviations.length) problems.push("Task abbreviations are not unique");
  if (new Set(CUSTOMERS.map((customer) => customer.company)).size !== CUSTOMERS.length) problems.push("Customer companies are not unique");

  const containerMinutes = (def) => timeToMinutes(def.end) - timeToMinutes(def.start);
  for (const task of [...AUTOFILL_TASK_DEFS, ...ROUTE_TASK_DEFS]) {
    if (task.minutes < MIN_TASK_MINUTES || task.minutes > MAX_TASK_MINUTES) problems.push(`${task.abbreviation} duration is outside ${MIN_TASK_MINUTES}-${MAX_TASK_MINUTES} min`);
    if (timeToMinutes(task.end) - timeToMinutes(task.start) < task.minutes) problems.push(`${task.abbreviation} window is shorter than its duration`);
  }
  const insideContainer = (task, container) =>
    timeToMinutes(task.start) >= timeToMinutes(container.start) && timeToMinutes(task.end) <= timeToMinutes(container.end);
  for (const task of AUTOFILL_TASK_DEFS) {
    const opensInsideContainer = timeToMinutes(task.start) >= timeToMinutes(AUTOFILL_CONTAINER_DEF.start)
      && timeToMinutes(task.start) < timeToMinutes(AUTOFILL_CONTAINER_DEF.end);
    if (!opensInsideContainer) problems.push(`${task.abbreviation} window does not open inside the autofill container window`);
  }
  const totalMinutes = AUTOFILL_TASK_DEFS.reduce((sum, task) => sum + task.minutes, 0);
  if (totalMinutes < containerMinutes(AUTOFILL_CONTAINER_DEF)) problems.push("Autofill tasks fit completely into the container, so autofill would not have to choose");

  ROUTE_TASK_DEFS.forEach((task, index) => {
    if (!insideContainer(task, ROUTE_CONTAINER_DEF)) problems.push(`${task.abbreviation} window leaves the route container window`);
    const slotInsideWindow = timeToMinutes(task.slotStart) >= timeToMinutes(task.start) && timeToMinutes(task.slotEnd) <= timeToMinutes(task.end);
    if (!slotInsideWindow) problems.push(`${task.abbreviation} hand-placed slot leaves its window`);
    const previous = ROUTE_TASK_DEFS[index - 1];
    if (previous && timeToMinutes(previous.slotEnd) > timeToMinutes(task.slotStart)) problems.push(`${task.abbreviation} slot overlaps the previous one`);
  });
  const detour = detourFactor();
  if (detour < MIN_DETOUR_FACTOR) problems.push(`Hand-filled route order is only ${detour.toFixed(2)}x the shortest loop (need ${MIN_DETOUR_FACTOR}x) - the optimization would not be visible`);
  if (problems.length > 0) throw new Error(`Seed plan is inconsistent: ${problems.join("; ")}`);
  return detour;
}

function readOptions() {
  const { values } = parseArgs({
    options: {
      "reset-autofill": { type: "boolean", default: false },
      "reset-route": { type: "boolean", default: false },
      "skip-live-check": { type: "boolean", default: false },
      "api-url": { type: "string" },
      "group-id": { type: "string" },
      "lock-wait-s": { type: "string" },
    },
  });
  const lockWaitS = Number(values["lock-wait-s"] ?? 0);
  if (!Number.isFinite(lockWaitS) || lockWaitS < 0) throw new Error("--lock-wait-s must be a non-negative number");
  return {
    ...S.readSessionOptions(values),
    resetAutofill: values["reset-autofill"],
    resetRoute: values["reset-route"],
    skipLiveCheck: values["skip-live-check"],
    lockWaitMs: lockWaitS * MS_PER_SECOND,
  };
}

function nearlyEqual(a, b, tolerance) {
  return typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tolerance;
}

function hhmm(time) {
  return String(time ?? "").slice(0, HH_MM_LENGTH);
}

function addressBody(customer) {
  return {
    type: ADDRESS_TYPE_CUSTOMER,
    validFrom: ADDRESS_VALID_FROM,
    street: customer.street,
    zip: customer.zip,
    city: customer.city,
    country: COUNTRY_CODE,
    state: STATE_CODE,
    latitude: customer.lat,
    longitude: customer.lon,
  };
}

function clientBody(customer) {
  return {
    company: customer.company,
    name: "",
    firstName: "",
    gender: GENDER_LEGAL_ENTITY,
    legalEntity: true,
    type: CLIENT_TYPE_CUSTOMER,
    skipAddressValidation: true,
    addresses: [addressBody(customer)],
  };
}

function addressMatches(address, customer) {
  return address.street === customer.street
    && address.zip === customer.zip
    && address.city === customer.city
    && address.country === COUNTRY_CODE
    && nearlyEqual(address.latitude, customer.lat, COORDINATE_TOLERANCE)
    && nearlyEqual(address.longitude, customer.lon, COORDINATE_TOLERANCE);
}

function customerDiffers(existing, customer) {
  const addresses = existing.addresses ?? [];
  return existing.type !== CLIENT_TYPE_CUSTOMER
    || !existing.legalEntity
    || addresses.length !== 1
    || !addressMatches(addresses[0], customer);
}

async function findCustomers(api, company) {
  const path = `${CLIENT_FIND_PATH}/${encodeURIComponent(company)}/${URL_BLANK_SEGMENT}/${URL_BLANK_SEGMENT}`;
  const found = (await api.call(HTTP_GET, path)) ?? [];
  return found.filter((client) => client.company === company && !client.isDeleted && client.type === CLIENT_TYPE_CUSTOMER);
}

async function ensureCustomer(api, customer) {
  const matches = await findCustomers(api, customer.company);
  if (matches.length > 1) throw new Error(`Ambiguous: ${matches.length} customers named "${customer.company}".`);
  if (matches.length === 0) {
    const created = await api.call(HTTP_POST, CLIENTS_PATH, { data: clientBody(customer) });
    return { id: created.id, action: "created" };
  }
  const existing = await api.call(HTTP_GET, `${CLIENTS_PATH}/${matches[0].id}`);
  if (!customerDiffers(existing, customer)) return { id: existing.id, action: "unchanged" };
  const body = clientBody(customer);
  await api.call(HTTP_PUT, CLIENTS_PATH, {
    data: {
      ...existing,
      ...body,
      id: existing.id,
      addresses: [{ ...(existing.addresses ?? [])[0], ...body.addresses[0] }],
    },
  });
  return { id: existing.id, action: "updated" };
}

async function ensureBranch(api) {
  const branches = (await api.call(HTTP_GET, BRANCH_LIST_PATH)) ?? [];
  const matches = branches.filter((branch) => branch.name === BASE_BRANCH.name);
  if (matches.length > 1) throw new Error(`Ambiguous: ${matches.length} branches named "${BASE_BRANCH.name}".`);
  const desired = { name: BASE_BRANCH.name, address: BASE_ADDRESS, phone: "", email: "" };
  if (matches.length === 0) {
    const created = await api.call(HTTP_POST, BRANCH_ADD_PATH, { data: desired });
    return { id: created.id, action: "created" };
  }
  if (matches[0].address === BASE_ADDRESS) return { id: matches[0].id, action: "unchanged" };
  await api.call(HTTP_PUT, BRANCH_PUT_PATH, { data: { ...matches[0], ...desired } });
  return { id: matches[0].id, action: "updated" };
}

async function ensureContainer(api, def, group) {
  const result = await ensureShift(api, def, SHIFT_TYPE_CONTAINER, group, { exclusiveGroup: true });
  return { id: result.id, start: def.start, end: def.end, name: def.name, abbreviation: def.abbreviation, action: result.action };
}

async function requireContainer(api, def) {
  const matches = await findShifts(api, def, SHIFT_TYPE_CONTAINER);
  if (matches.length !== 1) {
    throw new Error(`Needs exactly one existing container "${def.name}" (${def.abbreviation}), found ${matches.length}. Run without a --reset-* flag first.`);
  }
  return { id: matches[0].id, start: def.start, end: def.end, name: def.name, abbreviation: def.abbreviation };
}

async function ensureTasks(api, defs, group, customerIds) {
  const tasks = [];
  for (const def of defs) {
    const result = await ensureShift(api, { ...def, clientId: customerIds.get(def.customerKey) }, SHIFT_TYPE_TASK, group, { timeRange: true, exclusiveGroup: true });
    tasks.push({ ...def, id: result.id, action: result.action });
  }
  return tasks;
}

async function retireTasks(api, defs) {
  const retired = [];
  for (const def of defs) {
    for (const match of await findShifts(api, def, SHIFT_TYPE_TASK, { timeRange: true })) {
      await api.call(HTTP_DELETE, `${SHIFTS_PATH}/${match.id}`);
      retired.push(def.abbreviation);
    }
  }
  return retired;
}

async function findExistingTasks(api, defs) {
  const tasks = [];
  for (const def of defs) {
    const [match] = await findShifts(api, def, SHIFT_TYPE_TASK, { timeRange: true });
    if (!match) throw new Error(`Task "${def.name}" (${def.abbreviation}) does not exist; run without a --reset-* flag first.`);
    tasks.push({ ...def, id: match.id });
  }
  return tasks;
}

function baseExtras() {
  return { startBase: BASE_ADDRESS, endBase: BASE_ADDRESS, routeInfo: null };
}

function autofillTemplate(container) {
  return templateBody(container, WEEKDAY_WEDNESDAY, [], baseExtras());
}

function routeItemBody(task) {
  return { ...templateItemBody(task, WEEKDAY_THURSDAY), timeRangeStartItem: task.slotStart, timeRangeEndItem: task.slotEnd };
}

function routeTemplate(container, tasks) {
  return templateBody(container, WEEKDAY_THURSDAY, tasks.map(routeItemBody), baseExtras());
}

function basesAreSet(template) {
  return template.startBase === BASE_ADDRESS && template.endBase === BASE_ADDRESS && !template.routeInfo;
}

function templateWindowMatches(template, container) {
  return hhmm(template.fromTime) === hhmm(container.start) && hhmm(template.untilTime) === hhmm(container.end);
}

function autofillTemplateIsClean(template, container) {
  return Boolean(template) && (template.containerTemplateItems ?? []).length === 0 && basesAreSet(template) && templateWindowMatches(template, container);
}

function itemMatchesRouteTask(item, task) {
  return item.shiftId === task.id
    && !item.absenceId
    && hhmm(item.startItem) === hhmm(task.start)
    && hhmm(item.endItem) === hhmm(task.end)
    && hhmm(item.timeRangeStartItem) === hhmm(task.slotStart)
    && hhmm(item.timeRangeEndItem) === hhmm(task.slotEnd);
}

function routeTemplateIsSeeded(template, tasks) {
  const items = template?.containerTemplateItems ?? [];
  return Boolean(template) && basesAreSet(template) && items.length === tasks.length && tasks.every((task) => items.some((item) => itemMatchesRouteTask(item, task)));
}

async function applyTemplate(api, container, weekday, desired, isDone, lockWaitMs, failure) {
  const existing = await readTemplates(api, container.id);
  const before = existing.find((template) => isPlainTemplate(template, weekday));
  if (isDone(before)) return "unchanged";
  const keep = existing.filter((template) => !isPlainTemplate(template, weekday)).map(stripNested);
  await writeTemplates(api, container, [desired, ...keep], lockWaitMs);
  const after = (await readTemplates(api, container.id)).find((template) => isPlainTemplate(template, weekday));
  if (!isDone(after)) throw new Error(failure);
  return before ? "reset" : "created";
}

async function resetAutofillTemplate(api, container, lockWaitMs) {
  return applyTemplate(
    api, container, WEEKDAY_WEDNESDAY, autofillTemplate(container), (template) => autofillTemplateIsClean(template, container), lockWaitMs,
    "Autofill template is not empty with the base addresses and without route info after the reset",
  );
}

async function resetRouteTemplate(api, container, tasks, lockWaitMs) {
  return applyTemplate(
    api, container, WEEKDAY_THURSDAY, routeTemplate(container, tasks), (template) => routeTemplateIsSeeded(template, tasks), lockWaitMs,
    "Route template does not hold the hand-placed tasks with the base addresses and without route info after the reset",
  );
}

async function verifyBranch(api, problems) {
  const branches = (await api.call(HTTP_GET, BRANCH_LIST_PATH)) ?? [];
  const branch = branches.find((entry) => entry.name === BASE_BRANCH.name);
  if (!branch) problems.push(`Branch "${BASE_BRANCH.name}" does not exist`);
  else if (branch.address !== BASE_ADDRESS) problems.push(`Branch address is "${branch.address}", expected "${BASE_ADDRESS}"`);
}

async function verifyCustomers(api, customerIds, problems) {
  const checked = [];
  for (const customer of CUSTOMERS) {
    const stored = await api.call(HTTP_GET, `${CLIENTS_PATH}/${customerIds.get(customer.key)}`);
    const address = (stored.addresses ?? [])[0];
    if (stored.company !== customer.company || stored.type !== CLIENT_TYPE_CUSTOMER) problems.push(`Customer ${customer.company} is not stored as a customer`);
    if ((stored.addresses ?? []).length !== 1) problems.push(`Customer ${customer.company} has ${(stored.addresses ?? []).length} addresses`);
    else if (!nearlyEqual(address.latitude, customer.lat, COORDINATE_TOLERANCE) || !nearlyEqual(address.longitude, customer.lon, COORDINATE_TOLERANCE)) {
      problems.push(`Customer ${customer.company}: stored coordinates ${address.latitude},${address.longitude} differ from the fixed ${customer.lat},${customer.lon}`);
    }
    checked.push({ company: customer.company, latitude: address?.latitude, longitude: address?.longitude });
  }
  return checked;
}

async function verifyTasks(api, tasks, group, customerIds, problems) {
  for (const task of tasks) {
    const stored = await api.call(HTTP_GET, `${SHIFTS_PATH}/${task.id}`);
    const activeWeekdays = Object.values(WEEKDAY_FLAG_BY_NUMBER).filter((flag) => stored[flag]);
    const expectedWeekdays = task.weekdays.map((number) => WEEKDAY_FLAG_BY_NUMBER[number]);
    if (!stored.isTimeRange) problems.push(`${task.abbreviation} is not a time-range task`);
    if (stored.clientId !== customerIds.get(task.customerKey)) problems.push(`${task.abbreviation} is not linked to ${task.customerKey}`);
    if (!nearlyEqual(stored.workTime, task.workTime, WORK_TIME_TOLERANCE)) problems.push(`${task.abbreviation} work time is ${stored.workTime}, expected ${task.workTime}`);
    if (hhmm(stored.startShift) !== hhmm(task.start) || hhmm(stored.endShift) !== hhmm(task.end)) problems.push(`${task.abbreviation} window differs`);
    if (JSON.stringify(activeWeekdays) !== JSON.stringify(expectedWeekdays)) problems.push(`${task.abbreviation} weekdays are ${activeWeekdays.join(",")}`);
    verifyOnlyGroup(stored, task.abbreviation, group, problems);
  }
}

function verifyOnlyGroup(stored, label, group, problems) {
  const groupIds = (stored.groups ?? []).map((entry) => entry.id);
  if (groupIds.length !== 1 || groupIds[0] !== group.id) problems.push(`${label} is not exclusively in the group "${group.name}" (groups: ${groupIds.join(",") || "none"})`);
}

async function verifyContainers(api, containers, group, problems) {
  for (const container of containers) {
    verifyOnlyGroup(await api.call(HTTP_GET, `${SHIFTS_PATH}/${container.id}`), container.abbreviation, group, problems);
  }
}

async function readSchedulesOfGroup(api, groupId) {
  const rows = [];
  for (const period of DEMO_SCHEDULE_PERIODS) {
    const response = await api.call(HTTP_POST, SHIFT_SCHEDULE_PATH, {
      data: { ...period, selectedGroup: groupId, holidayDates: [], startRow: 0, rowCount: SCHEDULE_ROW_LIMIT },
    });
    rows.push(...(response?.shifts ?? []));
  }
  return rows;
}

async function verifyDemoScheduleIsClean(api, demoGroup, serviceGroup, problems) {
  const demoRows = await readSchedulesOfGroup(api, demoGroup.id);
  const polluting = [...new Set(demoRows.map((row) => row.abbreviation).filter((abbreviation) => SEED_ABBREVIATION_PATTERN.test(abbreviation)))];
  if (polluting.length > 0) problems.push(`The shift list of the group "${demoGroup.name}" still shows ${polluting.join(", ")}`);
  const serviceRows = await readSchedulesOfGroup(api, serviceGroup.id);
  const own = [...new Set(serviceRows.map((row) => row.abbreviation))].sort();
  return { demoGroupRows: demoRows.length, demoGroupSeedShifts: polluting, serviceGroupShifts: own };
}

function describeTasks(list) {
  return list.map((task) => `${task.abbreviation} ${hhmm(task.startShift)}-${hhmm(task.endShift)}`);
}

async function verifyAutofillZone3(api, container, autofillTasks, routeTasks, problems) {
  const zone3 = await readAvailableTasks(api, container, WEEKDAY_WEDNESDAY);
  const ids = new Set(zone3.map((task) => task.id));
  for (const task of autofillTasks) {
    if (!ids.has(task.id)) problems.push(`Autofill Zone 3 (Wednesday) misses ${task.abbreviation}`);
  }
  for (const task of routeTasks) {
    if (ids.has(task.id)) problems.push(`Autofill Zone 3 (Wednesday) unexpectedly lists route task ${task.abbreviation}`);
  }
  const own = new Set(autofillTasks.map((task) => task.id));
  return { listed: describeTasks(zone3.filter((task) => own.has(task.id))), foreign: describeTasks(zone3.filter((task) => !own.has(task.id))) };
}

async function verifyRouteZone3(api, container, routeTasks, problems) {
  const zone3 = await readAvailableTasks(api, container, WEEKDAY_THURSDAY);
  const ids = new Set(zone3.map((task) => task.id));
  for (const task of routeTasks) {
    if (ids.has(task.id)) problems.push(`Route Zone 3 (Thursday) lists ${task.abbreviation} although it is already placed in the template`);
  }
  return { foreign: describeTasks(zone3) };
}

async function verifyTemplates(api, autofillContainer, routeContainer, routeTasks, problems) {
  const state = {};
  if (autofillContainer) {
    const template = (await readTemplates(api, autofillContainer.id)).find((entry) => isPlainTemplate(entry, WEEKDAY_WEDNESDAY));
    if (!autofillTemplateIsClean(template, autofillContainer)) problems.push("Autofill template (Wednesday) is not empty with the base addresses, the container time window and without route info");
    state.autofill = { items: (template?.containerTemplateItems ?? []).length, startBase: template?.startBase, endBase: template?.endBase };
  }
  if (routeContainer) {
    const template = (await readTemplates(api, routeContainer.id)).find((entry) => isPlainTemplate(entry, WEEKDAY_THURSDAY));
    if (!routeTemplateIsSeeded(template, routeTasks)) problems.push("Route template (Thursday) does not hold the hand-placed tasks with the base addresses and without route info");
    state.route = { items: (template?.containerTemplateItems ?? []).length, startBase: template?.startBase, endBase: template?.endBase };
  }
  return state;
}

async function liveCheck(api, autofillContainer, routeContainer, routeTasks, problems) {
  const result = {};
  if (autofillContainer) {
    const autofill = await api.call(HTTP_POST, ROUTE_AUTOFILL_PATH, {
      data: {
        containerId: autofillContainer.id,
        weekday: WEEKDAY_WEDNESDAY,
        isHoliday: false,
        startBase: BASE_ADDRESS,
        endBase: BASE_ADDRESS,
        fromTime: autofillContainer.start,
        untilTime: autofillContainer.end,
        transportMode: TRANSPORT_MODE_DEFAULT,
        timeRangeTolerance: AUTOFILL_TIME_RANGE_TOLERANCE,
        timeBlocks: [],
        additionalAvailableWorkIds: [],
      },
    });
    if (autofill.selectedShiftCount < MIN_AUTOFILL_SELECTION) problems.push(`Autofill selected only ${autofill.selectedShiftCount} tasks (base geocoding or OSRM unavailable?)`);
    if (autofill.selectedShiftCount > MAX_AUTOFILL_SELECTION) problems.push(`Autofill selected ${autofill.selectedShiftCount} tasks, more than the ${MAX_AUTOFILL_SELECTION} rows the editor shows at 1280x800`);
    result.autofill = { selected: autofill.selectedShiftCount, available: autofill.totalAvailableShifts, distanceKm: autofill.totalDistanceKm };
    if (autofill.selectedShiftCount >= autofill.totalAvailableShifts) result.autofill.warning = "autofill selects every task; the choice is not visible";
  }
  if (routeContainer) {
    const route = await api.call(HTTP_POST, ROUTE_OPTIMIZE_PATH, {
      data: { shiftIds: routeTasks.map((task) => task.id), timeBlocks: [], containerFromTime: routeContainer.start },
      query: { startBase: BASE_ADDRESS, endBase: BASE_ADDRESS, transportMode: String(TRANSPORT_MODE_DEFAULT) },
    });
    const abbreviationById = new Map(routeTasks.map((task) => [task.id, task.abbreviation]));
    const order = (route.optimizedRoute ?? []).map((step) => abbreviationById.get(step.shiftId)).filter(Boolean);
    const handOrder = routeTasks.map((task) => task.abbreviation);
    if (order.length !== routeTasks.length) problems.push(`Route optimization returned ${order.length} of ${routeTasks.length} tasks`);
    if (JSON.stringify(order) === JSON.stringify(handOrder)) problems.push("Route optimization keeps the hand-filled order; the video would show no change");
    result.route = { distanceKm: route.totalDistanceKm, order, handOrder };
  }
  return result;
}

async function runResets(api, options) {
  const summary = { mode: "reset" };
  const problems = [];
  let autofillContainer = null;
  let routeContainer = null;
  let routeTasks = [];
  if (options.resetAutofill) {
    autofillContainer = await requireContainer(api, AUTOFILL_CONTAINER_DEF);
    summary.autofillTemplate = await resetAutofillTemplate(api, autofillContainer, options.lockWaitMs);
    summary.autofillContainerId = autofillContainer.id;
  }
  if (options.resetRoute) {
    routeContainer = await requireContainer(api, ROUTE_CONTAINER_DEF);
    routeTasks = await findExistingTasks(api, ROUTE_TASK_DEFS);
    summary.routeTemplate = await resetRouteTemplate(api, routeContainer, routeTasks, options.lockWaitMs);
    summary.routeContainerId = routeContainer.id;
  }
  summary.templates = await verifyTemplates(api, autofillContainer, routeContainer, routeTasks, problems);
  if (autofillContainer) {
    const autofillTasks = await findExistingTasks(api, AUTOFILL_TASK_DEFS);
    summary.autofillZone3 = await verifyAutofillZone3(api, autofillContainer, autofillTasks, [], problems);
  }
  if (problems.length > 0) throw new Error(`Self-check failed: ${problems.join("; ")}`);
  return summary;
}

async function runSeed(api, options, demoGroup, detour) {
  const problems = [];
  const serviceGroup = await ensureSiblingGroup(api, SERVICE_GROUP_DEF.name, SERVICE_GROUP_DEF.description, demoGroup.id);
  const group = serviceGroup;
  const branch = await ensureBranch(api);

  const customerIds = new Map();
  const customerActions = [];
  for (const customer of CUSTOMERS) {
    const result = await ensureCustomer(api, customer);
    customerIds.set(customer.key, result.id);
    customerActions.push({ company: customer.company, id: result.id, action: result.action });
  }

  const autofillContainer = await ensureContainer(api, AUTOFILL_CONTAINER_DEF, group);
  const routeContainer = await ensureContainer(api, ROUTE_CONTAINER_DEF, group);
  const autofillTasks = await ensureTasks(api, AUTOFILL_TASK_DEFS, group, customerIds);
  const routeTasks = await ensureTasks(api, ROUTE_TASK_DEFS, group, customerIds);

  const autofillTemplateAction = await resetAutofillTemplate(api, autofillContainer, options.lockWaitMs);
  const routeTemplateAction = await resetRouteTemplate(api, routeContainer, routeTasks, options.lockWaitMs);
  const retiredTasks = await retireTasks(api, RETIRED_TASK_DEFS);

  await verifyBranch(api, problems);
  const coordinates = await verifyCustomers(api, customerIds, problems);
  await verifyTasks(api, [...autofillTasks, ...routeTasks], group, customerIds, problems);
  await verifyContainers(api, [autofillContainer, routeContainer], group, problems);
  const demoSchedule = await verifyDemoScheduleIsClean(api, demoGroup, serviceGroup, problems);
  const templates = await verifyTemplates(api, autofillContainer, routeContainer, routeTasks, problems);
  const autofillZone3 = await verifyAutofillZone3(api, autofillContainer, autofillTasks, routeTasks, problems);
  const routeZone3 = await verifyRouteZone3(api, routeContainer, routeTasks, problems);
  const live = options.skipLiveCheck ? { skipped: true } : await liveCheck(api, autofillContainer, routeContainer, routeTasks, problems);

  if (problems.length > 0) throw new Error(`Self-check failed: ${problems.join("; ")}`);
  const brief = ({ id, name, abbreviation, action }) => ({ id, name, abbreviation, action });
  return {
    mode: "seed",
    demoGroupId: demoGroup.id,
    serviceGroup: { id: serviceGroup.id, name: serviceGroup.name, action: serviceGroup.action },
    demoSchedule,
    branch: { ...branch, name: BASE_BRANCH.name, address: BASE_ADDRESS },
    customers: customerActions,
    autofillContainer: brief(autofillContainer),
    routeContainer: brief(routeContainer),
    autofillTasks: autofillTasks.map(({ id, name, abbreviation, start, end, minutes, action }) => ({ id, name, abbreviation, start, end, minutes, action })),
    routeTasks: routeTasks.map(({ id, name, abbreviation, slotStart, slotEnd, action }) => ({ id, name, abbreviation, slotStart, slotEnd, action })),
    templateActions: { autofill: autofillTemplateAction, route: routeTemplateAction },
    retiredTasks,
    handOrderDetourFactor: Number(detour.toFixed(2)),
    coordinates,
    templates,
    autofillZone3,
    routeZone3,
    live,
  };
}

async function main() {
  const options = readOptions();
  const detour = assertPlan();
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await S.apiLogin(context, options);
    const api = new KlacksApi(context, options.apiUrl, token);
    const group = await loadGroup(api, options.groupId);
    const summary = options.resetAutofill || options.resetRoute
      ? await runResets(api, options)
      : await runSeed(api, options, group, detour);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
