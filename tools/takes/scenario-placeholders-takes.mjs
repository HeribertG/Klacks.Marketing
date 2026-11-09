// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of clip S1 v3 "Grossanlass mit vorläufigen Diensten und Platzhaltern" (series Szenarien, security demo Bern, German only). It needs a throw-away copy of
 * klacks_marketing_security_bern_s3 (bern_s1 plus scenario-keys-demo/seed-keys.mjs --without-keys: the customer "Messe Nordring AG" and 14 temporary staff whose membership in
 * the group covers the fair days only; no provisional shifts, no placeholder) and --group-id of "Bern Objektschutz". Recorded at 1280x720 with the chat panel; needs the Ui of 1.0.63
 * or later (menu ⋮ "Weitere Aktionen" of the schedule toolbar, the Ui term "Vorläufige Dienste" for keys, the placeholder dialog without a group field).
 * Beats (cues): team - the temporary staff stand on top, blue outside the fair days (their membership covers 10.-13.12. only); ask - Sandra asks Klacksy in the chat, Klacksy answers
 * through the two knowledge skills (explain_scenario_variant_keys, explain_placeholder_employees; both must be called, the answer must not say "Key"); key - ⋮, "Vorläufige Dienste
 * verwalten", "Vorläufige Dienste anlegen", the set "Messe" for the fair days; keyShifts - "Dienste bearbeiten", "Neuer Dienst": the shift "Messe Einlass" (MEI, 10 people, Thu-Sun,
 * customer "Messe Nordring AG") is typed into the shift form (the routine part fast-forwarded with a badge), sealed and saved; keyShiftsAll - in a cut the second shift "Messe Abend"
 * (MAB) is stored through the API with the body the form sends, then the list shows both (KLACKS_S1_SHIFT_FORM=0 stores both through the API, the report says so);
 * standIns - ⋮, "Platzhalter anlegen" (group from the schedule, shown in the title), 8 placeholders "Messe-Aushilfe {n}" with two qualifications picked in the pull-down; scenario - a new scenario carrying the set (the shift list is
 * searched for "Messe" inside the cut after saving); wizard - the AutoWizard button on the searched shift list (the wait is a cut, the final child is renamed to the scenario name,
 * every other scenario of the run is rejected through the API); real - the fair days with the temporary staff on top; plan - the rows scrolled to the placeholders (◌);
 * summary - the summary dialog: every place of the set is filled. No accept and no discard (clip S2 does that).
 * Publishable criterion (report.publishable): both knowledge skills called, no chat error, no "Key" in the answer or on the page; the set created by the dialog with the fair days;
 * MEI created by the form with the stage values (sealed, token, times, staffing, weekdays, customer, period) unless the API fallback is chosen; the placeholders created by the dialog
 * (exactly script.standIns.count, group of the schedule); the scenario created by the dialog with exactly the set; the wizard started with the token, group, December and only the
 * fair clones; the final scenario carries the set; its summary shows filled = demanded; the fair works: every slot filled, real people at least script.minRealSlots (1.0.63:
 * 65 of 80, report.optimizer records every take), placeholders at least one slot; the real December unchanged; no error toast; no unexpected HTTP error.
 * Browser findings of the menu ⋮ (tooltip over the open menu, menu position) are recorded in report.moreMenu, never hidden.
 * @param take - page, api, options, recorder, mouse, report, captions, script, culture, viewport, scale, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { SEL_MODAL, waitModalAtRest } from "../lib/modal.mjs";
import { SEL_ASSISTANT_INPUT, SEL_ASSISTANT_CLOSE, sendChatMessage } from "../lib/klacksy-chat.mjs";
import { CANVAS_SETTLE_MS, HALF, HTTP_POST, SCHEDULE_ROUTE_PART, dateKey, openSchedule, worksIn } from "../lib/schedule-grid.mjs";
import { JOB_STATUS_COMPLETED, SCENARIOS_API, SCENARIO_STATUS_ACTIVE, activeScenarios, getScenario, realFilter, scenarioFilter, stopJob, waitForJob } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import { ERROR_TOAST_PATTERN } from "../lib/ui-texts.mjs";
import { S1_FORM_SHIFT, S1_KEY, S1_STAND_INS, keyShiftBody } from "../scenario-keys-demo/s1-placeholder-stage.mjs";
import { checkPage, useRowOrder } from "./replacement-takes.mjs";
import { clickSelector, expectBanner, flag, holdWithPoster } from "./scenario-takes.mjs";
import { checkStage, readToasts, scrollColumns, showRowAtTop, trackHttpErrors, watchToasts } from "./security-takes.mjs";
import { selectVariant, settled, waitReload } from "./scenario-variants-takes.mjs";

export const VIDEO_SCENARIO_PLACEHOLDERS = "scenario-placeholders";
export const SCENARIO_PLACEHOLDERS_CUES = Object.freeze({
  team: "team",
  ask: "ask",
  explain: "explain",
  key: "key",
  keyShifts: "keyShifts",
  keyShiftsAll: "keyShiftsAll",
  standIns: "standIns",
  scenario: "scenario",
  wizard: "wizard",
  real: "real",
  plan: "plan",
  summary: "summary",
});
export const SCENARIO_PLACEHOLDERS_FINAL_HOLD_MS = 2000;

