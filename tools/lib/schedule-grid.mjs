// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Schedule-grid helpers shared by the video takes: grid geometry (canvas cells, name rows), opening the schedule for
 * the demo group, work snapshots for restore checks and a small authenticated API client.
 * @param page - Playwright page showing the schedule
 * @param options - session options (uiUrl, apiUrl, groupId)
 */

import * as S from "./klacks-demo-session.mjs";

export const WORK_ENTRY_TYPE = 0;
export const CELL_WIDTH_PX = 90;
export const SUB_ROW_HEIGHT_PX = 50;
export const HALF = 2;
export const ISO_DATE_LENGTH = 10;
export const SEL_GRID_CANVAS = "canvas[id^='template-canvas']";
export const SEL_NAME_ROWS = "#box .drag-row";
export const SCHEDULE_ROUTE_PART = "/Works/Schedule";
export const WORKS_API = "/api/backend/Works";
export const SCHEDULE_API = `${WORKS_API}/Schedule`;
export const HTTP_DELETE = "DELETE";
export const HTTP_POST = "POST";
export const SCHEDULE_DATA_TIMEOUT_MS = 90000;
export const CANVAS_SETTLE_MS = 1500;

export const dateKey = (value) => String(value).slice(0, ISO_DATE_LENGTH);

export function monthFilter(period) {
  const first = `${period.year}-${String(period.month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(period.year, period.month, 0)).toISOString().slice(0, ISO_DATE_LENGTH);
  return { startDate: first, endDate: last, periodStartDate: first, periodEndDate: last };
}

export function worksIn(data, from, until) {
  return data.entries.filter((e) => e.entryType === WORK_ENTRY_TYPE && dateKey(e.entryDate) >= from && dateKey(e.entryDate) <= until);
}

export function snapshotOf(data, range) {
  return worksIn(data, range.from, range.until)
    .map((e) => [e.id, e.clientId, dateKey(e.entryDate), e.entryId, e.startTime, e.endTime].join("|"))
    .sort();
}

export function sameSnapshot(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export async function openSchedule(page, options) {
  const scheduleResponse = page.waitForResponse(
    (r) => r.url().includes(SCHEDULE_ROUTE_PART) && r.request().method() === HTTP_POST
      && r.request().postDataJSON()?.selectedGroup === options.groupId,
    { timeout: SCHEDULE_DATA_TIMEOUT_MS },
  );
  await page.goto(`${options.uiUrl}${S.SCHEDULE_PATH}?groupId=${options.groupId}`, { timeout: S.NAV_TIMEOUT_MS, waitUntil: "domcontentloaded" });
  const response = await scheduleResponse;
  const filter = response.request().postDataJSON();
  const data = await response.json();
  await page.locator(SEL_GRID_CANVAS).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.locator(SEL_NAME_ROWS).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(CANVAS_SETTLE_MS);
  return { filter, data };
}

export async function rowBoxes(page) {
  return page.locator(SEL_NAME_ROWS).evaluateAll((els) => els.map((el) => {
    const b = el.getBoundingClientRect();
    return { top: b.top, height: b.height };
  }));
}

export async function gridBox(page) {
  const box = await page.locator(SEL_GRID_CANVAS).first().boundingBox();
  if (!box) throw new Error("schedule grid canvas not found");
  return box;
}

export async function cellCenter(page, row, dayIndex, isRtl) {
  const grid = await gridBox(page);
  const boxes = await rowBoxes(page);
  const x = isRtl
    ? grid.x + grid.width - (dayIndex + 1) * CELL_WIDTH_PX + CELL_WIDTH_PX / HALF
    : grid.x + dayIndex * CELL_WIDTH_PX + CELL_WIDTH_PX / HALF;
  return { x, y: boxes[row].top + SUB_ROW_HEIGHT_PX / HALF };
}

const HTTP_UNAUTHORIZED = 401;
const API_TIMEOUT_MS = 120000;
const API_ERROR_PREVIEW_CHARS = 300;

/**
 * Authenticated API client; an expired token (401) triggers one re-login and a retry, so long multi-culture runs survive.
 */
export class ScheduleApi {
  constructor(request, options, token) {
    this.request = request;
    this.options = options;
    this.headers = S.bearer(token);
  }

  async json(apiPath, init = {}) {
    const url = `${this.options.apiUrl}${apiPath}`;
    let response = await this.request.fetch(url, { timeout: API_TIMEOUT_MS, ...init, headers: { ...this.headers, ...init.headers } });
    if (response.status() === HTTP_UNAUTHORIZED) {
      this.headers = S.bearer(await S.apiLogin(this.request, this.options));
      response = await this.request.fetch(url, { timeout: API_TIMEOUT_MS, ...init, headers: { ...this.headers, ...init.headers } });
    }
    if (!response.ok()) {
      const body = await response.text().catch(() => "");
      throw new Error(`${init.method ?? "GET"} ${url} -> HTTP ${response.status()} ${body.slice(0, API_ERROR_PREVIEW_CHARS)}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  schedule(filter) {
    return this.json(SCHEDULE_API, { method: HTTP_POST, data: filter });
  }
}
