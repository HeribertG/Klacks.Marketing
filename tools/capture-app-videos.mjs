// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Records short localized marketing videos of a running Klacks demo instance (real app, real backend, demo data only)
 * and writes <video>-<culture>.webm (VP9) / .mp4 (H.264) / .webp (poster) into wwwroot/videos.
 * Waiting periods (LLM, wizard, validation) may be time-compressed and are then marked with an on-screen badge;
 * results are never altered. Every take restores the demo data it touched and verifies the restore. A take that does not
 * reach its outcome (e.g. Klacksy planned nothing) is encoded into its frames directory as a test take, never into wwwroot.
 * Every take is guarded against the dev-server error overlay (<vite-error-overlay>, lib/dev-overlay-guard.mjs): checked before the take,
 * polled while it runs, checked at every mouse step / recorder start / fast-forward and after the take; a sighting aborts the take with a
 * clear error, marks the report not publishable (report.devOverlay) and nothing is encoded.
 * The work-entry takes (expenses, correction, hours-adjustment, replacement) live in takes/work-entry-takes.mjs, the container takes
 * (container-fill, container-split, container-pause; demo data from seed-container-demo.mjs) in takes/container-takes.mjs, the timeline takes
 * (timeline-24h, timeline-day-dragdrop) in takes/timeline-takes.mjs, the route takes (container-autofill, container-route; demo data from
 * seed-route-demo.mjs, route PDF printout rendered with pdfjs-dist) in takes/route-takes.mjs, the shift-feature takes (shift-sporadic,
 * shift-time-range, shift-sum-employees, shift-quantity, shift-qualification; demo data from seed-shift-features-demo.mjs, December 2026 schedule of
 * the group "Besondere Dienste Winterthur") in takes/shift-feature-takes.mjs, the scenario takes (scenario-create, scenario-autowizard, scenario-compare,
 * scenario-rule-violation; October of the demo group, the AutoWizard take plans the week 02.-08.11.; cleanup helper reset-scenario-demo.mjs) in takes/scenario-takes.mjs, the rule takes
 * (rest-conflict, rule-collision, rule-consecutive-days, rule-holiday-work; October / December of the demo group, findings shown live in the error list)
 * in takes/rule-takes.mjs. All takes of the website's carousels (work entry, container, timeline, route, shift features, scenarios, rules) share
 * WORK_ENTRY_VIEWPORT (1280x800); the route takes and shift-qualification keep VIDEO_NOISE_CSS so the
 * distance toast of the optimization / the error toast of the refused booking stays visible.
 * CLI: --videos rest-conflict,rule-collision,rule-consecutive-days,rule-holiday-work,klacksy-plans-week,expenses,correction,hours-adjustment,replacement,container-fill,container-split,container-pause,timeline-24h,timeline-day-dragdrop,container-autofill,container-route,shift-sporadic,shift-time-range,shift-sum-employees,shift-quantity,shift-qualification,scenario-create,scenario-autowizard,scenario-compare,scenario-rule-violation  --cultures de,ar,ja  --ffmpeg <path>  --frames-dir <dir>
 *      --test-take (never write into wwwroot)  --base-url  --api-url  --group-id  --headed  --no-encode
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
import { cursorInitScript, HumanMouse } from "./lib/cursor-overlay.mjs";
import { ScreenRecorder } from "./lib/screen-recorder.mjs";
import { DevOverlayGuard, DevOverlayViolationError } from "./lib/dev-overlay-guard.mjs";
import { encodeRecording } from "./lib/video-encoder.mjs";
import {
  HALF,
  WORKS_API,
  HTTP_DELETE,
  dateKey,
  monthFilter,
  worksIn,
  snapshotOf,
  sameSnapshot,
  openSchedule,
  ScheduleApi,
} from "./lib/schedule-grid.mjs";
import { WORK_ENTRY_TAKE_RUNNERS, WORK_ENTRY_VIDEOS } from "./takes/work-entry-takes.mjs";
import { CONTAINER_TAKE_RUNNERS, VIDEO_CONTAINER_FILL, VIDEO_CONTAINER_SPLIT, VIDEO_CONTAINER_PAUSE } from "./takes/container-takes.mjs";
import { TIMELINE_TAKE_RUNNERS, TIMELINE_VIDEOS, VIDEO_TIMELINE_24H, VIDEO_TIMELINE_DAY_DRAGDROP } from "./takes/timeline-takes.mjs";
import { ROUTE_TAKE_RUNNERS, ROUTE_VIDEOS, VIDEO_CONTAINER_AUTOFILL, VIDEO_CONTAINER_ROUTE } from "./takes/route-takes.mjs";
import {
  SHIFT_FEATURE_TAKE_RUNNERS,
  SHIFT_FEATURE_VIDEOS,
  VIDEO_SHIFT_SPORADIC,
  VIDEO_SHIFT_TIME_RANGE,
  VIDEO_SHIFT_SUM_EMPLOYEES,
  VIDEO_SHIFT_QUANTITY,
  VIDEO_SHIFT_QUALIFICATION,
} from "./takes/shift-feature-takes.mjs";
import {
  SCENARIO_TAKE_RUNNERS,
  SCENARIO_VIDEOS,
  VIDEO_SCENARIO_CREATE,
  VIDEO_SCENARIO_AUTOWIZARD,
  VIDEO_SCENARIO_COMPARE,
  VIDEO_SCENARIO_RULE_VIOLATION,
} from "./takes/scenario-takes.mjs";
import {
  RULE_TAKE_RUNNERS,
  RULE_VIDEOS,
  VIDEO_REST_CONFLICT,
  VIDEO_RULE_COLLISION,
  VIDEO_RULE_CONSECUTIVE_DAYS,
  VIDEO_RULE_HOLIDAY_WORK,
} from "./takes/rule-takes.mjs";

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

