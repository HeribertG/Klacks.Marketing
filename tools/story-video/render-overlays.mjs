// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Renders the transparent 1280x720 caption overlays and the opaque end card of the story video with Playwright/Chromium.
 * Standard layout: Inter embedded from wwwroot/fonts as data URIs (one face per subset, variable weight), per-culture font stack
 * for the scripts Inter lacks (ar, he, ja, ko, zh, th), right-to-left cultures with the bar on the right, captions of at most two
 * lines (the font shrinks to fit), and the story captions of the take scene opaque at the place of the in-app caption so that
 * never two captions are visible together. Exact layout: the old placement and the font link that Chromium ignores over file://
 * (Arial), only to rebuild the live German cut bit for bit. After every render the fonts that really drew the glyphs are read
 * back through the DevTools protocol (CSS.getPlatformFontsForNode), so Arial can never pass as Inter.
 * @param outDir - directory that receives <key>.png per caption and the end card PNG
 * @param captions - caption texts keyed k1..k4, x1, y1, y2 (from captions.<culture>.json)
 * @param endcard - end card texts { tagline, pill, link }
 * @param culture - culture code, sets lang and the text direction
 * @param options - { layout, settings (renderSettings of the profile), cover (box of the in-app caption in story-frame pixels) }
 */

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderSettings } from "./culture-profile.mjs";
import {
  CAPTION_FIT,
  CAPTION_KEYS,
  CAPTION_STYLE,
  DIR_RTL,
  ENDCARD_STYLE,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  LAYOUT_EXACT,
  LAYOUT_STANDARD,
  LOGO_VIEWBOX,
  MAX_CAPTION_WIDTH,
  TAKE_CAPTION,
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
const FONT_FACE_PATTERN = /@font-face\s*{[^}]*}/g;
const INTER_FAMILY = "'Inter'";
const FONT_URL_PATTERN = /url\(([^)]+\.woff2)\)/;
const UNICODE_RANGE_PATTERN = /unicode-range:\s*([^;]+);/;
const WOFF2_MIME = "font/woff2";
const BASE64 = "base64";
const INTER_WEIGHTS = "100 900";
const ENDCARD_MIN_FONT_FRACTION = 0.6;
let interFaceCss = null;

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

async function inlineInterFaces() {
  if (interFaceCss) return interFaceCss;
  const css = await readFile(FONTS_CSS, "utf8");
  const bySubset = new Map();
  for (const face of css.match(FONT_FACE_PATTERN) ?? []) {
    if (!face.includes(INTER_FAMILY)) continue;
    const url = face.match(FONT_URL_PATTERN);
    const range = face.match(UNICODE_RANGE_PATTERN);
    if (!url || !range || bySubset.has(url[1])) continue;
    const data = await readFile(path.resolve(path.dirname(FONTS_CSS), url[1]));
    bySubset.set(url[1], `@font-face{font-family:'Inter';font-style:normal;font-weight:${INTER_WEIGHTS};src:url(data:${WOFF2_MIME};${BASE64},${data.toString(BASE64)}) format('woff2');unicode-range:${range[1].trim()}}`);
  }
  if (bySubset.size === 0) throw new Error(`no Inter faces in ${FONTS_CSS}`);
  interFaceCss = `<style>${[...bySubset.values()].join("")}</style>`;
  return interFaceCss;
}

async function fontsHead(layout) {
  if (layout === LAYOUT_EXACT) return `<link rel="stylesheet" href="${pathToFileURL(FONTS_CSS).href}">`;
  return inlineInterFaces();
}

function baseCss(fontFamily) {
  return `html,body{margin:0;background:transparent}body{width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;position:relative;font-family:${fontFamily}}`;
}

function exactCaptionCss(bottom, direction) {
  const s = CAPTION_STYLE;
  const p = s.padding;
  const padding = direction === DIR_RTL
    ? `${p.top}px ${p.bar}px ${p.bottom}px ${p.inner}px`
    : `${p.top}px ${p.inner}px ${p.bottom}px ${p.bar}px`;
  const bar = direction === DIR_RTL ? "border-right" : "border-left";
  return `<style>${baseCss(s.fontFamily)}.cap{position:absolute;left:50%;bottom:${bottom}px;transform:translateX(-50%);width:max-content;max-width:${MAX_CAPTION_WIDTH}px;box-sizing:border-box;padding:${padding};background:${s.background};color:${s.color};font-weight:${s.fontWeight};font-size:${s.fontSize}px;line-height:${s.lineHeight};border-radius:${s.radius}px;${bar}:${s.barWidth}px solid ${s.barColor};text-align:center}</style>`;
}

