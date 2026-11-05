// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Story take erp-import (clip "Bestellungen aus dem ERP, ohne Abtippen"): Sandra starts on the order list (no open orders yet) and asks Klacksy
 * which way her ERP should hand its orders to Klacks. Klacksy reads the drop point settings (get_erp_drop_point_settings: native office PC),
 * names the three channels (folder, upload, HTTPS push), recommends the folder of this PC and the Modify right for the ERP account on exactly that
 * folder; the take scrolls the answer with the wheel to the folder path, then to the Modify right, then to the alternatives (one caption each). An answer
 * with joined sentences or a remark on a stale schedule is refused (ANSWER_GLITCHES) and the take stops. On her second message (skipped when Klacksy already opened the page) Klacksy opens
 * Settings > Import. Sandra closes the chat, the cursor shows the row "Ordner für ERP-Dateien" and copies the path (toast). The two steps outside
 * Klacks are captions over that row: the administrator grants the ERP account write access, the ERP exports its XML there. While the export
 * caption is on screen the take copies tools/erp-demo/bestellungen-2026-12.xml into the folder (what the ERP would do), then Sandra presses
 * "Jetzt importieren". The background tick imports the file within about a minute (fast-forwarded, badge); the cursor opens the tab
 * "Verarbeitet". Through the nav button Sandra goes back to the order list, which now holds the four imported orders as unsealed drafts; she opens
 * AU2601, picks the group Bern Objektschutz, seals it with the lock button and saves; the list keeps the three other drafts.
 * Needs the recording backend of tools/erp-demo/start-erp-recording-api.ps1 (native, DataRoot C:\ProgramData\Klacks) on a fresh copy of
 * klacks_marketing_security_bern_m2 without its stale setting ERP_IMPORT_NEXT_RUN_UTC (delete it in the copy) and with an empty drop point folder.
 * Publishable: no chat error and no failed skill; answer 1 called get_erp_drop_point_settings, names the folder path, the Modify right, the upload
 * and the push; the Import page was reached through Klacksy; the folder row shows the expected path of a native installation; the file ended
 * processed with exactly four new orders and none rejected; four unsealed drafts were listed; AU2601 has the status SealedOrder afterwards;
 * the three other orders stay unsealed; the take ends on the order list.
 * @param take - page, api, options, recorder, mouse, report, script, captions, viewport, scale (see recordTake)
 */

import { copyFile, readdir, utimes } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { SEL_ASSISTANT_CLOSE, SEL_ASSISTANT_INPUT, SKILL_ERROR_PREFIX, sendChatMessage } from "../lib/klacksy-chat.mjs";
import { HALF } from "../lib/schedule-grid.mjs";

export const VIDEO_ERP_IMPORT = "erp-import";
export const ERP_VIDEOS = [VIDEO_ERP_IMPORT];
export const ERP_IMPORT_CUES = {
  request: "request", folder: "folder", right: "right", ways: "ways", path: "path", grant: "grant", export: "export",
  run: "run", processed: "processed", drafts: "drafts", seal: "seal", done: "done",
};
export const ERP_IMPORT_FINAL_HOLD_MS = 5000;
export const ERP_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
const SHIFT_LIST_ROW_SIZE_KEY = "SELECTED_ROW_ORDER_SHIFT";
const SHIFT_LIST_ROWS_PER_PAGE = "5";
export const ERP_INIT_SCRIPTS = Object.freeze([
  Object.freeze({ fn: ({ key, rows }) => localStorage.setItem(key, rows), arg: Object.freeze({ key: SHIFT_LIST_ROW_SIZE_KEY, rows: SHIFT_LIST_ROWS_PER_PAGE }) }),
]);
// Plain toasts stay visible (copy and import feedback); the interactive Klacksy toasts (suggested replies, intro offer) and every tooltip stay hidden.
export const ERP_VIDEO_NOISE_CSS = `
  .tooltip, .mat-mdc-tooltip, ngb-tooltip-window, .badge-mail, .mail-badge, app-company-clock-warning { display: none !important; }
  ngb-toast.bg-action, ngb-toast.bg-assistant-interactive { display: none !important; }
  * { caret-color: transparent !important; }
`;

const toolsDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEMO_XML = path.join(toolsDir, "erp-demo", "bestellungen-2026-12.xml");
const EXPECTED_FOLDER = "C:\\ProgramData\\Klacks\\ErpImport\\erp\\orders";
const EXPECTED_INSTALLATION = "native";
const EXPECTED_NEW_ORDERS = 4;
const SEALED_REFERENCE = "AU2601";
const SEAL_GROUP_PATH = Object.freeze(["Deutschschweiz Mitte", "BE"]);
const SEAL_GROUP = "Bern Objektschutz";
const STATUS_ORIGINAL_ORDER = 0;
const STATUS_SEALED_ORDER = 1;

const SETTINGS_SKILL = "get_erp_drop_point_settings";
const NAVIGATE_SKILLS = ["navigate_to", "navigate_to_page", "navigateToPage"];
const ANSWER_MUST_MATCH = Object.freeze([
  ["folder path", /ProgramData\\Klacks\\ErpImport/i],
  ["Modify right", /Ändern|Änderungsrecht|Modify/i],
  ["upload", /Upload|hochlad/i],
  ["push", /Push|HTTPS/i],
]);
const ANSWER_MUST_NOT_MATCH = Object.freeze([["S3", /\bS3\b/], ["SFTP", /SFTP/i]]);
const ANSWER_ANCHOR_FOLDER = "ProgramData";
const ANSWER_ANCHOR_RIGHT = "Ändern|Änderungsrecht|Modify";
const ANSWER_ANCHOR_ALTERNATIVES = "Upload|hochl";
const ANSWER_GLITCHES = Object.freeze([["joined sentences", /[a-zäöü]{2}[.!?][A-ZÄÖÜ][a-zäöü]/], ["stale schedule remark", /Vergangenheit|veraltet/i]]);

const FOLDER_API = "/api/backend/ErpDropPoints/default/folder";
const FILES_API = "/api/backend/ErpDropPoints/files";
const SHIFT_API = (id) => `/api/backend/Shifts/${id}`;
const SHIFT_ROUTE = "/workplace/shift";
const EDIT_SHIFT_ROUTE = "/workplace/edit-shift/";

const SEL_MESSAGES = "#assistant-chat-messages";
const SEL_FOLDER_PATH = "#erp-drop-points-folder-path";
const SEL_FOLDER_HINT = "#erp-drop-points-folder-hint";
const SEL_COPY = "#erp-drop-points-copy-path-btn";
const SEL_RUN = "#erp-drop-points-run-import-btn";
const SEL_SCHEDULE_CRON = "#erp-drop-points-schedule-cron";
const SEL_FILES_SECTION = "#erp-drop-points-files-section";
const SEL_TAB_PROCESSED = "#erp-drop-points-files-tab-processed";
const SEL_FILES_REFRESH = "#erp-drop-points-files-refresh-btn";
const SEL_FILE_ROWS = "#erp-drop-points-files-table-body app-erp-import-file-row";
const SEL_NAV_SHIFTS = "#open-shifts";
const SEL_ORDER_TABLE = "app-original-table";
const SEL_ORDER_ROWS = "app-original-table tbody tr";
const SEL_EDIT_ICON = "app-icon-pencil-icon-grey";
const SEL_GROUP_BOX = "app-edit-shift-group .group-select-box";
const SEL_GROUP_ITEM = "app-edit-shift-group .group-tree-node-item";
const SEL_GROUP_NAME = ".group-tree-node-name";
const SEL_GROUP_TOGGLE = ".group-tree-toggle";
const SEL_GROUP_CONTENT = ".group-tree-node-content";
const SEL_LOCK = "#shift-lock-btn";
const SEL_SAVE_CLOSE = "#shift-save-and-close-btn";
const SEL_TOAST = "app-toasts";

