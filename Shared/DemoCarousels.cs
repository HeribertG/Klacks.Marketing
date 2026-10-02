// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// The demo video carousels of the landing pages, in page order: rule violations (live findings of the error list), scenarios (planning
/// without risk), everyday roster work, special shifts
/// (tour containers) and special shifts (sporadic, time range, several employees per shift, several shifts per day, mandatory
/// qualification). A carousel renders only the videos recorded in the page culture and nothing at all without any.
/// </summary>
public static class DemoCarousels
{
    public const string RulesSectionId = "regeln";
    public const string ScenariosSectionId = "szenarien";
    public const string DailyOperationsSectionId = "alltag";
    public const string ContainersSectionId = "spezialdienste-container";
    public const string SporadicTimeRangeSectionId = "spezialdienste-sporadisch-zeitbereich";

    public static DemoCarouselDefinition Rules { get; } = new(
        RulesSectionId,
        "ruleOps.title",
        "ruleOps.subtitle",
        new DemoCarouselVideo[]
        {
            new(DemoVideo.RestConflictVideoName, "ruleConflictDemo.title", "ruleConflictDemo.videoLabel", "ruleConflictDemo.caption"),
            new(DemoVideo.RuleCollisionVideoName, "ruleCollisionDemo.title", "ruleCollisionDemo.videoLabel", "ruleCollisionDemo.caption"),
            new(DemoVideo.RuleConsecutiveDaysVideoName, "ruleConsecutiveDaysDemo.title", "ruleConsecutiveDaysDemo.videoLabel", "ruleConsecutiveDaysDemo.caption"),
        });

    public static DemoCarouselDefinition Scenarios { get; } = new(
        ScenariosSectionId,
        "scenarioOps.title",
        "scenarioOps.subtitle",
        new DemoCarouselVideo[]
        {
            new(DemoVideo.ScenarioCreateVideoName, "scenarioCreateDemo.title", "scenarioCreateDemo.videoLabel", "scenarioCreateDemo.caption"),
            new(DemoVideo.ScenarioAutoWizardVideoName, "scenarioAutoWizardDemo.title", "scenarioAutoWizardDemo.videoLabel", "scenarioAutoWizardDemo.caption"),
            new(DemoVideo.ScenarioCompareVideoName, "scenarioCompareDemo.title", "scenarioCompareDemo.videoLabel", "scenarioCompareDemo.caption"),
            new(DemoVideo.ScenarioRuleViolationVideoName, "scenarioRuleDemo.title", "scenarioRuleDemo.videoLabel", "scenarioRuleDemo.caption"),
        },
        HintKey: "scenarioOps.klacksyHint");

    public static DemoCarouselDefinition DailyOperations { get; } = new(
        DailyOperationsSectionId,
        "dailyOps.title",
        "dailyOps.subtitle",
        new DemoCarouselVideo[]
        {
            new(DemoVideo.ExpensesVideoName, "expensesDemo.title", "expensesDemo.videoLabel", "expensesDemo.caption"),
            new(DemoVideo.CorrectionVideoName, "correctionDemo.title", "correctionDemo.videoLabel", "correctionDemo.caption"),
            new(DemoVideo.ReplacementVideoName, "replacementDemo.title", "replacementDemo.videoLabel", "replacementDemo.caption"),
            new(DemoVideo.HoursAdjustmentVideoName, "hoursAdjustmentDemo.title", "hoursAdjustmentDemo.videoLabel", "hoursAdjustmentDemo.caption"),
            new(DemoVideo.Timeline24hVideoName, "timeline24hDemo.title", "timeline24hDemo.videoLabel", "timeline24hDemo.caption"),
            new(DemoVideo.TimelineDayDragDropVideoName, "timelineDayDragDropDemo.title", "timelineDayDragDropDemo.videoLabel", "timelineDayDragDropDemo.caption"),
        },
        EyebrowKey: "dailyOps.eyebrow",
        HintKey: "dailyOps.klacksyHint");

    public static DemoCarouselDefinition Containers { get; } = new(
        ContainersSectionId,
        "containerOps.title",
        "containerOps.subtitle",
        new DemoCarouselVideo[]
        {
            new(DemoVideo.ContainerFillVideoName, "containerFillDemo.title", "containerFillDemo.videoLabel", "containerFillDemo.caption"),
            new(DemoVideo.ContainerAutofillVideoName, "containerAutofillDemo.title", "containerAutofillDemo.videoLabel", "containerAutofillDemo.caption"),
            new(DemoVideo.ContainerPauseVideoName, "containerPauseDemo.title", "containerPauseDemo.videoLabel", "containerPauseDemo.caption"),
            new(DemoVideo.ContainerRouteVideoName, "containerRouteDemo.title", "containerRouteDemo.videoLabel", "containerRouteDemo.caption"),
            new(DemoVideo.ContainerSplitVideoName, "containerSplitDemo.title", "containerSplitDemo.videoLabel", "containerSplitDemo.caption"),
        });

    public static DemoCarouselDefinition SporadicTimeRange { get; } = new(
        SporadicTimeRangeSectionId,
        "sporadicOps.title",
        "sporadicOps.subtitle",
        new DemoCarouselVideo[]
        {
            new(DemoVideo.ShiftSporadicVideoName, "shiftSporadicDemo.title", "shiftSporadicDemo.videoLabel", "shiftSporadicDemo.caption"),
            new(DemoVideo.ShiftTimeRangeVideoName, "shiftTimeRangeDemo.title", "shiftTimeRangeDemo.videoLabel", "shiftTimeRangeDemo.caption"),
            new(DemoVideo.ShiftSumEmployeesVideoName, "shiftSumEmployeesDemo.title", "shiftSumEmployeesDemo.videoLabel", "shiftSumEmployeesDemo.caption"),
            new(DemoVideo.ShiftQuantityVideoName, "shiftQuantityDemo.title", "shiftQuantityDemo.videoLabel", "shiftQuantityDemo.caption"),
            new(DemoVideo.ShiftQualificationVideoName, "shiftQualificationDemo.title", "shiftQualificationDemo.videoLabel", "shiftQualificationDemo.caption"),
        });

    public static IReadOnlyList<DemoCarouselDefinition> All { get; } = new[] { Rules, Scenarios, DailyOperations, Containers, SporadicTimeRange };
}
