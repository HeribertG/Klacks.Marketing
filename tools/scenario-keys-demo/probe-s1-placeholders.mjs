// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Dimensioning probe of clip S1 v2 "Grossanlass mit Keys und Platzhaltern" on a THROW-AWAY copy of klacks_marketing_security_bern_s3 behind the recording API (port 5011 only).
 * It does through the REST API what the take does in the picture: creates the key, its sealed orders (the definition of S1_KEY below, shared with the take), optionally the
 * placeholders, a scenario carrying the key, and starts the AutoWizard with the request the app sends (period December, agents = rows of the scenario, shifts = the fair clones).
 * The report counts the filled fair slots per person kind (real person / placeholder), so run 1 (--stand-ins 0) measures what real people can cover and run 2 (--stand-ins 8)
 * proves that real people plus placeholders cover the whole demand and placeholders take only the rest. The database is changed: never run it on the master.
 * CLI: --stand-ins <n> (default 8) [--suffix <text>: appended to the key name, so a second probe can run on the same copy] [--report <file>]   Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL (default https://localhost:5011).
 * @param stand-ins - number of placeholders created before the wizard run (0 = real people only)
 */

import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { request as playwrightRequest } from "playwright-core";
import * as S from "../lib/klacks-demo-session.mjs";
import { ScheduleApi, worksIn, dateKey } from "../lib/schedule-grid.mjs";
import * as D from "../lib/security-demo.mjs";
import { S1_KEY, S1_STAND_INS, keyShiftBody } from "./s1-placeholder-stage.mjs";

const SCENARIOS_API = "/api/backend/AnalyseScenarios";
const VARIANTS_API = "/api/backend/ScenarioVariants";
const STAND_INS_API = "/api/backend/Clients/StandIns";
const SHIFTS_API = "/api/backend/Shifts";
const SHIFT_SCHEDULE_API = "/api/backend/Shifts/Schedule";
const AUTO_WIZARD_START_API = "/api/backend/AutoWizard/Start";
const AUTO_WIZARD_STATUS_API = "/api/backend/AutoWizard/Status";
const GROUPS_TREE_API = "/api/backend/Groups/tree";
const CLIENT_FIND_API = "/api/backend/Clients/FindClient";
const JOB_RUNNING = "running";
const POLL_MS = 5000;
const JOB_TIMEOUT_MS = 20 * 60 * 1000;
const ROW_LIMIT = 500;
const SHIFT_ROW_LIMIT = 5000;
const ENTITY_TYPE_STAND_IN = 3;
const HTTP_POST = "POST";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function flatten(nodes, found = []) {
  for (const node of nodes ?? []) {
    found.push(node);
    flatten(node.children, found);
  }
  return found;
}

function scheduleFilter(groupId, token) {
  return {
    startDate: D.PERIOD.from, endDate: D.PERIOD.until, periodStartDate: D.PERIOD.from, periodEndDate: D.PERIOD.until, selectedGroup: groupId,
    orderBy: "name", sortOrder: "asc", showEmployees: true, showExtern: true, showStandIns: true, startRow: 0, rowCount: ROW_LIMIT, paymentInterval: 0, searchString: "", analyseToken: token,
  };
}

async function main() {
  const { values } = parseArgs({ options: { "stand-ins": { type: "string" }, report: { type: "string" }, suffix: { type: "string" }, "api-url": { type: "string" } } });
  const session = S.readSessionOptions(values);
  if (!session.apiUrl.includes(D.RECORDING_API_PORT)) throw new Error(`refusing ${session.apiUrl}: probe only the recording API`);
  const standInCount = Number(values["stand-ins"] ?? S1_STAND_INS.count);
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const report = { standInCount, key: S1_KEY };
  try {
    const token = await S.apiLogin(context, session);
    const api = new ScheduleApi(context, session, token);
    const group = flatten((await api.json(GROUPS_TREE_API))?.nodes).find((node) => node.name === D.SITES.bern.group.name);
    if (!group) throw new Error("group missing");
    const customer = ((await api.json(`${CLIENT_FIND_API}/${encodeURIComponent(S1_KEY.customer)}/${encodeURIComponent(S1_KEY.customer)}/%20`)) ?? []).find((client) => client.company === S1_KEY.customer && !client.isDeleted);
    if (!customer) throw new Error(`customer ${S1_KEY.customer} missing`);
    const variant = await api.json(VARIANTS_API, { method: HTTP_POST, data: { name: `${S1_KEY.name}${values.suffix ?? ""}`, description: S1_KEY.description, groupId: group.id, fromDate: S1_KEY.from, untilDate: S1_KEY.until } });
    for (const shift of S1_KEY.shifts) await api.json(SHIFTS_API, { method: HTTP_POST, data: keyShiftBody(shift, variant, group, customer.id) });
    if (standInCount > 0) {
      const created = await api.json(STAND_INS_API, { method: HTTP_POST, data: { count: standInCount, namePattern: S1_STAND_INS.pattern, groupId: group.id, validFrom: D.PERIOD.from, validUntil: D.PERIOD.until, qualificationIds: [] } });
      report.standIns = (created ?? []).map((entry) => entry.name ?? entry.displayName ?? entry.id);
    }
    const scenario = await api.json(SCENARIOS_API, { method: HTTP_POST, data: { name: S1_KEY.scenario, groupId: group.id, fromDate: D.PERIOD.from, untilDate: D.PERIOD.until, variantIds: [variant.id] } });
    const shiftRows = (await api.json(SHIFT_SCHEDULE_API, { method: HTTP_POST, data: { startDate: D.PERIOD.from, endDate: D.PERIOD.until, selectedGroup: group.id, holidayDates: [...D.HOLIDAYS], searchString: S1_KEY.search, startRow: 0, rowCount: SHIFT_ROW_LIMIT, analyseToken: scenario.token } }))?.shifts ?? [];
    const abbreviations = S1_KEY.shifts.map((shift) => shift.abbreviation);
    const fairIds = [...new Set(shiftRows.filter((row) => abbreviations.includes(row.abbreviation)).map((row) => row.shiftId))];
    report.searchRows = shiftRows.length;
    report.fairShiftIds = fairIds.length;
    const rows = await api.schedule(scheduleFilter(group.id, scenario.token));
    const agents = rows.clients.map((client) => client.id);
    report.agents = agents.length;
    report.standInRows = rows.clients.filter((client) => client.type === ENTITY_TYPE_STAND_IN).length;
    const started = Date.now();
    const { jobId } = await api.json(AUTO_WIZARD_START_API, { method: HTTP_POST, data: { periodFrom: D.PERIOD.from, periodUntil: D.PERIOD.until, agentIds: agents, shiftIds: fairIds, groupId: group.id, analyseToken: scenario.token, language: "de", agentOrderIsUserDefined: false, softKeywordRetry: true } });
    let job = null;
    while (Date.now() - started < JOB_TIMEOUT_MS) {
      job = await api.json(`${AUTO_WIZARD_STATUS_API}/${jobId}`);
      if (job && job.status !== JOB_RUNNING) break;
      await sleep(POLL_MS);
    }
    report.wizardSeconds = Math.round((Date.now() - started) / 1000);
    report.job = { status: job?.status, reason: job?.reason ?? null, summary: job?.result?.summary ?? null, finalScenarioId: job?.result?.finalScenarioId ?? null };
    const finalId = job?.result?.finalScenarioId;
    if (!finalId) throw new Error(`no final scenario: ${JSON.stringify(report.job)}`);
    const final = await api.json(`${SCENARIOS_API}/${finalId}`);
    report.final = { name: final.name, status: final.status, variantIds: final.variantIds };
    report.summary = await api.json(`${SCENARIOS_API}/${finalId}/Summary`);
    const data = await api.schedule(scheduleFilter(group.id, final.token));
    const kindOf = new Map(data.clients.map((client) => [client.id, client.type === ENTITY_TYPE_STAND_IN ? "standIn" : "real"]));
    const nameOf = new Map(data.clients.map((client) => [client.id, `${client.firstName ?? ""} ${client.name ?? ""}`.trim()]));
    const fair = worksIn(data, S1_KEY.from, S1_KEY.until).filter((work) => abbreviations.includes(work.abbreviation));
    const perDay = {};
    for (const work of fair) {
      const day = dateKey(work.entryDate);
      perDay[day] ??= { real: 0, standIn: 0 };
      perDay[day][kindOf.get(work.clientId) ?? "real"] += 1;
    }
    const perPerson = {};
    for (const work of fair) perPerson[nameOf.get(work.clientId) ?? work.clientId] = (perPerson[nameOf.get(work.clientId) ?? work.clientId] ?? 0) + 1;
    const demand = S1_KEY.shifts.reduce((sum, shift) => sum + shift.staffing, 0);
    report.fair = { demandPerDay: demand, demandTotal: demand * 4, filled: fair.length, real: fair.filter((w) => kindOf.get(w.clientId) === "real").length, standIn: fair.filter((w) => kindOf.get(w.clientId) === "standIn").length, perDay, perPerson };
    const realNonFair = worksIn(data, D.PERIOD.from, D.PERIOD.until).filter((work) => !abbreviations.includes(work.abbreviation));
    const baseline = worksIn(await api.schedule(scheduleFilter(group.id, null)), D.PERIOD.from, D.PERIOD.until);
    report.nonFairWorks = { scenario: realNonFair.length, real: baseline.length };
  } finally {
    await context.dispose();
    if (values.report) writeFileSync(values.report, JSON.stringify(report, null, 1));
    console.log(JSON.stringify({ ...report, summary: report.summary ? { variants: report.summary.variants } : null }, null, 1));
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