const BEAT = { intro: 1500, readAnswer: 4500, folderHold: 4500, captionHold: 4200, toastHold: 2500, tabHold: 4500, listHold: 4500, stepPause: 900, scrollPause: 30, pagePoll: 250 };
const PAGE_TIMEOUT_MS = 20000;
const IMPORT_TIMEOUT_MS = 4 * 60 * 1000;
const IMPORT_POLL_MS = 2000;
const IMPORT_FAST_FACTOR = 12;
const MOVE_NORMAL_MS = 700;
const WHEEL_STEP_PX = 60;
const ANSWER_TOP_OFFSET_PX = 40;
const ROW_TARGET_Y_RATIO = 0.42;
const LOG_PREVIEW_CHARS = 220;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactName = (name) => new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`);
const trimSeparator = (folder) => folder.replace(/[\\/]+$/, "");

function log(message) {
  console.log(`[erp] ${message}`);
}

const callNames = (turn) => new Set((turn?.calls ?? []).map((c) => c.name));
const anyOf = (names, set) => names.some((name) => set.has(name));

async function folderOf(api) {
  const folder = await api.json(FOLDER_API);
  if (folder?.installation !== EXPECTED_INSTALLATION) throw new Error(`the API reports installation ${folder?.installation}, not ${EXPECTED_INSTALLATION} (start-erp-recording-api.ps1 sets Hosting__DataRoot)`);
  if (trimSeparator(folder.folderPath).toLowerCase() !== EXPECTED_FOLDER.toLowerCase()) throw new Error(`the drop point folder is ${folder.folderPath}, not ${EXPECTED_FOLDER}`);
  return folder;
}

async function filesOf(api) {
  return (await api.json(FILES_API)) ?? { inbox: [], processed: [], failed: [] };
}

async function assertCleanStart(api, folderPath) {
  const files = await filesOf(api);
  const ledger = files.inbox.length + files.processed.length + files.failed.length;
  if (ledger > 0) throw new Error(`the drop point already lists ${ledger} files - copy klacks_marketing_security_bern_m2 again`);
  const onDisk = await readdir(folderPath).catch(() => []);
  if (onDisk.length > 0) throw new Error(`the drop point folder ${folderPath} is not empty: ${onDisk.join(", ")}`);
}

function answerProblems(turn) {
  const problems = [];
  if (!callNames(turn).has(SETTINGS_SKILL)) problems.push(`answer 1 did not call ${SETTINGS_SKILL}`);
  for (const [label, pattern] of ANSWER_MUST_MATCH) if (!pattern.test(turn.content)) problems.push(`answer 1 does not name the ${label}`);
  for (const [label, pattern] of ANSWER_MUST_NOT_MATCH) if (pattern.test(turn.content)) problems.push(`answer 1 mentions ${label}`);
  for (const [label, pattern] of ANSWER_GLITCHES) if (pattern.test(turn.content.replace(/`[^`]*`/g, ""))) problems.push(`answer 1 has ${label}`);
  return problems;
}

function turnProblems(turns) {
  const problems = [];
  turns.filter((t) => t.sent).forEach((turn, i) => {
    if (turn.errors.length > 0) problems.push(`answer ${i + 1}: chat error ${turn.errors.join("; ")}`);
    if (turn.content.trim() === "") problems.push(`answer ${i + 1} has no text`);
    const failed = turn.results.find((r) => r.result.startsWith(SKILL_ERROR_PREFIX));
    if (failed) problems.push(`answer ${i + 1}: ${failed.name} failed: ${failed.result}`);
  });
  return problems;
}

/** Turns the wheel over an element with the visible cursor on it until the target offset is reached (smooth, like a person scrolling). */
async function wheelBy(page, mouse, overSelector, deltaY) {
  const box = await page.locator(overSelector).first().boundingBox();
  if (!box || Math.abs(deltaY) < WHEEL_STEP_PX / HALF) return;
  await mouse.moveTo({ x: box.x + box.width / HALF, y: box.y + box.height / HALF }, MOVE_NORMAL_MS);
  const steps = Math.ceil(Math.abs(deltaY) / WHEEL_STEP_PX);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, Math.sign(deltaY) * WHEEL_STEP_PX);
    await page.waitForTimeout(BEAT.scrollPause);
  }
  await page.waitForTimeout(BEAT.stepPause);
}

