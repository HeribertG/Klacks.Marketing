// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Captions that a take writes at run time because they quote numbers, names or cells read from the API (clip M1 the hours of the row header and the
 * working days, clip M2 the three proof cells). The wording per culture lives in the script entry of capture-app-videos.scripts.json as a template with
 * {placeholder} fields; this module fills it and refuses a text that the caption pill could not carry (more than MAX_CAPTION_CHARS characters), so a
 * take stops at the caption instead of recording a truncated or overlong one.
 * @param template - text with {name} fields, from the script entry of the culture
 * @param values - field name -> value
 * @param limit - longest allowed text, MAX_CAPTION_CHARS unless a caller checks only the candidates it really shows
 */

import { MAX_CAPTION_CHARS } from "./caption-overlay.mjs";

const FIELD = /\{(\w+)\}/g;

export function fillCaption(template, values, limit = MAX_CAPTION_CHARS) {
  if (typeof template !== "string" || template === "") throw new Error("the caption template is missing in the script entry of the culture");
  const text = template.replace(FIELD, (field, name) => {
    if (!(name in values)) throw new Error(`the caption template "${template}" names the unknown field ${field}`);
    return String(values[name]);
  });
  if (text.length > limit) throw new Error(`the caption "${text}" is too long`);
  return text;
}

export function templateFields(template) {
  return [...String(template).matchAll(FIELD)].map((match) => match[1]);
}

export function assertTemplates(script, names) {
  const missing = names.filter((name) => typeof script?.runtimeCaptions?.[name] !== "string");
  if (missing.length > 0) throw new Error(`the script entry lacks runtimeCaptions ${missing.join(", ")} in capture-app-videos.scripts.json`);
}
