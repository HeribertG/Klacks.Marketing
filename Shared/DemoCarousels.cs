// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// The demo video carousels of the landing pages, in page order: everyday roster work, special shifts
/// (tour containers) and sporadic / time-range shifts. The last one has no recorded videos yet, so it renders nothing.
/// </summary>
public static class DemoCarousels
{
    public const string DailyOperationsSectionId = "alltag";
    public const string ContainersSectionId = "spezialdienste-container";
    public const string SporadicTimeRangeSectionId = "spezialdienste-sporadisch-zeitbereich";

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
        Array.Empty<DemoCarouselVideo>());

    public static IReadOnlyList<DemoCarouselDefinition> All { get; } = new[] { DailyOperations, Containers, SporadicTimeRange };
}
