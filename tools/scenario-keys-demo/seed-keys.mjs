// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Seeds the stage of clip S1 "Grossauftrag mit virtuellen Keys" into klacks_marketing_security_bern_s2 (a copy of the planned and accepted s1 master) through the
 * real REST API of the recording API (port 5011; every other URL is refused). Ids always come from the server; repeating the run changes nothing. It builds:
 *   - the fictional customer "Messe Nordring AG" (legal entity, fictional address in Bern, no real venue),
 *   - a pool of fictional temporary staff (contract "Objektschutz Aushilfe BE" without guaranteed hours, fixed coordinates in Bern) whose membership in the group
 *     "Bern Objektschutz" covers the fair days only, so the pool cannot take over regular December duties,
 *   - key A "Messe Tagbetrieb" (entry 08-16 x6, hall 08-16 x4, evening 15-23 x8 = 18 people a day) and key B "Messe Nachtwache" (night 23-07 x4), both for
 *     10.-13.12.2026 in the group "Bern Objektschutz". Every key shift is created new (never copied from the real plan) as a sealed order with the customer set,
 *     inside the key period and below the 10 h cap, so no cut is needed.
 * The key listing (ScenarioVariants/{id}/Shifts) returns the sealed orders only; their plannable copies carry the same token and appear as clones in a scenario.
 * It never creates scenarios: a scenario carrying a key locks the key and its shifts (SCENARIO_VARIANT_IN_USE).
 * --without-keys seeds the customer and the pool only (stage bern_s3 of clip S1 v2: the key and its services are created inside the take).
 * CLI: [--api-url <url>] [--report <file>] [--without-keys]   Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL.
 */

import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { request as playwrightRequest } from "playwright-core";
import * as S from "../lib/klacks-demo-session.mjs";
import {
  KlacksApi,
  HTTP_GET,
  HTTP_POST,
  SHIFTS_PATH,
  SHIFT_TYPE_TASK,
  CLIENTS_PATH,
  GROUPS_TREE_PATH,
  ALL_WEEKDAYS,
  weekdayFlags,
  minutesToWorkTime,
  timeToMinutes,
} from "../lib/klacks-demo-api.mjs";
import * as D from "../lib/security-demo.mjs";

const VARIANTS_PATH = "ScenarioVariants";
const VARIANT_SHIFTS_SEGMENT = "Shifts";
const CONTRACTS_PATH = "Contracts";
const SCHEDULING_RULES_PATH = "SchedulingRules";
const SHIFT_SCHEDULE_PATH = "Shifts/Schedule";
const CLIENT_FIND_PATH = `${CLIENTS_PATH}/FindClient`;
const URL_BLANK_SEGMENT = "%20";
const LOG_PREFIX = "[seed-keys]";
const GIVEN_NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname";
const SHIFT_STATUS_SEALED_ORDER = 1;
const VARIANT_STATUS_ACTIVE = 0;
const CLIENT_TYPE_CUSTOMER = 2;
const SHIFT_ROW_LIMIT = 5000;
const MAX_PART_HOURS = 10;
const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_HOUR = 60;
const ORDERS_PER_DAY = 1;
const SPORADIC_SCOPE_NONE = 0;
const MIDNIGHT_SUFFIX = "T00:00:00Z";

const GROUP_NAME = D.SITES.bern.group.name;

const FAIR_PERIOD = Object.freeze({ from: "2026-12-10", until: "2026-12-13" });

const CUSTOMER = Object.freeze({
  company: "Messe Nordring AG",
  street: "Ausstellungsweg 5",
  zip: "3014",
  city: "Bern",
  lat: 46.9622,
  lon: 7.4689,
});

const POOL_CONTRACT = Object.freeze({ name: "Objektschutz Aushilfe BE", guaranteed: 0, minimum: 0, maximum: 48, percent: 0 });
const POOL_EMPLOYMENT_FROM = "2026-11-01T00:00:00Z";
const POOL_CONTRACT_FROM = "2026-12-01";

const inBernNorth = (firstName, name, gender, street, lat, lon) => Object.freeze({ firstName, name, gender, street, zip: "3014", city: "Bern", lat, lon });