const SEL_SELECTOR_BTN = "#scenario-selector-btn";
const SEL_SELECTOR_CREATE = "#scenario-selector-create-item";
const SEL_MORE_BUTTON = "#schedule-more-actions-btn";
const SEL_MORE_MENU = "div[ngbDropdownMenu][aria-labelledby='schedule-more-actions-btn']";
const SEL_MORE_KEYS = "#schedule-more-manage-keys";
const SEL_MORE_STAND_INS = "#schedule-more-create-stand-ins";
const SEL_MORE_NEEDS_GROUP = "#schedule-more-needs-group";
const SEL_TOOLTIP = "ngb-tooltip-window";
const SEL_KEYS_TITLE = "#scenario-variants-title";
const SEL_KEY_CREATE = "#scenario-variants-create-btn";
const SEL_KEY_NAME = "#scenario-variant-name-input";
const SEL_KEY_DESCRIPTION = "#scenario-variant-description-input";
const SEL_KEY_FROM = "#scenario-variant-from-input";
const SEL_KEY_UNTIL = "#scenario-variant-until-input";
const SEL_KEY_SAVE = "#scenario-variant-form-save";
const keyRow = (id) => `tr.variant-row[data-variant-id="${id}"]`;
const SEL_KEY_SHIFTS_BUTTON = ".variant-edit-shifts-btn";
const SEL_KEY_SHIFT_NEW = "#variant-shifts-new-btn";
const SEL_KEY_SHIFT_ROWS = "#variant-shifts-panel tr.shift-row";
const SEL_KEY_SHIFTS_TITLE = "#variant-shifts-title";
const SEL_MODAL_CLOSE = `${SEL_MODAL} .modal-header .close`;
const SEL_KEY_MODE_BAR = "#variant-mode-bar";
const SEL_KEY_MODE_END = "#variant-mode-bar-end-btn";
const SEL_STAND_IN_TITLE = "#stand-in-create-title";
const SEL_STAND_IN_COUNT = "#stand-in-create-count";
const SEL_STAND_IN_GROUP_NAME = "#stand-in-create-group-name";
const SEL_STAND_IN_PATTERN = "#stand-in-create-pattern";
const SEL_STAND_IN_SUBMIT = "#stand-in-create-submit";
const SEL_STAND_IN_PROBLEM = "#stand-in-create-problem";
const SEL_QUALIFICATIONS = "#stand-in-create-qualifications";
const SEL_QUALIFICATIONS_MENU = "#stand-in-create-qualifications-menu";
const SEL_QUALIFICATION_ROW = "label[id^='stand-in-create-qualification-']";
const SEL_QUALIFICATION_CHECKBOX = "input.qualification-select-checkbox";
const SEL_QUALIFICATION_SYMBOL = `${SEL_QUALIFICATIONS} .qualification-select-symbol`;
const SEL_NAME_INPUT = "#scenario-name-input";
const SEL_KEY_CHOICES = "#scenario-variant-choices";
const keyChoice = (id) => `#scenario-variant-choice-${id}`;
const SEL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_BANNER = "#scenario-banner";
const SEL_BANNER_SUMMARY = "#scenario-banner-summary-btn";
const SEL_SUMMARY_KEYS = "#scenario-summary-variants";
const SEL_SUMMARY_KEY = "#scenario-summary-variants .summary-variant";
const SEL_SUMMARY_CLOSE = "#scenario-summary-close-btn";
const SEL_CHAT_MESSAGES = "#assistant-chat-messages";
const SEL_CHAT_MESSAGE = "#assistant-chat-messages .message-wrapper";
const SEL_SHIFT_FILTER_TOGGLE = "#dropdownFilter";
const SEL_SHIFT_SEARCH = "#shift-filter-search";
const SEL_WIZARD_BUTTON = "#schedule-wizard-btn";
const SEL_WIZARD_DROPDOWN = ".wizard-dropdown";
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const SEL_FORM_CONTAINER = "#edit-shift-home-container";
const SEL_FORM_NAME = "#name";
const SEL_FORM_ABBREVIATION = "#abbreviation";
const SEL_FORM_FROM = "#validFrom";
const SEL_FORM_COMPLEX = "label.main-switch[for='checkbox']";
const SEL_FORM_COMPLEX_INPUT = "#checkbox";
const SEL_FORM_START_HOURS = "#start-hours";
const SEL_FORM_END_HOURS = "#end-hours";
const minutesOf = (hoursSelector) => `app-time-input:has(${hoursSelector}) input.minutes`;
const SEL_FORM_STAFFING = "#sumEmployees";
const SEL_FORM_CUSTOMER = "#member";
const SEL_FORM_CUSTOMER_APPLY = "#shift-address-select-btn";
const SEL_FORM_CUSTOMER_CHOSEN = ".selected-address-info";
const SEL_FORM_LOCK = "#shift-lock-btn";
const SEL_FORM_SAVE_CLOSE = "#shift-save-and-close-btn";
const SEL_ZOOM_POINTER = "#schedule-zoom-slider .ngx-slider-pointer";
const SPLIT_DIRECTION_VERTICAL = "vertical";
const KEY_HOME = "Home";
const KEY_ENTER = "Enter";
const SELECT_ALL = "Control+A";

const VARIANTS_API = "/api/backend/ScenarioVariants";
const VARIANT_SHIFTS_SEGMENT = "Shifts";
const SHIFTS_API = "/api/backend/Shifts";
const SHIFT_SCHEDULE_API = "/api/backend/Shifts/Schedule";
const SORT_ORDER_API = "/api/backend/clientsortpreferences";
const CLIENT_FIND_API = "/api/backend/Clients/FindClient";
const SUMMARY_SEGMENT = "Summary";
const RENAME_SEGMENT = "Rename";
const REJECT_SEGMENT = "Reject";
const HTTP_PUT = "PUT";
const HTTP_PATCH = "PATCH";
const VARIANT_CREATE_PATH = /\/ScenarioVariants\/?$/i;
const STAND_INS_PATH = /\/Clients\/StandIns\/?$/i;
const SHIFT_CREATE_PATH = /\/api\/backend\/Shifts\/?$/i;
const SCENARIO_CREATE_PATH = /\/AnalyseScenarios\/?$/i;
const SHIFT_SCHEDULE_PATH = /\/Shifts\/Schedule\/?$/i;
const AUTO_WIZARD_START_PATH = /\/AutoWizard\/Start/i;
const WATCHED_ERROR_PATH = /\/AnalyseScenarios|\/ScenarioVariants|\/AutoWizard|\/Shifts\/|\/Works\/|\/Clients\/StandIns|\/assistant\//i;
const KNOWLEDGE_SKILLS = Object.freeze(["explain_scenario_variant_keys", "explain_placeholder_employees"]);
const OLD_TERM = /\bKeys?\b/;
const ENV_SHIFT_FORM = "KLACKS_S1_SHIFT_FORM";
const FORM_FAST_FACTOR = 6;
const LLM_FAST_FACTOR = 24;
const SHIFT_STATUS_SEALED_ORDER = 1;
const ENTITY_TYPE_STAND_IN = 3;
const SHIFT_ROW_LIMIT = 5000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SAVE_TIMEOUT_MS = 30000;
const SEARCH_TIMEOUT_MS = 20000;
const BANNER_TIMEOUT_MS = 60000;
const LIST_TIMEOUT_MS = 20000;
const TYPE_DELAY_MS = 40;
const CHAT_TYPE_DELAY_MS = 24;
const APP_SEARCH_DEBOUNCE_MS = 300;
const SEARCH_DEBOUNCE_MARGIN_MS = 250;
const CUT = Number.POSITIVE_INFINITY;
const MOVE = { short: 220, normal: 420 };
const REQUIRED_SCRIPT_FIELDS = Object.freeze(["prompt", "minRealSlots", "expectedRealSlots", "columnsScrolled", "splitY", "poolRowsAbovePlaceholders", "answerScrollSteps", "beats"]);
const CHAT_READ_AFTER_ANSWER_MS = 300;
const KEY_MODE_RELOAD_WAIT_MS = 8000;
const ANSWER_TOP_INSET_PX = 8;
const FORM_SCROLL_SETTLE_MS = 250;
const MINUTES_PER_HOUR = 60;
const CUSTOMER_SEARCH_SETTLE_MS = 600;
const SPINNER_POLL_MS = 100;
const SEL_GLOBAL_SPINNER = "app-spinner-wrapper app-spinner";
const CUSTOMER_APPLY_WAIT_MS = 2000;

const pauseOf = (take, beat) => take.page.waitForTimeout(take.script.beats[beat]);
const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
const sortedIds = (ids) => [...(ids ?? [])].map((id) => String(id).toLowerCase()).sort();
const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const semanticKey = (work) => [work.clientId, dateKey(work.entryDate), work.startTime, work.endTime].join("|");
const center = (take) => ({ x: take.viewport.width / HALF, y: take.viewport.height / HALF });
const fairDayCount = () => Math.round((Date.parse(`${S1_KEY.until}T00:00:00Z`) - Date.parse(`${S1_KEY.from}T00:00:00Z`)) / MS_PER_DAY) + 1;
const abbreviations = () => S1_KEY.shifts.map((shift) => shift.abbreviation);
const isFairWork = (work) => abbreviations().includes(work.abbreviation);
const demandPerDay = () => S1_KEY.shifts.reduce((sum, shift) => sum + shift.staffing, 0);
const waitPost = (page, pathPattern, timeout = SAVE_TIMEOUT_MS) => {
  const answered = page.waitForResponse((response) => response.request().method() === HTTP_POST && pathPattern.test(new URL(response.url()).pathname), { timeout });
  answered.catch(() => {});
  return answered;
};

function requireScript(script) {
  const missing = REQUIRED_SCRIPT_FIELDS.filter((field) => script?.[field] === undefined);
  if (missing.length > 0) throw new Error(`the ${VIDEO_SCENARIO_PLACEHOLDERS} script lacks ${missing.join(", ")} in capture-app-videos.scripts.json`);
}

