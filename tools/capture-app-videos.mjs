// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Records short localized marketing videos of a running Klacks demo instance (real app, real backend, demo data only)
 * and writes <video>-<culture>.webm (VP9) / .mp4 (H.264) / .webp (poster) into wwwroot/videos.
 * Waiting periods (LLM, wizard, validation) may be time-compressed and are then marked with an on-screen badge;
 * results are never altered. Every take restores the demo data it touched and verifies the restore. A take that does not
 * reach its outcome (e.g. Klacksy planned nothing) is encoded into its frames directory as a test take, never into wwwroot.
 * The rest-conflict take is framed on the grid's day header, the two affected rows and the error list (one fixed crop;
 * the CDP screencast delivers CSS-pixel frames regardless of the device scale factor, so legibility comes from a narrow
 * crop). It is only publishable when the rest warning appears live after the drop - no period reload - within
 * --warning-timeout-s and is then the only row in the error list (info rows switched off via the list's own filter).
 * The warning row is never clicked (clicking navigates the grid to the conflict and scrolls the framed rows away); at
 * the end the cursor is parked on free space next to the row's text so it covers none of it. The rest-conflict video is
 * encoded as a smooth loop: the final frame is held, then cross-fades into the first frame.
 * The work-entry takes (expenses, correction, hours-adjustment, replacement) live in takes/work-entry-takes.mjs, the container takes
 * (container-fill, container-split, container-pause; demo data from seed-container-demo.mjs) in takes/container-takes.mjs, the timeline takes
 * (timeline-24h, timeline-day-dragdrop) in takes/timeline-takes.mjs, the route takes (container-autofill, container-route; demo data from
 * seed-route-demo.mjs, route PDF printout rendered with pdfjs-dist) in takes/route-takes.mjs. All takes of the website's daily-operations
 * carousel (work entry, container, timeline, route) share WORK_ENTRY_VIEWPORT (1280x800); the route takes keep VIDEO_NOISE_CSS so the
 * distance toast of the optimization stays visible.
 * CLI: --videos rest-conflict,klacksy-plans-week,expenses,correction,hours-adjustment,replacement,container-fill,container-split,container-pause,timeline-24h,timeline-day-dragdrop,container-autofill,container-route  --cultures de,ar,ja  --ffmpeg <path>  --frames-dir <dir>
 *      --warning-timeout-s <n>  --test-take (never write into wwwroot)  --base-url  --api-url  --group-id  --headed  --no-encode
 * Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), FFMPEG_PATH, KLACKS_UI_URL, KLACKS_API_URL, KLACKS_DEMO_GROUP_ID,
 *      KLACKS_VIDEO_FRAMES_DIR. Chat prompts per culture live in capture-app-videos.scripts.json.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import * as S from "./lib/klacks-demo-session.mjs";
import { cursorInitScript, HumanMouse, CURSOR_SIZE_PX } from "./lib/cursor-overlay.mjs";
import { ScreenRecorder } from "./lib/screen-recorder.mjs";
import { encodeRecording } from "./lib/video-encoder.mjs";
import {
  WORK_ENTRY_TYPE,
  CELL_WIDTH_PX,
  SUB_ROW_HEIGHT_PX,
  HALF,
  ISO_DATE_LENGTH,
  SEL_GRID_CANVAS,
  SEL_NAME_ROWS,
  SCHEDULE_ROUTE_PART,
  WORKS_API,
  SCHEDULE_API,
  HTTP_DELETE,
  HTTP_POST,
  SCHEDULE_DATA_TIMEOUT_MS,
  CANVAS_SETTLE_MS,
  dateKey,
  monthFilter,
  worksIn,
  snapshotOf,
  sameSnapshot,
  openSchedule,
  rowBoxes,
  gridBox,
  cellCenter,
  ScheduleApi,
} from "./lib/schedule-grid.mjs";
import { WORK_ENTRY_TAKE_RUNNERS, WORK_ENTRY_VIDEOS } from "./takes/work-entry-takes.mjs";
import { CONTAINER_TAKE_RUNNERS, VIDEO_CONTAINER_FILL, VIDEO_CONTAINER_SPLIT, VIDEO_CONTAINER_PAUSE } from "./takes/container-takes.mjs";
import { TIMELINE_TAKE_RUNNERS, TIMELINE_VIDEOS, VIDEO_TIMELINE_24H, VIDEO_TIMELINE_DAY_DRAGDROP } from "./takes/timeline-takes.mjs";
import { ROUTE_TAKE_RUNNERS, ROUTE_VIDEOS, VIDEO_CONTAINER_AUTOFILL, VIDEO_CONTAINER_ROUTE } from "./takes/route-takes.mjs";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(toolsDir, "..");
const OUTPUT_DIR = path.join(projectRoot, "wwwroot", "videos");
const SCRIPTS_FILE = path.join(toolsDir, "capture-app-videos.scripts.json");
const OUTPUT_BASE_NAME = (video, culture) => `${video}-${culture.toLowerCase()}`;
const TAKE_REPORT_FILE = "take-report.json";
const BASELINE_FILE = "october-baseline.json";

const ENV_FFMPEG = "FFMPEG_PATH";
const ENV_FRAMES_DIR = "KLACKS_VIDEO_FRAMES_DIR";
const DEFAULT_FRAMES_DIR = path.join(os.tmpdir(), "klacks-video-frames");

const VIDEO_REST_CONFLICT = "rest-conflict";
const VIDEO_KLACKSY_PLANS_WEEK = "klacksy-plans-week";
const ALL_VIDEOS = [VIDEO_REST_CONFLICT, VIDEO_KLACKSY_PLANS_WEEK, ...WORK_ENTRY_VIDEOS, VIDEO_CONTAINER_FILL, VIDEO_CONTAINER_SPLIT, VIDEO_CONTAINER_PAUSE, ...TIMELINE_VIDEOS, ...ROUTE_VIDEOS];
const DEFAULT_CULTURES = ["de", "ar", "ja"];

const VIEWPORT = { width: 1500, height: 940 };
const CHAT_VIEWPORT = { width: 1000, height: 720 };
const WORK_ENTRY_VIEWPORT = { width: 1280, height: 800 };
const DEVICE_SCALE_FACTOR = 1;
const CURSOR_START_RATIO = { x: 0.55, y: 0.92 };
const cursorStart = (viewport) => ({ x: Math.round(viewport.width * CURSOR_START_RATIO.x), y: Math.round(viewport.height * CURSOR_START_RATIO.y) });
const JPEG_QUALITY = 80;
const recorderConfig = (viewport, scale) => ({
  jpegQuality: JPEG_QUALITY,
  maxWidth: viewport.width * scale,
  maxHeight: viewport.height * scale,
});
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const ENCODE_TARGET = {
  fps: 25,
  widths: [1500, 1280, 1120, 960],
  crfLadder: { webm: [30, 34, 38, 42, 46], mp4: [22, 25, 28, 31, 34] },
  maxBytes: 1.5 * BYTES_PER_MB,
};
const LOOP_SMOOTHING = { holdSeconds: 1, fadeSeconds: 0.4 };

