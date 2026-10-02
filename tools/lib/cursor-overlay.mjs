// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Visible mouse cursor for headless recordings: an init script draws a pointer-events:none arrow that follows
 * real mouse events plus a click ripple, and HumanMouse moves Playwright's mouse along eased paths whose
 * duration is wall-clock based (slow machines get fewer steps, not slower motion).
 * @param page - Playwright page the mouse belongs to
 * @param start - initial cursor position in CSS pixels
 * @param guard - optional DevOverlayGuard; every mouse step throws its violation so a take with a dev-server error overlay aborts
 */

const CURSOR_ID = "capture-cursor";
const RIPPLE_CLASS = "capture-cursor-ripple";
export const CURSOR_SIZE_PX = 26;
const RIPPLE_SIZE_PX = 44;
const RIPPLE_DURATION_MS = 520;
const CURSOR_Z_INDEX = 2147483647;
const PRESSED_SCALE = 0.86;

const CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_SIZE_PX}" height="${CURSOR_SIZE_PX}" viewBox="0 0 24 24">`
  + `<path d="M3 2 L3 19 L7.6 14.8 L10.6 21.6 L13.6 20.3 L10.7 13.6 L17 13.6 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const CURSOR_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(CURSOR_SVG)}`;

function installCursor(cfg) {
  const install = () => {
    if (document.getElementById(cfg.id)) return;
    const style = document.createElement("style");
    style.textContent = `
      #${cfg.id} { position: fixed; left: 0; top: 0; width: ${cfg.size}px; height: ${cfg.size}px; pointer-events: none;
        background: url("${cfg.image}") no-repeat 0 0 / contain;
        z-index: ${cfg.z}; filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); transform-origin: 0 0; will-change: transform; }
      .${cfg.ripple} { position: fixed; left: 0; top: 0; width: ${cfg.rippleSize}px; height: ${cfg.rippleSize}px;
        margin: -${cfg.rippleSize / 2}px 0 0 -${cfg.rippleSize / 2}px;
        border-radius: 50%; border: 3px solid rgba(255, 170, 0, .95); background: rgba(255, 190, 40, .28);
        pointer-events: none; z-index: ${cfg.z - 1};
        animation: ${cfg.ripple}-grow ${cfg.rippleMs}ms ease-out forwards !important; }
      @keyframes ${cfg.ripple}-grow { from { transform: scale(.25); opacity: 1; } to { transform: scale(1.1); opacity: 0; } }`;
    document.head.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = cfg.id;
    document.documentElement.appendChild(cursor);
    const state = { x: cfg.start.x, y: cfg.start.y, pressed: false };
    const render = () => {
      cursor.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.pressed ? cfg.pressedScale : 1})`;
    };
    const ripple = (x, y) => {
      const dot = document.createElement("div");
      dot.className = cfg.ripple;
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      document.documentElement.appendChild(dot);
      setTimeout(() => dot.remove(), cfg.rippleMs);
    };
    const onMove = (e) => { state.x = e.clientX; state.y = e.clientY; render(); };
    for (const type of ["mousemove", "pointermove", "dragover"]) window.addEventListener(type, onMove, true);
    window.addEventListener("mousedown", (e) => { state.pressed = true; onMove(e); ripple(e.clientX, e.clientY); }, true);
    window.addEventListener("mouseup", (e) => { state.pressed = false; onMove(e); }, true);
    render();
  };
  if (document.head) install();
  else document.addEventListener("DOMContentLoaded", install);
}

export function cursorInitScript(start) {
  return {
    fn: installCursor,
    arg: {
      id: CURSOR_ID,
      ripple: RIPPLE_CLASS,
      size: CURSOR_SIZE_PX,
      rippleSize: RIPPLE_SIZE_PX,
      rippleMs: RIPPLE_DURATION_MS,
      z: CURSOR_Z_INDEX,
      pressedScale: PRESSED_SCALE,
      image: CURSOR_DATA_URL,
      start,
    },
  };
}

const MOVE_STEP_MS = 16;
const DEFAULT_MOVE_MS = 700;
const CLICK_HOLD_MS = 90;
const DRAG_PRESS_HOLD_MS = 350;
const DRAG_RELEASE_HOLD_MS = 150;
const THROTTLE_SAFE_MS = 60;
const NUDGE_PX = 1;
const SAME_POINT_PX = 2;
const HALF = 2;
const RIGHT_BUTTON = "right";

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

export class HumanMouse {
  constructor(page, start, guard = null) {
    this.page = page;
    this.guard = guard;
    this.x = start.x;
    this.y = start.y;
  }

  async moveTo(target, durationMs = DEFAULT_MOVE_MS) {
    const from = { x: this.x, y: this.y };
    const startedAt = Date.now();
    for (;;) {
      this.guard?.throwIfViolated();
      const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
      const k = easeInOut(progress);
      this.x = from.x + (target.x - from.x) * k;
      this.y = from.y + (target.y - from.y) * k;
      await this.page.mouse.move(this.x, this.y);
      if (progress >= 1) return;
      await this.page.waitForTimeout(MOVE_STEP_MS);
    }
  }

  async click(target, durationMs = DEFAULT_MOVE_MS) {
    await this.moveTo(target, durationMs);
    await this.page.mouse.down();
    await this.page.waitForTimeout(CLICK_HOLD_MS);
    await this.page.mouse.up();
  }

  async rightClick(target, durationMs = DEFAULT_MOVE_MS) {
    await this.moveTo(target, durationMs);
    await this.page.mouse.down({ button: RIGHT_BUTTON });
    await this.page.waitForTimeout(CLICK_HOLD_MS);
    await this.page.mouse.up({ button: RIGHT_BUTTON });
  }

  async doubleClick(target, durationMs = DEFAULT_MOVE_MS) {
    await this.moveTo(target, durationMs);
    await this.page.mouse.dblclick(target.x, target.y, { delay: CLICK_HOLD_MS });
  }

  async clickLocator(locator, durationMs = DEFAULT_MOVE_MS) {
    const box = await locator.boundingBox();
    if (!box) throw new Error("clickLocator: element has no bounding box");
    await this.click({ x: box.x + box.width / HALF, y: box.y + box.height / HALF }, durationMs);
  }

  async settleAt(point) {
    await this.page.waitForTimeout(THROTTLE_SAFE_MS);
    await this.page.mouse.move(point.x, point.y + NUDGE_PX);
    await this.page.waitForTimeout(THROTTLE_SAFE_MS);
    await this.page.mouse.move(point.x, point.y);
  }

  async drag(from, to, durationMs = DEFAULT_MOVE_MS * HALF) {
    if (Math.hypot(from.x - this.x, from.y - this.y) > SAME_POINT_PX) await this.moveTo(from);
    await this.page.mouse.down();
    await this.page.waitForTimeout(DRAG_PRESS_HOLD_MS);
    await this.moveTo(to, durationMs);
    await this.settleAt(to);
    await this.page.waitForTimeout(DRAG_RELEASE_HOLD_MS);
    await this.page.mouse.up();
  }
}
