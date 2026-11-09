// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Rule probe of clip S0 v2 "Zwei Varianten, ein Ja" on a THROW-AWAY copy of klacks_marketing_security_bern_s1 behind the recording API (port 5011 only).
 * It answers, before any take, whether the story holds on the stage data: the real December, variant A (the nights of the source go to candidate A) and variant B (the same nights
 * to candidate B) are measured twice - (1) from the works of the API: the longest run of consecutive work days per employee, every rest gap below the minimum between two works
 * of one employee, the hours of the period per employee; (2) in the browser: the rows of the error list of the schedule (all filters on, info rows counted separately) for the
 * original and for each variant selected in the scenario selector. The variants are created and changed through the API exactly as the take does it (scenario copy, reassign).
 * Nothing is accepted. The database is changed (two scenarios): never run it on the master.
 * CLI: --out <folder> (screenshots and probe-report.json, must not exist) --group-id <uuid> [--min-rest-hours <h> (default 11)] [--headed]   Env: KLACKS_DEMO_USER,
 * KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL and KLACKS_UI_URL (both https://localhost:5011).
 * @param out - folder for screenshots and the report
 * @param group-id - id of "Bern Objektschutz" in the copy
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import * as S from "../lib/klacks-demo-session.mjs";
import { ScheduleApi, SCHEDULE_ROUTE_PART, HTTP_POST, dateKey, worksIn } from "../lib/schedule-grid.mjs";
import { createScenario, periodHours, reassignWork, realFilter, scenarioCopyOf, scenarioFilter } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_FILE = path.join(HERE, "..", "capture-app-videos.scripts.json");
const VIDEO = "scenario-variants";
const CULTURE = "de";
const VIEWPORT = Object.freeze({ width: 1280, height: 720 });
const DECEMBER = Object.freeze({ year: 2026, month: 12, isoWeek: 50 });
const SEL_SELECTOR_BTN = "#scenario-selector-btn";
const selectorItem = (id) => `[data-scenario-id="${id}"]`;
const SEL_BANNER = "#scenario-banner";
const SEL_SHIFT_TABS = "#shift-tabs .nav-link";
const SEL_ERROR_ROWS = "app-schedule-error-list tr.table-row";
const SEL_INFO_FILTER = "#info-filter-btn";
const SEL_GRID_CANVAS = "canvas[id^='template-canvas']";
const ERROR_TAB_INDEX = 1;
const CLASS_ACTIVE = "active";
const VALIDATION_SETTLE_MS = 5000;
const MS_PER_HOUR = 3600 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const DEFAULT_MIN_REST_HOURS = 11;
const WORK_ENTRY_TYPE = 0;

const fullName = (client) => `${client.firstName} ${client.name}`;
const clientNamed = (clients, firstName) => {
  const client = clients.find((entry) => entry.firstName === firstName);
  if (!client) throw new Error(`${firstName} is not in the schedule`);
  return client;
};

function interval(work) {
  const day = dateKey(work.entryDate);
  const start = Date.parse(`${day}T${work.startTime}Z`);
  let end = Date.parse(`${day}T${work.endTime}Z`);
  if (end <= start) end += MS_PER_DAY;
  return { day, start, end, abbreviation: work.abbreviation };
}

/** Longest run of consecutive days with a work, rest gaps below the minimum, per employee. */
function measureRules(data, minRestHours) {
  const works = worksIn(data, D.PERIOD.from, D.PERIOD.until).filter((work) => (work.entryType ?? WORK_ENTRY_TYPE) === WORK_ENTRY_TYPE);
  const nameOf = new Map(data.clients.map((client) => [client.id, fullName(client)]));
  const byClient = new Map();
  for (const work of works) (byClient.get(work.clientId) ?? byClient.set(work.clientId, []).get(work.clientId)).push(interval(work));
  const result = {};
  for (const [clientId, list] of byClient) {
    list.sort((a, b) => a.start - b.start);
    const days = [...new Set(list.map((entry) => entry.day))].sort();
    let best = { length: 0, from: null, until: null };
    let runStart = 0;
    for (let i = 1; i <= days.length; i++) {
      const broken = i === days.length || Date.parse(`${days[i]}T00:00:00Z`) - Date.parse(`${days[i - 1]}T00:00:00Z`) !== MS_PER_DAY;
      if (broken) {
        const length = i - runStart;
        if (length > best.length) best = { length, from: days[runStart], until: days[i - 1] };
        runStart = i;
      }
    }
    const shortRests = [];
    for (let i = 1; i < list.length; i++) {
      const gap = (list[i].start - list[i - 1].end) / MS_PER_HOUR;
      if (gap < minRestHours) shortRests.push(`${list[i - 1].day} ${list[i - 1].abbreviation} -> ${list[i].day} ${list[i].abbreviation}: ${gap.toFixed(1)} h`);
    }
    result[nameOf.get(clientId) ?? clientId] = { workDays: days.length, longestRun: best, shortRests };
  }
  return result;
}

const summarize = (rules, maxRun) => ({
  longestRunOverall: Math.max(0, ...Object.values(rules).map((entry) => entry.longestRun.length)),
  runsOverMax: Object.entries(rules).filter(([, entry]) => entry.longestRun.length > maxRun).map(([name, entry]) => `${name}: ${entry.longestRun.length} (${entry.longestRun.from}..${entry.longestRun.until})`),
  shortRests: Object.entries(rules).flatMap(([name, entry]) => entry.shortRests.map((rest) => `${name}: ${rest}`)),
});

async function errorRows(page) {
  await page.locator(SEL_SHIFT_TABS).nth(ERROR_TAB_INDEX).click();
  const info = page.locator(SEL_INFO_FILTER);
  await info.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (!(((await info.getAttribute("class")) ?? "").split(/\s+/).includes(CLASS_ACTIVE))) await info.click();
  await page.waitForTimeout(VALIDATION_SETTLE_MS);
  const all = await page.locator(SEL_ERROR_ROWS).evaluateAll((elements) => elements.map((element) => element.innerText.replace(/\s+/g, " ").trim()));
  await info.click();
  await page.waitForTimeout(VALIDATION_SETTLE_MS / 5);
  const withoutInfo = await page.locator(SEL_ERROR_ROWS).evaluateAll((elements) => elements.map((element) => element.innerText.replace(/\s+/g, " ").trim()));
  await info.click();
  return { all, withoutInfo };
}

async function shot(page, out, name, report) {
  const file = path.join(out, `${String((report.shots ??= []).length + 1).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file });
  report.shots.push(file);
}

async function selectScenario(page, scenario) {
  await page.locator(SEL_SELECTOR_BTN).click();
  await page.locator(selectorItem(scenario.id)).click();
  await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: S.NAV_TIMEOUT_MS });
  await page.waitForResponse((response) => response.request().method() === HTTP_POST && response.url().includes(SCHEDULE_ROUTE_PART), { timeout: S.NAV_TIMEOUT_MS }).catch(() => null);
}

async function main() {
  const { values } = parseArgs({ options: { out: { type: "string" }, "group-id": { type: "string" }, "min-rest-hours": { type: "string" }, headed: { type: "boolean" }, "api-url": { type: "string" }, "base-url": { type: "string" } } });
  if (!values.out || !values["group-id"]) throw new Error("--out and --group-id are required");
  if (existsSync(values.out)) throw new Error(`${values.out} exists already`);
  const options = { ...S.readSessionOptions(values), groupId: values["group-id"] };
  if (!options.apiUrl.includes(D.RECORDING_API_PORT)) throw new Error(`refusing ${options.apiUrl}: probe only the recording API`);
  const minRest = Number(values["min-rest-hours"] ?? DEFAULT_MIN_REST_HOURS);
  const script = JSON.parse(readFileSync(SCRIPTS_FILE, "utf8"))[VIDEO][CULTURE];
  mkdirSync(values.out, { recursive: true });
  const report = { startedAt: new Date().toISOString(), script: { source: script.source, a: script.variantA.firstName, b: script.variantB.firstName, nights: script.nights, shift: script.shift } };
  const browser = await chromium.launch({ headless: !values.headed });
  try {
    const context = await S.newCultureContext(browser, options, CULTURE, { viewport: VIEWPORT, deviceScaleFactor: 1, period: DECEMBER });
    const api = new ScheduleApi(context.request, options, await S.apiLogin(context.request, options));
    const page = await context.newPage();
    await S.login(page, options);
    const loaded = page.waitForResponse((response) => response.request().method() === HTTP_POST && response.url().includes(SCHEDULE_ROUTE_PART), { timeout: S.NAV_TIMEOUT_MS });
    await page.goto(`${options.uiUrl}${S.SCHEDULE_PATH}?groupId=${options.groupId}`, { timeout: S.NAV_TIMEOUT_MS });
    const filter = (await loaded).request().postDataJSON();
    await page.locator(SEL_GRID_CANVAS).first().waitFor({ state: "visible", timeout: S.NAV_TIMEOUT_MS });
    const december = realFilter(filter);
    const real = await api.schedule(december);
    const source = clientNamed(real.clients, script.source);
    const a = clientNamed(real.clients, script.variantA.firstName);
    const b = clientNamed(real.clients, script.variantB.firstName);
    const ids = [source.id, a.id, b.id];
    const nights = script.nights.map((day) => worksIn(real, day, day).filter((work) => work.clientId === source.id && work.abbreviation === script.shift)[0]);
    if (nights.some((night) => !night)) throw new Error(`${script.source} lacks a ${script.shift} on one of ${script.nights.join(", ")}`);
    report.clients = real.clients.length;
    const measure = async (label, data, token) => {
      const rules = measureRules(data, minRest);
      const hours = await periodHours(api, ids, D.PERIOD, token);
      report[label] = { ...summarize(rules, script.maxConsecutiveDays ?? 6), story: Object.fromEntries([source, a, b].map((client) => [client.firstName, { ...rules[fullName(client)], hours: hours?.[client.id] ?? null }])) };
    };
    await measure("original", real, null);
    report.original.errorList = await errorRows(page);
    await shot(page, values.out, "original", report);
    for (const [label, candidate, name] of [["variantA", a, script.variantA.scenarioName], ["variantB", b, script.variantB.scenarioName]]) {
      const scenario = await createScenario(api, { name, groupId: options.groupId, fromDate: D.PERIOD.from, untilDate: D.PERIOD.until });
      const copies = await api.schedule(scenarioFilter(december, scenario.token));
      for (const night of nights) await reassignWork(api, scenarioCopyOf(copies, night, D.PERIOD).id, candidate.id);
      await measure(label, await api.schedule(scenarioFilter(december, scenario.token)), scenario.token);
      await page.reload({ timeout: S.NAV_TIMEOUT_MS });
      await page.locator(SEL_GRID_CANVAS).first().waitFor({ state: "visible", timeout: S.NAV_TIMEOUT_MS });
      await selectScenario(page, scenario);
      report[label].scenario = { id: scenario.id, name: scenario.name };
      report[label].errorList = await errorRows(page);
      await shot(page, values.out, label, report);
    }
  } catch (error) {
    report.error = String(error?.stack ?? error);
  } finally {
    await browser.close();
    writeFileSync(path.join(values.out, "probe-report.json"), JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, null, 1).slice(0, 12000));
  }
  if (report.error) process.exit(1);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
