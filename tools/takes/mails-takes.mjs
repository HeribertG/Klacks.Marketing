// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take mails-availability (clip "Klacksy liest die Mails"): Sandra asks Klacksy in the chat to read the e-mails of her team
 * and to enter what they ask for; Klacksy reads the four mails of tools/mails-demo/seed-mails.sql, records the availabilities
 * (Mia Baer 7.-9.12. only 07-15 h, Priya Nair 21.-23.12. not available) on the availability page and writes the work wishes as
 * planning commands (Jonas Vogel FREE on 18.12. and -NIGHT 21.-24.12., Lena Rossi NIGHT 7.-11.12.). Sandra then asks to see the
 * availabilities: Klacksy opens Workplace > Verfügbarkeiten, which starts on the current month, so Sandra's cursor moves it to
 * December (a visible user action). Last, Klacksy opens the December schedule of the group with the availability overlay and the
 * planning commands switched on (open_schedule showAvailability/showCommands). Every message after the first waits for its
 * condition: entered (the API holds the availabilities and the commands) and availabilityShown (the availability page was on screen);
 * a message whose condition is not met is not sent and the take is not publishable. A message is skipped when an earlier answer
 * already did what it asks (Klacksy may open the schedule on its own).
 * Publishable: no chat error, no failed skill, every expected skill called, the API holds exactly the expected availabilities and
 * commands of December for the four people and nothing else, both pages were on screen, the schedule was opened with both display
 * parameters, group and a December day, and the take ends on the schedule. Needs a fresh copy of klacks_marketing_mails_template.
 * @param take - page, api, options, recorder, mouse, report, script, captions, viewport, scale (see recordTake)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { SEL_ASSISTANT_INPUT, SKILL_ERROR_PREFIX, sendChatMessage } from "../lib/klacksy-chat.mjs";
import { CANVAS_SETTLE_MS, HALF, SEL_GRID_CANVAS, dateKey, openSchedule } from "../lib/schedule-grid.mjs";
import { realFilter } from "../lib/scenario-demo.mjs";
import { ENTRY_TYPE_COMMAND } from "../lib/security-plan-check.mjs";

export const VIDEO_MAILS_AVAILABILITY = "mails-availability";
export const MAILS_VIDEOS = [VIDEO_MAILS_AVAILABILITY];
export const MAILS_AVAILABILITY_CUES = { request: "request", inbox: "inbox", availability: "availability", schedule: "schedule" };
export const MAILS_AVAILABILITY_FINAL_HOLD_MS = 5000;
export const MAILS_VIEWPORT = Object.freeze({ width: 1280, height: 720 });

const ENTERED = "entered";
const AVAILABILITY_SHOWN = "availabilityShown";
const READ_SKILL = "read_email";
const AVAILABILITY_SKILL = "set_client_availability";
const COMMAND_SKILLS = ["add_schedule_command", "add_schedule_commands_range"];
const NAVIGATE_SKILLS = ["navigate_to", "navigate_to_page", "navigateToPage"];
const SCHEDULE_SKILL = "open_schedule";
const EXPECTED_CALLS = [[READ_SKILL], [AVAILABILITY_SKILL], COMMAND_SKILLS, [SCHEDULE_SKILL]];

const AVAILABILITY_API = "/api/backend/ClientAvailabilities";
const DECEMBER = Object.freeze({ from: "2026-12-01", until: "2026-12-31", month: 12 });
const AVAILABILITY_ROUTE = "/workplace/client-availability";
const SCHEDULE_ROUTE = "/workplace/schedule";
const INBOX_ROUTE = "/workplace/inbox";
const SEL_EMAIL_ITEM = "app-inbox-list .email-item";
const SEL_INBOX_NAV_BUTTON = "app-nav .inbox-button";
const SEL_GROUP_TREE_ITEM = "app-inbox-folder-list .group-tree-item";
const SEL_GROUP_TREE_NAME = ".group-tree-name";
const SEL_COLLAPSED_TOGGLE = "app-inbox-folder-list .toggle-icon:has(app-icon-angle-right)";
const MAILS_GROUP_NAME = "Bern Objektschutz";
const MAX_TREE_EXPAND_ROUNDS = 6;
const FIRST_MAIL_SENDER = "Mia Baer";
const SEL_AVAILABILITY_CANVAS = "#availability-surface-canvas";
const SEL_NEXT_PERIOD = "app-client-availability-header button[aria-label=\"next period\"]";
const SEL_PERIOD_LABEL = "app-client-availability-header";
const DECEMBER_LABEL = "Dezember";
const SHOW_AVAILABILITY_PARAM = "showAvailability";
const SHOW_COMMANDS_PARAM = "showCommands";
const GROUP_PARAM = "groupId";
const DATE_PARAM = "date";
const PARAM_ON = "true";
const MAX_MONTH_CLICKS = 2;

