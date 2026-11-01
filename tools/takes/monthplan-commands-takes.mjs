// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip M2 "Wünsche vor dem Plan" (series Monatsplanung, security demo Bern, lib/security-demo.mjs). It needs a throw-away copy of the stage database
 * klacks_marketing_security_bern_m2 (vacation booked, no commands; the rows are reordered and commands are typed, so the master is never recorded on) and --group-id of "Bern Objektschutz".
 * monthplan-commands (1280x720): the settings section "Planungsbefehle (Keywords)" with the explanation of the commands (the field of the token without any effect is hidden by MONTHPLAN_COMMANDS_CSS, the same CSS hides the loading overlay that greys the page after each saved cell),
 * the schedule with the shift area open explains the bands on the real Empfang row, the toggle "Befehle anzeigen", nine commands typed into the cells of Mia, Jonas and Lena at slider 100 (three of them are typed in a cut region to keep the length)
 * (the row order of the app brings the three together), the AutoWizard button (never the chat) plans the month time-compressed with the badge, the proposal stays a scenario, the same
 * cells are read at slider 100 (the plan is not deterministic and a veto does not force a shift, so the take picks the three proof cells after the run, cells with a work first, and writes their captions
 * from the API: the texts of proofOne..proofThree in simple-videos.<culture>.json are replaced at run time), and a planner types OBT onto Mia's FREE day inside the scenario. The take never accepts: the proposal is a proof, the accept is the story of clip M3.
 * What the clip says about the commands: they bind the AutoWizard (caption binding), what cannot be met stays empty (caption open, general: no open slot of the proposal is pointed at or tied to a command, the cursor rests
 * on the free part of the scenario banner while it runs, never on a cell), and a planner may ignore them at any time (caption manual). Whether a direct placement against a command gets a hint is never claimed: PreCommitCheckResult in Klacks.Api says the post-commit
 * check does not evaluate day directives yet; the take reads the answer after the last picture (report.manualWorkResponse, errorBadgeBeforeManual, errorBadgeAfterManual, errorListAfterManual, errorListHasDirective, the screenshot error-list.png next to the frames).
 * A command is a veto, it does not force a shift: NIGHT allows nothing but night, an empty day holds it too.
 * Publishable criterion (report.publishable, every part is read from the API, not from the screen): every typed command was stored by a POST of the cell and the real December then holds exactly those
 * commands; the start request names the group of the take, December 1-31, 10 agents and 6 shifts; stage 3 ran; the scenario belongs to the group and lies inside December and carries the same commands;
 * before the manual placement no work of the scenario breaks a command (bands as in ShiftTypeInference: span, end exclusive, night beats late beats early; several commands of a day restrict
 * together; FREE also refuses a night that starts the evening before) and at least two of the three proof cells hold a work and Mia's FREE day holds none; the manual OBT lands in the scenario on Mia's FREE day
 * with HTTP 200, and no hint text appears in the page; no accept request, the real December holds no work at the end; no error toast, no HTTP error on a schedule, command or work call; the settings page hides the -FREE field and no
 * text "Winterthur", "Uster" or "-FREE" is on the page at the checkpoints; report.coverage names any open slot of the proposal (KLACKS_SECURITY_ACCEPT_GAP=1 lets it pass, nothing is accepted here).
 * After each saved cell the app reloads and the canvas stays dark for about 0.2 s; for every preview so far those frames were replaced by the frame before them and the take was encoded again; preview v2 also lost 1.45 s of the static hold after the manual placement, right before the cue decide, to stay within 90 s; preview v3 is the take of v2 with the pills of binding, open and manual redrawn on the frames, so its texts were never recorded and the 46 characters of manual exceed MAX_CAPTION_CHARS of a new recording (none of this is part of this script).
 * Captions come from simple-videos.<culture>.json, the beats from the script entry in capture-app-videos.scripts.json, so timing changes need no code change.
 * Cultures de, en, fr, it: the tab of the error list is the second tab of #shift-tabs, the hint text comes from lib/ui-texts.mjs, and the proof captions are built from the "proof" templates of the script entry of the culture
 * (caption, shown, noShift, band names); only the three captions that are shown are checked against the 42 characters, a longer candidate that is not picked does not stop the take.
 * @param take - page, api, options, recorder, mouse, report, captions, script, viewport, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import path from "node:path";
