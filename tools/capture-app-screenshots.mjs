// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Captures localized marketing screenshots of a running Klacks instance (demo data only) and writes
 * them as WebP files named app-<view>-<culture>.webp into wwwroot/images.
 * Every view has one fixed viewport and one fixed output size for all cultures; only the WebP quality is tuned
 * to stay within the byte budget (the capture fails instead of silently shrinking the image).
 * CLI: --cultures de,ar,ja  --views schedule,timeline,calendar,klacksy  --base-url  --api-url  --png-dir
 * Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_UI_URL, KLACKS_API_URL, KLACKS_DEMO_GROUP_ID.
 * The scripted Klacksy conversation per culture lives in capture-app-screenshots.chat.json (prompt + answer).
 * Demo-DB prerequisites (set through the app API): a model of the Swiss provider (REQUIRED_MODEL_PROVIDER) is enabled
 * and the demo user has a real-looking user name (the greeting uses it). The Swiss model is selected in the assistant's
 * own model dropdown for the screenshot only (an in-memory UI choice); the installation's default model is not changed.
 * The Klacksy answer is scripted (mocked stream); no LLM is called, so the provider's key state is reported as configured.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright-core";
import * as S from "./lib/klacks-demo-session.mjs";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(toolsDir, "..");
const OUTPUT_DIR = path.join(projectRoot, "wwwroot", "images");
const OUTPUT_FILE_FORMAT = (view, culture) => `app-${view}-${culture.toLowerCase()}`;
const CHAT_SCRIPTS_FILE = path.join(toolsDir, "capture-app-screenshots.chat.json");

const ALL_CULTURES = [
  "de", "en", "fr", "it", "ar", "cs", "da", "el", "es", "fi", "he", "id", "ja",
  "ko", "ms", "nb", "nl", "pl", "pt", "ro", "sv", "th", "vi", "zh-CN", "zh-TW",
];
const VIEW_SCHEDULE = "schedule";
const VIEW_TIMELINE = "timeline";
const VIEW_CALENDAR = "calendar";
const VIEW_KLACKSY = "klacksy";
const ALL_VIEWS = [VIEW_SCHEDULE, VIEW_TIMELINE, VIEW_CALENDAR, VIEW_KLACKSY];

const FULL_PAGE_VIEWPORT = { width: 1500, height: 940 };
const FULL_PAGE_OUTPUT = { width: 2400, height: 1504 };
const CALENDAR_VIEWPORT = { width: 1440, height: 1000 };
const CALENDAR_OUTPUT = { width: 1880, height: 1520 };
const DEVICE_SCALE_FACTOR = 2;
const BACKGROUND_SAMPLE_OFFSET_PX = 4;
const VIEW_SPECS = {
  [VIEW_SCHEDULE]: { viewport: FULL_PAGE_VIEWPORT, output: FULL_PAGE_OUTPUT },
  [VIEW_TIMELINE]: { viewport: FULL_PAGE_VIEWPORT, output: FULL_PAGE_OUTPUT },
  [VIEW_KLACKSY]: { viewport: FULL_PAGE_VIEWPORT, output: FULL_PAGE_OUTPUT },
  [VIEW_CALENDAR]: { viewport: CALENDAR_VIEWPORT, output: CALENDAR_OUTPUT },
};

const WEBP_QUALITY_LADDER = [82, 78, 74, 70, 66, 62];
const WEBP_EFFORT = 6;
const WEBP_TARGET_BYTES = 150 * 1024;
const BYTES_PER_KB = 1024;

const OCTOBER = { year: 2026, month: 10, isoWeek: 41 };
const EXPECTED_PERIOD_START = `${OCTOBER.year}-${String(OCTOBER.month).padStart(2, "0")}-01`;
const SCHEDULE_DATA_ROUTE_PART = "/Works/Schedule";
const SCHEDULE_DATA_TIMEOUT_MS = 60000;
const HTTP_POST = "POST";

