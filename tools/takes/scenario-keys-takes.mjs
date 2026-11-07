// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip S1 "Grossauftrag mit virtuellen Keys" (series Szenarien, security demo Bern, lib/security-demo.mjs, German only). It needs a throw-away copy of the stage database
 * klacks_marketing_security_bern_s2 (scenario-keys-demo/seed-keys.mjs on a copy of bern_s1: the fictional customer "Messe Nordring AG", 14 temporary staff whose membership in the group covers
 * 10.-13.12. only, key A "Messe Tagbetrieb" MEI/MHA 08-16, MAB 15-23 and key B "Messe Nachtwache" MNA 23-07, both 10.-13.12.) and --group-id of "Bern Objektschutz".
 * Two video ids share this take: scenario-keys (the fallback, nobody is assigned to the fair, the summaries show demand only) and scenario-keys-wizard (the beat planWizard is on). Each id has its own caption track
 * in simple-videos.de.json, so a caption is true in its mode and every cue of a track is shown; the script entry of scenario-keys-wizard only adds its beats to the one of scenario-keys.
 * scenario-keys (1280x720, no chat panel): plan - the real December around the fair, the shift list is searched for "Messe" and stays empty; keys - selector, "Keys verwalten", the list with both keys,
 * the services of "Messe Tagbetrieb" (opening them puts the app into key mode, which is ended inside a cut after the dialog closed), back, close; create - selector, new scenario "Messe mit Nacht" with BOTH keys
 * ticked, the shift list then holds the key clones with their marker; planWizard (wizard id only) - the AutoWizard button of the header, as the app starts it: the shift search limits the shifts it plans to the
 * fair, the wait is a cut, the final child scenario is renamed "Messe mit Nacht" through the API and every other active scenario of the run, the parent included, is rejected through the API; summary - the summary
 * dialog with one section per key; variantB - inside a cut the API creates "Messe nur Tag" with key A only (wizard id: planned by an API start of the AutoWizard with the request the app sends, renamed, the rest rejected),
 * the page is reloaded and "Messe mit Nacht" selected again, then the selector switches to "Messe nur Tag" and its summary is shown; original - "Zum Original" shows the real plan, the shift list holds no fair shift;
 * yes - "Messe nur Tag" is accepted through the banner, the confirmation names its open places; discard - "Messe mit Nacht" is rejected through the banner. The key list is never shown after the accept
 * (a consumed key lists 0 services, a known gap of the app), and "Messe mit Nacht" is never accepted (its stale dialog counts wrongly, a known gap).
 * Safety rules: exactly one accept, only of "Messe nur Tag" and only after its group, its December period, its single key and the unchanged real plan were checked; no override and no "Trotzdem übernehmen"
 * is ever clicked (the accept request must carry no override flag); an accept or reject that does not answer 200 aborts the take, as does any wizard start whose token, group, period or shifts are not the
 * fair of the shown scenario (the job is cancelled first). The API rejects only scenarios this take created or a wizard run of this take produced.
 * Publishable criterion (report.publishable, every part read from the API or the page): before the accept the real December holds no fair work and no fair shift row; the clones of both scenarios carry
 * isVariantShift; the keys need more people per day together than script.captionPeopleFloor (the caption k1 says "über 20"); each summary lists exactly its keys with the demand of their sealed orders over the
 * fair days and no copied service; exactly one accept answered 200, then key A is Accepted and key B Active, the fair shifts of key A are real (rows of the real shift schedule without the variant marker)
 * and key B has none; no real work of December lies outside the group membership (GroupItem ValidFrom/Until, inclusive) of its person; "Messe nur Tag" is Accepted, "Messe mit Nacht" Rejected, no active
 * scenario is left; no error toast; no unexpected HTTP error; no text "Winterthur" or "Uster" at the checkpoints. Changes of the real December besides the fair works are counted in report.decemberChanges
 * (outside 10.-13.12. and on those days) and never fail the take: whether they are allowed is decided after the wizard fix.
 * Seen in the live run of 1.0.60 (2026-11-07): .shift-row-count matches the API at every checkpoint and splitY keeps all clone rows in the picture (the caption covers the names of rows 3-4). The marker triangle
 * is drawn on a canvas; the take checks the flag it is drawn from.
 * @param take - page, api, options, recorder, mouse, report, captions, script, scripts, culture, viewport, scale, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import { CANVAS_SETTLE_MS, HALF, HTTP_POST, dateKey, openSchedule, worksIn } from "../lib/schedule-grid.mjs";
import {
  JOB_STATUS_COMPLETED,
  SCENARIOS_API,
  SCENARIO_STATUS_ACCEPTED,
  SCENARIO_STATUS_ACTIVE,
  activeScenarios,
  getScenario,
  realFilter,
  scenarioFilter,
  stopJob,
  waitForJob,
} from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import { ERROR_TOAST_PATTERN } from "../lib/ui-texts.mjs";
import { checkPage, useRowOrder } from "./replacement-takes.mjs";
import { clickSelector, decideViaBanner, expectBanner, flag, holdWithPoster, trackNetwork } from "./scenario-takes.mjs";
import { checkStage, measure, readToasts, scrollColumns, setRowSlider, trackHttpErrors, watchToasts } from "./security-takes.mjs";
import { selectVariant, settled, waitReload } from "./scenario-variants-takes.mjs";

export const VIDEO_SCENARIO_KEYS = "scenario-keys";
export const VIDEO_SCENARIO_KEYS_WIZARD = "scenario-keys-wizard";
export const SCENARIO_KEYS_VIDEOS = Object.freeze([VIDEO_SCENARIO_KEYS, VIDEO_SCENARIO_KEYS_WIZARD]);
export const SCENARIO_KEYS_CUES = Object.freeze({
  plan: "plan",
  keys: "keys",
  create: "create",
  planWizard: "planWizard",
  summary: "summary",
  variantB: "variantB",
  original: "original",
  yes: "yes",
  discard: "discard",
});
export const SCENARIO_KEYS_CUES_BY_VIDEO = Object.freeze({
  [VIDEO_SCENARIO_KEYS]: Object.freeze(Object.values(SCENARIO_KEYS_CUES).filter((cue) => cue !== SCENARIO_KEYS_CUES.planWizard)),
  [VIDEO_SCENARIO_KEYS_WIZARD]: Object.freeze(Object.values(SCENARIO_KEYS_CUES)),
});
export const SCENARIO_KEYS_FINAL_HOLD_MS = 3500;

