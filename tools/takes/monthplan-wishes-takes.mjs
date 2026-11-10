// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take of the clip M1 "Ferienwunsch wird Ferien" (series Monatsplanung, security demo Bern, lib/security-demo.mjs). It needs a throw-away copy of the stage database
 * klacks_marketing_security_bern_m1 (two wish placeholders, no booking; the take books one of them, so the master is never recorded on) and --group-id of "Bern Objektschutz".
 * MONTHPLAN_WISHES_CSS hides the loading overlay of a saved booking and the two form buttons of the calendar, the caption pill would cut them in half.
 * monthplan-wishes (1280x720): the absence calendar with the zoom slider at its maximum at the end of the year shows both wishes of the group; a click on the bar of Clara fills the form below it. The schedule of December at
 * row slider 100 (the story rows on top, the shift area collapsed, the columns moved to the 21st) switches the wishes on with "Gewünschte Absenzen ein-/ausblenden"; the context menu of the bar books it with "Absenz übernehmen",
 * the only place of the app that books a wish: the menu of the calendar can only copy, delete or convert a wish to another absence type, it stays a wish there. The take then points at the days, at the hours of the row header and at the
 * second wish that stays open, and goes back to the calendar, whose list tab says "Gebucht". The group is chosen through the query parameter of the schedule and the app navigation, the group dropdown (it lists groups of other demos) never opens.
 * What the app does and the clip therefore says: the absence type Ferien has no Saturday, Sunday or holiday value, so all days of the wish get a booking but only the working days add hours. The numbers of the captions hoursBefore, hoursAfter and counted come from the API at run time.
 * The cells agree: the days without value show Fe and the times, without hours.
 * The wish ends on 03.01.2027, outside the period of the schedule: the bulk request books those days as well, without value, the calendar of 2026 and its list end on 31.12.
 * Publishable criterion (report.publishable, every part is read from the API, not from the screen): before the take December holds no work and no break of the team and both wishes exist; exactly one bulk request and one delete of a placeholder are sent; afterwards the wish of Clara is gone, the wish of
 * Amir still exists, Clara has exactly one Ferien break on every day 24.12.-03.01. (Sat 26., Sun 27., holidays 25./26. included), Amir and the others have none; no work appears; no error toast; no HTTP error on a break, placeholder or schedule call; no PUT of a placeholder;
 * at least one working day adds hours and the weekend and the holidays add none; no text "Winterthur", "Uster", "Rettungswache" or "Urlaub" on the page at the checkpoints.
 * Captions come from simple-videos.<culture>.json, the beats from the script entry in capture-app-videos.scripts.json, so timing changes need no code change.
 * Cultures de, en, fr, it: the demo data stays German, the app texts the take checks come from lib/ui-texts.mjs (list tab "Booked"), the item of the context menu is found by its id #adoptAbsence, and the three captions that quote
 * numbers (hoursBefore, hoursAfter, counted) are filled from the templates runtimeCaptions of the script entry of the culture (lib/caption-template.mjs) and must stay within 42 characters.
 * @param take - page, api, options, recorder, mouse, report, captions, script, viewport, finalHoldMs (see recordTake in capture-app-videos.mjs)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { CANVAS_SETTLE_MS, CELL_WIDTH_PX, HALF, HTTP_DELETE, HTTP_POST, SUB_ROW_HEIGHT_PX, dateKey, gridBox, openSchedule, rowBoxes, worksIn } from "../lib/schedule-grid.mjs";
import { periodHours, realFilter } from "../lib/scenario-demo.mjs";
import * as D from "../lib/security-demo.mjs";
import { ENTRY_TYPE_BREAK } from "../lib/security-plan-check.mjs";
import { clickSelector, flag, holdWithPoster } from "./scenario-takes.mjs";
import { useRowOrder } from "./replacement-takes.mjs";
import { checkStage, fitAllRows, measure, readToasts, scrollColumns, setRowSlider, trackHttpErrors, watchToasts } from "./security-takes.mjs";
import { assertTemplates, fillCaption } from "../lib/caption-template.mjs";
import { uiTexts } from "../lib/ui-texts.mjs";

