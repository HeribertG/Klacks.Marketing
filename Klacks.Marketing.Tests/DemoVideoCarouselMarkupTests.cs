// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Shared;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Source guard for the demo video carousels: the accessibility, lazy-loading and hover-zoom contract of the shared
/// component is checked against the Razor, JS and CSS sources, the carousel definitions are checked directly.
/// The rendered behaviour of each instance is covered by <see cref="DemoVideoCarouselRenderingTests"/>.
/// </summary>
[TestFixture]
public class DemoVideoCarouselMarkupTests
{
    private const string CarouselRelativePath = "Shared/DemoVideoCarousel.razor";
    private const string RetiredCarouselRelativePath = "Shared/DailyOperationsVideos.razor";
    private const string TemplateRelativePath = "Shared/IndustryPageTemplate.razor";
    private const string VideoRelativePath = "Shared/DemoVideo.razor";
    private const string StylesRelativePath = "tailwind-input.css";
    private const string ControlsScriptRelativePath = "wwwroot/js/carousel-controls.js";
    private const string LayoutRelativePath = "Pages/_Layout.cshtml";
    private const string SectionEndTag = "</section>";
    private const string KlacksySectionStartTag = "<section id=\"klacksy\"";
    private const string ExampleSectionCondition = "@if (Content.Example is not null)";
    private const int KlacksyVideoWidth = 1000;
    private const int KlacksyVideoHeight = 720;
    private const int DefaultVideoWidth = 1280;
    private const int DefaultVideoHeight = 800;
    private const string ExplorerTagPattern = @"<FeatureExplorer\b[^>]*/>";

    private static readonly string[] ExpectedDailyOperationsVideoConstants =
    {
        "ExpensesVideoName",
        "CorrectionVideoName",
        "ReplacementVideoName",
        "HoursAdjustmentVideoName",
        "Timeline24hVideoName",
        "TimelineDayDragDropVideoName",
    };

    private static readonly string[] ExpectedDailyOperationsTextPrefixes =
    {
        "expensesDemo",
        "correctionDemo",
        "replacementDemo",
        "hoursAdjustmentDemo",
        "timeline24hDemo",
        "timelineDayDragDropDemo",
    };

    private static readonly string[] ExpectedContainerVideoNames =
    {
        DemoVideo.ContainerFillVideoName,
        DemoVideo.ContainerAutofillVideoName,
        DemoVideo.ContainerPauseVideoName,
        DemoVideo.ContainerRouteVideoName,
        DemoVideo.ContainerSplitVideoName,
    };

    private static readonly string[] ExpectedContainerTextPrefixes =
    {
        "containerFillDemo",
        "containerAutofillDemo",
        "containerPauseDemo",
        "containerRouteDemo",
        "containerSplitDemo",
    };

    private static readonly string[] ExpectedRuleVideoNames =
    {
        DemoVideo.RestConflictVideoName,
        DemoVideo.RuleCollisionVideoName,
        DemoVideo.RuleConsecutiveDaysVideoName,
        DemoVideo.RuleHolidayWorkVideoName,
    };

    private static readonly string[] ExpectedRuleTextPrefixes =
    {
        "ruleConflictDemo",
        "ruleCollisionDemo",
        "ruleConsecutiveDaysDemo",
        "ruleHolidayWorkDemo",
    };

    private static readonly string[] ExpectedScenarioVideoNames =
    {
        DemoVideo.ScenarioCreateVideoName,
        DemoVideo.ScenarioAutoWizardVideoName,
        DemoVideo.ScenarioCompareVideoName,
        DemoVideo.ScenarioRuleViolationVideoName,
    };

    private static readonly string[] ExpectedScenarioTextPrefixes =
    {
        "scenarioCreateDemo",
        "scenarioAutoWizardDemo",
        "scenarioCompareDemo",
        "scenarioRuleDemo",
    };

    private static readonly string[] ExpectedKlacksyVideoNames =
    {
        DemoVideo.KlacksyPlansWeekVideoName,
        DemoVideo.KlacksyGroupsAddressVideoName,
        DemoVideo.KlacksyGroupsQualificationVideoName,
        DemoVideo.KlacksyGroupsMixedVideoName,
    };