const SEL_SELECTOR_BTN = "#scenario-selector-btn";
const SEL_SELECTOR_CREATE = "#scenario-selector-create-item";
const SEL_SELECTOR_KEYS = "#scenario-selector-variants-item";
const SEL_KEYS_TITLE = "#scenario-variants-title";
const keyRow = (id) => `tr.variant-row[data-variant-id="${id}"]`;
const SEL_KEY_SHIFTS_BUTTON = ".variant-edit-shifts-btn, .variant-view-shifts-btn";
const SEL_KEY_SHIFTS_TITLE = "#variant-shifts-title";
const SEL_KEY_SHIFT_ROWS = "#variant-shifts-panel tr.shift-row";
const SEL_KEY_SHIFTS_BACK = "#variant-shifts-back-btn";
const SEL_MODAL_HEADER = `${SEL_MODAL} .modal-header`;
const SEL_MODAL_CLOSE = `${SEL_MODAL_HEADER} .close`;
const SEL_KEY_MODE_BAR = "#variant-mode-bar";
const SEL_KEY_MODE_END = "#variant-mode-bar-end-btn";
const SEL_NAME_INPUT = "#scenario-name-input";
const SEL_KEY_CHOICES = "#scenario-variant-choices";
const keyChoice = (id) => `#scenario-variant-choice-${id}`;
const SEL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_BANNER = "#scenario-banner";
const SEL_BANNER_ACCEPT = "#scenario-banner-accept-btn";
const SEL_BANNER_EXIT = "#scenario-banner-exit-btn";
const SEL_BANNER_SUMMARY = "#scenario-banner-summary-btn";
const SEL_SUMMARY_KEYS = "#scenario-summary-variants";
const SEL_SUMMARY_KEY = "#scenario-summary-variants .summary-variant";
const SEL_SUMMARY_CLOSE = "#scenario-summary-close-btn";
const SEL_CONFIRM = "#modal-delete-confirm";
const SEL_SHIFT_FILTER_TOGGLE = "#dropdownFilter";
const SEL_SHIFT_SEARCH = "#shift-filter-search";
const SEL_SHIFT_ROW_COUNT = ".shift-row-count";
const SEL_WIZARD_BUTTON = "#schedule-wizard-btn";
const SEL_WIZARD_DROPDOWN = ".wizard-dropdown";
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const SEL_ZOOM_POINTER = "#schedule-zoom-slider .ngx-slider-pointer";
const SPLIT_DIRECTION_VERTICAL = "vertical";
const KEY_HOME = "Home";
const KEY_ENTER = "Enter";
const SELECT_ALL = "Control+A";

const VARIANTS_API = "/api/backend/ScenarioVariants";
const VARIANT_SHIFTS_SEGMENT = "Shifts";
const SHIFT_SCHEDULE_API = "/api/backend/Shifts/Schedule";
const AUTO_WIZARD_START_API = "/api/backend/AutoWizard/Start";
const SORT_ORDER_API = "/api/backend/clientsortpreferences";
const SUMMARY_SEGMENT = "Summary";
const RENAME_SEGMENT = "Rename";
const REJECT_SEGMENT = "Reject";
const HTTP_PUT = "PUT";
const HTTP_PATCH = "PATCH";
const SCENARIO_CREATE_PATH = /\/AnalyseScenarios\/?$/i;
const SCENARIO_ACCEPT_PATH = /\/AnalyseScenarios\/[0-9a-f-]{36}\/Accept/i;
const SCENARIO_REJECT_PATH = /\/AnalyseScenarios\/[0-9a-f-]{36}\/Reject/i;
const SHIFT_SCHEDULE_PATH = /\/Shifts\/Schedule\/?$/i;
const AUTO_WIZARD_START_PATH = /\/AutoWizard\/Start/i;
const WATCHED_ERROR_PATH = /\/AnalyseScenarios|\/ScenarioVariants|\/AutoWizard|\/Shifts\/|\/Works\//i;
const OVERRIDE_PARAMS = Object.freeze(["overrideBlock", "overrideStale"]);
const QUERY_TRUE = "true";
const SCENARIO_STATUS_REJECTED = 2;
const SCENARIO_STATUS_SUPERSEDED = 3;
const REPORT_SAMPLE_LIMIT = 5;
const KEY_STATUS_ACTIVE = 0;
const KEY_STATUS_ACCEPTED = 1;
const SHIFT_STATUS_SEALED_ORDER = 1;
const SHIFT_ROW_LIMIT = 5000;
const FAIR_DAY_COUNT_OFFSET = 1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NO_COPIED_SHIFTS = 0;
const SINGLE_ACCEPT = 1;
const SINGLE_UI_REJECT = 1;
const SAVE_TIMEOUT_MS = 30000;
const SEARCH_TIMEOUT_MS = 20000;
const BANNER_TIMEOUT_MS = 60000;
const DECIDE_TIMEOUT_MS = 120000;
const LIST_TIMEOUT_MS = 20000;
const TYPE_DELAY_MS = 45;
const APP_SEARCH_DEBOUNCE_MS = 300;
const SEARCH_DEBOUNCE_MARGIN_MS = 250;
const CUT = Number.POSITIVE_INFINITY;
const MOVE = { short: 350, normal: 650 };
const ROW_COUNT_DIGITS = /\d+/;
const REQUIRED_SCRIPT_FIELDS = Object.freeze(["keyDay", "keyNight", "abbreviations", "fair", "shiftSearch", "scenarioBoth", "scenarioDay", "captionPeopleFloor", "columnsScrolled", "splitY", "beats"]);

const pauseOf = (take, beat) => take.page.waitForTimeout(take.script.beats[beat]);
const REAL_PLAN_KEY = "real";
const tokenKey = (token) => (token ? String(token).toLowerCase() : REAL_PLAN_KEY);
const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
const sortedIds = (ids) => [...(ids ?? [])].map((id) => String(id).toLowerCase()).sort();
const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const semanticKey = (work) => [work.clientId, dateKey(work.entryDate), work.startTime, work.endTime].join("|");
const center = (take) => ({ x: take.viewport.width / HALF, y: take.viewport.height / HALF });
const fairDays = (fair) => Math.round((Date.parse(`${fair.until}T00:00:00Z`) - Date.parse(`${fair.from}T00:00:00Z`)) / MS_PER_DAY) + FAIR_DAY_COUNT_OFFSET;
const allFairAbbreviations = (script) => [...script.abbreviations.day, ...script.abbreviations.night];
const isFairWork = (script, work) => allFairAbbreviations(script).includes(work.abbreviation);
const inFair = (script, day) => day >= script.fair.from && day <= script.fair.until;

/** A take of the wizard id reads the full script of scenario-keys and adds its own beats. */
function scriptOf(take) {
  const base = take.scripts?.[VIDEO_SCENARIO_KEYS]?.[take.culture];
  if (!base) throw new Error(`no ${VIDEO_SCENARIO_KEYS} script for ${take.culture} in capture-app-videos.scripts.json`);
  if (take.report.video === VIDEO_SCENARIO_KEYS) return base;
  return { ...base, beats: { ...base.beats, ...take.script?.beats } };
}

function requireScript(script, video) {
  const missing = REQUIRED_SCRIPT_FIELDS.filter((field) => script[field] === undefined);
  if (missing.length > 0) throw new Error(`the ${video} script lacks ${missing.join(", ")} in capture-app-videos.scripts.json`);
}

function shiftScheduleBody(groupId, token, search) {
  return {
    startDate: D.PERIOD.from,
    endDate: D.PERIOD.until,
    selectedGroup: groupId,
    holidayDates: [...D.HOLIDAYS],
    searchString: search,
    startRow: 0,
    rowCount: SHIFT_ROW_LIMIT,
    analyseToken: token,
  };
}

