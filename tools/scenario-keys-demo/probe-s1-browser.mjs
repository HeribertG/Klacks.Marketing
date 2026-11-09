// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Browser probe of clip S1 v3 on a THROW-AWAY copy of klacks_marketing_security_bern_s3 behind the recording API (port 5011 only; the API serves the release Ui itself).
 * It answers the open Ui questions before the take, without recording: (1) the menu ⋮ "Weitere Aktionen" - does the tooltip of the button stand over the open menu, does the menu
 * sit below the button inside the viewport; (2) does opening "Platzhalter anlegen" reload the grid (1.0.62 did); (3) the qualification pull-down of that dialog - does Escape close
 * only the pull-down or the whole dialog; (4) the Klacksy prompt of the take - are both knowledge skills called, does the answer use the old term "Key". Every step writes a
 * screenshot and the measured boxes; nothing is hidden or retried. The database is changed only by the chat turn.
 * CLI: --out <folder> (screenshots and probe-report.json, must not exist) --group-id <uuid> [--headed] [--no-chat]   Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required),
 * KLACKS_API_URL and KLACKS_UI_URL (both https://localhost:5011).
 * @param out - folder for screenshots and the report
 * @param group-id - id of "Bern Objektschutz" in the copy
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import * as S from "../lib/klacks-demo-session.mjs";
import { SEL_ASSISTANT_INPUT, sendChatMessage } from "../lib/klacksy-chat.mjs";
import { SCHEDULE_ROUTE_PART, HTTP_POST } from "../lib/schedule-grid.mjs";
import * as D from "../lib/security-demo.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_FILE = path.join(HERE, "..", "capture-app-videos.scripts.json");
const VIDEO = "scenario-placeholders";
const CULTURE = "de";
const VIEWPORT = Object.freeze({ width: 1280, height: 720 });
const DECEMBER = Object.freeze({ year: 2026, month: 12, isoWeek: 50 });
const SEL_MORE_BUTTON = "#schedule-more-actions-btn";
const SEL_MORE_MENU = "div[ngbDropdownMenu][aria-labelledby='schedule-more-actions-btn']";
const SEL_MORE_STAND_INS = "#schedule-more-create-stand-ins";
const SEL_MORE_KEYS = "#schedule-more-manage-keys";
const SEL_MORE_NEEDS_GROUP = "#schedule-more-needs-group";
const SEL_TOOLTIP = "ngb-tooltip-window";
const SEL_STAND_IN_TITLE = "#stand-in-create-title";
const SEL_STAND_IN_GROUP_NAME = "#stand-in-create-group-name";
const SEL_QUALIFICATIONS = "#stand-in-create-qualifications";
const SEL_QUALIFICATIONS_MENU = "#stand-in-create-qualifications-menu";
const SEL_QUALIFICATION_ROW = "label[id^='stand-in-create-qualification-']";
const SEL_STAND_IN_CANCEL = "#stand-in-create-cancel";
const SEL_MODAL = "ngb-modal-window";
const OLD_TERM = /\bKeys?\b/;
const KNOWLEDGE_SKILLS = Object.freeze(["explain_scenario_variant_keys", "explain_placeholder_employees"]);
const TOOLTIP_WAIT_MS = 900;
const SETTLE_MS = 500;
const RELOAD_WAIT_MS = 4000;
const KEY_ESCAPE = "Escape";

const overlaps = (a, b) => Boolean(a && b) && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function boxOf(page, selector) {
  const locator = page.locator(selector).first();
  return (await locator.count()) > 0 && (await locator.isVisible()) ? locator.boundingBox() : null;
}

async function tooltips(page) {
  return page.locator(SEL_TOOLTIP).evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().width > 0)
    .map((element) => { const b = element.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, text: element.innerText.trim() }; }));
}