    private static readonly string[] ExpectedKlacksyTextPrefixes =
    {
        "klacksyPlansWeek",
        "klacksyGroupsAddress",
        "klacksyGroupsQualification",
        "klacksyGroupsMixed",
    };

    private static readonly string[] ExpectedSpecialShiftVideoNames =
    {
        DemoVideo.ShiftSporadicVideoName,
        DemoVideo.ShiftTimeRangeVideoName,
        DemoVideo.ShiftSumEmployeesVideoName,
        DemoVideo.ShiftQuantityVideoName,
        DemoVideo.ShiftQualificationVideoName,
    };

    private static readonly string[] ExpectedSpecialShiftTextPrefixes =
    {
        "shiftSporadicDemo",
        "shiftTimeRangeDemo",
        "shiftSumEmployeesDemo",
        "shiftQuantityDemo",
        "shiftQualificationDemo",
    };

    [Test]
    public void Carousel_is_an_accessible_region_with_slide_label_live_region_and_labelled_controls()
    {
        var markup = MarketingProjectPaths.ReadSource(CarouselRelativePath);

        markup.ShouldContain("role=\"region\"");
        markup.ShouldContain("aria-roledescription=\"carousel\"");
        markup.ShouldContain("aria-labelledby=\"@(Compact ? null : HeadingId)\"");
        markup.ShouldContain("aria-label=\"@(Compact ? Sh(Definition.TitleKey) : null)\"");
        markup.ShouldContain("aria-roledescription=\"slide\"");
        markup.ShouldContain("aria-label=\"@SlideLabel()\"");
        markup.ShouldContain("aria-live=\"polite\"");
        markup.ShouldContain("aria-label=\"@Sh(PreviousKey)\"");
        markup.ShouldContain("aria-label=\"@Sh(NextKey)\"");
        markup.ShouldContain("aria-label=\"@Sh(NavLabelKey)\"");
        markup.ShouldContain("aria-current=");
        markup.ShouldContain("<button type=\"button\"");
        markup.ShouldContain("data-carousel-prev");
        markup.ShouldContain("data-carousel-next");
    }

    [Test]
    public void Carousel_renders_only_the_active_deferred_non_looping_video_with_hover_zoom()
    {
        var markup = MarketingProjectPaths.ReadSource(CarouselRelativePath);

        markup.ShouldContain("var current = _videos[_currentIndex];");
        markup.ShouldContain("@key=\"current.VideoName\"");
        markup.ShouldContain("Deferred=\"true\"");
        markup.ShouldContain("Loop=\"false\"");
        markup.ShouldContain("HoverZoom=\"true\"");
        markup.ShouldContain("TitleKey=\"@(Compact ? null : current.TitleKey)\"");
        markup.ShouldContain("CaptionFooter=\"@SlideFooter?.Invoke(current.VideoName)\"");
        markup.ShouldContain("private int _currentIndex = FirstSlideIndex;");
        markup.ShouldContain("(TargetIndex + 1) % _videos.Count");
        markup.ShouldContain("(TargetIndex - 1 + _videos.Count) % _videos.Count");
        markup.ShouldNotContain(" hidden=");
    }

    [Test]
    public void Carousel_takes_its_section_texts_and_videos_from_the_definition_instead_of_hard_coded_keys()
    {
        var markup = MarketingProjectPaths.ReadSource(CarouselRelativePath);

        markup.ShouldContain("[Parameter, EditorRequired] public required DemoCarouselDefinition Definition");
        markup.ShouldContain("<section id=\"@Definition.SectionId\"");
        markup.ShouldContain("@Sh(Definition.TitleKey)");
        markup.ShouldContain("@Sh(Definition.SubtitleKey)");
        markup.ShouldContain("Definition.Videos.Where(video => VideoCatalog.Find(video.VideoName, Culture) is not null)");
        markup.ShouldContain("@if (_videos.Count > 0)");
        markup.ShouldNotContain("\"dailyOps.title\"");
        markup.ShouldNotContain("\"dailyOps.subtitle\"");
        markup.ShouldNotContain("DemoVideo.ExpensesVideoName");
        markup.ShouldNotContain("DemoVideo.ContainerFillVideoName");
    }