const VIDEO_KLACKSY_PLANS_WEEK = "klacksy-plans-week";
const ALL_VIDEOS = [...RULE_VIDEOS, VIDEO_KLACKSY_PLANS_WEEK, ...WORK_ENTRY_VIDEOS, VIDEO_CONTAINER_FILL, VIDEO_CONTAINER_SPLIT, VIDEO_CONTAINER_PAUSE, ...TIMELINE_VIDEOS, ...ROUTE_VIDEOS, ...SHIFT_FEATURE_VIDEOS, ...SCENARIO_VIDEOS];
const DEFAULT_CULTURES = ["de", "ar", "ja"];

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

const VIDEO_NOISE_CSS = `
  .tooltip, .mat-mdc-tooltip, ngb-tooltip-window, .badge-mail, .mail-badge, app-company-clock-warning { display: none !important; }
  * { caret-color: transparent !important; }
`;
const CHAT_VIDEO_NOISE_CSS = `${VIDEO_NOISE_CSS}
  app-toasts { display: none !important; }
`;

const OCTOBER = { year: 2026, month: 10, isoWeek: 41 };
const NOVEMBER = { year: 2026, month: 11, isoWeek: 45 };
const DECEMBER = { year: 2026, month: 12, isoWeek: 50 };
const PLAN_WEEK = { from: "2026-11-02", until: "2026-11-08" };
const PROTECTED_MONTH = { from: "2026-10-01", until: "2026-10-31", expectedWorks: 118 };

const RESULT_PREVIEW_CHARS = 600;
const LOG_PREVIEW_CHARS = 200;

const SEL_ASSISTANT_INPUT = "#assistant-chat-input";
const SEL_ASSISTANT_SEND = "#assistant-chat-send-btn";

const CHAT_STREAM_PART = "/assistant/chat/stream";
const SCENARIOS_API = "/api/backend/AnalyseScenarios";
const SSE_CONTENT = "content";
const SSE_FUNCTION_CALL = "function_call";
const SSE_FUNCTION_RESULT = "function_result";
const SSE_METADATA = "metadata";
const SSE_ERROR = "error";

const CHAT_TURN_TIMEOUT_MS = 6 * 60 * 1000;
const SCENARIO_READY_TIMEOUT_MS = 16 * 60 * 1000;
const SCENARIO_POLL_MS = 5000;
const STABLE_POLL_MS = 150;
const STABLE_MAX_CHECKS = 40;

const BEAT = { intro: 300, readAnswer: 3500, finalHold: 6000 };
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
      "test-take": { type: "boolean", default: false },
      headed: { type: "boolean", default: false },
      "no-encode": { type: "boolean", default: false },
    },
  });
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
    testTake: values["test-take"],
    headed: values.headed,
  };
}

const log = (...args) => console.log("  ", ...args);
const oneLine = (text, max) => String(text).replace(/\s+/g, " ").trim().slice(0, max);

