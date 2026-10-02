import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright-core";
import pngToIco from "png-to-ico";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imagesDir = path.join(projectRoot, "wwwroot", "images");
const logoSvgPath = path.join(imagesDir, "klacks-logo.svg");

const LOGO_RING = { cx: 105, cy: 148.5, outerRadius: 130 };
const ICON_PADDING = 8;
const ICON_CROP_SIZE = 2 * (LOGO_RING.outerRadius + ICON_PADDING);
const ICON_VIEWBOX = `${LOGO_RING.cx - ICON_CROP_SIZE / 2} ${LOGO_RING.cy - ICON_CROP_SIZE / 2} ${ICON_CROP_SIZE} ${ICON_CROP_SIZE}`;

async function renderIconPng(size) {
  const logoSvg = await readFile(logoSvgPath, "utf8");
  const composite = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#ffffff" />
      <svg x="0" y="0" width="${size}" height="${size}" viewBox="${ICON_VIEWBOX}">
        ${extractInner(logoSvg)}
      </svg>
    </svg>`;
  const { default: sharp } = await import("sharp");
  return sharp(Buffer.from(composite)).png().toBuffer();
}

function extractInner(svgSource) {
  const match = svgSource.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!match) {
    throw new Error("Could not parse klacks-logo.svg");
  }
  return match[1]
    .replace(/<sodipodi:namedview[\s\S]*?\/>/, "")
    .replace(/<defs[^>]*\/>/, "")
    .replace(/\s(inkscape|sodipodi):[\w-]+="[^"]*"/g, "");
}

const OG = {
  width: 1200,
  height: 630,
  logoSize: 150,
  logoTop: 55,
  wordmarkTop: 300,
  wordmarkSize: 72,
  taglineTop: 395,
  taglineMaxSize: 30,
  taglineMinSize: 22,
  taglineMaxLines: 2,
  taglineLineHeight: 1.3,
  badgeGap: 28,
  badgeMaxSize: 20,
  badgeMinSize: 14,
  badgeLetterSpacing: 2,
  maxTextWidth: 1040,
  background: "#0F1E1F",
  glowColor: "#0E6E6B",
  glowOpacity: 0.15,
  glowCenterX: 1080,
  glowCenterY: 80,
  glowRadius: 260,
  logoGrey: "#808080",
  logoGreyOnDark: "#e5e2e1",
  logoTeal: "#0E6E6B",
  logoTealOnDark: "#2FA39E",
  wordmarkColor: "#ffffff",
  taglineColor: "#e5e2e1",
  badgeColor: "#F2A516",
};

const OG_FONT_STACK = '"Inter", "Segoe UI", "Noto Sans", Tahoma, Arial, sans-serif';
const OG_FONT_STACKS = {
  ar: '"Segoe UI", "Noto Sans Arabic", Tahoma, Arial, sans-serif',
  he: '"Segoe UI", "Noto Sans Hebrew", Tahoma, Arial, sans-serif',
  th: '"Leelawadee UI", "Noto Sans Thai", Tahoma, sans-serif',
  ja: '"Yu Gothic UI", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", sans-serif',
  ko: '"Malgun Gothic", "Noto Sans CJK KR", sans-serif',
  "zh-CN": '"Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
  "zh-TW": '"Microsoft JhengHei UI", "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif',
};
const RTL_CULTURES = new Set(["ar", "he"]);
const CASELESS_CULTURES = new Set(["ar", "he", "th", "ja", "ko", "zh-CN", "zh-TW"]);
const DEFAULT_OG_CULTURE = "de";
const CONTENT_DIR = path.join(projectRoot, "Localization", "Content");
const TITLE_KEY = "pageTitle";
const BADGE_KEY = "hero.badge";
const TITLE_PREFIX = /^Klacks\s*\|\s*/;
const CULTURES_OPTION = "--cultures";
const OG_ONLY_OPTION = "--og-only";
const HTML_ENTITIES = {
  middot: "·",
  amp: "&",
  mdash: "—",
  ndash: "–",
  nbsp: " ",
  quot: '"',
  lt: "<",
  gt: ">",
  apos: "'",
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return HTML_ENTITIES[body.toLowerCase()] ?? match;
  });
}

function ogFileName(culture) {
  return `og-image-${culture.toLowerCase()}.png`;
}

async function readOgTexts(culture) {
  const content = JSON.parse(await readFile(path.join(CONTENT_DIR, culture, "index.json"), "utf8"));
  const title = decodeEntities(content[TITLE_KEY] ?? "");
  const badge = decodeEntities(content[BADGE_KEY] ?? "");
  if (!TITLE_PREFIX.test(title) || !badge) {
    throw new Error(`${culture}: index.json lacks a usable "${TITLE_KEY}" or "${BADGE_KEY}"`);
  }
  return { tagline: title.replace(TITLE_PREFIX, ""), badge };
}

function readRequestedCultures(available) {
  const index = process.argv.indexOf(CULTURES_OPTION);
  if (index < 0) {
    return available;
  }
  const requested = (process.argv[index + 1] ?? "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
  const selected = available.filter((c) => requested.includes(c.toLowerCase()));
  if (selected.length !== requested.length) {
    throw new Error(`Unknown culture in ${CULTURES_OPTION}: ${requested.join(",")}`);
  }
  return selected;
}

async function buildOgPageHtml() {
  const logoMarkup = extractInner(await readFile(logoSvgPath, "utf8"))
    .replace(OG.logoGrey, OG.logoGreyOnDark)
    .replace(OG.logoTeal, OG.logoTealOnDark);
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; }
  body { width: ${OG.width}px; height: ${OG.height}px; position: relative; overflow: hidden; background: ${OG.background}; }
  svg { position: absolute; left: 0; top: 0; }
  .line { position: absolute; left: 50%; transform: translateX(-50%); text-align: center; box-sizing: border-box; }
  #wordmark { top: ${OG.wordmarkTop}px; font-weight: 900; font-size: ${OG.wordmarkSize}px; line-height: 1.1; letter-spacing: -2px; color: ${OG.wordmarkColor}; white-space: nowrap; }
  #tagline { top: ${OG.taglineTop}px; width: ${OG.maxTextWidth}px; font-weight: 600; line-height: ${OG.taglineLineHeight}; color: ${OG.taglineColor}; }
  #badge { width: ${OG.maxTextWidth}px; font-weight: 700; line-height: 1.3; color: ${OG.badgeColor}; }
  .caseless #badge { letter-spacing: 0 !important; }
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" width="${OG.width}" height="${OG.height}" viewBox="0 0 ${OG.width} ${OG.height}">
  <circle cx="${OG.glowCenterX}" cy="${OG.glowCenterY}" r="${OG.glowRadius}" fill="${OG.glowColor}" opacity="${OG.glowOpacity}" />
  <g transform="translate(${OG.width / 2 - OG.logoSize / 2}, ${OG.logoTop}) scale(${OG.logoSize / 210})">${logoMarkup}</g>
</svg>
<div class="line" id="wordmark">Klacks</div>
<div class="line" id="tagline"></div>
<div class="line" id="badge"></div>
</body></html>`;
}

