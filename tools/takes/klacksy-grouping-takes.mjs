// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Klacksy grouping takes for the website's Klacksy carousel: in the chat Klacksy sorts the employees into groups —
 * by address (region, canton, city cluster, municipality sub-clusters; klacksy-groups-address), by qualification
 * (klacksy-groups-qualification) and mixed (qualification sub-groups below the location group Winterthur;
 * klacksy-groups-mixed). Every take shows a preview turn and a confirmation turn, then the refreshed group tree.
 * The takes run only against the dedicated demo database klacks_marketing_grouping (tools/grouping-demo, built by
 * build-grouping-demo.ps1) and reset its groups before recording: the address take starts from no groups, the two
 * other takes from the location tree snapshot (grouping-demo/location-tree.sql). A take is publishable only when the
 * database afterwards holds the expected groups and Klacksy applied the skill exactly once without an error.
 * @param take - Take context (page, api, options, recorder, mouse, report, culture, script)
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { SEL_ASSISTANT_INPUT, SEL_ASSISTANT_CLOSE, SKILL_ERROR_PREFIX, sendChatMessage } from "../lib/klacksy-chat.mjs";

export const VIDEO_KLACKSY_GROUPS_ADDRESS = "klacksy-groups-address";
export const VIDEO_KLACKSY_GROUPS_QUALIFICATION = "klacksy-groups-qualification";
export const VIDEO_KLACKSY_GROUPS_MIXED = "klacksy-groups-mixed";
export const KLACKSY_GROUPING_VIDEOS = [VIDEO_KLACKSY_GROUPS_ADDRESS, VIDEO_KLACKSY_GROUPS_QUALIFICATION, VIDEO_KLACKSY_GROUPS_MIXED];

/**
 * At the chat viewport width the standard home page does not fit (UI layout issue, reported): below 1320 px the headline
 * keeps only 2 px to the side menu, and the fixed 940 px group card overflows the 900 px content area - to the right in
 * LTR, under the side menu in RTL (ar/he), where the tree toggles become unclickable. The takes give the headline the inset
 * of the wider layouts and let the card shrink to the content area.
 */
export const KLACKSY_GROUPING_CSS = `.container-headline { padding-inline-start: 24px !important; }
  .container-profile { max-width: calc(100% - 24px) !important; }`;

const run = promisify(execFile);
const toolsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEMO_DIR = path.join(toolsDir, "grouping-demo");
const RESET_SQL = path.join(DEMO_DIR, "reset-groups.sql");
const LOCATION_TREE_SQL = path.join(DEMO_DIR, "location-tree.sql");

const ENV_PSQL = "KLACKS_PSQL";
const ENV_DB = "KLACKS_GROUPING_DB";
const ENV_PG_PASSWORD = "PGPASSWORD";
const DEFAULT_PSQL = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const DEFAULT_DB = "klacks_marketing_grouping";
const REQUIRED_DB_SUFFIX = "_grouping";
const PG_HOST = "localhost";
const PG_PORT = "5434";
const PG_USER = "postgres";
const PG_DEFAULT_PASSWORD = "admin";
const PSQL_MAX_BUFFER = 16 * 1024 * 1024;

const GROUPS_PATH = "/workplace/group";
const ROOTS_API = "/api/backend/Groups/roots";
const SEL_TREE_VIEW = "#all-group-tree-view";
const SEL_TREE_TOGGLE = "#all-group-list-tree-toggle";
const SEL_TREE_REFRESH = "#tree-group-refresh-button";
const SEL_TREE_EXPAND_ALL = "#tree-group-expand-button";
const SEL_TREE_CONTAINER = "#tree-group-tree-container";
const nodeToggle = (id) => `#tree-node-toggle-${id}`;

const BEAT = { warmUp: 2500, intro: 1200, showTree: 1500, afterClose: 700, afterRefresh: 1500, afterExpand: 900, finalHold: 6000 };
const MOVE = { short: 400, normal: 600 };
const RESTING_RATIO = { x: 0.6, y: 0.04 };
const SCROLL_STEP_PX = 120;
const SCROLL_STEPS = 6;
const SCROLL_PAUSE_MS = 350;

const ADDRESS_SKILL = "partition_clients_by_address";
const QUALIFICATION_SKILL = "partition_clients_by_qualification";
const WINTERTHUR = "Winterthur";

const GROUP_ROWS_SQL = `select g.id, g.name, coalesce(p.name, '') as parent, (select count(*) from group_item gi where gi.group_id = g.id and not gi.is_deleted) as members
  from "group" g left join "group" p on p.id = g.parent where not g.is_deleted order by g.root, g.lft;`;

function dbName() {
  const name = process.env[ENV_DB] ?? DEFAULT_DB;
  if (!name.endsWith(REQUIRED_DB_SUFFIX)) throw new Error(`${ENV_DB}=${name} does not look like the grouping demo database - refusing to reset it`);
  return name;
}