export const VIDEO_MONTHPLAN_WISHES = "monthplan-wishes";
export const MONTHPLAN_WISHES_VIDEOS = [VIDEO_MONTHPLAN_WISHES];
export const MONTHPLAN_WISHES_CUES = Object.freeze({
  wishes: "wishes",
  open: "open",
  toggle: "toggle",
  bar: "bar",
  hoursBefore: "hoursBefore",
  adopt: "adopt",
  everyDay: "everyDay",
  holidays: "holidays",
  hoursAfter: "hoursAfter",
  counted: "counted",
  second: "second",
  binding: "binding",
  booked: "booked",
  list: "list",
  listOpen: "listOpen",
});
export const MONTHPLAN_WISHES_FINAL_HOLD_MS = 2500;
export const MONTHPLAN_WISHES_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
export const MONTHPLAN_WISHES_CSS = "app-spinner-wrapper { display: none !important; } #absence-mask-new-button, #absence-mask-delete-button { visibility: hidden !important; }";

const SEL_NAV_ABSENCES = "#open-absences";
const SEL_GANTT_CANVAS = "#absence-surface-canvas";
const SEL_GANTT_ZOOM_POINTER = "#absence-gantt-zoom-slider .ngx-slider-pointer";
const SEL_LIST_TAB = "#absence-list-tab";
const SEL_LIST_TABLE = "#absence-grid-tbody";
const SEL_WISH_TOGGLE = "#schedule-break-placeholder-toggle";
const SORT_ORDER_API = "/api/backend/clientsortpreferences";
const GANTT_LIST_API = "/api/backend/BreakPlaceholders/GetClientList";
const GANTT_LIST_PATH = /\/BreakPlaceholders\/GetClientList/i;
const BREAKS_BULK_PATH = /\/Breaks\/Bulk\/?$/i;
const PLACEHOLDER_PATH = /\/BreakPlaceholders\/[0-9a-f-]{36}$/i;
const PLACEHOLDERS_ROOT_PATH = /\/BreakPlaceholders\/?$/i;
const WATCHED_ERROR_PATH = /\/Breaks|\/BreakPlaceholders|\/Works/i;
const HTTP_PUT = "PUT";
const SEL_ADOPT_ITEM = "app-context-menu .menu-container[style*='display: block'] #adoptAbsence";
const FORBIDDEN_TEXTS = Object.freeze([D.FOREIGN_NAME_FRAGMENT, D.NEUTRAL_TOWN, "Rettungswache", "Urlaub"]);
const END_KEY = "End";
const CUT = Number.POSITIVE_INFINITY;
const TEAM_SIZE = 10;
const BOOKED_FIRST_NAME = "Clara";
const OPEN_FIRST_NAME = "Amir";
const STORY_ROWS = Object.freeze([BOOKED_FIRST_NAME, OPEN_FIRST_NAME]);
const BOOKED_DAYS = Object.freeze(D.datesBetween("2026-12-24", "2027-01-03"));
const VALUE_DAYS = Object.freeze(["2026-12-24", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31"]);
const COLUMNS_SCROLLED = 20;
const FIRST_COLUMN_DAY = COLUMNS_SCROLLED + 1;
const GANTT_YEAR = 2026;
const GANTT_HEADER_HEIGHT_PX = 40;
const GANTT_ROW_HEIGHT_PX = 45;
const GANTT_BAR_COLOR = Object.freeze([0, 128, 192]);
const COLOR_TOLERANCE = 6;
const GANTT_WHEEL_TICKS = 326;
const GANTT_WHEEL_PAUSE_MS = 18;
const GANTT_BAR_INSET_PX = 14;
const ROW_HEADER_POINT = Object.freeze({ x: 294, y: 47 });
const BELOW_CELL_PX = 54;
const HOURS_EPSILON = 0.01;
const ENTRY_SOURCE_PLACEHOLDER = 0;
const SAVE_TIMEOUT_MS = 30000;
const MOVE = { short: 400, normal: 700, slow: 1500 };
const MINUTES_PER_HOUR = 60;

const pauseOf = (take, beat) => take.page.waitForTimeout(take.script.beats[beat]);

function hhmm(hours) {
  const minutes = Math.round(hours * MINUTES_PER_HOUR);
  return `${Math.floor(minutes / MINUTES_PER_HOUR)}:${String(minutes % MINUTES_PER_HOUR).padStart(2, "0")}`;
}

function setCaption(take, cue, values) {
  take.captions.track[cue] = fillCaption(take.script.runtimeCaptions[cue], values);
}

async function checkPage(take, label) {
  const text = await take.page.evaluate(() => document.body.innerText);
  const found = FORBIDDEN_TEXTS.filter((word) => text.includes(word));
  (take.report.textChecks ??= []).push({ label, found });
  if (found.length > 0) flag(take.report, `"${found.join(", ")}" is on the page at "${label}"`);
}

const breaksOf = (data) => data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_BREAK);

async function readStage(take, filter) {
  const { api, report } = take;
  if (filter.periodStartDate !== D.PERIOD.from || filter.periodEndDate !== D.PERIOD.until) throw new Error(`the schedule shows ${filter.periodStartDate}..${filter.periodEndDate} instead of December`);
  const decemberFilter = realFilter(filter);
  const data = await api.schedule(decemberFilter);
  if (data.clients.length !== TEAM_SIZE) throw new Error(`the group shows ${data.clients.length} employees instead of ${TEAM_SIZE}`);
  const works = worksIn(data, D.PERIOD.from, D.PERIOD.until).length;
  const breaks = breaksOf(data).length;
  if (works !== 0 || breaks !== 0) throw new Error(`December holds ${works} works and ${breaks} breaks - use a fresh copy of the stage database`);
  const clientIdOf = Object.fromEntries(data.clients.map((client) => [client.firstName, client.id]));
  for (const firstName of STORY_ROWS) if (!clientIdOf[firstName]) throw new Error(`${firstName} is not in the schedule of the group`);
  report.stage = { employees: data.clients.map((client) => `${client.firstName} ${client.name}`), works, breaks };
  return { decemberFilter, clients: data.clients, clientIdOf };
}

/** The row order a planner would drag: the two people of the story on top. */
async function orderRows(take, clients, groupId) {
  const story = STORY_ROWS.map((firstName) => clients.find((client) => client.firstName === firstName));
  const ordered = [...story, ...clients.filter((client) => !story.includes(client))];
  await take.api.json(`${SORT_ORDER_API}/${groupId}`, { method: HTTP_PUT, data: ordered.map((client, sortOrder) => ({ clientId: client.id, sortOrder })) });
}

function trackCalls(take, ctx) {
  take.page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (request.method() === HTTP_POST && BREAKS_BULK_PATH.test(pathname)) {
      ctx.bulkRequests += 1;
      take.report.bulkRequest = request.postDataJSON();
    }
    if (request.method() === HTTP_DELETE && PLACEHOLDER_PATH.test(pathname)) ctx.placeholderDeletes += 1;
    if (request.method() === HTTP_PUT && PLACEHOLDERS_ROOT_PATH.test(pathname)) ctx.placeholderUpdates += 1;
  });
}