function applyOgTexts({ culture, tagline, badge, fontStack, isRtl, isCaseless, config }) {
  document.documentElement.lang = culture;
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.body.style.fontFamily = fontStack;
  document.body.classList.toggle("caseless", isCaseless);
  const taglineEl = document.getElementById("tagline");
  const badgeEl = document.getElementById("badge");
  const wordmarkEl = document.getElementById("wordmark");
  wordmarkEl.dir = "ltr";
  wordmarkEl.style.fontFamily = config.wordmarkFontStack;
  taglineEl.textContent = tagline;
  badgeEl.textContent = badge;
  badgeEl.style.textTransform = isCaseless ? "none" : "uppercase";
  badgeEl.style.letterSpacing = `${config.badgeLetterSpacing}px`;

  const fitsOneLine = (el) => el.scrollWidth <= config.maxTextWidth;
  const lineCount = (el, size) => Math.round(el.getBoundingClientRect().height / (size * config.taglineLineHeight));

  taglineEl.style.whiteSpace = "nowrap";
  let size = config.taglineMaxSize;
  taglineEl.style.fontSize = `${size}px`;
  while (!fitsOneLine(taglineEl) && size > config.taglineMinSize) {
    size -= 1;
    taglineEl.style.fontSize = `${size}px`;
  }
  if (!fitsOneLine(taglineEl)) {
    taglineEl.style.whiteSpace = "normal";
    taglineEl.style.textWrap = "balance";
    size = config.taglineMaxSize;
    taglineEl.style.fontSize = `${size}px`;
    while (lineCount(taglineEl, size) > config.taglineMaxLines && size > config.taglineMinSize) {
      size -= 1;
      taglineEl.style.fontSize = `${size}px`;
    }
  }

  badgeEl.style.whiteSpace = "nowrap";
  let badgeSize = config.badgeMaxSize;
  badgeEl.style.fontSize = `${badgeSize}px`;
  while (!fitsOneLine(badgeEl) && badgeSize > config.badgeMinSize) {
    badgeSize -= 1;
    badgeEl.style.fontSize = `${badgeSize}px`;
  }
  badgeEl.style.top = `${config.taglineTop + taglineEl.getBoundingClientRect().height + config.badgeGap}px`;

  return {
    taglineFontSize: size,
    taglineLines: lineCount(taglineEl, size),
    taglineOverflow: taglineEl.scrollWidth > config.maxTextWidth,
    badgeFontSize: badgeSize,
    badgeOverflow: badgeEl.scrollWidth > config.maxTextWidth,
    badgeBottom: badgeEl.getBoundingClientRect().bottom,
  };
}