import * as S from "../lib/klacks-demo-session.mjs";
import { CANVAS_SETTLE_MS, CELL_WIDTH_PX, HALF, HTTP_POST, SUB_ROW_HEIGHT_PX, dateKey, gridBox, openSchedule, rowBoxes, worksIn } from "../lib/schedule-grid.mjs";
import { realFilter, scenarioFilter } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import { ENTRY_TYPE_COMMAND } from "../lib/security-plan-check.mjs";
import { clickSelector, flag, holdWithPoster, trackNetwork } from "./scenario-takes.mjs";
import { useRowOrder } from "./replacement-takes.mjs";
import { checkStage, fitAllRows, measure, readToasts, scrollColumns, setRowSlider, startWizard, trackHttpErrors, waitForProposal, watchToasts } from "./security-takes.mjs";
import { fillCaption } from "../lib/caption-template.mjs";
import { uiTexts } from "../lib/ui-texts.mjs";

export const VIDEO_MONTHPLAN_COMMANDS = "monthplan-commands";
export const MONTHPLAN_COMMANDS_VIDEOS = [VIDEO_MONTHPLAN_COMMANDS];
export const MONTHPLAN_COMMANDS_CUES = Object.freeze({
  keywords: "keywords",
  free: "free",
  only: "only",
  notKind: "notKind",
  bands: "bands",
  strongest: "strongest",
  toggle: "toggle",
  type: "type",
  eveBefore: "eveBefore",
  combine: "combine",
  others: "others",
  run: "run",
  proposal: "proposal",
  binding: "binding",
  proofFree: "proofFree",
  proofOne: "proofOne",
  proofTwo: "proofTwo",
  proofThree: "proofThree",
  open: "open",
  manual: "manual",
  decide: "decide",
});
export const MONTHPLAN_COMMANDS_FINAL_HOLD_MS = 2500;
export const MONTHPLAN_COMMANDS_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
export const MONTHPLAN_COMMANDS_CSS = "#scheduling-defaults-command-free-row .secondColumn { visibility: hidden !important; } app-spinner-wrapper { display: none !important; }";

const SETTINGS_ROUTE = "/workplace/settings";
const SEL_KEYWORDS_HEADER = "#scheduling-defaults-command-keywords-header";
const SEL_NEG_FREE_CELL = "#scheduling-defaults-command-free-row .secondColumn";
const SEL_FIELD = Object.freeze({ free: "#sdCommandKeywordFree", early: "#sdCommandKeywordEarly", late: "#sdCommandKeywordLate", night: "#sdCommandKeywordNight", negEarly: "#sdCommandKeywordNegEarly", negLate: "#sdCommandKeywordNegLate", negNight: "#sdCommandKeywordNegNight" });
const SEL_COMMANDS_TOGGLE = "#schedule-commands-toggle";
const SORT_ORDER_API = "/api/backend/clientsortpreferences";
const COMMANDS_PATH = /\/ScheduleCommands$/i;
const WORKS_POST_PATH = /\/Works\/?$/i;
const WATCHED_ERROR_PATH = /\/ScheduleCommands|\/Works|\/AutoWizard|\/AnalyseScenarios\//i;
const HTTP_PUT = "PUT";
const FORBIDDEN_TEXTS = Object.freeze([D.FOREIGN_NAME_FRAGMENT, D.NEUTRAL_TOWN, "-FREE"]);
const COLUMNS_SCROLLED = 11;
const SAVE_TIMEOUT_MS = 30000;
const CUT = Number.POSITIVE_INFINITY;
const TYPE_DELAY_MS = 70;
const MOVE = { short: 300, normal: 650 };
const TEAM_SIZE = 10;
const ROWS = Object.freeze({ Mia: 0, Jonas: 1, Lena: 2 });
const STORY_ROWS = Object.keys(ROWS);
const EMPFANG_ROW_Y = 632;
const FREE = "FREE";
const FREE_DAY = "2026-12-18";
const MANUAL_SHIFT = "OBT";
const ENTRY_TYPE_WORK = 0;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;
const EARLY_BAND_START = 360;
const LATE_BAND_START = 900;
const NIGHT_BAND_START = 1380;
const KIND = Object.freeze({ early: "EARLY", late: "LATE", night: "NIGHT" });
const ALL_KINDS = Object.freeze(Object.values(KIND));
const typed = (firstName, day, keyword, subRow = 0) => Object.freeze({ firstName, day, keyword, subRow });
export const TYPED = Object.freeze([
  typed("Mia", FREE_DAY, FREE),
  typed("Mia", "2026-12-17", "-NIGHT"),
  typed("Jonas", "2026-12-15", "-NIGHT"),
  typed("Jonas", "2026-12-15", "-LATE", 1),
  typed("Jonas", "2026-12-16", "EARLY"),
  typed("Jonas", "2026-12-17", "-EARLY"),
  typed("Lena", "2026-12-14", "LATE"),
  typed("Lena", "2026-12-15", "NIGHT"),
  typed("Lena", "2026-12-16", "NIGHT"),
]);
const TYPED_WITH_CUE = Object.freeze({ 0: "type", 1: "eveBefore", 2: "combine", 4: "others" });
const TYPED_OFF_PICTURE = Object.freeze([5, 6, 7]);
const FAST_FACTOR_RUN = 80;