async function fairShiftRows(take, token) {
  const { api, options } = take;
  const result = await api.json(SHIFT_SCHEDULE_API, {
    method: HTTP_POST,
    data: { startDate: D.PERIOD.from, endDate: D.PERIOD.until, selectedGroup: options.groupId, holidayDates: [...D.HOLIDAYS], searchString: S1_KEY.search, startRow: 0, rowCount: SHIFT_ROW_LIMIT, analyseToken: token },
  });
  return (result?.shifts ?? []).filter((row) => isFairWork(row));
}

const uniqueShiftIds = (rows) => [...new Set(rows.map((row) => String(row.shiftId).toLowerCase()))];

/** The stage must be fresh: no key named like ours, no placeholder, the customer present, the fair days free of fair works. */
async function checkFreshStage(take, data) {
  const { api, options, report } = take;
  const keys = ((await api.json(`${VARIANTS_API}?groupId=${options.groupId}`)) ?? []);
  if (keys.length > 0) throw new Error(`the group already holds ${keys.length} key(s) (${keys.map((key) => key.name).join(", ")}) - use a fresh copy of klacks_marketing_security_bern_s3`);
  const standIns = data.clients.filter((client) => client.type === ENTITY_TYPE_STAND_IN);
  if (standIns.length > 0) throw new Error(`the group already shows ${standIns.length} placeholder(s) - use a fresh copy of klacks_marketing_security_bern_s3`);
  const customer = ((await api.json(`${CLIENT_FIND_API}/${encodeURIComponent(S1_KEY.customer)}/${encodeURIComponent(S1_KEY.customer)}/%20`)) ?? []).find((client) => client.company === S1_KEY.customer && !client.isDeleted);
  if (!customer) throw new Error(`the customer ${S1_KEY.customer} is missing - seed the stage with scenario-keys-demo/seed-keys.mjs --without-keys`);
  if (worksIn(data, D.PERIOD.from, D.PERIOD.until).some(isFairWork)) throw new Error("the real December already holds fair works");
  report.stage = { employees: data.clients.length, customerId: customer.id };
  return customer;
}

/** Row slider at its overview value, the splitter at the height of the script, the columns moved so the fair days stand in the frame. */
/** The temporary staff (membership = fair days) first, placeholders right below, everyone else after; the schedule then uses the individual order. */
async function orderRows(take, data) {
  const { api, options, report } = take;
  const isPool = (client) => client.groupItemValidFrom && client.groupItemValidUntil && dateKey(client.groupItemValidFrom) === S1_KEY.from && dateKey(client.groupItemValidUntil) === S1_KEY.until;
  const pool = data.clients.filter(isPool);
  const standIns = data.clients.filter((client) => client.type === ENTITY_TYPE_STAND_IN);
  const ordered = [...pool, ...standIns, ...data.clients.filter((client) => !isPool(client) && client.type !== ENTITY_TYPE_STAND_IN)];
  report.rowOrder = { pool: pool.length, standIns: standIns.length, rest: ordered.length - pool.length - standIns.length };
  if (pool.length === 0) throw new Error("no temporary staff with the membership of the fair days");
  await api.json(`${SORT_ORDER_API}/${options.groupId}`, { method: HTTP_PUT, data: ordered.map((client, sortOrder) => ({ clientId: client.id, sortOrder })) });
}

async function frame(take) {
  const { page, mouse, script } = take;
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

/** Types "Messe" into the shift filter and submits it after the debounce of app-search-input (see scenario-keys-takes.mjs). */
async function searchShifts(take, { visible }) {
  const { page, mouse } = take;
  const loaded = page.waitForResponse((response) => response.request().method() === HTTP_POST && SHIFT_SCHEDULE_PATH.test(new URL(response.url()).pathname)
    && response.request().postDataJSON()?.searchString === S1_KEY.search, { timeout: SEARCH_TIMEOUT_MS });
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
    await field.pressSequentially(S1_KEY.search, { delay: TYPE_DELAY_MS });
  } else {
    await field.fill(S1_KEY.search);
  }
  await page.waitForTimeout(APP_SEARCH_DEBOUNCE_MS + SEARCH_DEBOUNCE_MARGIN_MS);
  await page.keyboard.press(KEY_ENTER);
  if (!(await loaded.then(() => true, () => false))) throw new Error(`the shift list was not reloaded with the search "${S1_KEY.search}"`);
  if (visible) await mouse.clickLocator(toggle, MOVE.short);
  else await toggle.click();
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

async function parkOn(take, selector) {
  const box = await take.page.locator(selector).first().boundingBox();
  await take.mouse.moveTo(box ? { x: box.x + box.width / HALF, y: box.y + box.height / HALF } : center(take), MOVE.short);
}

async function openSelectorItem(take, selector) {
  await clickSelector(take, SEL_SELECTOR_BTN, MOVE.normal);
  await pauseOf(take, "menu");
  await clickSelector(take, selector, MOVE.normal);
}

/**
 * Opens the menu ⋮ "Weitere Aktionen" and picks an entry. Every opening records what a viewer sees (report.moreMenu): whether the tooltip of the button stands over the open
 * menu and whether the menu sits below the button inside the viewport. Nothing is hidden: the cursor goes from the button straight to the entry.
 */
async function openMoreItem(take, selector) {
  const { page, report } = take;
  await clickSelector(take, SEL_MORE_BUTTON, MOVE.normal);
  const menu = page.locator(SEL_MORE_MENU);
  await menu.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (await page.locator(SEL_MORE_NEEDS_GROUP).isVisible().catch(() => false)) throw new Error("the menu ⋮ says that no group is selected");
  const entry = page.locator(selector);
  await entry.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (await entry.isDisabled()) throw new Error(`the menu entry ${selector} is disabled`);
  await pauseOf(take, "menu");
  (report.moreMenu ??= []).push(await measureMoreMenu(take, selector));
  await clickSelector(take, selector, MOVE.normal);
}

async function measureMoreMenu(take, selector) {
  const { page, viewport } = take;
  const box = async (locator) => ((await locator.count()) > 0 ? locator.first().boundingBox() : null);
  const button = await box(page.locator(SEL_MORE_BUTTON));
  const menu = await box(page.locator(SEL_MORE_MENU));
  const tooltips = await page.locator(SEL_TOOLTIP).evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().width > 0)
    .map((element) => { const b = element.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, text: element.innerText.trim() }; }));
  const overlaps = (a, b) => Boolean(a && b) && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  return {
    entry: selector, button, menu, tooltips,
    tooltipOverMenu: tooltips.some((tip) => overlaps(tip, menu)),
    menuBelowButton: Boolean(menu && button) && menu.y >= button.y + button.height - 2,
    menuInViewport: Boolean(menu) && menu.x >= 0 && menu.y >= 0 && menu.x + menu.width <= viewport.width && menu.y + menu.height <= viewport.height,
  };
}

async function typeField(take, selector, text) {
  const { page, mouse } = take;
  const field = page.locator(selector);
  await field.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(field, MOVE.short);
  await page.keyboard.press(SELECT_ALL);
  await field.pressSequentially(text, { delay: TYPE_DELAY_MS });
}

