// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared browser/API session helpers for the marketing capture tools: demo login (UI + API),
 * per-culture browser contexts with seeded localStorage/sessionStorage, overlay suppression and readiness checks.
 * @param options - uiUrl, apiUrl, user, password, groupId (read from CLI/env by readSessionOptions)
 * @param culture - app language code seeded as CURRENT_LANG
 */

export const DEFAULT_UI_URL = "http://localhost:4200";
export const DEFAULT_API_URL = "https://localhost:5001";
export const DEFAULT_GROUP_ID = "169b4795-d9bd-4366-b238-71b41aa55e7b";
export const ENV_USER = "KLACKS_DEMO_USER";
export const ENV_PASSWORD = "KLACKS_DEMO_PASSWORD";
export const ENV_UI_URL = "KLACKS_UI_URL";
export const ENV_API_URL = "KLACKS_API_URL";
export const ENV_GROUP_ID = "KLACKS_DEMO_GROUP_ID";

export const LOGIN_PATH = "/";
export const DASHBOARD_PATH = "/workplace/dashboard";
export const SCHEDULE_PATH = "/workplace/schedule";
export const LANGUAGE_CONFIG_PATH = "/api/config/languages";
export const LOGIN_API_PATH = "/api/backend/Accounts/LoginUser";
export const PROACTIVE_READ_ALL_PATH = "/api/backend/assistant/proactive-messages/read-all";

export const SEL_LOGIN_EMAIL = "#loginForm-name";
export const SEL_LOGIN_PASSWORD = "#loginForm-password";
export const SEL_LOGIN_SUBMIT = "#login-summit";
export const SEL_ASSISTANT_BUTTON = "#header-assistant-button";
export const SEL_SCHEDULE_CANVAS = "#scheduleRowCanvas";

export const STORAGE_THEME = "theme";
export const STORAGE_LANG = "CURRENT_LANG";
export const STORAGE_EXPERT_MODE = "settings.expertMode";
export const STORAGE_VIEW_MODE = "klacks.schedule.viewMode";
export const STORAGE_SCHEDULE_FILTER = "klacks_filter_schedule-filter";
export const SESSION_SUPPRESSORS = [
  "klacks.setupConsultation.offeredSession",
  "klacks.companyClock.utcWarningDismissedSession",
];
export const THEME = "klacks";
export const VIEW_MODE_TABLE = "table";
export const VIEW_MODE_TIMELINE = "timeline";
const TRUE_STRING = "true";
const DIRECTION_LTR = "ltr";

export const NAV_TIMEOUT_MS = 60000;
export const READY_TIMEOUT_MS = 20000;
const API_TIMEOUT_MS = 120000;
const ANIMATION_FRAMES_TO_WAIT = 2;
const NOISE_STYLE_ID = "capture-noise-css";

const PAYMENT_INTERVAL_MONTHLY = 2;
const FILTER_ITEMS_PER_PAGE = 5;
const FILTER_FIRST_PAGE = 0;

export const NOISE_CSS = `
  *, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }
  .tooltip, .mat-mdc-tooltip, .cdk-overlay-container .mat-mdc-tooltip-panel, ngb-tooltip-window,
  .toast, .toast-container, ngb-toast, app-toast, app-toasts,
  .badge-mail, .mail-badge, app-company-clock-warning { display: none !important; }
`;

