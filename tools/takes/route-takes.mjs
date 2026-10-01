// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Video takes for the route features of the container template editor (demo data from tools/seed-route-demo.mjs):
 * "container-autofill" lets the autofill pick the tasks of the empty Wednesday template of "Kundentour Winterthur" and
 * saves the result; "container-route" optimizes the deliberately zigzag Thursday template of "Servicetour Winterthur"
 * and saves the new order. Both take the start/end base from the template (or select the branch in the two dropdowns when
 * the editor did not preselect it). The editor has no map and no distance panel: distance and travel time are only shown in
 * the success toast (2 s), so the take waits for that toast and holds the frame. Slow route/geocoding calls are
 * time-compressed with the fast-forward badge. Both takes end with the printout: the route-PDF icon builds a jsPDF document
 * (summary + OSM route map, stop table, directions) and the app opens it with window.open in a NEW TAB, which the recorder
 * (one page) would never film and which headless Chromium could not display (no PDF viewer). The take therefore hooks
 * URL.createObjectURL/window.open before the click, lets the app run its real export, and shows the captured PDF blob as a
 * full-page overlay of the recorded page: rendered with pdf.js when pdfjs-dist is resolvable from tools/ (works headless),
 * else with Chromium's own PDF viewer when navigator.pdfViewerEnabled (headed run), else the take is not publishable.
 * Every take verifies the persisted template through the API, leaves the editor through its "back" link (releases the lock; the
 * printout overlay is removed first) and restores the seed state through the seed script. The tour starts and ends at the same base,
 * so the optimized loop may run in either direction: expectedOrder is matched forwards and backwards (informational only).
 * @param take - page, api, options, recorder, mouse, report, culture, script, viewport, scale (see recordTake)
 */

import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { CANVAS_SETTLE_MS } from "../lib/schedule-grid.mjs";
import {
  SEL_AVAILABLE_ROWS,
  SEL_SAVE,
  SEL_SELECTED_ROWS,
  SEL_TIME_RULER,
  TEMPLATES_API,
  fitSelectedList,
  leaveEditor,
  listFullyVisible,
  openContainerEditor,
} from "../lib/container-editor.mjs";
import {
  API_BASE,
  SHIFT_TYPE_CONTAINER,
  WEEKDAY_THURSDAY,
  WEEKDAY_WEDNESDAY,
  findShifts,
} from "../lib/klacks-demo-api.mjs";

export const VIDEO_CONTAINER_AUTOFILL = "container-autofill";
export const VIDEO_CONTAINER_ROUTE = "container-route";
export const ROUTE_VIDEOS = [VIDEO_CONTAINER_AUTOFILL, VIDEO_CONTAINER_ROUTE];

const AUTOFILL_CONTAINER = { name: "Kundentour Winterthur", abbreviation: "KTW" };
const ROUTE_CONTAINER = { name: "Servicetour Winterthur", abbreviation: "STW" };
const AUTOFILL_TASK_PATTERN = /^KT\d{2}$/;
const ROUTE_TASK_PATTERN = /^ST\d{2}$/;
const MIN_AUTOFILL_ITEMS = 3;

const toolsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEED_SCRIPT = path.join(toolsDir, "seed-route-demo.mjs");
const SEED_RESET_AUTOFILL_ARGS = ["--reset-autofill", "--lock-wait-s", "150"];
const SEED_RESET_ROUTE_ARGS = ["--reset-route", "--lock-wait-s", "150"];
const SEED_TIMEOUT_MS = 5 * 60 * 1000;
const run = promisify(execFile);

const HTTP_GET = "GET";

const SEL_START_BASE = "#start-base";
const SEL_END_BASE = "#end-base";
const SEL_AUTOFILL_ICON = ".zone-center app-icon-wizard";
const SEL_ROUTE_ICON = ".zone-center app-icon-route";
const SEL_ROUTE_FILE_ICON = ".zone-center app-icon-route-file";
const SEL_TOLERANCE_SLIDER = ".zone-center .tolerance-slider";
const SEL_TOLERANCE_HANDLE = `${SEL_TOLERANCE_SLIDER} .ngx-slider-pointer-min`;
const SEL_TOLERANCE_BAR = `${SEL_TOLERANCE_SLIDER} .ngx-slider-full-bar`;
const SEL_VIOLATION_ROWS = "#selected-tasks-list tr.timerange-violation";
const TOLERANCE_EXACT_VALUE = 100;
const SLIDER_OVERSHOOT_PX = 30;
const SEL_TOAST_SUCCESS = "ngb-toast.bg-success";
const SEL_TOAST_PROBLEM = "ngb-toast.bg-danger, ngb-toast.bg-info";
const API_AUTOFILL_PART = "RouteOptimization/autofill";
const API_OPTIMIZE_PART = "RouteOptimization/optimize-route";
const HTTP_POST = "POST";
const KEY_ESCAPE = "Escape";
const ABBREVIATION_CELL_INDEX = 2;