/** Beat ask: the chat panel opens, the prompt is typed, the answer must come from both knowledge skills and must not use the old term "Key". */
async function askKlacksy(take, ctx) {
  const { page, mouse, report, script, captions } = take;
  await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE.normal);
  await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await pauseOf(take, "chatOpen");
  const pace = { readAnswerMs: CHAT_READ_AFTER_ANSWER_MS, typeDelayMs: CHAT_TYPE_DELAY_MS, fastFactor: LLM_FAST_FACTOR };
  const turn = await sendChatMessage({ ...take, chatPace: pace }, script.prompt, { afterAnswer: () => captions.show(SCENARIO_PLACEHOLDERS_CUES.explain) });
  report.chat = { calls: turn.calls.map((call) => `${call.name}${JSON.stringify(call.parameters ?? {})}`), errors: turn.errors, answer: oneLine(turn.content).slice(0, 1500) };
  if (turn.errors.length > 0) flag(report, `chat error: ${turn.errors.join("; ")}`);
  const called = new Set(turn.calls.map((call) => call.name));
  const missing = KNOWLEDGE_SKILLS.filter((skill) => !called.has(skill));
  if (missing.length > 0) flag(report, `Klacksy did not call ${missing.join(", ")} (calls: ${[...called].join(", ") || "none"})`);
  const answer = oneLine(turn.content);
  const oldTerm = answer.match(OLD_TERM);
  report.chatOldTerm = oldTerm ? answer.slice(Math.max(0, oldTerm.index - 60), oldTerm.index + 60) : null;
  if (oldTerm) flag(report, `Klacksy's answer uses the old term: "...${report.chatOldTerm}..."`);
  await readAnswerFromTop(take);
  await mouse.clickLocator(page.locator(SEL_ASSISTANT_CLOSE), MOVE.normal);
  await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "hidden", timeout: S.READY_TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  ctx.chatDone = true;
}

/** The visible page must not show the old term "Key" (Ui term since 1.0.63: "Vorläufige Dienste"). */
async function checkNoOldTerm(take, label) {
  const text = await take.page.evaluate(() => document.body.innerText);
  const match = text.match(OLD_TERM);
  (take.report.oldTermChecks ??= []).push({ label, found: match ? text.slice(Math.max(0, match.index - 40), match.index + 40).replace(/\s+/g, " ") : null });
  if (match) flag(take.report, `the page shows the old term "Key" at "${label}"`);
}

/** The chat scrolls to the end of the answer; the answer is shown from its first line and then scrolled down slowly, as a reader would. */
async function readAnswerFromTop(take) {
  const { page } = take;
  const range = await page.evaluate(([containerSelector, messageSelector, inset]) => {
    const container = document.querySelector(containerSelector);
    const messages = document.querySelectorAll(messageSelector);
    const last = messages[messages.length - 1];
    if (!container || !last) return null;
    const top = last.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - inset;
    return { top: Math.max(0, top), bottom: container.scrollHeight - container.clientHeight };
  }, [SEL_CHAT_MESSAGES, SEL_CHAT_MESSAGE, ANSWER_TOP_INSET_PX]);
  if (!range) {
    take.report.chatScroll = "no answer element";
    await pauseOf(take, "answer");
    return;
  }
  await page.evaluate(([selector, top]) => document.querySelector(selector).scrollTo({ top }), [SEL_CHAT_MESSAGES, range.top]);
  await pauseOf(take, "answer");
  for (let step = 1; step <= take.script.answerScrollSteps; step++) {
    const top = range.top + ((range.bottom - range.top) * step) / take.script.answerScrollSteps;
    await page.evaluate(([selector, value]) => document.querySelector(selector).scrollTo({ top: value }), [SEL_CHAT_MESSAGES, top]);
    await page.waitForTimeout(take.script.beats.answerScrollStep);
  }
  await pauseOf(take, "answerEnd");
}

/**
 * Beat key: ⋮, "Vorläufige Dienste verwalten", the set "Messe" is created; the request must carry the fair days and the group. "Bis" is set before "Von": the form defaults end
 * before the fair, and a "Von" after "Bis" shows the invalid-period note for a moment. The description is filled, not typed (it is not part of the story).
 */
async function createKey(take, ctx) {
  const { page, mouse, report, options } = take;
  await openMoreItem(take, SEL_MORE_KEYS);
  await waitModalAtRest(page);
  await page.locator(SEL_KEYS_TITLE).waitFor({ state: "visible", timeout: LIST_TIMEOUT_MS });
  await checkNoOldTerm(take, "set list");
  await pauseOf(take, "keyList");
  await clickSelector(take, SEL_KEY_CREATE, MOVE.normal);
  await typeField(take, SEL_KEY_NAME, S1_KEY.name);
  await page.locator(SEL_KEY_DESCRIPTION).fill(S1_KEY.description);
  await mouse.clickLocator(page.locator(SEL_KEY_UNTIL), MOVE.short);
  await page.locator(SEL_KEY_UNTIL).fill(S1_KEY.until);
  await mouse.clickLocator(page.locator(SEL_KEY_FROM), MOVE.short);
  await page.locator(SEL_KEY_FROM).fill(S1_KEY.from);
  await parkOn(take, SEL_KEYS_TITLE);
  await pauseOf(take, "keyForm");
  const created = waitPost(page, VARIANT_CREATE_PATH);
  await clickSelector(take, SEL_KEY_SAVE, MOVE.normal);
  const response = await created;
  if (!response || !response.ok()) throw new Error(`creating the provisional shifts answered HTTP ${response?.status()}`);
  const key = await response.json();
  report.keyCreated = { id: key.id, name: key.name, from: dateKey(key.fromDate), until: dateKey(key.untilDate), groupId: key.groupId };
  if (key.name !== S1_KEY.name || report.keyCreated.from !== S1_KEY.from || report.keyCreated.until !== S1_KEY.until) flag(report, `the set was stored as ${JSON.stringify(report.keyCreated)}`);
  if (key.groupId !== options.groupId) throw new Error(`the set belongs to group ${key.groupId}`);
  ctx.key = key;
  await page.locator(keyRow(key.id)).waitFor({ state: "visible", timeout: LIST_TIMEOUT_MS });
  await parkOn(take, SEL_KEYS_TITLE);
  await pauseOf(take, "keySaved");
}

/** Scrolls the page so the element stands in the middle of the viewport (the shift form is longer than the viewport). */
async function reveal(take, selector) {
  const element = take.page.locator(selector).first();
  await element.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await element.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "smooth" }));
  await take.page.waitForTimeout(FORM_SCROLL_SETTLE_MS);
  return element;
}

async function clickIn(take, selector, moveMs = MOVE.short) {
  const element = await reveal(take, selector);
  await take.mouse.clickLocator(element, moveMs);
  return element;
}

async function typeIn(take, selector, text) {
  const element = await clickIn(take, selector);
  await take.page.keyboard.press(SELECT_ALL);
  await element.pressSequentially(text, { delay: TYPE_DELAY_MS });
  return element;
}

/** A number field: Control+A does not select the default value of a number input (take 6 on 1.0.63 stored 110 from "1" + "10"), so the field is emptied first. */
async function typeNumber(take, selector, value) {
  const element = await clickIn(take, selector);
  await element.fill("");
  await element.pressSequentially(String(value), { delay: TYPE_DELAY_MS });
  if ((await element.inputValue()) !== String(value)) throw new Error(`${selector} holds "${await element.inputValue()}" instead of ${value}`);
}

/** A weekday checkbox: the input itself when it has a box, else its label. Only unticked days are clicked. */
async function tickDay(take, id) {
  const input = take.page.locator(`#${id}`);
  if (await input.isChecked()) return;
  const box = await input.boundingBox();
  await clickIn(take, box && box.width > 2 ? `#${id}` : `label[for='${id}']`);
  if (!(await input.isChecked())) throw new Error(`the weekday ${id} is not ticked after the click`);
}

/** The time of a time-input: hours typed, minutes typed only when they differ, blur commits the value. */
async function typeTime(take, hoursSelector, time) {
  const [hours, minutes] = time.split(":");
  await typeIn(take, hoursSelector, hours);
  const minuteField = take.page.locator(minutesOf(hoursSelector));
  if ((await minuteField.inputValue()) !== minutes) await typeIn(take, minutesOf(hoursSelector), minutes);
  await take.page.keyboard.press("Tab");
}