async function psql(args) {
  const { stdout } = await run(process.env[ENV_PSQL] ?? DEFAULT_PSQL,
    ["-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", dbName(), "-v", "ON_ERROR_STOP=1", ...args],
    { env: { ...process.env, [ENV_PG_PASSWORD]: process.env[ENV_PG_PASSWORD] ?? PG_DEFAULT_PASSWORD }, maxBuffer: PSQL_MAX_BUFFER });
  return stdout;
}

async function groupRows() {
  const out = await psql(["-A", "-t", "-F", "\t", "-c", GROUP_ROWS_SQL]);
  return out.split(/\r?\n/).filter(Boolean).map((line) => {
    const [id, name, parent, members] = line.split("\t");
    return { id, name, parent, members: Number(members) };
  });
}

async function resetGroups(withLocationTree) {
  await psql(["-q", "-f", RESET_SQL]);
  if (withLocationTree) await psql(["-q", "-f", LOCATION_TREE_SQL]);
  return groupRows();
}

async function openGroupTree(page, options) {
  await page.goto(`${options.uiUrl}${GROUPS_PATH}`, { waitUntil: "domcontentloaded", timeout: S.NAV_TIMEOUT_MS });
  await S.waitForAppShell(page);
  if (!(await page.locator(SEL_TREE_VIEW).isVisible().catch(() => false))) {
    await page.locator(SEL_TREE_TOGGLE).click({ timeout: S.READY_TIMEOUT_MS });
  }
  await page.locator(SEL_TREE_VIEW).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(BEAT.showTree);
}

const PREVIEW_RESULT_PREFIX = "Preview";
const REJECTED_RESULT_PREFIX = "Rejected";

/**
 * Successful applies of the skill: results that are neither a preview, an error nor a guard rejection (a model that
 * tries to apply in the preview turn is rejected by the server, and that attempt must not count as applied).
 */
function appliedResults(turns, skill) {
  return turns.flatMap((t) => t.results ?? []).filter((r) => r.name === skill
    && ![PREVIEW_RESULT_PREFIX, REJECTED_RESULT_PREFIX, SKILL_ERROR_PREFIX].some((prefix) => r.result.startsWith(prefix)));
}

function skillErrors(turns, skill) {
  return turns.flatMap((t) => t.results ?? []).filter((r) => r.name === skill && r.result.startsWith(SKILL_ERROR_PREFIX));
}

async function expandPath(take, ids) {
  const { page, mouse } = take;
  for (const id of ids) {
    const toggle = page.locator(nodeToggle(id));
    if (!(await toggle.isVisible().catch(() => false))) continue;
    await mouse.clickLocator(toggle, MOVE.normal);
    await page.waitForTimeout(BEAT.afterExpand);
  }
}

async function scrollTree(page) {
  const container = page.locator(SEL_TREE_CONTAINER);
  const box = await container.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 3, box.y + Math.min(box.height / 2, 200));
  for (let step = 0; step < SCROLL_STEPS; step++) {
    await page.mouse.wheel(0, SCROLL_STEP_PX);
    await page.waitForTimeout(SCROLL_PAUSE_MS);
  }
}

/**
 * Opens and closes the chat once before recording, so the take never shows the assistant's one-time initialization
 * overlay (and the welcome bubble) when it is opened on camera.
 */
async function warmUpAssistant(page) {
  await page.locator(S.SEL_ASSISTANT_BUTTON).click({ timeout: S.READY_TIMEOUT_MS });
  const input = page.locator(SEL_ASSISTANT_INPUT);
  await input.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  await page.waitForFunction((sel) => !document.querySelector(sel)?.hasAttribute("disabled"), SEL_ASSISTANT_INPUT, { timeout: S.NAV_TIMEOUT_MS });
  await page.waitForTimeout(BEAT.warmUp);
  await page.locator(SEL_ASSISTANT_CLOSE).click({ timeout: S.READY_TIMEOUT_MS });
  await input.waitFor({ state: "hidden", timeout: S.READY_TIMEOUT_MS });
  await page.waitForTimeout(BEAT.afterClose);
}

function restingPoint(viewport) {
  return { x: Math.round(viewport.width * RESTING_RATIO.x), y: Math.round(viewport.height * RESTING_RATIO.y) };
}

