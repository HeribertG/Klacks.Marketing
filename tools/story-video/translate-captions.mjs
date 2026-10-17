// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Drafts captions.<culture>.json for the story video from the German captions with DeepSeek and checks the draft with an
 * independent back-translation into German (a second call with fresh context that never sees the German source). The
 * abbreviations in y1/y2 come verbatim from culture-profiles.json (demo seed and UI i18n) and are verified in the output; the
 * reading budget per caption is MAX_CHARS_PER_SECOND times its on-screen time. DeepL is only queried for the remaining free
 * quota (no translation, the shared quota is nearly used up). Writes the draft and a report with the back-translations.
 * CLI: --culture <code> --out <captions file> --report <report json> [--source captions.de.json] [--model deepseek-v4-pro]
 * Env: DEEPSEEK_API_KEY (required), DEEPL_API_KEY (optional, usage check only)
 * @param culture - target culture with an entry in culture-profiles.json
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { MAX_CHARS_PER_SECOND, captionTimeline, takeSettings } from "./story-recipe.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_FILE = path.join(toolDir, "culture-profiles.json");
const DEFAULT_SOURCE = path.join(toolDir, "captions.de.json");
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-pro";
const DEEPL_USAGE_URL = "https://api-free.deepl.com/v2/usage";
const TEMPERATURE = 0.2;
const JSON_RESPONSE = { type: "json_object" };
const ENDCARD_KEYS = Object.freeze(["tagline", "pill"]);
const ABSENCE_KEY = "y1";
const REPLACEMENT_KEY = "y2";
const JSON_INDENT = 2;

const SCENES = Object.freeze({
  k1: "comic: shortly before the shift starts, the planner Sandra reads a message on her phone that her colleague Anna is sick",
  k2: "comic: the roster lives in spreadsheets, on paper notes and in Sandra's head",
  k3: "comic: a spreadsheet is visible; the point is that a spreadsheet cannot plan shifts",
  k4: "comic: the friendly robot Klacksy appears; Klacksy is introduced as an electronic employee/co-worker",
  x1: "still image of the Klacks roster software; Klacks is the software, Klacksy its assistant; the software helps the viewer",
  y1: "screen recording: a red cell in the roster marks the absence type; explain the abbreviation and that the person is absent",
  y2: "screen recording: an orange cell marks the replacement; explain the abbreviation and that someone else takes over the shift",
});

async function deepseek(apiKey, model, system, user) {
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: TEMPERATURE, response_format: JSON_RESPONSE, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!response.ok) throw new Error(`DeepSeek ${response.status}: ${await response.text()}`);
  const body = await response.json();
  return JSON.parse(body.choices[0].message.content);
}

async function deeplRemaining(apiKey) {
  if (!apiKey) return null;
  const response = await fetch(DEEPL_USAGE_URL, { headers: { Authorization: `DeepL-Auth-Key ${apiKey}` } });
  if (!response.ok) return { error: response.status };
  const usage = await response.json();
  return { used: usage.character_count, limit: usage.character_limit, remaining: usage.character_limit - usage.character_count };
}

function budgets() {
  const take = takeSettings(null);
  return Object.fromEntries(captionTimeline(take.seconds, take).map((r) => [r.key, Math.floor(r.seconds * MAX_CHARS_PER_SECOND)]));
}

function translatePrompt(profile, source, limits) {
  const a = profile.abbreviations;
  const items = Object.entries(source.captions).map(([key, text]) => ({ key, german: text, maxChars: limits[key], scene: SCENES[key] }));
  const system = `You write subtitles for a short marketing video of Klacks, an open-source staff scheduling software. Translate German subtitles into ${profile.language}. `
    + `Address: ${profile.address}. Keep the meaning and tone (plain, warm, for non-technical small-business owners); do not translate word for word when that sounds unnatural. `
    + "Never exceed maxChars characters per subtitle; shorten wording instead. Keep the names Anna, Sandra, Klacks and Klacksy unchanged. "
    + `For ${ABSENCE_KEY} use exactly "${a.absence} = ${a.absenceName}" and for ${REPLACEMENT_KEY} exactly "${a.replacement} = ${a.replacementName}" (as shown in the software); translate the colour words. `
    + "The end card tagline and pill are slogans: rewrite them naturally for the language, do not translate literally; keep the pill's three parts separated by ' · '. "
    + "Answer with JSON {\"captions\":{key:text},\"endcard\":{\"tagline\":text,\"pill\":text},\"notes\":{key:short note on any judgement call}}.";
  const user = JSON.stringify({ subtitles: items, endcard: Object.fromEntries(ENDCARD_KEYS.map((k) => [k, source.endcard[k]])) });
  return { system, user };
}