const SETTINGS_PATH = "/workplace/settings";
const CHAT_STREAM_ROUTE = "**/assistant/chat/stream";
const MODELS_PATH = "/api/backend/assistant/models";
const PROVIDERS_ROUTE = "**/assistant/providers";
const SCENARIOS_PATH = "/api/backend/AnalyseScenarios";
const CALENDAR_RULES_ROUTE_PART = "CalendarRules/GetSimpleCalendarRuleList";
const REQUIRED_MODEL_PROVIDER = "apertus";
const PREFERRED_MODEL_ID = "apertus-70b";
const SEL_MODEL_DROPDOWN = "#assistant-chat-model-dropdown";
const SEL_MODEL_ITEM = "#assistant-chat-model-dropdown .dropdown-item";
const SEL_CURRENT_MODEL_NAME = "#assistant-chat-model-dropdown .current-model .model-name";
const FORBIDDEN_GREETING_NAME = "admin";

const SEL_ASSISTANT_INPUT = "#assistant-chat-input";
const SEL_ASSISTANT_SEND = "#assistant-chat-send-btn";
const SEL_CHAT_MESSAGES = "app-assistant-chat";
const SEL_LOADING_PLACEHOLDERS = ".container-dashboard-loading, [class*='spinner'], [class*='skeleton'], [aria-busy='true']";
const SEL_CLIENTS_CHART = "#clients-overview-chart";
const SEL_LOADING_TEXT_EXCLUDED = "app-assistant-chat";
const LOADING_TEXT_PATTERN = "Lade|Wird geladen|Loading|読み込み|جار|Chargement|Caricamento";
const SEL_CALENDAR_RULES = "#settings-calendar-rules";
const SEL_CALENDAR_ROWS = "[id^='calendar-rules-row-']";
const SEL_CALENDAR_COUNTRY_CELLS = "[id^='calendar-rules-cell-country-']";
const SEL_CALENDAR_STATE_CELLS = "[id^='calendar-rules-cell-state-']";
const SEL_CALENDAR_FILTER_BUTTON = "#calendar-rules-calendar-dropdown #dropdownForm";
const SEL_CALENDAR_COUNTRY_SELECT = "#calendar-dropdown-country-select";
const SEL_CALENDAR_DESELECT_ALL = "#calendar-dropdown-deselect-all-btn";
const SEL_CALENDAR_STATE_CHECKBOX = (country, state) => `#calendar-dropdown-checkbox-${country}-${state}`;
const SEL_CALENDAR_FILTER_CLOSE = "#calendar-dropdown-close-btn";
const SEL_CALENDAR_PAGINATION = "#calendar-rules-pagination";
const SEL_SCENARIO_BUTTON = "#scenario-selector-btn";
const SEL_SPLIT_GUTTER = ".as-split-gutter";

/**
 * Holiday rules shown per culture: the page's country plus the states that belong to the demo company
 * (Winterthur -> ZH). The country code itself stands for the nation-wide rules.
 */
const CALENDAR_FILTER_BY_CULTURE = {
  de: { country: "CH", states: ["CH", "ZH"] },
  en: { country: "GB", states: ["GB"] },
  fr: { country: "FR", states: ["FR"] },
  it: { country: "IT", states: ["IT"] },
  ar: { country: "AE", states: ["AE"] },
  cs: { country: "CZ", states: ["CZ"] },
  da: { country: "DK", states: ["DK"] },
  el: { country: "GR", states: ["GR"] },
  es: { country: "ES", states: ["ES"] },
  fi: { country: "FI", states: ["FI"] },
  he: { country: "IL", states: ["IL"] },
  id: { country: "ID", states: ["ID"] },
  ja: { country: "JP", states: ["JP"] },
  ko: { country: "KR", states: ["KR"] },
  ms: { country: "MY", states: ["MY"] },
  nb: { country: "NO", states: ["NO"] },
  nl: { country: "NL", states: ["NL"] },
  pl: { country: "PL", states: ["PL"] },
  pt: { country: "PT", states: ["PT"] },
  ro: { country: "RO", states: ["RO"] },
  sv: { country: "SE", states: ["SE"] },
  th: { country: "TH", states: ["TH"] },
  vi: { country: "VN", states: ["VN"] },
  "zh-CN": { country: "CN", states: ["CN"] },
  "zh-TW": { country: "TW", states: ["TW"] },
};

const STORAGE_TIMELINE_ROW_HEIGHT_FACTOR = "klacks.schedule.timelineRowHeightFactor";
const STORAGE_TIMELINE_RANGE = "klacks.schedule.timelineViewRange";
const TIMELINE_ROW_HEIGHT_FACTOR = "0.5";
const TIMELINE_RANGE = "day";
const TIMELINE_NAME_COLUMN_EXTRA_PX = 70;
const TIMELINE_GRID_EXTRA_PX = 170;