const VIDEO_NOISE_CSS = `
  .tooltip, .mat-mdc-tooltip, ngb-tooltip-window, .badge-mail, .mail-badge, app-company-clock-warning { display: none !important; }
  * { caret-color: transparent !important; }
`;
const CHAT_VIDEO_NOISE_CSS = `${VIDEO_NOISE_CSS}
  app-toasts { display: none !important; }
`;

const OCTOBER = { year: 2026, month: 10, isoWeek: 41 };
const NOVEMBER = { year: 2026, month: 11, isoWeek: 45 };
const PLAN_WEEK = { from: "2026-11-02", until: "2026-11-08" };
const PROTECTED_MONTH = { from: "2026-10-01", until: "2026-10-31", expectedWorks: 118 };

const MIN_REST_HOURS = 11;
const PREFERRED_REST_HOURS = 9;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const MS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * MINUTES_PER_HOUR * 1000;
const MAX_FRAMED_DAY_INDEX = 5;
const FRAMED_EXTRA_DAYS_AFTER = 0;
const MAX_CROP_WIDTH_CSS = 860;
const CROP_MARGIN_CSS = 8;
const CURSOR_PARK_DISTANCE_CSS = 50;
const CURSOR_PARK_BELOW_GAP_CSS = 10;
const CURSOR_PARK_CLEARANCE_CSS = 6;
const CURSOR_PARK_BELOW_ROOM_CSS = CURSOR_PARK_BELOW_GAP_CSS + CURSOR_SIZE_PX + CROP_MARGIN_CSS;
const PARK_SIDE = "side";
const PARK_BELOW = "below";
const COMMENT_TEXT_WIDTH_CSS = 330;
const MIN_REST_DAYS_PER_WEEK = 2;
const MAX_CONSECUTIVE_DAYS = 6;
const DAYS_PER_WEEK = 7;
const ISO_SUNDAY = 7;
const HH_MM_LENGTH = 5;
const RESULT_PREVIEW_CHARS = 600;
const LOG_PREVIEW_CHARS = 200;

const SEL_SHIFT_TABS = "#shift-tabs .nav-link";
const ERROR_TAB_INDEX = 1;
const SEL_ERROR_ROWS = "app-schedule-error-list tr.table-row";
const SEL_ERROR_LIST_HEADER = "app-schedule-error-list thead tr";
const SEL_ERROR_LIST_FIRST_BODY_ROW = "app-schedule-error-list tbody tr";
const SEL_ERROR_LIST_COLUMNS = "app-schedule-error-list thead th";
const SEL_ERROR_LIST_EMPTY = "app-schedule-error-list td.empty-message";
const SEL_SPLIT_GUTTER = ".as-split-gutter";
const SEL_NAME_COLUMN = "#box";
const SPLITTER_DRAG_STEPS = 12;
const ALIGN_ATTEMPTS = 3;
const ALIGN_TOLERANCE_PX = 2;
const SEL_INFO_FILTER = "#info-filter-btn";
const ERROR_DATE_CELL_INDEX = 1;
const CLASS_ACTIVE = "active";
const SEL_ASSISTANT_INPUT = "#assistant-chat-input";
const SEL_ASSISTANT_SEND = "#assistant-chat-send-btn";

const REASSIGN_ROUTE = /\/Works\/([0-9a-f-]{36})\/ReassignClient/i;
const CHAT_STREAM_PART = "/assistant/chat/stream";
const SCENARIOS_API = "/api/backend/AnalyseScenarios";
const SSE_CONTENT = "content";
const SSE_FUNCTION_CALL = "function_call";
const SSE_FUNCTION_RESULT = "function_result";
const SSE_METADATA = "metadata";
const SSE_ERROR = "error";

const REASSIGN_TIMEOUT_MS = 30000;
const IN_FLIGHT_SETTLE_MS = 60000;
const IN_FLIGHT_POLL_MS = 250;
const DEFAULT_WARNING_TIMEOUT_S = 15;
const MS_PER_SECOND = 1000;
const CHAT_TURN_TIMEOUT_MS = 6 * 60 * 1000;
const SCENARIO_READY_TIMEOUT_MS = 16 * 60 * 1000;
const SCENARIO_POLL_MS = 5000;
const WHEEL_TICK_DELTA = 100;
const WHEEL_TICK_PAUSE_MS = 250;
const MAX_WHEEL_TICKS = 12;
const STABLE_POLL_MS = 150;
const STABLE_MAX_CHECKS = 40;

const BEAT = { intro: 300, hover: 300, afterDrop: 250, afterTab: 150, holdResult: 1200, readAnswer: 3500, finalHold: 6000 };
const CUT = Number.POSITIVE_INFINITY;
const MOVE = { short: 400, normal: 600, drag: 850 };
const TYPE_DELAY_MS = 55;
const FAST_FACTOR = { validation: 4, llm: 12, wizard: 40 };
const SCENARIO_READY = "scenarioReady";
const NOT_ACCEPTED = "notAccepted";
const PLANNING_SKILLS = ["start_autowizard", "start_wizard1"];
const ACCEPT_SKILL = "accept_scenario";
const JOB_ID_PATTERN = /job ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const ACCEPTED_SCENARIO_ID_PATTERN = /scenario ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}) accepted/i;
const JOB_STATUS_RUNNING = "running";
const JOB_STATUS_API = { start_autowizard: "/api/backend/AutoWizard/Status", start_wizard1: "/api/backend/Wizard/Status" };
const SKILL_ERROR_PREFIX = "Error:";

function readOptions() {
  const { values } = parseArgs({
    options: {
      videos: { type: "string" },
      cultures: { type: "string" },
      ffmpeg: { type: "string" },
      "frames-dir": { type: "string" },
      "base-url": { type: "string" },
      "api-url": { type: "string" },
      "group-id": { type: "string" },
      "warning-timeout-s": { type: "string" },
      "test-take": { type: "boolean", default: false },
      headed: { type: "boolean", default: false },
      "no-encode": { type: "boolean", default: false },
    },
  });
  const warningTimeoutS = Number(values["warning-timeout-s"] ?? DEFAULT_WARNING_TIMEOUT_S);
  if (!Number.isFinite(warningTimeoutS) || warningTimeoutS <= 0) throw new Error("--warning-timeout-s must be a positive number");
  const videos = S.splitList(values.videos) ?? ALL_VIDEOS;
  const unknown = videos.filter((v) => !ALL_VIDEOS.includes(v));
  if (unknown.length > 0) throw new Error(`Unknown videos: ${unknown.join(", ")}. Known: ${ALL_VIDEOS.join(", ")}`);
  const ffmpegPath = values.ffmpeg ?? process.env[ENV_FFMPEG];
  const encode = !values["no-encode"];
  if (encode && !ffmpegPath) throw new Error(`Pass --ffmpeg or set ${ENV_FFMPEG}.`);
  return {
    ...S.readSessionOptions(values),
    videos,
    cultures: S.splitList(values.cultures) ?? DEFAULT_CULTURES,
    ffmpegPath,
    encode,
    framesRoot: path.resolve(values["frames-dir"] ?? process.env[ENV_FRAMES_DIR] ?? DEFAULT_FRAMES_DIR),
    warningTimeoutMs: warningTimeoutS * MS_PER_SECOND,
    testTake: values["test-take"],
    headed: values.headed,
  };
}