const BEAT = { intro: 1200, pageHold: 4500, pagePoll: 250, afterClick: 1200, storyHold: 1500, tooltipHold: 3500, inboxHold: 2500, mailHold: 3500 };
const PAGE_TIMEOUT_MS = 20000;
const MOVE_NORMAL_MS = 700;
const FIRST_STORY_DAY = 7;
const DAY_OF_MONTH_OFFSET = 8;
const WHEEL_PAUSE_MS = 260;
const AVAILABILITY_WHEEL_PAUSE_MS = 25;
const AVAILABILITY_COLUMNS_PER_DAY = 12;
const AVAILABILITY_MORNING_COLUMNS = 3;
const LOWER_ROWS_SUB_ROWS = 13;
const HOVER_CELL_OFFSET = Object.freeze({ x: 45, y: 62 });
const HOVER_WIGGLE_PX = 2;
const HOVER_WIGGLE_STEPS = 3;
const MIXED_CELL_OFFSET = Object.freeze({ x: 19, y: 70 });
const SEL_PAGE_TOOLTIP = "app-tooltip > div.tooltip";
const LOG_PREVIEW_CHARS = 220;
const ALL_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const hoursFrom = (first, last) => ALL_HOURS.filter((hour) => hour >= first && hour <= last);

const EXPECTED_AVAILABILITY = Object.freeze([
  ...["2026-12-07", "2026-12-08", "2026-12-09"].map((date) => ({ name: "Baer", date, available: hoursFrom(7, 14), unavailable: [] })),
  ...["2026-12-21", "2026-12-22", "2026-12-23"].map((date) => ({ name: "Nair", date, available: [], unavailable: ALL_HOURS })),
]);
const EXPECTED_COMMANDS = Object.freeze([
  { name: "Vogel", date: "2026-12-18", keyword: "FREE" },
  ...["2026-12-21", "2026-12-22", "2026-12-23", "2026-12-24"].map((date) => ({ name: "Vogel", date, keyword: "-NIGHT" })),
  ...["2026-12-07", "2026-12-08", "2026-12-09", "2026-12-10", "2026-12-11"].map((date) => ({ name: "Rossi", date, keyword: "NIGHT" })),
]);

function log(message) {
  console.log(`[mails] ${message}`);
}

function cueFor(message) {
  if (message.sendWhen === AVAILABILITY_SHOWN) return MAILS_AVAILABILITY_CUES.schedule;
  if (message.sendWhen === ENTERED) return MAILS_AVAILABILITY_CUES.availability;
  return MAILS_AVAILABILITY_CUES.request;
}

const sentTurns = (turns) => turns.filter((t) => t.sent);
const callNames = (turn) => new Set((turn?.calls ?? []).map((c) => c.name));
const calledSkills = (turns) => new Set(sentTurns(turns).flatMap((t) => [...callNames(t)]));
const anyOf = (names, set) => names.some((name) => set.has(name));

async function teamOf(api, filter) {
  const data = await api.schedule(realFilter(filter));
  const idOf = Object.fromEntries(data.clients.map((client) => [client.name, client.id]));
  for (const name of new Set([...EXPECTED_AVAILABILITY, ...EXPECTED_COMMANDS].map((entry) => entry.name))) {
    if (!idOf[name]) throw new Error(`${name} is not in the schedule of the group`);
  }
  return { idOf, data };
}

async function storedState(api, ctx) {
  const availability = (await api.json(`${AVAILABILITY_API}?startDate=${DECEMBER.from}&endDate=${DECEMBER.until}`)) ?? [];
  const commands = (await api.schedule(realFilter(ctx.filter))).entries.filter((entry) => entry.entryType === ENTRY_TYPE_COMMAND);
  return { availability, commands };
}

