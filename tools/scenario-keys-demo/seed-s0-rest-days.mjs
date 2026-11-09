// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Seed correction of the stage of clip S0 v2 (master klacks_marketing_security_bern_s4 = bern_s1 migrated by 1.0.63): the real December must show an empty error list, but three
 * employees have only one rest day in one week (rule SCHEDULING_MIN_REST_DAYS = 2). For every week of every employee with fewer than the minimum of rest days one work of that week
 * is handed to a colleague of the group (ReassignClient on the real work, as a planner would do it in the schedule), so nobody is understaffed. A receiver qualifies only if, after
 * the move, every rule this script can measure holds for both: rest days per week (Monday to Sunday) at least the minimum, at most MaxConsecutiveDays days in a row, at least the
 * minimum rest between two works, at most the weekly maximum of hours; the receiver already works the same shift abbreviation in December (so group, qualification and contract
 * fit). The story of the clip stays untouched: the nights of the source and the free days of both candidates on those nights are never used.
 * Without --apply it only prints the moves. The script is run against the recording API (port 5011) on a klacks_marketing_* database only.
 * CLI: --out <folder> --group-id <uuid> [--apply]   Env: KLACKS_SEED_APPLY=1 (same as --apply), KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL (https://localhost:5011).
 * @param apply - perform the reassignments (otherwise dry run)
 */

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { request as playwrightRequest } from "playwright-core";
import * as S from "../lib/klacks-demo-session.mjs";
import { ScheduleApi, dateKey, worksIn } from "../lib/schedule-grid.mjs";
import { reassignWork } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_FILE = path.join(HERE, "..", "capture-app-videos.scripts.json");
const MS_PER_HOUR = 3600 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const DAYS_PER_WEEK = 7;
const WORK_ENTRY_TYPE = 0;
const ROW_LIMIT = 500;
const RULES = Object.freeze({ minRestDays: 2, maxConsecutiveDays: 6, minRestHours: 11, maxWeeklyHours: 50 });
const DAY_BEFORE_MONTH = "2026-11-30";
const DAY_AFTER_MONTH = "2027-01-03";

const addDays = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
const mondayOf = (iso) => addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % DAYS_PER_WEEK));

function interval(work) {
  const day = dateKey(work.entryDate);
  const start = Date.parse(`${day}T${work.startTime}Z`);
  let end = Date.parse(`${day}T${work.endTime}Z`);
  if (end <= start) end += MS_PER_DAY;
  return { id: work.id, day, start, end, hours: (end - start) / MS_PER_HOUR, abbreviation: work.abbreviation };
}

/** Problems of one employee's work list inside December (weeks fully inside December only, as the error list counts them). */
function problemsOf(list) {
  const problems = [];
  const days = new Set(list.map((entry) => entry.day));
  for (let monday = mondayOf(D.PERIOD.from); monday <= D.PERIOD.until; monday = addDays(monday, DAYS_PER_WEEK)) {
    if (monday < D.PERIOD.from || addDays(monday, DAYS_PER_WEEK - 1) > D.PERIOD.until) continue;
    const week = Array.from({ length: DAYS_PER_WEEK }, (_, i) => addDays(monday, i));
    const rest = week.filter((day) => !days.has(day)).length;
    if (rest < RULES.minRestDays) problems.push(`restDays ${monday}: ${rest}`);
    const hours = list.filter((entry) => week.includes(entry.day)).reduce((sum, entry) => sum + entry.hours, 0);
    if (hours > RULES.maxWeeklyHours) problems.push(`weeklyHours ${monday}: ${hours}`);
  }
  const sorted = [...days].sort();
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > RULES.maxConsecutiveDays) problems.push(`consecutive ${sorted[i]}: ${run}`);
  }
  const byStart = [...list].sort((a, b) => a.start - b.start);
  for (let i = 1; i < byStart.length; i++) {
    const gap = (byStart[i].start - byStart[i - 1].end) / MS_PER_HOUR;
    if (gap < RULES.minRestHours) problems.push(`rest ${byStart[i].day}: ${gap.toFixed(1)}`);
  }
  return problems;
}

