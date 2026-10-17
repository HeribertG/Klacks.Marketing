// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Renders the transparent 1280x720 caption overlays and the opaque end card of the story video with Playwright/Chromium
 * (Inter from wwwroot/css/fonts.css, system font fallback for scripts Inter lacks; ar/he right-to-left with the bar on the right).
 * @param outDir - directory that receives <key>.png per caption and the end card PNG
 * @param captions - caption texts keyed k1..k4, x1, y1, y2 (from captions.<culture>.json)
 * @param endcard - end card texts { tagline, pill, link }
 * @param culture - culture code, sets lang and the text direction
 */

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CAPTION_KEYS,
  CAPTION_STYLE,
  DIR_RTL,
  ENDCARD_STYLE,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  LOGO_VIEWBOX,
  MAX_CAPTION_WIDTH,
  cultureDirection,
} from "./story-recipe.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const marketingRoot = path.resolve(toolDir, "..", "..");
const requireFromMarketing = createRequire(path.join(marketingRoot, "package.json"));
const { chromium } = requireFromMarketing("playwright-core");

const FONTS_CSS = path.join(marketingRoot, "wwwroot", "css", "fonts.css");
const LOGO_SVG = path.join(marketingRoot, "wwwroot", "images", "klacks-logo.svg");
const PNG = ".png";
const ENDCARD_FILE = `endcard${PNG}`;
const HALF = 2;
const HTML_ESCAPES = Object.freeze({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" });

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export const FONT_MODE_INTER = "inter";
export const FONT_MODE_LIVE = "live";
export const FONT_MODES = Object.freeze([FONT_MODE_INTER, FONT_MODE_LIVE]);
const FONT_FACE_PATTERN = /@font-face\s*{[^}]*}/g;
const INTER_FAMILY = "'Inter'";
const FONT_URL_PATTERN = /url\(([^)]+\.woff2)\)/;
const WOFF2_MIME = "font/woff2";
const BASE64 = "base64";
let interFaceCss = null;

async function inlineInterFaces() {
  if (interFaceCss) return interFaceCss;
  const css = await readFile(FONTS_CSS, "utf8");
  const faces = [];
  for (const face of css.match(FONT_FACE_PATTERN) ?? []) {
    if (!face.includes(INTER_FAMILY)) continue;
    const url = face.match(FONT_URL_PATTERN);
    if (!url) continue;
    const data = await readFile(path.resolve(path.dirname(FONTS_CSS), url[1]));
    faces.push(face.replace(url[0], `url(data:${WOFF2_MIME};${BASE64},${data.toString(BASE64)})`));
  }
  if (faces.length === 0) throw new Error(`no Inter faces in ${FONTS_CSS}`);
  interFaceCss = `<style>${faces.join("")}</style>`;
  return interFaceCss;
}

async function fontsHead(fontMode) {
  if (fontMode === FONT_MODE_LIVE) return `<link rel="stylesheet" href="${pathToFileURL(FONTS_CSS).href}">`;
  return inlineInterFaces();
}

function baseCss() {
  return `html,body{margin:0;background:transparent}body{width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;position:relative;font-family:${CAPTION_STYLE.fontFamily}}`;
}

function captionCss(bottom, direction) {
  const s = CAPTION_STYLE;
  const p = s.padding;
  const padding = direction === DIR_RTL
    ? `${p.top}px ${p.bar}px ${p.bottom}px ${p.inner}px`
    : `${p.top}px ${p.inner}px ${p.bottom}px ${p.bar}px`;
  const bar = direction === DIR_RTL ? "border-right" : "border-left";
  return `<style>${baseCss()}.cap{position:absolute;left:50%;bottom:${bottom}px;transform:translateX(-50%);width:max-content;max-width:${MAX_CAPTION_WIDTH}px;box-sizing:border-box;padding:${padding};background:${s.background};color:${s.color};font-weight:${s.fontWeight};font-size:${s.fontSize}px;line-height:${s.lineHeight};border-radius:${s.radius}px;${bar}:${s.barWidth}px solid ${s.barColor};text-align:center}</style>`;
}

function captionBottom(key) {
  return CAPTION_KEYS.take.includes(key) ? CAPTION_STYLE.bottomTake : CAPTION_STYLE.bottomRaw;
}

function captionHtml(key, text, culture, fonts) {
  const direction = cultureDirection(culture);
  return `${fonts}${captionCss(captionBottom(key), direction)}<div class="cap" dir="${direction}" lang="${escapeHtml(culture)}">${escapeHtml(text)}</div>`;
}