const HH_MM_LENGTH = 5;
const SAVE_TIMEOUT_MS = 30000;
const BUSY_TIMEOUT_MS = 330000;
const REAL_TIME_WAIT_MS = 2500;
const RESULT_APPLY_TIMEOUT_MS = 30000;
const RESULT_POLL_MS = 200;
const TOAST_PEEK_TIMEOUT_MS = 4000;
const RESULT_PREVIEW_CHARS = 300;
const FAST_FACTOR = { autofill: 8, route: 6 };
const HALF = 2;
const PARK_OFFSET = { x: -60, y: 170 };

const BEAT = { intro: 700, hover: 400, field: 350, row: 220, toast: 1800, ruler: 1800, beforeSave: 700, result: 900 };
const MOVE = { short: 350, normal: 600, row: 350, slider: 900 };

const PDFJS_PACKAGE = "pdfjs-dist";
const PDFJS_LIB_FILE = path.join("build", "pdf.min.mjs");
const PDFJS_WORKER_FILE = path.join("build", "pdf.worker.min.mjs");
const PDF_METHOD_PDFJS = "pdfjs";
const PDF_METHOD_VIEWER = "chromium-viewer";
const PDF_OVERLAY_ID = "capture-pdf-overlay";
const PDF_HOOK_KEY = "__captureRoutePdf";
const PDF_HEADER = "%PDF-";
const PDF_MAP_ERROR_TEXT = "Map could not be generated";
const PDF_VIEWER_PARAMS = "#toolbar=0&navpanes=0&view=FitH";
const OSM_TILE_HOST = "tile.openstreetmap.org";
const PDF_OVERLAY_Z_INDEX = 2147483000;
const PDF_OVERLAY_BACKGROUND = "#3b3b3b";
const PDF_OVERLAY_PADDING_PX = 24;
const PDF_A4_LANDSCAPE_RATIO = 297 / 210;
const PDF_BUILD_TIMEOUT_MS = 90000;
const PDF_VIEWER_SETTLE_MS = 3000;
const PDF_MIN_BYTES = 5000;
const WHEEL_TICK_PX = 120;
const WHEEL_TICK_PAUSE_MS = 45;
const BEAT_PDF = { firstPage: 3200, afterScroll: 2600, finalHold: 1500 };
const FAST_FACTOR_PDF = 6;

const log = (...args) => console.log("  ", ...args);
const fullFrame = (take) => ({ x: 0, y: 0, width: take.viewport.width * take.scale, height: take.viewport.height * take.scale });
const hhmm = (time) => String(time ?? "").slice(0, HH_MM_LENGTH);
const oneLine = (text, max) => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const center = (box) => ({ x: box.x + box.width / HALF, y: box.y + box.height / HALF });
const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

function seedAdapter(api) {
  return { call: (method, apiPath, { data } = {}) => api.json(`${API_BASE}${apiPath}`, { method, data }) };
}

async function findContainerId(api, def) {
  const matches = await findShifts(seedAdapter(api), def, SHIFT_TYPE_CONTAINER);
  if (matches.length !== 1) {
    throw new Error(`container "${def.name}" (${def.abbreviation}) found ${matches.length} times - run tools/seed-route-demo.mjs first`);
  }
  return matches[0].id;
}

async function loadTemplate(api, containerId, weekday) {
  const templates = (await api.json(TEMPLATES_API(containerId), { method: HTTP_GET })) ?? [];
  return templates.find((t) => t.weekday === weekday && !t.isHoliday && !t.isWeekdayAndHoliday) ?? null;
}

const effectiveStart = (item) => hhmm(item.shift?.isTimeRange ? item.timeRangeStartItem || item.startItem : item.startItem);
const effectiveEnd = (item) => hhmm(item.shift?.isTimeRange ? item.timeRangeEndItem || item.endItem : item.endItem);

function orderedItems(template) {
  return [...(template?.containerTemplateItems ?? [])].sort((a, b) => effectiveStart(a).localeCompare(effectiveStart(b)));
}

const abbreviationsOf = (items) => items.map((item) => item.shift?.abbreviation ?? "");

function itemSnapshot(template) {
  return orderedItems(template).map((item) => [
    item.shiftId ?? "", hhmm(item.startItem), hhmm(item.endItem), hhmm(item.timeRangeStartItem), hhmm(item.timeRangeEndItem),
    hhmm(item.travelTimeBefore), hhmm(item.travelTimeAfter),
  ].join("|"));
}

function describeSlots(items) {
  return items.map((item) => `${item.shift?.abbreviation} ${effectiveStart(item)}-${effectiveEnd(item)}`);
}

