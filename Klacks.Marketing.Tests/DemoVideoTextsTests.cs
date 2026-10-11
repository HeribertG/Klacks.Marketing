// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Json;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using NUnit.Framework;
using Shouldly;

[TestFixture]
public class DemoVideoTextsTests
{
    private const string SharedFileName = "shared.json";
    private const int MaxCarouselTitleLength = 50;
    private const int MaxPillTitleLength = 40;
    private static readonly string[] KlacksyHintKeys = { "dailyOps.klacksyHint", "scenarioOps.klacksyHint" };
    private const string KlacksyName = "Klacksy";
    private const string SlideLabelKey = "dailyOps.slideLabel";
    private const string SlideNumberPlaceholder = "{0}";
    private const string SlideCountPlaceholder = "{1}";
    private const string RetiredRuleVideoKeyPrefix = "ruleDemo.";

    private static readonly string[] CarouselTitleKeys =
    {
        "ruleOps.title",
        "dailyOps.title",
        "containerOps.title",
        "sporadicOps.title",
        "scenarioOps.title",
        "klacksyOps.title",
    };

    private static readonly string[] VideoTextKeys =
    {
        "ruleOps.title",
        "ruleOps.subtitle",
        "ruleConflictDemo.title",
        "ruleConflictDemo.videoLabel",
        "ruleConflictDemo.caption",
        "ruleCollisionDemo.title",
        "ruleCollisionDemo.videoLabel",
        "ruleCollisionDemo.caption",
        "ruleConsecutiveDaysDemo.title",
        "ruleConsecutiveDaysDemo.videoLabel",
        "ruleConsecutiveDaysDemo.caption",
        "ruleHolidayWorkDemo.title",
        "ruleHolidayWorkDemo.videoLabel",
        "ruleHolidayWorkDemo.caption",
        "klacksyPlansWeek.videoLabel",
        "klacksyPlansWeek.caption",
        "klacksyOps.title",
        "klacksyOps.subtitle",
        "klacksyPlansWeek.title",
        "klacksyGroupsAddress.title",
        "klacksyGroupsAddress.videoLabel",
        "klacksyGroupsAddress.caption",
        "klacksyGroupsQualification.title",
        "klacksyGroupsQualification.videoLabel",
        "klacksyGroupsQualification.caption",
        "klacksyGroupsMixed.title",
        "klacksyGroupsMixed.videoLabel",
        "klacksyGroupsMixed.caption",
        "dailyOps.eyebrow",
        "dailyOps.title",
        "dailyOps.subtitle",
        "containerOps.title",
        "containerOps.subtitle",
        "sporadicOps.title",
        "sporadicOps.subtitle",
        "scenarioOps.title",
        "scenarioOps.subtitle",
        "scenarioOps.klacksyHint",
        "dailyOps.hintLabel",
        "dailyOps.klacksyHint",
        "dailyOps.previous",
        "dailyOps.next",
        "dailyOps.slideLabel",
        "dailyOps.navLabel",
        "expensesDemo.title",
        "expensesDemo.videoLabel",
        "expensesDemo.caption",
        "correctionDemo.title",
        "correctionDemo.videoLabel",
        "correctionDemo.caption",
        "replacementDemo.title",
        "replacementDemo.videoLabel",
        "replacementDemo.caption",
        "hoursAdjustmentDemo.title",
        "hoursAdjustmentDemo.videoLabel",
        "hoursAdjustmentDemo.caption",
        "timeline24hDemo.title",
        "timeline24hDemo.videoLabel",
        "timeline24hDemo.caption",
        "timelineDayDragDropDemo.title",
        "timelineDayDragDropDemo.videoLabel",
        "timelineDayDragDropDemo.caption",
        "containerFillDemo.title",
        "containerFillDemo.videoLabel",
        "containerFillDemo.caption",
        "containerAutofillDemo.title",
        "containerAutofillDemo.videoLabel",
        "containerAutofillDemo.caption",
        "containerPauseDemo.title",
        "containerPauseDemo.videoLabel",
        "containerPauseDemo.caption",
        "containerRouteDemo.title",
        "containerRouteDemo.videoLabel",
        "containerRouteDemo.caption",
        "containerSplitDemo.title",
        "containerSplitDemo.videoLabel",
        "containerSplitDemo.caption",
        "shiftSporadicDemo.title",
        "shiftSporadicDemo.videoLabel",
        "shiftSporadicDemo.caption",
        "shiftTimeRangeDemo.title",
        "shiftTimeRangeDemo.videoLabel",
        "shiftTimeRangeDemo.caption",
        "shiftSumEmployeesDemo.title",
        "shiftSumEmployeesDemo.videoLabel",
        "shiftSumEmployeesDemo.caption",
        "shiftQuantityDemo.title",
        "shiftQuantityDemo.videoLabel",
        "shiftQuantityDemo.caption",
        "shiftQualificationDemo.title",
        "shiftQualificationDemo.videoLabel",
        "shiftQualificationDemo.caption",
        "scenarioCreateDemo.title",
        "scenarioCreateDemo.videoLabel",
        "scenarioCreateDemo.caption",
        "scenarioAutoWizardDemo.title",
        "scenarioAutoWizardDemo.videoLabel",
        "scenarioAutoWizardDemo.caption",
        "scenarioCompareDemo.title",
        "scenarioCompareDemo.videoLabel",
        "scenarioCompareDemo.caption",
        "scenarioRuleDemo.title",
        "scenarioRuleDemo.videoLabel",
        "scenarioRuleDemo.caption",
    };