/**
 * Scrolls the chat with the wheel so the block holding the first text that matches the anchor pattern (searched in the last answer) is near
 * the top of the message list; a null pattern brings the start of the last answer there. Returns false when nothing matched.
 */
async function scrollAnswerTo(page, mouse, anchor) {
  const delta = await page.evaluate(({ list, pattern, offset }) => {
    const container = document.querySelector(list);
    if (!container) return null;
    const answers = [...container.querySelectorAll("app-chat-message")];
    const answer = answers.at(-1)?.querySelector(".message-bubble") ?? answers.at(-1) ?? container;
    let block = answer;
    if (pattern) {
      const regex = new RegExp(pattern);
      const walker = document.createTreeWalker(answer, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node && !regex.test(node.textContent)) node = walker.nextNode();
      if (!node) return null;
      block = node.parentElement.closest("p, li") ?? node.parentElement;
    }
    return block.getBoundingClientRect().top - container.getBoundingClientRect().top - offset;
  }, { list: SEL_MESSAGES, pattern: anchor, offset: ANSWER_TOP_OFFSET_PX });
  if (delta === null) return false;
  await wheelBy(page, mouse, SEL_MESSAGES, delta);
  return true;
}

/** Scrolls the page so the given element sits at about ROW_TARGET_Y_RATIO of the viewport height. */
async function scrollPageTo(page, mouse, selector, viewport) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) return;
  const delta = box.y - viewport.height * ROW_TARGET_Y_RATIO;
  const contentBox = { x: viewport.width * ROW_TARGET_Y_RATIO, y: viewport.height / HALF };
  await mouse.moveTo(contentBox, MOVE_NORMAL_MS);
  const steps = Math.ceil(Math.abs(delta) / WHEEL_STEP_PX);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, Math.sign(delta) * WHEEL_STEP_PX);
    await page.waitForTimeout(BEAT.scrollPause);
  }
  await page.waitForTimeout(BEAT.stepPause);
}

async function waitForSelector(page, selector) {
  return page.locator(selector).first().waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => true, () => false);
}

async function closeChat(page, mouse) {
  const close = page.locator(SEL_ASSISTANT_CLOSE);
  if (await close.isVisible().catch(() => false)) {
    await mouse.clickLocator(close, MOVE_NORMAL_MS);
    await page.waitForTimeout(BEAT.stepPause);
  }
}

/** Waits (fast-forwarded, badge visible) until the background tick has processed the dropped file. */
async function waitForImport(take, fileName) {
  const { api, recorder } = take;
  const deadline = Date.now() + IMPORT_TIMEOUT_MS;
  await recorder.beginFast(IMPORT_FAST_FACTOR);
  try {
    while (Date.now() < deadline) {
      const files = await filesOf(api);
      const processed = files.processed.find((f) => f.fileName === fileName);
      const failed = files.failed.find((f) => f.fileName === fileName);
      if (processed || failed) return { processed: processed ?? null, failed: failed ?? null };
      await take.page.waitForTimeout(IMPORT_POLL_MS);
    }
    return { processed: null, failed: null, timedOut: true };
  } finally {
    await recorder.endFast();
  }
}

async function openGroupAndSeal(page, mouse, report) {
  await scrollPageTo(page, mouse, SEL_GROUP_BOX, { width: ERP_VIEWPORT.width, height: ERP_VIEWPORT.height });
  await mouse.clickLocator(page.locator(SEL_GROUP_BOX), MOVE_NORMAL_MS);
  await page.waitForTimeout(BEAT.stepPause);
  for (const name of SEAL_GROUP_PATH) {
    const item = page.locator(SEL_GROUP_ITEM).filter({ has: page.locator(SEL_GROUP_NAME, { hasText: exactName(name) }) }).first();
    await mouse.clickLocator(item.locator(SEL_GROUP_TOGGLE), MOVE_NORMAL_MS);
    await page.waitForTimeout(BEAT.stepPause);
  }
  const group = page.locator(SEL_GROUP_ITEM).filter({ has: page.locator(SEL_GROUP_NAME, { hasText: exactName(SEAL_GROUP) }) }).first();
  await mouse.clickLocator(group.locator(SEL_GROUP_CONTENT), MOVE_NORMAL_MS);
  await page.waitForTimeout(BEAT.stepPause * HALF);
  await scrollPageTo(page, mouse, SEL_LOCK, { width: ERP_VIEWPORT.width, height: ERP_VIEWPORT.height / HALF });
  report.lockEnabled = await page.locator(SEL_LOCK).isEnabled();
  if (!report.lockEnabled) throw new Error("the lock button is disabled after the group was picked");
  await mouse.clickLocator(page.locator(SEL_LOCK), MOVE_NORMAL_MS);
  await page.waitForTimeout(BEAT.stepPause * HALF);
  await mouse.clickLocator(page.locator(SEL_SAVE_CLOSE), MOVE_NORMAL_MS);
}

