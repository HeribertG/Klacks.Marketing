// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Seeds the open orders of the order review take (story video 3 "Neue Bestellungen"): the four full-day orders of Winterthur
 * customers defined in lib/order-review-demo.mjs, all with the same pattern (00:00-00:00, Monday to Sunday, 2-8 November 2026,
 * no group), so the review bundles them into one key. Runs only against the recording API (port 5011) whose database is a
 * klacks_marketing_* copy; the take seals the orders, so every take needs a fresh copy of the seeded database. Idempotent: an
 * order whose abbreviation already exists as an open order is kept. The self-check reads the orders back and fails unless every
 * defined order is open exactly once and none is sealed. The demo user's first name and user name must both be Sandra (the chat
 * greeting uses the user name, and Sandra is the planner of the story); there is no API to rename a user, so the seed only
 * checks them.
 * CLI: --api-url
 * Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL.
 */

import { parseArgs } from "node:util";
import { request as playwrightRequest } from "playwright-core";
import * as S from "./lib/klacks-demo-session.mjs";
import {
  KlacksApi,
  HTTP_GET,
  HTTP_POST,
  SHIFTS_PATH,
  SHIFT_TYPE_TASK,
  CLIENTS_PATH,
  WEEKDAY_FLAG_BY_NUMBER,
} from "./lib/klacks-demo-api.mjs";
import {
  FULL_DAY_HOURS,
  FULL_DAY_TIME,
  ORDERS,
  ORDER_FROM,
  ORDER_UNTIL,
  SHIFT_STATUS_OPEN_ORDER,
  orderStatusCounts,
} from "./lib/order-review-demo.mjs";

const FIND_CLIENT_PATH = `${CLIENTS_PATH}/FindClient`;
const FIND_CLIENT_ANY = encodeURIComponent(" ");
const RECORDING_API_PORT = ":5011";
const API_PREFIX = "/api/backend/";
const STORY_FIRST_NAME = "Sandra";
const GIVEN_NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname";
const USER_NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";

function tokenClaims(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

function log(message) {
  console.log(`[seed-order-review] ${message}`);
}

async function customerId(api, company) {
  const path = `${FIND_CLIENT_PATH}/${encodeURIComponent(company)}/${FIND_CLIENT_ANY}/${FIND_CLIENT_ANY}`;
  const candidates = (await api.call(HTTP_GET, path)) ?? [];
  const match = candidates.find((c) => (c.company ?? "").trim() === company);
  if (!match) throw new Error(`customer "${company}" not found`);
  return match.id;
}

function orderBody(order, clientId) {
  return {
    name: order.name,
    abbreviation: order.abbreviation,
    description: "",
    status: SHIFT_STATUS_OPEN_ORDER,
    shiftType: SHIFT_TYPE_TASK,
    fromDate: ORDER_FROM,
    untilDate: ORDER_UNTIL,
    startShift: FULL_DAY_TIME,
    endShift: FULL_DAY_TIME,
    workTime: FULL_DAY_HOURS,
    quantity: 1,
    sumEmployees: 1,
    isTimeRange: false,
    isSporadic: false,
    clientId,
    ...Object.fromEntries(Object.values(WEEKDAY_FLAG_BY_NUMBER).map((flag) => [flag, true])),
    groups: [],
  };
}

async function main() {
  const { values } = parseArgs({ options: { "api-url": { type: "string" } } });
  const options = S.readSessionOptions(values);
  if (!options.apiUrl.includes(RECORDING_API_PORT)) {
    throw new Error(`refusing ${options.apiUrl}: seed only the recording API (${RECORDING_API_PORT}) on a klacks_marketing_* copy`);
  }
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await S.apiLogin(context, options);
    const claims = tokenClaims(token);
    const firstName = claims[GIVEN_NAME_CLAIM];
    const userName = claims[USER_NAME_CLAIM];
    if (firstName !== STORY_FIRST_NAME || userName !== STORY_FIRST_NAME) {
      throw new Error(`the demo user is called "${firstName}" (user name "${userName}"), the greeting in the take must say ${STORY_FIRST_NAME}: set "AspNetUsers".first_name and user_name to '${STORY_FIRST_NAME}' (normalized_user_name upper case) in the klacks_marketing_* copy, restart the API and run again`);
    }
    const api = new KlacksApi(context, options.apiUrl, token);
    const post = (apiPath, data) => api.call(HTTP_POST, apiPath.replace(API_PREFIX, ""), { data });
    const before = await orderStatusCounts(post);
    for (const order of ORDERS) {
      if (before[order.abbreviation].open > 0) {
        log(`kept ${order.abbreviation}`);
        continue;
      }
      const created = await api.call(HTTP_POST, SHIFTS_PATH, { data: orderBody(order, await customerId(api, order.company)) });
      log(`created ${order.abbreviation} ${created?.id}`);
    }
    const after = await orderStatusCounts(post);
    const problems = Object.entries(after)
      .filter(([, c]) => c.open !== 1 || c.sealed !== 0)
      .map(([abbreviation, c]) => `${abbreviation}: ${c.open} open, ${c.sealed} sealed`);
    if (problems.length > 0) throw new Error(problems.join("; "));
    log(`ok: ${ORDERS.length} open orders`);
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