    private static readonly string[] CaptionKeys =
    {
        "klacksyPlansWeek.caption",
        "klacksyOps.subtitle",
        "klacksyGroupsAddress.caption",
        "klacksyGroupsQualification.caption",
        "klacksyGroupsMixed.caption",
        "dailyOps.subtitle",
        "containerOps.subtitle",
        "sporadicOps.subtitle",
        "scenarioOps.subtitle",
        "dailyOps.klacksyHint",
        "scenarioOps.klacksyHint",
        "expensesDemo.caption",
        "correctionDemo.caption",
        "replacementDemo.caption",
        "hoursAdjustmentDemo.caption",
        "timeline24hDemo.caption",
        "timelineDayDragDropDemo.caption",
        "containerFillDemo.caption",
        "containerAutofillDemo.caption",
        "containerPauseDemo.caption",
        "containerRouteDemo.caption",
        "containerSplitDemo.caption",
        "shiftSporadicDemo.caption",
        "shiftTimeRangeDemo.caption",
        "shiftSumEmployeesDemo.caption",
        "shiftQuantityDemo.caption",
        "shiftQualificationDemo.caption",
        "scenarioCreateDemo.caption",
        "scenarioAutoWizardDemo.caption",
        "scenarioCompareDemo.caption",
        "scenarioRuleDemo.caption",
        "ruleOps.subtitle",
        "ruleConflictDemo.caption",
        "ruleCollisionDemo.caption",
        "ruleConsecutiveDaysDemo.caption",
        "ruleHolidayWorkDemo.caption",
    };

    private static readonly string[] CarouselSubtitleKeys =
    {
        "ruleOps.subtitle",
        "dailyOps.subtitle",
        "containerOps.subtitle",
        "sporadicOps.subtitle",
        "scenarioOps.subtitle",
        "klacksyOps.subtitle",
    };

    private static IEnumerable<string> CultureCodes => SupportedCultures.All.Select(c => c.Code);