function checkSchedulePlausible(items, container) {
  const problems = [];
  const from = hhmm(container.fromTime);
  const until = hhmm(container.untilTime);
  items.forEach((item, index) => {
    if (from && effectiveStart(item) < from) problems.push(`${item.shift?.abbreviation} starts before the container (${effectiveStart(item)} < ${from})`);
    if (until && effectiveEnd(item) > until) problems.push(`${item.shift?.abbreviation} ends after the container (${effectiveEnd(item)} > ${until})`);
    const next = items[index + 1];
    if (next && effectiveStart(next) < effectiveEnd(item)) problems.push(`${item.shift?.abbreviation} overlaps ${next.shift?.abbreviation}`);
  });
  return problems;
}

async function runSeedReset(options, resetArgs) {
  try {
    const { stdout } = await run(process.execPath, [SEED_SCRIPT, ...resetArgs, "--api-url", options.apiUrl], {
      timeout: SEED_TIMEOUT_MS,
      env: process.env,
    });
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`seed reset (${resetArgs[0]}) failed: ${oneLine(error.stderr || error.message, RESULT_PREVIEW_CHARS * HALF)}`);
  }
}

const openEditor = openContainerEditor;

async function showBases(take, baseName) {
  const { page, mouse, report } = take;
  report.basesPreselected = true;
  for (const selector of [SEL_START_BASE, SEL_END_BASE]) {
    const select = page.locator(selector);
    await mouse.moveTo(center(await select.boundingBox()), MOVE.normal);
    if (!(await select.inputValue())) {
      await mouse.clickLocator(select, MOVE.short);
      await page.keyboard.press(KEY_ESCAPE);
      await select.selectOption({ label: baseName });
      report.basesPreselected = false;
    }
    await page.waitForTimeout(BEAT.field);
  }
  const values = [await page.locator(SEL_START_BASE).inputValue(), await page.locator(SEL_END_BASE).inputValue()];
  if (!values[0] || !values[1]) throw new Error("start/end base are not set - the autofill/route buttons stay hidden");
  report.bases = values;
}

async function readSelectedAbbreviations(page) {
  return page.locator(SEL_SELECTED_ROWS).evaluateAll(
    (els, index) => els.map((el) => (el.cells[index]?.innerText ?? "").trim()),
    ABBREVIATION_CELL_INDEX,
  );
}

async function sweepRows(take) {
  const { page, mouse } = take;
  const rows = page.locator(SEL_SELECTED_ROWS);
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const box = await rows.nth(i).boundingBox();
    if (!box || box.y < 0 || box.y + box.height > take.viewport.height) continue;
    await mouse.moveTo(center(box), MOVE.row);
    await page.waitForTimeout(BEAT.row);
  }
}

async function peekToast(page, selector) {
  const toast = page.locator(selector).first();
  const appeared = await toast.waitFor({ state: "attached", timeout: TOAST_PEEK_TIMEOUT_MS }).then(() => true, () => false);
  if (!appeared) return "";
  return oneLine(await toast.evaluate((el) => el.textContent).catch(() => ""), RESULT_PREVIEW_CHARS);
}

async function waitForUiResult(take, isApplied) {
  const { page } = take;
  const deadline = Date.now() + RESULT_APPLY_TIMEOUT_MS;
  for (;;) {
    const rows = await readSelectedAbbreviations(page);
    if (isApplied(rows)) return rows;
    if (Date.now() >= deadline) return null;
    await page.waitForTimeout(RESULT_POLL_MS);
  }
}

async function clickAndAwaitResult(take, trigger, { apiPart, fastFactor, what, isApplied }) {
  const { page, recorder, mouse } = take;
  const call = page.waitForResponse(
    (r) => r.url().includes(apiPart) && r.request().method() === HTTP_POST,
    { timeout: BUSY_TIMEOUT_MS },
  );
  call.catch(() => {});
  await mouse.clickLocator(trigger, MOVE.normal);
  const quick = await Promise.race([call.then(() => true), page.waitForTimeout(REAL_TIME_WAIT_MS).then(() => false)]);
  if (!quick) await recorder.beginFast(fastFactor);
  let response;
  try {
    response = await call;
  } catch {
    throw new Error(`${what}: no response of ${apiPart} within ${BUSY_TIMEOUT_MS / 1000} s`);
  } finally {
    await recorder.endFast();
  }
  if (!response.ok()) {
    const body = await response.text().catch(() => "");
    throw new Error(`${what}: ${apiPart} -> HTTP ${response.status()} ${oneLine(body, RESULT_PREVIEW_CHARS)}`);
  }
  const result = await response.json().catch(() => null);
  if (result?.isEstimated) {
    throw new Error(`${what}: ${apiPart} returned estimated travel times (routing service unreachable); the video would show the "travel times estimated" warning toast`);
  }
  const rows = await waitForUiResult(take, isApplied);
  if (!rows) {
    throw new Error(`${what}: the editor did not show a result within ${RESULT_APPLY_TIMEOUT_MS / 1000} s (${await peekToast(page, SEL_TOAST_PROBLEM) || "no toast"})`);
  }
  return { rows, toast: await peekToast(page, SEL_TOAST_SUCCESS) };
}