async function withPage(work) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: FRAME_WIDTH, height: FRAME_HEIGHT } });
    return await work(page);
  } finally {
    await browser.close();
  }
}

async function shoot(page, html, file, transparent) {
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").length);
  if (loaded === 0) console.warn(`! ${path.basename(file)}: no web font loaded, Chromium used the system font`);
  await page.screenshot({ path: file, omitBackground: transparent });
  return file;
}

export async function renderCaptions(outDir, captions, culture, fontMode = FONT_MODE_INTER) {
  const keys = [...CAPTION_KEYS.raw, ...CAPTION_KEYS.schedule, ...CAPTION_KEYS.take];
  const missing = keys.filter((k) => !captions[k]);
  if (missing.length > 0) throw new Error(`captions missing for ${culture}: ${missing.join(", ")}`);
  const fonts = await fontsHead(fontMode);
  return withPage(async (page) => {
    const files = {};
    for (const key of keys) files[key] = await shoot(page, captionHtml(key, captions[key], culture, fonts), path.join(outDir, `${key}${PNG}`), true);
    return files;
  });
}

function logoMarkup(svgSource) {
  const match = svgSource.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!match) throw new Error("Could not parse klacks-logo.svg");
  return match[1]
    .replace(/<sodipodi:namedview[\s\S]*?\/>/, "")
    .replace(/<defs[^>]*\/>/, "")
    .replace(/\s(inkscape|sodipodi):[\w-]+="[^"]*"/g, "")
    .replace(ENDCARD_STYLE.logoGrey, ENDCARD_STYLE.teal);
}

function logoViewBox() {
  const size = HALF * (LOGO_VIEWBOX.outerRadius + LOGO_VIEWBOX.padding);
  return `${LOGO_VIEWBOX.cx - size / HALF} ${LOGO_VIEWBOX.cy - size / HALF} ${size} ${size}`;
}

function endcardHtml(endcard, culture, logo, fonts) {
  const e = ENDCARD_STYLE;
  const direction = cultureDirection(culture);
  return `<!doctype html><html lang="${escapeHtml(culture)}" dir="${direction}"><head><meta charset="utf-8">${fonts}<style>
html,body{margin:0;padding:0}body{width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;position:relative;overflow:hidden;background:${e.background};font-family:${CAPTION_STYLE.fontFamily}}
.bar{position:absolute;top:0;left:0;right:0;height:${e.topBarHeight}px;background:${e.topBarColor}}
.logo{position:absolute;top:${e.logoTop}px;left:50%;transform:translateX(-50%);width:${e.logoSize}px;height:${e.logoSize}px}
.line{position:absolute;left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap;max-width:${e.maxTextWidth}px}
.wordmark{top:${e.wordmarkTop}px;font-size:${e.wordmarkSize}px;font-weight:${e.wordmarkWeight};letter-spacing:${e.wordmarkLetterSpacing}px;color:${e.teal};line-height:1.1}
.tagline{top:${e.taglineTop}px;font-size:${e.taglineSize}px;font-weight:${e.taglineWeight};color:${e.textColor};line-height:1.3}
.pill{top:${e.pillTop}px;font-size:${e.pillSize}px;font-weight:${e.pillWeight};color:${e.textColor};background:${e.pillBackground};padding:${e.pillPadding};border-radius:999px;line-height:1.3}
.button{top:${e.buttonTop}px;font-size:${e.buttonSize}px;font-weight:${e.buttonWeight};color:${e.buttonColor};background:${e.buttonBackground};padding:${e.buttonPadding};border-radius:${e.buttonRadius}px;line-height:1.3}
</style></head><body>
<div class="bar"></div>
<svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="${logoViewBox()}">${logo}</svg>
<div class="line wordmark" dir="ltr">${e.wordmark}</div>
<div class="line tagline">${escapeHtml(endcard.tagline)}</div>
<div class="line pill">${escapeHtml(endcard.pill)}</div>
<div class="line button" dir="ltr">${escapeHtml(endcard.link)}</div>
</body></html>`;
}

export async function renderEndcard(outDir, endcard, culture) {
  const missing = ["tagline", "pill", "link"].filter((k) => !endcard?.[k]);
  if (missing.length > 0) throw new Error(`end card texts missing for ${culture}: ${missing.join(", ")}`);
  const logo = logoMarkup(await readFile(LOGO_SVG, "utf8"));
  const fonts = await fontsHead(FONT_MODE_INTER);
  return withPage((page) => shoot(page, endcardHtml(endcard, culture, logo, fonts), path.join(outDir, ENDCARD_FILE), false));
}