/** The app navigation keeps the group of the schedule, the calendar then loads that group only. */
async function openGantt(take, ctx) {
  const { page, options } = take;
  const loaded = page.waitForResponse((response) => GANTT_LIST_PATH.test(new URL(response.url()).pathname) && response.request().postDataJSON()?.selectedGroup === options.groupId, { timeout: SAVE_TIMEOUT_MS });
  await page.locator(SEL_NAV_ABSENCES).click({ timeout: S.READY_TIMEOUT_MS });
  const response = await loaded;
  ctx.ganttFilter = response.request().postDataJSON();
  ctx.ganttRows = (await response.json()).map((client) => client.firstName);
  if (ctx.ganttRows.length !== TEAM_SIZE) throw new Error(`the calendar shows ${ctx.ganttRows.length} rows instead of ${TEAM_SIZE}`);
  await page.locator(SEL_GANTT_CANVAS).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

/** Largest zoom of the slider, the wheel moves one day per event, it stops at the end of the year. Runs inside a cut region or before the recording. */
async function frameGantt(take) {
  const { page } = take;
  const pointer = page.locator(SEL_GANTT_ZOOM_POINTER).first();
  await pointer.focus();
  await page.keyboard.press(END_KEY);
  await pointer.evaluate((element) => element.blur());
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const box = await page.locator(SEL_GANTT_CANVAS).boundingBox();
  await page.mouse.move(box.x + box.width / HALF, box.y + box.height / HALF);
  for (let tick = 0; tick < GANTT_WHEEL_TICKS; tick++) {
    await page.mouse.wheel(1, 0);
    await page.waitForTimeout(GANTT_WHEEL_PAUSE_MS);
  }
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

/** The calendar is a canvas: the bar of a row is found in its pixels along the middle of the row. */
async function ganttBar(take, ctx, firstName) {
  const row = ctx.ganttRows.indexOf(firstName);
  const y = GANTT_HEADER_HEIGHT_PX + (row + 1 / HALF) * GANTT_ROW_HEIGHT_PX;
  const found = await take.page.evaluate(({ selector, y: lineY, color, tolerance }) => {
    const canvas = document.querySelector(selector);
    const ratio = canvas.width / canvas.clientWidth;
    const { data } = canvas.getContext("2d").getImageData(0, Math.round(lineY * ratio), canvas.width, 1);
    let left = -1;
    let right = -1;
    for (let x = 0; x < canvas.width; x++) {
      const hit = color.every((value, channel) => Math.abs(data[x * 4 + channel] - value) <= tolerance);
      if (hit) { if (left < 0) left = x; right = x; }
    }
    return { left: left / ratio, right: right / ratio };
  }, { selector: SEL_GANTT_CANVAS, y, color: GANTT_BAR_COLOR, tolerance: COLOR_TOLERANCE });
  if (found.left < 0) throw new Error(`no bar of ${firstName} was found in the calendar`);
  const box = await take.page.locator(SEL_GANTT_CANVAS).boundingBox();
  (take.report.ganttBars ??= []).push({ firstName, row, ...found });
  return { left: box.x + found.left, right: box.x + found.right, y: box.y + y };
}

async function showGanttWishes(take, ctx) {
  const { mouse, captions } = take;
  const cues = MONTHPLAN_WISHES_CUES;
  const booked = await ganttBar(take, ctx, BOOKED_FIRST_NAME);
  const open = await ganttBar(take, ctx, OPEN_FIRST_NAME);
  await captions.show(cues.wishes);
  await mouse.moveTo({ x: booked.left + GANTT_BAR_INSET_PX, y: booked.y }, MOVE.normal);
  await pauseOf(take, "wishesLead");
  await mouse.moveTo({ x: booked.right - GANTT_BAR_INSET_PX, y: booked.y }, MOVE.slow);
  await mouse.moveTo({ x: open.right - GANTT_BAR_INSET_PX, y: open.y }, MOVE.normal);
  await pauseOf(take, "wishes");
  await captions.show(cues.open);
  await mouse.click({ x: booked.left + GANTT_BAR_INSET_PX, y: booked.y }, MOVE.normal);
  await pauseOf(take, "open");
}

/** The row of the wish bar: the app adds one sub-row under the rows the person needs. Rows are measured again after every change. */
async function barPoint(take, ctx, firstName, day) {
  const grid = await gridBox(take.page);
  const boxes = await rowBoxes(take.page);
  const box = boxes[STORY_ROWS.indexOf(firstName)];
  const column = Number(day.slice(-2)) - FIRST_COLUMN_DAY;
  return { x: grid.x + (column + 1 / HALF) * CELL_WIDTH_PX, y: box.top + box.height - SUB_ROW_HEIGHT_PX / HALF };
}

async function dayPoint(take, day) {
  const grid = await gridBox(take.page);
  const boxes = await rowBoxes(take.page);
  const column = Number(day.slice(-2)) - FIRST_COLUMN_DAY;
  return { x: grid.x + (column + 1 / HALF) * CELL_WIDTH_PX, y: boxes[0].top + BELOW_CELL_PX };
}

async function rowHeaderPoint(take) {
  const boxes = await rowBoxes(take.page);
  return { x: ROW_HEADER_POINT.x, y: boxes[0].top + ROW_HEADER_POINT.y };
}

/** Right click on the bar, the visible menu entry, then the app saves the bookings and deletes the wish. */
async function adopt(take, ctx) {
  const { page, mouse, report } = take;
  const target = await barPoint(take, ctx, BOOKED_FIRST_NAME, "2026-12-28");
  const saved = page.waitForResponse((response) => response.request().method() === HTTP_POST && BREAKS_BULK_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  const deleted = page.waitForResponse((response) => response.request().method() === HTTP_DELETE && PLACEHOLDER_PATH.test(new URL(response.url()).pathname), { timeout: SAVE_TIMEOUT_MS });
  saved.catch(() => {});
  deleted.catch(() => {});
  await mouse.rightClick(target, MOVE.normal);
  const item = page.locator(SEL_ADOPT_ITEM).first();
  await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await pauseOf(take, "menu");
  await mouse.clickLocator(item, MOVE.normal);
  const bulk = await saved;
  report.bulkStatus = bulk.status();
  if (!bulk.ok()) throw new Error(`the bookings returned HTTP ${bulk.status()}: ${(await bulk.text()).slice(0, 300)}`);
  report.placeholderDeleteStatus = (await deleted).status();
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

/** All bookings of a year as the calendar reads them. */
async function ganttYear(take, ctx, year) {
  return take.api.json(GANTT_LIST_API, { method: HTTP_POST, data: { ...ctx.ganttFilter, currentYear: year, startRow: 0, rowCount: TEAM_SIZE } });
}

const periodHoursOf = (data, clientId) => {
  const key = Object.keys(data ?? {}).find((candidate) => candidate.toLowerCase() === String(clientId).toLowerCase());
  return key ? data[key] : null;
};

/** The numbers of the row header from the API, the same map the schedule draws. */
async function hoursOfClara(take, ctx) {
  const id = ctx.clientIdOf[BOOKED_FIRST_NAME];
  const result = await periodHours(take.api, [id], { from: D.PERIOD.from, until: D.PERIOD.until }, null);
  const hours = periodHoursOf(result?.hours ?? result, id);
  return { raw: hours, worked: (hours?.hours ?? 0) + (hours?.surcharges ?? 0) };
}

function checkBreaks(report, data, ctx) {
  const breaks = breaksOf(data);
  const clara = ctx.clientIdOf[BOOKED_FIRST_NAME];
  const own = breaks.filter((entry) => entry.clientId === clara);
  const claraDays = own.map((entry) => dateKey(entry.entryDate)).sort();
  report.claraBreakDays = claraDays;
  report.otherBreaks = breaks.length - own.length;
  if (JSON.stringify(claraDays) !== JSON.stringify([...BOOKED_DAYS])) flag(report, `Clara holds breaks on ${claraDays.join(", ")} instead of one per day 24.12.-03.01.`);
  if (report.otherBreaks !== 0) flag(report, `${report.otherBreaks} breaks of other people appeared`);
  report.breakValues = Object.fromEntries(own.map((entry) => [dateKey(entry.entryDate), entry.changeTime]));
  const withValue = Object.keys(report.breakValues).filter((day) => report.breakValues[day] > 0).sort();
  report.daysWithValue = withValue;
  if (JSON.stringify(withValue) !== JSON.stringify([...VALUE_DAYS])) flag(report, `the days with hours are ${withValue.join(", ")} instead of the five working days`);
  const sum = withValue.reduce((total, day) => total + report.breakValues[day], 0);
  if (Math.abs(sum - report.hoursAfter.worked) > HOURS_EPSILON) flag(report, `the row header shows ${report.hoursAfter.worked} h, the days add up to ${sum} h`);
}

function wishesOf(clients, firstName) {
  return (clients.find((client) => client.firstName === firstName)?.breakPlaceholders ?? []).filter((entry) => entry.entrySource === ENTRY_SOURCE_PLACEHOLDER).map((entry) => `${dateKey(entry.from)}..${dateKey(entry.until)}`);
}

async function verifyEnd(take, ctx) {
  const { api, report } = take;
  const data = await api.schedule(ctx.decemberFilter);
  checkBreaks(report, data, ctx);
  report.worksAtEnd = worksIn(data, D.PERIOD.from, D.PERIOD.until).length;
  if (report.worksAtEnd !== 0) flag(report, `${report.worksAtEnd} works appeared`);
  report.bulkRequests = ctx.bulkRequests;
  report.placeholderDeletes = ctx.placeholderDeletes;
  report.placeholderUpdates = ctx.placeholderUpdates;
  if (ctx.bulkRequests !== 1) flag(report, `${ctx.bulkRequests} bulk requests instead of one`);
  if (ctx.placeholderDeletes !== 1) flag(report, `${ctx.placeholderDeletes} placeholder deletes instead of one`);
  if (ctx.placeholderUpdates !== 0) flag(report, `${ctx.placeholderUpdates} placeholder updates, the click on the bar must not change the wish`);
  const year = await ganttYear(take, ctx, GANTT_YEAR);
  report.wishesAtEnd = { Clara: wishesOf(year, BOOKED_FIRST_NAME), Amir: wishesOf(year, OPEN_FIRST_NAME) };
  report.wishRowsRaw = year.filter((client) => STORY_ROWS.includes(client.firstName)).map((client) => ({ firstName: client.firstName, rows: client.breakPlaceholders }));
  if (report.wishesAtEnd.Clara.length !== 0) flag(report, `the wish of Clara still exists: ${report.wishesAtEnd.Clara.join(", ")}`);
  if (report.wishesAtEnd.Amir.length !== 1) flag(report, `Amir holds ${report.wishesAtEnd.Amir.length} wishes instead of one`);
  const watched = (report.httpErrors ?? []).filter((line) => WATCHED_ERROR_PATH.test(line));
  if (watched.length > 0) flag(report, `HTTP errors: ${watched.join("; ")}`);
}

export async function takeMonthplanWishes(take) {
  const { page, api, options, recorder, mouse, report, captions, script } = take;
  if (!script?.beats) throw new Error(`the ${report.video} script lacks beats in capture-app-videos.scripts.json`);
  const cues = MONTHPLAN_WISHES_CUES;
  assertTemplates(script, [cues.hoursBefore, cues.hoursAfter, cues.counted]);
  const ui = uiTexts(take.culture);
  await checkStage(take, D.SITES.bern);
  const first = await openSchedule(page, options);
  const stage = await readStage(take, first.filter);
  await orderRows(take, stage.clients, options.groupId);
  const ctx = { ...stage, bulkRequests: 0, placeholderDeletes: 0, placeholderUpdates: 0 };
  trackHttpErrors(take);
  trackCalls(take, ctx);
  report.hoursBefore = await hoursOfClara(take, ctx);
  await openGantt(take, ctx);
  await frameGantt(take);
  report.ganttRows = ctx.ganttRows;
  await checkPage(take, "calendar");

  await recorder.start();
  try {
    await showGanttWishes(take, ctx);

    await recorder.beginFast(CUT);
    await captions.hide();
    await openSchedule(page, options);
    await watchToasts(page);
    await useRowOrder(take);
    await fitAllRows(take);
    await setRowSlider(take, true);
    await scrollColumns(take, COLUMNS_SCROLLED, 1);
    await measure(take, "detail");
    await recorder.endFast();
    await checkPage(take, "schedule");

    await captions.show(cues.toggle);
    await pauseOf(take, "toggleLead");
    await clickSelector(take, SEL_WISH_TOGGLE, MOVE.normal);
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    await measure(take, "wishes on");
    await captions.show(cues.bar);
    await mouse.moveTo(await barPoint(take, ctx, BOOKED_FIRST_NAME, "2026-12-24"), MOVE.normal);
    await mouse.moveTo(await barPoint(take, ctx, BOOKED_FIRST_NAME, "2026-12-31"), MOVE.slow);
    await pauseOf(take, "bar");

    setCaption(take, cues.hoursBefore, { name: BOOKED_FIRST_NAME, hours: hhmm(report.hoursBefore.worked) });
    await captions.show(cues.hoursBefore);
    await mouse.moveTo(await rowHeaderPoint(take), MOVE.normal);
    await pauseOf(take, "hoursBefore");

    await captions.show(cues.adopt);
    await adopt(take, ctx);
    await measure(take, "adopted");
    await mouse.click(await dayPoint(take, "2026-12-21"), MOVE.normal);
    await pauseOf(take, "adopted");

    report.hoursAfter = await hoursOfClara(take, ctx);
    const midData = await api.schedule(ctx.decemberFilter);
    checkBreaks(report, midData, ctx);
    await captions.show(cues.everyDay);
    await mouse.moveTo(await dayPoint(take, "2026-12-24"), MOVE.normal);
    await mouse.moveTo(await dayPoint(take, "2026-12-27"), MOVE.slow);
    await pauseOf(take, "everyDay");
    await captions.show(cues.holidays);
    await mouse.moveTo(await dayPoint(take, "2026-12-25"), MOVE.normal);
    await mouse.moveTo(await dayPoint(take, "2026-12-26"), MOVE.normal);
    await pauseOf(take, "holidays");

    setCaption(take, cues.hoursAfter, { name: BOOKED_FIRST_NAME, hours: hhmm(report.hoursAfter.worked) });
    await captions.show(cues.hoursAfter);
    await mouse.moveTo(await rowHeaderPoint(take), MOVE.normal);
    await pauseOf(take, "hoursAfter");
    setCaption(take, cues.counted, { days: VALUE_DAYS.length });
    await captions.show(cues.counted);
    await pauseOf(take, "counted");

    await captions.show(cues.second);
    await mouse.moveTo(await barPoint(take, ctx, OPEN_FIRST_NAME, "2026-12-29"), MOVE.normal);
    await pauseOf(take, "second");
    await captions.show(cues.binding);
    await pauseOf(take, "binding");
    await readToasts(take);

    await recorder.beginFast(CUT);
    await captions.hide();
    await openGantt(take, ctx);
    await frameGantt(take);
    await recorder.endFast();
    await checkPage(take, "calendar after");
    await captions.show(cues.booked);
    const claraFirstDay = await ganttBar(take, ctx, BOOKED_FIRST_NAME);
    await mouse.click({ x: claraFirstDay.left + GANTT_BAR_INSET_PX, y: claraFirstDay.y }, MOVE.normal);
    await pauseOf(take, "booked");
    await captions.show(cues.list);
    await clickSelector(take, SEL_LIST_TAB, MOVE.normal);
    const listRows = page.locator(SEL_LIST_TABLE);
    report.listText = (await listRows.innerText()).replace(/\s+/g, " ").trim().slice(0, 600);
    if (!report.listText.includes(ui.booked)) flag(report, `the list tab does not say "${ui.booked}": ${report.listText}`);
    await pauseOf(take, "list");
    await captions.show(cues.listOpen);
    const amirBar = await ganttBar(take, ctx, OPEN_FIRST_NAME);
    await mouse.click({ x: amirBar.right - GANTT_BAR_INSET_PX, y: amirBar.y }, MOVE.normal);
    await clickSelector(take, SEL_LIST_TAB, MOVE.short);
    report.listTextOpen = (await listRows.innerText()).replace(/\s+/g, " ").trim().slice(0, 600);
    if (report.listTextOpen.includes(ui.booked)) flag(report, `the list of Amir says "${ui.booked}": ${report.listTextOpen}`);
    await pauseOf(take, "listOpen");
    await verifyEnd(take, ctx);
    await holdWithPoster(take, take.finalHoldMs);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale } });
  }
}

export const MONTHPLAN_WISHES_TAKE_RUNNERS = {
  [VIDEO_MONTHPLAN_WISHES]: takeMonthplanWishes,
};
