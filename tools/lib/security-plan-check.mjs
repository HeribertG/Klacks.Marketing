// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure evaluation of a December plan of the security demo: coverage from the wizard summary, hours per person against the contract, weekly hours, rest, runs
 * of consecutive days, and whether vacation and planning commands held. Also picks the on-call roster of the Biel stages. No I/O.
 * @param data - response of Works/Schedule (entries, clients)
 * @param site - entry of SITES in lib/security-demo.mjs
 * @param memberIds - team key -> client id, from the server
 */

import { CONTRACTS, COMMAND_FREE, COMMAND_NIGHT, COMMAND_NO_NIGHT, HOLIDAYS, ORDERS, PERIOD, addDays, datesBetween, isoWeekOf, plannableParts } from "./security-demo.mjs";

const ENTRY_TYPE_WORK = 0;
export const ENTRY_TYPE_BREAK = 3;
export const ENTRY_TYPE_COMMAND = 5;
const ISO_DATE_LENGTH = 10;
const HOURS_PER_DAY = 24;
const NIGHT_START_HOUR = 23;
const REST_MINIMUM_HOURS = 11;
const WEEK_HOURS_LEGAL_LOOKING_LIMIT = 50;

const dayOf = (entry) => String(entry.entryDate).slice(0, ISO_DATE_LENGTH);

function hoursOf(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours + minutes / 60;
}

function spanOf(entry) {
  const start = hoursOf(entry.startTime);
  const end = hoursOf(entry.endTime);
  const length = end > start ? end - start : end - start + HOURS_PER_DAY;
  return { start, end, length, crossesMidnight: end <= start };
}

const worksOf = (data, clientId) => data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_WORK && entry.clientId === clientId && dayOf(entry) >= PERIOD.from && dayOf(entry) <= PERIOD.until);
const breaksOf = (data, clientId) => data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_BREAK && entry.clientId === clientId);
const isNightPart = (entry) => hoursOf(entry.startTime) >= NIGHT_START_HOUR;

function weekTotals(works) {
  const weeks = {};
  for (const work of works) {
    const week = isoWeekOf(dayOf(work));
    weeks[week] = (weeks[week] ?? 0) + spanOf(work).length;
  }
  return weeks;
}

function restViolations(works) {
  const sorted = [...works].sort((a, b) => dayOf(a).localeCompare(dayOf(b)) || hoursOf(a.startTime) - hoursOf(b.startTime));
  const violations = [];
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const previousSpan = spanOf(previous);
    const gapDays = Math.round((Date.parse(dayOf(current)) - Date.parse(dayOf(previous))) / 86400000);
    const rest = gapDays * HOURS_PER_DAY + hoursOf(current.startTime) - (previousSpan.start + previousSpan.length);
    if (rest < REST_MINIMUM_HOURS) violations.push(`${dayOf(previous)}->${dayOf(current)} ${rest}h`);
  }
  return violations;
}

function longestRun(works) {
  const days = [...new Set(works.map(dayOf))].sort();
  let longest = 0;
  let run = 0;
  let previous = null;
  for (const day of days) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  return longest;
}

function commandFindings(data, site, memberIds) {
  const findings = [];
  for (const command of site.commands) {
    const works = worksOf(data, memberIds[command.key]);
    const sameDay = works.filter((work) => dayOf(work) === command.day);
    const nightBefore = works.filter((work) => dayOf(work) === addDays(command.day, -1) && spanOf(work).crossesMidnight);
    let held = true;
    if (command.keyword === COMMAND_FREE) held = sameDay.length === 0 && nightBefore.length === 0;
    if (command.keyword === COMMAND_NO_NIGHT) held = sameDay.every((work) => !isNightPart(work));
    if (command.keyword === COMMAND_NIGHT) held = sameDay.every(isNightPart);
    if (!held) findings.push(`${command.key} ${command.keyword} ${command.day}: ${sameDay.map((work) => `${work.startTime}-${work.endTime}`).join(",") || "night before"}`);
  }
  return findings;
}

function vacationFindings(data, site, memberIds) {
  const findings = [];
  const cover = {};
  for (const vacation of site.vacations) {
    const clientId = memberIds[vacation.key];
    const breakDays = new Set(breaksOf(data, clientId).map(dayOf));
    const days = datesBetween(vacation.from, vacation.until > PERIOD.until ? PERIOD.until : vacation.until);
    const missing = days.filter((day) => !breakDays.has(day));
    const worked = worksOf(data, clientId).filter((work) => days.includes(dayOf(work)) || (days.includes(addDays(dayOf(work), 1)) && spanOf(work).crossesMidnight));
    cover[vacation.key] = { days: days.length, breaks: days.length - missing.length, workInside: worked.length };
    if (missing.length > 0) findings.push(`${vacation.key}: no booking on ${missing.join(",")}`);
    if (worked.length > 0) findings.push(`${vacation.key}: work inside the vacation on ${worked.map(dayOf).join(",")}`);
  }
  return { findings, cover };
}

