// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Self-test of the clip series Monatsplanung (M1 monthplan-wishes, M2 monthplan-commands, M3 security-month-plan), Replacement (R1, R2) and Szenarien (S0 scenario-variants) in
 * de, en, fr and it, without a browser, a server or a database: every caption track has exactly the cues of its take, fits the caption pill (42 characters) and says nothing on the list of
 * forbidden statements; every script entry has the beats and fields of the German one; the run-time captions of M1 and M2 stay within the pill for every worst case and reproduce the
 * German wording of the recorded clips; the story captions over the Veo scenes (story-video/*-captions.<culture>.json) fit the reading budget of their recipes (17 characters per second);
 * the app texts of lib/ui-texts.mjs and the absence names of the scripts agree with Klacks.Ui and Klacks.Api when those checkouts sit next to Klacks.Marketing.
 * Known and pinned: the German track of monthplan-commands has one cue over 42 characters (manual, 46), which blocks only a new German recording of M2; fixing it makes this test ask for the pin to go.
 * Run: node tools/monthplan-series.selftest.mjs
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_CAPTION_CHARS, validateCaptionTrack } from "./lib/caption-overlay.mjs";
import { fillCaption, templateFields } from "./lib/caption-template.mjs";
import { ERROR_TOAST_PATTERN, UI_TEXTS, UI_TEXT_SOURCES, collapseWhitespace, staleAcceptedLine, uiTexts } from "./lib/ui-texts.mjs";
import { SECURITY_MONTH_PLAN_CUES, VIDEO_SECURITY_MONTH_PLAN } from "./takes/security-takes.mjs";
import { REPLACEMENT_R1_CUES, VIDEO_REPLACEMENT_R1 } from "./takes/replacement-takes.mjs";
import { REPLACEMENT_R2_CUES, VIDEO_REPLACEMENT_R2 } from "./takes/replacement-r2-takes.mjs";
import { SCENARIO_VARIANTS_CUES, VIDEO_SCENARIO_VARIANTS } from "./takes/scenario-variants-takes.mjs";
import { MONTHPLAN_COMMANDS_CUES, PROOF_ORDER, TYPED, VIDEO_MONTHPLAN_COMMANDS, proofText } from "./takes/monthplan-commands-takes.mjs";
import { MONTHPLAN_WISHES_CUES, VIDEO_MONTHPLAN_WISHES } from "./takes/monthplan-wishes-takes.mjs";
import * as m1 from "./story-video/monthplan-recipe-m1.mjs";
import * as m2 from "./story-video/monthplan-recipe-m2.mjs";
import * as m3 from "./story-video/monthplan-recipe-m3.mjs";
import * as r1 from "./story-video/replacement-recipe-r1.mjs";
import * as r2 from "./story-video/replacement-recipe-r2.mjs";
import * as s0 from "./story-video/scenario-recipe-s0.mjs";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const CULTURES = ["de", "en", "fr", "it"];
const NEW_CULTURES = ["en", "fr", "it"];
const MAX_CHARS_PER_SECOND = 17;
const UI_I18N_DIR = path.resolve(toolsDir, "..", "..", "Klacks.Ui", "src", "assets", "i18n");
const ABSENCES_SEED = path.resolve(toolsDir, "..", "..", "Klacks.Api", "Infrastructure", "Persistence", "Seed", "AbsencesSeed.cs");
const PINNED_GERMAN_OVERLONG = Object.freeze({ [VIDEO_MONTHPLAN_COMMANDS]: ["manual"] });

const TAKES = [
  { video: VIDEO_SECURITY_MONTH_PLAN, cues: Object.values(SECURITY_MONTH_PLAN_CUES), recipe: m3, story: "monthplan-m3-captions", script: false },
  { video: VIDEO_REPLACEMENT_R1, cues: Object.values(REPLACEMENT_R1_CUES), recipe: r1, story: "replacement-r1-captions", script: true },
  { video: VIDEO_REPLACEMENT_R2, cues: Object.values(REPLACEMENT_R2_CUES), recipe: r2, story: "replacement-r2-captions", script: true },
  { video: VIDEO_SCENARIO_VARIANTS, cues: Object.values(SCENARIO_VARIANTS_CUES), recipe: s0, story: "scenario-s0-captions", script: true },
  { video: VIDEO_MONTHPLAN_COMMANDS, cues: Object.values(MONTHPLAN_COMMANDS_CUES), recipe: m2, story: "monthplan-m2-captions", script: true },
  { video: VIDEO_MONTHPLAN_WISHES, cues: Object.values(MONTHPLAN_WISHES_CUES), recipe: m1, story: "monthplan-m1-captions", script: true },
];

const FORBIDDEN = Object.freeze({
  all: [/-FREE\b/, /placeholder|platzhalter|segnaposto|espace réservé/i],
  de: [/klacksy (plant|entscheidet)/i, /klacks ruft (?!niemanden)/i, /automatisch/i, /in sekunden/i, /\bKI\b/, /saldo/i, /genehmigung/i, /urlaub/i, /zertifikat/i, /lohn|kosten/i],
  en: [/klacksy (plans|decides)/i, /klacks calls (?!nobody)/i, /automatic/i, /in seconds/i, /\bAI\b/, /\bbalance\b/i, /approval/i, /\bleave\b/i, /certificate/i, /payroll|\bcosts?\b/i],
  fr: [/klacksy (planifie|décide)/i, /klacks (appelle|téléphone)/i, /automatique/i, /en (quelques )?secondes/i, /\bIA\b/, /\bsolde\b/i, /approbation|autorisation/i, /certificat/i, /salaire|\bpaie\b|\bcoûts?\b/i],
  it: [/klacksy (pianifica|decide)/i, /klacks (chiama|telefona)(?! nessuno)/i, /automatic/i, /in (pochi )?secondi/i, /\bIA\b/, /\bsaldo\b/i, /approvazione|autorizzazione/i, /certificat/i, /stipendio|\bcosti?\b|\bpaga\b/i],
});

const ERROR_SAMPLES = Object.freeze({
  de: ["Recovery fehlgeschlagen.", "Die Rückmeldung konnte nicht gespeichert werden.", "Die Alternativen konnten nicht geladen werden."],
  en: ["Recovery failed.", "The response could not be saved.", "The alternatives could not be loaded."],
  fr: ["Échec de la récupération.", "La réponse n'a pas pu être enregistrée.", "Les alternatives n'ont pas pu être chargées."],
  it: ["Recupero non riuscito.", "Non è stato possibile salvare la risposta.", "Non è stato possibile caricare le alternative."],
});
const FINE_SAMPLES = Object.freeze({
  de: ["AutoWizard fertig. Szenario Auto 1 bereit.", "Recovery-Vorschlag erstellt: 4 gedeckt, 1 offen."],
  en: ["AutoWizard finished. Scenario Auto 1 ready.", "Recovery proposal created: 4 covered, 1 open."],
  fr: ["AutoWizard terminé. Scénario Auto 1 prêt.", "Proposition de récupération créée : 4 couverts, 1 ouverts."],
  it: ["AutoWizard completato. Scenario Auto 1 pronto.", "Proposta di recupero creata: 4 coperti, 1 aperti."],
});

const OLD_GERMAN_PROOF_BANDS = Object.freeze({ EARLY: "Früh", LATE: "Spät", NIGHT: "Nacht" });
const QUOTED_LABELS = Object.freeze([
  [VIDEO_MONTHPLAN_WISHES, "adopt", "contextMenu.adoptAbsence"],
  [VIDEO_MONTHPLAN_COMMANDS, "toggle", "schedule.toolbar.toggle-commands"],
  [VIDEO_MONTHPLAN_COMMANDS, "keywords", "settings.scheduling.command-keywords"],
  [VIDEO_REPLACEMENT_R2, "form", "contextMenu.coverAbsence"],
  [VIDEO_REPLACEMENT_R2, "week", "recovery.dialog.untilDate"],
  [VIDEO_SCENARIO_VARIANTS, "original", "scenario.exit"],
  [VIDEO_MONTHPLAN_WISHES, "list", "absence-gantt.absence-gantt-mask.absence-gantt-mask.list.booked"],
]);
const MOVE_VIDEOS = Object.freeze([VIDEO_REPLACEMENT_R1, VIDEO_REPLACEMENT_R2]);
const ILLNESS_ABBREVIATION_CUES = Object.freeze([[VIDEO_REPLACEMENT_R1, "cells"], [VIDEO_REPLACEMENT_R1, "absent"], [VIDEO_REPLACEMENT_R2, "cells"]]);
const PLANNABLE_ABBREVIATIONS =Object.freeze(["OBT", "OBA", "OBN", "RVM", "RVN", "EMP"]);
const WORST_HOURS = "99:59";
const WORST_DAYS = 10;
const BOOKED_FIRST_NAME = "Clara";
const SCRIPTED = TAKES.filter((take) => take.script).map((take) => take.video);

const readJson = async (file) => JSON.parse(await readFile(path.join(toolsDir, file), "utf8"));
const tracksOf = async (culture) => readJson(`simple-videos.${culture}.json`);

async function testCaptionTracks() {
  for (const culture of CULTURES) {
    const tracks = await tracksOf(culture);
    for (const { video, cues } of TAKES) {
      const track = tracks[video]?.captions;
      assert.ok(track, `${video}/${culture}: no caption track`);
      const problems = validateCaptionTrack(video, track, cues);
      const pinned = culture === "de" ? PINNED_GERMAN_OVERLONG[video] ?? [] : [];
      const expected = pinned.map((cue) => `${video}: cue "${cue}" has ${track[cue]?.length} characters (max ${MAX_CAPTION_CHARS})`);
      assert.deepEqual(problems, expected, `${video}/${culture}: caption track`);
      assert.deepEqual(Object.keys(track).sort(), [...cues].sort(), `${video}/${culture}: cue keys`);
    }
  }
}

function forbiddenIn(culture, text) {
  return [...FORBIDDEN.all, ...FORBIDDEN[culture]].filter((pattern) => pattern.test(text.replace(/public holidays/gi, ""))).map(String);
}

async function testForbiddenStatements() {
  for (const culture of CULTURES) {
    const tracks = await tracksOf(culture);
    for (const { video, story } of TAKES) {
      for (const [cue, text] of Object.entries(tracks[video].captions)) assert.deepEqual(forbiddenIn(culture, text), [], `${video}/${culture}/${cue}: "${text}"`);
      const { captions } = await readJson(`story-video/${story}.${culture}.json`);
      for (const [key, text] of Object.entries(captions)) assert.deepEqual(forbiddenIn(culture, text), [], `${story}/${culture}/${key}: "${text}"`);
    }
  }
  assert.deepEqual(forbiddenIn("en", "Klacks calls nobody. You do that."), []);
  assert.deepEqual(forbiddenIn("en", "Klacksy plans the month"), [String(FORBIDDEN.en[0])]);
  assert.deepEqual(forbiddenIn("en", "IA for Max, REP in Tanja's row"), []);
  assert.deepEqual(forbiddenIn("it", "MI per Max, SOS nella riga di Tanja. Malattia/Infortunio"), []);
  assert.ok(forbiddenIn("it", "Klacksy pianifica il mese").length > 0);
  assert.ok(forbiddenIn("fr", "Klacks appelle Selina").length > 0);
  assert.ok(forbiddenIn("de", "Klacks ruft an").length > 0);
  assert.ok(forbiddenIn("de", "Mit KI geplant").length > 0);
  assert.ok(forbiddenIn("de", "Der Saldo stimmt").length > 0);
  assert.ok(forbiddenIn("de", "Urlaub im Dezember").length > 0);
  assert.ok(forbiddenIn("en", "Planned with AI").length > 0);
  assert.ok(forbiddenIn("en", "The balance is right").length > 0);
  assert.ok(forbiddenIn("en", "Approval by the boss").length > 0);
  assert.ok(forbiddenIn("en", "Leave in December").length > 0);
  assert.ok(forbiddenIn("fr", "Planifié par IA").length > 0);
  assert.ok(forbiddenIn("fr", "Le solde est juste").length > 0);
  assert.ok(forbiddenIn("it", "Pianificato con IA").length > 0);
  assert.ok(forbiddenIn("it", "Il saldo torna").length > 0);
  for (const culture of CULTURES) assert.ok(forbiddenIn(culture, "Typed -FREE in the cell").length > 0, `${culture}: -FREE`);
  assert.ok(forbiddenIn("en", "Klacks calls Selina").length > 0);
  assert.deepEqual(forbiddenIn("fr", "FREE respecté : Mia est libre le 18"), []);
  assert.deepEqual(forbiddenIn("en", "FREE: Mia has no shift on the 18th"), []);
}

async function testStoryCaptions() {
  for (const { story, recipe } of TAKES) {
    assert.equal(recipe.CAPTIONS_PREFIX, `${story}.`);
    const variant = recipe.VARIANTS[recipe.variantFor()];
    const windows = recipe.captionWindows(variant);
    const german = (await readJson(`story-video/${story}.de.json`)).captions;
    for (const culture of CULTURES) {
      const file = await readJson(`story-video/${story}.${culture}.json`);
      assert.equal(file.culture, culture, `${story}/${culture}: culture field`);
      assert.deepEqual(Object.keys(file.captions).sort(), Object.keys(german).sort(), `${story}/${culture}: keys`);
      for (const key of variant.captionKeys) {
        const text = file.captions[key];
        assert.ok(typeof text === "string" && text.trim() !== "", `${story}/${culture}: caption ${key} missing`);
        const seconds = windows[key][1] - windows[key][0];
        const perSecond = [...text].length / seconds;
        assert.ok(perSecond <= MAX_CHARS_PER_SECOND, `${story}/${culture}/${key}: ${perSecond.toFixed(1)} chars/s over ${seconds.toFixed(2)} s`);
      }
    }
    for (const culture of NEW_CULTURES) {
      const card = (await readJson(`story-video/captions.${culture}.json`)).endcard;
      assert.ok(card?.tagline && card?.link, `captions.${culture}.json: no end card`);
    }
  }
}

async function testScriptEntries() {
  const scripts = await readJson("capture-app-videos.scripts.json");
  const dateOf = new Intl.DateTimeFormat;
  for (const video of SCRIPTED) {
    const german = scripts[video]?.de;
    assert.ok(german?.beats, `${video}/de: no script entry`);
    for (const culture of NEW_CULTURES) {
      const entry = scripts[video]?.[culture];
      assert.ok(entry?.beats, `${video}/${culture}: no script entry`);
      assert.deepEqual(entry.beats, german.beats, `${video}/${culture}: beats differ from the German ones, a caption would change its time in the picture`);
      assert.deepEqual(Object.keys(entry).sort(), Object.keys(german).sort(), `${video}/${culture}: fields differ from the German entry`);
    }
  }
  for (const video of [VIDEO_REPLACEMENT_R1, VIDEO_REPLACEMENT_R2]) {
    for (const culture of CULTURES) assert.match(scripts[video][culture].absenceName, /\S\/\S/, `${video}/${culture}: absence name`);
  }
  for (const culture of CULTURES) {
    const expected = new Intl.DateTimeFormat(culture, { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 11, 18)));
    const typed = scripts[VIDEO_REPLACEMENT_R2][culture].untilDateTyped ?? "18.12.2026";
    assert.equal(typed.replace(/\b0(\d)\b/g, "$1"), expected.replace(/\b0(\d)\b/g, "$1"), `${culture}: the date the datepicker of the language writes`);
  }
  assert.ok(dateOf);
  for (const culture of CULTURES) {
    const variants = scripts[VIDEO_SCENARIO_VARIANTS][culture];
    assert.ok(variants.variantA.scenarioName.includes(variants.variantA.firstName) && variants.variantB.scenarioName.includes(variants.variantB.firstName), `${culture}: variant names`);
    assert.notEqual(variants.variantA.scenarioName, variants.variantB.scenarioName);
    assert.deepEqual(variants.nights, scripts[VIDEO_SCENARIO_VARIANTS].de.nights);
  }
}

function proofCells() {
  return PROOF_ORDER.map(([firstName, day]) => ({ firstName, day: Number(day.slice(-2)), keywords: TYPED.filter((command) => command.firstName === firstName && command.day === day).map((command) => command.keyword).join(" ") }));
}

async function testRuntimeCaptions() {
  const scripts = await readJson("capture-app-videos.scripts.json");
  for (const culture of CULTURES) {
    const runtime = scripts[VIDEO_MONTHPLAN_WISHES][culture].runtimeCaptions;
    assert.deepEqual(Object.keys(runtime).sort(), ["counted", "hoursAfter", "hoursBefore"], `${culture}: runtimeCaptions`);
    assert.deepEqual(templateFields(runtime.hoursBefore).sort(), ["hours", "name"]);
    assert.deepEqual(templateFields(runtime.hoursAfter).sort(), ["hours", "name"]);
    assert.deepEqual(templateFields(runtime.counted), ["days"]);
    assert.ok(fillCaption(runtime.hoursBefore, { name: BOOKED_FIRST_NAME, hours: WORST_HOURS }).length <= MAX_CAPTION_CHARS);
    assert.ok(fillCaption(runtime.hoursAfter, { name: BOOKED_FIRST_NAME, hours: WORST_HOURS }).length <= MAX_CAPTION_CHARS);
    assert.ok(fillCaption(runtime.counted, { days: WORST_DAYS }).length <= MAX_CAPTION_CHARS);
  }
  const german = scripts[VIDEO_MONTHPLAN_WISHES].de.runtimeCaptions;
  for (const hours of ["0:00", "7:06", "35:33"]) {
    assert.equal(fillCaption(german.hoursBefore, { name: BOOKED_FIRST_NAME, hours }), `Im Zeilenkopf: Clara bei ${hours} Stunden`);
    assert.equal(fillCaption(german.hoursAfter, { name: BOOKED_FIRST_NAME, hours }), `Im Zeilenkopf: Clara jetzt ${hours} Stunden`);
  }
  assert.equal(fillCaption(german.counted, { days: 5 }), "Stunden zählen nur die 5 Werktage");

  for (const culture of CULTURES) {
    const proof = scripts[VIDEO_MONTHPLAN_COMMANDS][culture].proof;
    assert.deepEqual(Object.keys(proof.bands).sort(), ["EARLY", "LATE", "NIGHT"], `${culture}: band names`);
    assert.deepEqual(templateFields(proof.caption).sort(), ["day", "keywords", "name", "shown"], `${culture}: proof caption fields`);
    assert.deepEqual(templateFields(proof.shown).sort(), ["abbreviation", "band"], `${culture}: proof shown fields`);
    for (const cell of proofCells()) {
      const withoutWork = proofText(proof, { ...cell, work: null }, Number.POSITIVE_INFINITY);
      assert.ok(withoutWork.length <= MAX_CAPTION_CHARS, `${culture}: "${withoutWork}" is ${withoutWork.length} characters`);
      for (const abbreviation of PLANNABLE_ABBREVIATIONS) {
        for (const [band, [startTime, endTime]] of Object.entries({ EARLY: ["08:00", "10:00"], LATE: ["16:00", "20:00"], NIGHT: ["23:00", "07:00"] })) {
          const text = proofText(proof, { ...cell, work: { abbreviation, startTime, endTime } });
          assert.ok(text.length <= MAX_CAPTION_CHARS, `${culture}: "${text}" is ${text.length} characters`);
          assert.ok(text.includes(proof.bands[band]), `${culture}: band ${band} is not named in "${text}"`);
        }
      }
    }
  }
  const german2 = scripts[VIDEO_MONTHPLAN_COMMANDS].de.proof;
  const oldBand = { EARLY: ["08:00", "10:00"], LATE: ["16:00", "20:00"], NIGHT: ["23:00", "07:00"] };
  for (const cell of proofCells()) {
    for (const [band, [startTime, endTime]] of Object.entries(oldBand)) {
      assert.equal(proofText(german2, { ...cell, work: { abbreviation: "OBA", startTime, endTime } }), `${cell.keywords}: ${cell.firstName} am ${cell.day}. OBA, ${OLD_GERMAN_PROOF_BANDS[band]}`);
    }
    assert.equal(proofText(german2, { ...cell, work: null }), `${cell.keywords}: ${cell.firstName} am ${cell.day}. ohne Dienst`);
  }
  assert.throws(() => fillCaption("{missing}", {}), /unknown field/);
  assert.throws(() => fillCaption("x".repeat(MAX_CAPTION_CHARS + 1), {}), /too long/);
}

function testUiTexts() {
  assert.deepEqual(Object.keys(UI_TEXTS), CULTURES);
  for (const culture of CULTURES) assert.deepEqual(Object.keys(UI_TEXTS[culture]).sort(), Object.keys(UI_TEXT_SOURCES).sort(), `${culture}: ui text keys`);
  assert.throws(() => uiTexts("cs"), /no UI texts for the culture "cs"/);
  assert.equal(staleAcceptedLine("fr", "Variante B : Lena"), "Scénarios acceptés depuis : Variante B : Lena");
  assert.equal(staleAcceptedLine("de", "Variante B: Lena"), "Seither übernommene Szenarien: Variante B: Lena");
  assert.equal(collapseWhitespace(["a", "b", "c" + String.fromCharCode(10)].join(String.fromCharCode(0xa0, 0x202f, 32))), "a b c");
  for (const culture of CULTURES) {
    for (const sample of ERROR_SAMPLES[culture]) assert.ok(ERROR_TOAST_PATTERN.test(sample), `${culture}: error toast "${sample}" is not recognised`);
    for (const sample of FINE_SAMPLES[culture]) assert.ok(!ERROR_TOAST_PATTERN.test(sample), `${culture}: "${sample}" is taken for an error`);
  }
}

async function testAgainstUi() {
  if (!existsSync(UI_I18N_DIR)) {
    console.log("  skipped: no Klacks.Ui checkout next to Klacks.Marketing, app texts not compared with the i18n files");
    return;
  }
  const flatten = (object, prefix = "", found = {}) => {
    for (const [key, value] of Object.entries(object)) {
      const name = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object") flatten(value, name, found);
      else found[name] = value;
    }
    return found;
  };
  for (const culture of CULTURES) {
    const messages = flatten(JSON.parse(await readFile(path.join(UI_I18N_DIR, `${culture}.json`), "utf8")));
    for (const [name, { key, match }] of Object.entries(UI_TEXT_SOURCES)) {
      const message = messages[key];
      assert.ok(message, `${culture}: i18n key ${key} is missing`);
      const text = UI_TEXTS[culture][name];
      const ok = match === "equals" ? message === text : match === "startsWith" ? message.startsWith(text) : message.includes(text);
      assert.ok(ok, `${culture}: ${name} "${text}" does not match ${key} "${message}"`);
    }
    const tracks = await tracksOf(culture);
    for (const [video, cue, key] of QUOTED_LABELS) {
      const label = String(messages[key]).replace(/\.\.\.$/, "").replace(/ \(.*$/, "").toLowerCase();
      const caption = tracks[video].captions[cue].toLowerCase();
      assert.ok(caption.includes(label), `${culture}: ${video}/${cue} "${caption}" does not quote the app label "${label}" (${key})`);
    }
    const replacementAbbreviation = new RegExp(`\b${messages["workChange.abbr.replacement"]}\b`);
    for (const video of MOVE_VIDEOS) {
      for (const [cue, text] of Object.entries(tracks[video].captions)) {
        assert.ok(!replacementAbbreviation.test(text), `${culture}: ${video}/${cue} names the replacement abbreviation, but a covered absence moves the shift since the cover move`);
      }
    }
  }
}

async function testAbsenceNames() {
  if (!existsSync(ABSENCES_SEED)) {
    console.log("  skipped: no Klacks.Api checkout next to Klacks.Marketing, absence names not compared with AbsencesSeed.cs");
    return;
  }
  const scripts = await readJson("capture-app-videos.scripts.json");
  const seed = (await readFile(ABSENCES_SEED, "utf8")).replaceAll('""', '"');
  const names = [...seed.matchAll(/\{"de":"([^"]+)","en":"([^"]+)","fr":"([^"]+)","it":"([^"]+)"\}/g)].map((match) => ({ de: match[1], en: match[2], fr: match[3], it: match[4] }));
  const illness = names.find((entry) => entry.de === "Krankheit/Unfall");
  assert.ok(illness, "AbsencesSeed.cs holds no Krankheit/Unfall");
  const illnessAbbreviation = names.find((entry) => entry.de === "KU");
  assert.ok(illnessAbbreviation, "AbsencesSeed.cs holds no abbreviation KU");
  for (const video of [VIDEO_REPLACEMENT_R1, VIDEO_REPLACEMENT_R2]) {
    for (const culture of CULTURES) assert.equal(scripts[video][culture].absenceName, illness[culture], `${video}/${culture}: absence name`);
  }
  for (const culture of CULTURES) {
    const tracks = await tracksOf(culture);
    for (const [video, cue] of ILLNESS_ABBREVIATION_CUES) {
      assert.ok(tracks[video].captions[cue].includes(illnessAbbreviation[culture]), `${culture}: ${video}/${cue} does not use the absence abbreviation ${illnessAbbreviation[culture]}`);
    }
  }
}

await testCaptionTracks();
await testForbiddenStatements();
await testStoryCaptions();
await testScriptEntries();
await testRuntimeCaptions();
testUiTexts();
await testAgainstUi();
await testAbsenceNames();
console.log("monthplan-series self-test: ok");