const log = (...args) => console.log("  ", ...args);
const oneLine = (text, max) => String(text).replace(/\s+/g, " ").trim().slice(0, max);

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, ISO_DATE_LENGTH);
}

function dayDiff(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / MS_PER_DAY);
}

function hoursOf(time) {
  const [h, m] = time.split(":").map(Number);
  return h + m / MINUTES_PER_HOUR;
}

class DemoApi extends ScheduleApi {
  reassign(workId, targetClientId) {
    return this.json(`${WORKS_API}/${workId}/ReassignClient`, { method: HTTP_POST, data: { targetClientId } });
  }

  deleteWork(workId, period) {
    return this.json(`${WORKS_API}/${workId}?periodStart=${period.from}&periodEnd=${period.until}`, { method: HTTP_DELETE });
  }

  scenarios(groupId) {
    return this.json(`${SCENARIOS_API}?groupId=${groupId}`);
  }

  deleteScenario(id) {
    return this.json(`${SCENARIOS_API}/${id}`, { method: HTTP_DELETE });
  }

  jobStatus(job) {
    return this.json(`${JOB_STATUS_API[job.skill]}/${job.id}`);
  }
}

function isoWeekDays(isoDate) {
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay() || ISO_SUNDAY;
  const monday = addDays(isoDate, 1 - weekday);
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) => addDays(monday, i));
}

function busyRun(busy, clientId, fromIso, step) {
  let run = 0;
  for (let day = addDays(fromIso, step); busy.has(`${clientId}|${day}`); day = addDays(day, step)) run++;
  return run;
}

/**
 * The demo must show exactly one warning: moving a shift onto the late client's free day must neither drop the
 * weekly rest days below the minimum nor create a too long run of consecutive working days.
 */
function keepsOtherRules(busy, clientId, day) {
  const freeDays = isoWeekDays(day).filter((d) => !busy.has(`${clientId}|${d}`)).length;
  const consecutive = busyRun(busy, clientId, day, -1) + 1 + busyRun(busy, clientId, day, 1);
  return freeDays - 1 >= MIN_REST_DAYS_PER_WEEK && consecutive <= MAX_CONSECUTIVE_DAYS;
}

function pickRestConflict(data, filter) {
  const works = worksIn(data, filter.periodStartDate, filter.periodEndDate)
    .filter((e) => !e.isReplacementEntry && !e.isGroupRestricted && !e.lockLevel);
  const rowOf = new Map(data.clients.map((c, i) => [c.id, i]));
  const busy = new Set(data.entries.map((e) => `${e.clientId}|${dateKey(e.entryDate)}`));
  const candidates = [];
  for (const late of works) {
    const lateEnd = hoursOf(late.endTime);
    if (lateEnd <= hoursOf(late.startTime)) continue;
    const day = dateKey(late.entryDate);
    const next = addDays(day, 1);
    if (dayDiff(filter.periodStartDate, next) > MAX_FRAMED_DAY_INDEX) continue;
    if (busy.has(`${late.clientId}|${next}`)) continue;
    if (!keepsOtherRules(busy, late.clientId, next)) continue;
    const lateClient = data.clients[rowOf.get(late.clientId)];
    if (lateClient?.groupItemValidFrom && lateClient.groupItemValidFrom > next) continue;
    for (const early of works) {
      if (early.clientId === late.clientId || dateKey(early.entryDate) !== next) continue;
      const rest = HOURS_PER_DAY - lateEnd + hoursOf(early.startTime);
      if (rest >= MIN_REST_HOURS) continue;
      const lateRow = rowOf.get(late.clientId);
      const earlyRow = rowOf.get(early.clientId);
      candidates.push({
        late, early, rest, day, next, lateClient, lateRow, earlyRow,
        earlyClient: data.clients[earlyRow],
        score: [Math.abs(rest - PREFERRED_REST_HOURS), Math.abs(lateRow - earlyRow), dayDiff(filter.periodStartDate, day)],
      });
    }
  }
  candidates.sort((a, b) => a.score[0] - b.score[0] || a.score[1] - b.score[1] || a.score[2] - b.score[2]);
  if (candidates.length === 0) throw new Error("no work pair in the framed October days produces a rest-time conflict");
  return candidates[0];
}

async function scrollRowsIntoView(page, mouse, rows) {
  const grid = await gridBox(page);
  const visibleTop = grid.y + SUB_ROW_HEIGHT_PX;
  const visibleBottom = grid.y + grid.height;
  const wheelPoint = { x: grid.x + grid.width / HALF, y: grid.y + grid.height / HALF };
  for (let tick = 0; tick < MAX_WHEEL_TICKS; tick++) {
    const boxes = await rowBoxes(page);
    const top = Math.min(...rows.map((r) => boxes[r].top));
    const bottom = Math.max(...rows.map((r) => boxes[r].top + boxes[r].height));
    if (top >= visibleTop && bottom <= visibleBottom) return;
    await page.mouse.move(wheelPoint.x, wheelPoint.y);
    Object.assign(mouse, wheelPoint);
    await page.mouse.wheel(0, top < visibleTop ? -WHEEL_TICK_DELTA : WHEEL_TICK_DELTA);
    await page.waitForTimeout(WHEEL_TICK_PAUSE_MS);
  }
  throw new Error(`rows ${rows.join(",")} could not be scrolled into view`);
}

function errorRowFor(page, pick) {
  return page.locator(SEL_ERROR_ROWS)
    .filter({ hasText: pick.day })
    .filter({ hasText: pick.lateClient.name })
    .filter({ hasText: pick.late.endTime.slice(0, HH_MM_LENGTH) })
    .filter({ hasText: pick.early.startTime.slice(0, HH_MM_LENGTH) });
}

async function waitVisible(locator, timeout) {
  return locator.waitFor({ state: "visible", timeout }).then(() => true, () => false);
}