function availabilityProblems(state, ctx) {
  const problems = [];
  const teamIds = new Set(Object.values(ctx.idOf));
  const rows = state.availability.filter((row) => teamIds.has(row.clientId));
  for (const expected of EXPECTED_AVAILABILITY) {
    const day = rows.filter((row) => row.clientId === ctx.idOf[expected.name] && dateKey(row.date) === expected.date);
    const on = day.filter((row) => row.isAvailable).map((row) => row.hour).sort((a, b) => a - b);
    const off = day.filter((row) => !row.isAvailable).map((row) => row.hour).sort((a, b) => a - b);
    const wantedOff = expected.available.length > 0 ? ALL_HOURS.filter((hour) => !expected.available.includes(hour)) : expected.unavailable;
    if (JSON.stringify(on) !== JSON.stringify(expected.available)) problems.push(`${expected.name} ${expected.date}: available hours ${on.join(",") || "-"}`);
    if (off.length > 0 && JSON.stringify(off) !== JSON.stringify(wantedOff)) problems.push(`${expected.name} ${expected.date}: unavailable hours ${off.join(",")}`);
  }
  const expectedKeys = new Set(EXPECTED_AVAILABILITY.map((e) => `${ctx.idOf[e.name]}|${e.date}`));
  const extra = rows.filter((row) => !expectedKeys.has(`${row.clientId}|${dateKey(row.date)}`));
  if (extra.length > 0) problems.push(`${extra.length} availability rows outside the mails`);
  return problems;
}

function commandKeys(state) {
  return state.commands
    .map((entry) => `${entry.clientId}|${dateKey(entry.entryDate)}|${(entry.description?.de ?? entry.commandKeyword ?? entry.abbreviation ?? "").toUpperCase()}`)
    .sort();
}

function commandProblems(state, ctx) {
  const expected = EXPECTED_COMMANDS.map((c) => `${ctx.idOf[c.name]}|${c.date}|${c.keyword}`).sort();
  const stored = commandKeys(state);
  return JSON.stringify(stored) === JSON.stringify(expected) ? [] : [`the December commands are ${JSON.stringify(stored)} instead of the wishes of the mails`];
}

async function isEntered(api, ctx) {
  const state = await storedState(api, ctx);
  return availabilityProblems(state, ctx).length === 0 && commandProblems(state, ctx).length === 0;
}

function pageOf(turn) {
  const calls = callNames(turn);
  if (calls.has(SCHEDULE_SKILL)) return SCHEDULE_ROUTE;
  if (anyOf(NAVIGATE_SKILLS, calls) && (turn.navigateTo ?? "").includes(AVAILABILITY_ROUTE)) return AVAILABILITY_ROUTE;
  if (anyOf(NAVIGATE_SKILLS, calls)) return AVAILABILITY_ROUTE;
  return null;
}

async function waitForPath(page, visited, pathName) {
  const deadline = Date.now() + PAGE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const requested = visited.find((url) => new URL(url).pathname === pathName);
    if (requested && new URL(page.url()).pathname === pathName) return requested;
    await page.waitForTimeout(BEAT.pagePoll);
  }
  return null;
}

/**
 * Rests the visible cursor on Mia's 06-07 column of 7 December (first visible column after the scroll, first row): hour 6 is blocked by
 * the day rule and hour 7 is available, so the cell shows the minus and the page lists both hours in its tooltip.
 */
async function hoverMixedAvailabilityCell(page, mouse) {
  const box = await page.locator(SEL_AVAILABILITY_CANVAS).boundingBox();
  if (!box) return false;
  const target = { x: box.x + MIXED_CELL_OFFSET.x, y: box.y + MIXED_CELL_OFFSET.y };
  await mouse.moveTo(target, MOVE_NORMAL_MS);
  await page.mouse.move(target.x + HOVER_WIGGLE_PX, target.y, { steps: HOVER_WIGGLE_STEPS });
  await page.mouse.move(target.x, target.y, { steps: HOVER_WIGGLE_STEPS });
  const shown = await page.locator(SEL_PAGE_TOOLTIP).isVisible().catch(() => false);
  await page.waitForTimeout(BEAT.tooltipHold);
  return shown;
}