export function splitList(value) {
  if (!value) return null;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function stripSlash(url) {
  return url.replace(/\/+$/, "");
}

export function readSessionOptions(values) {
  const user = process.env[ENV_USER];
  const password = process.env[ENV_PASSWORD];
  if (!user || !password) {
    throw new Error(`Set ${ENV_USER} and ${ENV_PASSWORD} (demo account) before running.`);
  }
  return {
    user,
    password,
    uiUrl: stripSlash(values["base-url"] ?? process.env[ENV_UI_URL] ?? DEFAULT_UI_URL),
    apiUrl: stripSlash(values["api-url"] ?? process.env[ENV_API_URL] ?? DEFAULT_API_URL),
    groupId: values["group-id"] ?? process.env[ENV_GROUP_ID] ?? DEFAULT_GROUP_ID,
  };
}

export async function apiRequest(request, url, init) {
  const response = await request.fetch(url, { timeout: API_TIMEOUT_MS, ...init });
  if (!response.ok()) {
    const body = await response.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${url} -> HTTP ${response.status()} ${body.slice(0, 300)}`);
  }
  return response;
}

export function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function readInstalledLanguages(request, apiUrl) {
  const response = await apiRequest(request, `${apiUrl}${LANGUAGE_CONFIG_PATH}`);
  const body = await response.json();
  return { languages: body.supportedLanguages ?? [], metadata: body.metadata ?? {} };
}

export async function apiLogin(request, options) {
  const login = await apiRequest(request, `${options.apiUrl}${LOGIN_API_PATH}`, {
    method: "POST",
    data: { email: options.user, password: options.password },
  });
  return (await login.json()).token;
}

export async function markProactiveMessagesRead(request, options, token) {
  await apiRequest(request, `${options.apiUrl}${PROACTIVE_READ_ALL_PATH}`, {
    method: "PUT",
    headers: bearer(token),
  });
}

export function buildScheduleFilter(groupId, period) {
  return {
    currentMonth: period.month,
    currentYear: period.year,
    currentWeek: period.isoWeek,
    paymentInterval: PAYMENT_INTERVAL_MONTHLY,
    searchString: "",
    orderBy: "",
    sortOrder: "",
    numberOfItemsPerPage: FILTER_ITEMS_PER_PAGE,
    requiredPage: FILTER_FIRST_PAGE,
    works: [],
    selectedGroup: groupId,
    showEmployees: true,
    showExtern: true,
    individualSort: false,
  };
}

/**
 * Creates a browser context whose storage is seeded before any app script runs.
 * @param setup - viewport, deviceScaleFactor, viewMode, period ({year, month, isoWeek}), css (noise-suppression CSS), extraInitScripts
 */
export async function newCultureContext(browser, options, culture, setup) {
  const context = await browser.newContext({
    viewport: setup.viewport,
    deviceScaleFactor: setup.deviceScaleFactor,
    ignoreHTTPSErrors: true,
    locale: culture,
  });
  const seed = {
    local: {
      [STORAGE_THEME]: THEME,
      [STORAGE_LANG]: culture,
      [STORAGE_EXPERT_MODE]: TRUE_STRING,
      [STORAGE_VIEW_MODE]: setup.viewMode ?? VIEW_MODE_TABLE,
    },
    session: {
      [STORAGE_SCHEDULE_FILTER]: JSON.stringify(buildScheduleFilter(options.groupId, setup.period)),
      ...Object.fromEntries(SESSION_SUPPRESSORS.map((k) => [k, TRUE_STRING])),
    },
    css: setup.css ?? NOISE_CSS,
    styleId: NOISE_STYLE_ID,
  };
  await context.addInitScript((s) => {
    for (const [k, v] of Object.entries(s.local)) localStorage.setItem(k, v);
    for (const [k, v] of Object.entries(s.session)) sessionStorage.setItem(k, v);
    const inject = () => {
      if (document.getElementById(s.styleId)) return;
      const style = document.createElement("style");
      style.id = s.styleId;
      style.textContent = s.css;
      document.head.appendChild(style);
    };
    if (document.head) inject();
    else document.addEventListener("DOMContentLoaded", inject);
  }, seed);
  for (const script of setup.extraInitScripts ?? []) {
    await context.addInitScript(script.fn, script.arg);
  }
  return context;
}

export async function waitForAppShell(page) {
  await page.locator(SEL_ASSISTANT_BUTTON).waitFor({ state: "visible", timeout: NAV_TIMEOUT_MS });
  await page.waitForFunction((theme) => document.documentElement.getAttribute("data-theme") === theme, THEME, {
    timeout: READY_TIMEOUT_MS,
  }).catch(() => {});
}

export async function login(page, options) {
  await page.goto(`${options.uiUrl}${LOGIN_PATH}`, { timeout: NAV_TIMEOUT_MS });
  await page.fill(SEL_LOGIN_EMAIL, options.user);
  await page.fill(SEL_LOGIN_PASSWORD, options.password);
  await page.click(SEL_LOGIN_SUBMIT);
  await page.waitForURL((url) => !url.pathname.endsWith(LOGIN_PATH) || url.pathname.includes("workplace"), {
    timeout: NAV_TIMEOUT_MS,
  });
  await waitForAppShell(page);
}

export async function waitAnimationFrames(page, frames = ANIMATION_FRAMES_TO_WAIT) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    (count) => new Promise((resolve) => {
      const step = (left) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
      step(count);
    }),
    frames,
  );
}

export async function assertCulture(page, culture, metadata) {
  const state = await page.evaluate((keys) => ({
    lang: localStorage.getItem(keys.lang),
    theme: document.documentElement.getAttribute("data-theme"),
    dir: document.documentElement.getAttribute("dir") ?? getComputedStyle(document.body).direction,
  }), { lang: STORAGE_LANG });
  const expectedDir = metadata[culture]?.direction ?? DIRECTION_LTR;
  const problems = [];
  if (state.lang !== culture) problems.push(`CURRENT_LANG=${state.lang}`);
  if (state.theme !== THEME) problems.push(`data-theme=${state.theme}`);
  if (state.dir !== expectedDir) problems.push(`dir=${state.dir} (expected ${expectedDir})`);
  if (problems.length > 0) {
    throw new Error(`[${culture}] app state mismatch: ${problems.join(", ")}`);
  }
}