export const PROOF_ORDER = Object.freeze([["Mia", "2026-12-17"], ["Jonas", "2026-12-17"], ["Lena", "2026-12-16"], ["Jonas", "2026-12-15"], ["Lena", "2026-12-15"], ["Jonas", "2026-12-16"], ["Lena", "2026-12-14"]]);
const PROOF_CUES = Object.freeze(["proofOne", "proofTwo", "proofThree"]);
const PROOF_MIN_WITH_WORK = 2;
const PROOF_CAPTION = "caption";
const PROOF_SHOWN = "shown";
const PROOF_FIELDS = Object.freeze([PROOF_CAPTION, PROOF_SHOWN, "noShift", "bands"]);
const SEL_ERROR_LIST = "app-schedule-error-list";
const SEL_SHIFT_TAB = "#shift-tabs .nav-link";
const ERROR_TAB_INDEX = 1;
const SEL_ERROR_BADGE = "#shift-tabs .badge";
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const ERROR_LIST_GUTTER_Y = 340;
const POST_COMMIT_WAIT_MS = 6000;
const SPLIT_DIRECTION_VERTICAL = "vertical";
const OPEN_CAPTION_CURSOR = Object.freeze({ x: 815, y: 150 });
const ERROR_LIST_SHOT = "error-list.png";
const REPORT_TEXT_LIMIT = 600;

const pauseOf = (take, beat) => take.page.waitForTimeout(take.script.beats[beat]);
const commandKey = (clientId, day, keyword) => `${clientId}|${day}|${keyword}`;
const addDay = (day, delta) => new Date(Date.parse(`${day}T00:00:00Z`) + delta * MINUTES_PER_DAY * 60000).toISOString().slice(0, 10);
const minutesOf = (time) => { const [hours, minutes] = String(time).split(":").map(Number); return hours * MINUTES_PER_HOUR + minutes; };

/** The same reading as ShiftTypeInference.FromSpan: the span decides, the end is exclusive, night beats late beats early. */
export function bandOf(startTime, endTime) {
  const start = minutesOf(startTime);
  const end = minutesOf(endTime);
  const spans = end > start ? [[start, end]] : [[start, MINUTES_PER_DAY], [0, end]];
  const touches = (from, until) => spans.some(([a, b]) => a < until && b > from);
  if (touches(NIGHT_BAND_START, MINUTES_PER_DAY) || touches(0, EARLY_BAND_START)) return KIND.night;
  return touches(LATE_BAND_START, NIGHT_BAND_START) ? KIND.late : KIND.early;
}

