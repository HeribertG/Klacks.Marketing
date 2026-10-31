// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Legibility helpers of the story builder for the app take: static covers (chat time stamps, panel rows) and timed pan/zoom
 * windows that are cued to caption cues of the take (sidecar <take>.cues.json, written by capture-app-videos.mjs). The zoom runs
 * on the take before it is inset; because the caption pill is burned into the take pixels, its box is cropped from the unzoomed
 * take and laid back at the same position while it is visible, so the caption stays sharp and at its place. A zoom whose rectangle
 * would cover a visible caption pill is rejected. Everything is validated up front and throws, nothing is guessed.
 * @param zooms - recipe export ZOOMS: [{ cue, delayMs, holdMs, rect: { x, y, w?, h? }, occurrence? }] in take pixels; the zoom starts
 *        delayMs after the cue first shown (occurrence-th time), takes 0.4 s to go in, stands for holdMs at full zoom and takes 0.4 s out;
 *        w and h default to half of the frame (2x), a rectangle off 16:9 is widened to 16:9, one outside the frame is shifted inside
 * @param covers - recipe export COVERS: [{ rect: { x, y, w, h }, color, windows? }] in take pixels, drawn before the zoom;
 *        windows is "panel" (while the chat panel is open) or [[fromSeconds, untilSeconds], ...], default the whole take
 * @param sidecar - parsed <take>.cues.json: viewport, cues[{ cue, fromSeconds, endSeconds, box }]
 * @param geometry - width, height, seconds of the take as it is read by the builder
 */

export const MAX_ZOOMS = 3;
export const ZOOM_RAMP_SECONDS = 0.4;
export const DEFAULT_ZOOM_FACTOR = 2;

