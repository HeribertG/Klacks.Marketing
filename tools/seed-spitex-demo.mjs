// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Seeds the Spitex demo of the story clips "Klacksy plans home-care visits in a container" (definition: lib/spitex-demo.mjs) into a
 * klacks_marketing_* copy through the real REST API of the recording API (port 5011; the script refuses every other URL). It creates:
 * the group "Spitex Winterthur" (sibling of the demo group), the branch "Spitex-Stützpunkt Winterthur" (the base address of the tour),
 * eight patients (customers, natural persons) with FIXED coordinates, one nurse (employee) with membership, contract and group
 * membership valid on DEMO_DAY, and eight OPEN TimeRange orders (status 0, one per patient, window 08:00-17:00, 45 minutes, DEMO_DAY
 * only, group "Spitex Winterthur" so the order can be sealed and the review does not map them to the city group "Winterthur" by name).
 * Open orders of the order review demo (RTB/RRS/REB/RLH) that the template copy carries are deleted, so the review sees only Spitex
 * orders. Idempotent: existing patients/branch/nurse/orders are found by name or abbreviation and reset to the defined state; an
 * already SEALED Spitex order aborts (a take consumed the database: make a fresh copy of the seeded template).
 *
 * Coordinates: patients are written through POST/PUT Clients with skipAddressValidation = true, the only path that keeps the body's
 * coordinates (Addresses POST/PUT geocode and overwrite them). The branch is a plain address string that the backend geocodes live.
 * The demo user's first name and user name must both be Sandra (only checked; there is no API to rename a user).
 *
 * Self-check (fails the run): every order open exactly once and none sealed, with the defined pattern and group; stored coordinates
 * equal the fixed ones; the nurse is a member of the group on DEMO_DAY with an active contract and membership; ORS routing returns
 * more than two points for two patient coordinates; no foreign open orders remain. Informational (never fails): the other TimeRange
 * tasks that are active on DEMO_DAY's weekday outside the Spitex group.
 * Template database: klacks_marketing_spitex = CREATE DATABASE ... TEMPLATE klacks_marketing_orders (needs Sandra, an LLM model and the
 * ORS key), seeded with this script and never used for a take. Per take: CREATE DATABASE klacks_marketing_spitex_take TEMPLATE
 * klacks_marketing_spitex (nothing may be connected to the template), start the recording API on the copy
 * (grouping-demo/start-recording-api.ps1 -Database klacks_marketing_spitex_take), delete its DataProtection-Keys afterwards.
 * CLI: --api-url  --group-id (demo group the new group is created beside)
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
  SHIFT_LIST_PATH,
  SHIFT_TYPE_TASK,
  SHIFT_STATUS_ORIGINAL_SHIFT,
  CLIENTS_PATH,
  LIST_PAGE_SIZE,
  FIRST_PAGE,
  loadGroup,
  ensureSiblingGroup,
  loadGroupEmployees,
  weekdayFlags,
} from "./lib/klacks-demo-api.mjs";
import {
  ORDERS as LEFTOVER_ORDERS,
  SHIFT_STATUS_OPEN_ORDER,
  SHIFT_STATUS_SEALED_ORDER,
  ordersWithStatus,
} from "./lib/order-review-demo.mjs";
import * as D from "./lib/spitex-demo.mjs";

const BRANCH_LIST_PATH = "Branch/GetBranchList";
const BRANCH_ADD_PATH = "Branch/AddBranch";
const BRANCH_PUT_PATH = "Branch/PutBranch";
const CLIENT_FIND_PATH = `${CLIENTS_PATH}/FindClient`;
const CONTRACTS_PATH = "Contracts";
const DIRECTIONS_PATH = "Routing/Directions";
const API_PREFIX = "/api/backend/";
const URL_BLANK_SEGMENT = "%20";
const GIVEN_NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname";
const USER_NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const MIN_ROUTE_POINTS = 3;
const LOG_PREFIX = "[seed-spitex]";

function log(message) {
  console.log(`${LOG_PREFIX} ${message}`);
}