const SETTLE_MS = 800;
const CANVAS_DRAW_SETTLE_MS = 1200;
const STREAM_SETTLE_MS = 800;
const GUTTER_DRAG_STEPS = 12;
const SKIP_FIRST_ROW_WHEEL_TICKS = { [S.VIEW_MODE_TABLE]: 2, [S.VIEW_MODE_TIMELINE]: 1 };
const WHEEL_TICK_DELTA = 100;
const WHEEL_TICK_PAUSE_MS = 300;
const GRID_POINT_RATIO = { x: 0.6, y: 0.35 };
const HALF = 2;

const NOISE_CSS = `${S.NOISE_CSS}
  .toast, .toast-container, ngb-toast, app-toast, app-toasts { display: none !important; }
`;

const FAKE_CONVERSATION_ID = "00000000-0000-4000-8000-00000000c0de";
const FAKE_TURN_ID = "00000000-0000-4000-8000-00000000beef";
const STREAM_CHUNK_SIZE = 24;

function readOptions() {
  const { values } = parseArgs({
    options: {
      cultures: { type: "string" },
      views: { type: "string" },
      "base-url": { type: "string" },
      "api-url": { type: "string" },
      "group-id": { type: "string" },
      "png-dir": { type: "string" },
      headed: { type: "boolean", default: false },
    },
  });
  const views = S.splitList(values.views) ?? ALL_VIEWS;
  const unknownViews = views.filter((v) => !ALL_VIEWS.includes(v));
  if (unknownViews.length > 0) {
    throw new Error(`Unknown views: ${unknownViews.join(", ")}. Known: ${ALL_VIEWS.join(", ")}`);
  }
  return {
    ...S.readSessionOptions(values),
    cultures: S.splitList(values.cultures) ?? ALL_CULTURES,
    views,
    pngDir: values["png-dir"] ? path.resolve(values["png-dir"]) : null,
    headed: values.headed,
  };
}

function findLoadingPlaceholders(cfg) {
  const inViewport = (el) => {
    const b = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < window.innerHeight
      && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0;
  };
  const found = [...document.querySelectorAll(cfg.selector)].filter(inViewport)
    .map((el) => `<${el.tagName.toLowerCase()} class="${el.className}">`);
  const pattern = new RegExp(cfg.pattern);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    const host = node.parentElement;
    if (!text || !pattern.test(text) || !host || host.closest(cfg.excluded) || !inViewport(host)) continue;
    found.push(`"${text.slice(0, 60)}"`);
  }
  return found;
}

/**
 * Hard check before every shot: no loading placeholder (dashboard cards, spinners, skeletons, busy regions, loading
 * texts) may be visible outside the assistant panel. Waits up to NAV_TIMEOUT_MS, then fails the shot.
 */
async function waitUntilLoaded(page) {
  const cfg = { selector: SEL_LOADING_PLACEHOLDERS, pattern: LOADING_TEXT_PATTERN, excluded: SEL_LOADING_TEXT_EXCLUDED };
  const loaded = await page.waitForFunction(
    (c) => {
      const inViewport = (el) => {
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < window.innerHeight;
      };
      return ![...document.querySelectorAll(c.selector)].some(inViewport);
    },
    cfg,
    { timeout: S.NAV_TIMEOUT_MS },
  ).then(() => true, () => false);
  const leftovers = await page.evaluate(findLoadingPlaceholders, cfg);
  if (!loaded || leftovers.length > 0) {
    throw new Error(`page still shows loading placeholders: ${leftovers.join(", ") || "(selector wait timed out)"}`);
  }
}

async function settle(page, extraMs = 0) {
  await S.waitAnimationFrames(page);
  const viewport = page.viewportSize();
  await page.mouse.move(viewport.width - 1, viewport.height - 1);
  await page.waitForTimeout(SETTLE_MS + extraMs);
}

function isExpectedScheduleResponse(response, groupId) {
  if (!response.url().includes(SCHEDULE_DATA_ROUTE_PART) || response.request().method() !== HTTP_POST) return false;
  const body = response.request().postDataJSON() ?? {};
  return body.selectedGroup === groupId
    && String(body.periodStartDate ?? body.startDate ?? "").startsWith(EXPECTED_PERIOD_START);
}