async function verifyBaseline(options, snapshot) {
  const file = path.join(options.framesRoot, BASELINE_FILE);
  const stored = await readFile(file, "utf8").then(JSON.parse, () => null);
  if (!stored) {
    await writeFile(file, JSON.stringify(snapshot, null, 2));
    log(`stored October baseline (${snapshot.length} works) in ${file}`);
    return;
  }
  if (!sameSnapshot(stored, snapshot)) {
    const missing = stored.filter((row) => !snapshot.includes(row));
    throw new Error(`October differs from the baseline in ${file} (${missing.length} rows changed) - restore the demo data first`);
  }
}

function trackReassigns(page) {
  const tracker = { ids: new Set(), inFlight: new Set() };
  const done = (r) => tracker.inFlight.delete(r);
  page.on("request", (r) => {
    const match = r.url().match(REASSIGN_ROUTE);
    if (!match) return;
    tracker.ids.add(match[1].toLowerCase());
    tracker.inFlight.add(r);
  });
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  tracker.settle = async () => {
    const deadline = Date.now() + IN_FLIGHT_SETTLE_MS;
    while (tracker.inFlight.size > 0 && Date.now() < deadline) await page.waitForTimeout(IN_FLIGHT_POLL_MS);
    return tracker.inFlight.size === 0;
  };
  return tracker;
}

async function restoreReassigned(api, tracker, originalClientOf) {
  const settled = await tracker.settle();
  for (const id of tracker.ids) {
    const original = originalClientOf.get(id);
    if (original) await api.reassign(id, original);
  }
  return settled;
}

/**
 * Moves the page's own grid/list splitter so that the grid pane ends exactly at the lower affected row: no row below
 * is cut in half and the error list sits right under the demonstrated rows.
 */
async function scrollRowsToGridTop(page, mouse, rows) {
  await scrollRowsIntoView(page, mouse, rows);
  const grid = await gridBox(page);
  const visibleTop = grid.y + SUB_ROW_HEIGHT_PX;
  for (let tick = 0; tick < MAX_WHEEL_TICKS; tick++) {
    const before = await rowBoxes(page);
    const top = Math.min(...rows.map((r) => before[r].top));
    if (top - WHEEL_TICK_DELTA < visibleTop) break;
    await page.mouse.wheel(0, WHEEL_TICK_DELTA);
    await page.waitForTimeout(WHEEL_TICK_PAUSE_MS);
    const after = await rowBoxes(page);
    if (after[rows[0]].top === before[rows[0]].top) break;
  }
}

async function alignGridBottomToRows(page, mouse, rows) {
  await scrollRowsToGridTop(page, mouse, rows);
  const gutters = await page.locator(SEL_SPLIT_GUTTER).evaluateAll((els) => els.map((el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }).filter((b) => b.width > b.height && b.height > 0));
  if (gutters.length === 0) throw new Error("grid/list splitter not found");
  const [gutter] = gutters;
  for (let attempt = 0; attempt < ALIGN_ATTEMPTS; attempt++) {
    const nameColumn = await page.locator(SEL_NAME_COLUMN).boundingBox();
    const boxes = await rowBoxes(page);
    const lowerBottom = Math.max(...rows.map((r) => boxes[r].top + boxes[r].height));
    const delta = lowerBottom - (nameColumn.y + nameColumn.height);
    if (Math.abs(delta) <= ALIGN_TOLERANCE_PX) return;
    const current = await page.locator(SEL_SPLIT_GUTTER).evaluateAll((els, want) => {
      const hit = els.map((el) => el.getBoundingClientRect()).find((b) => b.width > b.height && Math.abs(b.x - want.x) < 1);
      return hit ? { x: hit.x, y: hit.y, width: hit.width, height: hit.height } : null;
    }, gutter);
    if (!current) throw new Error("grid/list splitter disappeared");
    const from = { x: current.x + current.width / HALF, y: current.y + current.height / HALF };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, from.y + delta, { steps: SPLITTER_DRAG_STEPS });
    await page.mouse.up();
    await page.waitForTimeout(CANVAS_SETTLE_MS);
  }
  throw new Error("grid pane could not be aligned to the affected rows");
}

async function hasClass(locator, name) {
  return ((await locator.getAttribute("class")) ?? "").split(/\s+/).includes(name);
}

async function switchOffInfoRows(page) {
  const info = page.locator(SEL_INFO_FILTER);
  await info.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (await hasClass(info, CLASS_ACTIVE)) await info.click();
  if (await hasClass(info, CLASS_ACTIVE)) throw new Error("info filter of the error list could not be switched off");
}

async function visibleErrorRows(page) {
  return page.locator(SEL_ERROR_ROWS).evaluateAll((els) => els.map((el) => el.innerText.replace(/\s+/g, " ").trim()));
}