/**
 * Drags the time-window tolerance slider (default: the middle) to its "exact" end like a user, so the autofill only places
 * tasks inside their windows and no row of the result is flagged as a time-window violation.
 */
async function dragToleranceToExact(take) {
  const { page, mouse, report } = take;
  const handle = page.locator(SEL_TOLERANCE_HANDLE);
  const handleBox = await handle.boundingBox();
  const barBox = await page.locator(SEL_TOLERANCE_BAR).boundingBox();
  if (!handleBox || !barBox) throw new Error("tolerance slider handle or bar not found");
  const from = center(handleBox);
  await mouse.drag(from, { x: barBox.x + barBox.width + SLIDER_OVERSHOOT_PX, y: from.y }, MOVE.slider);
  report.toleranceValue = Number(await handle.getAttribute("aria-valuenow"));
  if (report.toleranceValue !== TOLERANCE_EXACT_VALUE) throw new Error(`tolerance slider shows ${report.toleranceValue} instead of ${TOLERANCE_EXACT_VALUE}`);
  await page.waitForTimeout(BEAT.field);
}

async function hoverIfPresent(take, selector, beat) {
  const { page, mouse } = take;
  const box = await page.locator(selector).first().boundingBox().catch(() => null);
  if (!box) return false;
  await mouse.moveTo(center(box), MOVE.normal);
  await page.waitForTimeout(beat);
  return true;
}

async function saveTemplate(take, containerId) {
  const { page, mouse } = take;
  const response = page.waitForResponse(
    (r) => r.url().includes(TEMPLATES_API(containerId)) && r.request().method() !== HTTP_GET,
    { timeout: SAVE_TIMEOUT_MS },
  );
  await mouse.clickLocator(page.locator(SEL_SAVE), MOVE.normal);
  const result = await response;
  if (!result.ok()) throw new Error(`template save -> HTTP ${result.status()}`);
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

async function parkAndMarkPoster(take, report) {
  const { page, mouse } = take;
  const ruler = await page.locator(SEL_TIME_RULER).boundingBox();
  await mouse.moveTo({ x: ruler.x + ruler.width / HALF, y: ruler.y + ruler.height - PARK_OFFSET.y }, MOVE.normal);
  await page.waitForTimeout(BEAT.result);
  report.posterAt = ScreenRecorder.now();
}

async function showRuler(take) {
  const { page, mouse } = take;
  const ruler = await page.locator(SEL_TIME_RULER).boundingBox();
  await mouse.moveTo({ x: ruler.x + ruler.width / HALF, y: ruler.y + ruler.height / HALF }, MOVE.normal);
  await page.waitForTimeout(BEAT.ruler);
}

async function loadPdfjsAssets() {
  const require = createRequire(import.meta.url);
  for (const dir of require.resolve.paths(PDFJS_PACKAGE) ?? []) {
    const root = path.join(dir, PDFJS_PACKAGE);
    try {
      await access(path.join(root, PDFJS_LIB_FILE));
      await access(path.join(root, PDFJS_WORKER_FILE));
      return { root, lib: await readFile(path.join(root, PDFJS_LIB_FILE), "utf8"), worker: await readFile(path.join(root, PDFJS_WORKER_FILE), "utf8") };
    } catch {
      continue;
    }
  }
  return null;
}

async function choosePdfMethod(page) {
  const assets = await loadPdfjsAssets();
  const viewerEnabled = await page.evaluate(() => navigator.pdfViewerEnabled === true);
  if (assets) return { method: PDF_METHOD_PDFJS, assets, viewerEnabled };
  if (viewerEnabled) return { method: PDF_METHOD_VIEWER, assets: null, viewerEnabled };
  return { method: null, assets: null, viewerEnabled };
}

async function installPdfHook(page) {
  await page.evaluate((key) => {
    const store = { blobs: [], opened: [] };
    window[key] = store;
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      const url = create(object);
      if (object instanceof Blob && object.type === "application/pdf") store.blobs.push({ url, blob: object });
      return url;
    };
    window.open = (url) => {
      store.opened.push(String(url));
      return { closed: false, close() {}, location: {} };
    };
  }, PDF_HOOK_KEY);
}

async function inspectPdfBlob(page) {
  return page.evaluate(async ({ key, header, mapError }) => {
    const { blob } = window[key].blobs[0];
    const text = await blob.text();
    return {
      bytes: blob.size,
      headerOk: text.startsWith(header),
      pages: (text.match(/\/Type\s*\/Page\b/g) ?? []).length,
      mapError: text.includes(mapError),
      distances: [...new Set(text.match(/\d+\.\d{2} km/g) ?? [])],
    };
  }, { key: PDF_HOOK_KEY, header: PDF_HEADER, mapError: PDF_MAP_ERROR_TEXT });
}