function standardCaptionCss(placement, direction, settings) {
  const s = CAPTION_STYLE;
  const p = s.padding;
  const padding = direction === DIR_RTL
    ? `${p.top}px ${p.bar}px ${p.bottom}px ${p.inner}px`
    : `${p.top}px ${p.inner}px ${p.bottom}px ${p.bar}px`;
  const bar = direction === DIR_RTL ? "border-right" : "border-left";
  const common = `box-sizing:border-box;padding:${padding};color:${s.color};font-weight:${s.fontWeight};font-size:${s.fontSize}px;line-height:${settings.lineHeight};border-radius:${s.radius}px;${bar}:${s.barWidth}px solid ${s.barColor};text-align:center;display:flex;align-items:center;justify-content:center;text-wrap:balance;`;
  const place = placement.cover
    ? `${placement.cover.rtl ? "right" : "left"}:${placement.cover.edge}px;bottom:${placement.cover.bottom}px;min-width:${placement.cover.width}px;min-height:${placement.cover.height}px;width:max-content;max-width:${TAKE_CAPTION.maxWidth}px;background:${s.coverBackground};`
    : `left:50%;bottom:${placement.bottom}px;transform:translateX(-50%);width:max-content;max-width:${MAX_CAPTION_WIDTH}px;background:${s.background};`;
  return `<style>${baseCss(settings.fontFamily)}.cap{position:absolute;${place}${common}}</style>`;
}

function captionBottom(key) {
  return CAPTION_KEYS.take.includes(key) ? CAPTION_STYLE.bottomTake : CAPTION_STYLE.bottomRaw;
}

function coverPlacement(cover, direction) {
  const rtl = direction === DIR_RTL;
  return {
    rtl,
    edge: rtl ? FRAME_WIDTH - 1 - cover.right : cover.left,
    bottom: FRAME_HEIGHT - 1 - cover.bottom,
    width: cover.right - cover.left + 1,
    height: cover.bottom - cover.top + 1,
  };
}

function captionHtml(key, text, culture, fonts, options) {
  const direction = cultureDirection(culture);
  const body = `<div class="cap" dir="${direction}" lang="${escapeHtml(culture)}"><span>${escapeHtml(text)}</span></div>`;
  if (options.layout === LAYOUT_EXACT) {
    return `${fonts}${exactCaptionCss(captionBottom(key), direction)}<div class="cap" dir="${direction}" lang="${escapeHtml(culture)}">${escapeHtml(text)}</div>`;
  }
  const useCover = TAKE_CAPTION.cueKeys.includes(key) && options.cover;
  const placement = useCover ? { cover: coverPlacement(options.cover, direction) } : { bottom: captionBottom(key) };
  return `${fonts}${standardCaptionCss(placement, direction, options.settings)}${body}`;
}

async function withPage(work) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: FRAME_WIDTH, height: FRAME_HEIGHT } });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    await client.send("DOM.enable");
    await client.send("CSS.enable");
    return await work(page, client);
  } finally {
    await browser.close();
  }
}

async function platformFonts(client, selector) {
  const { root } = await client.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  if (!nodeId) return [];
  const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId });
  return fonts.map((f) => ({ family: f.familyName, custom: f.isCustomFont, glyphs: f.glyphCount }));
}

function fitCaption({ maxLines, minFontSize, fontStep, shrinkWrapSlack }) {
  const SHRINK_WRAP_SLACK_PX = shrinkWrapSlack;
  const span = document.querySelector(".cap span");
  const cap = document.querySelector(".cap");
  const linesOf = () => Math.round(span.getBoundingClientRect().height / parseFloat(getComputedStyle(span).lineHeight));
  let size = parseFloat(getComputedStyle(cap).fontSize);
  while (linesOf() > maxLines && size - fontStep >= minFontSize) {
    size -= fontStep;
    cap.style.fontSize = `${size}px`;
  }
  const lines = linesOf();
  if (lines > 1) {
    const range = document.createRange();
    range.selectNodeContents(span);
    const widest = Math.max(...[...range.getClientRects()].map((r) => r.width));
    const style = getComputedStyle(cap);
    const frame = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    cap.style.width = `${Math.ceil(widest + frame) + SHRINK_WRAP_SLACK_PX}px`;
  }
  return { fontSize: size, lines: linesOf() };
}

function fitEndcard(minFraction) {
  const results = [];
  for (const el of document.querySelectorAll(".line")) {
    const start = parseFloat(getComputedStyle(el).fontSize);
    let size = start;
    while (el.scrollWidth > el.clientWidth && size > start * minFraction) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
    results.push({ line: el.className, fontSize: size, from: start, fits: el.scrollWidth <= el.clientWidth });
  }
  return results;
}

async function prepare(page, html) {
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
}

async function shoot(page, html, file, transparent) {
  await prepare(page, html);
  await page.screenshot({ path: file, omitBackground: transparent });
  return file;
}

