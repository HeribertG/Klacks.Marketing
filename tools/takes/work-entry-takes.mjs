// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Video takes that edit a single October work in the schedule grid: an expense recorded via the context menu, a
 * correction (extra time at the end) via the context menu and an hours adjustment via double-click and the work edit
 * dialog. Every take records the full viewport, verifies the persisted result through the API and then restores the
 * demo data (expense/correction deleted, work times put back) and verifies that October is identical again.
 * @param take - page, api, options, recorder, mouse, report, culture, scripts, viewport, scale (see recordTake)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import {
  CANVAS_SETTLE_MS,
  HTTP_DELETE,
  HTTP_POST,
  WORKS_API,
  WORK_ENTRY_TYPE,
  cellCenter,
  dateKey,
  openSchedule,
  sameSnapshot,
  snapshotOf,
  worksIn,
} from "../lib/schedule-grid.mjs";

export const VIDEO_EXPENSES = "expenses";
export const VIDEO_CORRECTION = "correction";
export const VIDEO_HOURS_ADJUSTMENT = "hours-adjustment";
export const VIDEO_REPLACEMENT = "replacement";
export const WORK_ENTRY_VIDEOS = [VIDEO_EXPENSES, VIDEO_CORRECTION, VIDEO_HOURS_ADJUSTMENT, VIDEO_REPLACEMENT];

const OCTOBER_RANGE = { from: "2026-10-01", until: "2026-10-31", expectedWorks: 118 };
const PICK_ROWS = { min: 1, max: 2 };
const PICK_DAYS = { min: 5, max: 8 };
const LATEST_END_HOUR = 18;
const ISO_SATURDAY = 6;
const ISO_SUNDAY = 7;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const HH_MM_LENGTH = 5;
const PARK_OFFSET = { x: 70, y: 150 };

const SEL_OPEN_MENU = "app-context-menu .menu-container[style*='display: block']";
const SEL_MODAL = "ngb-modal-window";
const SEL_SAVE = `${SEL_MODAL} .modal-footer button.save-btn`;
const SEL_MODAL_DIALOG = `${SEL_MODAL} .modal-dialog`;
const STABLE_POLL_MS = 100;
const STABLE_MAX_CHECKS = 40;
const MENU_ITEM = { expenses: "#expenses", correction: "#correction", replacement: "#replacement" };
const SEL_EXPENSE_AMOUNT = `${SEL_MODAL} input#amount`;
const SEL_EXPENSE_DESCRIPTION = `${SEL_MODAL} textarea#description`;
const SEL_EXPENSE_TAXABLE = `${SEL_MODAL} .checkbox-group input[type=checkbox]`;
const SEL_CORRECTION_AT_END = `${SEL_MODAL} input[type=radio][name=correctionMode] >> nth=1`;
const SEL_CORRECTION_HOURS = `${SEL_MODAL} #wcDurationHours`;
const SEL_CORRECTION_MINUTES = `${SEL_MODAL} #wcDurationMinutes`;
const SEL_CORRECTION_DESCRIPTION = `${SEL_MODAL} #description`;
const SEL_REPLACEMENT_AT_END = `${SEL_MODAL} label.radio-label:has(input[name=replacementMode]) >> nth=1`;
const SEL_REPLACEMENT_AT_END_INPUT = `${SEL_MODAL} input[type=radio][name=replacementMode] >> nth=1`;
const SEL_REPLACEMENT_SEARCH = `${SEL_MODAL} input#replaceClient`;
const SEL_REPLACEMENT_RESULT = `${SEL_MODAL} .search-result-item`;
const SEL_REPLACEMENT_HOURS = `${SEL_MODAL} #replDurationHours`;
const SEL_REPLACEMENT_MINUTES = `${SEL_MODAL} #replDurationMinutes`;
const SEL_REPLACEMENT_DESCRIPTION = `${SEL_MODAL} #description`;
const REPLACEMENT_ROW = 0;
const WORK_CHANGE_REPLACEMENT_END = 3;
const SEL_WORK_END_HOURS = `${SEL_MODAL} #weEndHours`;
const SEL_WORK_END_MINUTES = `${SEL_MODAL} #weEndMinutes`;
const SEL_WORK_DURATION_HOURS = `${SEL_MODAL} #weDurationHours`;
const SEL_WORK_DURATION_MINUTES = `${SEL_MODAL} #weDurationMinutes`;