async function mountPdfjsOverlay(take, assets) {
  const { page, viewport } = take;
  const pageWidth = Math.min(
    Math.round((viewport.height - PDF_OVERLAY_PADDING_PX * HALF) * PDF_A4_LANDSCAPE_RATIO),
    viewport.width - PDF_OVERLAY_PADDING_PX * HALF,
  );
  return page.evaluate(async ({ key, id, libSource, workerSource, width, padding, z, background }) => {
    const toUrl = (source) => URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const lib = await import(toUrl(libSource));
    lib.GlobalWorkerOptions.workerSrc = toUrl(workerSource);
    const data = new Uint8Array(await window[key].blobs[0].blob.arrayBuffer());
    const doc = await lib.getDocument({ data }).promise;
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = `position:fixed;inset:0;overflow-y:auto;overflow-x:hidden;z-index:${z};background:${background};`
      + `padding:${padding}px 0;display:flex;flex-direction:column;align-items:center;gap:${padding}px;`;
    const output = window.devicePixelRatio || 1;
    for (let number = 1; number <= doc.numPages; number++) {
      const pdfPage = await doc.getPage(number);
      const scale = width / pdfPage.getViewport({ scale: 1 }).width;
      const view = pdfPage.getViewport({ scale: scale * output });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(view.width);
      canvas.height = Math.floor(view.height);
      canvas.style.cssText = `width:${width}px;height:${Math.round(view.height / output)}px;flex:none;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.5);`;
      await pdfPage.render({ canvas, canvasContext: canvas.getContext("2d"), viewport: view }).promise;
      overlay.appendChild(canvas);
    }
    document.documentElement.appendChild(overlay);
    const first = overlay.firstElementChild;
    return { pages: doc.numPages, stride: Math.round(first.getBoundingClientRect().height + padding) };
  }, {
    key: PDF_HOOK_KEY, id: PDF_OVERLAY_ID, libSource: assets.lib, workerSource: assets.worker,
    width: pageWidth, padding: PDF_OVERLAY_PADDING_PX, z: PDF_OVERLAY_Z_INDEX, background: PDF_OVERLAY_BACKGROUND,
  });
}

async function mountViewerOverlay(take) {
  const { page, viewport } = take;
  await page.evaluate(({ key, id, params, z, background }) => {
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = `position:fixed;inset:0;z-index:${z};background:${background};`;
    const frame = document.createElement("iframe");
    frame.src = `${window[key].blobs[0].url}${params}`;
    frame.style.cssText = "border:0;width:100%;height:100%;";
    overlay.appendChild(frame);
    document.documentElement.appendChild(overlay);
  }, { key: PDF_HOOK_KEY, id: PDF_OVERLAY_ID, params: PDF_VIEWER_PARAMS, z: PDF_OVERLAY_Z_INDEX, background: PDF_OVERLAY_BACKGROUND });
  await page.waitForTimeout(PDF_VIEWER_SETTLE_MS);
  return { pages: null, stride: Math.round(viewport.width / PDF_A4_LANDSCAPE_RATIO) };
}

async function scrollPdf(take, distance) {
  const { page, mouse, viewport } = take;
  await mouse.moveTo({ x: viewport.width / HALF, y: viewport.height / HALF }, MOVE.normal);
  for (let done = 0; done < distance; done += WHEEL_TICK_PX) {
    await page.mouse.wheel(0, Math.min(WHEEL_TICK_PX, distance - done));
    await page.waitForTimeout(WHEEL_TICK_PAUSE_MS);
  }
}

async function clickPdfIcon(take) {
  const { page, recorder, mouse } = take;
  const built = page.waitForFunction((key) => window[key]?.blobs.length > 0, PDF_HOOK_KEY, { timeout: PDF_BUILD_TIMEOUT_MS });
  built.catch(() => {});
  await mouse.clickLocator(page.locator(SEL_ROUTE_FILE_ICON).first(), MOVE.normal);
  const quick = await Promise.race([built.then(() => true), page.waitForTimeout(REAL_TIME_WAIT_MS).then(() => false)]);
  if (quick) return;
  await recorder.beginFast(FAST_FACTOR_PDF);
  try {
    await built;
  } finally {
    await recorder.endFast();
  }
}

/**
 * Last scene of both takes: clicks the route-PDF icon (real export), shows the captured PDF as an overlay of the recorded
 * page (see file header for why) and scrolls from the summary/map page to the stop table. Never throws - a failure is
 * recorded in report.pdf and keeps the take from being publishable.
 */