const POOL = Object.freeze([
  inBernNorth("Aline", "Wyssbrod", D.GENDER_FEMALE, "Wankdorffeldstrasse 18", 46.9629, 7.4647),
  inBernNorth("Dario", "Zurbuchen", D.GENDER_MALE, "Rodtmattstrasse 41", 46.9611, 7.4598),
  inBernNorth("Selin", "Aeschbacher", D.GENDER_FEMALE, "Beundenfeldstrasse 9", 46.9578, 7.4583),
  inBernNorth("Noah", "Gfeller", D.GENDER_MALE, "Militaerstrasse 27", 46.9593, 7.4612),
  inBernNorth("Leonie", "Hostettler", D.GENDER_FEMALE, "Standstrasse 12", 46.9641, 7.4621),
  inBernNorth("Elias", "Rentsch", D.GENDER_MALE, "Allmendstrasse 33", 46.9601, 7.4655),
  inBernNorth("Jana", "Rufener", D.GENDER_FEMALE, "Kyburgstrasse 6", 46.9587, 7.4569),
  inBernNorth("Matteo", "Stucki", D.GENDER_MALE, "Tellstrasse 20", 46.9606, 7.4543),
  inBernNorth("Lara", "Liechti", D.GENDER_FEMALE, "Herzogstrasse 15", 46.9570, 7.4575),
  inBernNorth("Fabian", "Iseli", D.GENDER_MALE, "Zaehringerstrasse 52", 46.9566, 7.4440),
  inBernNorth("Nina", "Ryser", D.GENDER_FEMALE, "Wylerringstrasse 8", 46.9660, 7.4588),
  inBernNorth("Cedric", "Kaenel", D.GENDER_MALE, "Mittelstrasse 44", 46.9582, 7.4421),
  inBernNorth("Alessia", "Tschanz", D.GENDER_FEMALE, "Gotthelfstrasse 3", 46.9574, 7.4602),
  inBernNorth("Ramon", "Bigler", D.GENDER_MALE, "Papiermuehlestrasse 71", 46.9619, 7.4685),
]);

const KEYS = Object.freeze([
  Object.freeze({
    name: "Messe Tagbetrieb",
    description: "Grossanlass Messe Nordring, Tagbetrieb 10.-13.12.",
    shifts: Object.freeze([
      Object.freeze({ name: "Messe Einlass", abbreviation: "MEI", start: "08:00:00", end: "16:00:00", staffing: 6 }),
      Object.freeze({ name: "Messe Hallenaufsicht", abbreviation: "MHA", start: "08:00:00", end: "16:00:00", staffing: 4 }),
      Object.freeze({ name: "Messe Abend", abbreviation: "MAB", start: "15:00:00", end: "23:00:00", staffing: 8 }),
    ]),
  }),
  Object.freeze({
    name: "Messe Nachtwache",
    description: "Option: Nachtwache der Messe Nordring 10.-13.12.",
    shifts: Object.freeze([
      Object.freeze({ name: "Messe Nacht", abbreviation: "MNA", start: "23:00:00", end: "07:00:00", staffing: 4 }),
    ]),
  }),
]);

const log = (message) => console.log(`${LOG_PREFIX} ${message}`);
const label = (member) => `${member.firstName} ${member.name}`;
const crossesMidnight = (shift) => timeToMinutes(shift.end) <= timeToMinutes(shift.start);

function shiftMinutes(shift) {
  const minutes = timeToMinutes(shift.end) - timeToMinutes(shift.start);
  return minutes > 0 ? minutes : minutes + MINUTES_PER_DAY;
}

const staffingPerDay = (key) => key.shifts.reduce((sum, shift) => sum + shift.staffing, 0);

function assertDefinition() {
  const problems = [];
  for (const key of KEYS) {
    for (const shift of key.shifts) {
      if (shiftMinutes(shift) / MINUTES_PER_HOUR > MAX_PART_HOURS) problems.push(`${shift.abbreviation} exceeds ${MAX_PART_HOURS} h`);
    }
  }
  const abbreviations = KEYS.flatMap((key) => key.shifts.map((shift) => shift.abbreviation));
  if (new Set(abbreviations).size !== abbreviations.length) problems.push("key shift abbreviations are not unique");
  const labels = POOL.map(label);
  if (new Set(labels).size !== labels.length) problems.push("duplicate pool members");
  if (problems.length > 0) throw new Error(`Seed definition is inconsistent: ${problems.join("; ")}`);
}

function readOptions() {
  const { values } = parseArgs({ options: { "api-url": { type: "string" }, report: { type: "string" }, "without-keys": { type: "boolean" } } });
  return { session: S.readSessionOptions(values), reportPath: values.report, withoutKeys: Boolean(values["without-keys"]) };
}

function flattenNodes(nodes, found = []) {
  for (const node of nodes ?? []) {
    found.push(node);
    flattenNodes(node.children, found);
  }
  return found;
}