async function renderOgImages(cultures) {
  const html = await buildOgPageHtml();
  const browser = await chromium.launch();
  const written = [];
  try {
    const page = await browser.newPage({ viewport: { width: OG.width, height: OG.height } });
    await page.setContent(html);
    for (const culture of cultures) {
      const { tagline, badge } = await readOgTexts(culture);
      const metrics = await page.evaluate(applyOgTexts, {
        culture,
        tagline,
        badge,
        fontStack: OG_FONT_STACKS[culture] ?? OG_FONT_STACK,
        isRtl: RTL_CULTURES.has(culture),
        isCaseless: CASELESS_CULTURES.has(culture),
        config: { ...OG, wordmarkFontStack: OG_FONT_STACK },
      });
      await page.evaluate(() => document.fonts.ready);
      if (metrics.taglineOverflow || metrics.badgeOverflow || metrics.badgeBottom > OG.height) {
        throw new Error(`${culture}: text does not fit the OG image ${JSON.stringify(metrics)}`);
      }
      const png = await page.screenshot({ type: "png" });
      await writeFile(path.join(imagesDir, ogFileName(culture)), png);
      if (culture === DEFAULT_OG_CULTURE) {
        await writeFile(path.join(imagesDir, "og-image.png"), png);
        written.push("og-image.png");
      }
      written.push(ogFileName(culture));
      console.log(`${culture}: tagline ${metrics.taglineFontSize}px x${metrics.taglineLines}, badge ${metrics.badgeFontSize}px`);
    }
  } finally {
    await browser.close();
  }
  return written;
}

async function writeIcons() {
  const png16 = await renderIconPng(16);
  const png32 = await renderIconPng(32);
  const png180 = await renderIconPng(180);

  await writeFile(path.join(imagesDir, "favicon-16x16.png"), png16);
  await writeFile(path.join(imagesDir, "favicon-32x32.png"), png32);
  await writeFile(path.join(imagesDir, "apple-touch-icon.png"), png180);

  const ico = await pngToIco([
    path.join(imagesDir, "favicon-16x16.png"),
    path.join(imagesDir, "favicon-32x32.png"),
  ]);
  await writeFile(path.join(projectRoot, "wwwroot", "favicon.ico"), ico);
}

async function main() {
  await mkdir(imagesDir, { recursive: true });

  const generated = [];
  if (!process.argv.includes(OG_ONLY_OPTION)) {
    await writeIcons();
    generated.push("favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png");
  }

  const available = (await readdir(CONTENT_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const ogFiles = await renderOgImages(readRequestedCultures(available));

  console.log(`Generated: ${[...generated, ...ogFiles].join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