async function showRoutePdf(take) {
  const { page, report } = take;
  report.pdf = { shown: false };
  const tiles = { ok: 0, failed: 0 };
  const onResponse = (r) => { if (r.url().includes(OSM_TILE_HOST)) tiles[r.ok() ? "ok" : "failed"]++; };
  const onFailed = (r) => { if (r.url().includes(OSM_TILE_HOST)) tiles.failed++; };
  page.on("response", onResponse);
  page.on("requestfailed", onFailed);
  try {
    const choice = await choosePdfMethod(page);
    Object.assign(report.pdf, { method: choice.method, viewerEnabled: choice.viewerEnabled });
    if (!choice.method) {
      report.pdf.error = "no way to display the PDF: pdfjs-dist is not installed and this browser has no PDF viewer (headless) - install pdfjs-dist in Klacks.Marketing or run with --headed";
      return;
    }
    await installPdfHook(page);
    await clickPdfIcon(take);
    const info = await inspectPdfBlob(page);
    Object.assign(report.pdf, info, { tiles });
    const problems = [];
    if (!info.headerOk) problems.push("blob is not a PDF");
    if (info.bytes < PDF_MIN_BYTES) problems.push(`PDF is only ${info.bytes} bytes`);
    if (info.mapError) problems.push("the PDF contains the map error text");
    if (tiles.ok === 0 || tiles.failed > 0) problems.push(`map tiles: ${tiles.ok} loaded, ${tiles.failed} failed (OSM reachable?)`);
    if (problems.length > 0) {
      report.pdf.error = problems.join("; ");
      return;
    }
    const mounted = choice.method === PDF_METHOD_PDFJS ? await mountPdfjsOverlay(take, choice.assets) : await mountViewerOverlay(take);
    report.pdf.pagesRendered = mounted.pages;
    report.pdf.shown = true;
    await page.waitForTimeout(BEAT_PDF.firstPage);
    await scrollPdf(take, mounted.stride);
    await page.waitForTimeout(BEAT_PDF.afterScroll);
  } catch (error) {
    report.pdf.error = `${report.pdf.error ? `${report.pdf.error}; ` : ""}${error.message}`;
  } finally {
    page.off("response", onResponse);
    page.off("requestfailed", onFailed);
  }
}

function pdfProblems(report, savedDistanceKm) {
  const pdf = report.pdf;
  if (!pdf) return ["printout scene did not run"];
  if (!pdf.shown) return [`printout not shown: ${pdf.error ?? "unknown"}`];
  const distance = Number.isFinite(savedDistanceKm) ? `${savedDistanceKm.toFixed(2)} km` : null;
  pdf.containsSavedDistance = distance === null ? null : pdf.distances.includes(distance);
  return [];
}

async function finishTake(take, { saved, restore }) {
  const { page, options, recorder, report } = take;
  try {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullFrame(take) });
    await restore.verifySaved(saved);
  } finally {
    report.lockReleased = await leaveEditor(page, { overlaySelector: `#${PDF_OVERLAY_ID}` });
    await page.close();
    report.reset = await runSeedReset(options, restore.resetArgs);
    await restore.verifyRestored();
  }
}

function autofillRestore(take, containerId) {
  const { api, options, report } = take;
  return {
    resetArgs: SEED_RESET_AUTOFILL_ARGS,
    async verifySaved(saved) {
      const template = await loadTemplate(api, containerId, WEEKDAY_WEDNESDAY);
      const items = orderedItems(template);
      const abbreviations = abbreviationsOf(items);
      const problems = checkSchedulePlausible(items, { fromTime: template?.fromTime, untilTime: template?.untilTime });
      report.savedItems = items.length;
      report.savedOrder = describeSlots(items);
      report.savedRouteInfo = template?.routeInfo ? { totalDistanceKm: template.routeInfo.totalDistanceKm, estimatedTravelTime: template.routeInfo.estimatedTravelTime } : null;
      report.orderProblems = problems;
      report.onlyKtTasks = abbreviations.every((a) => AUTOFILL_TASK_PATTERN.test(a));
      report.distinctTasks = new Set(abbreviations).size === abbreviations.length;
      report.choseFewerThanPool = items.length < (report.poolBefore ?? 0);
      report.uiMatchesApi = sameList(report.uiAbbreviations ?? [], abbreviations);
      const printout = pdfProblems(report, template?.routeInfo?.totalDistanceKm);
      const persisted = saved && items.length >= MIN_AUTOFILL_ITEMS && report.onlyKtTasks && report.distinctTasks && problems.length === 0;
      report.publishable = persisted && report.listFullyVisible === true && report.violationRows === 0 && printout.length === 0 && !report.failure;
      if (!report.publishable && !report.failure) {
        report.failure = `saved Wednesday template: ${items.length} items [${abbreviations}], saved: ${saved}, plausible: ${problems.length === 0} (${problems}), list fully visible: ${report.listFullyVisible}, time-window violations: ${report.violationRows}${printout.length ? `, ${printout}` : ""}`;
      }
    },
    async verifyRestored() {
      const template = await loadTemplate(api, containerId, WEEKDAY_WEDNESDAY);
      report.autofillRestored = Boolean(template)
        && (template.containerTemplateItems ?? []).length === 0
        && !template.routeInfo
        && Boolean(template.startBase) && Boolean(template.endBase);
      if (!report.autofillRestored) throw new Error("Wednesday template is not empty with base addresses after the reset - check the demo data!");
      log(`Wednesday template restored (was ${report.savedItems} items)`);
    },
  };
}