const EXPENSES_API = "/api/backend/Expenses";
const WORK_CHANGES_API = `${WORKS_API}/Changes`;
const HTTP_PUT = "PUT";
const SAVE_TIMEOUT_MS = 30000;
const SELECT_ALL = "Control+A";

const BEAT = { intro: 500, hover: 350, menu: 450, field: 250, beforeSave: 600, result: 900, finalHold: 3500 };
const MOVE = { short: 350, normal: 600 };
const TYPE_DELAY_MS = 70;

const fullFrame = (take) => ({ x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale });
const log = (...args) => console.log("  ", ...args);

function hoursOf(time) {
  const [h, m] = time.split(":").map(Number);
  return h + m / MINUTES_PER_HOUR;
}

function isoWeekday(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay() || ISO_SUNDAY;
}

function dayIndexOf(filter, isoDate) {
  return Math.round((Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${filter.periodStartDate}T00:00:00Z`)) / (HOURS_PER_DAY * MINUTES_PER_HOUR * MINUTES_PER_HOUR * 1000));
}

function nonWorkEntries(data, range) {
  return data.entries.filter((e) => e.entryType !== WORK_ENTRY_TYPE && dateKey(e.entryDate) >= range.from && dateKey(e.entryDate) <= range.until);
}

/**
 * Picks a weekday work in the upper visible rows whose day holds no other entry of that employee and which ends in
 * the daytime, so an added expense/correction or a longer end time stays readable in the same framed cell.
 */
function pickWork(data, filter) {
  const rowOf = new Map(data.clients.map((c, i) => [c.id, i]));
  const perClientDay = new Map();
  for (const e of data.entries) {
    const key = `${e.clientId}|${dateKey(e.entryDate)}`;
    perClientDay.set(key, (perClientDay.get(key) ?? 0) + 1);
  }
  const candidates = worksIn(data, filter.periodStartDate, filter.periodEndDate)
    .filter((w) => !w.isReplacementEntry && !w.isGroupRestricted && !w.lockLevel)
    .map((w) => ({ work: w, row: rowOf.get(w.clientId), day: dateKey(w.entryDate) }))
    .filter(({ work, row, day }) => row >= PICK_ROWS.min && row <= PICK_ROWS.max
      && dayIndexOf(filter, day) >= PICK_DAYS.min && dayIndexOf(filter, day) <= PICK_DAYS.max
      && isoWeekday(day) < ISO_SATURDAY
      && hoursOf(work.endTime) > hoursOf(work.startTime) && hoursOf(work.endTime) <= LATEST_END_HOUR
      && perClientDay.get(`${work.clientId}|${day}`) === 1);
  candidates.sort((a, b) => a.row - b.row || a.day.localeCompare(b.day));
  if (candidates.length === 0) throw new Error("no suitable work in the framed October rows/days");
  const pick = candidates[0];
  return { ...pick, client: data.clients[pick.row], dayIndex: dayIndexOf(filter, pick.day) };
}

async function typeInto(take, selector, text) {
  const { page, mouse } = take;
  const field = page.locator(selector);
  await field.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await mouse.clickLocator(field, MOVE.short);
  await page.keyboard.press(SELECT_ALL);
  await field.pressSequentially(text, { delay: TYPE_DELAY_MS });
  await page.waitForTimeout(BEAT.field);
}

/**
 * ngb modals slide in; element boxes measured during the animation are off by up to 50 px, so clicks wait for rest.
 */
async function waitModalAtRest(page) {
  const dialog = page.locator(SEL_MODAL_DIALOG).first();
  await dialog.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  let previous = null;
  for (let check = 0; check < STABLE_MAX_CHECKS; check++) {
    const box = await dialog.boundingBox();
    if (box && previous && Math.abs(box.y - previous.y) < 1 && Math.abs(box.height - previous.height) < 1) return;
    previous = box;
    await page.waitForTimeout(STABLE_POLL_MS);
  }
  throw new Error("modal never came to rest");
}

async function openContextMenuItem(take, cell, itemSelector) {
  const { page, mouse } = take;
  await mouse.rightClick(cell, MOVE.short);
  const item = page.locator(`${SEL_OPEN_MENU} ${itemSelector}`).first();
  await item.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(BEAT.menu);
  await mouse.clickLocator(item, MOVE.normal);
  await waitModalAtRest(page);
}

async function saveAndCapture(take, urlPart, method) {
  const { page, mouse } = take;
  const save = page.locator(SEL_SAVE);
  await page.waitForTimeout(BEAT.beforeSave);
  const response = page.waitForResponse(
    (r) => r.url().includes(urlPart) && r.request().method() === method,
    { timeout: SAVE_TIMEOUT_MS },
  );
  await mouse.clickLocator(save, MOVE.normal);
  const saved = await response;
  if (!saved.ok()) throw new Error(`${method} ${urlPart} -> HTTP ${saved.status()}`);
  await page.locator(SEL_MODAL).waitFor({ state: "detached", timeout: S.READY_TIMEOUT_MS });
  return { body: await saved.json().catch(() => null), requestBody: saved.request().postDataJSON() };
}

async function prepare(take) {
  const { page, api, options, report } = take;
  const { filter, data } = await openSchedule(page, options);
  const before = snapshotOf(data, OCTOBER_RANGE);
  if (before.length !== OCTOBER_RANGE.expectedWorks) {
    throw new Error(`October has ${before.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  }
  const extras = nonWorkEntries(data, OCTOBER_RANGE);
  if (extras.length > 0) throw new Error(`October already holds ${extras.length} non-work entries - restore the demo data first`);
  const pick = pickWork(data, filter);
  Object.assign(report, {
    work: `${pick.work.abbreviation} ${pick.day} ${pick.work.startTime}-${pick.work.endTime}`,
    client: `${pick.client.firstName} ${pick.client.name}`,
  });
  log(`work ${report.work} of ${report.client}`);
  const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
  const cell = await cellCenter(page, pick.row, pick.dayIndex, isRtl);
  return { filter, before, pick, cell, api };
}

async function finishTake(take, ctx, verifyResult, restore) {
  const { page, mouse, report, recorder } = take;
  try {
    report.result = await verifyResult();
    await page.waitForTimeout(CANVAS_SETTLE_MS);
    await mouse.moveTo({ x: ctx.cell.x + PARK_OFFSET.x, y: ctx.cell.y + PARK_OFFSET.y }, MOVE.normal);
    await page.waitForTimeout(BEAT.result);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.finalHold);
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    await restore();
    const after = await ctx.api.schedule(ctx.filter);
    report.octoberRestored = sameSnapshot(ctx.before, snapshotOf(after, OCTOBER_RANGE))
      && nonWorkEntries(after, OCTOBER_RANGE).length === 0;
    if (!report.octoberRestored) throw new Error("October differs after the restore - check the demo data!");
    log("October restored: identical snapshot, no extra entries");
  }
}

function entriesOn(data, pick, type) {
  return data.entries.filter((e) => e.clientId === pick.work.clientId && dateKey(e.entryDate) === pick.day && e.entryType !== type);
}

export async function takeExpenses(take) {
  const { page, mouse, recorder, report, script } = take;
  const ctx = await prepare(take);
  let created = null;
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(ctx.cell, MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    await openContextMenuItem(take, ctx.cell, MENU_ITEM.expenses);
    await typeInto(take, SEL_EXPENSE_AMOUNT, script.amount);
    await typeInto(take, SEL_EXPENSE_DESCRIPTION, script.description);
    await mouse.clickLocator(page.locator(SEL_EXPENSE_TAXABLE), MOVE.short);
    const saved = await saveAndCapture(take, EXPENSES_API, HTTP_POST);
    created = saved.body?.id ?? null;
  } catch (error) {
    await recorder.stop({ posterAt: null, crop: fullFrame(take) });
    throw error;
  }
  await finishTake(take, ctx, async () => {
    const extra = entriesOn(await ctx.api.schedule(ctx.filter), ctx.pick, WORK_ENTRY_TYPE);
    if (extra.length !== 1 || Number(extra[0].amount) !== Number(script.amount)) {
      report.failure = `expected one expense of ${script.amount} on the work's day, found ${JSON.stringify(extra)}`;
    }
    return extra.map((e) => ({ type: e.entryType, amount: e.amount, description: e.description, taxable: e.taxable }));
  }, async () => {
    if (created) await ctx.api.json(`${EXPENSES_API}/${created}`, { method: HTTP_DELETE });
  });
}

export async function takeCorrection(take) {
  const { page, mouse, recorder, report, script } = take;
  const ctx = await prepare(take);
  let created = null;
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(ctx.cell, MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    await openContextMenuItem(take, ctx.cell, MENU_ITEM.correction);
    await mouse.clickLocator(page.locator(SEL_CORRECTION_AT_END), MOVE.short);
    await typeInto(take, SEL_CORRECTION_HOURS, script.hours);
    await typeInto(take, SEL_CORRECTION_MINUTES, script.minutes);
    await typeInto(take, SEL_CORRECTION_DESCRIPTION, script.description);
    const saved = await saveAndCapture(take, WORK_CHANGES_API, HTTP_POST);
    created = saved.body?.id ?? null;
  } catch (error) {
    await recorder.stop({ posterAt: null, crop: fullFrame(take) });
    throw error;
  }
  const expectedHours = Number(script.hours) + Number(script.minutes) / MINUTES_PER_HOUR;
  await finishTake(take, ctx, async () => {
    const extra = entriesOn(await ctx.api.schedule(ctx.filter), ctx.pick, WORK_ENTRY_TYPE);
    const ok = extra.length === 1 && Math.abs(Number(extra[0].changeTime) - expectedHours) < 1e-6
      && extra[0].startTime.slice(0, HH_MM_LENGTH) === ctx.pick.work.endTime.slice(0, HH_MM_LENGTH)
      && Number(extra[0].surcharges) === Number(script.expectedSurcharges);
    if (!ok) report.failure = `expected one correction of ${expectedHours} h after ${ctx.pick.work.endTime}, found ${JSON.stringify(extra)}`;
    return extra.map((e) => ({ type: e.entryType, changeTime: e.changeTime, from: e.startTime, until: e.endTime, surcharges: e.surcharges }));
  }, async () => {
    if (created) await ctx.api.json(`${WORK_CHANGES_API}/${created}`, { method: HTTP_DELETE });
  });
}

export async function takeHoursAdjustment(take) {
  const { page, mouse, recorder, report, script } = take;
  const ctx = await prepare(take);
  let putBody = null;
  const original = ctx.pick.work;
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(ctx.cell, MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    await mouse.doubleClick(ctx.cell, MOVE.short);
    await waitModalAtRest(page);
    await page.waitForTimeout(BEAT.menu);
    await typeInto(take, SEL_WORK_END_HOURS, script.endHours);
    await typeInto(take, SEL_WORK_END_MINUTES, script.endMinutes);
    report.durationShown = `${await page.locator(SEL_WORK_DURATION_HOURS).inputValue()}:${await page.locator(SEL_WORK_DURATION_MINUTES).inputValue()}`;
    const saved = await saveAndCapture(take, WORKS_API, HTTP_PUT);
    putBody = saved.requestBody;
  } catch (error) {
    await recorder.stop({ posterAt: null, crop: fullFrame(take) });
    throw error;
  }
  const expectedEnd = `${script.endHours}:${script.endMinutes}`;
  await finishTake(take, ctx, async () => {
    const work = (await ctx.api.schedule(ctx.filter)).entries.find((e) => e.id === original.id);
    if (work?.endTime.slice(0, HH_MM_LENGTH) !== expectedEnd) {
      report.failure = `work ends at ${work?.endTime} instead of ${expectedEnd}`;
    }
    return { from: work?.startTime, until: work?.endTime, hours: work?.changeTime };
  }, async () => {
    if (!putBody) return;
    const workTime = hoursOf(original.endTime) - hoursOf(original.startTime);
    await ctx.api.json(WORKS_API, {
      method: HTTP_PUT,
      data: { ...putBody, startTime: original.startTime, endTime: original.endTime, workTime },
    });
  });
}

/**
 * The employee in the top row replaces the picked work's employee for the last part of the shift; that row must be
 * free on the work's day so the replacement block is the only entry there.
 */
export async function takeReplacement(take) {
  const { page, mouse, recorder, report, script } = take;
  const ctx = await prepare(take);
  const data = await ctx.api.schedule(ctx.filter);
  const substitute = data.clients[REPLACEMENT_ROW];
  const substituteBusy = data.entries.some((e) => e.clientId === substitute.id && dateKey(e.entryDate) === ctx.pick.day);
  if (substituteBusy) throw new Error(`${substitute.firstName} ${substitute.name} is not free on ${ctx.pick.day}`);
  report.substitute = `${substitute.firstName} ${substitute.name}`;
  let created = null;
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(ctx.cell, MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    await openContextMenuItem(take, ctx.cell, MENU_ITEM.replacement);
    await mouse.clickLocator(page.locator(SEL_REPLACEMENT_AT_END), MOVE.short);
    await page.waitForTimeout(BEAT.field);
    if (!(await page.locator(SEL_REPLACEMENT_AT_END_INPUT).isChecked())) throw new Error("replacement position 'at end' could not be selected");
    await typeInto(take, SEL_REPLACEMENT_SEARCH, substitute.name);
    const result = page.locator(SEL_REPLACEMENT_RESULT).filter({ hasText: `${substitute.name} ${substitute.firstName}` }).first();
    await result.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    await page.waitForTimeout(BEAT.field);
    await mouse.clickLocator(result, MOVE.normal);
    await typeInto(take, SEL_REPLACEMENT_HOURS, script.hours);
    await typeInto(take, SEL_REPLACEMENT_MINUTES, script.minutes);
    await typeInto(take, SEL_REPLACEMENT_DESCRIPTION, script.description);
    const saved = await saveAndCapture(take, WORK_CHANGES_API, HTTP_POST);
    created = saved.body?.id ?? null;
  } catch (error) {
    await recorder.stop({ posterAt: null, crop: fullFrame(take) });
    throw error;
  }
  const expectedHours = Number(script.hours) + Number(script.minutes) / MINUTES_PER_HOUR;
  await finishTake(take, ctx, async () => {
    const after = await ctx.api.schedule(ctx.filter);
    const change = entriesOn(after, ctx.pick, WORK_ENTRY_TYPE).find((e) => e.workChangeType === WORK_CHANGE_REPLACEMENT_END);
    const onSubstitute = after.entries.filter((e) => e.clientId === substitute.id && dateKey(e.entryDate) === ctx.pick.day);
    const ok = change && change.replaceClientId === substitute.id && Math.abs(Math.abs(Number(change.changeTime)) - expectedHours) < 1e-6
      && onSubstitute.length === 1;
    if (!ok) report.failure = `expected a ${expectedHours} h replacement by ${report.substitute}, found ${JSON.stringify(change ?? null)}`;
    return { change: change && { from: change.startTime, until: change.endTime, hours: change.changeTime }, substituteEntries: onSubstitute.length };
  }, async () => {
    if (created) await ctx.api.json(`${WORK_CHANGES_API}/${created}`, { method: HTTP_DELETE });
  });
}

export const WORK_ENTRY_TAKE_RUNNERS = {
  [VIDEO_REPLACEMENT]: takeReplacement,
  [VIDEO_EXPENSES]: takeExpenses,
  [VIDEO_CORRECTION]: takeCorrection,
  [VIDEO_HOURS_ADJUSTMENT]: takeHoursAdjustment,
};
