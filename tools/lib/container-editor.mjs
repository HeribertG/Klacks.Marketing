// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared helpers of the container template editor takes (container-takes, route-takes): opening the editor, picking a
 * weekday without the visible cursor, enlarging the "selected tasks" pane through the editor's own splitter so that every
 * row is visible (the pane shows only about four rows by default and cuts the last one), and leaving the editor through
 * its in-app "back" link so that the container template lock is released at once (closing the page would keep it until it
 * goes stale, about 90 s).
 * @param take - page, options, mouse, report, viewport (see recordTake)
 */

import * as S from "./klacks-demo-session.mjs";
import { CANVAS_SETTLE_MS, HTTP_DELETE } from "./schedule-grid.mjs";

export const CONTAINER_TEMPLATE_PATH = "/workplace/container-template";
export const TEMPLATES_API = (id) => `/api/backend/Containers/${id}/templates`;
export const SEL_WEEKDAY_BUTTONS = "label.weekday-button";
export const SEL_AVAILABLE_ROWS = "#available-tasks-list tr";
export const SEL_SELECTED_LIST = "#selected-tasks-list";
export const SEL_SELECTED_ROWS = "#selected-tasks-list tr[cdkdrag], #selected-tasks-list tr.cdk-drag";
export const SEL_SELECTED_HEAD = "#selected-tasks-table thead";
export const SEL_SAVE = "#shift-save-btn";
export const SEL_TIME_RULER = "app-time-ruler canvas.main-canvas";
export const SEL_READONLY = "#container-template-wrapper.readonly-mode";

const SEL_SPLIT_GUTTER = ".as-split-gutter";
const MAX_REVEAL_TICKS = 12;
const REVEAL_TICK_PX = 40;
const SEL_BACK_LINK = ".footer span.link-button";
const LOCK_RELEASE_PATH = /\/ContainerLocks\/[0-9a-f-]{36}$/i;
const LOCK_RELEASE_TIMEOUT_MS = 8000;
const FIT_ATTEMPTS = 4;
const FIT_SLACK_PX = 24;
const FIT_STEPS = 10;
const FIT_PAUSE_MS = 300;
const LAYOUT_TOLERANCE_PX = 1;
const HALF = 2;

const center = (box) => ({ x: box.x + box.width / HALF, y: box.y + box.height / HALF });

/**
 * Opens the template editor of a container and waits until it is editable (weekday buttons and time ruler visible, not
 * read-only because of a foreign lock) and the caller-supplied content check passed.
 */
export async function openContainerEditor(take, containerId, waitForContent) {
  const { page, options } = take;
  await page.goto(`${options.uiUrl}${CONTAINER_TEMPLATE_PATH}/${containerId}`, { timeout: S.NAV_TIMEOUT_MS });
  await page.locator(SEL_WEEKDAY_BUTTONS).first().waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.locator(SEL_TIME_RULER).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  if (await page.locator(SEL_READONLY).count()) throw new Error("container template is read-only (lock held by another session)");
  if (waitForContent) await waitForContent();
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

/**
 * Selects a weekday button (index = weekday number, Sunday = 0) before the recording starts, so the video opens on the
 * weekday that shows content instead of an empty default day.
 */
export async function selectWeekdayBeforeRecording(page, buttonIndex) {
  await page.locator(SEL_WEEKDAY_BUTTONS).nth(buttonIndex).click();
  await page.waitForTimeout(CANVAS_SETTLE_MS);
}

export async function measureSelectedList(page) {
  return page.evaluate((sel) => {
    const list = document.querySelector(sel.list);
    const head = document.querySelector(sel.head);
    const row = document.querySelector(sel.selectedRow) ?? document.querySelector(sel.availableRow);
    if (!list || !head || !row) return null;
    return {
      clientHeight: list.clientHeight,
      scrollHeight: list.scrollHeight,
      headHeight: head.getBoundingClientRect().height,
      rowHeight: row.getBoundingClientRect().height,
    };
  }, { list: SEL_SELECTED_LIST, head: SEL_SELECTED_HEAD, selectedRow: SEL_SELECTED_ROWS, availableRow: SEL_AVAILABLE_ROWS });
}

async function findListGutter(page, scope = "") {
  return page.locator(`${scope} ${SEL_SPLIT_GUTTER}`.trim()).evaluateAll((els) => els
    .map((el) => el.getBoundingClientRect())
    .filter((b) => b.width > b.height && b.height > 0)
    .map((b) => ({ x: b.x, y: b.y, width: b.width, height: b.height }))[0] ?? null);
}

async function dragListGutter(take, deltaY) {
  const { page, mouse } = take;
  const gutter = await findListGutter(page);
  if (!gutter) throw new Error("splitter between the selected-task list and the pool not found");
  const from = center(gutter);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + deltaY, { steps: FIT_STEPS });
  await page.mouse.up();
  mouse.x = from.x;
  mouse.y = from.y + deltaY;
  await page.waitForTimeout(FIT_PAUSE_MS);
}

/**
 * Drags the editor's own horizontal splitter until the selected-task list shows header + rowsToFit rows without scrolling.
 * Re-measures after every drag and reverses the direction when the pane shrank; throws when the list still does not fit,
 * so a take never records a cut-off list. The cursor position is restored afterwards (the drag is not recorded).
 * @param rowsToFit - number of rows that must be visible (include rows that will be added during the take)
 * @param rowHeight - optional row height in px for rows that do not exist yet and are taller than the pool rows measured as a
 *   fallback (time-window tasks carry a time input: about 63 px instead of 49 px)
 */