const SCENES = {
  [VIDEO_KLACKSY_GROUPS_ADDRESS]: {
    skill: ADDRESS_SKILL,
    withLocationTree: false,
    reveal: async (take) => {
      await take.mouse.clickLocator(take.page.locator(SEL_TREE_EXPAND_ALL), MOVE.normal);
      await take.page.waitForTimeout(BEAT.afterExpand);
      await scrollTree(take.page);
    },
    verify: (before, after) => {
      const names = new Set(after.map((g) => g.name));
      const sub = after.find((g) => g.parent === WINTERTHUR);
      const ok = before.length === 0 && names.has(WINTERTHUR) && names.has("ZH") && Boolean(sub);
      return ok ? null : `expected region/canton/city tree with a municipality sub-cluster below ${WINTERTHUR}, got ${after.length} groups`;
    },
  },
  [VIDEO_KLACKSY_GROUPS_QUALIFICATION]: {
    skill: QUALIFICATION_SKILL,
    withLocationTree: true,
    reveal: async (take, before, after) => {
      const beforeIds = new Set(before.map((g) => g.id));
      const root = after.find((g) => !beforeIds.has(g.id) && after.some((c) => c.parent === g.name && !beforeIds.has(c.id)) && !g.parent);
      if (root) await expandPath(take, [root.id]);
    },
    verify: (before, after) => {
      const beforeIds = new Set(before.map((g) => g.id));
      const created = after.filter((g) => !beforeIds.has(g.id));
      const filled = created.filter((g) => g.members > 0);
      return filled.length >= 3 ? null : `expected at least 3 new qualification groups with members, got ${filled.length} of ${created.length}`;
    },
  },
  [VIDEO_KLACKSY_GROUPS_MIXED]: {
    skill: QUALIFICATION_SKILL,
    withLocationTree: true,
    reveal: async (take, before) => {
      const byName = new Map(before.map((g) => [g.name, g]));
      const chain = [];
      for (let node = byName.get(WINTERTHUR); node; node = node.parent ? byName.get(node.parent) : null) chain.unshift(node.id);
      await expandPath(take, chain);
    },
    verify: (before, after) => {
      const beforeIds = new Set(before.map((g) => g.id));
      const created = after.filter((g) => !beforeIds.has(g.id));
      const below = created.filter((g) => g.parent === WINTERTHUR && g.members > 0);
      const elsewhere = created.filter((g) => g.parent !== WINTERTHUR);
      if (elsewhere.length > 0) return `groups created outside ${WINTERTHUR}: ${elsewhere.map((g) => g.name).join(", ")}`;
      return below.length >= 2 ? null : `expected qualification groups below ${WINTERTHUR}, got ${below.length}`;
    },
  },
};

async function takeGrouping(take, video) {
  const { page, api, options, recorder, mouse, report, script, viewport } = take;
  const scene = SCENES[video];
  const before = await resetGroups(scene.withLocationTree);
  const roots = (await api.json(ROOTS_API)) ?? [];
  const expectedRoots = before.filter((g) => !g.parent).length;
  if (roots.length !== expectedRoots) {
    throw new Error(`backend shows ${roots.length} root groups, database ${dbName()} has ${expectedRoots} - is the backend running against ${dbName()}?`);
  }
  report.groupsBefore = before.length;
  await openGroupTree(page, options);
  await warmUpAssistant(page);
  report.turns = [];
  try {
    await recorder.start();
    await page.waitForTimeout(BEAT.intro);
    await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE.normal);
    await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    for (const message of script.messages) {
      if (message.sendWhen === "notApplied" && appliedResults(report.turns, scene.skill).length > 0) {
        report.turns.push({ prompt: message.text, sent: false, reason: "already applied" });
        continue;
      }
      const turn = await sendChatMessage(take, message.text);
      report.turns.push({ prompt: message.text, sent: true, ...turn });
      console.log("   ", `calls: ${turn.calls.map((c) => c.name).join(", ") || "-"}; answer: ${String(turn.content).replace(/\s+/g, " ").slice(0, 200)}`);
    }
    await mouse.clickLocator(page.locator(SEL_ASSISTANT_CLOSE), MOVE.normal);
    await page.waitForTimeout(BEAT.afterClose);
    await mouse.clickLocator(page.locator(SEL_TREE_REFRESH), MOVE.normal);
    await page.waitForTimeout(BEAT.afterRefresh);
    const after = await groupRows();
    await scene.reveal(take, before, after);
    await mouse.moveTo(restingPoint(viewport), MOVE.normal);
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.finalHold);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: { x: 0, y: 0, width: viewport.width, height: viewport.height } });
    const after = await groupRows();
    report.groupsAfter = after.map((g) => `${g.parent ? `${g.parent} > ` : ""}${g.name} (${g.members})`);
    report.applyCalls = appliedResults(report.turns, scene.skill).length;
    report.skillErrors = skillErrors(report.turns, scene.skill).map((r) => r.result);
    const mismatch = scene.verify(before, after);
    report.publishable = !mismatch && report.applyCalls === 1 && report.skillErrors.length === 0;
    if (!report.publishable) {
      report.failure = mismatch
        ?? (report.applyCalls !== 1 ? `Klacksy applied ${scene.skill} ${report.applyCalls} times instead of once` : `skill errors: ${report.skillErrors.join(" | ")}`);
    }
  }
}

export const KLACKSY_GROUPING_TAKE_RUNNERS = Object.fromEntries(
  KLACKSY_GROUPING_VIDEOS.map((video) => [video, (take) => takeGrouping(take, video)]),
);