/** The same reading as ScheduleCommandKeywordCombiner: every command of a day restricts the set of allowed kinds. */
export function allowedKinds(keywords) {
  return keywords.reduce((allowed, keyword) => {
    if (keyword === FREE) return [];
    if (ALL_KINDS.includes(keyword)) return allowed.filter((kind) => kind === keyword);
    return allowed.filter((kind) => `-${kind}` !== keyword);
  }, [...ALL_KINDS]);
}

/** Every work of the given plan that a typed command forbids, plus a night that starts on the eve of a FREE day. */
export function commandViolations(data, clientIdOf) {
  const works = data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_WORK);
  const findings = [];
  for (const firstName of STORY_ROWS) {
    const clientId = clientIdOf[firstName];
    const days = [...new Set(TYPED.filter((command) => command.firstName === firstName).map((command) => command.day))];
    for (const day of days) {
      const keywords = TYPED.filter((command) => command.firstName === firstName && command.day === day).map((command) => command.keyword);
      const allowed = allowedKinds(keywords);
      for (const work of works.filter((entry) => entry.clientId === clientId && dateKey(entry.entryDate) === day)) {
        const band = bandOf(work.startTime, work.endTime);
        if (!allowed.includes(band)) findings.push(`${firstName} ${day} ${keywords.join("+")}: ${work.abbreviation} is ${band}`);
      }
      if (keywords.includes(FREE)) {
        const eve = works.filter((entry) => entry.clientId === clientId && dateKey(entry.entryDate) === addDay(day, -1) && minutesOf(entry.endTime) <= minutesOf(entry.startTime));
        if (eve.length > 0) findings.push(`${firstName} ${day} FREE: a night of the day before runs into it`);
      }
    }
  }
  return findings;
}

async function checkPage(take, label) {
  const text = await take.page.evaluate(() => document.body.innerText);
  const found = FORBIDDEN_TEXTS.filter((word) => text.includes(word));
  (take.report.textChecks ??= []).push({ label, found });
  if (found.length > 0) flag(take.report, `"${found.join(", ")}" is on the page at "${label}"`);
}

async function checkDecember(take, filter) {
  const { api, report } = take;
  if (filter.periodStartDate !== D.PERIOD.from || filter.periodEndDate !== D.PERIOD.until) throw new Error(`the schedule shows ${filter.periodStartDate}..${filter.periodEndDate} instead of December`);
  const decemberFilter = realFilter(filter);
  const data = await api.schedule(decemberFilter);
  if (data.clients.length !== TEAM_SIZE) throw new Error(`the group shows ${data.clients.length} employees instead of ${TEAM_SIZE}`);
  const works = worksIn(data, D.PERIOD.from, D.PERIOD.until).length;
  const commands = data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_COMMAND).length;
  if (works !== 0 || commands !== 0) throw new Error(`December holds ${works} works and ${commands} commands - use a fresh copy of the stage database`);
  const clientIdOf = Object.fromEntries(STORY_ROWS.map((firstName) => {
    const client = data.clients.find((entry) => entry.firstName === firstName);
    if (!client) throw new Error(`${firstName} is not in the schedule of the group`);
    return [firstName, client.id];
  }));
  return { decemberFilter, data, clientIdOf };
}

/** The row order a planner would drag: the three people of the story on top, the others behind them. */
async function orderRows(take, clients, groupId) {
  const story = STORY_ROWS.map((firstName) => clients.find((client) => client.firstName === firstName));
  const ordered = [...story, ...clients.filter((client) => !story.includes(client))];
  await take.api.json(`${SORT_ORDER_API}/${groupId}`, { method: HTTP_PUT, data: ordered.map((client, sortOrder) => ({ clientId: client.id, sortOrder })) });
}