/**
 * Beat keyShifts (form): "Dienste bearbeiten", "Neuer Dienst"; the shift form opens in the mode of the set (group, period and token preset by the app). Name and abbreviation are typed at
 * normal speed, the routine fields (complex mode, times, weekdays, staffing, customer) fast-forwarded with a badge, lock and "Speichern und schliessen" at normal speed again.
 * The loading of the form after "Neuer Dienst" and the saving after "Speichern und schliessen" are cuts (both show the grey loading overlay of the app for about a second);
 * the cut after saving stays open and is closed by fillKeyShifts.
 * The body the form sends is compared with the body the API fallback would send (keyShiftBody): every difference is flagged. The status is not compared there: on 1.0.63 the
 * form sends status 0 and answers with the plannable copy (status 2); that MEI is a sealed order with the stage values is checked afterwards through the list of the set.
 */
async function createShiftInForm(take, ctx, shift) {
  const { page, recorder, report } = take;
  await clickSelector(take, `${keyRow(ctx.key.id)} ${SEL_KEY_SHIFTS_BUTTON}`, MOVE.normal);
  await clickSelector(take, SEL_KEY_SHIFT_NEW, MOVE.normal);
  await recorder.beginFast(CUT);
  await page.locator(SEL_FORM_CONTAINER).waitFor({ state: "visible", timeout: S.NAV_TIMEOUT_MS });
  await page.locator(SEL_KEY_MODE_BAR).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForFunction((selector) => Boolean(document.querySelector(selector)?.value), SEL_FORM_FROM, { timeout: S.READY_TIMEOUT_MS });
  report.formOpenSpinnerWaitMs = await waitSpinnerGone(page);
  await recorder.endFast();
  await checkNoOldTerm(take, "shift form");
  report.formPreset = { from: await page.locator(SEL_FORM_FROM).inputValue(), bar: oneLine(await page.locator(SEL_KEY_MODE_BAR).innerText()) };
  await typeIn(take, SEL_FORM_NAME, shift.name);
  await typeIn(take, SEL_FORM_ABBREVIATION, shift.abbreviation);
  await pauseOf(take, "formNamed");
  await recorder.beginFast(FORM_FAST_FACTOR);
  if (!(await page.locator(SEL_FORM_COMPLEX_INPUT).isChecked())) await clickIn(take, SEL_FORM_COMPLEX);
  await typeTime(take, SEL_FORM_START_HOURS, shift.start.slice(0, 5));
  await typeTime(take, SEL_FORM_END_HOURS, shift.end.slice(0, 5));
  for (const day of S1_FORM_SHIFT.weekdayIds) await tickDay(take, day);
  await typeNumber(take, SEL_FORM_STAFFING, shift.staffing);
  await chooseCustomer(take);
  await recorder.endFast();
  await clickIn(take, SEL_FORM_LOCK, MOVE.normal);
  await pauseOf(take, "formSealed");
  const created = waitPost(page, SHIFT_CREATE_PATH);
  await clickSelector(take, SEL_FORM_SAVE_CLOSE, MOVE.normal);
  await recorder.beginFast(CUT);
  const response = await created;
  if (!response || !response.ok()) throw new Error(`saving the shift form answered HTTP ${response?.status()}`);
  report.formShift = compareWithStage(response.request().postDataJSON(), await response.json(), shift, ctx, { id: take.options.groupId, name: D.SITES.bern.group.name });
  if (report.formShift.differences.length > 0) flag(report, `the form stored ${shift.abbreviation} differently: ${report.formShift.differences.join("; ")}`);
}

/** Waits until the global loading spinner has stayed away for CUSTOMER_SEARCH_SETTLE_MS (every keystroke of the address search starts a request, and the spinner greys the page). */
async function waitSpinnerGone(page) {
  const started = Date.now();
  let quietSince = Date.now();
  while (Date.now() - started < S.READY_TIMEOUT_MS) {
    if (await page.locator(SEL_GLOBAL_SPINNER).count() > 0) quietSince = Date.now();
    else if (Date.now() - quietSince >= CUSTOMER_SEARCH_SETTLE_MS) return Date.now() - started;
    await page.waitForTimeout(SPINNER_POLL_MS);
  }
  throw new Error("the loading spinner did not go away after the address search");
}

/**
 * The customer of the shift: typed into the address search, then "Auswählen" once the loading spinner is gone (take 5 on 1.0.63 clicked while the spinner overlay of the search
 * covered the page and the address was not taken). If the address is still not taken after the click, Enter in the search field (the other way the form offers) takes it;
 * report.customerApply says which way worked.
 */
async function chooseCustomer(take) {
  const { page, report } = take;
  const chosen = page.locator(SEL_FORM_CUSTOMER_CHOSEN).filter({ hasText: S1_KEY.customer });
  await typeIn(take, SEL_FORM_CUSTOMER, S1_FORM_SHIFT.customerSearch);
  await page.locator(SEL_FORM_CUSTOMER_APPLY).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  report.customerSpinnerWaitMs = await waitSpinnerGone(page);
  await clickIn(take, SEL_FORM_CUSTOMER_APPLY);
  if (await chosen.waitFor({ state: "visible", timeout: CUSTOMER_APPLY_WAIT_MS }).then(() => true, () => false)) {
    report.customerApply = "click";
    return;
  }
  await clickIn(take, SEL_FORM_CUSTOMER);
  await page.keyboard.press(KEY_ENTER);
  await chosen.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  report.customerApply = "enter after a lost click";
}

const minutesOfDay = (time) => { const [hours, minutes] = String(time).split(":").map(Number); return hours * MINUTES_PER_HOUR + minutes; };

function compareWithStage(sent, stored, shift, ctx, group) {
  const expected = keyShiftBody(shift, ctx.key, group, ctx.customer.id);
  const value = (field) => sent?.[field] ?? stored?.[field];
  const differences = [];
  const same = (field, actual, wanted) => { if (String(actual) !== String(wanted)) differences.push(`${field} ${actual} instead of ${wanted}`); };
  same("analyseToken", String(value("analyseToken")).toLowerCase(), String(expected.analyseToken).toLowerCase());
  same("abbreviation", value("abbreviation"), expected.abbreviation);
  same("startShift", minutesOfDay(value("startShift")), minutesOfDay(expected.startShift));
  same("endShift", minutesOfDay(value("endShift")), minutesOfDay(expected.endShift));
  same("sumEmployees", value("sumEmployees"), expected.sumEmployees);
  same("clientId", String(value("clientId")).toLowerCase(), String(expected.clientId).toLowerCase());
  same("fromDate", dateKey(value("fromDate")), expected.fromDate);
  same("untilDate", dateKey(value("untilDate")), expected.untilDate);
  for (const day of S1_FORM_SHIFT.weekdayFields) if (value(day) !== true) differences.push(`${day} is not set`);
  return { id: stored?.id ?? null, sentStatus: sent?.status, answeredStatus: stored?.status, start: value("startShift"), end: value("endShift"), staffing: value("sumEmployees"), differences };
}

/**
 * Beat keyShifts: MEI is typed into the shift form in the picture (KLACKS_S1_SHIFT_FORM=0: through the API like every other shift, report.keyShiftsVia says which); in a cut the
 * remaining shifts of the set are stored through the API with the body the form sends, then the list of the set shows all of them. The mode of the set ends in a cut and the page is
 * opened again (the grid reloads late after the mode ends, seen as a dark grid behind the next dialog on 1.0.62).
 */