function fontProblems(label, fonts, interRequired) {
  const problems = [];
  const custom = fonts.filter((f) => f.custom).reduce((n, f) => n + f.glyphs, 0);
  const system = fonts.filter((f) => !f.custom).reduce((n, f) => n + f.glyphs, 0);
  if (interRequired && system > 0) problems.push(`${label}: ${system} glyph(s) not drawn in Inter (${fonts.filter((f) => !f.custom).map((f) => f.family).join(", ")})`);
  if (custom === 0 && interRequired) problems.push(`${label}: no glyph drawn in Inter`);
  return problems;
}

export async function renderCaptions(outDir, captions, culture, options = {}) {
  const layout = options.layout ?? LAYOUT_STANDARD;
  const settings = options.settings ?? renderSettings(null);
  const keys = [...CAPTION_KEYS.raw, ...CAPTION_KEYS.schedule, ...CAPTION_KEYS.take];
  const missing = keys.filter((k) => !captions[k]);
  if (missing.length > 0) throw new Error(`captions missing for ${culture}: ${missing.join(", ")}`);
  const fonts = await fontsHead(layout);
  return withPage(async (page, client) => {
    const files = {};
    const report = [];
    const problems = [];
    for (const key of keys) {
      const file = path.join(outDir, `${key}${PNG}`);
      const html = captionHtml(key, captions[key], culture, fonts, { layout, settings, cover: options.cover });
      files[key] = file;
      if (layout === LAYOUT_EXACT) {
        await shoot(page, html, file, true);
        const legacy = await platformFonts(client, ".cap");
        report.push({ key, fontSize: CAPTION_STYLE.fontSize, lines: "-", fonts: legacy.map((f) => `${f.family}${f.custom ? "*" : ""}:${f.glyphs}`).join(" ") });
        continue;
      }
      await prepare(page, html);
      const fit = await page.evaluate(fitCaption, CAPTION_FIT);
      await page.screenshot({ path: file, omitBackground: true });
      const used = await platformFonts(client, ".cap span");
      report.push({ key, fontSize: fit.fontSize, lines: fit.lines, fonts: used.map((f) => `${f.family}${f.custom ? "*" : ""}:${f.glyphs}`).join(" ") });
      problems.push(...fontProblems(key, used, settings.interRequired));
      if (fit.lines > CAPTION_FIT.maxLines) problems.push(`${key}: ${fit.lines} lines at ${fit.fontSize}px (max ${CAPTION_FIT.maxLines}): shorten the caption`);
    }
    return { files, report, problems };
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

function endcardHtml(endcard, culture, logo, fonts, fontFamily) {
  const e = ENDCARD_STYLE;
  const direction = cultureDirection(culture);
  return `<!doctype html><html lang="${escapeHtml(culture)}" dir="${direction}"><head><meta charset="utf-8">${fonts}<style>
html,body{margin:0;padding:0}body{width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;position:relative;overflow:hidden;background:${e.background};font-family:${fontFamily}}
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

export async function renderEndcard(outDir, endcard, culture, options = {}) {
  const layout = options.layout ?? LAYOUT_STANDARD;
  const settings = options.settings ?? renderSettings(null);
  const missing = ["tagline", "pill", "link"].filter((k) => !endcard?.[k]);
  if (missing.length > 0) throw new Error(`end card texts missing for ${culture}: ${missing.join(", ")}`);
  const logo = logoMarkup(await readFile(LOGO_SVG, "utf8"));
  const fonts = await inlineInterFaces();
  const fontFamily = layout === LAYOUT_EXACT ? CAPTION_STYLE.fontFamily : settings.fontFamily;
  return withPage(async (page, client) => {
    const file = await shoot(page, endcardHtml(endcard, culture, logo, fonts, fontFamily), path.join(outDir, ENDCARD_FILE), false);
    const fits = await page.evaluate(fitEndcard, ENDCARD_MIN_FONT_FRACTION);
    if (fits.some((f) => f.fontSize !== f.from)) await page.screenshot({ path: file });
    const problems = [];
    const report = [];
    for (const selector of [".tagline", ".pill"]) {
      const used = await platformFonts(client, selector);
      report.push({ line: selector, fonts: used.map((f) => `${f.family}${f.custom ? "*" : ""}:${f.glyphs}`).join(" ") });
      problems.push(...fontProblems(`endcard ${selector}`, used, settings.interRequired));
    }
    for (const f of fits.filter((x) => !x.fits)) problems.push(`endcard ${f.line} still wider than ${ENDCARD_STYLE.maxTextWidth}px at ${f.fontSize}px: shorten the text`);
    return { file, report, problems, fits: fits.filter((f) => f.fontSize !== f.from) };
  });
}