async function cell(take, firstName, day, subRow) {
  const grid = await gridBox(take.page);
  const boxes = await rowBoxes(take.page);
  const visibleColumn = Number(day.slice(-2)) - 1 - COLUMNS_SCROLLED;
  return { x: grid.x + (visibleColumn + 1 / HALF) * CELL_WIDTH_PX, y: boxes[ROWS[firstName]].top + (subRow + 1 / HALF) * SUB_ROW_HEIGHT_PX };
}

async function typeIntoCell(take, target, text, pathPattern) {
  const { page, mouse } = take;
  const saved = page.waitForResponse((response) => response.request().method() === HTTP_POST && pathPattern.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  saved.catch(() => {});
  await mouse.doubleClick(target, MOVE.short);
  await pauseOf(take, "editor");
  await page.keyboard.type(text, { delay: TYPE_DELAY_MS });
  await page.keyboard.press("Enter");
  const response = await saved;
  if (!response.ok()) throw new Error(`typing ${text} returned HTTP ${response.status()}`);
  await pauseOf(take, "typed");
  return response;
}

async function pointAtField(take, selector, beat) {
  const box = await take.page.locator(selector).boundingBox();
  await take.mouse.moveTo({ x: box.x + box.width / HALF, y: box.y + box.height / HALF }, MOVE.normal);
  await pauseOf(take, beat);
}

async function showSettings(take) {
  const { captions } = take;
  const cues = MONTHPLAN_COMMANDS_CUES;
  await captions.show(cues.keywords);
  await pauseOf(take, "keywords");
  await captions.show(cues.free);
  await pointAtField(take, SEL_FIELD.free, "free");
  await captions.show(cues.only);
  await pointAtField(take, SEL_FIELD.early, "field");
  await pointAtField(take, SEL_FIELD.late, "field");
  await pointAtField(take, SEL_FIELD.night, "field");
  await captions.show(cues.notKind);
  await pointAtField(take, SEL_FIELD.negEarly, "field");
  await pointAtField(take, SEL_FIELD.negLate, "field");
  await pointAtField(take, SEL_FIELD.negNight, "field");
}

async function showBands(take) {
  const { page, captions, mouse } = take;
  const cues = MONTHPLAN_COMMANDS_CUES;
  await captions.show(cues.bands);
  await pauseOf(take, "bands");
  await captions.show(cues.strongest);
  const grid = await gridBox(page);
  await mouse.moveTo({ x: grid.x + CELL_WIDTH_PX / HALF, y: EMPFANG_ROW_Y }, MOVE.normal);
  await pauseOf(take, "strongest");
}

async function typeCommands(take, ctx) {
  const { api, captions, report } = take;
  for (const [index, command] of TYPED.entries()) {
    if (TYPED_WITH_CUE[index]) await captions.show(TYPED_WITH_CUE[index]);
    const offPicture = TYPED_OFF_PICTURE.includes(index);
    if (offPicture) await take.recorder.beginFast(CUT);
    await typeIntoCell(take, await cell(take, command.firstName, command.day, command.subRow), command.keyword, COMMANDS_PATH);
    if (offPicture) await take.recorder.endFast();
    if (TYPED_WITH_CUE[index + 1] || index === TYPED.length - 1) await pauseOf(take, "typedGroup");
  }
  const stored = (await api.schedule(ctx.decemberFilter)).entries.filter((entry) => entry.entryType === ENTRY_TYPE_COMMAND);
  const storedKeys = stored.map((entry) => commandKey(entry.clientId, dateKey(entry.entryDate), entry.description?.de ?? entry.commandKeyword ?? entry.abbreviation)).sort();
  const expectedKeys = TYPED.map((command) => commandKey(ctx.clientIdOf[command.firstName], command.day, command.keyword)).sort();
  report.commandsStored = stored.length;
  if (JSON.stringify(storedKeys) !== JSON.stringify(expectedKeys)) flag(report, `the real December holds ${JSON.stringify(storedKeys)} instead of the typed commands`);
}

/** What the screen is about to show, read from the API: the works in the proof cells and the commands of the scenario. */
async function readProposal(take, ctx, scenario) {
  const { api, report } = take;
  const data = await api.schedule(scenarioFilter(ctx.decemberFilter, scenario.token));
  report.scenarioCommands = data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_COMMAND).length;
  if (report.scenarioCommands !== TYPED.length) flag(report, `the scenario holds ${report.scenarioCommands} commands instead of ${TYPED.length}`);
  report.proofCells = {};
  for (const firstName of STORY_ROWS) {
    const days = [...new Set(TYPED.filter((command) => command.firstName === firstName).map((command) => command.day))].sort();
    for (const day of days) {
      report.proofCells[`${firstName} ${day}`] = data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_WORK && entry.clientId === ctx.clientIdOf[firstName] && dateKey(entry.entryDate) === day).map((entry) => `${entry.abbreviation} ${entry.startTime}-${entry.endTime}`);
    }
  }
  report.proofEveOfFree = data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_WORK && entry.clientId === ctx.clientIdOf.Mia && dateKey(entry.entryDate) === addDay(FREE_DAY, -1)).map((entry) => entry.abbreviation);
  report.emptyProofCells = Object.entries(report.proofCells).filter(([, works]) => works.length === 0).map(([key]) => key);
  ctx.proof = pickProof(take, ctx, data);
  report.proofViolations = commandViolations(data, ctx.clientIdOf);
  if (report.proofViolations.length > 0) flag(report, `the proposal breaks a command: ${report.proofViolations.join("; ")}`);
  if (report.proofCells[`Mia ${FREE_DAY}`].length !== 0) flag(report, "Mia works on her FREE day in the proposal");
}