async function fillKeyShifts(take, ctx) {
  const { page, api, recorder, report, options, captions } = take;
  const viaForm = process.env[ENV_SHIFT_FORM] !== "0";
  report.keyShiftsVia = viaForm ? `form for ${S1_FORM_SHIFT.abbreviation}, API for the rest` : "API for every shift (KLACKS_S1_SHIFT_FORM=0)";
  const formShift = S1_KEY.shifts.find((shift) => shift.abbreviation === S1_FORM_SHIFT.abbreviation);
  if (viaForm) await createShiftInForm(take, ctx, formShift);
  else await clickSelector(take, SEL_MODAL_CLOSE, MOVE.short);
  await recorder.beginFast(CUT);
  const group = { id: options.groupId, name: D.SITES.bern.group.name };
  for (const shift of S1_KEY.shifts.filter((entry) => !viaForm || entry !== formShift)) await api.json(SHIFTS_API, { method: HTTP_POST, data: keyShiftBody(shift, ctx.key, group, ctx.customer.id) });
  const orders = ((await api.json(`${VARIANTS_API}/${ctx.key.id}/${VARIANT_SHIFTS_SEGMENT}`)) ?? []).filter((shift) => shift.status === SHIFT_STATUS_SEALED_ORDER);
  report.keyOrders = orders.map((shift) => `${shift.abbreviation} ${shift.startShift}-${shift.endShift} x${shift.sumEmployees}`);
  if (!sameList(orders.map((shift) => shift.abbreviation).sort(), [...abbreviations()].sort())) throw new Error(`the set holds the orders ${report.keyOrders.join(", ")}`);
  for (const order of orders) {
    const stage = S1_KEY.shifts.find((shift) => shift.abbreviation === order.abbreviation);
    if (order.sumEmployees !== stage.staffing || order.startShift !== stage.start || order.endShift !== stage.end) flag(report, `the sealed order ${order.abbreviation} is ${order.startShift}-${order.endShift} x${order.sumEmployees}`);
  }
  await endKeyModeIfShown(take);
  await freshPageInCut(take, ctx);
  await openMoreItemSilently(take, SEL_MORE_KEYS);
  await waitModalAtRest(page);
  await page.locator(keyRow(ctx.key.id)).locator(SEL_KEY_SHIFTS_BUTTON).click();
  await page.waitForFunction(([selector, count]) => document.querySelectorAll(selector).length === count, [SEL_KEY_SHIFT_ROWS, S1_KEY.shifts.length], { timeout: LIST_TIMEOUT_MS });
  report.keyShiftRows = await page.locator(SEL_KEY_SHIFT_ROWS).evaluateAll((elements) => elements.map((element) => element.innerText.replace(/\s+/g, " ").trim()));
  await checkNoOldTerm(take, "shifts of the set");
  await take.mouse.moveTo(await centerOf(take, SEL_KEY_SHIFTS_TITLE), MOVE.short);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await captions.show(SCENARIO_PLACEHOLDERS_CUES.keyShiftsAll);
  await recorder.endFast();
  await pauseOf(take, "keyShiftsAll");
  await clickSelector(take, SEL_MODAL_CLOSE, MOVE.short);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await recorder.beginFast(CUT);
  await endKeyModeIfShown(take);
  await freshPageInCut(take, ctx);
  await recorder.endFast();
}

async function centerOf(take, selector) {
  const box = await take.page.locator(selector).first().boundingBox();
  return box ? { x: box.x + box.width / HALF, y: box.y + box.height / HALF } : center(take);
}

/** Inside a cut: the same menu path without cursor travel. */
async function openMoreItemSilently(take, selector) {
  const { page } = take;
  await page.locator(SEL_MORE_BUTTON).click();
  await page.locator(SEL_MORE_MENU).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.locator(selector).click();
}

async function endKeyModeIfShown(take) {
  const { page, report } = take;
  if ((await page.locator(SEL_KEY_MODE_BAR).count()) === 0) return;
  (report.keyModeEnded ??= []).push(page.url());
  await page.locator(SEL_KEY_MODE_END).click();
  await page.locator(SEL_KEY_MODE_BAR).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
}

/** Inside a cut: the grid reloads late after the key mode ends (seen as a dark grid behind the next dialog on 1.0.62), so the page is opened again and framed as before. */
async function freshPageInCut(take, ctx) {
  const { page } = take;
  await readToasts(take);
  (ctx.toastLog ??= []).push(...(take.report.toasts ?? []));
  await openSchedule(page, take.options);
  await useRowOrder(take);
  await frame(take);
  await watchToasts(page);
}

/**
 * Beat standIns: ⋮, "Platzhalter anlegen"; the group is the one of the schedule (shown in the title, no field since 1.0.63), the period the default of the dialog. Opening the dialog
 * reloaded the grid of the schedule on 1.0.62 (dark grid with a spinner behind the dialog for about 1.5 s, reported); report.standInDialogReload says whether 1.0.63 still does it,
 * and the opening stays a cut that waits for that reload.
 */
async function createStandIns(take, ctx) {
  const { page, mouse, report, options } = take;
  const dialogReload = page.waitForResponse((response) => response.request().method() === HTTP_POST && response.url().includes(SCHEDULE_ROUTE_PART), { timeout: KEY_MODE_RELOAD_WAIT_MS }).catch(() => null);
  await openMoreItem(take, SEL_MORE_STAND_INS);
  await take.recorder.beginFast(CUT);
  await page.locator(SEL_STAND_IN_TITLE).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await waitModalAtRest(page);
  await page.locator(SEL_STAND_IN_GROUP_NAME).filter({ hasText: D.SITES.bern.group.name }).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  report.standInTitle = oneLine(await page.locator(SEL_STAND_IN_TITLE).innerText());
  report.standInDialogReload = Boolean(await dialogReload);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  await take.recorder.endFast();
  const count = page.locator(SEL_STAND_IN_COUNT);
  await mouse.clickLocator(count, MOVE.short);
  await count.fill("");
  await count.pressSequentially(String(S1_STAND_INS.count), { delay: TYPE_DELAY_MS });
  if ((await count.inputValue()) !== String(S1_STAND_INS.count)) throw new Error(`the count field holds "${await count.inputValue()}" instead of ${S1_STAND_INS.count}`);
  await typeField(take, SEL_STAND_IN_PATTERN, S1_STAND_INS.pattern);
  await pickQualifications(take);
  await parkOn(take, SEL_STAND_IN_TITLE);
  await pauseOf(take, "standInForm");
  const created = waitPost(page, STAND_INS_PATH);
  const reload = waitReload(take, null);
  await clickSelector(take, SEL_STAND_IN_SUBMIT, MOVE.normal);
  await take.recorder.beginFast(CUT);
  const response = await created;
  if (!response) {
    const problem = oneLine(await page.locator(SEL_STAND_IN_PROBLEM).innerText().catch(() => ""));
    throw new Error(`the placeholder dialog sent no request${problem ? `: ${problem}` : ""}`);
  }
  if (!response.ok()) throw new Error(`creating the placeholders answered HTTP ${response.status()}`);
  const body = response.request().postDataJSON();
  const list = await response.json();
  report.standInsCreated = { count: list.length, request: { count: body?.count, namePattern: body?.namePattern, groupId: body?.groupId, validFrom: body?.validFrom, validUntil: body?.validUntil, qualificationIds: body?.qualificationIds } };
  if ((body?.qualificationIds ?? []).length !== S1_STAND_INS.qualifications.length) flag(report, `the placeholders were sent with ${(body?.qualificationIds ?? []).length} qualifications instead of ${S1_STAND_INS.qualifications.length}`);
  if (list.length !== S1_STAND_INS.count) flag(report, `the dialog created ${list.length} placeholders instead of ${S1_STAND_INS.count}`);
  if (body?.groupId !== options.groupId) throw new Error(`the placeholders were created in group ${body?.groupId}`);
  if (body?.validFrom > S1_KEY.from || (body?.validUntil && body.validUntil < S1_KEY.until)) flag(report, `the placeholder membership ${body?.validFrom}..${body?.validUntil} does not cover the fair days`);
  ctx.standInIds = list.map((entry) => entry.id);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await settled(take, reload, "stand-ins");
  await take.recorder.endFast();
  await mouse.moveTo(center(take), MOVE.short);
  await pauseOf(take, "standInsDone");
}