/** Every row of the shift schedule of one token for the search of the script: what the shift list of the app draws. */
async function searchedShiftRows(take, token) {
  const { api, options, script } = take;
  const result = await api.json(SHIFT_SCHEDULE_API, { method: HTTP_POST, data: shiftScheduleBody(options.groupId, token, script.shiftSearch) });
  return result?.shifts ?? [];
}

/** The fair rows of the shift schedule of one token for the search of the script. */
async function fairShiftRows(take, token) {
  return (await searchedShiftRows(take, token)).filter((row) => allFairAbbreviations(take.script).includes(row.abbreviation));
}

const uniqueShiftIds = (rows) => [...new Set(rows.map((row) => String(row.shiftId).toLowerCase()))];

/** Both keys, read from the API (ids, tokens, staffing); the stage must match the script exactly. */
async function readKeys(take) {
  const { api, options, script, report } = take;
  const listed = (await api.json(`${VARIANTS_API}?groupId=${options.groupId}`)) ?? [];
  const keyOf = async (name, abbreviations) => {
    const matches = listed.filter((variant) => variant.name === name);
    if (matches.length !== 1) throw new Error(`expected one key "${name}", found ${matches.length} - seed the stage with scenario-keys-demo/seed-keys.mjs`);
    const key = matches[0];
    if (key.status !== KEY_STATUS_ACTIVE) throw new Error(`key "${name}" has status ${key.status} instead of active - use a fresh copy of the stage database`);
    if (dateKey(key.fromDate) !== script.fair.from || dateKey(key.untilDate) !== script.fair.until) throw new Error(`key "${name}" spans ${key.fromDate}..${key.untilDate} instead of the fair days`);
    const orders = ((await api.json(`${VARIANTS_API}/${key.id}/${VARIANT_SHIFTS_SEGMENT}`)) ?? []).filter((shift) => shift.status === SHIFT_STATUS_SEALED_ORDER);
    if (!sameList(orders.map((shift) => shift.abbreviation).sort(), [...abbreviations].sort())) throw new Error(`key "${name}" holds the orders ${orders.map((shift) => shift.abbreviation).join(",")} instead of ${abbreviations.join(",")}`);
    const staffingPerDay = orders.reduce((sum, shift) => sum + shift.sumEmployees * shift.quantity, 0);
    return { id: key.id, name: key.name, token: key.token, shiftCount: key.shiftCount, staffingPerDay, orders: orders.map((shift) => ({ abbreviation: shift.abbreviation, start: shift.startShift, end: shift.endShift, staffing: shift.sumEmployees, quantity: shift.quantity })) };
  };
  const day = await keyOf(script.keyDay, script.abbreviations.day);
  const night = await keyOf(script.keyNight, script.abbreviations.night);
  const peoplePerDay = day.staffingPerDay + night.staffingPerDay;
  report.keys = { day, night, peoplePerDay, captionPeopleFloor: script.captionPeopleFloor };
  if (peoplePerDay <= script.captionPeopleFloor) throw new Error(`both keys need ${peoplePerDay} people a day, the caption says more than ${script.captionPeopleFloor}`);
  return { day, night };
}

function membershipOf(data) {
  return new Map(data.clients.map((client) => [client.id, {
    name: `${client.firstName} ${client.name}`,
    from: client.groupItemValidFrom ? dateKey(client.groupItemValidFrom) : null,
    until: client.groupItemValidUntil ? dateKey(client.groupItemValidUntil) : null,
  }]));
}

/** Works of December whose day lies outside the group membership of their person (both ends inclusive; null means open). */
function membershipViolations(data) {
  const membership = membershipOf(data);
  return worksIn(data, D.PERIOD.from, D.PERIOD.until).filter((work) => {
    const range = membership.get(work.clientId);
    const day = dateKey(work.entryDate);
    return !range || (range.from && day < range.from) || (range.until && day > range.until);
  }).map((work) => `${membership.get(work.clientId)?.name ?? work.clientId} ${dateKey(work.entryDate)} ${work.abbreviation}`);
}

/** The pool is the people whose membership is exactly the fair; the wizard id puts their rows on top so the detail at slider 100 shows them. */
async function orderPoolFirst(take, clients) {
  const { api, options, script, report } = take;
  const isPool = (client) => client.groupItemValidFrom && client.groupItemValidUntil
    && dateKey(client.groupItemValidFrom) === script.fair.from && dateKey(client.groupItemValidUntil) === script.fair.until;
  const pool = clients.filter(isPool);
  report.pool = pool.length;
  if (pool.length === 0) throw new Error("no person of the group has a membership of exactly the fair days");
  const ordered = [...pool, ...clients.filter((client) => !isPool(client))];
  await api.json(`${SORT_ORDER_API}/${options.groupId}`, { method: HTTP_PUT, data: ordered.map((client, sortOrder) => ({ clientId: client.id, sortOrder })) });
}

/** Row slider at its overview value, the splitter at the height of the script so the shift list stays in the picture. Runs before the recording or inside a cut. */
async function frameKeys(take, ctx) {
  const { page, mouse, script } = take;
  if (ctx.poolFirst) await useRowOrder(take);
  const pointer = page.locator(SEL_ZOOM_POINTER).first();
  await pointer.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await pointer.focus();
  await page.keyboard.press(KEY_HOME);
  await pointer.evaluate((element) => element.blur());
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const gutters = await page.locator(SEL_SPLIT_GUTTER).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, direction: element.parentElement?.getAttribute("direction") };
  }));
  const gutter = gutters.find((candidate) => candidate.direction === SPLIT_DIRECTION_VERTICAL);
  if (!gutter) throw new Error("the splitter between the grid and the shift area was not found");
  await mouse.drag({ x: gutter.x, y: gutter.y }, { x: gutter.x, y: script.splitY }, MOVE.normal);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await scrollColumns(take, script.columnsScrolled, 1);
}

/**
 * Types the search of the script into the shift filter and submits it with Enter, as a planner does; the dropdown is closed with its toggle (Escape would clear a search field in Chromium and reload the list).
 * Enter waits for the debounce of app-search-input (300 ms in 1.0.60): the shift filter takes the text only from the debounced valueChange and its searchSubmit reloads with the stored filter,
 * so an Enter inside the debounce reloads the list without the search (a gap of the app, reported).
 * @param visible - false inside a cut region (no typing animation)
 */