function unionRect(rects) {
  return {
    left: Math.min(...rects.map((r) => r.left)),
    top: Math.min(...rects.map((r) => r.top)),
    right: Math.max(...rects.map((r) => r.right)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
  };
}

function toEvenDevicePx(value, scale) {
  const px = Math.round(value * scale);
  return px - (px % HALF);
}

/**
 * Fixed crop (CSS px) around what the take demonstrates: the grid's day header (weekday + date, so viewers see the
 * shift lands on the day after the late shift), the rows down to the two affected ones from the name column up to the
 * target day (+ FRAMED_EXTRA_DAYS_AFTER days of context) and the error list header plus its first row, with room below
 * for the parked cursor.
 */
async function framingRect(page, pick, dayIndex, isRtl) {
  const grid = await gridBox(page);
  const rows = await page.locator(SEL_NAME_ROWS).evaluateAll((els, idx) => idx.map((i) => {
    const b = els[i].getBoundingClientRect();
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
  }), [pick.lateRow, pick.earlyRow]);
  const gridSpan = (dayIndex + 1 + FRAMED_EXTRA_DAYS_AFTER) * CELL_WIDTH_PX;
  const nameColumn = await page.locator(SEL_NAME_COLUMN).boundingBox();
  const headerTop = Math.min(grid.y, nameColumn?.y ?? grid.y);
  const dayHeader = isRtl
    ? { left: grid.x + grid.width - gridSpan, right: grid.x + grid.width, top: headerTop, bottom: headerTop + SUB_ROW_HEIGHT_PX }
    : { left: grid.x, right: grid.x + gridSpan, top: headerTop, bottom: headerTop + SUB_ROW_HEIGHT_PX };
  const cells = isRtl
    ? { left: grid.x + grid.width - gridSpan, right: grid.x + grid.width, top: rows[0].top, bottom: rows[0].bottom }
    : { left: grid.x, right: grid.x + gridSpan, top: rows[0].top, bottom: rows[0].bottom };
  const header = await page.locator(SEL_ERROR_LIST_HEADER).boundingBox();
  const firstRow = await page.locator(SEL_ERROR_LIST_FIRST_BODY_ROW).first().boundingBox();
  const columns = await page.locator(SEL_ERROR_LIST_COLUMNS).evaluateAll((els) => els.map((el) => {
    const b = el.getBoundingClientRect();
    return { left: b.left, right: b.right };
  }));
  const [, dateColumn, , commentColumn] = columns;
  const listTop = header.y;
  const listBottom = firstRow.y + firstRow.height;
  const list = isRtl
    ? { left: commentColumn.right - COMMENT_TEXT_WIDTH_CSS, right: dateColumn.right, top: listTop, bottom: listBottom }
    : { left: dateColumn.left, right: commentColumn.left + COMMENT_TEXT_WIDTH_CSS, top: listTop, bottom: listBottom };
  const emptyText = await page.locator(SEL_ERROR_LIST_EMPTY).evaluateAll((els) => els.map((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const b = range.getBoundingClientRect();
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
  }));
  const u = unionRect([...rows, cells, dayHeader, list, ...emptyText]);
  const x = Math.max(0, snapToColumn(u.left - CROP_MARGIN_CSS, grid, Math.floor, isRtl));
  const y = Math.max(0, u.top);
  const right = Math.min(VIEWPORT.width, snapToColumn(u.right + CROP_MARGIN_CSS, grid, Math.ceil, isRtl));
  const bottom = Math.min(VIEWPORT.height, u.bottom + CURSOR_PARK_BELOW_ROOM_CSS);
  if (right - x > MAX_CROP_WIDTH_CSS) {
    throw new Error(`framing needs ${Math.round(right - x)} CSS px (max ${MAX_CROP_WIDTH_CSS}) - pick an earlier day`);
  }
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Moves a crop edge that falls inside the day grid onto the next column boundary, so no day cell is cut in half.
 */
function snapToColumn(edge, grid, round, isRtl) {
  if (edge <= grid.x || edge >= grid.x + grid.width) return edge;
  const origin = isRtl ? grid.x + grid.width : grid.x;
  return origin + round((edge - origin) / CELL_WIDTH_PX) * CELL_WIDTH_PX;
}

function deviceCrop(rect, scale) {
  return {
    x: toEvenDevicePx(rect.x, scale),
    y: toEvenDevicePx(rect.y, scale),
    width: toEvenDevicePx(rect.width, scale),
    height: toEvenDevicePx(rect.height, scale),
  };
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Measures the warning row's content: the date text, every text run and icon (obstacles for the cursor) and the
 * row box, all in viewport CSS px.
 */
async function measureWarningRow(row) {
  return row.evaluate((tr, dateCellIndex) => {
    const toRect = (b) => ({ left: b.left, right: b.right, top: b.top, bottom: b.bottom });
    const textRects = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const rects = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        rects.push(...[...range.getClientRects()].map(toRect));
      }
      return rects;
    };
    const cells = [...tr.children];
    const icons = [...tr.querySelectorAll("img, svg, button, i")].map((el) => toRect(el.getBoundingClientRect()));
    return {
      rowBox: toRect(tr.getBoundingClientRect()),
      dateText: textRects(cells[dateCellIndex]),
      obstacles: [...textRects(tr), ...icons],
    };
  }, ERROR_DATE_CELL_INDEX);
}

/**
 * Picks where the cursor rests at the end: about CURSOR_PARK_DISTANCE_CSS beside the date text on the side without
 * text (right in LTR, left in RTL first), else on the empty area right below the row. A spot is only valid when the
 * cursor's footprint touches no text or icon of the row and lies inside the frame.
 */
function pickCursorPark(measured, frame, isRtl) {
  const text = unionRect(measured.dateText);
  const mid = (text.top + text.bottom) / HALF;
  const sides = isRtl ? [-1, 1] : [1, -1];
  const candidates = sides.map((sign) => ({
    placement: PARK_SIDE,
    point: { x: sign > 0 ? text.right + CURSOR_PARK_DISTANCE_CSS : text.left - CURSOR_PARK_DISTANCE_CSS - CURSOR_SIZE_PX, y: mid },
  }));
  candidates.push({
    placement: PARK_BELOW,
    point: { x: (text.left + text.right) / HALF, y: measured.rowBox.bottom + CURSOR_PARK_BELOW_GAP_CSS },
  });
  const fits = ({ point }) => {
    const footprint = {
      left: point.x - CURSOR_PARK_CLEARANCE_CSS, right: point.x + CURSOR_SIZE_PX + CURSOR_PARK_CLEARANCE_CSS,
      top: point.y - CURSOR_PARK_CLEARANCE_CSS, bottom: point.y + CURSOR_SIZE_PX + CURSOR_PARK_CLEARANCE_CSS,
    };
    const inFrame = footprint.left >= frame.x && footprint.right <= frame.x + frame.width
      && footprint.top >= frame.y && footprint.bottom <= frame.y + frame.height;
    return inFrame && !measured.obstacles.some((o) => intersects(footprint, o));
  };
  return candidates.find(fits) ?? null;
}

function insideRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

async function takeRestConflict(take) {
  const { page, api, options, recorder, mouse, report, scale } = take;
  const { filter, data } = await openSchedule(page, options);
  const before = snapshotOf(data, PROTECTED_MONTH);
  if (before.length !== PROTECTED_MONTH.expectedWorks) {
    throw new Error(`October has ${before.length} works, expected ${PROTECTED_MONTH.expectedWorks} - refusing to record`);
  }
  await verifyBaseline(options, before);
  const originalClientOf = new Map(worksIn(data, PROTECTED_MONTH.from, PROTECTED_MONTH.until).map((e) => [e.id.toLowerCase(), e.clientId]));
  const tracker = trackReassigns(page);
  const pick = pickRestConflict(data, filter);
  Object.assign(report, {
    move: `${pick.early.abbreviation} ${pick.next} ${pick.earlyClient.firstName} ${pick.earlyClient.name} -> ${pick.lateClient.firstName} ${pick.lateClient.name}`,
    after: `${pick.late.abbreviation} ${pick.day} ${pick.late.startTime}-${pick.late.endTime}`,
    restHours: pick.rest,
    warningTimeoutMs: options.warningTimeoutMs,
  });
  log(`move ${report.move} (after ${report.after}, rest ${pick.rest} h)`);

  const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
  await page.locator(SEL_SHIFT_TABS).nth(ERROR_TAB_INDEX).click();
  await switchOffInfoRows(page);
  await alignGridBottomToRows(page, mouse, [pick.lateRow, pick.earlyRow]);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  const rowsBefore = await visibleErrorRows(page);
  if (rowsBefore.length > 0) {
    throw new Error(`error list (info rows off) is not empty before the move: ${rowsBefore.join(" | ")}`);
  }
  const dayIndex = dayDiff(filter.periodStartDate, pick.next);
  const frame = await framingRect(page, pick, dayIndex, isRtl);
  report.frameCss = frame;
  const source = await cellCenter(page, pick.earlyRow, dayIndex, isRtl);
  const target = await cellCenter(page, pick.lateRow, dayIndex, isRtl);
  const lateCell = await cellCenter(page, pick.lateRow, dayIndex - 1, isRtl);
  if (![source, target, lateCell].every((point) => insideRect(point, frame))) {
    throw new Error("a demonstrated cell lies outside the framed region");
  }
  await mouse.moveTo({ x: frame.x + frame.width / HALF, y: frame.y + frame.height - CROP_MARGIN_CSS * HALF }, 1);
  const deletes = [];
  page.on("request", (r) => {
    if (r.method() === HTTP_DELETE && r.url().includes(WORKS_API)) deletes.push(r.url());
  });

  try {
    await recorder.start();
    await page.waitForTimeout(BEAT.intro);
    await mouse.moveTo(lateCell, MOVE.normal);
    await page.waitForTimeout(BEAT.hover);
    await mouse.moveTo(source, MOVE.short);
    const reassign = page.waitForResponse((r) => REASSIGN_ROUTE.test(r.url()), { timeout: REASSIGN_TIMEOUT_MS });
    await mouse.drag(source, target, MOVE.drag);
    const response = await reassign;
    const movedId = response.url().match(REASSIGN_ROUTE)[1];
    if (movedId !== pick.early.id || !response.ok() || deletes.length > 0) {
      throw new Error(`unexpected drop: moved ${movedId} (expected ${pick.early.id}), HTTP ${response.status()}, deletes ${deletes.length}`);
    }
    const droppedAt = Date.now();
    await mouse.click(target, MOVE.short);
    const row = errorRowFor(page, pick).first();
    report.warningWithoutReload = await waitVisible(row, options.warningTimeoutMs);
    report.warningAfterMs = report.warningWithoutReload ? Date.now() - droppedAt : null;
    report.errorRowsAfterDrop = await visibleErrorRows(page);
    if (!report.warningWithoutReload) {
      report.failure = `rest warning did not appear within ${options.warningTimeoutMs / MS_PER_SECOND} s after the drop (no reload)`;
      log(report.failure);
      report.posterAt = ScreenRecorder.now();
      await page.waitForTimeout(BEAT.afterDrop);
    } else {
      report.warningText = oneLine(await row.innerText(), RESULT_PREVIEW_CHARS);
      if (report.errorRowsAfterDrop.length !== 1) {
        report.failure = `error list shows ${report.errorRowsAfterDrop.length} rows instead of only the demonstrated warning`;
        log(report.failure);
      }
      await page.waitForTimeout(BEAT.afterDrop);
      const park = pickCursorPark(await measureWarningRow(row), frame, isRtl);
      report.cursorPark = park;
      if (park) {
        await mouse.moveTo(park.point, MOVE.normal);
      } else {
        report.failure = report.failure ?? "no free spot inside the frame to park the cursor beside the warning text";
        log(report.failure);
      }
      await page.waitForTimeout(CANVAS_SETTLE_MS);
      const boxes = await rowBoxes(page);
      const framed = [pick.lateRow, pick.earlyRow]
        .every((r) => boxes[r].top >= frame.y && boxes[r].top + boxes[r].height <= frame.y + frame.height);
      if (!framed && !report.failure) report.failure = "the affected rows left the frame while the warning was shown";
      report.posterAt = ScreenRecorder.now();
      await page.waitForTimeout(BEAT.holdResult);
    }
    report.publishable = !report.failure;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: report.frameCss ? deviceCrop(report.frameCss, scale) : null });
    report.reassignedIds = [...tracker.ids];
    report.reassignsSettled = await restoreReassigned(api, tracker, originalClientOf);
    const after = snapshotOf(await api.schedule(filter), PROTECTED_MONTH);
    report.octoberRestored = sameSnapshot(before, after);
    report.octoberWorks = after.length;
    if (!report.octoberRestored || !report.reassignsSettled) {
      throw new Error("October snapshot differs after the reset or a reassign is still in flight - check the demo data!");
    }
    log(`October restored: ${after.length} works, identical snapshot`);
  }
}