export async function fitSelectedList(take, rowsToFit, { rowHeight } = {}) {
  const { page, mouse } = take;
  const origin = { x: mouse.x, y: mouse.y };
  let direction = 1;
  let measured = await measureSelectedList(page);
  if (!measured) throw new Error("selected-task list could not be measured");
  const rowOf = (m) => rowHeight ?? m.rowHeight;
  const missingOf = (m) => m.headHeight + rowsToFit * rowOf(m) + FIT_SLACK_PX - m.clientHeight;
  for (let attempt = 0; attempt < FIT_ATTEMPTS && missingOf(measured) > 0; attempt++) {
    const before = measured.clientHeight;
    await dragListGutter(take, direction * Math.ceil(missingOf(measured)));
    measured = await measureSelectedList(page);
    if (!measured) throw new Error("selected-task list could not be measured after the splitter drag");
    if (measured.clientHeight < before) direction = -direction;
  }
  await page.mouse.move(origin.x, origin.y);
  mouse.x = origin.x;
  mouse.y = origin.y;
  if (missingOf(measured) > 0) {
    throw new Error(`selected-task list shows ${measured.clientHeight}px but needs ${Math.ceil(measured.headHeight + rowsToFit * rowOf(measured) + FIT_SLACK_PX)}px for ${rowsToFit} rows - the splitter cannot enlarge it further`);
  }
  return measured;
}

/**
 * Enlarges the selected-task list on camera (visible cursor, like a user dragging the splitter) until its content is no longer
 * cut off. For lists that grow during the take (a break dropped into the list) while the lower pane has to stay large enough
 * to drag from before the drop. Throws when the splitter cannot enlarge the list far enough.
 * @param scope - optional CSS selector that limits the splitter search (a dialog on top of a page that has splitters of its own)
 */
export async function growListToContent(take, { durationMs, scope = "" }) {
  const { page, mouse } = take;
  const before = await measureSelectedList(page);
  if (!before) throw new Error("selected-task list could not be measured");
  const missing = before.scrollHeight - before.clientHeight;
  if (missing <= LAYOUT_TOLERANCE_PX) return before;
  const gutter = await findListGutter(page, scope);
  if (!gutter) throw new Error("splitter between the selected-task list and the pool not found");
  const from = center(gutter);
  await mouse.drag(from, { x: from.x, y: from.y + missing + FIT_SLACK_PX / HALF }, durationMs);
  await page.waitForTimeout(FIT_PAUSE_MS);
  const after = await measureSelectedList(page);
  if (!after || after.scrollHeight > after.clientHeight + LAYOUT_TOLERANCE_PX) {
    throw new Error("the splitter could not enlarge the selected-task list far enough to show every row");
  }
  return after;
}

export async function listFullyVisible(page) {
  const m = await measureSelectedList(page);
  return Boolean(m) && m.scrollHeight <= m.clientHeight + LAYOUT_TOLERANCE_PX;
}

/**
 * Leaves the template editor through its in-app "back" link: ngOnDestroy releases the container template lock at once.
 * Removes full-page capture overlays (route PDF printout) first, because they would cover the link. Returns whether the
 * lock release request succeeded; a failure only means the seed reset has to wait for the stale lock.
 */
export async function leaveEditor(page, { overlaySelector } = {}) {
  try {
    if (overlaySelector) await page.evaluate((selector) => document.querySelector(selector)?.remove(), overlaySelector);
    const released = page.waitForResponse(
      (r) => r.request().method() === HTTP_DELETE && LOCK_RELEASE_PATH.test(new URL(r.url()).pathname),
      { timeout: LOCK_RELEASE_TIMEOUT_MS },
    );
    released.catch(() => {});
    await page.locator(SEL_BACK_LINK).first().click({ timeout: LOCK_RELEASE_TIMEOUT_MS });
    return (await released).ok();
  } catch {
    return false;
  }
}

/**
 * Scrolls the scrollable pane that holds the row (task pool / absence list below the splitter) with the visible cursor until
 * the row lies completely inside the pane and is not covered by anything. The pane gets small once the selected-task list was
 * enlarged, so the row to drag is brought into view like a user would. Throws when the row cannot be revealed.
 * @param take - page, mouse
 * @param row - locator of the row that is dragged next
 * @param moveMs - duration of the cursor move onto the pane
 * @param pauseMs - pause between two wheel ticks
 */
export async function revealInPane(take, row, { moveMs, pauseMs }) {
  const { page, mouse } = take;
  let cursorOnPane = false;
  for (let tick = 0; tick <= MAX_REVEAL_TICKS; tick++) {
    const state = await row.evaluate((el) => {
      const rect = (box) => ({ x: box.x, y: box.y, width: box.width, height: box.height });
      let pane = el.parentElement;
      while (pane && pane !== document.body) {
        const overflowY = getComputedStyle(pane).overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && pane.scrollHeight > pane.clientHeight + 1) break;
        pane = pane.parentElement;
      }
      const rowBox = el.getBoundingClientRect();
      const paneBox = pane && pane !== document.body ? pane.getBoundingClientRect() : null;
      const hit = el.contains(document.elementFromPoint(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2));
      return { row: rect(rowBox), pane: paneBox ? rect(paneBox) : null, hit };
    });
    if (!state.pane) return;
    const inside = state.row.y >= state.pane.y && state.row.y + state.row.height <= state.pane.y + state.pane.height;
    if (inside && state.hit) return;
    if (tick === MAX_REVEAL_TICKS) break;
    if (!cursorOnPane) {
      await mouse.moveTo(center(state.pane), moveMs);
      cursorOnPane = true;
    }
    const rowIsBelow = state.row.y + state.row.height / HALF > state.pane.y + state.pane.height / HALF;
    await page.mouse.wheel(0, rowIsBelow ? REVEAL_TICK_PX : -REVEAL_TICK_PX);
    await page.waitForTimeout(pauseMs);
  }
  throw new Error("the row could not be scrolled completely into view inside its pane");
}