/**
 * The qualification pull-down of the placeholder dialog, shown briefly: it is opened, each qualification of the stage is scrolled to the top of the list (1.0.63: the open list
 * reaches about 120 px below the dialog and covers its footer, so the cursor stays on the rows inside the dialog), ticked, and the pull-down is closed again with its toggle, so the
 * closed state shows the symbols. A fix of the pull-down (compact rows, scroll area, search) is planned for the next release.
 */
async function pickQualifications(take) {
  const { page, mouse, report } = take;
  await mouse.clickLocator(page.locator(SEL_QUALIFICATIONS), MOVE.short);
  await page.locator(SEL_QUALIFICATIONS_MENU).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  for (const name of S1_STAND_INS.qualifications) {
    const row = page.locator(SEL_QUALIFICATION_ROW).filter({ hasText: name }).first();
    if ((await row.count()) === 0) throw new Error(`the qualification "${name}" is not offered`);
    await row.evaluate((element) => element.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(FORM_SCROLL_SETTLE_MS);
    const box = row.locator(SEL_QUALIFICATION_CHECKBOX);
    await mouse.clickLocator(box, MOVE.short);
    if (!(await box.isChecked())) throw new Error(`the qualification "${name}" is not ticked after the click`);
    await pauseOf(take, "qualificationTicked");
  }
  await mouse.clickLocator(page.locator(SEL_QUALIFICATIONS), MOVE.short);
  await page.locator(SEL_QUALIFICATIONS_MENU).waitFor({ state: "hidden", timeout: S.READY_TIMEOUT_MS });
  report.qualificationSymbols = await page.locator(SEL_QUALIFICATION_SYMBOL).allInnerTexts();
  if (report.qualificationSymbols.length !== S1_STAND_INS.qualifications.length) flag(report, `the closed pull-down shows ${report.qualificationSymbols.length} symbols`);
}

/** Beat scenario: a new scenario carrying the set; the request must carry exactly the set. The shift list is searched for "Messe" inside the cut after saving (the wizard plans the searched list). */
async function createScenario(take, ctx) {
  const { page, mouse, report } = take;
  await openSelectorItem(take, SEL_SELECTOR_CREATE);
  await waitModalAtRest(page);
  await typeField(take, SEL_NAME_INPUT, S1_KEY.scenario);
  await pauseOf(take, "typed");
  await page.locator(SEL_KEY_CHOICES).waitFor({ state: "visible", timeout: LIST_TIMEOUT_MS });
  await checkNoOldTerm(take, "scenario dialog");
  const box = page.locator(keyChoice(ctx.key.id));
  await mouse.clickLocator(box, MOVE.normal);
  if (!(await box.isChecked())) throw new Error(`the set "${S1_KEY.name}" is not ticked after the click`);
  await pauseOf(take, "ticked");
  const created = waitPost(page, SCENARIO_CREATE_PATH);
  const reload = waitReload(take);
  await mouse.clickLocator(page.locator(SEL_SAVE), MOVE.normal);
  await take.recorder.beginFast(CUT);
  const response = await created;
  if (!response || !response.ok()) throw new Error(`creating the scenario answered HTTP ${response?.status()}`);
  const sent = sortedIds(response.request().postDataJSON()?.variantIds);
  if (!sameList(sent, sortedIds([ctx.key.id]))) throw new Error(`the scenario was created with the keys ${sent.join(",")}`);
  const scenario = await response.json();
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  await expectBanner(take, S1_KEY.scenario);
  await settled(take, reload, "create");
  await searchShifts(take, { visible: false });
  await take.recorder.endFast();
  const rows = await fairShiftRows(take, scenario.token);
  report.clones = { rows: rows.length, shifts: uniqueShiftIds(rows).length, marked: rows.filter((row) => row.isVariantShift).length };
  if (report.clones.shifts !== S1_KEY.shifts.length) flag(report, `the scenario lists ${report.clones.shifts} fair services instead of ${S1_KEY.shifts.length}`);
  if (report.clones.marked !== report.clones.rows) flag(report, `${report.clones.rows - report.clones.marked} fair rows lack the key marker`);
  ctx.fairIds = uniqueShiftIds(rows);
  await pauseOf(take, "created");
  return scenario;
}

/** Beat wizard: the AutoWizard button of the header on the searched shift list; anything else than the fair clones of the scenario cancels the job. */
async function planWithWizard(take, ctx, parent) {
  const { page, api, recorder, report, options } = take;
  if ((await page.locator(SEL_WIZARD_BUTTON).count()) === 0) throw new Error("the AutoWizard button is not shown");
  if ((await page.locator(SEL_WIZARD_DROPDOWN).count()) > 0) throw new Error("the wizard button is in dropdown mode - reload the page");
  const started = waitPost(page, AUTO_WIZARD_START_PATH);
  await clickSelector(take, SEL_WIZARD_BUTTON, MOVE.normal);
  const response = await started;
  if (!response || !response.ok()) throw new Error(`the AutoWizard start answered HTTP ${response?.status()}`);
  const request = response.request().postDataJSON();
  const { jobId } = await response.json();
  const shiftIds = sortedIds(request?.shiftIds);
  report.wizardStart = { agents: request?.agentIds?.length, shifts: shiftIds.length, token: request?.analyseToken };
  const problems = [];
  if (request?.analyseToken !== parent.token) problems.push(`token ${request?.analyseToken}`);
  if (request?.groupId !== options.groupId) problems.push(`group ${request?.groupId}`);
  if (request?.periodFrom !== D.PERIOD.from || request?.periodUntil !== D.PERIOD.until) problems.push(`period ${request?.periodFrom}..${request?.periodUntil}`);
  if (shiftIds.length === 0 || shiftIds.some((id) => !ctx.fairIds.includes(id))) problems.push(`shifts ${shiftIds.join(",")} are not only the fair clones`);
  if (problems.length > 0) {
    report.wizardStopped = await stopJob(api, jobId);
    throw new Error(`the AutoWizard was started outside the fair: ${problems.join("; ")}`);
  }
  await take.mouse.moveTo(center(take), MOVE.normal);
  await recorder.beginFast(CUT);
  const job = await waitForJob(api, page, jobId);
  await page.locator(SEL_BANNER).waitFor({ state: "visible", timeout: BANNER_TIMEOUT_MS }).catch(() => {});
  const finalId = job?.result?.finalScenarioId;
  report.wizardJob = { status: job?.status, reason: job?.reason ?? null, coverage: job?.result?.summary ? `${job.result.summary.filledSlots}/${job.result.summary.demandedSlots}` : null };
  if (job?.status !== JOB_STATUS_COMPLETED || !finalId) throw new Error(`the AutoWizard did not complete (${job?.status ?? "no status"}${job?.reason ? `: ${job.reason}` : ""})`);
  const child = await getScenario(api, finalId);
  if (child.groupId !== options.groupId) throw new Error(`the wizard result belongs to group ${child.groupId}`);
  if (!sameList(sortedIds(child.variantIds), sortedIds([ctx.key.id]))) throw new Error(`the wizard result carries the keys ${sortedIds(child.variantIds).join(",")}`);
  const others = (await activeScenarios(api, options.groupId)).filter((scenario) => scenario.id !== child.id);
  for (const scenario of others) await api.json(`${SCENARIOS_API}/${scenario.id}/${REJECT_SEGMENT}`, { method: HTTP_POST, data: {} });
  const renamed = await api.json(`${SCENARIOS_API}/${child.id}/${RENAME_SEGMENT}`, { method: HTTP_PATCH, data: { name: S1_KEY.scenario } });
  const after = await getScenario(api, child.id);
  if (after.status !== SCENARIO_STATUS_ACTIVE) throw new Error(`the wizard result has status ${after.status} after the other scenarios were rejected`);
  report.wizardRun = { finalId: child.id, originalName: child.name, rejected: others.map((scenario) => scenario.name) };
  return { ...after, name: renamed?.name ?? S1_KEY.scenario };
}

/** Inside the cut after the wizard: pool rows first, placeholders right below, the rest after; fresh page with the result selected and the frame of the fair days. */
async function showResultInCut(take, ctx, scenario) {
  const { page, api, options } = take;
  await readToasts(take);
  (ctx.toastLog ??= []).push(...(take.report.toasts ?? []));
  await orderRows(take, await api.schedule(scenarioFilter(ctx.decemberFilter, scenario.token)));
  await openSchedule(page, options);
  await useRowOrder(take);
  await frame(take);
  await watchToasts(page);
  await page.waitForFunction((selector) => document.querySelectorAll(selector).length >= 1, "[data-scenario-id]", { state: "attached", timeout: S.READY_TIMEOUT_MS }).catch(() => {});
  await selectVariant(take, scenario, { cutWait: false });
  await searchShifts(take, { visible: false });
}

/** The fair works of the result, counted by person kind. */
async function countResult(take, ctx, scenario) {
  const { api, report, script } = take;
  const data = await api.schedule(scenarioFilter(ctx.decemberFilter, scenario.token));
  const kindOf = new Map(data.clients.map((client) => [client.id, client.type === ENTITY_TYPE_STAND_IN ? "standIn" : "real"]));
  const fair = worksIn(data, S1_KEY.from, S1_KEY.until).filter(isFairWork);
  const demanded = demandPerDay() * fairDayCount();
  const real = fair.filter((work) => kindOf.get(work.clientId) === "real").length;
  const standIn = fair.filter((work) => kindOf.get(work.clientId) === "standIn").length;
  const perDay = {};
  for (const work of fair) {
    const day = dateKey(work.entryDate);
    perDay[day] ??= { real: 0, standIn: 0 };
    perDay[day][kindOf.get(work.clientId)] += 1;
  }
  report.result = { demanded, filled: fair.length, real, standIn, perDay, usedStandIns: new Set(fair.filter((work) => kindOf.get(work.clientId) === "standIn").map((work) => work.clientId)).size };
  if (fair.length !== demanded) flag(report, `the wizard filled ${fair.length} of ${demanded} fair places`);
  if (real <= standIn) flag(report, `real people hold ${real} fair places, placeholders ${standIn}: the placeholders are not only the rest`);
  report.optimizer = { real, standIn, expectedReal: script.expectedRealSlots, deviation: real - script.expectedRealSlots };
  if (real !== script.expectedRealSlots) console.log(`! optimizer: real people hold ${real} fair places, expected ${script.expectedRealSlots} on 1.0.63 (product finding)`);
  if (real < script.minRealSlots) flag(report, `real people hold ${real} fair places, fewer than ${script.minRealSlots}: placeholders displace real people (product finding)`);
  if (standIn === 0) flag(report, "no placeholder got a fair place, the clip would not show them");
}

async function showSummary(take, scenario) {
  const { page, api, report } = take;
  const summary = await api.json(`${SCENARIOS_API}/${scenario.id}/${SUMMARY_SEGMENT}`);
  const sections = (summary?.variants ?? []).map((variant) => ({ name: variant.name, demanded: variant.demandedSlots, filled: variant.filledSlots, copied: variant.copiedShiftCount }));
  report.summary = sections;
  const section = sections.find((entry) => entry.name === S1_KEY.name);
  if (sections.length !== 1 || !section) flag(report, `the summary lists ${sections.map((entry) => entry.name).join(",") || "no key"}`);
  else if (section.filled !== section.demanded) flag(report, `the summary shows ${section.filled}/${section.demanded}`);
  await clickSelector(take, SEL_BANNER_SUMMARY, MOVE.normal);
  const list = page.locator(SEL_SUMMARY_KEYS);
  await list.waitFor({ state: "visible", timeout: LIST_TIMEOUT_MS });
  await list.scrollIntoViewIfNeeded();
  await waitModalAtRest(page);
  report.summaryDialog = await page.locator(SEL_SUMMARY_KEY).evaluateAll((elements) => elements.map((element) => element.innerText.replace(/\s+/g, " ").trim()));
  await parkOn(take, SEL_SUMMARY_KEYS);
  await pauseOf(take, "summary");
  await clickSelector(take, SEL_SUMMARY_CLOSE, MOVE.short);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
}

async function verifyFinished(take, ctx) {
  const { api, report } = take;
  const real = await api.schedule(ctx.decemberFilter);
  const after = worksIn(real, D.PERIOD.from, D.PERIOD.until).map(semanticKey).sort();
  report.realPlanUnchanged = sameList(after, ctx.planBefore);
  if (!report.realPlanUnchanged) flag(report, "the real December changed during the take");
  const watched = (report.httpErrors ?? []).filter((line) => WATCHED_ERROR_PATH.test(line));
  if (watched.length > 0) flag(report, `HTTP errors: ${watched.join("; ")}`);
  const logged = [...(ctx.toastLog ?? []), ...(report.toasts ?? [])];
  const errors = logged.filter((text) => ERROR_TOAST_PATTERN.test(text));
  if (errors.length > 0) flag(report, `error toast during the take: ${errors.join(" | ")}`);
}

export async function takeScenarioPlaceholders(take) {
  const { page, api, options, recorder, report, captions, script } = take;
  requireScript(script);
  const cues = SCENARIO_PLACEHOLDERS_CUES;
  await checkStage(take, D.SITES.bern);
  const first = await openSchedule(page, options);
  if (first.filter.periodStartDate !== D.PERIOD.from || first.filter.periodEndDate !== D.PERIOD.until) throw new Error(`the schedule shows ${first.filter.periodStartDate}..${first.filter.periodEndDate} instead of December`);
  const decemberFilter = realFilter(first.filter);
  const data = await api.schedule(decemberFilter);
  const customer = await checkFreshStage(take, data);
  const ctx = { decemberFilter, customer, planBefore: worksIn(data, D.PERIOD.from, D.PERIOD.until).map(semanticKey).sort() };
  await orderRows(take, data);
  await openSchedule(page, options);
  await useRowOrder(take);
  await frame(take);
  await watchToasts(page);
  trackHttpErrors(take);
  await checkPage(take, "start");

  await recorder.start();
  try {
    await captions.show(cues.team);
    await pauseOf(take, "team");
    await captions.show(cues.ask);
    await pauseOf(take, "start");
    await askKlacksy(take, ctx);

    await captions.show(cues.key);
    await createKey(take, ctx);

    await captions.show(cues.keyShifts);
    await fillKeyShifts(take, ctx);
    await checkPage(take, "key");
    await checkNoOldTerm(take, "after the set");

    await captions.show(cues.standIns);
    await createStandIns(take, ctx);
    await checkPage(take, "standIns");

    await captions.show(cues.scenario);
    const parent = await createScenario(take, ctx);

    await captions.show(cues.wizard);
    await pauseOf(take, "wizardLead");
    const result = await planWithWizard(take, ctx, parent);
    await showResultInCut(take, ctx, result);
    await countResult(take, ctx, result);
    await captions.show(cues.real);
    await recorder.endFast();
    await pauseOf(take, "real");
    await showRowAtTop(take, take.report.rowOrder.pool - script.poolRowsAbovePlaceholders);
    await captions.show(cues.plan);
    await pauseOf(take, "plan");
    await checkPage(take, "plan");
    await checkNoOldTerm(take, "plan");

    await captions.show(cues.summary);
    await showSummary(take, result);
    await readToasts(take);
    await verifyFinished(take, ctx);
    await take.mouse.moveTo(center(take), MOVE.normal);
    await holdWithPoster(take, take.finalHoldMs);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale } });
  }
}
