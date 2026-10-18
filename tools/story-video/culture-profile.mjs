// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Culture handling of the story video tool: case-insensitive lookup of culture-profiles.json and captions.<culture>.json
 * (the plugin folders say zh-CN, wwwroot and the video catalog say zh-cn), the list of the 25 supported cultures and the
 * per-culture rendering settings (font stack, line height, reading speed).
 * @param culture - culture code in any casing (de, zh-CN, zh-cn)
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_STYLE, MAX_CHARS_PER_SECOND } from "./story-recipe.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
export const PROFILES_FILE = path.join(toolDir, "culture-profiles.json");
const CAPTIONS_FILE_PATTERN = /^captions\.(.+)\.json$/i;
const INTER_FULL = "full";

export const SUPPORTED_CULTURES = Object.freeze([
  "de", "en", "fr", "it", "ar", "cs", "da", "el", "es", "fi", "he", "id", "ja", "ko", "ms", "nb", "nl", "pl", "pt", "ro", "sv", "th", "vi", "zh-cn", "zh-tw",
]);

export const normalizeCulture = (culture) => String(culture).trim().toLowerCase();

export async function loadProfiles() {
  return JSON.parse(await readFile(PROFILES_FILE, "utf8"));
}

export async function findProfile(culture, profiles) {
  const all = profiles ?? await loadProfiles();
  const key = Object.keys(all).find((k) => normalizeCulture(k) === normalizeCulture(culture));
  return key ? all[key] : null;
}

export async function findCaptionsFile(culture, directory = toolDir) {
  const wanted = normalizeCulture(culture);
  const files = await readdir(directory);
  const hit = files.find((f) => {
    const m = f.match(CAPTIONS_FILE_PATTERN);
    return m !== null && normalizeCulture(m[1]) === wanted;
  });
  return hit ? path.join(directory, hit) : null;
}

export function renderSettings(profile) {
  return {
    fontFamily: profile?.fontStack ?? CAPTION_STYLE.fontFamily,
    lineHeight: profile?.lineHeight ?? CAPTION_STYLE.lineHeight,
    maxCharsPerSecond: profile?.maxCharsPerSecond ?? MAX_CHARS_PER_SECOND,
    interRequired: (profile?.interCoverage ?? INTER_FULL) === INTER_FULL,
  };
}