async function assertBasePlanShown(page, options) {
  const scenarios = (await S.apiRequest(page.context().request, `${options.apiUrl}${SCENARIOS_PATH}?groupId=${options.groupId}`, {
    headers: S.bearer(options.token),
  }).then((r) => r.json())) ?? [];
  const label = (await page.locator(SEL_SCENARIO_BUTTON).innerText()).trim();
  const active = scenarios.find((s) => s.name && label.includes(s.name));
  if (active) throw new Error(`scenario "${active.name}" is active instead of the base plan`);
}

async function dragSplitter(page, box, dx, dy) {
  const from = { x: box.x + box.width / HALF, y: box.y + box.height / HALF };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: GUTTER_DRAG_STEPS });
  await page.mouse.up();
}

async function splitterBoxes(page) {
  return page.locator(SEL_SPLIT_GUTTER).evaluateAll((els) => els.map((el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }).filter((b) => b.width > 0 && b.height > 0));
}

/**
 * Uses the page's own splitters: widens the name column (so names are not clipped) and moves the
 * grid/shift-list splitter down (so more employee rows are visible).
 */
async function enlargeTimelineGrid(page, isRtl) {
  const boxes = await splitterBoxes(page);
  const nameColumn = boxes.find((b) => b.height > b.width);
  const gridBottom = boxes.find((b) => b.width > b.height);
  if (!nameColumn || !gridBottom) throw new Error("schedule splitters not found");
  await dragSplitter(page, nameColumn, isRtl ? -TIMELINE_NAME_COLUMN_EXTRA_PX : TIMELINE_NAME_COLUMN_EXTRA_PX, 0);
  await dragSplitter(page, gridBottom, 0, TIMELINE_GRID_EXTRA_PX);
}

