// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * UI strings of Klacks.Ui (release v1.0.55) that the month plan, replacement and scenario takes look for on the page, per app language, plus the pattern that
 * recognises an error toast in any of them. The values are copied from src/assets/i18n/<culture>.json; UI_TEXT_SOURCES names the key of each one, and
 * monthplan-series.selftest.mjs compares both against the i18n files when the Klacks.Ui checkout sits next to Klacks.Marketing. Only de, en, fr and it are
 * shipped with the app (every other language comes from a language pack), so a take for another culture stops here instead of searching for German text.
 * @param culture - app language code of the take (CURRENT_LANG)
 * booked - label of the list tab of the absence calendar for a booked absence
 * dayDirective - stem of the error list text "The day directive (...) does not allow this shift"
 * restRow - stem of the error list text "Rest period only ..."
 * staleTitle - title of the dialog that warns about an accept on a changed plan
 * staleAccepted - line of that dialog naming the scenarios accepted since, with {{names}}
 */

export const UI_TEXTS = Object.freeze({
  de: Object.freeze({
    booked: "Gebucht",
    dayDirective: "Tagesvorgabe",
    restRow: "Ruhezeit",
    staleTitle: "Dienstplan wurde inzwischen geändert",
    staleAccepted: "Seither übernommene Szenarien: {{names}}",
  }),
  en: Object.freeze({
    booked: "Booked",
    dayDirective: "day directive",
    restRow: "Rest period",
    staleTitle: "The schedule has changed in the meantime",
    staleAccepted: "Scenarios accepted since then: {{names}}",
  }),
  fr: Object.freeze({
    booked: "Réservé",
    dayDirective: "consigne du jour",
    restRow: "Temps de repos",
    staleTitle: "Le planning a été modifié entre-temps",
    staleAccepted: "Scénarios acceptés depuis : {{names}}",
  }),
  it: Object.freeze({
    booked: "Prenotato",
    dayDirective: "disposizione del giorno",
    restRow: "Periodo di riposo",
    staleTitle: "La pianificazione è stata modificata nel frattempo",
    staleAccepted: "Scenari accettati da allora: {{names}}",
  }),
});

export const UI_TEXT_SOURCES = Object.freeze({
  booked: Object.freeze({ key: "absence-gantt.absence-gantt-mask.absence-gantt-mask.list.booked", match: "equals" }),
  dayDirective: Object.freeze({ key: "schedule.error-list.day-directive", match: "includes" }),
  restRow: Object.freeze({ key: "schedule.error-list.rest-violation", match: "startsWith" }),
  staleTitle: Object.freeze({ key: "scenario.accept.staleTitle", match: "equals" }),
  staleAccepted: Object.freeze({ key: "scenario.accept.staleAcceptedScenarios", match: "equals" }),
});

export const ERROR_TOAST_PATTERN = new RegExp([
  "fehlgeschlagen", "fehler", "konnten? nicht", "nicht m.glich",
  "failed", "error", "could not",
  "échec", "échoué", "erreur", "impossible", "n'a pas pu", "n.ont pas pu",
  "errore", "errori", "fallit", "non riuscit", "non è stato possibile", "impossibile",
].join("|"), "i");

const NAMES_PLACEHOLDER = "{{names}}";
const WHITESPACE = /\s+/g;

export function uiTexts(culture) {
  const texts = UI_TEXTS[culture];
  if (!texts) throw new Error(`no UI texts for the culture "${culture}": the takes only know the languages shipped with the app (${Object.keys(UI_TEXTS).join(", ")})`);
  return texts;
}

export const collapseWhitespace = (text) => String(text).replace(WHITESPACE, " ").trim();

/** The stale dialog line naming the scenarios accepted since, as the app draws it. */
export function staleAcceptedLine(culture, names) {
  return collapseWhitespace(uiTexts(culture).staleAccepted.replace(NAMES_PLACEHOLDER, names));
}