async function showAvailabilityPage(page, mouse) {
  const visible = await page.locator(SEL_AVAILABILITY_CANVAS).waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  let clicks = 0;
  while (visible && clicks < MAX_MONTH_CLICKS && !(await page.locator(SEL_PERIOD_LABEL).innerText().catch(() => "")).includes(DECEMBER_LABEL)) {
    await mouse.clickLocator(page.locator(SEL_NEXT_PERIOD), MOVE_NORMAL_MS);
    clicks++;
    await page.waitForTimeout(BEAT.afterClick);
  }
  const december = (await page.locator(SEL_PERIOD_LABEL).innerText().catch(() => "")).includes(DECEMBER_LABEL);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const availabilityColumns = december ? (FIRST_STORY_DAY - 1) * AVAILABILITY_COLUMNS_PER_DAY + AVAILABILITY_MORNING_COLUMNS : 0;
  await wheelOver(page, mouse, SEL_AVAILABILITY_CANVAS, { dx: 1 }, availabilityColumns, AVAILABILITY_WHEEL_PAUSE_MS);
  const mixedTooltip = december ? await hoverMixedAvailabilityCell(page, mouse) : false;
  return { canvasVisible: visible, monthClicks: clicks, december, availabilityColumns, mixedTooltip };
}

/**
 * Turns the mouse wheel over a canvas with the visible cursor on it: dx/dy give the direction, one cell (availability) or one
 * day / sub-row (schedule) per event.
 */
