// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Seeds one site of the security demo (definition: lib/security-demo.mjs) into a klacks_marketing_* copy through the real REST API of the recording API
 * (port 5011; every other URL is refused). Ids always come from the server. It builds:
 *   - a clean stage: every group named after the foreign demo town is renamed (the API refuses to delete groups with planned works) and branches there are
 *     deleted, so the group selection and branch lists show no foreign town; open orders of the older demos are deleted (Klacksy reports open orders),
 *   - the group of the site as a sibling of the city group Bern (canton BE calendar, monthly payment interval),
 *   - the part-time contracts of canton BE, ten fictional employees with fixed coordinates, membership and contract,
 *   - the orders: 24-hour object order 07:00-07:00 sealed and cut into 07-15, 15-23, 23-07 through Shifts/Cuts/Batch (the product's path; an uncut 24-hour
 *     shift exceeds the daily cap of 10 h), Revierdienst 07:00-19:00 sealed and cut into 07-13, 13-19 for the same reason, Empfang 08:00-16:30 uncut.
 *     All orders are limited to December, so the error list reports no understaffing in the neighbouring months. Revierdienst and Empfang keep their weekdays on holidays: the wizard expands shifts by weekday only, so without the flag it would plan them on the
 *     25./26.12. although the shift rows of the schedule show none,
 *   - contracts on the scheduling rule of the security industry with a holiday-work exemption of that rule, so the staffed Christmas days raise no warning,
 *   - the stage: m1 wish placeholders; m2 vacation booked the way the context menu "Absenz übernehmen" books it (Breaks/Bulk, one break per calendar day, then
 *     the placeholder is deleted); m3 vacation plus planning commands; r1/r2 vacation, December planned by the AutoWizard and accepted, then one on-call day
 *     per calendar day on a free team member.
 * --self-check runs the wizard the way the AutoWizard button runs it (agents = rows of the schedule, shifts = rows of the shift schedule, start, poll), accepts
 * the scenario without any override and evaluates the real plan. It replaces December, so it belongs on a throw-away copy, never on a stage database.
 * Template: klacks_marketing_security_template (migrated, phrases synced, nothing seeded); per stage CREATE DATABASE klacks_marketing_security_<site>_<stage> TEMPLATE
 * klacks_marketing_security_template, start the recording API on it, run this script, stop the API. r2 is a copy of a good r1, so both clips start from the same plan; run with --stage r2 on a copy of that r2 it keeps the
 * plan and only adds what lets one duty stay open (applyOpenSlot), so the take of clip R2 runs it on its throw-away copy and the master stays unchanged.
 * CLI: --site bern|biel  --stage m1|m2|m3|r1|r2  [--self-check]  [--report <file>]  [--api-url <url>]
 * Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL.
 */

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
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
  CLIENTS_PATH,
  GROUPS_PATH,
  GROUPS_TREE_PATH,
  LIST_PAGE_SIZE,
  FIRST_PAGE,
  loadGroupEmployees,
  weekdayFlags,
  minutesToWorkTime,
} from "./lib/klacks-demo-api.mjs";
import { SCHEDULE_API, worksIn } from "./lib/schedule-grid.mjs";
import * as D from "./lib/security-demo.mjs";
import * as P from "./lib/security-plan-check.mjs";