function tokenClaims(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

function nearlyEqual(a, b) {
  return typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= D.COORDINATE_TOLERANCE;
}

function hhmm(time) {
  return String(time ?? "").slice(0, "00:00".length);
}

function addressBody(person) {
  return {
    type: D.ADDRESS_TYPE_MAIN,
    validFrom: D.ADDRESS_VALID_FROM,
    street: person.street,
    zip: person.zip,
    city: person.city,
    country: D.COUNTRY_CODE,
    state: D.STATE_CODE,
    latitude: person.lat,
    longitude: person.lon,
  };
}

function addressMatches(address, person) {
  return address.street === person.street && address.zip === person.zip && address.city === person.city
    && address.country === D.COUNTRY_CODE && nearlyEqual(address.latitude, person.lat) && nearlyEqual(address.longitude, person.lon);
}

async function findPerson(api, person, type) {
  const path = `${CLIENT_FIND_PATH}/${URL_BLANK_SEGMENT}/${encodeURIComponent(person.name)}/${encodeURIComponent(person.firstName)}`;
  const found = (await api.call(HTTP_GET, path)) ?? [];
  const matches = found.filter((c) => c.name === person.name && c.firstName === person.firstName && !c.isDeleted && c.type === type);
  if (matches.length > 1) throw new Error(`Ambiguous: ${matches.length} clients named "${person.firstName} ${person.name}" of type ${type}.`);
  return matches[0] ?? null;
}

function patientBody(person) {
  return {
    company: "",
    name: person.name,
    firstName: person.firstName,
    gender: person.gender,
    legalEntity: false,
    type: D.CLIENT_TYPE_CUSTOMER,
    skipAddressValidation: true,
    addresses: [addressBody(person)],
  };
}

async function ensurePatient(api, person) {
  const match = await findPerson(api, person, D.CLIENT_TYPE_CUSTOMER);
  if (!match) {
    const created = await api.call(HTTP_POST, CLIENTS_PATH, { data: patientBody(person) });
    return { id: created.id, action: "created" };
  }
  const existing = await api.call(HTTP_GET, `${CLIENTS_PATH}/${match.id}`);
  const addresses = existing.addresses ?? [];
  if (addresses.length === 1 && addressMatches(addresses[0], person)) return { id: existing.id, action: "unchanged" };
  const body = patientBody(person);
  await api.call(HTTP_PUT, CLIENTS_PATH, {
    data: { ...existing, ...body, id: existing.id, addresses: [{ ...(addresses[0] ?? {}), ...body.addresses[0] }] },
  });
  return { id: existing.id, action: "updated" };
}

async function ensureBranch(api) {
  const branches = (await api.call(HTTP_GET, BRANCH_LIST_PATH)) ?? [];
  const matches = branches.filter((branch) => branch.name === D.BRANCH.name);
  if (matches.length > 1) throw new Error(`Ambiguous: ${matches.length} branches named "${D.BRANCH.name}".`);
  const desired = { name: D.BRANCH.name, address: D.BASE_ADDRESS, phone: "", email: "" };
  if (matches.length === 0) {
    const created = await api.call(HTTP_POST, BRANCH_ADD_PATH, { data: desired });
    return { id: created.id, action: "created" };
  }
  if (matches[0].address === D.BASE_ADDRESS) return { id: matches[0].id, action: "unchanged" };
  await api.call(HTTP_PUT, BRANCH_PUT_PATH, { data: { ...matches[0], ...desired } });
  return { id: matches[0].id, action: "updated" };
}

async function findContractId(api) {
  const contracts = ((await api.call(HTTP_GET, CONTRACTS_PATH)) ?? []).filter((c) => c.name === D.NURSE_CONTRACT_NAME && !c.isDeleted);
  if (contracts.length !== 1) throw new Error(`Needs exactly one contract "${D.NURSE_CONTRACT_NAME}", found ${contracts.length}.`);
  return contracts[0].id;
}

function nurseBody(contractId, group) {
  return {
    company: "",
    name: D.NURSE.name,
    firstName: D.NURSE.firstName,
    gender: D.NURSE.gender,
    legalEntity: false,
    type: D.CLIENT_TYPE_EMPLOYEE,
    skipAddressValidation: true,
    addresses: [addressBody(D.NURSE)],
    membership: { validFrom: D.EMPLOYMENT_VALID_FROM, validUntil: null },
    clientContracts: [{ contractId, fromDate: D.CONTRACT_FROM_DATE, untilDate: null, isActive: true }],
    groupItems: [{ groupId: group.id, validFrom: D.GROUP_MEMBER_VALID_FROM, validUntil: null }],
  };
}

function nurseGaps(client, contractId, group) {
  const gaps = [];
  if (!client.membership || !D.activeOnDemoDay(client.membership.validFrom, client.membership.validUntil)) gaps.push("membership");
  const contracts = client.clientContracts ?? [];
  if (!contracts.some((c) => c.contractId === contractId && c.isActive && D.activeOnDemoDay(c.fromDate, c.untilDate))) gaps.push("contract");
  const items = client.groupItems ?? [];
  if (!items.some((i) => i.groupId === group.id && D.activeOnDemoDay(i.validFrom, i.validUntil))) gaps.push("group membership");
  const addresses = client.addresses ?? [];
  if (addresses.length !== 1 || !addressMatches(addresses[0], D.NURSE)) gaps.push("address");
  return gaps;
}

async function ensureNurse(api, group) {
  const contractId = await findContractId(api);
  const match = await findPerson(api, D.NURSE, D.CLIENT_TYPE_EMPLOYEE);
  if (!match) {
    const created = await api.call(HTTP_POST, CLIENTS_PATH, { data: nurseBody(contractId, group) });
    return { id: created.id, contractId, action: "created" };
  }
  const existing = await api.call(HTTP_GET, `${CLIENTS_PATH}/${match.id}`);
  if (nurseGaps(existing, contractId, group).length === 0) return { id: existing.id, contractId, action: "unchanged" };
  const body = nurseBody(contractId, group);
  const keep = (list, isSame) => (list ?? []).filter((entry) => !isSame(entry));
  await api.call(HTTP_PUT, CLIENTS_PATH, {
    data: {
      ...existing,
      ...body,
      id: existing.id,
      addresses: [{ ...(existing.addresses ?? [])[0], ...body.addresses[0] }],
      membership: { ...(existing.membership ?? {}), ...body.membership },
      clientContracts: [...keep(existing.clientContracts, (c) => c.contractId === contractId), ...body.clientContracts],
      groupItems: [...keep(existing.groupItems, (i) => i.groupId === group.id), ...body.groupItems],
    },
  });
  return { id: existing.id, contractId, action: "updated" };
}

function orderBody(person, clientId, group) {
  return {
    name: person.order.name,
    abbreviation: person.order.abbreviation,
    description: "",
    status: SHIFT_STATUS_OPEN_ORDER,
    shiftType: SHIFT_TYPE_TASK,
    fromDate: D.DEMO_DAY,
    untilDate: D.DEMO_DAY,
    startShift: D.ORDER.start,
    endShift: D.ORDER.end,
    workTime: D.ORDER_WORK_TIME,
    quantity: D.ORDER.quantity,
    sumEmployees: D.ORDER.sumEmployees,
    isTimeRange: D.ORDER.isTimeRange,
    isSporadic: D.ORDER.isSporadic,
    clientId,
    ...weekdayFlags([D.DEMO_WEEKDAY]),
    groups: [group],
  };
}

function openOrderFilter(searchString, requiredPage) {
  return {
    searchString,
    activeDateRange: true,
    formerDateRange: true,
    futureDateRange: true,
    includeClientName: false,
    isSealedOrder: false,
    isTimeRange: true,
    isSporadic: true,
    numberOfItemsPerPage: LIST_PAGE_SIZE,
    requiredPage,
    orderBy: "",
    sortOrder: "",
  };
}

async function listOpenOrders(api) {
  const orders = [];
  for (let page = FIRST_PAGE; ; page += 1) {
    const result = await api.call(HTTP_POST, SHIFT_LIST_PATH, { data: openOrderFilter("", page) });
    const shifts = result?.shifts ?? [];
    orders.push(...shifts.filter((s) => s.status === SHIFT_STATUS_OPEN_ORDER));
    if (shifts.length < LIST_PAGE_SIZE) return orders;
  }
}

async function retireLeftoverOrders(api, post) {
  const retired = [];
  for (const leftover of LEFTOVER_ORDERS) {
    for (const order of await ordersWithStatus(post, leftover.abbreviation, SHIFT_STATUS_OPEN_ORDER)) {
      await api.call(HTTP_DELETE, `${SHIFTS_PATH}/${order.id}`);
      retired.push(leftover.abbreviation);
    }
  }
  return retired;
}

async function ensureOrder(api, post, person, clientId, group) {
  const sealed = await ordersWithStatus(post, person.order.abbreviation, SHIFT_STATUS_SEALED_ORDER);
  if (sealed.length > 0) {
    throw new Error(`order ${person.order.abbreviation} is already sealed: this database was consumed by a take, make a fresh copy of the seeded template`);
  }
  const open = await ordersWithStatus(post, person.order.abbreviation, SHIFT_STATUS_OPEN_ORDER);
  if (open.length > 1) throw new Error(`Ambiguous: ${open.length} open orders ${person.order.abbreviation}.`);
  const desired = orderBody(person, clientId, group);
  if (open.length === 0) {
    const created = await api.call(HTTP_POST, SHIFTS_PATH, { data: desired });
    return { id: created.id, action: "created" };
  }
  const existing = await api.call(HTTP_GET, `${SHIFTS_PATH}/${open[0].id}`);
  await api.call(HTTP_PUT, SHIFTS_PATH, {
    data: { ...existing, ...desired, id: existing.id, groups: [group], client: undefined },
  });
  return { id: existing.id, action: "updated" };
}

function verifyOrder(stored, person, clientId, group, problems) {
  const label = person.order.abbreviation;
  const activeFlags = Object.keys(weekdayFlags([])).filter((flag) => stored[flag]);
  if (stored.status !== SHIFT_STATUS_OPEN_ORDER) problems.push(`${label} status is ${stored.status}`);
  if (!stored.isTimeRange) problems.push(`${label} is not a time-range order`);
  if (stored.clientId !== clientId) problems.push(`${label} is not linked to ${person.name}`);
  if (D.dateOnly(stored.fromDate) !== D.DEMO_DAY || D.dateOnly(stored.untilDate) !== D.DEMO_DAY) problems.push(`${label} is not limited to ${D.DEMO_DAY}`);
  if (hhmm(stored.startShift) !== hhmm(D.ORDER.start) || hhmm(stored.endShift) !== hhmm(D.ORDER.end)) problems.push(`${label} window is ${stored.startShift}-${stored.endShift}`);
  if (typeof stored.workTime !== "number" || Math.abs(stored.workTime - D.ORDER_WORK_TIME) > D.WORK_TIME_TOLERANCE) problems.push(`${label} work time is ${stored.workTime}`);
  if (stored.quantity !== D.ORDER.quantity || stored.sumEmployees !== D.ORDER.sumEmployees) problems.push(`${label} quantity/sumEmployees differ`);
  if (activeFlags.length !== 1 || activeFlags[0] !== D.DEMO_WEEKDAY_FLAG) problems.push(`${label} weekdays are ${activeFlags.join(",") || "none"}`);
  if (stored.isHoliday || stored.isWeekdayAndHoliday) problems.push(`${label} has a holiday flag`);
  const groupIds = (stored.groups ?? []).map((g) => g.id);
  if (groupIds.length !== 1 || groupIds[0] !== group.id) problems.push(`${label} is not exactly in the group "${group.name}"`);
  if (!stored.abbreviation || !stored.name) problems.push(`${label} lacks name or abbreviation`);
}

async function verifyPatients(api, patientIds, problems) {
  const checked = [];
  for (const person of D.PATIENTS) {
    const stored = await api.call(HTTP_GET, `${CLIENTS_PATH}/${patientIds.get(person.key)}`);
    const addresses = stored.addresses ?? [];
    if (stored.type !== D.CLIENT_TYPE_CUSTOMER || stored.name !== person.name) problems.push(`Patient ${person.name} is not stored as a customer`);
    if (addresses.length !== 1) problems.push(`Patient ${person.name} has ${addresses.length} addresses`);
    else if (!addressMatches(addresses[0], person)) problems.push(`Patient ${person.name}: stored address/coordinates ${addresses[0].street} ${addresses[0].latitude},${addresses[0].longitude} differ from the fixed ones`);
    checked.push({ patient: `${person.firstName} ${person.name}`, street: `${person.street}, ${person.zip}`, latitude: addresses[0]?.latitude, longitude: addresses[0]?.longitude });
  }
  return checked;
}

async function verifyNurse(api, nurse, group, problems) {
  const stored = await api.call(HTTP_GET, `${CLIENTS_PATH}/${nurse.id}`);
  const gaps = nurseGaps(stored, nurse.contractId, group);
  if (gaps.length > 0) problems.push(`Nurse is missing on ${D.DEMO_DAY}: ${gaps.join(", ")}`);
  const members = await loadGroupEmployees(api, group.id);
  if (!members.some((m) => m.id === nurse.id)) problems.push(`Nurse is not listed among the members of "${group.name}"`);
  const item = (stored.groupItems ?? []).find((i) => i.groupId === group.id);
  return { id: nurse.id, name: `${D.NURSE.firstName} ${D.NURSE.name}`, groupMemberFrom: D.dateOnly(item?.validFrom), groupMemberUntil: item?.validUntil ?? null, groupMembers: members.length };
}

async function verifyRouting(api, problems) {
  const point = (p) => ({ lat: p.lat, lon: p.lon });
  const legs = [
    ["base -> first patient", [D.BRANCH, D.PATIENTS[0]]],
    ["first -> last patient", [D.PATIENTS[0], D.PATIENTS[D.PATIENTS.length - 1]]],
  ];
  const result = {};
  for (const [label, points] of legs) {
    const route = (await api.call(HTTP_POST, DIRECTIONS_PATH, { data: points.map(point) })) ?? [];
    result[label] = route.length;
    if (route.length < MIN_ROUTE_POINTS) problems.push(`Routing ${label} returned ${route.length} points (ORS key/DataProtection key unusable?)`);
  }
  return result;
}

async function verifyOpenOrders(api, group, patientIds, problems) {
  const orders = await listOpenOrders(api);
  const ours = new Set(D.SPITEX_ABBREVIATIONS);
  const foreign = orders.filter((o) => !ours.has(o.abbreviation)).map((o) => o.abbreviation);
  if (foreign.length > 0) problems.push(`Foreign open orders remain: ${foreign.join(", ")}`);
  const stored = [];
  for (const person of D.PATIENTS) {
    const matches = orders.filter((o) => o.abbreviation === person.order.abbreviation);
    if (matches.length !== 1) {
      problems.push(`${person.order.abbreviation}: ${matches.length} open orders`);
      continue;
    }
    const full = await api.call(HTTP_GET, `${SHIFTS_PATH}/${matches[0].id}`);
    verifyOrder(full, person, patientIds.get(person.key), group, problems);
    stored.push({ abbreviation: person.order.abbreviation, id: full.id, status: full.status });
  }
  return { open: orders.length, foreign, stored };
}

async function describeOtherTimeRangeTasks(api, group) {
  const found = new Map();
  for (let page = FIRST_PAGE; ; page += 1) {
    const result = await api.call(HTTP_POST, SHIFT_LIST_PATH, {
      data: {
        searchString: "",
        filterType: 1,
        activeDateRange: true,
        formerDateRange: false,
        futureDateRange: true,
        includeClientName: false,
        isSealedOrder: false,
        isTimeRange: true,
        isSporadic: false,
        numberOfItemsPerPage: LIST_PAGE_SIZE,
        requiredPage: page,
        orderBy: "",
        sortOrder: "",
      },
    });
    const shifts = result?.shifts ?? [];
    for (const shift of shifts) {
      const onDay = shift.status === SHIFT_STATUS_ORIGINAL_SHIFT && shift.isTimeRange && shift[D.DEMO_WEEKDAY_FLAG]
        && D.activeOnDemoDay(shift.fromDate, shift.untilDate);
      if (onDay && !(shift.groups ?? []).some((g) => g.id === group.id)) found.set(shift.id, shift);
    }
    if (shifts.length < LIST_PAGE_SIZE) break;
  }
  const byGroup = {};
  for (const shift of found.values()) {
    const key = (shift.groups ?? []).map((g) => g.name).join("+") || "(no group)";
    byGroup[key] = (byGroup[key] ?? 0) + 1;
  }
  return { count: found.size, byGroup };
}

async function assertDemoUser(token) {
  const claims = tokenClaims(token);
  const firstName = claims[GIVEN_NAME_CLAIM];
  const userName = claims[USER_NAME_CLAIM];
  if (firstName !== D.STORY_FIRST_NAME || userName !== D.STORY_FIRST_NAME) {
    throw new Error(`the demo user is called "${firstName}" (user name "${userName}"), the greeting in the take must say ${D.STORY_FIRST_NAME}: set "AspNetUsers".first_name and user_name to '${D.STORY_FIRST_NAME}' (normalized_user_name upper case) in the klacks_marketing_* copy, restart the API and run again`);
  }
}

async function main() {
  const { values } = parseArgs({ options: { "api-url": { type: "string" }, "group-id": { type: "string" } } });
  const options = S.readSessionOptions(values);
  if (!options.apiUrl.includes(D.RECORDING_API_PORT)) {
    throw new Error(`refusing ${options.apiUrl}: seed only the recording API (${D.RECORDING_API_PORT}) on a klacks_marketing_* copy`);
  }
  D.assertPlan();
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await S.apiLogin(context, options);
    await assertDemoUser(token);
    const api = new KlacksApi(context, options.apiUrl, token);
    const post = (apiPath, data) => api.call(HTTP_POST, apiPath.replace(API_PREFIX, ""), { data });
    const problems = [];

    const demoGroup = await loadGroup(api, options.groupId);
    const ensuredGroup = await ensureSiblingGroup(api, D.GROUP.name, D.GROUP.description, demoGroup.id);
    const group = { id: ensuredGroup.id, name: ensuredGroup.name, description: ensuredGroup.description };
    log(`group ${group.name} ${ensuredGroup.action} ${group.id}`);
    const branch = await ensureBranch(api);
    log(`branch ${D.BRANCH.name} ${branch.action}`);

    const patientIds = new Map();
    const patientActions = [];
    for (const person of D.PATIENTS) {
      const result = await ensurePatient(api, person);
      patientIds.set(person.key, result.id);
      patientActions.push(`${person.name}:${result.action}`);
    }
    log(`patients ${patientActions.join(" ")}`);
    const nurse = await ensureNurse(api, group);
    log(`nurse ${D.NURSE.firstName} ${D.NURSE.name} ${nurse.action}`);

    const retired = await retireLeftoverOrders(api, post);
    if (retired.length > 0) log(`deleted leftover open orders of other demos: ${retired.join(", ")}`);
    const orderActions = [];
    for (const person of D.PATIENTS) {
      const result = await ensureOrder(api, post, person, patientIds.get(person.key), group);
      orderActions.push(`${person.order.abbreviation}:${result.action}`);
    }
    log(`orders ${orderActions.join(" ")}`);

    const summary = {
      group,
      branch: { ...branch, name: D.BRANCH.name, address: D.BASE_ADDRESS },
      demoDay: D.DEMO_DAY,
      retiredLeftoverOrders: retired,
      patients: await verifyPatients(api, patientIds, problems),
      nurse: await verifyNurse(api, nurse, group, problems),
      orders: await verifyOpenOrders(api, group, patientIds, problems),
      routingPoints: await verifyRouting(api, problems),
      otherTimeRangeTasksOnDemoWeekday: await describeOtherTimeRangeTasks(api, group),
    };
    if (problems.length > 0) throw new Error(`Self-check failed: ${problems.join("; ")}`);
    console.log(JSON.stringify(summary, null, 2));
    log(`ok: ${D.PATIENTS.length} patients, ${D.PATIENTS.length} open orders on ${D.DEMO_DAY}, nurse in "${group.name}"`);
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
