// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cleans up after an aborted scenario take (scenario-create, scenario-autowizard, scenario-compare, scenario-rule-violation of
 * takes/scenario-takes.mjs) through the real REST API of a running Klacks demo instance: deletes every ACTIVE scenario of the demo group AND of the
 * weekly group "Winterthur Nord" of the scenario-autowizard take (when seed-scenario-week-demo.mjs has created it; their token data is soft-deleted by
 * the server), optionally empties the AutoWizard plan week 02.-08.11.2026 (--plan-week: in both groups deletes every work of the group's employees in
 * that week and every scenario overlapping it; the weekly group is read with its weekly filter) and verifies that October 2026 of the demo group
 * still holds its 118 works.
 * It never touches October; when October differs the script fails and names the difference count. The takes refuse to start while an active
 * scenario exists, so run this once after a take crashed.
 * CLI: --plan-week (also reset the plan week)  --api-url  --group-id
 * Env: KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (required), KLACKS_API_URL, KLACKS_DEMO_GROUP_ID.
 */

import { parseArgs } from "node:util";
import { request as playwrightRequest } from "playwright-core";
import * as S from "./lib/klacks-demo-session.mjs";
import { ScheduleApi, snapshotOf } from "./lib/schedule-grid.mjs";
import {
  OCTOBER,
  OCTOBER_RANGE,
  PLAN_WEEK,
  SCHEDULE_ROW_LIMIT,
  activeScenarios,
  deleteScenario,
  monthRealFilter,
  resetPlanWeek,
} from "./lib/scenario-demo.mjs";
import { findWeekGroup, weekGroupFilter } from "./lib/scenario-week-demo.mjs";

const WORK_FILTER_DEFAULTS = {
  searchString: "",
  orderBy: "name",
  sortOrder: "asc",
  showEmployees: true,
  showExtern: true,
  individualSort: false,
  startRow: 0,
  rowCount: SCHEDULE_ROW_LIMIT,
};

function readOptions() {
  const { values } = parseArgs({
    options: {
      "plan-week": { type: "boolean", default: false },
      "api-url": { type: "string" },
      "group-id": { type: "string" },
    },
  });
  return { ...S.readSessionOptions(values), planWeek: values["plan-week"] };
}

const baseFilter = (groupId) => ({ ...WORK_FILTER_DEFAULTS, selectedGroup: groupId, paymentInterval: 2 });

async function main() {
  const options = readOptions();
  const context = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await S.apiLogin(context, options);
    const api = new ScheduleApi(context, options, token);
    const weekGroup = await findWeekGroup(api);
    const groups = [
      { label: "demo", id: options.groupId, planWeekFilter: { ...baseFilter(options.groupId), startDate: PLAN_WEEK.from, endDate: PLAN_WEEK.until, periodStartDate: PLAN_WEEK.from, periodEndDate: PLAN_WEEK.until } },
      ...(weekGroup ? [{ label: "week", id: weekGroup.id, planWeekFilter: weekGroupFilter(weekGroup.id) }] : []),
    ];
    const summary = { groupId: options.groupId, weekGroupId: weekGroup?.id ?? null, deletedScenarios: [], planWeek: null, planWeekOfWeekGroup: null };

    for (const group of groups) {
      for (const scenario of await activeScenarios(api, group.id)) {
        await deleteScenario(api, scenario.id);
        summary.deletedScenarios.push({ group: group.label, id: scenario.id, name: scenario.name, from: scenario.fromDate, until: scenario.untilDate });
      }
      const stillActive = (await activeScenarios(api, group.id)).length;
      if (stillActive > 0) throw new Error(`${stillActive} active scenario(s) of the ${group.label} group are left after the reset`);
    }

    if (options.planWeek) {
      for (const group of groups) {
        const report = {};
        await resetPlanWeek(api, group.id, group.planWeekFilter, report);
        if (group.label === "demo") summary.planWeek = report.reset;
        else summary.planWeekOfWeekGroup = report.reset;
      }
    }

    const october = snapshotOf(await api.schedule(monthRealFilter(baseFilter(options.groupId), OCTOBER)), OCTOBER_RANGE);
    summary.octoberWorks = october.length;
    if (october.length !== OCTOBER_RANGE.expectedWorks) {
      throw new Error(`October holds ${october.length} works instead of ${OCTOBER_RANGE.expectedWorks} - restore the demo data (this script does not touch October)`);
    }
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
