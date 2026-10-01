// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * ngb-modal helpers shared by the video takes. ngb modals slide in; element boxes measured during the animation are
 * off by up to 50 px, so clicks into a dialog wait until it has come to rest.
 * @param page - Playwright page that shows the modal
 */

import * as S from "./klacks-demo-session.mjs";

export const SEL_MODAL = "ngb-modal-window";
export const SEL_MODAL_DIALOG = `${SEL_MODAL} .modal-dialog`;
const MODAL_POLL_MS = 100;
const MODAL_MAX_CHECKS = 40;
const MODAL_REST_TOLERANCE_PX = 1;

export async function waitModalAtRest(page) {
  const dialog = page.locator(SEL_MODAL_DIALOG).first();
  await dialog.waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
  let previous = null;
  for (let check = 0; check < MODAL_MAX_CHECKS; check++) {
    const box = await dialog.boundingBox();
    if (box && previous && Math.abs(box.y - previous.y) < MODAL_REST_TOLERANCE_PX
      && Math.abs(box.height - previous.height) < MODAL_REST_TOLERANCE_PX) return;
    previous = box;
    await page.waitForTimeout(MODAL_POLL_MS);
  }
  throw new Error("modal never came to rest");
}