async function prepareAutofill(take, containerId) {
  const { api, options, report } = take;
  const before = await loadTemplate(api, containerId, WEEKDAY_WEDNESDAY);
  const dirty = !before || (before.containerTemplateItems ?? []).length > 0 || before.routeInfo;
  if (dirty) {
    report.preReset = await runSeedReset(options, SEED_RESET_AUTOFILL_ARGS);
    const after = await loadTemplate(api, containerId, WEEKDAY_WEDNESDAY);
    if (!after || (after.containerTemplateItems ?? []).length > 0) throw new Error("Wednesday template is not empty before the take - check the demo data!");
    log("Wednesday template was not empty - reset first");
  }
}

/**
 * Wednesday template of "Kundentour Winterthur" (empty, 10 time-window tasks in the pool, start/end base = branch): the
 * wizard icon runs the autofill, which picks the tasks that fit the day plus the shortest tour; the result toast with the
 * distance is held, the placed tasks and the time ruler are shown and the template is saved. The API check demands at
 * least three distinct KT tasks in chronological, non-overlapping order inside the container window; afterwards the template is
 * emptied again through the seed script.
 */
export async function takeContainerAutofill(take) {
  const { page, api, recorder, mouse, report, script } = take;
  const containerId = await findContainerId(api, AUTOFILL_CONTAINER);
  await prepareAutofill(take, containerId);
  await openEditor(take, containerId, () => page.locator(SEL_AVAILABLE_ROWS).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS }));
  report.poolBefore = await page.locator(SEL_AVAILABLE_ROWS).count();
  report.rowsBefore = await page.locator(SEL_SELECTED_ROWS).count();
  if (report.rowsBefore !== 0) throw new Error(`Wednesday editor shows ${report.rowsBefore} selected tasks before the autofill`);
  await fitSelectedList(take, script.fitRows, { rowHeight: script.rowHeight });
  const restore = autofillRestore(take, containerId);
  let saved = false;
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await showBases(take, script.baseName);
    await hoverIfPresent(take, SEL_AVAILABLE_ROWS, BEAT.hover);
    await hoverIfPresent(take, SEL_TOLERANCE_SLIDER, BEAT.hover);
    await dragToleranceToExact(take);
    const result = await clickAndAwaitResult(take, page.locator(SEL_AUTOFILL_ICON), {
      apiPart: API_AUTOFILL_PART, fastFactor: FAST_FACTOR.autofill, what: "autofill", isApplied: (rows) => rows.length > 0,
    });
    report.resultToast = result.toast;
    report.uiAbbreviations = result.rows;
    await page.waitForTimeout(BEAT.toast);
    report.listFullyVisible = await listFullyVisible(page);
    report.violationRows = await page.locator(SEL_VIOLATION_ROWS).count();
    await sweepRows(take);
    await showRuler(take);
    await page.waitForTimeout(BEAT.beforeSave);
    await saveTemplate(take, containerId);
    saved = true;
    await parkAndMarkPoster(take, report);
    await showRoutePdf(take);
    await page.waitForTimeout(BEAT_PDF.finalHold);
  } finally {
    await finishTake(take, { saved, restore });
  }
}