    [Test]
    public void Carousel_derives_every_dom_id_from_the_section_id_so_several_instances_cannot_collide()
    {
        var markup = MarketingProjectPaths.ReadSource(CarouselRelativePath);

        markup.ShouldContain("Definition.SectionId + HeadingIdSuffix");
        markup.ShouldContain("Definition.SectionId + SlideIdSuffix");
        markup.ShouldNotContain("daily-ops-heading");
        markup.ShouldNotContain("daily-ops-slide");
        Regex.Matches(markup, @"\bid=""([^""]+)""").Select(match => match.Groups[1].Value)
            .ShouldBe(new[] { "@Definition.SectionId", "@HeadingId", "@SlideId" });
    }

    [Test]
    public void Eyebrow_and_klacksy_tip_are_optional_parts_of_the_definition()
    {
        var markup = MarketingProjectPaths.ReadSource(CarouselRelativePath);

        markup.ShouldContain("@if (Definition.EyebrowKey is not null)");
        markup.ShouldContain("@if (!Compact && Definition.HintKey is not null)");
        markup.ShouldContain("@Sh(Definition.HintKey)");
    }

    [Test]
    public void Retired_single_purpose_carousel_component_is_gone()
    {
        File.Exists(Path.Combine(MarketingProjectPaths.ProjectRoot, RetiredCarouselRelativePath)).ShouldBeFalse();
        MarketingProjectPaths.ReadSource(TemplateRelativePath).ShouldNotContain("DailyOperationsVideos");
    }

    [Test]
    public void Rule_carousel_lists_the_four_rule_violation_videos_in_the_agreed_order_with_matching_text_keys()
    {
        var definition = DemoCarousels.Rules;

        definition.Videos.Select(video => video.VideoName).ShouldBe(ExpectedRuleVideoNames);
        definition.Videos.Select(video => video.VideoName).ShouldBe(new[] { "rest-conflict", "rule-collision", "rule-consecutive-days", "rule-holiday-work" });
        AssertTextKeysMatchVideoPrefixes(definition, ExpectedRuleTextPrefixes);
        definition.SectionId.ShouldBe("regel-verstoesse");
        definition.TitleKey.ShouldBe("ruleOps.title");
        definition.SubtitleKey.ShouldBe("ruleOps.subtitle");
    }

    [Test]
    public void Scenario_carousel_lists_the_four_scenario_videos_in_the_agreed_order_with_matching_text_keys()
    {
        var definition = DemoCarousels.Scenarios;

        definition.Videos.Select(video => video.VideoName).ShouldBe(ExpectedScenarioVideoNames);
        definition.Videos.Select(video => video.VideoName).ShouldBe(new[] { "scenario-create", "scenario-autowizard", "scenario-compare", "scenario-rule-violation" });
        AssertTextKeysMatchVideoPrefixes(definition, ExpectedScenarioTextPrefixes);
        definition.SectionId.ShouldBe("szenarien");
        definition.TitleKey.ShouldBe("scenarioOps.title");
        definition.SubtitleKey.ShouldBe("scenarioOps.subtitle");
    }

    [Test]
    public void Daily_operations_carousel_lists_the_six_everyday_videos_in_the_agreed_order_with_matching_text_keys()
    {
        var definition = DemoCarousels.DailyOperations;

        definition.Videos.Select(video => video.VideoName).ShouldBe(ExpectedDailyOperationsVideoConstants.Select(ConstantValue));
        AssertTextKeysMatchVideoPrefixes(definition, ExpectedDailyOperationsTextPrefixes);
        definition.SectionId.ShouldBe("alltag");
        definition.TitleKey.ShouldBe("dailyOps.title");
        definition.SubtitleKey.ShouldBe("dailyOps.subtitle");
    }

