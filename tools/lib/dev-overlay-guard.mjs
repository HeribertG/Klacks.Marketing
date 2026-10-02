// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards a recorded Playwright page against the dev-server error overlay (Vite/Angular custom element
 * <vite-error-overlay>, "Click outside, press Esc key, or fix the code to dismiss."), which must never end up in a published
 * video. A MutationObserver init script remembers an overlay even if it is dismissed again before the next poll; a poll
 * interval inspects the live DOM. The first sighting becomes a violation: checkpoints (mouse moves, recorder start/fast-forward,
 * the end of the take) throw it, so the take is aborted and marked as not publishable. Cleanup code is never interrupted
 * because the guard only throws from explicit checkpoints, never from inside the page or from recorder.stop().
 * @param page - Playwright page to watch
 * @param options - pollMs (poll interval), selectors (overlay element names)
 */

export const DEV_OVERLAY_SELECTORS = ["vite-error-overlay"];
export const DEV_OVERLAY_POLL_MS = 400;
const SEEN_FLAG = "__klacksDevOverlaySeen";
const MESSAGE_MAX_CHARS = 300;

export class DevOverlayViolationError extends Error {
  constructor(stage, finding) {
    super(`dev-server error overlay <${finding.selector}> detected (${stage}): "${finding.text}" - take is not publishable`);
    this.name = "DevOverlayViolationError";
    this.stage = stage;
    this.finding = finding;
  }
}

export function devOverlayInitScript(selectors = DEV_OVERLAY_SELECTORS) {
  return {
    fn: ({ names, flag, maxChars }) => {
      const wanted = new Set(names.map((n) => n.toUpperCase()));
      const describe = (el) => {
        const root = el.shadowRoot;
        const body = root?.querySelector(".window") ?? root?.querySelector(".message") ?? el;
        return String(body.innerText || body.textContent || "").replace(/\s+/g, " ").trim().slice(0, maxChars);
      };
      const remember = (el) => {
        if (window[flag]) return;
        window[flag] = { selector: el.tagName.toLowerCase(), text: describe(el) };
      };
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && wanted.has(node.tagName)) remember(node);
          }
        }
      }).observe(document, { childList: true, subtree: true });
    },
    arg: { names: selectors, flag: SEEN_FLAG, maxChars: MESSAGE_MAX_CHARS },
  };
}

export async function inspectDevOverlay(page, selectors = DEV_OVERLAY_SELECTORS) {
  return page.evaluate(({ names, flag, maxChars }) => {
    const describe = (el) => {
      const root = el.shadowRoot;
      const body = root?.querySelector(".window") ?? root?.querySelector(".message") ?? el;
      return String(body.innerText || body.textContent || "").replace(/\s+/g, " ").trim().slice(0, maxChars);
    };
    for (const name of names) {
      const el = document.querySelector(name);
      if (el) return { selector: name, text: describe(el) };
    }
    return window[flag] ?? null;
  }, { names: selectors, flag: SEEN_FLAG, maxChars: MESSAGE_MAX_CHARS });
}

export class DevOverlayGuard {
  constructor(page, { pollMs = DEV_OVERLAY_POLL_MS, selectors = DEV_OVERLAY_SELECTORS } = {}) {
    this.page = page;
    this.pollMs = pollMs;
    this.selectors = selectors;
    this.violation = null;
    this.timer = null;
    this.polling = false;
  }

  static initScript() {
    return devOverlayInitScript();
  }

  async inspect(stage) {
    if (this.violation) return this.violation;
    const finding = await inspectDevOverlay(this.page, this.selectors).catch(() => null);
    if (finding) this.violation = new DevOverlayViolationError(stage, finding);
    return this.violation;
  }

  async assertClean(stage) {
    const violation = await this.inspect(stage);
    if (violation) throw violation;
  }

  throwIfViolated() {
    if (this.violation) throw this.violation;
  }

  startWatching() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.polling || this.violation) return;
      this.polling = true;
      this.inspect("during the take").finally(() => { this.polling = false; });
    }, this.pollMs);
    this.timer.unref?.();
  }

  stopWatching() {
    clearInterval(this.timer);
    this.timer = null;
  }
}
