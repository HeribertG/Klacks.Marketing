// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * On-screen captions for recorded takes, drawn as a DOM overlay like the fast-forward badge of ScreenRecorder (no ffmpeg
 * text rendering, so every script and font of the app works). Captions are keyed by cue names that the take triggers at
 * its story steps, never by wall-clock offsets: LLM and wizard waits are time-compressed or cut and their real duration
 * varies. The caption sits in the inline-start bottom corner beside the Klacksy side panel (450 px at the inline end),
 * takes the text direction of the culture (dir attribute, so RTL mirrors it), ignores the pointer, stacks below cursor and
 * badge and is redrawn after full page navigations. Every show/hide is logged with ScreenRecorder timestamps;
 * captionVisibility() turns the log into seconds of the encoded video using the encoder's own output clock.
 * @param page - Playwright page of the take
 * @param track - cue -> caption text of one video and culture (tools/simple-videos.<culture>.json, "<video>".captions)
 * @param options - dir ("ltr" | "rtl", from the culture metadata), avoidSelectors (elements the caption must never cover)
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ScreenRecorder } from "./screen-recorder.mjs";
import { outputClock } from "./video-encoder.mjs";

export const CAPTION_ID = "capture-caption";
export const CAPTION_Z_INDEX = 2147483645;
export const MIN_VISIBLE_SECONDS = 1.8;
export const MAX_CAPTION_CHARS = 42;
export const DIRECTION_LTR = "ltr";
export const DIRECTION_RTL = "rtl";
export const FORBIDDEN_CAPTION_PHRASES = ["klacksy plant", "klacksy rechnet", "ganz rechts", "gratis", "ein satz genügt"];
export const captionFileName = (culture) => `simple-videos.${culture.toLowerCase()}.json`;

const DIRECTIONS = [DIRECTION_LTR, DIRECTION_RTL];
const ASIDE_WIDTH_PX = 450;
const EDGE_PX = 24;
const BOTTOM_PX = 32;
const SECONDS_DECIMALS = 2;
const NAVIGATION_EVENT = "domcontentloaded";

export async function loadCaptionTracks(toolsDir, culture) {
  const raw = await readFile(path.join(toolsDir, captionFileName(culture)), "utf8").catch(() => null);
  return raw === null ? null : JSON.parse(raw);
}

export function captionTrackOf(tracks, video) {
  return tracks?.[video]?.captions ?? null;
}

export function validateCaptionTrack(video, track, cues) {
  if (!track) return [`${video}: no captions`];
  const problems = [];
  for (const cue of cues) {
    if (typeof track[cue] !== "string" || track[cue].trim() === "") problems.push(`${video}: cue "${cue}" has no text`);
  }
  for (const [cue, text] of Object.entries(track)) {
    if (!cues.includes(cue)) problems.push(`${video}: unknown cue "${cue}"`);
    const value = String(text);
    if (value.length > MAX_CAPTION_CHARS) problems.push(`${video}: cue "${cue}" has ${value.length} characters (max ${MAX_CAPTION_CHARS})`);
    const lower = value.toLowerCase();
    for (const phrase of FORBIDDEN_CAPTION_PHRASES) {
      if (lower.includes(phrase)) problems.push(`${video}: cue "${cue}" contains the forbidden phrase "${phrase}"`);
    }
  }
  return problems;
}

export function captionVisibility(manifest, events) {
  const clock = outputClock(manifest);
  const startT = manifest.trimFrom ?? manifest.startedAt;
  const endT = manifest.trimTo ?? manifest.stoppedAt;
  const origin = clock(startT);
  return events.map((event) => {
    const from = Math.min(Math.max(event.shownAt, startT), endT);
    const to = Math.min(event.hiddenAt ?? endT, endT);
    const seconds = to > from ? clock(to) - clock(from) : 0;
    return {
      cue: event.cue,
      text: event.text,
      fromSeconds: Number((clock(from) - origin).toFixed(SECONDS_DECIMALS)),
      seconds: Number(seconds.toFixed(SECONDS_DECIMALS)),
    };
  });
}