    [Test]
    public void Container_carousel_lists_the_five_tour_container_videos_in_the_agreed_order_with_matching_text_keys()
    {
        var definition = DemoCarousels.Containers;

        definition.Videos.Select(video => video.VideoName).ShouldBe(ExpectedContainerVideoNames);
        AssertTextKeysMatchVideoPrefixes(definition, ExpectedContainerTextPrefixes);
        definition.TitleKey.ShouldBe("containerOps.title");
        definition.SubtitleKey.ShouldBe("containerOps.subtitle");
    }

    [Test]
    public void Special_shift_carousel_lists_the_five_shift_feature_videos_in_the_agreed_order_with_matching_text_keys()
    {
        var definition = DemoCarousels.SporadicTimeRange;

        definition.Videos.Select(video => video.VideoName).ShouldBe(ExpectedSpecialShiftVideoNames);
        AssertTextKeysMatchVideoPrefixes(definition, ExpectedSpecialShiftTextPrefixes);
        definition.TitleKey.ShouldBe("sporadicOps.title");
        definition.SubtitleKey.ShouldBe("sporadicOps.subtitle");
    }

    [Test]
    public void Klacksy_carousel_lists_the_plans_week_video_and_the_three_group_videos_in_the_agreed_order_with_matching_text_keys()
    {
        var definition = DemoCarousels.Klacksy;

        definition.Videos.Select(video => video.VideoName).ShouldBe(ExpectedKlacksyVideoNames);
        definition.Videos.Select(video => video.VideoName).ShouldBe(new[] { "klacksy-plans-week", "klacksy-groups-address", "klacksy-groups-qualification", "klacksy-groups-mixed" });
        AssertTextKeysMatchVideoPrefixes(definition, ExpectedKlacksyTextPrefixes);
        definition.SectionId.ShouldBe("klacksy-aufgaben");
        definition.TitleKey.ShouldBe("klacksyOps.title");
        definition.SubtitleKey.ShouldBe("klacksyOps.subtitle");
    }

    [Test]
    public void Klacksy_carousel_uses_the_chat_viewport_video_size_and_every_other_carousel_the_default_size()
    {
        DemoCarousels.Klacksy.VideoWidth.ShouldBe(KlacksyVideoWidth);
        DemoCarousels.Klacksy.VideoHeight.ShouldBe(KlacksyVideoHeight);
        DemoCarousels.All.Where(definition => definition != DemoCarousels.Klacksy).ShouldAllBe(definition => definition.VideoWidth == DefaultVideoWidth && definition.VideoHeight == DefaultVideoHeight);
        DemoCarouselDefinition.DefaultVideoWidth.ShouldBe(DefaultVideoWidth);
        DemoCarouselDefinition.DefaultVideoHeight.ShouldBe(DefaultVideoHeight);
    }

    [Test]
    public void Carousel_takes_the_video_size_from_the_definition_instead_of_hard_coded_constants()
    {
        var markup = MarketingProjectPaths.ReadSource(CarouselRelativePath);

        markup.ShouldContain("Width=\"@Definition.VideoWidth\" Height=\"@Definition.VideoHeight\"");
        markup.ShouldNotContain("private const int VideoWidth");
        markup.ShouldNotContain("private const int VideoHeight");
    }

    [Test]
    public void Definitions_have_unique_section_ids_and_never_share_a_video()
    {
        var all = DemoCarousels.All;

        all.Select(definition => definition.SectionId).ShouldBe(new[]
        {
            DemoCarousels.RulesSectionId,
            DemoCarousels.ScenariosSectionId,
            DemoCarousels.DailyOperationsSectionId,
            DemoCarousels.ContainersSectionId,
            DemoCarousels.SporadicTimeRangeSectionId,
            DemoCarousels.KlacksySectionId,
        });
        all.Select(definition => definition.SectionId).Distinct().Count().ShouldBe(all.Count);
        all.SelectMany(definition => definition.Videos).Select(video => video.VideoName).ShouldBeUnique();
        all.Select(definition => definition.TitleKey).ShouldBeUnique();
        all.Select(definition => definition.SubtitleKey).ShouldBeUnique();
        all.ShouldAllBe(definition => Regex.IsMatch(definition.SectionId, "^[a-z][a-z0-9-]*$"));
    }