/** Lists every slot of the expanded demand without a work of the team, as "day abbreviation"; the wizard summary only counts them. */
function openSlots(data, site, memberIds) {
  const teamIds = new Set(site.team.map((member) => memberIds[member.key]));
  const works = data.entries.filter((entry) => entry.entryType === ENTRY_TYPE_WORK && teamIds.has(entry.clientId));
  const open = [];
  for (const order of ORDERS) {
    for (const day of datesBetween(PERIOD.from, PERIOD.until)) {
      const active = (order.onHolidays && HOLIDAYS.includes(day)) || order.weekdays.includes(new Date(`${day}T00:00:00Z`).getUTCDay());
      if (!active) continue;
      for (const part of plannableParts(order)) {
        if (!works.some((work) => dayOf(work) === day && work.startTime === part.start && work.endTime === part.end)) open.push(`${day} ${part.abbreviation}`);
      }
    }
  }
  return open;
}

/** Reads the facts the report needs out of the finished wizard job and its accept. */
export function describeRun({ result, accepted, elapsedSeconds }) {
  const summary = result.summary ?? {};
  return {
    elapsedSeconds,
    scenario: result.finalScenarioName,
    demandedSlots: summary.demandedSlots,
    filledSlots: summary.filledSlots,
    workCount: summary.workCount,
    perShift: (summary.shifts ?? []).map((shift) => `${shift.abbreviation} ${shift.filledSlots}/${shift.demandedSlots}`),
    openSlotReasons: summary.openSlotReasons ?? [],
    harmonizationSkipped: result.harmonizationSkipped,
    harmonizationSkippedReason: result.harmonizationSkippedReason,
    complianceViolations: (result.complianceViolations ?? []).length,
    complianceList: (result.complianceViolations ?? []).map((entry) => `${entry.date} ${entry.clientName} ${entry.type} ${entry.comment}`),
    complianceSkippedPlacements: (result.complianceSkippedPlacements ?? []).length,
    qualificationGaps: (result.qualificationGaps ?? []).length,
    planningRuleRemaining: result.planningRuleRemaining,
    accepted,
  };
}

export function evaluatePlan(data, site, memberIds, periodHours) {
  const perPerson = site.team.map((member) => {
    const clientId = memberIds[member.key];
    const works = worksOf(data, clientId);
    const weeks = weekTotals(works);
    const hours = works.reduce((sum, work) => sum + spanOf(work).length, 0);
    const client = data.clients.find((entry) => entry.id === clientId);
    return {
      member: `${member.firstName} ${member.name}`,
      contract: CONTRACTS[member.contract]?.name ?? "kein Vertrag",
      target: CONTRACTS[member.contract]?.guaranteed ?? 0,
      workHours: hours,
      works: works.length,
      nights: works.filter(isNightPart).length,
      maxWeekHours: Math.max(0, ...Object.values(weeks)),
      longestRun: longestRun(works),
      rest: restViolations(works),
      headerPeriodHours: periodHours?.[clientId] ?? null,
      client: client ? { guaranteedHours: client.guaranteedHours, maximumHours: client.maximumHours } : null,
    };
  });
  const vacation = vacationFindings(data, site, memberIds);
  return {
    openSlots: openSlots(data, site, memberIds),
    totalWorkHours: perPerson.reduce((sum, person) => sum + person.workHours, 0),
    maxWeekHours: Math.max(...perPerson.map((person) => person.maxWeekHours)),
    weeksAbove50: perPerson.filter((person) => person.maxWeekHours > WEEK_HOURS_LEGAL_LOOKING_LIMIT).map((person) => `${person.member} ${person.maxWeekHours}`),
    restViolations: perPerson.flatMap((person) => person.rest.map((text) => `${person.member} ${text}`)),
    storyWorks: (site.storyWorkDays ?? []).map(({ key, days }) => ({
      key,
      works: days.map((day) => `${day}: ${worksOf(data, memberIds[key]).filter((work) => dayOf(work) === day).map((work) => `${work.startTime.slice(0, 5)}-${work.endTime.slice(0, 5)}`).join(",") || "frei"}`),
    })),
    commandFindings: commandFindings(data, site, memberIds),
    vacationFindings: vacation.findings,
    vacationCover: vacation.cover,
    perPerson,
  };
}

/**
 * One on-call person per calendar day, always someone without work or absence that day and without a night part running into it; rotates through the
 * team so the same person does not stand by the whole month.
 */
export function pickOnCallRoster(data, site, memberIds) {
  const roster = [];
  const load = new Map(site.team.map((member) => [member.key, 0]));
  for (const day of datesBetween(PERIOD.from, PERIOD.until)) {
    const free = site.team.filter((member) => {
      const clientId = memberIds[member.key];
      const busy = worksOf(data, clientId).some((work) => dayOf(work) === day || (dayOf(work) === addDays(day, -1) && spanOf(work).crossesMidnight));
      const absent = breaksOf(data, clientId).some((entry) => dayOf(entry) === day);
      return !busy && !absent;
    });
    if (free.length === 0) continue;
    const chosen = [...free].sort((a, b) => load.get(a.key) - load.get(b.key))[0];
    load.set(chosen.key, load.get(chosen.key) + 1);
    roster.push({ clientId: memberIds[chosen.key], key: chosen.key, day });
  }
  return roster;
}