export function captionProblems(visibility, overlaps, cues) {
  const problems = [];
  for (const cue of cues) {
    if (!visibility.some((v) => v.cue === cue)) problems.push(`caption "${cue}" was never shown`);
  }
  for (const v of visibility) {
    if (v.seconds < MIN_VISIBLE_SECONDS) problems.push(`caption "${v.cue}" is visible for ${v.seconds} s only (minimum ${MIN_VISIBLE_SECONDS} s)`);
  }
  for (const o of overlaps) problems.push(`caption "${o.cue}" covers ${o.selector}`);
  return problems;
}

function drawCaption({ id, text, dir, z, asideWidth, edge, bottom, avoid }) {
  const el = document.getElementById(id) ?? document.createElement("div");
  el.id = id;
  el.setAttribute("dir", dir);
  el.setAttribute("aria-hidden", "true");
  el.textContent = text;
  el.style.cssText = `position:fixed;bottom:${bottom}px;inset-inline-start:${edge}px;`
    + `max-width:calc(100vw - ${asideWidth + 2 * edge}px);z-index:${z};pointer-events:none;box-sizing:border-box;`
    + "padding:10px 18px;border-radius:12px;background:rgba(20,20,20,.82);color:#fff;text-align:start;"
    + "font:600 22px/1.3 system-ui,'Segoe UI',sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);";
  if (el.parentNode !== document.documentElement) document.documentElement.appendChild(el);
  const box = el.getBoundingClientRect();
  const covers = (r) => r.width > 0 && r.height > 0
    && box.left < r.right && box.right > r.left && box.top < r.bottom && box.bottom > r.top;
  return avoid.filter((selector) => {
    const target = document.querySelector(selector);
    return target !== null && covers(target.getBoundingClientRect());
  });
}

export class CaptionOverlay {
  constructor(page, track, { dir = DIRECTION_LTR, avoidSelectors = [] } = {}) {
    if (!DIRECTIONS.includes(dir)) throw new Error(`caption direction must be "${DIRECTION_LTR}" or "${DIRECTION_RTL}", got "${dir}"`);
    this.page = page;
    this.track = track;
    this.dir = dir;
    this.avoidSelectors = avoidSelectors;
    this.current = null;
    this.events = [];
    this.overlaps = [];
    this.onNavigation = () => { this.render().catch(() => {}); };
    page.on(NAVIGATION_EVENT, this.onNavigation);
  }

  async show(cue) {
    const text = this.track[cue];
    if (typeof text !== "string") throw new Error(`no caption text for cue "${cue}"`);
    this.close();
    this.current = { cue, text, shownAt: ScreenRecorder.now(), hiddenAt: null };
    this.events.push(this.current);
    await this.render();
  }

  async hide() {
    this.close();
    await this.page.evaluate((id) => document.getElementById(id)?.remove(), CAPTION_ID).catch(() => {});
  }

  async render() {
    if (!this.current) return;
    const { cue, text } = this.current;
    const covered = await this.page.evaluate(drawCaption, {
      id: CAPTION_ID,
      text,
      dir: this.dir,
      z: CAPTION_Z_INDEX,
      asideWidth: ASIDE_WIDTH_PX,
      edge: EDGE_PX,
      bottom: BOTTOM_PX,
      avoid: this.avoidSelectors,
    }).catch(() => []);
    for (const selector of covered) {
      if (!this.overlaps.some((o) => o.cue === cue && o.selector === selector)) this.overlaps.push({ cue, selector });
    }
  }

  close() {
    if (!this.current) return;
    this.current.hiddenAt = ScreenRecorder.now();
    this.current = null;
  }

  dispose() {
    this.close();
    this.page.off(NAVIGATION_EVENT, this.onNavigation);
  }
}