function assertDemoUser(token) {
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  if (claims[GIVEN_NAME_CLAIM] !== D.STORY_FIRST_NAME) throw new Error(`the demo user is called "${claims[GIVEN_NAME_CLAIM]}", the takes greet ${D.STORY_FIRST_NAME}`);
}

async function findGroup(api) {
  const matches = flattenNodes((await api.call(HTTP_GET, GROUPS_TREE_PATH))?.nodes).filter((node) => node.name === GROUP_NAME);
  if (matches.length !== 1) throw new Error(`expected exactly one group "${GROUP_NAME}", found ${matches.length}: seed s2 from the s1 master`);
  return { id: matches[0].id, name: matches[0].name };
}

async function ensurePoolContract(api) {
  const contracts = ((await api.call(HTTP_GET, CONTRACTS_PATH)) ?? []).filter((contract) => !contract.isDeleted);
  const found = contracts.find((contract) => contract.name === POOL_CONTRACT.name);
  if (found) return { id: found.id, action: "unchanged" };
  const reference = contracts.find((contract) => contract.name === D.CONTRACT_REFERENCE);
  if (!reference) throw new Error(`the contract ${D.CONTRACT_REFERENCE} is missing`);
  const rule = ((await api.call(HTTP_GET, SCHEDULING_RULES_PATH)) ?? []).find((entry) => entry.name === D.SCHEDULING_RULE_NAME);
  if (!rule) throw new Error(`the scheduling rule ${D.SCHEDULING_RULE_NAME} is missing`);
  const { id, calendarSelection, ...copy } = reference;
  const created = await api.call(HTTP_POST, CONTRACTS_PATH, {
    data: {
      ...copy,
      name: POOL_CONTRACT.name,
      guaranteedHours: POOL_CONTRACT.guaranteed,
      minimumHours: POOL_CONTRACT.minimum,
      maximumHours: POOL_CONTRACT.maximum,
      percent: POOL_CONTRACT.percent,
      schedulingRuleId: rule.id,
    },
  });
  return { id: created.id, action: "created" };
}

function addressBody(place) {
  return {
    type: D.ADDRESS_TYPE_MAIN,
    validFrom: D.ADDRESS_VALID_FROM,
    street: place.street,
    zip: place.zip,
    city: place.city,
    country: D.COUNTRY_CODE,
    state: D.STATE_CODE,
    latitude: place.lat,
    longitude: place.lon,
  };
}

async function findClients(api, company, name, firstName) {
  const segment = (value) => (value ? encodeURIComponent(value) : URL_BLANK_SEGMENT);
  return (await api.call(HTTP_GET, `${CLIENT_FIND_PATH}/${segment(company)}/${segment(name)}/${segment(firstName)}`)) ?? [];
}

async function ensureCustomer(api) {
  const found = (await findClients(api, CUSTOMER.company, CUSTOMER.company, "")).filter((client) => client.company === CUSTOMER.company && !client.isDeleted);
  if (found.length > 1) throw new Error(`Ambiguous: ${found.length} customers named ${CUSTOMER.company}`);
  if (found.length === 1) return { id: found[0].id, action: "unchanged" };
  const created = await api.call(HTTP_POST, CLIENTS_PATH, {
    data: {
      company: CUSTOMER.company,
      name: CUSTOMER.company,
      firstName: "",
      legalEntity: true,
      type: CLIENT_TYPE_CUSTOMER,
      skipAddressValidation: true,
      addresses: [addressBody(CUSTOMER)],
      membership: { validFrom: POOL_EMPLOYMENT_FROM, validUntil: null },
      clientContracts: [],
      groupItems: [],
    },
  });
  return { id: created.id, action: "created" };
}

async function ensurePoolMember(api, member, contractId, group) {
  const found = (await findClients(api, "", member.name, member.firstName)).filter((client) => client.name === member.name && client.firstName === member.firstName && !client.isDeleted);
  if (found.length > 1) throw new Error(`Ambiguous: ${found.length} clients named ${label(member)}`);
  if (found.length === 1) {
    const stored = await api.call(HTTP_GET, `${CLIENTS_PATH}/${found[0].id}`);
    if ((stored.groupItems ?? []).some((item) => item.groupId === group.id)) return { id: stored.id, action: "unchanged" };
    throw new Error(`${label(member)} already exists outside the group: choose another fictional name`);
  }
  const created = await api.call(HTTP_POST, CLIENTS_PATH, {
    data: {
      company: "",
      name: member.name,
      firstName: member.firstName,
      gender: member.gender,
      legalEntity: false,
      type: D.CLIENT_TYPE_EMPLOYEE,
      skipAddressValidation: true,
      addresses: [addressBody(member)],
      membership: { validFrom: POOL_EMPLOYMENT_FROM, validUntil: null },
      clientContracts: [{ contractId, fromDate: POOL_CONTRACT_FROM, untilDate: null, isActive: true }],
      groupItems: [{ groupId: group.id, validFrom: `${FAIR_PERIOD.from}${MIDNIGHT_SUFFIX}`, validUntil: `${FAIR_PERIOD.until}${MIDNIGHT_SUFFIX}` }],
    },
  });
  return { id: created.id, action: "created" };
}