async function orderStatus(api, shiftId) {
  const shift = await api.json(SHIFT_API(shiftId));
  return shift?.status ?? null;
}

function fullViewportCrop(viewport, scale) {
  const even = (value) => {
    const px = Math.round(value * scale);
    return px - (px % HALF);
  };
  return { x: 0, y: 0, width: even(viewport.width), height: even(viewport.height) };
}

async function chatPart(take, messages, visited) {
  const { page, mouse, report, captions } = take;
  await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE_NORMAL_MS);
  await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await captions?.show(ERP_IMPORT_CUES.request);
  const [question, ...rest] = messages;
  log(`prompt: ${question.text}`);
  visited.length = 0;
  const first = await sendChatMessage(take, question.text);
  report.turns.push({ prompt: question.text, sent: true, ...first });
  log(`calls: ${first.calls.map((c) => c.name).join(", ") || "-"}; answer: ${first.content.replace(/\s+/g, " ").slice(0, LOG_PREVIEW_CHARS)}`);
  report.answerProblems = answerProblems(first);
  if (report.answerProblems.length > 0) throw new Error(report.answerProblems.join("; "));
  report.folderParagraph = await scrollAnswerTo(page, mouse, ANSWER_ANCHOR_FOLDER);
  await captions?.show(ERP_IMPORT_CUES.folder);
  await page.waitForTimeout(BEAT.folderHold);
  report.rightParagraph = await scrollAnswerTo(page, mouse, ANSWER_ANCHOR_RIGHT);
  await captions?.show(ERP_IMPORT_CUES.right);
  await page.waitForTimeout(BEAT.folderHold);
  report.alternativesParagraph = await scrollAnswerTo(page, mouse, ANSWER_ANCHOR_ALTERNATIVES);
  await captions?.show(ERP_IMPORT_CUES.ways);
  await page.waitForTimeout(BEAT.folderHold);
  if (await page.locator(SEL_FOLDER_PATH).isVisible().catch(() => false)) {
    report.turns.push(...rest.map((m) => ({ prompt: m.text, sent: false, skipped: true, reason: "the Import page is already open" })));
    report.navigatedBy = "answer 1";
    return;
  }
  for (const message of rest) {
    log(`prompt: ${message.text}`);
    visited.length = 0;
    const turn = await sendChatMessage(take, message.text);
    report.turns.push({ prompt: message.text, sent: true, ...turn });
    log(`calls: ${turn.calls.map((c) => `${c.name}${JSON.stringify(c.parameters)}`).join(", ") || "-"}; answer: ${turn.content.replace(/\s+/g, " ").slice(0, LOG_PREVIEW_CHARS)}`);
    if (anyOf(NAVIGATE_SKILLS, callNames(turn)) && (await waitForSelector(page, SEL_FOLDER_PATH))) {
      report.navigatedBy = `answer ${report.turns.filter((t) => t.sent).length}`;
      return;
    }
  }
  throw new Error("Klacksy did not open the Import page");
}