/** The proof caption of one cell from the templates of the script entry (capture-app-videos.scripts.json, "proof"): command text, name, day of December and the work found there. */
export function proofText(proof, cell, limit) {
  const shown = cell.work ? fillCaption(proof[PROOF_SHOWN], { abbreviation: cell.work.abbreviation, band: proof.bands[bandOf(cell.work.startTime, cell.work.endTime)] }, limit) : proof.noShift;
  return fillCaption(proof[PROOF_CAPTION], { keywords: cell.keywords, name: cell.firstName, day: cell.day, shown }, limit);
}

/** The three cells the take reads aloud, with their captions built from the plan: at most one per command text, cells with a work first. */
function pickProof(take, ctx, data) {
  const { report, captions, script } = take;
  const candidates = PROOF_ORDER.map(([firstName, day]) => {
    const keywords = TYPED.filter((command) => command.firstName === firstName && command.day === day).map((command) => command.keyword).join(" ");
    const [work] = data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_WORK && entry.clientId === ctx.clientIdOf[firstName] && dateKey(entry.entryDate) === day);
    return { firstName, day, keywords, hasWork: Boolean(work), cell: { keywords, firstName, day: Number(day.slice(-2)), work } };
  });
  const distinct = [...candidates.filter((item) => item.hasWork), ...candidates.filter((item) => !item.hasWork)].filter((item, index, all) => all.findIndex((other) => other.keywords === item.keywords) === index);
  const proof = distinct.slice(0, PROOF_CUES.length);
  report.proofCaptions = proof.map((item) => proofText(script.proof, item.cell, Number.POSITIVE_INFINITY));
  if (proof.filter((item) => item.hasWork).length < PROOF_MIN_WITH_WORK) flag(report, `only ${proof.filter((item) => item.hasWork).length} proof cells hold a work: ${report.proofCaptions.join(" | ")}`);
  proof.forEach((item, index) => {
    captions.track[PROOF_CUES[index]] = proofText(script.proof, item.cell);
  });
  return proof;
}

/** The vertical splitter pulled back up, so the error list has room. Runs inside a cut region. */
async function openErrorList(take) {
  const { page, mouse } = take;
  const gutters = await page.locator(SEL_SPLIT_GUTTER).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, direction: element.parentElement?.getAttribute("direction") };
  }));
  const gutter = gutters.find((candidate) => candidate.direction === SPLIT_DIRECTION_VERTICAL);
  if (!gutter) throw new Error("the splitter between the grid and the shift area was not found");
  await mouse.drag({ x: gutter.x, y: Math.min(gutter.y, take.viewport.height - 2) }, { x: gutter.x, y: ERROR_LIST_GUTTER_Y }, MOVE.normal);
  await page.locator(SEL_SHIFT_TAB).nth(ERROR_TAB_INDEX).click({ timeout: S.READY_TIMEOUT_MS });
  await page.locator(SEL_ERROR_LIST).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
}