const DECIMALS = 3;
const MS_PER_SECOND = 1000;
const ASPECT_TOLERANCE = 0.005;
const COLOR_PATTERN = /^(0x[0-9a-fA-F]{6}|#[0-9a-fA-F]{6}|[a-z]+)$/;
const PANEL_WINDOWS = "panel";

const num = (value) => String(Number(value.toFixed(DECIMALS)));
const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

function fail(message) {
  throw new Error(`take detail: ${message}`);
}

function fitRect(raw, { width, height }, label) {
  if (!raw || !isNumber(raw.x) || !isNumber(raw.y)) fail(`${label}: rect needs numeric x and y`);
  let w = raw.w ?? width / DEFAULT_ZOOM_FACTOR;
  let h = raw.h ?? height / DEFAULT_ZOOM_FACTOR;
  if (!isNumber(w) || !isNumber(h) || w <= 0 || h <= 0) fail(`${label}: rect w and h must be positive numbers`);
  const rawW = w;
  const rawH = h;
  const aspect = width / height;
  if (Math.abs(w / h - aspect) > ASPECT_TOLERANCE * aspect) {
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
  }
  if (w >= width) fail(`${label}: rect is as wide as the frame, that is no zoom`);
  const centreX = raw.x + rawW / 2;
  const centreY = raw.y + rawH / 2;
  const x = Math.min(Math.max(centreX - w / 2, 0), width - w);
  const y = Math.min(Math.max(centreY - h / 2, 0), height - h);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

function cueSeconds(sidecar, cue, occurrence, label) {
  const shown = (sidecar.cues ?? []).filter((c) => c.cue === cue);
  if (shown.length === 0) fail(`${label}: cue "${cue}" is not in the cue sidecar (known: ${[...new Set((sidecar.cues ?? []).map((c) => c.cue))].join(", ") || "none"})`);
  if (!Number.isInteger(occurrence) || occurrence < 0 || occurrence >= shown.length) fail(`${label}: cue "${cue}" was shown ${shown.length} time(s), occurrence ${occurrence} does not exist`);
  return shown[occurrence].fromSeconds;
}

function pillBoxes(sidecar, geometry, label) {
  if (!sidecar.viewport || !isNumber(sidecar.viewport.width)) fail(`${label}: the cue sidecar has no viewport`);
  if (sidecar.viewport.width !== geometry.width) fail(`${label}: take is ${geometry.width} px wide but was recorded at ${sidecar.viewport.width} px; zoom rectangles and caption boxes would not match`);
  return sidecar.cues.map((c) => ({ cue: c.cue, from: c.fromSeconds, until: c.endSeconds, box: c.box }));
}

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function planZooms(zooms, sidecar, geometry) {
  if (!Array.isArray(zooms)) fail("ZOOMS must be an array");
  if (zooms.length > MAX_ZOOMS) fail(`${zooms.length} zooms, at most ${MAX_ZOOMS} per take`);
  if (zooms.length === 0) return null;
  if (!sidecar) fail("ZOOMS need the cue sidecar of the take (<take>.cues.json or --cues); record the take again or write it");
  const pills = pillBoxes(sidecar, geometry, "cue sidecar");
  const plans = zooms.map((z, index) => {
    const label = `ZOOMS[${index}] (${z?.cue})`;
    if (typeof z?.cue !== "string" || z.cue === "") fail(`${label}: cue must be a caption cue name`);
    if (!isNumber(z.delayMs) || z.delayMs < 0) fail(`${label}: delayMs must be a number >= 0`);
    if (!isNumber(z.holdMs) || z.holdMs <= 0) fail(`${label}: holdMs must be a number > 0`);
    const rect = fitRect(z.rect, geometry, label);
    const t0 = cueSeconds(sidecar, z.cue, z.occurrence ?? 0, label) + z.delayMs / MS_PER_SECOND;
    const t1 = t0 + ZOOM_RAMP_SECONDS;
    const t2 = t1 + z.holdMs / MS_PER_SECOND;
    const t3 = t2 + ZOOM_RAMP_SECONDS;
    if (t3 > geometry.seconds) fail(`${label}: the zoom would end at ${num(t3)} s but the take is ${num(geometry.seconds)} s long`);
    return { label, cue: z.cue, rect, t0, t1, t2, t3 };
  }).sort((a, b) => a.t0 - b.t0);
  plans.forEach((p, i) => {
    if (i > 0 && p.t0 < plans[i - 1].t3) fail(`${p.label}: overlaps ${plans[i - 1].label} (${num(p.t0)} s starts before ${num(plans[i - 1].t3)} s)`);
  });
  const overlays = [];
  for (const plan of plans) {
    for (const pill of pills.filter((p) => p.from < plan.t3 && p.until > plan.t0)) {
      if (!pill.box) fail(`${plan.label}: caption "${pill.cue}" is visible during the zoom but its box was not measured`);
      const box = { x: Math.floor(pill.box.x), y: Math.floor(pill.box.y), w: Math.ceil(pill.box.x + pill.box.width) - Math.floor(pill.box.x), h: Math.ceil(pill.box.y + pill.box.height) - Math.floor(pill.box.y) };
      const standing = pill.from < plan.t2 && pill.until > plan.t1;
      if (standing && overlaps(plan.rect, box)) fail(`${plan.label}: the zoom rectangle covers the caption "${pill.cue}" (${box.x},${box.y} ${box.w}x${box.h}); move the rectangle or the zoom`);
      overlays.push({ box, from: Math.max(pill.from, plan.t0), until: Math.min(pill.until, plan.t3) });
    }
  }
  return { zooms: plans, overlays, width: geometry.width, height: geometry.height };
}

function smooth(at) {
  const u = `clip((t-${num(at)})/${ZOOM_RAMP_SECONDS},0,1)`;
  return `pow(${u},2)*(3-2*${u})`;
}

function mix(plans, base, value) {
  const terms = plans.map((p) => `(${smooth(p.t0)}-${smooth(p.t2)})*(${num(value(p))}-${num(base)})`);
  return `(${num(base)}+${terms.join("+")})`;
}

export function zoomedTakeGraph(filter, plan) {
  const { width, height, zooms: plans } = plan;
  const widthMix = mix(plans, width, (p) => p.rect.w);
  const xMix = mix(plans, 0, (p) => p.rect.x);
  const yMix = mix(plans, 0, (p) => p.rect.y);
  const scaledW = `2*ceil(${width}*${width}/${widthMix}/2)`;
  const scaledH = `2*ceil(${height}*${width}/${widthMix}/2)`;
  const zoom = `scale=w='${scaledW}':h='${scaledH}':eval=frame:flags=lanczos,crop=${width}:${height}:x='${xMix}*(${scaledW})/${width}':y='${yMix}*(${scaledH})/${height}'`;
  const count = plan.overlays.length;
  if (count === 0) return `[0:v]${filter},${zoom}[t]`;
  const branches = plan.overlays.map((_, i) => `[u${i}]`).join("");
  const graph = [`[0:v]${filter},split=${count + 1}[z]${branches}`, `[z]${zoom}[z0]`];
  plan.overlays.forEach((o, i) => {
    graph.push(`[u${i}]crop=${o.box.w}:${o.box.h}:${o.box.x}:${o.box.y}[c${i}]`);
    graph.push(`[z${i}][c${i}]overlay=${o.box.x}:${o.box.y}:enable='between(t,${num(o.from)},${num(o.until)})'[${i === count - 1 ? "t" : `z${i + 1}`}]`);
  });
  return graph.join(";");
}

function coverWindow(cover, index, panelIntervals) {
  if (cover.windows === undefined) return "";
  const intervals = cover.windows === PANEL_WINDOWS ? panelIntervals : cover.windows;
  if (!Array.isArray(intervals) || intervals.length === 0) fail(`COVERS[${index}]: windows must be "${PANEL_WINDOWS}" or a list of [from, until] seconds`);
  for (const w of intervals) if (!Array.isArray(w) || w.length !== 2 || !isNumber(w[0]) || !isNumber(w[1]) || w[1] <= w[0]) fail(`COVERS[${index}]: invalid window ${JSON.stringify(w)}`);
  return `:enable='${intervals.map(([from, until]) => `between(t,${num(from)},${num(until)})`).join("+")}'`;
}

export function coverFilters(covers, { width, height, panelIntervals }) {
  if (!Array.isArray(covers)) fail("COVERS must be an array");
  return covers.map((cover, index) => {
    const r = cover?.rect;
    if (!r || ![r.x, r.y, r.w, r.h].every(isNumber) || r.w <= 0 || r.h <= 0) fail(`COVERS[${index}]: rect needs numeric x, y, w, h`);
    if (r.x < 0 || r.y < 0 || r.x + r.w > width || r.y + r.h > height) fail(`COVERS[${index}]: rect lies outside the ${width}x${height} frame`);
    if (typeof cover.color !== "string" || !COLOR_PATTERN.test(cover.color)) fail(`COVERS[${index}]: colour "${cover.color}" is not an ffmpeg colour name or 0xRRGGBB`);
    return `drawbox=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}:color=${cover.color}:t=fill${coverWindow(cover, index, panelIntervals)}`;
  });
}