const API_SCHEDULE_PATH = SCHEDULE_API.replace("/api/backend/", "");
const CLIENT_FIND_PATH = `${CLIENTS_PATH}/FindClient`;
const CONTRACTS_PATH = "Contracts";
const ABSENCES_PATH = "Absences";
const BRANCH_LIST_PATH = "Branch/GetBranchList";
const BRANCH_DELETE_PATH = "Branch/DeleteBranch";
const SCHEDULING_RULES_PATH = "SchedulingRules";
const HOLIDAY_EXEMPTIONS_PATH = `${SCHEDULING_RULES_PATH}/HolidayWorkExemptions`;
const SHIFT_SCHEDULE_PATH = "Shifts/Schedule";
const CUTS_BATCH_PATH = "Shifts/Cuts/Batch";
const BREAKS_PATH = "Breaks";
const BREAKS_BULK_PATH = "Breaks/Bulk";
const QUALIFICATION_LIST_PATH = "Qualification/GetQualificationList";
const REQUIRED_QUALIFICATIONS_PATH = "Shifts/RequiredQualifications";
const BREAK_PLACEHOLDERS_PATH = "BreakPlaceholders";
const SCHEDULE_COMMANDS_PATH = "ScheduleCommands";
const AUTO_WIZARD_START_PATH = "AutoWizard/Start";
const AUTO_WIZARD_STATUS_PATH = "AutoWizard/Status";
const SCENARIOS_PATH = "AnalyseScenarios";
const PERIOD_HOURS_PATH = "Works/PeriodHours";
const URL_BLANK_SEGMENT = "%20";
const FULL_DAY_START = "00:00:00";
const FULL_DAY_END = "23:59:00";
const SHIFT_STATUS_OPEN_ORDER = 0;
const SHIFT_STATUS_SEALED_ORDER = 1;
const SHIFT_STATUS_ORIGINAL_SHIFT = 2;
const SHIFT_STATUS_SPLIT_SHIFT = 3;
const ENTRY_SOURCE_PLACEHOLDER = 1;
const NO_VISIBLE_ROW_LIMIT = 500;
const SHIFT_ROW_LIMIT = 5000;
const JOB_POLL_MS = 5000;
const JOB_TIMEOUT_MS = 30 * 60 * 1000;
const JOB_STATUS_RUNNING = "running";
const JOB_STATUS_COMPLETED = "completed";
const ABSENCE_VACATION = "Ferien";
const ABSENCE_ON_CALL = "Pikett";
const GIVEN_NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname";
const LOG_PREFIX = "[seed-security]";
const ORDER_DESCRIPTION_SUFFIX = "Demo-Auftrag Objektschutz";
const LANGUAGE = "de";