function overlapsPlanWeek(scenario) {
  return dateKey(scenario.fromDate) <= PLAN_WEEK.until && dateKey(scenario.untilDate) >= PLAN_WEEK.from;
}

async function resetPlanWeek(api, options, filter, report) {
  const data = await api.schedule(filter);
  const groupClients = new Set(data.clients.map((c) => c.id));
  const works = worksIn(data, PLAN_WEEK.from, PLAN_WEEK.until).filter((w) => groupClients.has(w.clientId));
  for (const work of works) await api.deleteWork(work.id, { from: filter.periodStartDate, until: filter.periodEndDate });
  const overlapping = ((await api.scenarios(options.groupId)) ?? []).filter(overlapsPlanWeek);
  for (const scenario of overlapping) await api.deleteScenario(scenario.id);
  const left = worksIn(await api.schedule(filter), PLAN_WEEK.from, PLAN_WEEK.until).length;
  report.reset = { groupClients: groupClients.size, deletedWorks: works.length, deletedScenarios: overlapping.length, remainingWorks: left };
  if (left !== 0) throw new Error(`plan week still has ${left} works after reset`);
}

function parseSse(text) {
  const turn = { calls: [], results: [], content: "", navigateTo: null, errors: [] };
  for (const block of text.split("\n\n")) {
    const event = (block.match(/^event: (.*)$/m) ?? [])[1];
    const raw = (block.match(/^data: ([\s\S]*)$/m) ?? [])[1];
    if (!event || !raw) continue;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    if (event === SSE_CONTENT) turn.content += data.text ?? "";
    else if (event === SSE_FUNCTION_CALL) turn.calls.push({ name: data.functionName, parameters: data.parameters });
    else if (event === SSE_FUNCTION_RESULT) turn.results.push({ name: data.functionName, result: String(data.functionResult ?? "").slice(0, RESULT_PREVIEW_CHARS) });
    else if (event === SSE_METADATA && data.navigateTo) turn.navigateTo = data.navigateTo;
    else if (event === SSE_ERROR) turn.errors.push(data.errorMessage);
  }
  return turn;
}

async function waitStable(locator) {
  let previous = null;
  for (let attempt = 0; attempt < STABLE_MAX_CHECKS; attempt++) {
    const box = await locator.boundingBox();
    if (box && previous && Math.abs(box.x - previous.x) < 1 && Math.abs(box.y - previous.y) < 1) return;
    previous = box;
    await locator.page().waitForTimeout(STABLE_POLL_MS);
  }
  throw new Error("element never came to rest");
}

