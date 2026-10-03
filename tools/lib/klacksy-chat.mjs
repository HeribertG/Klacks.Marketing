// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Drives the Klacksy chat panel of the Klacks app inside a recorded take: types a prompt like a person, sends it,
 * time-compresses the LLM wait (badge visible) and parses the server-sent events of the turn into calls, results,
 * answer text, navigation target and errors.
 * @param take - Take context with page, recorder (ScreenRecorder) and mouse (HumanMouse)
 * @param text - Prompt typed into the chat input
 */

export const SEL_ASSISTANT_INPUT = "#assistant-chat-input";
export const SEL_ASSISTANT_SEND = "#assistant-chat-send-btn";
export const SEL_ASSISTANT_CLOSE = "#aside-close-btn";

const CHAT_STREAM_PART = "/assistant/chat/stream";
const SSE_CONTENT = "content";
const SSE_FUNCTION_CALL = "function_call";
const SSE_FUNCTION_RESULT = "function_result";
const SSE_METADATA = "metadata";
const SSE_ERROR = "error";
const RESULT_PREVIEW_CHARS = 600;

export const CHAT_TURN_TIMEOUT_MS = 6 * 60 * 1000;
const STABLE_POLL_MS = 150;
const STABLE_MAX_CHECKS = 40;
const TYPE_DELAY_MS = 55;
const LLM_FAST_FACTOR = 12;
const READ_ANSWER_MS = 3500;
const MOVE_NORMAL_MS = 600;
const MOVE_SHORT_MS = 400;

export const SKILL_ERROR_PREFIX = "Error:";

export function parseSse(text) {
  const turn = { calls: [], results: [], content: "", navigateTo: null, errors: [] };
  for (const block of text.split("\n\n")) {
    const event = (block.match(/^event: (.*)$/m) ?? [])[1];
    const raw = (block.match(/^data: ([\s\S]*)$/m) ?? [])[1];
    if (!event || !raw) continue;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    if (event === SSE_CONTENT) turn.content += data.text ?? "";
    else if (event === SSE_FUNCTION_CALL) turn.calls.push({ name: data.functionName, parameters: data.parameters });
    else if (event === SSE_FUNCTION_RESULT) turn.results.push({ name: data.functionName, result: String(data.functionResult ?? "").slice(0, RESULT_PREVIEW_CHARS) });
    else if (event === SSE_METADATA && data.navigateTo) turn.navigateTo = data.navigateTo;
    else if (event === SSE_ERROR) turn.errors.push(data.errorMessage);
  }
  return turn;
}

export async function waitStable(locator) {
  let previous = null;
  for (let attempt = 0; attempt < STABLE_MAX_CHECKS; attempt++) {
    const box = await locator.boundingBox();
    if (box && previous && Math.abs(box.x - previous.x) < 1 && Math.abs(box.y - previous.y) < 1) return;
    previous = box;
    await locator.page().waitForTimeout(STABLE_POLL_MS);
  }
  throw new Error("element never came to rest");
}

export async function sendChatMessage(take, text) {
  const { page, recorder, mouse } = take;
  const input = page.locator(SEL_ASSISTANT_INPUT);
  await waitStable(input);
  await mouse.clickLocator(input, MOVE_NORMAL_MS);
  await input.pressSequentially(text, { delay: TYPE_DELAY_MS });
  const typed = await input.inputValue();
  if (typed !== text) throw new Error(`chat input holds "${typed}" instead of the prompt`);
  const finished = page.waitForEvent("requestfinished", {
    predicate: (r) => r.url().includes(CHAT_STREAM_PART),
    timeout: CHAT_TURN_TIMEOUT_MS,
  });
  await mouse.clickLocator(page.locator(SEL_ASSISTANT_SEND), MOVE_SHORT_MS);
  await recorder.beginFast(LLM_FAST_FACTOR);
  const request = await finished;
  await recorder.endFast();
  const response = await request.response();
  const body = response ? await response.text().catch(() => "") : "";
  await page.waitForTimeout(READ_ANSWER_MS);
  return { ...parseSse(body), requestBody: request.postDataJSON() };
}