async function searchShifts(take, { visible }) {
  const { page, mouse, script } = take;
  const loaded = page.waitForResponse((response) => response.request().method() === HTTP_POST && SHIFT_SCHEDULE_PATH.test(new URL(response.url()).pathname)
    && response.request().postDataJSON()?.searchString === script.shiftSearch, { timeout: SEARCH_TIMEOUT_MS });
  loaded.catch(() => {});
  const toggle = page.locator(SEL_SHIFT_FILTER_TOGGLE);
  await toggle.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (visible) await mouse.clickLocator(toggle, MOVE.normal);
  else await toggle.click();
  const field = page.locator(SEL_SHIFT_SEARCH);
  await field.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (visible) {
    await mouse.clickLocator(field, MOVE.short);
    await page.keyboard.press(SELECT_ALL);
    await field.pressSequentially(script.shiftSearch, { delay: TYPE_DELAY_MS });
  } else {
    await field.fill(script.shiftSearch);
  }
  await page.waitForTimeout(APP_SEARCH_DEBOUNCE_MS + SEARCH_DEBOUNCE_MARGIN_MS);
  await page.keyboard.press(KEY_ENTER);
  if (!(await loaded.then(() => true, () => false))) throw new Error(`the shift list was not reloaded with the search "${script.shiftSearch}"`);
  if (visible) await mouse.clickLocator(toggle, MOVE.short);
  else await toggle.click();
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

/** What the shift list shows, next to what the API returns for the same token and search; the row count of the app is reported only (its meaning is not verified). */
async function observeShiftList(take, ctx, label, token) {
  const { page, report } = take;
  const searched = await searchedShiftRows(take, token);
  const rows = searched.filter((row) => allFairAbbreviations(take.script).includes(row.abbreviation));
  const counter = oneLine(await page.locator(SEL_SHIFT_ROW_COUNT).first().innerText().catch(() => ""));
  const appSearch = ctx.lastShiftSearch.get(tokenKey(token));
  const entry = { label, appSearch: appSearch ?? null, apiSearchRows: searched.length, apiSearchShifts: uniqueShiftIds(searched).length, apiShifts: uniqueShiftIds(rows).length, apiRows: rows.length, variantRows: rows.filter((row) => row.isVariantShift).length, shownCount: Number(counter.match(ROW_COUNT_DIGITS)?.[0] ?? NaN) };
  (report.shiftList ??= []).push(entry);
  if (appSearch !== take.script.shiftSearch) flag(report, `${label}: the app loaded the shift list of this plan with the search "${appSearch ?? "none"}" instead of "${take.script.shiftSearch}", the picture does not show what the API check proves`);
  return { rows, entry };
}

/** Inside a cut: the search is typed again when the app lost it for the token (a scenario switch or reload that drops the filter). */
async function keepShiftSearch(take, ctx, token) {
  if (ctx.lastShiftSearch.get(tokenKey(token)) === take.script.shiftSearch) return;
  (take.report.searchRestored ??= []).push(tokenKey(token));
  await searchShifts(take, { visible: false });
}

/** The clones of a scenario must all carry the marker flag, and there must be clones of exactly the fair abbreviations of its keys. */
async function checkClones(take, ctx, label, token, abbreviations) {
  const { report } = take;
  const { rows, entry } = await observeShiftList(take, ctx, label, token);
  const shown = [...new Set(rows.map((row) => row.abbreviation))].sort();
  if (!sameList(shown, [...abbreviations].sort())) flag(report, `${label}: the shift schedule holds ${shown.join(",") || "no fair shift"} instead of ${abbreviations.join(",")}`);
  if (entry.variantRows !== entry.apiRows) flag(report, `${label}: ${entry.apiRows - entry.variantRows} fair rows lack isVariantShift`);
  return rows;
}

function watchDecisions(take, ctx) {
  take.page.on("request", (request) => {
    if (request.method() !== HTTP_POST || !SHIFT_SCHEDULE_PATH.test(new URL(request.url()).pathname)) return;
    const body = request.postDataJSON();
    ctx.lastShiftSearch.set(tokenKey(body?.analyseToken ?? null), body?.searchString ?? null);
  });
  take.page.on("response", (response) => {
    if (response.request().method() !== HTTP_POST || !response.ok()) return;
    const { pathname } = new URL(response.url());
    if (SCENARIO_ACCEPT_PATH.test(pathname)) ctx.okAccepts++;
    if (SCENARIO_REJECT_PATH.test(pathname)) ctx.okUiRejects++;
  });
}

async function openSelectorItem(take, selector) {
  await clickSelector(take, SEL_SELECTOR_BTN, MOVE.normal);
  await pauseOf(take, "menu");
  await clickSelector(take, selector, MOVE.normal);
}

/** Keeps the cursor off buttons and menu items while the picture holds: the variants dialog shows red delete buttons next to every row for an admin. */
async function parkOn(take, selector) {
  const box = await take.page.locator(selector).first().boundingBox();
  await take.mouse.moveTo(box ? { x: box.x + box.width / HALF, y: box.y + box.height / HALF } : center(take), MOVE.short);
}

async function showKeys(take, ctx) {
  const { page, mouse, report } = take;
  await openSelectorItem(take, SEL_SELECTOR_KEYS);
  await waitModalAtRest(page);
  const rows = { day: page.locator(keyRow(ctx.keys.day.id)), night: page.locator(keyRow(ctx.keys.night.id)) };
  await rows.day.waitFor({ state: "visible", timeout: LIST_TIMEOUT_MS });
  await rows.night.waitFor({ state: "visible", timeout: LIST_TIMEOUT_MS });
  report.keyList = { title: oneLine(await page.locator(SEL_KEYS_TITLE).innerText()), day: oneLine(await rows.day.innerText()), night: oneLine(await rows.night.innerText()) };
  for (const [part, key] of [["day", ctx.keys.day], ["night", ctx.keys.night]]) {
    if (!report.keyList[part].includes(key.name) || !report.keyList[part].includes(String(key.shiftCount))) flag(report, `the key list row "${report.keyList[part]}" does not show ${key.name} with ${key.shiftCount} services`);
  }
  await parkOn(take, SEL_KEYS_TITLE);
  await pauseOf(take, "keyList");
  await mouse.clickLocator(rows.day.locator(SEL_KEY_SHIFTS_BUTTON).first(), MOVE.normal);
  const shiftRows = page.locator(SEL_KEY_SHIFT_ROWS);
  await page.waitForFunction(([selector, count]) => document.querySelectorAll(selector).length === count, [SEL_KEY_SHIFT_ROWS, ctx.keys.day.orders.length], { timeout: LIST_TIMEOUT_MS });
  report.keyShifts = await shiftRows.evaluateAll((elements) => elements.map((element) => element.innerText.replace(/\s+/g, " ").trim()));
  for (const order of ctx.keys.day.orders) {
    if (!report.keyShifts.some((row) => row.includes(order.abbreviation))) flag(report, `the services of ${ctx.keys.day.name} do not list ${order.abbreviation}`);
  }
  await parkOn(take, SEL_KEY_SHIFTS_TITLE);
  await pauseOf(take, "keyShifts");
  await clickSelector(take, SEL_KEY_SHIFTS_BACK, MOVE.normal);
  await rows.day.waitFor({ state: "visible", timeout: LIST_TIMEOUT_MS });
  await parkOn(take, SEL_KEYS_TITLE);
  await pauseOf(take, "keyBack");
  await clickSelector(take, SEL_MODAL_CLOSE, MOVE.normal);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  report.keyModeEntered = (await page.locator(SEL_KEY_MODE_BAR).count()) > 0;
  if (report.keyModeEntered) {
    await take.recorder.beginFast(CUT);
    await page.locator(SEL_KEY_MODE_END).click();
    await page.locator(SEL_KEY_MODE_BAR).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    await take.recorder.endFast();
  }
}

/** "Messe mit Nacht" through the dialog of the app; both keys are ticked by the cursor, the request must carry exactly both. */
async function createWithBothKeys(take, ctx) {
  const { page, mouse, script, report } = take;
  await openSelectorItem(take, SEL_SELECTOR_CREATE);
  await waitModalAtRest(page);
  const field = page.locator(SEL_NAME_INPUT);
  await field.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(field, MOVE.short);
  await page.keyboard.press(SELECT_ALL);
  await field.pressSequentially(script.scenarioBoth, { delay: TYPE_DELAY_MS });
  await pauseOf(take, "typed");
  await page.locator(SEL_KEY_CHOICES).waitFor({ state: "visible", timeout: LIST_TIMEOUT_MS });
  for (const key of [ctx.keys.day, ctx.keys.night]) {
    const box = page.locator(keyChoice(key.id));
    await mouse.clickLocator(box, MOVE.normal);
    if (!(await box.isChecked())) throw new Error(`the key "${key.name}" is not ticked after the click`);
    await pauseOf(take, "ticked");
  }
  const created = page.waitForResponse((response) => response.request().method() === HTTP_POST && SCENARIO_CREATE_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  created.catch(() => {});
  const reload = waitReload(take);
  await mouse.clickLocator(page.locator(SEL_SAVE), MOVE.normal);
  const response = await created;
  if (!response.ok()) throw new Error(`creating the scenario returned HTTP ${response.status()}`);
  const sent = sortedIds(response.request().postDataJSON()?.variantIds);
  const scenario = await response.json();
  report.createRequest = { variantIds: sent, from: response.request().postDataJSON()?.fromDate, until: response.request().postDataJSON()?.untilDate };
  if (!sameList(sent, sortedIds([ctx.keys.day.id, ctx.keys.night.id]))) throw new Error(`the scenario was created with the keys ${sent.join(",")} instead of both`);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await expectBanner(take, script.scenarioBoth);
  await settled(take, reload, "create");
  return scenario;
}

function startRequestProblems(take, ctx, request, scenario, fairIds) {
  const { options } = take;
  const problems = [];
  if (request?.analyseToken !== scenario.token) problems.push(`token ${request?.analyseToken} instead of the scenario ${scenario.token}`);
  if (request?.groupId !== options.groupId) problems.push(`group ${request?.groupId}`);
  if (request?.periodFrom !== D.PERIOD.from || request?.periodUntil !== D.PERIOD.until) problems.push(`period ${request?.periodFrom}..${request?.periodUntil}`);
  const shiftIds = sortedIds(request?.shiftIds);
  if (shiftIds.length === 0 || shiftIds.some((id) => !fairIds.includes(id))) problems.push(`shifts ${shiftIds.join(",")} are not only the fair clones ${fairIds.join(",")}`);
  return problems;
}

/** The job is done: the final child must carry the keys of its parent; it gets the name of the story, every other active scenario of the run (the parent included) is rejected through the API. */
async function adoptWizardResult(take, ctx, job, parent, expectedKeys, name) {
  const { api, options, report } = take;
  const finalId = job?.result?.finalScenarioId;
  if (job?.status !== JOB_STATUS_COMPLETED || !finalId) throw new Error(`the AutoWizard did not complete for "${name}" (${job?.status ?? "no status"}${job?.reason ? `: ${job.reason}` : ""})`);
  const child = await getScenario(api, finalId);
  if (child.groupId !== options.groupId) throw new Error(`the wizard result belongs to group ${child.groupId}`);
  if (dateKey(child.fromDate) < D.PERIOD.from || dateKey(child.untilDate) > D.PERIOD.until) throw new Error(`the wizard result spans ${child.fromDate}..${child.untilDate}, outside December`);
  if (!sameList(sortedIds(child.variantIds), sortedIds(expectedKeys))) throw new Error(`the wizard result carries the keys ${sortedIds(child.variantIds).join(",")} instead of ${sortedIds(expectedKeys).join(",")}`);
  const renamed = await api.json(`${SCENARIOS_API}/${child.id}/${RENAME_SEGMENT}`, { method: HTTP_PATCH, data: { name } });
  const others = (await activeScenarios(api, options.groupId)).filter((scenario) => scenario.id !== child.id && !ctx.keep.has(scenario.id));
  for (const scenario of others) await api.json(`${SCENARIOS_API}/${scenario.id}/${REJECT_SEGMENT}`, { method: HTTP_POST, data: {} });
  const parentStatus = (await getScenario(api, parent.id)).status;
  if (!others.some((scenario) => scenario.id === parent.id) && parentStatus !== SCENARIO_STATUS_SUPERSEDED) flag(report, `the parent "${parent.name}" ends the wizard run in status ${parentStatus}`);
  const after = await getScenario(api, child.id);
  if (after.status !== SCENARIO_STATUS_ACTIVE) throw new Error(`the wizard result "${name}" has status ${after.status} after the other scenarios of the run were rejected`);
  if (!sameList(sortedIds(after.variantIds), sortedIds(expectedKeys))) throw new Error(`the wizard result "${name}" lost its keys when the other scenarios of the run were rejected`);
  (report.wizardRuns ??= []).push({ name, jobId: job.id ?? null, finalId: child.id, originalName: child.name, parentStatus, coverage: job.result?.summary ? `${job.result.summary.filledSlots}/${job.result.summary.demandedSlots}` : null, rejected: others.map((scenario) => scenario.name) });
  ctx.apiRejected.push(...others.map((scenario) => scenario.id));
  return renamed;
}

/** The AutoWizard button of the header, as the app starts it on the searched shift list; anything else than the fair of the shown scenario cancels the job. */
async function planWithWizardInPicture(take, ctx, parent) {
  const { page, api, recorder } = take;
  if ((await page.locator(SEL_WIZARD_BUTTON).count()) === 0) throw new Error("the AutoWizard button is not shown - the demo account needs the Admin role and the schedule must be within the wizard limits");
  if ((await page.locator(SEL_WIZARD_DROPDOWN).count()) > 0) throw new Error("the wizard button is in dropdown mode - reload the page");
  if (ctx.lastShiftSearch.get(tokenKey(parent.token)) !== take.script.shiftSearch) {
    await take.recorder.beginFast(CUT);
    await keepShiftSearch(take, ctx, parent.token);
    await take.recorder.endFast();
  }
  const fairIds = uniqueShiftIds(await fairShiftRows(take, parent.token));
  const started = page.waitForResponse((response) => response.request().method() === HTTP_POST && AUTO_WIZARD_START_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  started.catch(() => {});
  await clickSelector(take, SEL_WIZARD_BUTTON, MOVE.normal);
  const response = await started;
  if (!response.ok()) throw new Error(`the AutoWizard start returned HTTP ${response.status()}`);
  const request = response.request().postDataJSON();
  const { jobId } = await response.json();
  take.report.wizardStart = { agents: request?.agentIds?.length, shifts: request?.shiftIds?.length, token: request?.analyseToken };
  const problems = startRequestProblems(take, ctx, request, parent, fairIds);
  if (problems.length > 0) {
    take.report.wizardStopped = await stopJob(api, jobId);
    throw new Error(`the AutoWizard was started outside the fair: ${problems.join("; ")}`);
  }
  await take.mouse.moveTo(center(take), MOVE.normal);
  await recorder.beginFast(CUT);
  const job = await waitForJob(api, page, jobId);
  await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: BANNER_TIMEOUT_MS }).catch(() => {});
  return adoptWizardResult(take, ctx, { ...job, id: jobId }, parent, [ctx.keys.day.id, ctx.keys.night.id], take.script.scenarioBoth);
}

/** The request the app sends for a wizard run, built from the API reads of the same token and search; used for the second variant inside a cut. */
async function planWithWizardViaApi(take, ctx, parent, expectedKeys) {
  const { api, options, culture } = take;
  const fairIds = uniqueShiftIds(await fairShiftRows(take, parent.token));
  const agents = (await api.schedule(scenarioFilter(ctx.decemberFilter, parent.token))).clients.map((client) => client.id);
  const request = { periodFrom: D.PERIOD.from, periodUntil: D.PERIOD.until, agentIds: agents, shiftIds: fairIds, groupId: options.groupId, analyseToken: parent.token, language: culture, agentOrderIsUserDefined: Boolean(ctx.poolFirst), softKeywordRetry: true };
  const problems = startRequestProblems(take, ctx, request, parent, fairIds);
  if (problems.length > 0) throw new Error(`refusing the wizard request for "${parent.name}": ${problems.join("; ")}`);
  const { jobId } = await api.json(AUTO_WIZARD_START_API, { method: HTTP_POST, data: request });
  const job = await waitForJob(api, take.page, jobId);
  return adoptWizardResult(take, ctx, { ...job, id: jobId }, parent, expectedKeys, take.script.scenarioDay);
}

/** Inside a cut: a fresh page shows renamed scenarios in the banner and selector; the frame, the shift search and the toast watcher are set up again. */
async function reloadInCut(take, ctx, scenario) {
  const { page } = take;
  await readToasts(take);
  (ctx.toastLog ??= []).push(...(take.report.toasts ?? []));
  await openSchedule(page, take.options);
  await frameKeys(take, ctx);
  await watchToasts(page);
  await searchShifts(take, { visible: false });
  await page.waitForFunction((selector) => document.querySelectorAll(selector).length >= 1, "[data-scenario-id]", { state: "attached", timeout: S.READY_TIMEOUT_MS }).catch(() => {});
  if (scenario) await selectVariant(take, scenario, { cutWait: false });
}

/** Summary of one scenario: the API numbers first (they are the proof), then the dialog of the app, whose key sections must show them. */
async function showSummary(take, scenario, expectedKeys, beat, wizard) {
  const { page, api, report, script } = take;
  const summary = await api.json(`${SCENARIOS_API}/${scenario.id}/${SUMMARY_SEGMENT}`);
  const days = fairDays(script.fair);
  const sections = (summary?.variants ?? []).map((variant) => ({ name: variant.name, demanded: variant.demandedSlots, filled: variant.filledSlots, open: variant.demandedSlots - variant.filledSlots, peakOpen: variant.peakOpenSlots, peakDate: variant.peakDate, copied: variant.copiedShiftCount }));
  (report.summaries ??= {})[scenario.name] = sections;
  if (!sameList(sections.map((section) => section.name).sort(), expectedKeys.map((key) => key.name).sort())) flag(report, `the summary of "${scenario.name}" lists the keys ${sections.map((section) => section.name).join(",")}`);
  for (const key of expectedKeys) {
    const section = sections.find((entry) => entry.name === key.name);
    if (section && section.demanded !== key.staffingPerDay * days) flag(report, `"${scenario.name}": ${key.name} demands ${section.demanded} places instead of ${key.staffingPerDay * days}`);
    if (section && section.copied !== NO_COPIED_SHIFTS) flag(report, `"${scenario.name}": ${key.name} holds ${section.copied} copied services, the dialogs would warn about doubled demand`);
    if (section && !wizard && section.filled !== 0) flag(report, `"${scenario.name}": ${key.name} has ${section.filled} filled places, the caption says nobody is assigned`);
  }
  await clickSelector(take, SEL_BANNER_SUMMARY, MOVE.normal);
  const list = page.locator(SEL_SUMMARY_KEYS);
  await list.waitFor({ state: "visible", timeout: LIST_TIMEOUT_MS });
  await list.scrollIntoViewIfNeeded();
  await waitModalAtRest(page);
  const shown = await page.locator(SEL_SUMMARY_KEY).evaluateAll((elements) => elements.map((element) => element.innerText.replace(/\s+/g, " ").trim()));
  (report.summaryDialogs ??= {})[scenario.name] = shown;
  for (const section of sections) {
    const text = shown.find((entry) => entry.includes(section.name));
    if (!text || !text.includes(String(section.demanded)) || !text.includes(String(section.filled)) || !text.includes(String(section.open))) flag(report, `the summary dialog of "${scenario.name}" does not show ${section.name} ${section.filled}/${section.demanded}, open ${section.open}`);
  }
  await parkOn(take, SEL_SUMMARY_KEYS);
  await pauseOf(take, beat);
  await clickSelector(take, SEL_SUMMARY_CLOSE, MOVE.short);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  return sections;
}

/** "Messe nur Tag" in a cut: created through the API with key A only, then the same frame as before the cut. */
async function prepareDayOnly(take, ctx) {
  const { api, options, script } = take;
  const created = await api.json(SCENARIOS_API, { method: HTTP_POST, data: { name: script.scenarioDay, groupId: options.groupId, fromDate: D.PERIOD.from, untilDate: D.PERIOD.until, variantIds: [ctx.keys.day.id] } });
  ctx.keep.add(created.id);
  if (!sameList(sortedIds(created.variantIds), sortedIds([ctx.keys.day.id]))) throw new Error(`"${script.scenarioDay}" was created with the keys ${sortedIds(created.variantIds).join(",")}`);
  if (!ctx.wizard) return created;
  ctx.keep.delete(created.id);
  const child = await planWithWizardViaApi(take, ctx, created, [ctx.keys.day.id]);
  ctx.keep.add(child.id);
  return child;
}

/** The checks before the only accept of the take. */
async function assertBeforeAccept(take, ctx) {
  const { api, options, report } = take;
  const scenario = await getScenario(api, ctx.dayOnly.id);
  report.acceptGuard = { groupId: scenario.groupId, from: dateKey(scenario.fromDate), until: dateKey(scenario.untilDate), keys: sortedIds(scenario.variantIds), status: scenario.status };
  if (scenario.groupId !== options.groupId) throw new Error(`"${scenario.name}" belongs to group ${scenario.groupId} - accepting it would replace data of another group`);
  if (report.acceptGuard.from !== D.PERIOD.from || report.acceptGuard.until !== D.PERIOD.until) throw new Error(`"${scenario.name}" spans ${report.acceptGuard.from}..${report.acceptGuard.until} instead of December`);
  if (!sameList(report.acceptGuard.keys, sortedIds([ctx.keys.day.id]))) throw new Error(`"${scenario.name}" carries the keys ${report.acceptGuard.keys.join(",")} instead of key A only`);
  if (scenario.status !== SCENARIO_STATUS_ACTIVE) throw new Error(`"${scenario.name}" has status ${scenario.status} before the accept`);
  const real = await api.schedule(ctx.decemberFilter);
  if (!sameList(ctx.planBefore, worksIn(real, D.PERIOD.from, D.PERIOD.until).map(semanticKey).sort())) throw new Error("the real plan changed before the accept");
  if ((await fairShiftRows(take, null)).length > 0) throw new Error("the real shift schedule holds fair rows before the accept");
}

/** The only accept: the confirmation names the open places of the key (read from the API summary), the request carries no override, anything but 200 aborts. */
async function acceptDayOnly(take, ctx) {
  const { page, mouse, recorder, report, script } = take;
  const open = (report.summaries?.[ctx.dayOnly.name] ?? []).reduce((sum, section) => sum + section.open, 0);
  const answered = page.waitForResponse((response) => response.request().method() === HTTP_POST && SCENARIO_ACCEPT_PATH.test(new URL(response.url()).pathname), { timeout: DECIDE_TIMEOUT_MS });
  answered.catch(() => {});
  const reload = waitReload(take, null);
  await clickSelector(take, SEL_BANNER_ACCEPT, MOVE.normal);
  await waitModalAtRest(page);
  const dialog = oneLine(await page.locator(SEL_MODAL).innerText());
  report.acceptDialog = dialog;
  if (!dialog.includes(script.scenarioDay)) flag(report, `the accept dialog does not name "${script.scenarioDay}": ${dialog}`);
  if (open > 0 && !dialog.includes(String(open))) flag(report, `the accept dialog does not name the ${open} open places: ${dialog}`);
  await parkOn(take, SEL_MODAL_HEADER);
  await pauseOf(take, "confirm");
  await mouse.clickLocator(page.locator(SEL_CONFIRM), MOVE.normal);
  await recorder.beginFast(CUT);
  const response = await answered;
  const query = new URL(response.url()).searchParams;
  report.acceptRequest = { status: response.status(), overrides: OVERRIDE_PARAMS.filter((param) => query.get(param) === QUERY_TRUE) };
  if (report.acceptRequest.overrides.length > 0) throw new Error(`the accept was sent with ${report.acceptRequest.overrides.join(",")}`);
  if (!response.ok()) throw new Error(`the accept of "${script.scenarioDay}" answered HTTP ${response.status()}`);
  await page.locator(SEL_BANNER).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await settled(take, reload, "accept");
  await recorder.endFast();
}

/** Changes of the real December besides the fair works, by person, day and times (an accept writes new ids). Reported, never failed. */
function decemberChanges(take, ctx, real) {
  const { script } = take;
  const after = worksIn(real, D.PERIOD.from, D.PERIOD.until).filter((work) => !isFairWork(script, work)).map(semanticKey);
  const before = new Set(ctx.planBefore);
  const now = new Set(after);
  const dayOf = (key) => key.split("|")[1];
  const removed = ctx.planBefore.filter((key) => !now.has(key));
  const added = after.filter((key) => !before.has(key));
  const split = (keys) => ({ outsideFair: keys.filter((key) => !inFair(script, dayOf(key))).length, onFairDays: keys.filter((key) => inFair(script, dayOf(key))).length });
  return { removed: split(removed), added: split(added), samples: [...removed.slice(0, REPORT_SAMPLE_LIMIT).map((key) => `- ${key}`), ...added.slice(0, REPORT_SAMPLE_LIMIT).map((key) => `+ ${key}`)] };
}

/** The published proof of the take: only states read back from the API after the last click. */
async function verifyFinished(take, ctx) {
  const { api, options, report, script } = take;
  const listed = (await api.json(`${VARIANTS_API}?groupId=${options.groupId}`)) ?? [];
  const status = (key) => listed.find((variant) => variant.id === key.id)?.status ?? null;
  report.keyStatus = { day: status(ctx.keys.day), night: status(ctx.keys.night) };
  if (report.keyStatus.day !== KEY_STATUS_ACCEPTED) flag(report, `key A ends in status ${report.keyStatus.day}`);
  if (report.keyStatus.night !== KEY_STATUS_ACTIVE) flag(report, `key B ends in status ${report.keyStatus.night}`);
  const dayOnly = await getScenario(api, ctx.dayOnly.id);
  const both = await getScenario(api, ctx.both.id);
  report.finalStatus = { dayOnly: dayOnly.status, both: both.status, active: (await activeScenarios(api, options.groupId)).length };
  if (dayOnly.status !== SCENARIO_STATUS_ACCEPTED) flag(report, `"${script.scenarioDay}" ends in status ${dayOnly.status}`);
  if (both.status !== SCENARIO_STATUS_REJECTED) flag(report, `"${script.scenarioBoth}" ends in status ${both.status}`);
  if (report.finalStatus.active !== 0) flag(report, `${report.finalStatus.active} scenarios are still active`);
  const rows = await fairShiftRows(take, null);
  const realAbbreviations = [...new Set(rows.map((row) => row.abbreviation))].sort();
  report.realFairShifts = { abbreviations: realAbbreviations, rows: rows.length, withMarker: rows.filter((row) => row.isVariantShift).length };
  if (!sameList(realAbbreviations, [...script.abbreviations.day].sort())) flag(report, `the real shift schedule holds ${realAbbreviations.join(",") || "no fair shift"} instead of the services of key A`);
  if (report.realFairShifts.withMarker > 0) flag(report, `${report.realFairShifts.withMarker} real fair rows still carry the variant marker`);
  const real = await api.schedule(ctx.decemberFilter);
  const fairWorks = worksIn(real, D.PERIOD.from, D.PERIOD.until).filter((work) => isFairWork(script, work));
  report.realFairWorks = { total: fairWorks.length, night: fairWorks.filter((work) => script.abbreviations.night.includes(work.abbreviation)).length, outsideFairDays: fairWorks.filter((work) => !inFair(script, dateKey(work.entryDate))).length };
  if (report.realFairWorks.night > 0) flag(report, `${report.realFairWorks.night} night works of key B landed in the real plan`);
  if (report.realFairWorks.outsideFairDays > 0) flag(report, `${report.realFairWorks.outsideFairDays} fair works lie outside the fair days`);
  if (!ctx.wizard && report.realFairWorks.total > 0) flag(report, `${report.realFairWorks.total} fair works are in the real plan although nobody was assigned`);
  report.membershipViolations = membershipViolations(real);
  if (report.membershipViolations.length > 0) flag(report, `works outside the group membership: ${report.membershipViolations.slice(0, REPORT_SAMPLE_LIMIT).join("; ")}`);
  report.decemberChanges = decemberChanges(take, ctx, real);
  report.okAccepts = ctx.okAccepts;
  report.okUiRejects = ctx.okUiRejects;
  report.apiRejected = ctx.apiRejected.length;
  if (ctx.okAccepts !== SINGLE_ACCEPT || ctx.acceptRequests !== SINGLE_ACCEPT) flag(report, `${ctx.acceptRequests} accept requests, ${ctx.okAccepts} answered 200, instead of one`);
  if (ctx.okUiRejects !== SINGLE_UI_REJECT) flag(report, `${ctx.okUiRejects} rejects through the banner instead of one`);
  const watched = (report.httpErrors ?? []).filter((line) => WATCHED_ERROR_PATH.test(line));
  if (watched.length > 0) flag(report, `HTTP errors: ${watched.join("; ")}`);
  const logged = [...(ctx.toastLog ?? []), ...(report.toasts ?? [])];
  const errors = logged.filter((text) => ERROR_TOAST_PATTERN.test(text));
  if (errors.length > 0) flag(report, `error toast during the take: ${errors.join(" | ")}`);
}

export async function takeScenarioKeys(take) {
  const { page, api, options, recorder, report, captions } = take;
  const script = scriptOf(take);
  requireScript(script, report.video);
  const keyTake = { ...take, script };
  const cues = SCENARIO_KEYS_CUES;
  const wizard = report.video === VIDEO_SCENARIO_KEYS_WIZARD;
  report.wizardBeat = wizard;
  await checkStage(keyTake, D.SITES.bern);
  const keys = await readKeys(keyTake);
  const first = await openSchedule(page, options);
  if (first.filter.periodStartDate !== D.PERIOD.from || first.filter.periodEndDate !== D.PERIOD.until) throw new Error(`the schedule shows ${first.filter.periodStartDate}..${first.filter.periodEndDate} instead of December`);
  const decemberFilter = realFilter(first.filter);
  const data = await api.schedule(decemberFilter);
  const realFair = worksIn(data, D.PERIOD.from, D.PERIOD.until).filter((work) => isFairWork(script, work));
  if (realFair.length > 0) throw new Error(`the real December already holds ${realFair.length} fair works - use a fresh copy of the stage database`);
  if ((await fairShiftRows(keyTake, null)).length > 0) throw new Error("the real shift schedule already holds fair rows - use a fresh copy of the stage database");
  const ctx = {
    keys, wizard, decemberFilter, poolFirst: wizard, keep: new Set(), apiRejected: [], okAccepts: 0, okUiRejects: 0, lastShiftSearch: new Map(),
    created: [], reassigned: [], acceptRequests: 0, scheduleTokens: [],
    planBefore: worksIn(data, D.PERIOD.from, D.PERIOD.until).map(semanticKey).sort(),
  };
  report.stage = { employees: data.clients.length, decemberWorks: ctx.planBefore.length, membershipViolationsBefore: membershipViolations(data).length };
  if (wizard) {
    await orderPoolFirst(keyTake, data.clients);
    await openSchedule(page, options);
  }
  await frameKeys(keyTake, ctx);
  await watchToasts(page);
  trackNetwork(keyTake, ctx);
  trackHttpErrors(keyTake);
  watchDecisions(keyTake, ctx);
  await measure(keyTake, "start");
  await checkPage(keyTake, "start");

  await recorder.start();
  try {
    await captions.show(cues.plan);
    await pauseOf(keyTake, "plan");
    await searchShifts(keyTake, { visible: true });
    const before = await observeShiftList(keyTake, ctx, "plan", null);
    if (before.entry.apiRows !== 0) flag(report, "the real shift list holds fair rows");
    if (before.entry.apiSearchRows !== 0) flag(report, `the search "${script.shiftSearch}" finds ${before.entry.apiSearchShifts} services in the real plan, the caption says there is no fair`);
    await pauseOf(keyTake, "searched");

    await captions.show(cues.keys);
    await pauseOf(keyTake, "keysLead");
    await showKeys(keyTake, ctx);
    await checkPage(keyTake, "keys");

    await captions.show(cues.create);
    ctx.both = await createWithBothKeys(keyTake, ctx);
    ctx.keep.add(ctx.both.id);
    await checkClones(keyTake, ctx, script.scenarioBoth, ctx.both.token, allFairAbbreviations(script));
    await pauseOf(keyTake, "created");
    await checkPage(keyTake, "created");

    if (wizard) {
      await captions.show(cues.planWizard);
      await pauseOf(keyTake, "wizardLead");
      ctx.keep.delete(ctx.both.id);
      ctx.both = await planWithWizardInPicture(keyTake, ctx, ctx.both);
      ctx.keep.add(ctx.both.id);
      await reloadInCut(keyTake, ctx, ctx.both);
      await setRowSlider(keyTake, true);
      await recorder.endFast();
      await checkClones(keyTake, ctx, `${script.scenarioBoth} (wizard)`, ctx.both.token, allFairAbbreviations(script));
      await pauseOf(keyTake, "wizard");
    }

    await captions.show(cues.summary);
    await showSummary(keyTake, ctx.both, [keys.day, keys.night], "summary", wizard);

    await recorder.beginFast(CUT);
    ctx.dayOnly = await prepareDayOnly(keyTake, ctx);
    await reloadInCut(keyTake, ctx, ctx.both);
    await captions.show(cues.variantB);
    await recorder.endFast();
    await pauseOf(keyTake, "variantLead");
    await selectVariant(keyTake, ctx.dayOnly);
    await checkClones(keyTake, ctx, script.scenarioDay, ctx.dayOnly.token, script.abbreviations.day);
    await pauseOf(keyTake, "variantB");
    await showSummary(keyTake, ctx.dayOnly, [keys.day], "summaryDay", wizard);

    await captions.show(cues.original);
    const reloadOriginal = waitReload(keyTake, null);
    await clickSelector(keyTake, SEL_BANNER_EXIT, MOVE.normal);
    await recorder.beginFast(CUT);
    await page.locator(SEL_BANNER).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
    await settled(keyTake, reloadOriginal, "exit");
    await recorder.endFast();
    const original = await observeShiftList(keyTake, ctx, "original", null);
    if (original.entry.apiRows !== 0) flag(report, "the original shows fair rows before the accept");
    if (original.entry.apiSearchRows !== 0) flag(report, `the search "${script.shiftSearch}" finds ${original.entry.apiSearchShifts} services in the original before the accept`);
    await pauseOf(keyTake, "original");
    await checkPage(keyTake, "original");

    await captions.show(cues.yes);
    await selectVariant(keyTake, ctx.dayOnly);
    await pauseOf(keyTake, "acceptLead");
    await assertBeforeAccept(keyTake, ctx);
    await acceptDayOnly(keyTake, ctx);
    await observeShiftList(keyTake, ctx, "accepted", null);
    await pauseOf(keyTake, "yes");

    await captions.show(cues.discard);
    await selectVariant(keyTake, ctx.both);
    await pauseOf(keyTake, "discardLead");
    await decideViaBanner(keyTake, "reject", { cutReload: true });
    await readToasts(keyTake);
    await verifyFinished(keyTake, ctx);
    await checkPage(keyTake, "finished");
    await take.mouse.moveTo(center(take), MOVE.normal);
    await holdWithPoster(keyTake, take.finalHoldMs);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale } });
  }
}