/** The hint question, answered from the app itself: what the error list says after the manual placement. Runs after the last picture, inside a cut region; a failed read is reported as such, never as an empty list. */
async function readErrorList(take) {
  const { page, report, captions } = take;
  try {
    await captions.hide();
    await page.waitForTimeout(POST_COMMIT_WAIT_MS);
    await openErrorList(take);
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    report.errorListRead = true;
    report.errorBadgeAfterManual = await page.locator(SEL_ERROR_BADGE).first().textContent({ timeout: CANVAS_SETTLE_MS }).catch(() => null);
    report.errorListAfterManual = (await page.locator(SEL_ERROR_LIST).first().innerText()).replace(/\s+/g, " ").trim().slice(0, REPORT_TEXT_LIMIT);
    report.errorListHasDirective = report.errorListAfterManual.includes(uiTexts(take.culture).dayDirective);
    await page.screenshot({ path: path.join(process.env.KLACKS_VIDEO_FRAMES_DIR ?? ".", ERROR_LIST_SHOT) });
  } catch (error) {
    report.errorListRead = false;
    report.errorListReadError = String(error?.message ?? error).slice(0, REPORT_TEXT_LIMIT);
  }
}

async function placeManually(take, ctx, scenario) {
  const { api, page, report } = take;
  report.errorBadgeBeforeManual = await page.locator(SEL_ERROR_BADGE).first().textContent({ timeout: CANVAS_SETTLE_MS }).catch(() => null);
  const response = await typeIntoCell(take, await cell(take, "Mia", FREE_DAY, 1), MANUAL_SHIFT, WORKS_POST_PATH);
  report.manualWorkResponse = { status: response.status(), body: (await response.text().catch(() => "")).slice(0, REPORT_TEXT_LIMIT) };
  const data = await api.schedule(scenarioFilter(ctx.decemberFilter, scenario.token));
  report.manualPlacement = data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_WORK && entry.clientId === ctx.clientIdOf.Mia && dateKey(entry.entryDate) === FREE_DAY).map((entry) => entry.abbreviation);
  if (!report.manualPlacement.includes(MANUAL_SHIFT)) flag(report, "the manual OBT is not in the scenario");
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  report.hintOnPage = (await page.evaluate(() => document.body.innerText)).includes(uiTexts(take.culture).dayDirective);
}

async function verifyNotAccepted(take, ctx) {
  const { api, report } = take;
  report.acceptRequests = ctx.acceptRequests;
  if (ctx.acceptRequests !== 0) flag(report, `${ctx.acceptRequests} accept requests were sent, the take never accepts`);
  report.realWorksAtEnd = worksIn(await api.schedule(ctx.decemberFilter), D.PERIOD.from, D.PERIOD.until).length;
  if (report.realWorksAtEnd !== 0) flag(report, `the real December holds ${report.realWorksAtEnd} works at the end`);
  const watched = (report.httpErrors ?? []).filter((line) => WATCHED_ERROR_PATH.test(line));
  if (watched.length > 0) flag(report, `HTTP errors: ${watched.join("; ")}`);
}

/** Layout of the schedule pictures: story rows on top, shift area collapsed, slider at 100, the columns moved so the 14th to the 23rd stand in the frame. Runs inside a cut region. */
async function frameDetail(take) {
  await useRowOrder(take);
  await fitAllRows(take);
  await setRowSlider(take, true);
  await scrollColumns(take, COLUMNS_SCROLLED, 1);
}