async function sendChatMessage(take, text) {
  const { page, recorder, mouse } = take;
  const input = page.locator(SEL_ASSISTANT_INPUT);
  await waitStable(input);
  await mouse.clickLocator(input, MOVE.normal);
  await input.pressSequentially(text, { delay: TYPE_DELAY_MS });
  const typed = await input.inputValue();
  if (typed !== text) throw new Error(`chat input holds "${typed}" instead of the prompt`);
  const finished = page.waitForEvent("requestfinished", {
    predicate: (r) => r.url().includes(CHAT_STREAM_PART),
    timeout: CHAT_TURN_TIMEOUT_MS,
  });
  await mouse.clickLocator(page.locator(SEL_ASSISTANT_SEND), MOVE.short);
  await recorder.beginFast(FAST_FACTOR.llm);
  const request = await finished;
  await recorder.endFast();
  const response = await request.response();
  const body = response ? await response.text().catch(() => "") : "";
  await page.waitForTimeout(BEAT.readAnswer);
  return { ...parseSse(body), requestBody: request.postDataJSON() };
}

function startedJob(turns) {
  for (const turn of turns) {
    for (const r of turn.results ?? []) {
      if (!PLANNING_SKILLS.includes(r.name) || r.result.startsWith(SKILL_ERROR_PREFIX)) continue;
      const id = (r.result.match(JOB_ID_PATTERN) ?? [])[1];
      if (id) return { skill: r.name, id };
    }
  }
  return null;
}

function startedJobCount(turns) {
  return turns.flatMap((turn) => turn.results ?? [])
    .filter((r) => PLANNING_SKILLS.includes(r.name) && !r.result.startsWith(SKILL_ERROR_PREFIX) && JOB_ID_PATTERN.test(r.result))
    .length;
}

function acceptedScenarioId(turns) {
  for (const turn of turns) {
    for (const r of turn.results ?? []) {
      if (r.name !== ACCEPT_SKILL || r.result.startsWith(SKILL_ERROR_PREFIX)) continue;
      const id = (r.result.match(ACCEPTED_SCENARIO_ID_PATTERN) ?? [])[1];
      if (id) return id.toLowerCase();
    }
  }
  return null;
}

function acceptedScenario(turns) {
  return turns.some((turn) => turn.results?.some((r) => r.name === ACCEPT_SKILL && !r.result.startsWith(SKILL_ERROR_PREFIX)));
}

/**
 * Waits (time-compressed, badge visible) until the planning job has left the running state and returns its final
 * status; the scenario it produced is looked up afterwards, so the chat never accepts a plan that is still changing.
 */
async function waitForJobAndScenario(take, job) {
  const { api, recorder, page, options, report } = take;
  await recorder.beginFast(FAST_FACTOR.wizard);
  const deadline = Date.now() + SCENARIO_READY_TIMEOUT_MS;
  try {
    let status = null;
    while (Date.now() < deadline) {
      status = await api.jobStatus(job);
      if (status && status.status !== JOB_STATUS_RUNNING) break;
      await page.waitForTimeout(SCENARIO_POLL_MS);
    }
    report.job = {
      ...job,
      status: status?.status ?? null,
      reason: status?.reason ?? null,
      finalScenarioId: status?.result?.finalScenarioId ?? null,
      finalScenarioName: status?.result?.finalScenarioName ?? null,
      harmonizationSkipped: status?.result?.harmonizationSkipped ?? null,
      harmonizationSkippedReason: status?.result?.harmonizationSkippedReason ?? null,
    };
    log(`job ${job.skill} ${job.id}: ${report.job.status}${report.job.reason ? ` (${report.job.reason})` : ""}`);
    const scenarios = (await api.scenarios(options.groupId)) ?? [];
    return scenarios.find(overlapsPlanWeek) ?? null;
  } finally {
    await recorder.endFast();
  }
}

async function takeKlacksyPlansWeek(take) {
  const { page, api, options, recorder, mouse, report, culture, scripts, viewport, scale } = take;
  const script = scripts[VIDEO_KLACKSY_PLANS_WEEK]?.[culture];
  if (!script) throw new Error(`no ${VIDEO_KLACKSY_PLANS_WEEK} script for ${culture} in ${path.basename(SCRIPTS_FILE)}`);
  const { filter } = await openSchedule(page, options);
  const octoberFilter = { ...filter, ...monthFilter(OCTOBER) };
  const octoberBefore = snapshotOf(await api.schedule(octoberFilter), PROTECTED_MONTH);
  await verifyBaseline(options, octoberBefore);
  await resetPlanWeek(api, options, filter, report);
  log(`plan week ${PLAN_WEEK.from}..${PLAN_WEEK.until} reset: ${JSON.stringify(report.reset)}`);
  await openSchedule(page, options);
  report.turns = [];
  try {
    await recorder.start();
    await page.waitForTimeout(BEAT.intro);
    await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE.normal);
    await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    for (const message of script.messages) {
      if (message.sendWhen === SCENARIO_READY || message.sendWhen === NOT_ACCEPTED) {
        const job = startedJob(report.turns);
        let reason = null;
        if (!job) reason = "Klacksy did not start a planning job";
        else if (message.sendWhen === NOT_ACCEPTED && acceptedScenario(report.turns)) reason = "scenario already accepted";
        else if (message.sendWhen === SCENARIO_READY && !(await waitForJobAndScenario(take, job))) reason = "no scenario for the plan week appeared";
        if (reason) {
          report.turns.push({ prompt: message.text, sent: false, reason });
          log(`not sent (${reason}): ${message.text}`);
          continue;
        }
      }
      log(`prompt: ${message.text}`);
      const turn = await sendChatMessage(take, message.text);
      report.turns.push({ prompt: message.text, sent: true, ...turn });
      log(`calls: ${turn.calls.map((c) => c.name).join(", ") || "-"}; answer: ${oneLine(turn.content, LOG_PREVIEW_CHARS)}`);
    }
    if (!page.url().includes(S.SCHEDULE_PATH)) report.navigatedAwayTo = page.url();
    await recorder.beginFast(CUT);
    await openSchedule(page, options);
    await recorder.endFast();
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.finalHold);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: deviceCrop({ x: 0, y: 0, ...viewport }, scale) });
    report.planWeekWorksAfterTake = worksIn(await api.schedule(filter), PLAN_WEEK.from, PLAN_WEEK.until).length;
    report.acceptedViaChat = acceptedScenario(report.turns);
    report.startedJobs = startedJobCount(report.turns);
    report.acceptedScenarioId = acceptedScenarioId(report.turns);
    report.holisticRan = report.job?.harmonizationSkipped === false;
    report.acceptedFinalScenario = report.acceptedScenarioId !== null
      && report.acceptedScenarioId === String(report.job?.finalScenarioId ?? "").toLowerCase();
    report.publishable = report.planWeekWorksAfterTake > 0 && report.acceptedViaChat && report.startedJobs === 1
      && report.holisticRan && report.acceptedFinalScenario;
    if (!report.publishable && !report.failure) {
      if (!report.acceptedViaChat) report.failure = "Klacksy did not accept the scenario in the chat";
      else if (report.startedJobs !== 1) report.failure = `Klacksy started ${report.startedJobs} planning jobs instead of one`;
      else if (!report.holisticRan) report.failure = `stage 3 did not run: ${report.job?.harmonizationSkippedReason ?? report.job?.reason ?? "unknown"}`;
      else if (!report.acceptedFinalScenario) report.failure = "Klacksy accepted a scenario other than the job's final one";
      else report.failure = "no works landed in the plan week";
    }
    report.octoberUnchanged = sameSnapshot(octoberBefore, snapshotOf(await api.schedule(octoberFilter), PROTECTED_MONTH));
    if (!report.octoberUnchanged) throw new Error("October changed during the Klacksy take - check the demo data!");
  }
}