function backPrompt(profile, draft) {
  const system = `Translate these ${profile.language} texts into German as literally as possible, so a reviewer can check what they really say. `
    + "Do not improve or interpret them. Answer with JSON {key: german text} using the same keys.";
  return { system, user: JSON.stringify({ ...draft.captions, ...Object.fromEntries(ENDCARD_KEYS.map((k) => [`endcard.${k}`, draft.endcard[k]])) }) };
}

function checks(profile, draft, limits) {
  const a = profile.abbreviations;
  const problems = [];
  for (const [key, max] of Object.entries(limits)) {
    const text = draft.captions[key];
    if (!text) problems.push(`${key} missing`);
    else if ([...text].length > max) problems.push(`${key} has ${[...text].length} chars (max ${max})`);
  }
  if (!draft.captions[ABSENCE_KEY]?.includes(`${a.absence} = ${a.absenceName}`)) problems.push(`${ABSENCE_KEY} lacks "${a.absence} = ${a.absenceName}"`);
  if (!draft.captions[REPLACEMENT_KEY]?.includes(`${a.replacement} = ${a.replacementName}`)) problems.push(`${REPLACEMENT_KEY} lacks "${a.replacement} = ${a.replacementName}"`);
  return problems;
}

async function main() {
  const { values } = parseArgs({ options: { culture: { type: "string" }, out: { type: "string" }, report: { type: "string" }, source: { type: "string" }, model: { type: "string" } } });
  if (!values.culture || !values.out || !values.report) throw new Error("--culture, --out and --report are required");
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");
  const culture = values.culture.toLowerCase();
  const profile = JSON.parse(await readFile(PROFILES_FILE, "utf8"))[culture];
  if (!profile) throw new Error(`no profile for ${culture} in ${PROFILES_FILE}`);
  const source = JSON.parse(await readFile(path.resolve(values.source ?? DEFAULT_SOURCE), "utf8"));
  const model = values.model ?? DEEPSEEK_MODEL;
  const limits = budgets();
  const deepl = await deeplRemaining(process.env.DEEPL_API_KEY);
  const t = translatePrompt(profile, source, limits);
  const draft = await deepseek(apiKey, model, t.system, t.user);
  const b = backPrompt(profile, draft);
  const back = await deepseek(apiKey, model, b.system, b.user);
  const problems = checks(profile, draft, limits);
  const output = {
    culture,
    captions: draft.captions,
    endcard: { ...draft.endcard, link: source.endcard.link },
    abbreviations: { ...profile.abbreviations, verifiedOnTake: false },
    review: { translatedBy: model, backTranslatedBy: model, deepl: "not used (quota)", nativeReview: "open" },
  };
  await writeFile(path.resolve(values.out), `${JSON.stringify(output, null, JSON_INDENT)}\n`, "utf8");
  const rows = Object.keys(source.captions).map((key) => ({ key, german: source.captions[key], target: draft.captions[key], chars: [...(draft.captions[key] ?? "")].length, max: limits[key], back: back[key] }));
  const report = { culture, model, deeplUsage: deepl, problems, notes: draft.notes ?? {}, rows, endcard: ENDCARD_KEYS.map((k) => ({ key: k, german: source.endcard[k], target: draft.endcard[k], back: back[`endcard.${k}`] })) };
  await writeFile(path.resolve(values.report), `${JSON.stringify(report, null, JSON_INDENT)}\n`, "utf8");
  console.log(JSON.stringify(report, null, JSON_INDENT));
  if (problems.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