function routeRestore(take, containerId, original, script) {
  const { api, report } = take;
  return {
    resetArgs: SEED_RESET_ROUTE_ARGS,
    async verifySaved(saved) {
      const template = await loadTemplate(api, containerId, WEEKDAY_THURSDAY);
      const items = orderedItems(template);
      const order = abbreviationsOf(items);
      report.savedOrder = describeSlots(items);
      report.savedItems = items.length;
      report.savedRouteInfo = template?.routeInfo ? { totalDistanceKm: template.routeInfo.totalDistanceKm, estimatedTravelTime: template.routeInfo.estimatedTravelTime } : null;
      report.orderBefore = script.handOrder;
      report.orderAfter = order;
      report.orderChanged = !sameList(order, script.handOrder);
      report.matchesExpectedOrder = sameList(order, script.expectedOrder) || sameList(order, [...script.expectedOrder].reverse());
      report.allTasksKept = items.length === script.handOrder.length && order.every((a) => ROUTE_TASK_PATTERN.test(a)) && new Set(order).size === order.length;
      report.problems = checkSchedulePlausible(items, { fromTime: template?.fromTime, untilTime: template?.untilTime });
      report.uiOrderChanged = Boolean(report.uiOrderBefore) && Boolean(report.uiOrderAfter) && !sameList(report.uiOrderBefore, report.uiOrderAfter);
      report.uiMatchesApi = sameList(report.uiOrderAfter ?? [], order);
      const printout = pdfProblems(report, template?.routeInfo?.totalDistanceKm);
      const persisted = saved && report.orderChanged && report.allTasksKept && report.problems.length === 0;
      report.publishable = persisted && report.uiOrderChanged && report.listFullyVisible === true && report.violationRows === 0 && printout.length === 0 && !report.failure;
      if (!report.publishable && !report.failure) {
        report.failure = `saved Thursday template: order [${order}], changed: ${report.orderChanged}, tasks kept: ${report.allTasksKept}, UI order changed: ${report.uiOrderChanged}, problems: ${report.problems}, list fully visible: ${report.listFullyVisible}, time-window violations: ${report.violationRows}, saved: ${saved}${printout.length ? `, ${printout}` : ""}`;
      }
    },
    async verifyRestored() {
      const template = await loadTemplate(api, containerId, WEEKDAY_THURSDAY);
      const restoredOrder = abbreviationsOf(orderedItems(template));
      report.routeRestored = Boolean(template)
        && !template.routeInfo
        && sameList(restoredOrder, script.handOrder)
        && sameList(itemSnapshot(template), original);
      if (!report.routeRestored) throw new Error("Thursday template differs from the seed state after the reset - check the demo data!");
      log(`Thursday template restored (was [${report.orderAfter}])`);
    },
  };
}

async function prepareRoute(take, containerId, script) {
  const { api, options, report } = take;
  const seeded = (template) => Boolean(template) && !template.routeInfo && sameList(abbreviationsOf(orderedItems(template)), script.handOrder);
  if (!seeded(await loadTemplate(api, containerId, WEEKDAY_THURSDAY))) {
    report.preReset = await runSeedReset(options, SEED_RESET_ROUTE_ARGS);
    log("Thursday template was not in the seed order - reset first");
  }
  const template = await loadTemplate(api, containerId, WEEKDAY_THURSDAY);
  if (!seeded(template)) throw new Error(`Thursday template is not in the seed order [${script.handOrder}] before the take - check the demo data!`);
  return itemSnapshot(template);
}

/**
 * Thursday template of "Servicetour Winterthur" (six tasks hand-placed in a zigzag order, start/end base = branch): the
 * rows are swept top to bottom, the route icon runs the route optimization (time-compressed while it computes), the result
 * toast with distance and travel time is held, the new order is swept and the template is saved. The API check demands a
 * saved order that differs from the zigzag order with all six tasks kept and no overlaps; afterwards the zigzag template is
 * restored through the seed script.
 */
export async function takeContainerRoute(take) {
  const { page, api, recorder, report, script } = take;
  const containerId = await findContainerId(api, ROUTE_CONTAINER);
  const original = await prepareRoute(take, containerId, script);
  await openEditor(take, containerId, () => page.locator(SEL_SELECTED_ROWS).nth(script.handOrder.length - 1).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS }));
  report.uiOrderBefore = await readSelectedAbbreviations(page);
  if (!sameList(report.uiOrderBefore, script.handOrder)) {
    throw new Error(`Thursday editor shows [${report.uiOrderBefore}] instead of the seed order [${script.handOrder}]`);
  }
  await fitSelectedList(take, script.fitRows, { rowHeight: script.rowHeight });
  const restore = routeRestore(take, containerId, original, script);
  let saved = false;
  await recorder.start();
  try {
    await page.waitForTimeout(BEAT.intro);
    await showBases(take, script.baseName);
    await sweepRows(take);
    await hoverIfPresent(take, SEL_ROUTE_ICON, BEAT.hover);
    const result = await clickAndAwaitResult(take, page.locator(SEL_ROUTE_ICON), {
      apiPart: API_OPTIMIZE_PART, fastFactor: FAST_FACTOR.route, what: "route optimization",
      isApplied: (rows) => rows.length === report.uiOrderBefore.length && !sameList(rows, report.uiOrderBefore),
    });
    report.resultToast = result.toast;
    report.uiOrderAfter = result.rows;
    await page.waitForTimeout(BEAT.toast);
    report.listFullyVisible = await listFullyVisible(page);
    report.violationRows = await page.locator(SEL_VIOLATION_ROWS).count();
    await sweepRows(take);
    await showRuler(take);
    await page.waitForTimeout(BEAT.beforeSave);
    await saveTemplate(take, containerId);
    saved = true;
    await parkAndMarkPoster(take, report);
    await showRoutePdf(take);
    await page.waitForTimeout(BEAT_PDF.finalHold);
  } finally {
    await finishTake(take, { saved, restore });
  }
}

export const ROUTE_TAKE_RUNNERS = {
  [VIDEO_CONTAINER_AUTOFILL]: takeContainerAutofill,
  [VIDEO_CONTAINER_ROUTE]: takeContainerRoute,
};