    [Test]
    public void Klacksy_tip_belongs_to_the_everyday_and_the_scenario_carousel_and_the_eyebrow_to_the_everyday_carousel_only()
    {
        DemoCarousels.Rules.HintKey.ShouldBeNull();
        DemoCarousels.Rules.EyebrowKey.ShouldBeNull();
        DemoCarousels.DailyOperations.HintKey.ShouldBe("dailyOps.klacksyHint");
        DemoCarousels.DailyOperations.EyebrowKey.ShouldBe("dailyOps.eyebrow");
        DemoCarousels.Scenarios.HintKey.ShouldBe("scenarioOps.klacksyHint");
        DemoCarousels.Scenarios.EyebrowKey.ShouldBeNull();
        DemoCarousels.Containers.HintKey.ShouldBeNull();
        DemoCarousels.Containers.EyebrowKey.ShouldBeNull();
        DemoCarousels.SporadicTimeRange.HintKey.ShouldBeNull();
        DemoCarousels.SporadicTimeRange.EyebrowKey.ShouldBeNull();
        DemoCarousels.Klacksy.HintKey.ShouldBeNull();
        DemoCarousels.Klacksy.EyebrowKey.ShouldBeNull();
    }

    [Test]
    public void Landing_page_template_bundles_every_carousel_and_the_rule_settings_into_one_feature_explorer_below_the_solutions()
    {
        var template = MarketingProjectPaths.ReadSource(TemplateRelativePath);

        template.ShouldNotContain("<DemoVideoCarousel");
        template.ShouldNotContain("<RuleSettingsSection");
        template.ShouldNotContain("RestConflictVideoName");
        template.ShouldNotContain("ruleDemo.");
        var explorers = Regex.Matches(template, ExplorerTagPattern, RegexOptions.Singleline);
        explorers.Count.ShouldBe(1);
        var explorer = explorers[0];
        explorer.Value.ShouldContain("Culture=\"@Culture\"");
        explorer.Value.ShouldContain("RulesCalendar=\"@ExplorerRulesCalendar\"");
        explorer.Value.ShouldContain("InitialChapterId=\"@InitialExplorerChapterId\"");

        var controlSection = template.IndexOf("<section id=\"kontrolle\"", StringComparison.Ordinal);
        controlSection.ShouldBeGreaterThanOrEqualTo(0);
        var controlSectionEnd = template.IndexOf(SectionEndTag, controlSection, StringComparison.Ordinal);
        controlSectionEnd.ShouldBeLessThan(explorer.Index);
        template.IndexOf("<StatsCounterSection", StringComparison.Ordinal).ShouldBeGreaterThan(explorer.Index);
    }

    [Test]
    public void Landing_page_template_keeps_the_klacksy_section_with_the_static_screenshot_and_opens_the_klacksy_chapter_on_the_klacksy_page()
    {
        var template = MarketingProjectPaths.ReadSource(TemplateRelativePath);

        var sectionStart = template.IndexOf(KlacksySectionStartTag, StringComparison.Ordinal);
        sectionStart.ShouldBeGreaterThanOrEqualTo(0);
        var sectionEnd = template.IndexOf(SectionEndTag, sectionStart, StringComparison.Ordinal);
        var section = template[sectionStart..sectionEnd];
        section.ShouldNotContain("<DemoVideo");
        section.ShouldNotContain("KlacksyPlansWeekVideoName");
        section.ShouldContain("<MagnifiedImage");

        template.ShouldContain("IsKlacksyPage ? DemoCarousels.KlacksySectionId : null");
        template.IndexOf(ExampleSectionCondition, StringComparison.Ordinal).ShouldBeGreaterThan(sectionEnd);
        template.IndexOf("<StatsCounterSection", StringComparison.Ordinal).ShouldBeLessThan(sectionStart);
    }