class DemoApi extends ScheduleApi {
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

function toEvenDevicePx(value, scale) {
  const px = Math.round(value * scale);
  return px - (px % HALF);
}

function deviceCrop(rect, scale) {
  return {
    x: toEvenDevicePx(rect.x, scale),
    y: toEvenDevicePx(rect.y, scale),
    width: toEvenDevicePx(rect.width, scale),
    height: toEvenDevicePx(rect.height, scale),
  };
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
  [VIDEO_REST_CONFLICT]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: RULE_TAKE_RUNNERS[VIDEO_REST_CONFLICT] },
  [VIDEO_RULE_COLLISION]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: RULE_TAKE_RUNNERS[VIDEO_RULE_COLLISION] },
  [VIDEO_RULE_CONSECUTIVE_DAYS]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: RULE_TAKE_RUNNERS[VIDEO_RULE_CONSECUTIVE_DAYS] },
  [VIDEO_RULE_HOLIDAY_WORK]: { period: DECEMBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: RULE_TAKE_RUNNERS[VIDEO_RULE_HOLIDAY_WORK] },
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
  [VIDEO_SHIFT_SPORADIC]: { period: DECEMBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: SHIFT_FEATURE_TAKE_RUNNERS[VIDEO_SHIFT_SPORADIC] },
  [VIDEO_SHIFT_TIME_RANGE]: { period: DECEMBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: SHIFT_FEATURE_TAKE_RUNNERS[VIDEO_SHIFT_TIME_RANGE] },
  [VIDEO_SHIFT_SUM_EMPLOYEES]: { period: DECEMBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: SHIFT_FEATURE_TAKE_RUNNERS[VIDEO_SHIFT_SUM_EMPLOYEES] },
  [VIDEO_SHIFT_QUANTITY]: { period: DECEMBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: SHIFT_FEATURE_TAKE_RUNNERS[VIDEO_SHIFT_QUANTITY] },
  [VIDEO_SHIFT_QUALIFICATION]: { period: DECEMBER, viewport: WORK_ENTRY_VIEWPORT, css: VIDEO_NOISE_CSS, run: SHIFT_FEATURE_TAKE_RUNNERS[VIDEO_SHIFT_QUALIFICATION] },
  [VIDEO_SCENARIO_CREATE]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: SCENARIO_TAKE_RUNNERS[VIDEO_SCENARIO_CREATE], needsScript: true },
  [VIDEO_SCENARIO_AUTOWIZARD]: { period: NOVEMBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: SCENARIO_TAKE_RUNNERS[VIDEO_SCENARIO_AUTOWIZARD] },
  [VIDEO_SCENARIO_COMPARE]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: SCENARIO_TAKE_RUNNERS[VIDEO_SCENARIO_COMPARE], needsScript: true },
  [VIDEO_SCENARIO_RULE_VIOLATION]: { period: OCTOBER, viewport: WORK_ENTRY_VIEWPORT, css: CHAT_VIDEO_NOISE_CSS, run: SCENARIO_TAKE_RUNNERS[VIDEO_SCENARIO_RULE_VIOLATION], needsScript: true },
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
    extraInitScripts: [cursorInitScript(start), DevOverlayGuard.initScript()],
  });
  const page = await context.newPage();
  const guard = new DevOverlayGuard(page);
  const framesDir = path.join(options.framesRoot, OUTPUT_BASE_NAME(video, culture));
  const report = { video, culture, framesDir };
  const script = shared.scripts[video]?.[culture] ?? null;
  if (definition.needsScript && !script) throw new Error(`no ${video} script for ${culture} in ${path.basename(SCRIPTS_FILE)}`);
  try {
    await S.login(page, options);
    await S.assertCulture(page, culture, shared.metadata);
    await page.mouse.move(start.x, start.y);
    await guard.assertClean("before the take");
    guard.startWatching();
    await definition.run({
      page, options, culture, report, scale, viewport, script,
      api: shared.api,
      scripts: shared.scripts,
      recorder: new ScreenRecorder(page, framesDir, recorderConfig(viewport, scale), guard),
      mouse: new HumanMouse(page, start, guard),
    });
    await guard.assertClean("after the take");
  } catch (error) {
    const violation = guard.violation ?? (error instanceof DevOverlayViolationError ? error : null);
    if (violation) {
      report.publishable = false;
      report.failure = violation.message;
      report.devOverlay = { stage: violation.stage, ...violation.finding };
      throw violation;
    }
    throw error;
  } finally {
    guard.stopWatching();
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