const log = (message) => console.log(`${LOG_PREFIX} ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const label = (member) => `${member.firstName} ${member.name}`;

function readOptions() {
  const { values } = parseArgs({
    options: {
      "api-url": { type: "string" },
      site: { type: "string" },
      stage: { type: "string" },
      report: { type: "string" },
      "self-check": { type: "boolean", default: false },
    },
  });
  const site = D.SITES[values.site];
  if (!site) throw new Error(`--site must be one of ${Object.keys(D.SITES).join(", ")}`);
  if (!site.stages.includes(values.stage)) throw new Error(`--stage must be one of ${site.stages.join(", ")} for the site ${site.key}`);
  return { session: S.readSessionOptions(values), site, stage: D.STAGES[values.stage], stageName: values.stage, selfCheck: values["self-check"], reportPath: values.report };
}

function flattenNodes(nodes, found = []) {
  for (const node of nodes ?? []) {
    found.push(node);
    flattenNodes(node.children, found);
  }
  return found;
}

async function assertDemoUser(token) {
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  if (claims[GIVEN_NAME_CLAIM] !== D.STORY_FIRST_NAME) throw new Error(`the demo user is called "${claims[GIVEN_NAME_CLAIM]}", the takes greet ${D.STORY_FIRST_NAME}`);
}

async function deleteOpenOrders(api) {
  const orders = [];
  for (let page = FIRST_PAGE; ; page += 1) {
    const result = await api.call(HTTP_POST, SHIFT_LIST_PATH, {
      data: {
        searchString: "",
        activeDateRange: true,
        formerDateRange: true,
        futureDateRange: true,
        includeClientName: false,
        isSealedOrder: false,
        isTimeRange: true,
        isSporadic: true,
        numberOfItemsPerPage: LIST_PAGE_SIZE,
        requiredPage: page,
        orderBy: "",
        sortOrder: "",
      },
    });
    const shifts = result?.shifts ?? [];
    orders.push(...shifts.filter((shift) => shift.status === SHIFT_STATUS_OPEN_ORDER));
    if (shifts.length < LIST_PAGE_SIZE) break;
  }
  for (const order of orders) await api.call(HTTP_DELETE, `${SHIFTS_PATH}/${order.id}`);
  return orders.length;
}

/**
 * Removes the foreign demo town from what the clips can show. The groups hold planned works, so the API refuses to delete them; they are renamed instead
 * (name and description, PUT of the stored resource). Branches are deleted. Works, clients and shifts of those groups stay in the copy.
 */
async function clearStage(api) {
  const replace = (text) => String(text ?? "").replaceAll(D.FOREIGN_NAME_FRAGMENT, D.NEUTRAL_TOWN);
  const matches = (text) => String(text ?? "").includes(D.FOREIGN_NAME_FRAGMENT);
  const removed = { groups: [], branches: [] };
  const groups = flattenNodes((await api.call(HTTP_GET, GROUPS_TREE_PATH))?.nodes).filter((group) => matches(group.name) || matches(group.description));
  for (const group of groups) {
    const stored = await api.call(HTTP_GET, `${GROUPS_PATH}/${group.id}`);
    await api.call(HTTP_PUT, GROUPS_PATH, { data: { ...stored, name: replace(stored.name), description: replace(stored.description) } });
    removed.groups.push(replace(group.name));
  }
  for (const branch of (await api.call(HTTP_GET, BRANCH_LIST_PATH)) ?? []) {
    if (!matches(branch.name) && !matches(branch.address)) continue;
    await api.call(HTTP_DELETE, `${BRANCH_DELETE_PATH}/${branch.id}`);
    removed.branches.push(branch.name);
  }
  removed.openOrders = await deleteOpenOrders(api);
  return removed;
}

async function ensureGroup(api, site) {
  const nodes = flattenNodes((await api.call(HTTP_GET, GROUPS_TREE_PATH))?.nodes);
  const existing = nodes.find((node) => node.name === site.group.name);
  if (existing) return { id: existing.id, name: existing.name, action: "unchanged" };
  const reference = nodes.find((node) => node.name === D.CANTON_PARENT_REFERENCE_GROUP);
  if (!reference) throw new Error(`the group ${D.CANTON_PARENT_REFERENCE_GROUP} is missing`);
  const stored = await api.call(HTTP_GET, `${GROUPS_PATH}/${reference.id}`);
  const created = await api.call(HTTP_POST, GROUPS_PATH, {
    data: {
      name: site.group.name,
      description: site.group.description,
      parent: stored.parent ?? null,
      validFrom: stored.validFrom,
      validUntil: null,
      paymentInterval: D.PAYMENT_INTERVAL_MONTHLY,
      calendarSelectionId: stored.calendarSelectionId ?? null,
    },
  });
  return { id: created.id, name: created.name, action: "created" };
}

async function findSchedulingRuleId(api) {
  const rule = ((await api.call(HTTP_GET, SCHEDULING_RULES_PATH)) ?? []).find((entry) => entry.name === D.SCHEDULING_RULE_NAME);
  if (!rule) throw new Error(`the scheduling rule ${D.SCHEDULING_RULE_NAME} is missing`);
  return rule.id;
}

async function ensureHolidayExemption(api, schedulingRuleId) {
  const exemptions = (await api.call(HTTP_GET, HOLIDAY_EXEMPTIONS_PATH)) ?? [];
  if (exemptions.some((entry) => entry.schedulingRuleId === schedulingRuleId)) return "unchanged";
  await api.call(HTTP_POST, HOLIDAY_EXEMPTIONS_PATH, { data: { description: D.HOLIDAY_WORK_EXEMPTION_TEXT, schedulingRuleId } });
  return "created";
}

async function ensureContracts(api, schedulingRuleId) {
  const contracts = ((await api.call(HTTP_GET, CONTRACTS_PATH)) ?? []).filter((contract) => !contract.isDeleted);
  const reference = contracts.find((contract) => contract.name === D.CONTRACT_REFERENCE);
  if (!reference) throw new Error(`the contract ${D.CONTRACT_REFERENCE} is missing`);
  const ids = {};
  for (const [key, def] of Object.entries(D.CONTRACTS)) {
    const found = contracts.find((contract) => contract.name === def.name);
    if (found) {
      ids[key] = found.id;
      continue;
    }
    const { id, calendarSelection, ...copy } = reference;
    const created = await api.call(HTTP_POST, CONTRACTS_PATH, {
      data: { ...copy, name: def.name, guaranteedHours: def.guaranteed, minimumHours: def.minimum, maximumHours: def.maximum, percent: def.percent, schedulingRuleId },
    });
    ids[key] = created.id;
  }
  return ids;
}

function addressBody(member) {
  return {
    type: D.ADDRESS_TYPE_MAIN,
    validFrom: D.ADDRESS_VALID_FROM,
    street: member.street,
    zip: member.zip,
    city: member.city,
    country: D.COUNTRY_CODE,
    state: D.STATE_CODE,
    latitude: member.lat,
    longitude: member.lon,
  };
}

async function ensureMember(api, member, contractIds, group) {
  const path = `${CLIENT_FIND_PATH}/${URL_BLANK_SEGMENT}/${encodeURIComponent(member.name)}/${encodeURIComponent(member.firstName)}`;
  const found = ((await api.call(HTTP_GET, path)) ?? []).filter((client) => client.name === member.name && client.firstName === member.firstName && !client.isDeleted);
  if (found.length > 1) throw new Error(`Ambiguous: ${found.length} clients named ${label(member)}.`);
  if (found.length === 1) {
    const stored = await api.call(HTTP_GET, `${CLIENTS_PATH}/${found[0].id}`);
    if ((stored.groupItems ?? []).some((item) => item.groupId === group.id)) return { id: stored.id, action: "unchanged" };
    throw new Error(`${label(member)} already exists outside the group: choose another fictional name in lib/security-demo.mjs`);
  }
  const contractId = contractIds[member.contract];
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
      membership: { validFrom: D.EMPLOYMENT_VALID_FROM, validUntil: null },
      clientContracts: contractId ? [{ contractId, fromDate: D.CONTRACT_FROM_DATE, untilDate: null, isActive: true }] : [],
      groupItems: [{ groupId: group.id, validFrom: D.GROUP_MEMBER_VALID_FROM, validUntil: null }],
    },
  });
  return { id: created.id, action: "created" };
}

function orderBody(order, group, status) {
  const flags = weekdayFlags(order.weekdays);
  return {
    name: order.name,
    abbreviation: order.abbreviation,
    description: ORDER_DESCRIPTION_SUFFIX,
    status,
    shiftType: SHIFT_TYPE_TASK,
    fromDate: D.PERIOD.from,
    untilDate: D.PERIOD.until,
    startShift: order.start,
    endShift: order.end,
    workTime: order.workTime,
    quantity: 1,
    sumEmployees: 1,
    isTimeRange: false,
    isSporadic: false,
    sporadicScope: 0,
    clientId: null,
    cuttingAfterMidnight: false,
    isHoliday: order.onHolidays,
    isWeekdayAndHoliday: order.keepsWeekdayOnHolidays === true,
    ...flags,
    groups: [{ id: group.id, name: group.name }],
  };
}

async function shiftsWithAbbreviation(api, abbreviation, isSealedOrder) {
  const result = await api.call(HTTP_POST, SHIFT_LIST_PATH, {
    data: {
      searchString: abbreviation,
      filterType: 1,
      activeDateRange: true,
      formerDateRange: true,
      futureDateRange: true,
      includeClientName: false,
      isSealedOrder,
      isTimeRange: false,
      isSporadic: false,
      numberOfItemsPerPage: LIST_PAGE_SIZE,
      requiredPage: FIRST_PAGE,
      orderBy: "",
      sortOrder: "",
    },
  });
  return (result?.shifts ?? []).filter((shift) => shift.abbreviation === abbreviation);
}

function partBody(plannable, part) {
  const crossesMidnight = part.end <= part.start;
  return {
    ...plannable,
    name: part.name,
    abbreviation: part.abbreviation,
    startShift: part.start,
    endShift: part.end,
    workTime: minutesToWorkTime(D.partHours(part) * 60),
    cuttingAfterMidnight: crossesMidnight,
    status: SHIFT_STATUS_SPLIT_SHIFT,
    client: undefined,
  };
}

/**
 * Seals the order (its plannable copy appears server-side) and cuts it the way the cut dialog and cut_shift do: the plannable shift becomes the first part
 * (UPDATE), the others are created (CREATE, client-generated id), parent is the sealed order.
 */
async function ensureOrder(api, order, group) {
  const abbreviations = D.plannableParts(order).map((part) => part.abbreviation);
  const present = [];
  for (const abbreviation of abbreviations) present.push(...(await shiftsWithAbbreviation(api, abbreviation, false)));
  if (present.length === abbreviations.length) return { order: order.abbreviation, action: "unchanged" };
  if (present.length > 0 && order.parts) throw new Error(`Order ${order.abbreviation} is half cut (${present.length} of ${abbreviations.length} parts): use a fresh copy of the template`);
  await api.call(HTTP_POST, SHIFTS_PATH, { data: orderBody(order, group, SHIFT_STATUS_SEALED_ORDER) });
  const plannableRows = (await shiftsWithAbbreviation(api, order.abbreviation, false)).filter((shift) => shift.status === SHIFT_STATUS_ORIGINAL_SHIFT);
  if (plannableRows.length !== 1) throw new Error(`sealing ${order.abbreviation} produced ${plannableRows.length} plannable shifts`);
  if (!order.parts) return { order: order.abbreviation, action: "sealed", id: plannableRows[0].id };
  const plannable = await api.call(HTTP_GET, `${SHIFTS_PATH}/${plannableRows[0].id}`);
  const parentId = plannable.originalId;
  const operations = order.parts.map((part, index) => (index === 0
    ? { type: "UPDATE", parentId, data: partBody(plannable, part) }
    : { type: "CREATE", parentId, data: { ...partBody(plannable, part), id: randomUUID() } }));
  const parts = await api.call(HTTP_POST, CUTS_BATCH_PATH, { data: { operations } });
  return { order: order.abbreviation, action: "cut", sealedOrderId: parentId, parts: parts.map((part) => ({ id: part.id, abbreviation: part.abbreviation, status: part.status, originalId: part.originalId, parentId: part.parentId, rootId: part.rootId })) };
}

async function absenceId(api, name) {
  const absences = (await api.call(HTTP_GET, ABSENCES_PATH)) ?? [];
  const list = Array.isArray(absences) ? absences : absences.absences ?? [];
  const match = list.find((absence) => absence.name?.[LANGUAGE] === name || absence.name?.de === name);
  if (!match) throw new Error(`the absence type ${name} is missing`);
  return match.id;
}

function scheduleFilter(group, analyseToken = null) {
  return {
    ...S.buildScheduleFilter(group.id, D.PERIOD),
    startDate: D.PERIOD.from,
    endDate: D.PERIOD.until,
    periodStartDate: D.PERIOD.from,
    periodEndDate: D.PERIOD.until,
    startRow: 0,
    rowCount: NO_VISIBLE_ROW_LIMIT,
    analyseToken,
  };
}

const readSchedule = (api, group, token) => api.call(HTTP_POST, API_SCHEDULE_PATH, { data: scheduleFilter(group, token) });

async function placeWishes(api, site, memberIds, vacationId) {
  const placed = [];
  for (const vacation of site.vacations) {
    await api.call(HTTP_POST, BREAK_PLACEHOLDERS_PATH, {
      data: { absenceId: vacationId, clientId: memberIds[vacation.key], entrySource: ENTRY_SOURCE_PLACEHOLDER, from: `${vacation.from}T00:00:00Z`, until: `${vacation.until}T00:00:00Z`, information: "" },
    });
    placed.push(`${vacation.key} ${vacation.from}..${vacation.until}`);
  }
  return placed;
}

async function bookBreaks(api, entries) {
  await api.call(HTTP_POST, BREAKS_BULK_PATH, {
    data: { breaks: entries, periodStart: D.PERIOD.from, periodEnd: D.PERIOD.until, paymentInterval: D.PAYMENT_INTERVAL_MONTHLY },
  });
}

async function bookVacations(api, site, group, memberIds, vacationId) {
  const booked = [];
  const data = await readSchedule(api, group, null);
  for (const vacation of site.vacations) {
    const already = data.entries.some((entry) => entry.entryType === P.ENTRY_TYPE_BREAK && entry.clientId === memberIds[vacation.key]);
    if (already) continue;
    const days = D.datesBetween(vacation.from, vacation.until);
    await bookBreaks(api, days.map((day) => ({ clientId: memberIds[vacation.key], absenceId: vacationId, currentDate: day, workTime: 0, startTime: FULL_DAY_START, endTime: FULL_DAY_END })));
    booked.push({ key: vacation.key, days: days.length });
  }
  return booked;
}

async function setCommands(api, site, group, memberIds) {
  const data = await readSchedule(api, group, null);
  const stored = data.entries.filter((entry) => entry.entryType === P.ENTRY_TYPE_COMMAND);
  if (stored.length > 0) return stored.length;
  for (const command of site.commands) {
    await api.call(HTTP_POST, SCHEDULE_COMMANDS_PATH, { data: { clientId: memberIds[command.key], currentDate: command.day, commandKeyword: command.keyword } });
  }
  return site.commands.length;
}

async function startWizard(api, group) {
  const schedule = await readSchedule(api, group, null);
  const shiftRows = (await api.call(HTTP_POST, SHIFT_SCHEDULE_PATH, {
    data: { startDate: D.PERIOD.from, endDate: D.PERIOD.until, selectedGroup: group.id, holidayDates: [...D.HOLIDAYS], startRow: 0, rowCount: SHIFT_ROW_LIMIT },
  }))?.shifts ?? [];
  const shiftIds = [...new Set(shiftRows.map((row) => row.shiftId))];
  const agentIds = schedule.clients.map((client) => client.id);
  const started = await api.call(HTTP_POST, AUTO_WIZARD_START_PATH, {
    data: { periodFrom: D.PERIOD.from, periodUntil: D.PERIOD.until, agentIds, shiftIds, groupId: group.id, analyseToken: null, language: LANGUAGE, agentOrderIsUserDefined: false },
  });
  return { jobId: started.jobId, agents: agentIds.length, shifts: shiftIds.length };
}

async function waitForWizard(api, jobId) {
  const deadline = Date.now() + JOB_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(JOB_POLL_MS);
    const status = await api.call(HTTP_GET, `${AUTO_WIZARD_STATUS_PATH}/${jobId}`);
    if (String(status?.status).toLowerCase() !== JOB_STATUS_RUNNING) return status;
  }
  throw new Error(`AutoWizard job ${jobId} did not finish within ${JOB_TIMEOUT_MS / 60000} minutes`);
}

/** Plans December the way the AutoWizard button does and accepts the final scenario without any override; a refused accept fails the run. */
async function planAndAccept(api, group) {
  const started = Date.now();
  const { jobId, agents, shifts } = await startWizard(api, group);
  log(`AutoWizard ${jobId}: ${agents} agents, ${shifts} shifts`);
  const job = await waitForWizard(api, jobId);
  if (String(job?.status).toLowerCase() !== JOB_STATUS_COMPLETED) throw new Error(`AutoWizard ended as ${job?.status}: ${job?.reason ?? ""}`);
  const result = job.result;
  const scenario = await api.call(HTTP_GET, `${SCENARIOS_PATH}/${result.finalScenarioId}`);
  if (scenario.groupId !== group.id) throw new Error(`the scenario belongs to group ${scenario.groupId} instead of ${group.id}`);
  if (String(scenario.fromDate).slice(0, 10) !== D.PERIOD.from || String(scenario.untilDate).slice(0, 10) !== D.PERIOD.until) throw new Error(`the scenario spans ${scenario.fromDate}..${scenario.untilDate}`);
  const preview = await readSchedule(api, group, result.finalScenarioToken);
  const accepted = await api.call(HTTP_POST, `${SCENARIOS_PATH}/${result.finalScenarioId}/Accept`);
  return { result, preview, accepted, elapsedSeconds: Math.round((Date.now() - started) / 1000) };
}

async function bookOnCall(api, site, group, memberIds, onCallId) {
  const data = await readSchedule(api, group, null);
  const assignments = P.pickOnCallRoster(data, site, memberIds);
  await bookBreaks(api, assignments.map(({ clientId, day }) => ({ clientId, absenceId: onCallId, currentDate: day, workTime: 0, startTime: FULL_DAY_START, endTime: FULL_DAY_END })));
  return assignments.length;
}

/**
 * Stage r2 leaves one duty of the absent employee without a legal cover, with real data only: the reception duty gets a mandatory qualification the whole team holds (without it the recovery borrows a
 * stranger from another group under the same root), the four people who are free on that day get a FREE command, and the on-call day of that day is dropped (FREE and on call contradict each other).
 * The plan stays as it is. Works on the planned December and on a copy of it; repeating it changes nothing.
 */
async function applyOpenSlot(api, site, group, memberIds) {
  const { day, order, qualification: name, qualificationLevel, requiredLevel, freeWishes } = site.openSlot;
  const qualification = ((await api.call(HTTP_GET, QUALIFICATION_LIST_PATH)) ?? []).find((entry) => !entry.isDeleted && (entry.name?.de ?? entry.name) === name);
  if (!qualification) throw new Error(`the qualification ${name} is missing in the catalog`);
  const shift = (await shiftsWithAbbreviation(api, order, false)).find((row) => row.status === SHIFT_STATUS_ORIGINAL_SHIFT);
  if (!shift) throw new Error(`the plannable shift ${order} is missing`);
  const required = (await api.call(HTTP_GET, `${REQUIRED_QUALIFICATIONS_PATH}/${shift.id}`)) ?? [];
  if (!required.some((row) => row.qualificationId === qualification.id)) {
    await api.call(HTTP_POST, REQUIRED_QUALIFICATIONS_PATH, { data: { shiftId: shift.id, qualificationId: qualification.id, isMandatory: true, minLevel: requiredLevel } });
  }
  for (const clientId of Object.values(memberIds)) {
    const client = await api.call(HTTP_GET, `${CLIENTS_PATH}/${clientId}`);
    if ((client.qualifications ?? []).some((row) => row.qualificationId === qualification.id)) continue;
    const held = { clientId, qualificationId: qualification.id, level: qualificationLevel, validFrom: null, validUntil: null, note: null };
    await api.call(HTTP_PUT, CLIENTS_PATH, { data: { ...client, qualifications: [...(client.qualifications ?? []), held], skipAddressValidation: true } });
  }
  const data = await readSchedule(api, group, null);
  const isOnDay = (entry, clientId) => entry.clientId === clientId && String(entry.entryDate).slice(0, D.PERIOD.from.length) === day;
  const wishes = freeWishes.map((key) => memberIds[key]);
  for (const clientId of wishes) {
    if (data.entries.some((entry) => isOnDay(entry, clientId) && entry.entryType === P.ENTRY_TYPE_COMMAND)) continue;
    await api.call(HTTP_POST, SCHEDULE_COMMANDS_PATH, { data: { clientId, currentDate: day, commandKeyword: D.COMMAND_FREE } });
  }
  const onCall = data.entries.filter((entry) => entry.entryType === P.ENTRY_TYPE_BREAK && wishes.some((clientId) => isOnDay(entry, clientId)));
  for (const entry of onCall) await api.call(HTTP_DELETE, `${BREAKS_PATH}/${entry.id}`);
  return { day, order, qualification: name, shiftId: shift.id, freeWishes, onCallDropped: onCall.length };
}

async function holidayFacts(api, group) {
  const stored = await api.call(HTTP_GET, `${GROUPS_PATH}/${group.id}`);
  return { calendarSelectionId: stored.calendarSelectionId, paymentInterval: stored.paymentInterval };
}

async function verifyStage(api, site, stage, group, memberIds) {
  const problems = [];
  const members = await loadGroupEmployees(api, group.id);
  const expected = new Set(Object.values(memberIds));
  if (members.length !== site.team.length || members.some((member) => !expected.has(member.id))) problems.push(`the group holds ${members.length} members instead of the team of ${site.team.length}`);
  const rows = (await api.call(HTTP_POST, SHIFT_SCHEDULE_PATH, {
    data: { startDate: D.PERIOD.from, endDate: D.PERIOD.until, selectedGroup: group.id, holidayDates: [...D.HOLIDAYS], startRow: 0, rowCount: SHIFT_ROW_LIMIT },
  }))?.shifts ?? [];
  const listed = [...new Set(rows.map((row) => row.abbreviation))].sort();
  const plannable = [...D.plannableAbbreviations()].sort();
  if (listed.join() !== plannable.join()) problems.push(`the shift list shows ${listed.join(",")} instead of ${plannable.join(",")}`);
  const tree = flattenNodes((await api.call(HTTP_GET, GROUPS_TREE_PATH))?.nodes).filter((node) => String(node.name).includes(D.FOREIGN_NAME_FRAGMENT));
  if (tree.length > 0) problems.push(`groups still named ${D.FOREIGN_NAME_FRAGMENT}: ${tree.map((node) => node.name).join(", ")}`);
  const data = await readSchedule(api, group, null);
  return { problems, listedShifts: listed, shiftRows: rows.length, clientsInSchedule: data.clients.length, stage };
}

async function main() {
  const options = readOptions();
  const { session, site, stage, stageName } = options;
  if (!session.apiUrl.includes(D.RECORDING_API_PORT)) throw new Error(`refusing ${session.apiUrl}: seed only the recording API (${D.RECORDING_API_PORT}) on a klacks_marketing_* copy`);
  D.assertPlan();
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await S.apiLogin(context, session);
    await assertDemoUser(token);
    const api = new KlacksApi(context, session.apiUrl, token);
    const report = { site: site.key, stage: stageName };

    report.cleared = await clearStage(api);
    log(`cleared ${report.cleared.groups.length} groups, ${report.cleared.branches.length} branches`);
    const group = await ensureGroup(api, site);
    report.group = { ...group, ...(await holidayFacts(api, group)) };
    log(`group ${group.name} ${group.action} ${group.id}`);
    const schedulingRuleId = await findSchedulingRuleId(api);
    report.holidayExemption = await ensureHolidayExemption(api, schedulingRuleId);
    const contractIds = await ensureContracts(api, schedulingRuleId);
    const memberIds = {};
    for (const member of site.team) memberIds[member.key] = (await ensureMember(api, member, contractIds, group)).id;
    log(`team of ${site.team.length} ready`);
    report.orders = [];
    for (const order of D.ORDERS) report.orders.push(await ensureOrder(api, order, group));
    log(`orders ${report.orders.map((order) => `${order.order}:${order.action}`).join(" ")}`);

    const vacationId = await absenceId(api, ABSENCE_VACATION);
    if (stage.wishes) report.wishes = await placeWishes(api, site, memberIds, vacationId);
    if (stage.vacations) report.vacations = await bookVacations(api, site, group, memberIds, vacationId);
    if (stage.commands) report.commands = await setCommands(api, site, group, memberIds);
    report.capacity = D.capacityOf(site);

    const alreadyPlanned = stage.openSlot && worksIn(await readSchedule(api, group, null), D.PERIOD.from, D.PERIOD.until).length > 0;
    if (stage.planned && !alreadyPlanned) {
      const plan = await planAndAccept(api, group);
      report.plan = P.describeRun(plan, site, memberIds);
      report.onCallDays = await bookOnCall(api, site, group, memberIds, await absenceId(api, ABSENCE_ON_CALL));
    }
    if (stage.openSlot) report.openSlot = await applyOpenSlot(api, site, group, memberIds);
    if (options.selfCheck) {
      const plan = await planAndAccept(api, group);
      report.selfCheck = P.describeRun(plan, site, memberIds);
    }
    if (stage.planned || options.selfCheck) {
      const real = await readSchedule(api, group, null);
      const hours = await api.call(HTTP_POST, PERIOD_HOURS_PATH, { data: { clientIds: Object.values(memberIds), startDate: D.PERIOD.from, endDate: D.PERIOD.until } });
      report.evaluation = P.evaluatePlan(real, site, memberIds, hours);
    }
    report.verify = await verifyStage(api, site, stageName, group, memberIds);
    if (options.reportPath) writeFileSync(options.reportPath, JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, null, 1));
    if (report.verify.problems.length > 0) throw new Error(`Self-check failed: ${report.verify.problems.join("; ")}`);
    log(`ok: ${site.group.name}, stage ${stageName}`);
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