async function ensureKey(api, key, group) {
  const existing = ((await api.call(HTTP_GET, VARIANTS_PATH, { query: { groupId: group.id } })) ?? []).filter((variant) => variant.name === key.name);
  if (existing.length > 1) throw new Error(`Ambiguous: ${existing.length} keys named ${key.name}`);
  if (existing.length === 1) {
    if (existing[0].status !== VARIANT_STATUS_ACTIVE) throw new Error(`key ${key.name} is no longer active (status ${existing[0].status}): seed a fresh s2 from s1`);
    return { variant: existing[0], action: "unchanged" };
  }
  const created = await api.call(HTTP_POST, VARIANTS_PATH, {
    data: { name: key.name, description: key.description, groupId: group.id, fromDate: FAIR_PERIOD.from, untilDate: FAIR_PERIOD.until },
  });
  return { variant: created, action: "created" };
}

function keyShiftBody(shift, variant, group, customerId) {
  return {
    name: shift.name,
    abbreviation: shift.abbreviation,
    description: variant.name,
    status: SHIFT_STATUS_SEALED_ORDER,
    shiftType: SHIFT_TYPE_TASK,
    fromDate: FAIR_PERIOD.from,
    untilDate: FAIR_PERIOD.until,
    startShift: shift.start,
    endShift: shift.end,
    workTime: minutesToWorkTime(shiftMinutes(shift)),
    quantity: ORDERS_PER_DAY,
    sumEmployees: shift.staffing,
    isTimeRange: false,
    isSporadic: false,
    sporadicScope: SPORADIC_SCOPE_NONE,
    clientId: customerId,
    cuttingAfterMidnight: crossesMidnight(shift),
    isHoliday: false,
    isWeekdayAndHoliday: false,
    ...weekdayFlags(ALL_WEEKDAYS),
    groups: [{ id: group.id, name: group.name }],
    analyseToken: variant.token,
  };
}

const readKeyShifts = async (api, variant) => (await api.call(HTTP_GET, `${VARIANTS_PATH}/${variant.id}/${VARIANT_SHIFTS_SEGMENT}`)) ?? [];

async function ensureKeyShifts(api, key, variant, group, customerId) {
  const actions = [];
  for (const shift of key.shifts) {
    const orders = (await readKeyShifts(api, variant)).filter((row) => row.abbreviation === shift.abbreviation && row.status === SHIFT_STATUS_SEALED_ORDER);
    if (orders.length > 1) throw new Error(`key ${key.name} holds ${orders.length} orders ${shift.abbreviation}`);
    if (orders.length === 1) {
      actions.push({ abbreviation: shift.abbreviation, action: "unchanged", orderId: orders[0].id });
      continue;
    }
    const created = await api.call(HTTP_POST, SHIFTS_PATH, { data: keyShiftBody(shift, variant, group, customerId) });
    actions.push({ abbreviation: shift.abbreviation, action: "created", orderId: created.id });
  }
  return actions;
}

