import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imagesDir = path.join(projectRoot, "wwwroot", "images");
const logoSvgPath = path.join(imagesDir, "klacks-logo.svg");

async function renderIconPng(size) {
  const logoSvg = await readFile(logoSvgPath, "utf8");
  const composite = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#ffffff" />
      <g transform="translate(${size * 0.1}, ${size * 0.1}) scale(${(size * 0.8) / 210})">
        ${extractInner(logoSvg)}
      </g>
    </svg>`;
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

async function renderOgImage() {
  const width = 1200;
  const height = 630;
  const logoSize = 150;
  const logoTop = 55;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#141b2c" />
      <circle cx="${width - 120}" cy="80" r="260" fill="#0853ce" opacity="0.15" />
      <g transform="translate(${width / 2 - logoSize / 2}, ${logoTop}) scale(${logoSize / 210})">
        ${extractInner(await readFile(logoSvgPath, "utf8")).replace("#808080", "#e5e2e1").replace("#2890CE", "#85f8c4")}
      </g>
      <text x="${width / 2}" y="370" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="72" fill="#ffffff" letter-spacing="-2">Klacks</text>
      <text x="${width / 2}" y="425" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="30" fill="#e5e2e1">Personaleinsatzplanung, die Ihnen gehört</text>
      <text x="${width / 2}" y="480" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="20" letter-spacing="2" fill="#85f8c4">OPEN SOURCE &#183; ON-PREMISE &#183; SCHWEIZER DATENSCHUTZ</text>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  await mkdir(imagesDir, { recursive: true });

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

  const ogImage = await renderOgImage();
  await writeFile(path.join(imagesDir, "og-image.png"), ogImage);

  console.log("Generated: favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, og-image.png");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