    [TestCaseSource(nameof(CultureCodes))]
    public void Every_culture_has_label_and_caption_for_each_demo_video(string culture)
    {
        var texts = LoadSharedTexts(culture);

        foreach (var key in VideoTextKeys)
        {
            texts.ShouldContainKey(key, $"{culture}/{SharedFileName} lacks '{key}'");
            texts[key].ShouldNotBeNullOrWhiteSpace($"{culture}/{SharedFileName} has an empty '{key}'");
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void No_culture_keeps_the_retired_single_rule_video_keys(string culture)
    {
        var texts = LoadSharedTexts(culture);

        texts.Keys.ShouldNotContain(key => key.StartsWith(RetiredRuleVideoKeyPrefix, StringComparison.Ordinal), $"{culture}/{SharedFileName} still has '{RetiredRuleVideoKeyPrefix}*' keys");
    }

    [Test]
    public void Non_default_cultures_do_not_reuse_the_german_demo_video_captions()
    {
        var german = LoadSharedTexts(SupportedCultures.DefaultCode);

        foreach (var culture in CultureCodes.Where(c => c != SupportedCultures.DefaultCode))
        {
            var texts = LoadSharedTexts(culture);

            foreach (var key in CaptionKeys)
            {
                texts[key].ShouldNotBe(german[key], $"{culture}/{SharedFileName} '{key}' is a copy of the German text");
            }
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Carousel_headings_stay_short_and_pill_titles_are_not_too_long(string culture)
    {
        var texts = LoadSharedTexts(culture);

        foreach (var key in CarouselTitleKeys)
        {
            texts[key].Length.ShouldBeLessThanOrEqualTo(MaxCarouselTitleLength, $"{culture}/{SharedFileName} '{key}' is too long");
        }

        foreach (var key in VideoTextKeys.Where(k => k.EndsWith(".title", StringComparison.Ordinal) && !CarouselTitleKeys.Contains(k)))
        {
            texts[key].Length.ShouldBeLessThanOrEqualTo(MaxPillTitleLength, $"{culture}/{SharedFileName} '{key}' is too long for a pill");
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Every_culture_has_the_texts_every_carousel_definition_references(string culture)
    {
        var texts = LoadSharedTexts(culture);

        foreach (var definition in DemoCarousels.All)
        {
            var keys = new[] { definition.TitleKey, definition.SubtitleKey, definition.EyebrowKey, definition.HintKey }
                .Concat(definition.Videos.SelectMany(video => new[] { video.TitleKey, video.LabelKey, video.CaptionKey }))
                .OfType<string>();

            foreach (var key in keys)
            {
                texts.ShouldContainKey(key, $"{culture}/{SharedFileName} lacks '{key}' of carousel '{definition.SectionId}'");
                texts[key].ShouldNotBeNullOrWhiteSpace($"{culture}/{SharedFileName} has an empty '{key}'");
            }
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Carousel_headings_and_subtitles_differ_from_each_other_in_every_culture(string culture)
    {
        var texts = LoadSharedTexts(culture);

        CarouselTitleKeys.Select(key => texts[key]).ShouldBeUnique($"{culture}/{SharedFileName} reuses a carousel heading");
        CarouselSubtitleKeys.Select(key => texts[key]).ShouldBeUnique($"{culture}/{SharedFileName} reuses a carousel subtitle");
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Klacksy_hint_names_the_assistant_in_every_culture(string culture)
    {
        var texts = LoadSharedTexts(culture);

        foreach (var key in KlacksyHintKeys)
        {
            texts[key].ShouldContain(KlacksyName, Case.Sensitive, $"{culture}/{SharedFileName} '{key}' does not name {KlacksyName}");
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Carousel_slide_label_has_both_placeholders_in_every_culture(string culture)
    {
        var texts = LoadSharedTexts(culture);

        texts[SlideLabelKey].ShouldContain(SlideNumberPlaceholder, Case.Sensitive, $"{culture}/{SharedFileName} '{SlideLabelKey}' lacks {SlideNumberPlaceholder}");
        texts[SlideLabelKey].ShouldContain(SlideCountPlaceholder, Case.Sensitive, $"{culture}/{SharedFileName} '{SlideLabelKey}' lacks {SlideCountPlaceholder}");
    }

    private static Dictionary<string, string> LoadSharedTexts(string culture)
    {
        var path = Path.Combine(MarketingProjectPaths.ContentRoot, culture, SharedFileName);
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<Dictionary<string, string>>(json)
            ?? throw new InvalidOperationException($"{path} is empty.");
    }
}