async function importPart(take, folder) {
  const { page, mouse, report, captions, viewport } = take;
  await closeChat(page, mouse);
  await scrollPageTo(page, mouse, SEL_FOLDER_PATH, viewport);
  report.folderShown = await page.locator(SEL_FOLDER_PATH).inputValue();
  if (trimSeparator(report.folderShown).toLowerCase() !== EXPECTED_FOLDER.toLowerCase()) throw new Error(`the folder row shows ${report.folderShown}`);
  await captions?.show(ERP_IMPORT_CUES.path);
  await mouse.moveTo(await centerOf(page, SEL_FOLDER_PATH), MOVE_NORMAL_MS);
  await page.waitForTimeout(BEAT.captionHold);
  await mouse.clickLocator(page.locator(SEL_COPY), MOVE_NORMAL_MS);
  report.copyToast = await page.locator(SEL_TOAST).innerText().catch(() => "");
  await page.waitForTimeout(BEAT.toastHold);
  await captions?.show(ERP_IMPORT_CUES.grant);
  await mouse.moveTo(await centerOf(page, SEL_FOLDER_HINT), MOVE_NORMAL_MS);
  await page.waitForTimeout(BEAT.captionHold);
  await captions?.show(ERP_IMPORT_CUES.export);
  const fileName = path.basename(DEMO_XML);
  const target = path.join(folder.folderPath, fileName);
  await copyFile(DEMO_XML, target);
  const now = new Date();
  await utimes(target, now, now);
  report.droppedAt = ScreenRecorder.now();
  await mouse.moveTo(await centerOf(page, SEL_FOLDER_PATH), MOVE_NORMAL_MS);
  await page.waitForTimeout(BEAT.captionHold);
  await captions?.show(ERP_IMPORT_CUES.run);
  await mouse.moveTo(await centerOf(page, SEL_SCHEDULE_CRON), MOVE_NORMAL_MS);
  await page.waitForTimeout(BEAT.stepPause * HALF);
  await mouse.clickLocator(page.locator(SEL_RUN), MOVE_NORMAL_MS);
  report.runToast = await page.locator(SEL_TOAST).innerText().catch(() => "");
  await page.waitForTimeout(BEAT.toastHold);
  await scrollPageTo(page, mouse, SEL_FILES_SECTION, { width: viewport.width, height: viewport.height / HALF });
  const result = await waitForImport(take, fileName);
  report.importResult = result;
  if (!result.processed) throw new Error(`the file was not processed: ${JSON.stringify(result)}`);
  const p = result.processed;
  if (p.newCount !== EXPECTED_NEW_ORDERS || p.rejectedCount !== 0) throw new Error(`import: ${p.newCount} new, ${p.rejectedCount} rejected (expected ${EXPECTED_NEW_ORDERS} new, none rejected)`);
  await mouse.clickLocator(page.locator(SEL_FILES_REFRESH), MOVE_NORMAL_MS);
  await page.waitForTimeout(BEAT.stepPause);
  await mouse.clickLocator(page.locator(SEL_TAB_PROCESSED), MOVE_NORMAL_MS);
  report.processedRows = await page.locator(SEL_FILE_ROWS).first().waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS }).then(() => page.locator(SEL_FILE_ROWS).count(), () => 0);
  if (report.processedRows === 0) throw new Error("the tab Verarbeitet lists no file");
  await captions?.show(ERP_IMPORT_CUES.processed);
  await page.waitForTimeout(BEAT.tabHold);
}

