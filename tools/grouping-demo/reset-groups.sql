-- Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

-- Returns a Klacks database to the "no groups" baseline: every group, every group membership
-- (client and shift links) and every row that hangs on a group is hard-deleted. Nothing else is touched.
-- Run inside a transaction, e.g.: psql -1 -v ON_ERROR_STOP=1 -d klacks_marketing_grouping -f reset-groups.sql
-- Order is FK-safe: dependants first, "group" last.

-- Agent conditions bound to groups or to analysis scenarios (children cascade: events, condition groups).
delete from agent_condition_groups;
delete from agent_conditions where group_id is not null or scenario_id in (select id from analyse_scenarios);

-- Analysis scenarios reference "group" without cascade.
delete from analyse_scenarios;

-- Wizard captures of group runs (wizard_run_capture_work cascades).
delete from wizard_run_capture where group_id is not null;

-- Memberships (group_item holds client AND shift links, soft-deleted ones included), visibility, assignments.
delete from group_item;
delete from assigned_group;
delete from group_visibility;

-- Group-scoped settings without a foreign key (dangling group ids would otherwise remain).
delete from client_sort_preference where group_id is not null;
delete from payroll_export_group_config where group_id is not null;
delete from sealed_day where group_id is not null;
delete from escalation_chains where group_id is not null;
delete from agent_standing_approval where group_id is not null;
update agent_trigger_governance set group_id = null where group_id is not null;
update export_log set group_id = null where group_id is not null;
update period_audit_log set group_id = null where group_id is not null;

-- The group tree itself (nested set, all roots).
delete from "group";