export async function takeMonthplanCommands(take) {
  const { page, options, recorder, mouse, report, captions, script } = take;
  if (!script?.beats) throw new Error(`the ${report.video} script lacks beats in capture-app-videos.scripts.json`);
  const missingProof = PROOF_FIELDS.filter((field) => script.proof?.[field] === undefined);
  if (missingProof.length > 0) throw new Error(`the ${report.video} script lacks proof.${missingProof.join(", proof.")} in capture-app-videos.scripts.json`);
  uiTexts(take.culture);
  const cues = MONTHPLAN_COMMANDS_CUES;
  await checkStage(take, D.SITES.bern);
  const first = await openSchedule(page, options);
  const { decemberFilter, data, clientIdOf } = await checkDecember(take, first.filter);
  await orderRows(take, data.clients, options.groupId);
  const ctx = { created: [], reassigned: [], acceptRequests: 0, scheduleTokens: [], realIds: new Set(), originalClient: new Map(), decemberFilter, clientIdOf, fastFactor: FAST_FACTOR_RUN };
  trackNetwork(take, ctx);
  trackHttpErrors(take);
  await page.goto(`${options.uiUrl}${SETTINGS_ROUTE}`, { timeout: S.NAV_TIMEOUT_MS, waitUntil: "domcontentloaded" });
  const header = page.locator(SEL_KEYWORDS_HEADER);
  await header.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.evaluate((selector) => document.querySelector(selector).scrollIntoView({ block: "start" }), SEL_KEYWORDS_HEADER);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  report.negFreeHidden = await page.locator(SEL_NEG_FREE_CELL).evaluate((element) => getComputedStyle(element).visibility === "hidden");
  if (!report.negFreeHidden) throw new Error("the -FREE field is visible - the take CSS did not apply");
  await checkPage(take, "settings");

  await recorder.start();
  try {
    await showSettings(take);

    await recorder.beginFast(CUT);
    await captions.hide();
    await openSchedule(page, options);
    await watchToasts(page);
    await recorder.endFast();
    await showBands(take);

    await recorder.beginFast(CUT);
    await frameDetail(take);
    await measure(take, "detail");
    await recorder.endFast();
    await checkPage(take, "schedule");

    await captions.show(cues.toggle);
    await pauseOf(take, "toggleLead");
    await clickSelector(take, SEL_COMMANDS_TOGGLE, MOVE.normal);
    await pauseOf(take, "toggle");
    await typeCommands(take, ctx);
    await measure(take, "typed");

    await captions.show(cues.run);
    await pauseOf(take, "run");
    await startWizard(take, ctx);
    const scenario = await waitForProposal(take, ctx);
    await recorder.beginFast(CUT);
    await measure(take, "proposal");
    await readProposal(take, ctx, scenario);
    await checkPage(take, "proposal");
    await recorder.endFast();
    await captions.show(cues.proposal);
    await pauseOf(take, "proposal");
    await captions.show(cues.binding);
    await pauseOf(take, "binding");

    await captions.show(cues.proofFree);
    await mouse.moveTo(await cell(take, "Mia", FREE_DAY, 1), MOVE.normal);
    await pauseOf(take, "proof");
    for (const [index, item] of ctx.proof.entries()) {
      await captions.show(PROOF_CUES[index]);
      await mouse.moveTo(await cell(take, item.firstName, item.day, 0), MOVE.normal);
      await pauseOf(take, "proof");
    }

    await captions.show(cues.open);
    await mouse.moveTo(OPEN_CAPTION_CURSOR, MOVE.normal);
    await pauseOf(take, "open");

    await captions.show(cues.manual);
    await placeManually(take, ctx, scenario);
    await pauseOf(take, "manual");
    await captions.show(cues.decide);
    await mouse.moveTo({ x: take.viewport.width / HALF, y: take.viewport.height / HALF }, MOVE.normal);
    await verifyNotAccepted(take, ctx);
    await readToasts(take);
    await holdWithPoster(take, take.finalHoldMs);
    await recorder.beginFast(CUT);
    await readErrorList(take);
    await recorder.endFast();
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale } });
  }
}

export const MONTHPLAN_COMMANDS_TAKE_RUNNERS = {
  [VIDEO_MONTHPLAN_COMMANDS]: takeMonthplanCommands,
};
