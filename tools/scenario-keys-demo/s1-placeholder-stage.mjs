// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Stage definition of clip S1 v3 "Grossanlass mit vorläufigen Diensten und Platzhaltern", shared by the take (takes/scenario-placeholders-takes.mjs) and the probes
 * (probe-s1-placeholders.mjs, probe-s1-browser.mjs): the set of provisional shifts "Messe" (code name: key / scenario variant) of the group "Bern Objektschutz" for the fair days, its
 * shifts (sealed orders with the token of the set and the customer "Messe Nordring AG", seeded by seed-keys.mjs --without-keys), the shift typed into the shift form in the picture
 * (S1_FORM_SHIFT: the fair days 10.-13.12.2026 are Thursday to Sunday) and the placeholders created through the dialog "Platzhalter anlegen".
 * @param shift - one service of the key: name, abbreviation, start, end (HH:mm:ss), staffing per day
 * @param variant - the created key (id, token, name) as the API returned it
 * @param group - { id, name } of the group
 * @param customerId - id of the customer the sealed orders belong to
 */

import { SHIFT_TYPE_TASK, ALL_WEEKDAYS, weekdayFlags, minutesToWorkTime, timeToMinutes } from "../lib/klacks-demo-api.mjs";

const SHIFT_STATUS_SEALED_ORDER = 1;
const ORDERS_PER_DAY = 1;
const SPORADIC_SCOPE_NONE = 0;
const MINUTES_PER_DAY = 24 * 60;

export const S1_KEY = Object.freeze({
  name: "Messe",
  description: "Grossanlass Messe Nordring 10.-13.12., Zusage offen",
  customer: "Messe Nordring AG",
  from: "2026-12-10",
  until: "2026-12-13",
  search: "Messe",
  scenario: "Messe Nordring",
  shifts: Object.freeze([
    Object.freeze({ name: "Messe Einlass", abbreviation: "MEI", start: "08:00:00", end: "16:00:00", staffing: 10 }),
    Object.freeze({ name: "Messe Abend", abbreviation: "MAB", start: "15:00:00", end: "23:00:00", staffing: 10 }),
  ]),
});

export const S1_STAND_INS = Object.freeze({ count: 8, pattern: "Messe-Aushilfe {n}", qualifications: Object.freeze(["Eventschutz", "Zugangskontrolle"]) });

export const S1_FORM_SHIFT = Object.freeze({
  abbreviation: "MEI",
  customerSearch: "Messe Nordring",
  weekdayIds: Object.freeze(["isThursday", "isFriday", "isSaturday", "isSunday"]),
  weekdayFields: Object.freeze(["isThursday", "isFriday", "isSaturday", "isSunday"]),
});

function shiftMinutes(shift) {
  const minutes = timeToMinutes(shift.end) - timeToMinutes(shift.start);
  return minutes > 0 ? minutes : minutes + MINUTES_PER_DAY;
}

export function keyShiftBody(shift, variant, group, customerId) {
  return {
    name: shift.name,
    abbreviation: shift.abbreviation,
    description: variant.name,
    status: SHIFT_STATUS_SEALED_ORDER,
    shiftType: SHIFT_TYPE_TASK,
    fromDate: S1_KEY.from,
    untilDate: S1_KEY.until,
    startShift: shift.start,
    endShift: shift.end,
    workTime: minutesToWorkTime(shiftMinutes(shift)),
    quantity: ORDERS_PER_DAY,
    sumEmployees: shift.staffing,
    isTimeRange: false,
    isSporadic: false,
    sporadicScope: SPORADIC_SCOPE_NONE,
    clientId: customerId,
    cuttingAfterMidnight: timeToMinutes(shift.end) <= timeToMinutes(shift.start),
    isHoliday: false,
    isWeekdayAndHoliday: false,
    ...weekdayFlags(ALL_WEEKDAYS),
    groups: [{ id: group.id, name: group.name }],
    analyseToken: variant.token,
  };
}