    [Test]
    public void Pill_bar_wraps_instead_of_scrolling_so_many_pills_cannot_overflow_a_narrow_screen()
    {
        var markup = MarketingProjectPaths.ReadSource(CarouselRelativePath);

        markup.ShouldContain("flex flex-wrap justify-center gap-2");
        markup.ShouldNotContain("overflow-x");
    }

    [Test]
    public void Carousel_changes_slides_through_one_fading_path_and_has_no_timer_rotation()
    {
        var markup = MarketingProjectPaths.ReadSource(CarouselRelativePath);

        markup.ShouldContain("is-fading-out");
        markup.ShouldContain("Task.Delay(FadeDurationMs");
        markup.ShouldNotContain("System.Timers");
        markup.ShouldNotContain("PeriodicTimer");
        markup.ShouldNotContain("setInterval");
    }

    [Test]
    public void Deferred_demo_video_does_not_autoplay_or_preload_and_can_opt_out_of_looping()
    {
        var markup = MarketingProjectPaths.ReadSource(VideoRelativePath);

        markup.ShouldContain("autoplay=\"@(!Deferred)\"");
        markup.ShouldContain("preload=\"@(Deferred ? PreloadNone : PreloadMetadata)\"");
        markup.ShouldContain("loop=\"@Loop\"");
        markup.ShouldContain("public bool Loop { get; set; } = true;");
        markup.ShouldContain("screenshot-hover-zoom");
    }

    [Test]
    public void Controls_script_handles_keys_swipe_and_ended_event_per_carousel_mirrored_in_rtl_without_pausing_on_hover_or_focus()
    {
        var script = MarketingProjectPaths.ReadSource(ControlsScriptRelativePath);
        var layout = MarketingProjectPaths.ReadSource(LayoutRelativePath);

        script.ShouldContain("'ArrowLeft'");
        script.ShouldContain("'ArrowRight'");
        script.ShouldContain("'touchstart'");
        script.ShouldContain("'touchend'");
        script.ShouldContain("'ended'");
        script.ShouldContain("isRtl()");
        script.ShouldContain("closest(ROOT_SELECTOR)");
        script.ShouldContain("root.querySelector(towardsNext ? NEXT_SELECTOR : PREV_SELECTOR)");
        script.ShouldNotContain(":hover");
        script.ShouldNotContain(":focus");
        script.ShouldNotContain("setInterval");
        script.ShouldNotContain("getElementById");
        layout.ShouldContain("~/js/carousel-controls.js");
    }

    [Test]
    public void Carousel_styles_keep_the_zoomed_frame_unclipped_and_mirror_in_rtl_via_grid()
    {
        var styles = MarketingProjectPaths.ReadSource(StylesRelativePath);
        var carouselStyles = styles[styles.IndexOf(".daily-ops-carousel {", StringComparison.Ordinal)..styles.IndexOf("/* Looping demo video", StringComparison.Ordinal)];

        carouselStyles.ShouldContain("grid-template-areas");
        carouselStyles.ShouldContain(".is-fading-out");
        carouselStyles.ShouldContain("prefers-reduced-motion: no-preference");
        carouselStyles.ShouldNotContain("overflow");
        styles.ShouldContain("transform: scale(var(--hover-zoom-scale, 2))");
        styles.ShouldNotContain("daily-ops-accordion");
    }

    private static string ConstantValue(string constantName) =>
        (string)typeof(DemoVideo).GetField(constantName)!.GetRawConstantValue()!;

    private static void AssertTextKeysMatchVideoPrefixes(DemoCarouselDefinition definition, string[] expectedPrefixes)
    {
        definition.Videos.Select(video => video.TitleKey).ShouldBe(expectedPrefixes.Select(prefix => prefix + ".title"));
        definition.Videos.Select(video => video.LabelKey).ShouldBe(expectedPrefixes.Select(prefix => prefix + ".videoLabel"));
        definition.Videos.Select(video => video.CaptionKey).ShouldBe(expectedPrefixes.Select(prefix => prefix + ".caption"));
    }
}