async function shot(page, out, name, report) {
  const file = path.join(out, `${String((report.shots ??= []).length + 1).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file });
  report.shots.push(file);
}

/** Opens ⋮ the way a user does (hover, click) and measures button, menu and tooltip after the tooltip delay. */
async function probeMoreMenu(page, out, report) {
  const button = page.locator(SEL_MORE_BUTTON);
  await button.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await button.hover();
  await page.waitForTimeout(TOOLTIP_WAIT_MS);
  const hoverTips = await tooltips(page);
  await button.click();
  await page.locator(SEL_MORE_MENU).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(TOOLTIP_WAIT_MS);
  const buttonBox = await boxOf(page, SEL_MORE_BUTTON);
  const menuBox = await boxOf(page, SEL_MORE_MENU);
  const openTips = await tooltips(page);
  report.moreMenu = {
    button: buttonBox, menu: menuBox, tooltipsOnHover: hoverTips, tooltipsWhileOpen: openTips,
    tooltipOverMenu: openTips.some((tip) => overlaps(tip, menuBox)),
    menuBelowButton: Boolean(menuBox && buttonBox) && menuBox.y >= buttonBox.y + buttonBox.height - 2,
    menuInViewport: Boolean(menuBox) && menuBox.x >= 0 && menuBox.y >= 0 && menuBox.x + menuBox.width <= VIEWPORT.width && menuBox.y + menuBox.height <= VIEWPORT.height,
    entries: await page.locator(`${SEL_MORE_MENU} button`).evaluateAll((elements) => elements.map((element) => ({ id: element.id, text: element.innerText.trim(), disabled: element.disabled }))),
    needsGroupShown: await page.locator(SEL_MORE_NEEDS_GROUP).isVisible().catch(() => false),
    keysEntry: await page.locator(SEL_MORE_KEYS).isVisible().catch(() => false),
  };
  await shot(page, out, "more-menu-open", report);
}

/** "Platzhalter anlegen": grid reload on opening, title with the group, then the qualification pull-down and Escape (twice at most, each step measured). */
async function probeStandInDialog(page, out, report) {
  const reload = page.waitForResponse((response) => response.request().method() === HTTP_POST && response.url().includes(SCHEDULE_ROUTE_PART), { timeout: RELOAD_WAIT_MS }).then(() => true, () => false);
  await page.locator(SEL_MORE_STAND_INS).click();
  await page.locator(SEL_STAND_IN_TITLE).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  const dialog = { gridReloadOnOpen: await reload };
  dialog.title = (await page.locator(SEL_STAND_IN_TITLE).innerText()).replace(/\s+/g, " ").trim();
  dialog.groupName = (await page.locator(SEL_STAND_IN_GROUP_NAME).innerText()).trim();
  await page.waitForTimeout(SETTLE_MS);
  await shot(page, out, "stand-in-dialog", report);
  await page.locator(SEL_QUALIFICATIONS).click();
  await page.locator(SEL_QUALIFICATIONS_MENU).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  dialog.qualificationRows = await page.locator(SEL_QUALIFICATION_ROW).evaluateAll((elements) => elements.map((element) => element.innerText.replace(/\s+/g, " ").trim()));
  dialog.pullDown = { toggle: await boxOf(page, SEL_QUALIFICATIONS), menu: await boxOf(page, SEL_QUALIFICATIONS_MENU), modal: await boxOf(page, `${SEL_MODAL} .modal-content`) };
  dialog.pullDown.menuInsideModal = Boolean(dialog.pullDown.menu && dialog.pullDown.modal) && dialog.pullDown.menu.y + dialog.pullDown.menu.height <= dialog.pullDown.modal.y + dialog.pullDown.modal.height;
  await shot(page, out, "qualification-pull-down", report);
  const state = async () => ({ pullDownOpen: await page.locator(SEL_QUALIFICATIONS_MENU).isVisible().catch(() => false), dialogOpen: await page.locator(SEL_STAND_IN_TITLE).isVisible().catch(() => false) });
  await page.keyboard.press(KEY_ESCAPE);
  await page.waitForTimeout(SETTLE_MS);
  dialog.afterFirstEscape = await state();
  await shot(page, out, "after-first-escape", report);
  if (dialog.afterFirstEscape.dialogOpen) {
    await page.keyboard.press(KEY_ESCAPE);
    await page.waitForTimeout(SETTLE_MS);
    dialog.afterSecondEscape = await state();
    await shot(page, out, "after-second-escape", report);
  }
  dialog.verdict = !dialog.afterFirstEscape.dialogOpen ? "Escape in the open pull-down closes the whole dialog"
    : dialog.afterFirstEscape.pullDownOpen ? "Escape does not close the pull-down" : "Escape closes only the pull-down";
  if (await page.locator(SEL_STAND_IN_TITLE).isVisible().catch(() => false)) await page.locator(SEL_STAND_IN_CANCEL).click();
  report.standInDialog = dialog;
}

/** The prompt of the take, sent as the take sends it; the recorder and the cursor are stand-ins without effect. */
async function probeChat(page, out, report) {
  const scripts = JSON.parse(readFileSync(SCRIPTS_FILE, "utf8"));
  const prompt = scripts[VIDEO][CULTURE].prompt;
  await page.locator(S.SEL_ASSISTANT_BUTTON).click();
  await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  const take = { page, recorder: { beginFast: async () => {}, endFast: async () => {} }, mouse: { clickLocator: (locator) => locator.click() }, chatPace: { typeDelayMs: 0, readAnswerMs: SETTLE_MS } };
  const started = Date.now();
  const turn = await sendChatMessage(take, prompt);
  const answer = turn.content.replace(/\s+/g, " ").trim();
  const called = turn.calls.map((call) => call.name);
  const oldTerm = answer.match(OLD_TERM);
  report.chat = {
    prompt, seconds: Math.round((Date.now() - started) / 1000), calls: called, missing: KNOWLEDGE_SKILLS.filter((skill) => !called.includes(skill)), errors: turn.errors,
    oldTerm: oldTerm ? answer.slice(Math.max(0, oldTerm.index - 60), oldTerm.index + 60) : null, answer: answer.slice(0, 2000),
  };
  await shot(page, out, "chat-answer", report);
}

async function main() {
  const { values } = parseArgs({ options: { out: { type: "string" }, "group-id": { type: "string" }, headed: { type: "boolean" }, "no-chat": { type: "boolean" }, "api-url": { type: "string" }, "base-url": { type: "string" } } });
  if (!values.out || !values["group-id"]) throw new Error("--out and --group-id are required");
  if (existsSync(values.out)) throw new Error(`${values.out} exists already`);
  const options = S.readSessionOptions(values);
  if (!options.apiUrl.includes(D.RECORDING_API_PORT)) throw new Error(`refusing ${options.apiUrl}: probe only the recording API`);
  mkdirSync(values.out, { recursive: true });
  const report = { startedAt: new Date().toISOString(), apiUrl: options.apiUrl };
  const browser = await chromium.launch({ headless: !values.headed });
  try {
    const context = await S.newCultureContext(browser, options, CULTURE, { viewport: VIEWPORT, deviceScaleFactor: 1, period: DECEMBER });
    const page = await context.newPage();
    await S.login(page, options);
    report.version = await (await context.request.get(`${options.apiUrl}/version.json`, { ignoreHTTPSErrors: true })).text().catch(() => null);
    await page.goto(`${options.uiUrl}${S.SCHEDULE_PATH}?groupId=${values["group-id"]}`, { timeout: S.NAV_TIMEOUT_MS });
    await page.locator("canvas[id^='template-canvas']").first().waitFor({ state: "visible", timeout: S.NAV_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS * 3);
    await probeMoreMenu(page, values.out, report);
    await probeStandInDialog(page, values.out, report);
    if (!values["no-chat"]) await probeChat(page, values.out, report);
  } catch (error) {
    report.error = String(error?.stack ?? error);
  } finally {
    await browser.close();
    writeFileSync(path.join(values.out, "probe-report.json"), JSON.stringify(report, null, 1));
    console.log(JSON.stringify({ ...report, chat: report.chat ? { ...report.chat, answer: report.chat.answer.slice(0, 400) } : null }, null, 1));
  }
  if (report.error) process.exit(1);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
