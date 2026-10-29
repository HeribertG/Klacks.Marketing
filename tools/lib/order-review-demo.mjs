// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared definition of the order review demo (story video 3 "Neue Bestellungen"): the four full-day open orders that
 * seed-order-review-demo.mjs creates and the take simple-order-review goes through with Klacksy, plus the read-back of the
 * orders by abbreviation and status (shift status 0 = open order, 1 = sealed order).
 * @param post - async (apiPath, body) => parsed JSON; lets the seed (KlacksApi) and the take (ScheduleApi) share the read-back
 */

export const SHIFT_STATUS_OPEN_ORDER = 0;
export const SHIFT_STATUS_SEALED_ORDER = 1;
export const ORDER_FROM = "2026-11-02";
export const ORDER_UNTIL = "2026-11-08";
export const FULL_DAY_TIME = "00:00:00";
export const FULL_DAY_HOURS = 24;

export const ORDERS = Object.freeze([
  Object.freeze({ name: "Rund um die Uhr Tannenblick", abbreviation: "RTB", company: "Tannenblick Immobilien AG" }),
  Object.freeze({ name: "Rund um die Uhr Rabenstein", abbreviation: "RRS", company: "Rabenstein Metallbau GmbH" }),
  Object.freeze({ name: "Rund um die Uhr Eulenbach", abbreviation: "REB", company: "Eulenbach Verlag GmbH" }),
  Object.freeze({ name: "Rund um die Uhr Lindenhof", abbreviation: "RLH", company: "Lindenhof Treuhand AG" }),
]);

const SHIFT_LIST_API = "/api/backend/Shifts/GetSimpleList";
const LIST_PAGE_SIZE = 100;

function listFilter(abbreviation, sealed) {
  return {
    searchString: abbreviation,
    activeDateRange: true,
    formerDateRange: true,
    futureDateRange: true,
    includeClientName: false,
    isSealedOrder: sealed,
    isTimeRange: true,
    isSporadic: true,
    numberOfItemsPerPage: LIST_PAGE_SIZE,
    requiredPage: 0,
    orderBy: "",
    sortOrder: "",
  };
}

export async function ordersWithStatus(post, abbreviation, status) {
  const result = await post(SHIFT_LIST_API, listFilter(abbreviation, status === SHIFT_STATUS_SEALED_ORDER));
  return (result?.shifts ?? []).filter((s) => s.abbreviation === abbreviation && s.status === status);
}

export async function orderStatusCounts(post) {
  const counts = {};
  for (const order of ORDERS) {
    counts[order.abbreviation] = {
      open: (await ordersWithStatus(post, order.abbreviation, SHIFT_STATUS_OPEN_ORDER)).length,
      sealed: (await ordersWithStatus(post, order.abbreviation, SHIFT_STATUS_SEALED_ORDER)).length,
    };
  }
  return counts;
}