async function wheelOver(page, mouse, selector, { dx = 0, dy = 0 }, ticks, pauseMs) {
  const box = ticks > 0 ? await page.locator(selector).first().boundingBox() : null;
  if (!box) return;
  await mouse.moveTo({ x: box.x + box.width / HALF, y: box.y + box.height / HALF }, MOVE_NORMAL_MS);
  for (let tick = 0; tick < ticks; tick++) {
    await page.mouse.wheel(dx, dy);
    await page.waitForTimeout(pauseMs);
  }
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

/**
 * Rests the visible cursor on Mia's first green cell (first visible day column, first row; Mia is the first person of the group) so
 * the schedule shows the availability tooltip with her hours. A small wiggle at the end makes sure the grid sees a mouse move there.
 */
async function hoverFirstAvailabilityCell(page, mouse) {
  const box = await page.locator(SEL_GRID_CANVAS).first().boundingBox();
  if (!box) return;
  const target = { x: box.x + HOVER_CELL_OFFSET.x, y: box.y + HOVER_CELL_OFFSET.y };
  log(`hover grid ${JSON.stringify(box)} at ${JSON.stringify(target)}`);
  await mouse.moveTo(target, MOVE_NORMAL_MS);
  await page.mouse.move(target.x + HOVER_WIGGLE_PX, target.y, { steps: HOVER_WIGGLE_STEPS });
  await page.mouse.move(target.x, target.y, { steps: HOVER_WIGGLE_STEPS });
  await page.waitForTimeout(BEAT.tooltipHold);
}

/**
 * The schedule opens the whole month and shows its first day, whatever December day Klacksy passes, while the story starts on 7 December: the grid is wheeled right until that
 * day is the first column (Mia's hours shade 7-9 Dec), held, then wheeled down until Priya's row is on top, so Lena's NIGHT keywords
 * (7-11 Dec) and Jonas's row come into view.
 */
async function scrollToStory(page, mouse) {
  const periodFirstDay = Number(DECEMBER.from.slice(DAY_OF_MONTH_OFFSET));
  const days = FIRST_STORY_DAY - periodFirstDay;
  await wheelOver(page, mouse, SEL_GRID_CANVAS, { dx: 1 }, days, WHEEL_PAUSE_MS);
  await hoverFirstAvailabilityCell(page, mouse);
  await page.waitForTimeout(BEAT.storyHold);
  await wheelOver(page, mouse, SEL_GRID_CANVAS, { dy: 1 }, LOWER_ROWS_SUB_ROWS, WHEEL_PAUSE_MS);
  return days;
}

async function showSchedule(page, mouse, requested) {
  const visible = await page.locator(SEL_GRID_CANVAS).first().waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const params = new URL(requested).searchParams;
  const scrolledDays = visible ? await scrollToStory(page, mouse) : 0;
  return {
    gridVisible: visible,
    scrolledDays,
    groupId: params.get(GROUP_PARAM),
    date: params.get(DATE_PARAM),
    showAvailability: params.get(SHOW_AVAILABILITY_PARAM) === PARAM_ON,
    showCommands: params.get(SHOW_COMMANDS_PARAM) === PARAM_ON,
  };
}

async function showPage(page, mouse, pathName, turnIndex, visited) {
  const requested = await waitForPath(page, visited, pathName);
  const entry = { turn: turnIndex, page: pathName, requested, reached: requested !== null };
  if (requested) {
    Object.assign(entry, pathName === SCHEDULE_ROUTE ? await showSchedule(page, mouse, requested) : await showAvailabilityPage(page, mouse));
    await page.waitForTimeout(BEAT.pageHold);
  }
  log(`page ${pathName}: ${JSON.stringify(entry)}`);
  return entry;
}

function skipReason(message, pages) {
  if (message.sendWhen === ENTERED && pages.some((p) => p.page === AVAILABILITY_ROUTE && p.reached)) return "the availability page was already shown";
  if (message.sendWhen === AVAILABILITY_SHOWN && pages.some((p) => p.page === SCHEDULE_ROUTE && p.reached && p.showAvailability && p.showCommands)) {
    return "the schedule was already opened with both displays";
  }
  return null;
}

async function notSentReason(message, take, ctx, pages) {
  if (message.sendWhen === ENTERED && !(await isEntered(take.api, ctx))) return "the availabilities and commands of the mails are not stored yet";
  if (message.sendWhen === AVAILABILITY_SHOWN && !pages.some((p) => p.page === AVAILABILITY_ROUTE && p.reached && p.december)) {
    return "the availability page was not shown on December";
  }
  return null;
}

function turnProblems(turns) {
  const problems = [];
  sentTurns(turns).forEach((turn, i) => {
    if (turn.errors.length > 0) problems.push(`answer ${i + 1}: chat error ${turn.errors.join("; ")}`);
    if (turn.content.trim() === "") problems.push(`answer ${i + 1} has no text`);
    const failed = turn.results.find((r) => r.result.startsWith(SKILL_ERROR_PREFIX));
    if (failed) problems.push(`answer ${i + 1}: ${failed.name} failed: ${failed.result}`);
  });
  const called = calledSkills(turns);
  for (const alternatives of EXPECTED_CALLS) {
    if (!anyOf(alternatives, called)) problems.push(`expected skill call ${alternatives.join(" or ")} is missing`);
  }
  return problems;
}

function pageProblems(pages) {
  const problems = [];
  const availability = pages.find((p) => p.page === AVAILABILITY_ROUTE);
  if (!availability?.reached) problems.push("the availability page was not opened");
  else if (!availability.canvasVisible || !availability.december) problems.push("the availability page did not show December");
  const schedule = pages.findLast((p) => p.page === SCHEDULE_ROUTE);
  if (!schedule?.reached) problems.push("the schedule was not opened");
  else {
    if (!schedule.gridVisible) problems.push("the schedule grid was not visible");
    if (!schedule.showAvailability || !schedule.showCommands) problems.push("the schedule was opened without both displays");
    if (!schedule.groupId) problems.push("the schedule opened without a group");
    if (!schedule.date || schedule.date < DECEMBER.from || schedule.date > DECEMBER.until) problems.push(`the schedule opened on ${schedule.date}, not in December`);
  }
  return problems;
}

function fullViewportCrop(viewport, scale) {
  const even = (value) => {
    const px = Math.round(value * scale);
    return px - (px % HALF);
  };
  return { x: 0, y: 0, width: even(viewport.width), height: even(viewport.height) };
}

/**
 * Opens the group branch of the inbox (reached in-app through the nav button, so the group selected for the schedule stays for the later pages) (mails of clients whose address is one of their e-mail communications): expands collapsed
 * tree nodes with the visible cursor until the group is visible, then selects it, so the list shows the four team mails.
 */
async function openGroupBranch(page, mouse, groupName) {
  const groupNode = page.locator(SEL_GROUP_TREE_ITEM).filter({ has: page.locator(SEL_GROUP_TREE_NAME, { hasText: groupName }) }).first();
  for (let round = 0; round < MAX_TREE_EXPAND_ROUNDS && !(await groupNode.isVisible()); round++) {
    const collapsed = page.locator(SEL_COLLAPSED_TOGGLE).first();
    if (!(await collapsed.isVisible())) break;
    await mouse.clickLocator(collapsed, MOVE_NORMAL_MS);
    await page.waitForTimeout(BEAT.afterClick);
  }
  await mouse.clickLocator(groupNode, MOVE_NORMAL_MS);
}

/**
 * After Sandra's request and Klacksy's answer, shows where the mails came from: the cursor opens the inbox through the nav button
 * (in-app, so the group chosen for the schedule stays), expands the group branch of the mails assigned to clients and opens Mia's mail,
 * then reopens the chat if the navigation closed it.
 */
async function showReadMails(take) {
  const { page, mouse, options, captions } = take;
  await captions?.show(MAILS_AVAILABILITY_CUES.inbox);
  await mouse.clickLocator(page.locator(SEL_INBOX_NAV_BUTTON), MOVE_NORMAL_MS);
  await page.locator(SEL_GROUP_TREE_ITEM).first().waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS });
  if (new URL(page.url()).pathname !== INBOX_ROUTE) throw new Error(`the inbox button opened ${page.url()}`);
  await page.waitForTimeout(BEAT.inboxHold);
  await openGroupBranch(page, mouse, options.groupName ?? MAILS_GROUP_NAME);
  const mail = page.locator(SEL_EMAIL_ITEM).filter({ hasText: FIRST_MAIL_SENDER }).first();
  await mail.waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS });
  await page.waitForTimeout(BEAT.inboxHold);
  await mouse.clickLocator(mail, MOVE_NORMAL_MS);
  await page.waitForTimeout(BEAT.mailHold);
  if (!(await page.locator(SEL_ASSISTANT_INPUT).isVisible())) {
    await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE_NORMAL_MS);
    await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  }
  return true;
}