async function verify(api, group, customerId, poolIds, keys) {
  const problems = [];
  const variants = (await api.call(HTTP_GET, VARIANTS_PATH, { query: { groupId: group.id } })) ?? [];
  const described = [];
  for (const key of keys) {
    const variant = variants.find((entry) => entry.name === key.name);
    if (!variant) {
      problems.push(`key ${key.name} is missing`);
      continue;
    }
    if (variant.status !== VARIANT_STATUS_ACTIVE) problems.push(`key ${key.name} has status ${variant.status}`);
    const rows = await readKeyShifts(api, variant);
    const shifts = [];
    for (const shift of key.shifts) {
      const family = rows.filter((row) => row.abbreviation === shift.abbreviation);
      const order = family.find((row) => row.status === SHIFT_STATUS_SEALED_ORDER);
      if (family.length !== 1 || !order) problems.push(`${shift.abbreviation}: ${family.length} listed rows, ${order ? "sealed" : "no sealed order"}`);
      for (const row of family) {
        if (row.clientId !== customerId) problems.push(`${shift.abbreviation} ${row.id}: customer ${row.clientId}`);
        if (row.analyseToken !== variant.token) problems.push(`${shift.abbreviation} ${row.id}: token ${row.analyseToken}`);
        if (String(row.fromDate) < FAIR_PERIOD.from || !row.untilDate || String(row.untilDate) > FAIR_PERIOD.until) problems.push(`${shift.abbreviation} ${row.id}: ${row.fromDate}..${row.untilDate} outside the key period`);
        if (row.sumEmployees !== shift.staffing) problems.push(`${shift.abbreviation} ${row.id}: staffing ${row.sumEmployees}`);
      }
      shifts.push({ abbreviation: shift.abbreviation, staffing: shift.staffing, orderId: order?.id });
    }
    described.push({ id: variant.id, name: variant.name, token: variant.token, status: variant.status, fromDate: variant.fromDate, untilDate: variant.untilDate, shiftCount: variant.shiftCount, staffingPerDay: staffingPerDay(key), shifts });
  }
  const realRows = (await api.call(HTTP_POST, SHIFT_SCHEDULE_PATH, {
    data: { startDate: D.PERIOD.from, endDate: D.PERIOD.until, selectedGroup: group.id, holidayDates: [...D.HOLIDAYS], startRow: 0, rowCount: SHIFT_ROW_LIMIT, analyseToken: null },
  }))?.shifts ?? [];
  const keyAbbreviations = new Set(keys.flatMap((key) => key.shifts.map((shift) => shift.abbreviation)));
  const leaked = realRows.filter((row) => keyAbbreviations.has(row.abbreviation));
  if (leaked.length > 0) problems.push(`the real shift schedule shows ${leaked.length} key rows`);
  let poolInFairPeriod = 0;
  for (const id of poolIds) {
    const stored = await api.call(HTTP_GET, `${CLIENTS_PATH}/${id}`);
    const item = (stored.groupItems ?? []).find((entry) => entry.groupId === group.id);
    if (item && String(item.validFrom).startsWith(FAIR_PERIOD.from) && String(item.validUntil).startsWith(FAIR_PERIOD.until)) poolInFairPeriod += 1;
  }
  if (poolInFairPeriod !== poolIds.length) problems.push(`${poolIds.length - poolInFairPeriod} pool members lack the membership ${FAIR_PERIOD.from}..${FAIR_PERIOD.until}`);
  return { problems, keys: described, realShiftRows: realRows.length, realKeyRows: leaked.length, poolInFairPeriod };
}

async function main() {
  const { session, reportPath, withoutKeys } = readOptions();
  const keys = withoutKeys ? [] : KEYS;
  if (!session.apiUrl.includes(D.RECORDING_API_PORT)) throw new Error(`refusing ${session.apiUrl}: seed only the recording API (${D.RECORDING_API_PORT}) on a klacks_marketing_* copy`);
  assertDefinition();
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await S.apiLogin(context, session);
    assertDemoUser(token);
    const api = new KlacksApi(context, session.apiUrl, token);
    const report = { fairPeriod: FAIR_PERIOD };
    const group = await findGroup(api);
    report.group = group;
    const contract = await ensurePoolContract(api);
    report.poolContract = { ...POOL_CONTRACT, ...contract };
    const customer = await ensureCustomer(api);
    report.customer = { company: CUSTOMER.company, ...customer };
    log(`customer ${CUSTOMER.company} ${customer.action} ${customer.id}`);
    const poolIds = [];
    let createdPool = 0;
    for (const member of POOL) {
      const result = await ensurePoolMember(api, member, contract.id, group);
      poolIds.push(result.id);
      if (result.action === "created") createdPool += 1;
    }
    report.pool = { size: POOL.length, created: createdPool, membership: FAIR_PERIOD };
    log(`pool of ${POOL.length} ready (${createdPool} created)`);
    report.keyActions = [];
    for (const key of keys) {
      const { variant, action } = await ensureKey(api, key, group);
      const shifts = await ensureKeyShifts(api, key, variant, group, customer.id);
      report.keyActions.push({ key: key.name, id: variant.id, action, shifts });
      log(`key ${key.name} ${action} ${variant.id}: ${shifts.map((shift) => `${shift.abbreviation}:${shift.action}`).join(" ")}`);
    }
    report.verify = await verify(api, group, customer.id, poolIds, keys);
    if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, null, 1));
    if (report.verify.problems.length > 0) throw new Error(`Self-check failed: ${report.verify.problems.join("; ")}`);
    log(`ok: ${keys.map((key) => `${key.name} ${staffingPerDay(key)}/day`).join(", ")}`);
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