async function centerOf(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} has no bounding box`);
  return { x: box.x + box.width / HALF, y: box.y + box.height / HALF };
}

async function orderRowNames(page) {
  return page.locator(SEL_ORDER_ROWS).evaluateAll((rows) => rows.map((r) => r.innerText.trim()).filter(Boolean));
}

async function sealPart(take) {
  const { page, api, mouse, report, captions } = take;
  await mouse.clickLocator(page.locator(SEL_NAV_SHIFTS), MOVE_NORMAL_MS);
  if (!(await waitForSelector(page, SEL_ORDER_TABLE))) throw new Error("the order list did not open");
  await page.locator(SEL_ORDER_ROWS).filter({ hasText: SEALED_REFERENCE }).first().waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS });
  report.draftRows = (await orderRowNames(page)).filter((t) => /ERP AU26/.test(t)).length;
  await captions?.show(ERP_IMPORT_CUES.drafts);
  await page.waitForTimeout(BEAT.listHold);
  const row = page.locator(SEL_ORDER_ROWS).filter({ hasText: SEALED_REFERENCE }).first();
  await mouse.clickLocator(row.locator(SEL_EDIT_ICON), MOVE_NORMAL_MS);
  await page.waitForURL((url) => url.pathname.startsWith(EDIT_SHIFT_ROUTE), { timeout: PAGE_TIMEOUT_MS });
  report.sealedShiftId = new URL(page.url()).pathname.slice(EDIT_SHIFT_ROUTE.length);
  report.statusBefore = await orderStatus(api, report.sealedShiftId);
  if (report.statusBefore !== STATUS_ORIGINAL_ORDER) throw new Error(`${SEALED_REFERENCE} has status ${report.statusBefore} before the seal`);
  await waitForSelector(page, SEL_LOCK);
  await captions?.show(ERP_IMPORT_CUES.seal);
  await page.waitForTimeout(BEAT.stepPause * HALF);
  await openGroupAndSeal(page, mouse, report);
  await page.waitForURL((url) => url.pathname === SHIFT_ROUTE, { timeout: PAGE_TIMEOUT_MS });
  await waitForSelector(page, SEL_ORDER_TABLE);
  await page.waitForTimeout(BEAT.stepPause);
  report.statusAfter = await orderStatus(api, report.sealedShiftId);
  report.rowsAfter = (await orderRowNames(page)).filter((t) => /ERP AU26/.test(t)).length;
  await captions?.show(ERP_IMPORT_CUES.done);
}

async function takeErpImport(take) {
  const { page, api, options, recorder, report, script, viewport, scale } = take;
  const messages = script?.messages ?? [];
  if (messages.length === 0) throw new Error(`${VIDEO_ERP_IMPORT} needs a script`);
  const folder = await folderOf(api);
  await assertCleanStart(api, folder.folderPath);
  await page.goto(`${options.uiUrl}${SHIFT_ROUTE}`, { timeout: S.NAV_TIMEOUT_MS });
  await page.locator(SEL_ORDER_TABLE).waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS });
  report.ordersBefore = await page.locator(`${SEL_ORDER_TABLE} ${SEL_EDIT_ICON}`).count();
  report.turns = [];
  const visited = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) visited.push(frame.url());
  });
  try {
    await recorder.start();
    await page.waitForTimeout(BEAT.intro);
    await chatPart(take, messages, visited);
    await importPart(take, folder);
    await sealPart(take);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(take.finalHoldMs ?? ERP_IMPORT_FINAL_HOLD_MS);
  } catch (error) {
    report.failure = error.message;
    throw error;
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullViewportCrop(viewport, scale) });
    report.finalUrl = page.url();
    const problems = [...turnProblems(report.turns), ...(report.answerProblems ?? [])];
    if (!report.navigatedBy) problems.push("the Import page was not opened by Klacksy");
    if (report.draftRows !== EXPECTED_NEW_ORDERS) problems.push(`the order list showed ${report.draftRows} ERP drafts, not ${EXPECTED_NEW_ORDERS}`);
    if (report.statusAfter !== STATUS_SEALED_ORDER) problems.push(`${SEALED_REFERENCE} has status ${report.statusAfter} after the seal`);
    if (report.rowsAfter !== EXPECTED_NEW_ORDERS - 1) problems.push(`the order list keeps ${report.rowsAfter} ERP drafts after the seal`);
    if (new URL(report.finalUrl).pathname !== SHIFT_ROUTE) problems.push(`the take ended on ${report.finalUrl}`);
    if (report.ordersBefore !== 0) problems.push(`the order list held ${report.ordersBefore} rows before the take`);
    report.failure = report.failure ?? (problems.join("; ") || null);
    report.publishable = report.failure === null;
    log(`publishable ${report.publishable}${report.failure ? `: ${report.failure}` : ""}`);
  }
}

export const ERP_TAKE_RUNNERS = {
  [VIDEO_ERP_IMPORT]: takeErpImport,
};