const TAKES = {
  [VIDEO_REST_CONFLICT]: { period: OCTOBER, viewport: VIEWPORT, css: VIDEO_NOISE_CSS, run: takeRestConflict },
  [VIDEO_KLACKSY_PLANS_WEEK]: { period: NOVEMBER, viewport: CHAT_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: takeKlacksyPlansWeek },
  ...Object.fromEntries(WORK_ENTRY_VIDEOS.map((video) => [
    video,
    { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: WORK_ENTRY_TAKE_RUNNERS[video], needsScript: true },
  ])),
  [VIDEO_CONTAINER_FILL]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: CONTAINER_TAKE_RUNNERS[VIDEO_CONTAINER_FILL], needsScript: true },
  [VIDEO_CONTAINER_SPLIT]: { period: NOVEMBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: CONTAINER_TAKE_RUNNERS[VIDEO_CONTAINER_SPLIT], needsScript: true },
  [VIDEO_CONTAINER_PAUSE]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: CONTAINER_TAKE_RUNNERS[VIDEO_CONTAINER_PAUSE], needsScript: true },
  [VIDEO_TIMELINE_24H]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: TIMELINE_TAKE_RUNNERS[VIDEO_TIMELINE_24H] },
  [VIDEO_TIMELINE_DAY_DRAGDROP]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: TIMELINE_TAKE_RUNNERS[VIDEO_TIMELINE_DAY_DRAGDROP] },
  [VIDEO_CONTAINER_AUTOFILL]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: VIDEO_NOISE_CSS, run: ROUTE_TAKE_RUNNERS[VIDEO_CONTAINER_AUTOFILL], needsScript: true },
  [VIDEO_CONTAINER_ROUTE]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: VIDEO_NOISE_CSS, run: ROUTE_TAKE_RUNNERS[VIDEO_CONTAINER_ROUTE], needsScript: true },
};

async function recordTake(browser, options, shared, video, culture) {
  const definition = TAKES[video];
  const scale = DEVICE_SCALE_FACTOR;
  const { viewport } = definition;
  const start = cursorStart(viewport);
  const context = await S.newCultureContext(browser, options, culture, {
    viewport,
    deviceScaleFactor: scale,
    viewMode: S.VIEW_MODE_TABLE,
    period: definition.period,
    css: definition.css,
    extraInitScripts: [cursorInitScript(start)],
  });
  const page = await context.newPage();
  const framesDir = path.join(options.framesRoot, OUTPUT_BASE_NAME(video, culture));
  const report = { video, culture, framesDir };
  const script = shared.scripts[video]?.[culture] ?? null;
  if (definition.needsScript && !script) throw new Error(`no ${video} script for ${culture} in ${path.basename(SCRIPTS_FILE)}`);
  try {
    await S.login(page, options);
    await S.assertCulture(page, culture, shared.metadata);
    await page.mouse.move(start.x, start.y);
    await definition.run({
      page, options, culture, report, scale, viewport, script,
      api: shared.api,
      scripts: shared.scripts,
      recorder: new ScreenRecorder(page, framesDir, recorderConfig(viewport, scale)),
      mouse: new HumanMouse(page, start),
    });
  } finally {
    await mkdir(framesDir, { recursive: true });
    await writeFile(path.join(framesDir, TAKE_REPORT_FILE), JSON.stringify(report, null, 2));
    await context.close();
  }
  return report;
}

function summarize(name, encoded) {
  return {
    name,
    seconds: encoded.seconds.toFixed(1),
    sourceFps: encoded.sourceFps.toFixed(1),
    width: encoded.webm.width,
    webmKB: Math.round(encoded.webm.size / BYTES_PER_KB),
    mp4KB: Math.round(encoded.mp4.size / BYTES_PER_KB),
    posterKB: Math.round(encoded.poster.size / BYTES_PER_KB),
  };
}

async function main() {
  const options = readOptions();
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(options.framesRoot, { recursive: true });
  const scripts = JSON.parse(await readFile(SCRIPTS_FILE, "utf8"));
  const browser = await chromium.launch({ headless: !options.headed });
  const request = (await browser.newContext({ ignoreHTTPSErrors: true })).request;
  const results = [];
  try {
    const { languages, metadata } = await S.readInstalledLanguages(request, options.apiUrl);
    const token = await S.apiLogin(request, options);
    await S.markProactiveMessagesRead(request, options, token);
    const shared = { api: new DemoApi(request, options, token), scripts, metadata };
    for (const video of options.videos) {
      for (const culture of options.cultures) {
        if (!languages.includes(culture)) {
          console.warn(`! skipping ${culture}: not installed (installed: ${languages.join(", ")})`);
          continue;
        }
        const name = OUTPUT_BASE_NAME(video, culture);
        console.log(`> ${name}`);
        try {
          const report = await recordTake(browser, options, shared, video, culture);
          if (!options.encode) {
            results.push({ name, frames: report.framesDir });
            continue;
          }
          const outputDir = report.publishable && !options.testTake ? OUTPUT_DIR : report.framesDir;
          if (!report.publishable) console.warn(`! ${name}: take did not reach its outcome (${report.failure ?? "see take report"}) - encoded as test take into ${outputDir}`);
          else if (options.testTake) console.warn(`! ${name}: --test-take - encoded into ${outputDir}`);
          report.encoded = await encodeRecording(options.ffmpegPath, report.framesDir, {
            ...ENCODE_TARGET,
            ...(video === VIDEO_REST_CONFLICT ? { loop: LOOP_SMOOTHING } : {}),
            outputBase: path.join(outputDir, name),
          });
          await writeFile(path.join(report.framesDir, TAKE_REPORT_FILE), JSON.stringify(report, null, 2));
          results.push(summarize(name, report.encoded));
        } catch (error) {
          console.error(`x ${name}: ${error.message}`);
          process.exitCode = 1;
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.table(results);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