async function takeMailsAvailability(take) {
  const { page, api, options, recorder, mouse, report, script, captions, viewport, scale } = take;
  const messages = script?.messages ?? [];
  if (messages.length === 0) throw new Error(`${VIDEO_MAILS_AVAILABILITY} needs a script`);
  const { filter } = await openSchedule(page, options);
  if (filter.periodStartDate !== DECEMBER.from) throw new Error(`the schedule shows ${filter.periodStartDate} instead of December`);
  const ctx = { filter, ...(await teamOf(api, filter)) };
  const before = await storedState(api, ctx);
  const teamIds = new Set(Object.values(ctx.idOf));
  if (before.availability.some((row) => teamIds.has(row.clientId)) || before.commands.length > 0) {
    throw new Error("December already holds availabilities or commands of the team - copy klacks_marketing_mails_template again");
  }
  report.turns = [];
  report.pages = [];
  const visited = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) visited.push(frame.url());
  });
  try {
    await recorder.start();
    await page.waitForTimeout(BEAT.intro);
    await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE_NORMAL_MS);
    await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    for (const message of messages) {
      if (message.sendWhen) {
        const skipped = skipReason(message, report.pages);
        if (skipped) {
          report.turns.push({ prompt: message.text, sent: false, skipped: true, reason: skipped });
          log(`skipped (${skipped}): ${message.text}`);
          continue;
        }
        const reason = await notSentReason(message, take, ctx, report.pages);
        if (reason) {
          report.turns.push({ prompt: message.text, sent: false, reason });
          log(`not sent (${reason}): ${message.text}`);
          break;
        }
      }
      await captions?.show(cueFor(message));
      log(`prompt: ${message.text}`);
      visited.length = 0;
      const turn = await sendChatMessage(take, message.text);
      report.turns.push({ prompt: message.text, sent: true, ...turn });
      log(`calls: ${turn.calls.map((c) => `${c.name}${JSON.stringify(c.parameters)}`).join(", ") || "-"}; answer: ${turn.content.replace(/\s+/g, " ").slice(0, LOG_PREVIEW_CHARS)}`);
      const pathName = pageOf(turn);
      if (pathName) report.pages.push(await showPage(page, mouse, pathName, sentTurns(report.turns).length, visited));
      if (!report.inboxShown) report.inboxShown = await showReadMails(take);
    }
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(take.finalHoldMs ?? MAILS_AVAILABILITY_FINAL_HOLD_MS);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullViewportCrop(viewport, scale) });
    report.finalUrl = page.url();
    const after = await storedState(api, ctx);
    report.availabilityRows = after.availability.filter((row) => teamIds.has(row.clientId)).length;
    report.commands = commandKeys(after);
    const problems = [...turnProblems(report.turns), ...pageProblems(report.pages), ...availabilityProblems(after, ctx), ...commandProblems(after, ctx)];
    const notSent = report.turns.find((t) => !t.sent && !t.skipped);
    if (notSent) problems.unshift(`not sent: ${notSent.reason}`);
    if (new URL(report.finalUrl).pathname !== SCHEDULE_ROUTE) problems.push(`the take ended on ${report.finalUrl}, not on the schedule`);
    report.failure = report.failure ?? (problems.join("; ") || null);
    report.publishable = report.failure === null;
  }
}

export const MAILS_TAKE_RUNNERS = {
  [VIDEO_MAILS_AVAILABILITY]: takeMailsAvailability,
};