async function openSchedule(page, options, viewMode) {
  const scheduleData = page.waitForResponse((r) => isExpectedScheduleResponse(r, options.groupId), {
    timeout: SCHEDULE_DATA_TIMEOUT_MS,
  });
  await page.goto(`${options.uiUrl}${S.SCHEDULE_PATH}?groupId=${options.groupId}`, {
    timeout: S.NAV_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
  const response = await scheduleData.catch(() => null);
  if (!response) {
    throw new Error(`schedule never loaded group ${options.groupId} for period starting ${EXPECTED_PERIOD_START}`);
  }
  const data = await response.json();
  if (!Array.isArray(data.entries) || data.entries.length === 0) {
    throw new Error(`schedule for ${EXPECTED_PERIOD_START} has no entries - is the demo plan applied?`);
  }
  await page.locator(S.SEL_SCHEDULE_CANVAS).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await settle(page, CANVAS_DRAW_SETTLE_MS);
  await assertBasePlanShown(page, options);
  if (viewMode === S.VIEW_MODE_TIMELINE) {
    const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");
    await enlargeTimelineGrid(page, isRtl);
    await settle(page, CANVAS_DRAW_SETTLE_MS);
  }
  const viewport = page.viewportSize();
  await page.mouse.move(viewport.width * GRID_POINT_RATIO.x, viewport.height * GRID_POINT_RATIO.y);
  for (let tick = 0; tick < SKIP_FIRST_ROW_WHEEL_TICKS[viewMode]; tick++) {
    await page.mouse.wheel(0, WHEEL_TICK_DELTA);
    await page.waitForTimeout(WHEEL_TICK_PAUSE_MS);
  }
  await settle(page, CANVAS_DRAW_SETTLE_MS);
}

async function reloadCalendarRules(page, action) {
  const loaded = page.waitForResponse((r) => r.url().includes(CALENDAR_RULES_ROUTE_PART), { timeout: S.READY_TIMEOUT_MS });
  await action();
  await loaded;
}

async function filterCalendarRules(page, filter) {
  await page.locator(SEL_CALENDAR_FILTER_BUTTON).click();
  await page.locator(SEL_CALENDAR_COUNTRY_SELECT).selectOption("");
  await reloadCalendarRules(page, () => page.locator(SEL_CALENDAR_DESELECT_ALL).click());
  await page.locator(SEL_CALENDAR_COUNTRY_SELECT).selectOption(filter.country);
  for (const state of filter.states) {
    await reloadCalendarRules(page, () => page.locator(SEL_CALENDAR_STATE_CHECKBOX(filter.country, state)).check());
  }
  await page.locator(SEL_CALENDAR_FILTER_CLOSE).click();
}

async function assertCalendarFiltered(card, filter) {
  const countries = await card.locator(SEL_CALENDAR_COUNTRY_CELLS).allInnerTexts();
  const states = await card.locator(SEL_CALENDAR_STATE_CELLS).allInnerTexts();
  const foreign = countries.map((c) => c.trim()).filter((c) => c !== filter.country);
  const otherStates = states.map((s) => s.trim()).filter((s) => !filter.states.includes(s));
  if (countries.length === 0) throw new Error("holiday rules card shows no rows after filtering");
  if (foreign.length > 0 || otherStates.length > 0) {
    throw new Error(`holiday rules filter not applied: countries ${foreign.join(",")} states ${otherStates.join(",")}`);
  }
}

async function captureCalendar(page, options, culture, spec) {
  const filter = CALENDAR_FILTER_BY_CULTURE[culture];
  if (!filter) throw new Error(`no holiday-rule country for culture ${culture} in CALENDAR_FILTER_BY_CULTURE`);
  const firstLoad = page.waitForResponse((r) => r.url().includes(CALENDAR_RULES_ROUTE_PART), { timeout: S.NAV_TIMEOUT_MS });
  await page.goto(`${options.uiUrl}${SETTINGS_PATH}`, { timeout: S.NAV_TIMEOUT_MS, waitUntil: "domcontentloaded" });
  const card = page.locator(SEL_CALENDAR_RULES);
  await card.waitFor({ state: "attached", timeout: S.READY_TIMEOUT_MS });
  await firstLoad;
  await card.scrollIntoViewIfNeeded();
  await filterCalendarRules(page, filter);
  await card.locator(SEL_CALENDAR_ROWS).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await assertCalendarFiltered(card, filter);
  await card.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await settle(page);
  await waitUntilLoaded(page);
  const box = await card.boundingBox();
  const pagination = await card.locator(SEL_CALENDAR_PAGINATION).boundingBox();
  const clip = { x: box.x, y: box.y, width: box.width, height: box.width * spec.output.height / spec.output.width };
  if (!pagination || pagination.y + pagination.height > clip.y + clip.height || box.height > clip.height) {
    throw new Error(`holiday rules card (${Math.round(box.height)} px) does not fit the fixed ${Math.round(clip.height)} px frame`);
  }
  if (clip.y + clip.height > spec.viewport.height) {
    throw new Error("holiday rules frame reaches beyond the viewport");
  }
  return maskBelowCard(await page.screenshot({ clip }), box.height);
}

/**
 * Paints everything below the card in the page background colour (sampled just below the card), so the next
 * settings card does not peek into the fixed frame.
 */
async function maskBelowCard(png, cardHeightCss) {
  const { width, height } = await sharp(png).metadata();
  const cardBottom = Math.ceil(cardHeightCss * DEVICE_SCALE_FACTOR);
  const sampleY = Math.min(height - 1, cardBottom + BACKGROUND_SAMPLE_OFFSET_PX);
  const { data } = await sharp(png).extract({ left: BACKGROUND_SAMPLE_OFFSET_PX, top: sampleY, width: 1, height: 1 })
    .raw().toBuffer({ resolveWithObject: true });
  const background = { r: data[0], g: data[1], b: data[2] };
  const card = await sharp(png).extract({ left: 0, top: 0, width, height: cardBottom }).toBuffer();
  return sharp(card).extend({ bottom: height - cardBottom, background }).png().toBuffer();
}

function buildSseBody(answer) {
  const events = [
    ["stream_start", { conversationId: FAKE_CONVERSATION_ID, turnId: FAKE_TURN_ID }],
  ];
  for (let i = 0; i < answer.length; i += STREAM_CHUNK_SIZE) {
    events.push(["content", { text: answer.slice(i, i + STREAM_CHUNK_SIZE) }]);
  }
  events.push(["metadata", {}]);
  events.push(["done", {}]);
  return events.map(([type, data]) => `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`).join("");
}

async function loadChatScripts(cultures) {
  const scripts = JSON.parse(await readFile(CHAT_SCRIPTS_FILE, "utf8"));
  const missing = cultures.filter((c) => typeof scripts[c]?.prompt !== "string" || typeof scripts[c]?.answer !== "string");
  if (missing.length > 0) {
    throw new Error(`${path.basename(CHAT_SCRIPTS_FILE)} has no prompt/answer for: ${missing.join(", ")}`);
  }
  return scripts;
}

async function readShowcaseModel(request, options, token) {
  const response = await S.apiRequest(request, `${options.apiUrl}${MODELS_PATH}`, { headers: S.bearer(token) });
  const models = (await response.json()).filter((m) => m.isEnabled && m.providerId === REQUIRED_MODEL_PROVIDER);
  const model = models.find((m) => m.modelId === PREFERRED_MODEL_ID) ?? models[0];
  if (!model) throw new Error(`no enabled ${REQUIRED_MODEL_PROVIDER} model in this installation - enable one first`);
  return model;
}

async function selectShowcaseModel(page, model) {
  await page.click(SEL_MODEL_DROPDOWN);
  await page.locator(SEL_MODEL_ITEM).filter({ has: page.locator(`.provider-badge:text-is("${model.providerId}")`) })
    .filter({ has: page.getByText(model.modelName, { exact: true }) }).first().click();
  const shown = page.locator(SEL_CURRENT_MODEL_NAME);
  await shown.filter({ hasText: model.modelName }).waitFor({ timeout: S.READY_TIMEOUT_MS });
  if (await page.locator(SEL_MODEL_ITEM).count() > 0) throw new Error("model dropdown did not close after the selection");
}

async function assertGreetingName(page) {
  const userName = await page.evaluate(() => localStorage.getItem("JWT_TOKEN_USERNAME"));
  if (!userName || userName.toLowerCase() === FORBIDDEN_GREETING_NAME) {
    throw new Error(`demo user name is "${userName}" - give the demo account a real-looking user name first`);
  }
}

/**
 * The conversation is scripted (the stream is mocked), so the provider's key state must not decide whether the
 * panel shows the "no API key" banner instead of the chat.
 */
async function markProviderConfigured(context, providerId) {
  await context.route(PROVIDERS_ROUTE, async (route) => {
    const response = await route.fetch();
    const providers = await response.json();
    for (const provider of providers) {
      if (provider.providerId === providerId) provider.hasApiKey = true;
    }
    await route.fulfill({ response, json: providers });
  });
}

async function captureKlacksy(page, options, culture) {
  const script = options.chatScripts[culture];
  await assertGreetingName(page);
  await markProviderConfigured(page.context(), options.showcaseModel.providerId);
  await page.route(CHAT_STREAM_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      body: buildSseBody(script.answer),
    }),
  );
  await page.goto(`${options.uiUrl}${S.DASHBOARD_PATH}`, { timeout: S.NAV_TIMEOUT_MS, waitUntil: "domcontentloaded" });
  await S.waitForAppShell(page);
  await page.locator(SEL_CLIENTS_CHART).waitFor({ state: "visible", timeout: S.NAV_TIMEOUT_MS });
  await waitUntilLoaded(page);
  await page.click(S.SEL_ASSISTANT_BUTTON);
  await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  const panel = page.locator(SEL_CHAT_MESSAGES);
  await selectShowcaseModel(page, options.showcaseModel);
  await page.fill(SEL_ASSISTANT_INPUT, script.prompt);
  await page.click(SEL_ASSISTANT_SEND);
  const lastAnswerLine = script.answer.split("\n").filter(Boolean).pop().replace(/\*\*/g, "");
  await panel.getByText(lastAnswerLine).waitFor({ timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(STREAM_SETTLE_MS);
  await settle(page);
  await waitUntilLoaded(page);
  return page.screenshot();
}

function timelineInitScript() {
  return {
    fn: (s) => {
      sessionStorage.setItem(s.factorKey, s.factor);
      localStorage.setItem(s.rangeKey, s.range);
    },
    arg: {
      factorKey: STORAGE_TIMELINE_ROW_HEIGHT_FACTOR,
      factor: TIMELINE_ROW_HEIGHT_FACTOR,
      rangeKey: STORAGE_TIMELINE_RANGE,
      range: TIMELINE_RANGE,
    },
  };
}

async function captureView(browser, options, culture, view, metadata) {
  const spec = VIEW_SPECS[view];
  const viewMode = view === VIEW_TIMELINE ? S.VIEW_MODE_TIMELINE : S.VIEW_MODE_TABLE;
  const context = await S.newCultureContext(browser, options, culture, {
    viewport: spec.viewport,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    viewMode,
    period: OCTOBER,
    css: NOISE_CSS,
    extraInitScripts: view === VIEW_TIMELINE ? [timelineInitScript()] : [],
  });
  const page = await context.newPage();
  try {
    await S.login(page, options);
    await S.assertCulture(page, culture, metadata);
    switch (view) {
      case VIEW_SCHEDULE:
      case VIEW_TIMELINE:
        await openSchedule(page, options, viewMode);
        await waitUntilLoaded(page);
        return await page.screenshot();
      case VIEW_CALENDAR:
        return await captureCalendar(page, options, culture, spec);
      case VIEW_KLACKSY:
        return await captureKlacksy(page, options, culture);
      default:
        throw new Error(`Unhandled view ${view}`);
    }
  } finally {
    await context.close();
  }
}

/**
 * Scales the capture to the view's fixed output size and walks the quality ladder until the file fits the budget.
 */
async function encodeWebp(png, output) {
  const resized = await sharp(png).resize({ width: output.width, height: output.height, fit: "fill", kernel: "lanczos3" }).toBuffer();
  for (const quality of WEBP_QUALITY_LADDER) {
    const buffer = await sharp(resized).webp({ quality, effort: WEBP_EFFORT, smartSubsample: true }).toBuffer();
    if (buffer.length <= WEBP_TARGET_BYTES) return { buffer, quality };
  }
  const floor = WEBP_QUALITY_LADDER[WEBP_QUALITY_LADDER.length - 1];
  throw new Error(`stays above ${WEBP_TARGET_BYTES / BYTES_PER_KB} KB even at quality ${floor} - reduce visual noise, do not shrink`);
}

function assertAspect(png, output, name) {
  return sharp(png).metadata().then(({ width, height }) => {
    const captured = width / height;
    const target = output.width / output.height;
    if (Math.abs(captured - target) > 0.01) {
      throw new Error(`${name}: capture ${width}x${height} does not match the fixed output ${output.width}x${output.height}`);
    }
  });
}

async function main() {
  const options = readOptions();
  await mkdir(OUTPUT_DIR, { recursive: true });
  if (options.pngDir) await mkdir(options.pngDir, { recursive: true });

  const browser = await chromium.launch({ headless: !options.headed });
  const request = (await browser.newContext({ ignoreHTTPSErrors: true })).request;
  const { languages, metadata } = await S.readInstalledLanguages(request, options.apiUrl);
  options.token = await S.apiLogin(request, options);
  await S.markProactiveMessagesRead(request, options, options.token);
  if (options.views.includes(VIEW_KLACKSY)) {
    options.showcaseModel = await readShowcaseModel(request, options, options.token);
    options.chatScripts = await loadChatScripts(options.cultures);
  }

  const results = [];
  try {
    for (const culture of options.cultures) {
      if (!languages.includes(culture)) {
        console.warn(`! skipping ${culture}: not installed in the app (installed: ${languages.join(", ")})`);
        continue;
      }
      for (const view of options.views) {
        const name = OUTPUT_FILE_FORMAT(view, culture);
        const output = VIEW_SPECS[view].output;
        const startedAt = Date.now();
        try {
          const png = await captureView(browser, options, culture, view, metadata);
          if (options.pngDir) await writeFile(path.join(options.pngDir, `${name}.png`), png);
          await assertAspect(png, output, name);
          const { buffer, quality } = await encodeWebp(png, output);
          await writeFile(path.join(OUTPUT_DIR, `${name}.webp`), buffer);
          const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
          const kb = (buffer.length / BYTES_PER_KB).toFixed(1);
          results.push({ file: `${name}.webp`, size: `${output.width}x${output.height}`, quality, kb, seconds });
          console.log(`  ${name}.webp  ${output.width}x${output.height}  q${quality}  ${kb} KB  ${seconds} s`);
        } catch (error) {
          console.error(`x ${name} (${((Date.now() - startedAt) / 1000).toFixed(1)} s): ${error.message}`);
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
