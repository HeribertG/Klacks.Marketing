// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Takes of the simple start page (spec 2026-10-15 section 7). simple-klacksy-call ("So rufst du Klacksy", about 15 s): the
 * cursor clicks the Klacksy symbol in the app header, the chat opens, one read-only question is typed and the first answer
 * is shown, with cue-based captions (lib/caption-overlay.mjs). It runs on the October schedule of the demo group and is
 * publishable only when exactly one turn answered without errors, without navigating away and without contact data, and
 * October still holds its 118 works unchanged. simple-plans-week reuses takeKlacksyPlansWeek of capture-app-videos.mjs;
 * this module only defines its cue names and its shorter final hold.
 * @param take - Take context (page, api, options, recorder, mouse, report, script, captions, viewport, scale)
 */

import * as S from "../lib/klacks-demo-session.mjs";
import { ScreenRecorder } from "../lib/screen-recorder.mjs";
import { SEL_ASSISTANT_INPUT, SKILL_ERROR_PREFIX, sendChatMessage } from "../lib/klacksy-chat.mjs";
import { HALF, monthFilter, openSchedule, sameSnapshot, snapshotOf } from "../lib/schedule-grid.mjs";
import { OCTOBER, OCTOBER_RANGE } from "../lib/scenario-demo.mjs";

export const VIDEO_SIMPLE_KLACKSY_CALL = "simple-klacksy-call";
export const VIDEO_SIMPLE_PLANS_WEEK = "simple-plans-week";
export const SIMPLE_VIDEOS = [VIDEO_SIMPLE_KLACKSY_CALL, VIDEO_SIMPLE_PLANS_WEEK];
export const SIMPLE_KLACKSY_CALL_CUES = { openChat: "openChat", prompt: "prompt", answer: "answer" };
export const SIMPLE_PLANS_WEEK_CUES = { request: "request", preview: "preview", accept: "accept" };
export const SIMPLE_PLANS_WEEK_FINAL_HOLD_MS = 4000;

const BEAT = { intro: 1200, finalHold: 2500 };
const MOVE_NORMAL_MS = 700;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
const PHONE_CANDIDATE_PATTERN = /\+?\d[\d /-]{7,}\d/g;
const NON_DIGIT_PATTERN = /\D/g;
const MIN_PHONE_DIGITS = 9;

export function containsContactData(text) {
  if (EMAIL_PATTERN.test(text)) return true;
  const withoutDates = String(text).replace(DATE_PATTERN, " ");
  return (withoutDates.match(PHONE_CANDIDATE_PATTERN) ?? [])
    .some((candidate) => candidate.replace(NON_DIGIT_PATTERN, "").length >= MIN_PHONE_DIGITS);
}

function fullViewportCrop(viewport, scale) {
  const even = (value) => {
    const px = Math.round(value * scale);
    return px - (px % HALF);
  };
  return { x: 0, y: 0, width: even(viewport.width), height: even(viewport.height) };
}

function turnFailure(turn) {
  if (!turn) return "Klacksy did not answer";
  if (turn.errors.length > 0) return `chat error: ${turn.errors.join("; ")}`;
  const failed = turn.results.find((r) => r.result.startsWith(SKILL_ERROR_PREFIX));
  if (failed) return `skill ${failed.name} failed: ${failed.result}`;
  if (turn.content.trim() === "") return "Klacksy gave no answer text";
  if (turn.navigateTo) return `Klacksy navigated to ${turn.navigateTo}`;
  if (containsContactData(turn.content)) return "the answer shows an e-mail address or a phone number";
  return null;
}

async function takeSimpleKlacksyCall(take) {
  const { page, api, options, recorder, mouse, report, script, captions, viewport, scale } = take;
  const messages = script?.messages ?? [];
  if (messages.length !== 1) throw new Error(`${VIDEO_SIMPLE_KLACKSY_CALL} needs exactly one message, got ${messages.length}`);
  if (!captions) throw new Error(`${VIDEO_SIMPLE_KLACKSY_CALL} needs captions`);
  const { filter } = await openSchedule(page, options);
  const octoberFilter = { ...filter, ...monthFilter(OCTOBER) };
  const octoberBefore = snapshotOf(await api.schedule(octoberFilter), OCTOBER_RANGE);
  if (octoberBefore.length !== OCTOBER_RANGE.expectedWorks) {
    throw new Error(`October has ${octoberBefore.length} works, expected ${OCTOBER_RANGE.expectedWorks} - refusing to record`);
  }
  const prompt = messages[0].text;
  report.turns = [];
  try {
    await recorder.start();
    await captions.show(SIMPLE_KLACKSY_CALL_CUES.openChat);
    await page.waitForTimeout(BEAT.intro);
    await mouse.clickLocator(page.locator(S.SEL_ASSISTANT_BUTTON), MOVE_NORMAL_MS);
    await page.locator(SEL_ASSISTANT_INPUT).waitFor({ state: "visible", timeout: S.READY_TIMEOUT_MS });
    await captions.show(SIMPLE_KLACKSY_CALL_CUES.prompt);
    const turn = await sendChatMessage(take, prompt, { afterAnswer: () => captions.show(SIMPLE_KLACKSY_CALL_CUES.answer) });
    report.turns.push({ prompt, sent: true, ...turn });
    report.posterAt = ScreenRecorder.now();
    await page.waitForTimeout(BEAT.finalHold);
  } finally {
    await recorder.stop({ posterAt: report.posterAt ?? null, crop: fullViewportCrop(viewport, scale) });
    report.failure = report.failure ?? turnFailure(report.turns[0]);
    report.publishable = report.failure === null;
    report.octoberUnchanged = sameSnapshot(octoberBefore, snapshotOf(await api.schedule(octoberFilter), OCTOBER_RANGE));
    if (!report.octoberUnchanged) throw new Error("October changed during the Klacksy call take - check the demo data!");
  }
}

export const SIMPLE_TAKE_RUNNERS = {
  [VIDEO_SIMPLE_KLACKSY_CALL]: takeSimpleKlacksyCall,
};