async function main() {
  const { values } = parseArgs({ options: { out: { type: "string" }, "group-id": { type: "string" }, apply: { type: "boolean" }, "api-url": { type: "string" } } });
  if (!values.out || !values["group-id"]) throw new Error("--out and --group-id are required");
  const options = { ...S.readSessionOptions(values), groupId: values["group-id"] };
  if (!options.apiUrl.includes(D.RECORDING_API_PORT)) throw new Error(`refusing ${options.apiUrl}: seed only the recording API`);
  const script = JSON.parse(readFileSync(SCRIPTS_FILE, "utf8"))["scenario-variants"].de;
  mkdirSync(values.out, { recursive: true });
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const apply = Boolean(values.apply) || process.env.KLACKS_SEED_APPLY === "1";
  const report = { apply, rules: RULES, moves: [], unresolved: [] };
  try {
    const api = new ScheduleApi(context, options, await S.apiLogin(context, options));
    const filter = {
      startDate: DAY_BEFORE_MONTH, endDate: DAY_AFTER_MONTH, periodStartDate: D.PERIOD.from, periodEndDate: D.PERIOD.until, selectedGroup: options.groupId, orderBy: "name", sortOrder: "asc",
      showEmployees: true, showExtern: true, showStandIns: true, startRow: 0, rowCount: ROW_LIMIT, paymentInterval: 0, searchString: "", analyseToken: null,
    };
    const data = await api.schedule(filter);
    const clients = data.clients;
    const firstName = new Map(clients.map((client) => [client.id, client.firstName]));
    const protectedIds = new Set(clients.filter((client) => [script.source, script.variantA.firstName, script.variantB.firstName].includes(client.firstName)).map((client) => client.id));
    const storyNights = new Set(script.nights);
    const works = worksIn(data, DAY_BEFORE_MONTH, DAY_AFTER_MONTH).filter((work) => (work.entryType ?? WORK_ENTRY_TYPE) === WORK_ENTRY_TYPE);
    const lists = new Map(clients.map((client) => [client.id, []]));
    for (const work of works) lists.get(work.clientId)?.push({ ...interval(work), clientId: work.clientId });
    report.before = Object.fromEntries([...lists].map(([id, list]) => [firstName.get(id), problemsOf(list)]).filter(([, problems]) => problems.length > 0));
    const abbreviationsOf = (id) => new Set(lists.get(id).filter((entry) => entry.day >= D.PERIOD.from && entry.day <= D.PERIOD.until).map((entry) => entry.abbreviation));
    for (const [giverId, givers] of lists) {
      for (const problem of problemsOf(givers).filter((entry) => entry.startsWith("restDays"))) {
        const monday = problem.split(" ")[1].replace(":", "");
        const week = Array.from({ length: DAYS_PER_WEEK }, (_, i) => addDays(monday, i));
        let moved = null;
        const candidatesWork = lists.get(giverId).filter((entry) => week.includes(entry.day) && !(protectedIds.has(giverId) && storyNights.has(entry.day)));
        for (const work of candidatesWork) {
          for (const [receiverId, receivers] of lists) {
            if (receiverId === giverId) continue;
            if (protectedIds.has(receiverId) && [...storyNights].some((night) => Math.abs(Date.parse(`${night}T00:00:00Z`) - Date.parse(`${work.day}T00:00:00Z`)) <= MS_PER_DAY)) continue;
            if (!abbreviationsOf(receiverId).has(work.abbreviation)) continue;
            if (receivers.some((entry) => entry.day === work.day)) continue;
            const giverAfter = lists.get(giverId).filter((entry) => entry.id !== work.id);
            const receiverAfter = [...receivers, { ...work, clientId: receiverId }];
            if (problemsOf(giverAfter).some((entry) => entry.startsWith("restDays") && entry.includes(monday))) continue;
            const before = new Set(problemsOf(receivers));
            if (problemsOf(receiverAfter).some((entry) => !before.has(entry))) continue;
            if (problemsOf(receiverAfter).length > 0) continue;
            moved = { workId: work.id, day: work.day, shift: work.abbreviation, from: firstName.get(giverId), to: firstName.get(receiverId) };
            lists.set(giverId, giverAfter);
            lists.set(receiverId, receiverAfter);
            break;
          }
          if (moved) break;
        }
        if (moved) report.moves.push(moved);
        else report.unresolved.push(`${firstName.get(giverId)} ${problem}`);
      }
    }
    report.after = Object.fromEntries([...lists].map(([id, list]) => [firstName.get(id), problemsOf(list)]).filter(([, problems]) => problems.length > 0));
    if (apply) for (const move of report.moves) await reassignWork(api, move.workId, clients.find((client) => client.firstName === move.to).id);
  } finally {
    await context.dispose();
    writeFileSync(path.join(values.out, "seed-report.json"), JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, null, 1));
  }
  if (report.unresolved.length > 0) process.exit(2);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
