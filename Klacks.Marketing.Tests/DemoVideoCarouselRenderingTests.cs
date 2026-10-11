// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.JSInterop;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Renders the real DemoVideoCarousel component (static HTML renderer, fake catalog and texts) once per carousel
/// definition and checks what a visitor gets: only recorded videos become pills, an empty or unrecorded carousel renders
/// nothing, and the instances of one page share no DOM id.
/// </summary>
[TestFixture]
public class DemoVideoCarouselRenderingTests
{
    private const string Culture = "de";
    private const string SlideLabelKey = "dailyOps.slideLabel";
    private const string SlideLabelFormat = "{0}/{1}";
    private const string PillClass = "rounded-full px-4 py-2";
    private const int DefaultVideoWidth = 1280;
    private const int DefaultVideoHeight = 800;
    private const int KlacksyVideoWidth = 1000;
    private const int KlacksyVideoHeight = 720;

    [Test]
    public async Task Every_carousel_with_recorded_videos_renders_one_pill_per_video_in_definition_order()
    {
        var catalog = new FakeVideoCatalog(AllVideoNames());

        var rules = await RenderAsync(DemoCarousels.Rules, catalog);
        var scenarios = await RenderAsync(DemoCarousels.Scenarios, catalog);
        var daily = await RenderAsync(DemoCarousels.DailyOperations, catalog);
        var containers = await RenderAsync(DemoCarousels.Containers, catalog);
        var specialShifts = await RenderAsync(DemoCarousels.SporadicTimeRange, catalog);
        var klacksy = await RenderAsync(DemoCarousels.Klacksy, catalog);

        PillTitles(rules).ShouldBe(DemoCarousels.Rules.Videos.Select(video => video.TitleKey));
        PillTitles(scenarios).ShouldBe(DemoCarousels.Scenarios.Videos.Select(video => video.TitleKey));
        PillTitles(daily).ShouldBe(DemoCarousels.DailyOperations.Videos.Select(video => video.TitleKey));
        PillTitles(containers).ShouldBe(DemoCarousels.Containers.Videos.Select(video => video.TitleKey));
        PillTitles(specialShifts).ShouldBe(DemoCarousels.SporadicTimeRange.Videos.Select(video => video.TitleKey));
        PillTitles(klacksy).ShouldBe(DemoCarousels.Klacksy.Videos.Select(video => video.TitleKey));
        rules.ShouldContain("aria-label=\"1/4\"");
        scenarios.ShouldContain("aria-label=\"1/4\"");
        daily.ShouldContain("aria-label=\"1/6\"");
        containers.ShouldContain("aria-label=\"1/5\"");
        specialShifts.ShouldContain("aria-label=\"1/5\"");
        klacksy.ShouldContain("aria-label=\"1/4\"");
    }

    [Test]
    public async Task Each_instance_shows_its_own_heading_and_subtitle_and_only_the_first_slide()
    {
        var catalog = new FakeVideoCatalog(AllVideoNames());

        var daily = await RenderAsync(DemoCarousels.DailyOperations, catalog);
        var containers = await RenderAsync(DemoCarousels.Containers, catalog);

        daily.ShouldContain(">dailyOps.title<");
        daily.ShouldContain(">dailyOps.subtitle<");
        containers.ShouldContain(">containerOps.title<");
        containers.ShouldContain(">containerOps.subtitle<");
        containers.ShouldNotContain("dailyOps.title");
        Regex.Matches(daily, "<video ").Count.ShouldBe(1);
        Regex.Matches(containers, "<video ").Count.ShouldBe(1);
        daily.ShouldContain("videos/expenses-de.webm");
        containers.ShouldContain("videos/container-fill-de.webm");
    }

    [Test]
    public async Task Dom_ids_of_all_instances_on_one_page_are_unique_and_the_controls_point_at_their_own_slide()
    {
        var catalog = new FakeVideoCatalog(AllVideoNames());

        var daily = await RenderAsync(DemoCarousels.DailyOperations, catalog);
        var containers = await RenderAsync(DemoCarousels.Containers, catalog);

        var ids = IdsOf(daily).Concat(IdsOf(containers)).ToList();
        ids.ShouldNotBeEmpty();
        ids.ShouldBeUnique();
        IdsOf(daily).ShouldBe(new[] { "alltag", "alltag-heading", "alltag-slide" });
        IdsOf(containers).ShouldBe(new[] { "spezialdienste-container", "spezialdienste-container-heading", "spezialdienste-container-slide" });
        daily.ShouldContain("aria-labelledby=\"alltag-heading\"");
        containers.ShouldContain("aria-labelledby=\"spezialdienste-container-heading\"");
        Regex.Matches(daily, "aria-controls=\"([^\"]+)\"").Select(match => match.Groups[1].Value).Distinct().ShouldBe(new[] { "alltag-slide" });
        Regex.Matches(containers, "aria-controls=\"([^\"]+)\"").Select(match => match.Groups[1].Value).Distinct().ShouldBe(new[] { "spezialdienste-container-slide" });
        Regex.Matches(daily, "data-carousel[ >]").Count.ShouldBe(1);
        Regex.Matches(containers, "data-carousel[ >]").Count.ShouldBe(1);
    }

    [Test]
    public async Task Culture_with_only_some_container_videos_shows_just_those_pills_and_the_slide_count_follows()
    {
        var catalog = new FakeVideoCatalog(
            DemoVideo.ContainerFillVideoName,
            DemoVideo.ContainerPauseVideoName,
            DemoVideo.ContainerSplitVideoName);

        var containers = await RenderAsync(DemoCarousels.Containers, catalog);

        PillTitles(containers).ShouldBe(new[] { "containerFillDemo.title", "containerPauseDemo.title", "containerSplitDemo.title" });
        containers.ShouldContain("aria-label=\"1/3\"");
        containers.ShouldContain("videos/container-fill-de.webm");
        containers.ShouldNotContain("container-autofill");
        containers.ShouldNotContain("container-route");
    }

    [Test]
    public async Task Culture_with_a_single_recorded_video_still_renders_a_one_slide_carousel()
    {
        var catalog = new FakeVideoCatalog(DemoVideo.ContainerSplitVideoName);

        var containers = await RenderAsync(DemoCarousels.Containers, catalog);

        PillTitles(containers).ShouldBe(new[] { "containerSplitDemo.title" });
        containers.ShouldContain("aria-label=\"1/1\"");
    }

    [Test]
    public async Task Carousel_without_any_recorded_video_in_the_culture_renders_nothing_while_the_others_are_unaffected()
    {
        var catalog = new FakeVideoCatalog(DemoCarousels.DailyOperations.Videos.Select(video => video.VideoName).ToArray());

        var daily = await RenderAsync(DemoCarousels.DailyOperations, catalog);
        var containers = await RenderAsync(DemoCarousels.Containers, catalog);

        daily.ShouldNotBeNullOrWhiteSpace();
        containers.Trim().ShouldBeEmpty();
    }

    [Test]
    public async Task Special_shift_carousel_renders_five_pills_in_the_agreed_order_with_its_own_heading_and_ids()
    {
        var catalog = new FakeVideoCatalog(AllVideoNames());

        var rendered = await RenderAsync(DemoCarousels.SporadicTimeRange, catalog);

        PillTitles(rendered).ShouldBe(new[]
        {
            "shiftSporadicDemo.title",
            "shiftTimeRangeDemo.title",
            "shiftSumEmployeesDemo.title",
            "shiftQuantityDemo.title",
            "shiftQualificationDemo.title",
        });
        rendered.ShouldContain("aria-label=\"1/5\"");
        rendered.ShouldContain("videos/shift-sporadic-de.webm");
        rendered.ShouldContain(">sporadicOps.title<");
        rendered.ShouldContain(">sporadicOps.subtitle<");
        IdsOf(rendered).ShouldBe(new[] { DemoCarousels.SporadicTimeRangeSectionId, DemoCarousels.SporadicTimeRangeSectionId + "-heading", DemoCarousels.SporadicTimeRangeSectionId + "-slide" });
    }

    [Test]
    public async Task Klacksy_carousel_renders_four_pills_at_the_chat_viewport_size_with_its_own_heading_and_ids_and_no_tip()
    {
        var catalog = new FakeVideoCatalog(AllVideoNames());

        var rendered = await RenderAsync(DemoCarousels.Klacksy, catalog);

        PillTitles(rendered).ShouldBe(new[]
        {
            "klacksyPlansWeek.title",
            "klacksyGroupsAddress.title",
            "klacksyGroupsQualification.title",
            "klacksyGroupsMixed.title",
        });
        rendered.ShouldContain("aria-label=\"1/4\"");
        rendered.ShouldContain("videos/klacksy-plans-week-de.webm");
        rendered.ShouldContain(">klacksyOps.title<");
        rendered.ShouldContain(">klacksyOps.subtitle<");
        rendered.ShouldContain($"width=\"{KlacksyVideoWidth}\" height=\"{KlacksyVideoHeight}\"");
        rendered.ShouldNotContain($"width=\"{DefaultVideoWidth}\"");
        rendered.ShouldNotContain("klacksyHint");
        rendered.ShouldNotContain("dailyOps.eyebrow");
        IdsOf(rendered).ShouldBe(new[] { DemoCarousels.KlacksySectionId, DemoCarousels.KlacksySectionId + "-heading", DemoCarousels.KlacksySectionId + "-slide" });
    }

    [Test]
    public async Task Carousels_without_an_own_video_size_render_the_default_size()
    {
        var catalog = new FakeVideoCatalog(AllVideoNames());

        var daily = await RenderAsync(DemoCarousels.DailyOperations, catalog);

        daily.ShouldContain($"width=\"{DefaultVideoWidth}\" height=\"{DefaultVideoHeight}\"");
        daily.ShouldNotContain($"width=\"{KlacksyVideoWidth}\"");
    }

    [Test]
    public async Task Klacksy_carousel_in_a_culture_with_only_the_plans_week_video_renders_a_one_slide_carousel_and_without_it_nothing()
    {
        var onlyPlansWeek = await RenderAsync(DemoCarousels.Klacksy, new FakeVideoCatalog(DemoVideo.KlacksyPlansWeekVideoName));
        var none = await RenderAsync(DemoCarousels.Klacksy, new FakeVideoCatalog(DemoCarousels.DailyOperations.Videos.Select(video => video.VideoName).ToArray()));

        PillTitles(onlyPlansWeek).ShouldBe(new[] { "klacksyPlansWeek.title" });
        onlyPlansWeek.ShouldContain("aria-label=\"1/1\"");
        none.Trim().ShouldBeEmpty();
    }

    [Test]
    public async Task Scenario_carousel_renders_four_pills_with_its_own_heading_ids_and_klacksy_tip()
    {
        var catalog = new FakeVideoCatalog(AllVideoNames());

        var rendered = await RenderAsync(DemoCarousels.Scenarios, catalog);

        PillTitles(rendered).ShouldBe(new[]
        {
            "scenarioCreateDemo.title",
            "scenarioAutoWizardDemo.title",
            "scenarioCompareDemo.title",
            "scenarioRuleDemo.title",
        });
        rendered.ShouldContain("aria-label=\"1/4\"");
        rendered.ShouldContain("videos/scenario-create-de.webm");
        rendered.ShouldContain(">scenarioOps.title<");
        rendered.ShouldContain(">scenarioOps.subtitle<");
        rendered.ShouldContain(">scenarioOps.klacksyHint<");
        rendered.ShouldNotContain("dailyOps.eyebrow");
        IdsOf(rendered).ShouldBe(new[] { DemoCarousels.ScenariosSectionId, DemoCarousels.ScenariosSectionId + "-heading", DemoCarousels.ScenariosSectionId + "-slide" });
    }

    [Test]
    public async Task Rule_carousel_renders_four_pills_with_its_own_heading_and_ids_and_no_klacksy_tip()
    {
        var catalog = new FakeVideoCatalog(AllVideoNames());

        var rendered = await RenderAsync(DemoCarousels.Rules, catalog);

        PillTitles(rendered).ShouldBe(new[]
        {
            "ruleConflictDemo.title",
            "ruleCollisionDemo.title",
            "ruleConsecutiveDaysDemo.title",
            "ruleHolidayWorkDemo.title",
        });
        rendered.ShouldContain("aria-label=\"1/4\"");
        rendered.ShouldContain("videos/rest-conflict-de.webm");
        rendered.ShouldContain(">ruleOps.title<");
        rendered.ShouldContain(">ruleOps.subtitle<");
        rendered.ShouldNotContain("klacksyHint");
        rendered.ShouldNotContain("dailyOps.eyebrow");
        IdsOf(rendered).ShouldBe(new[] { DemoCarousels.RulesSectionId, DemoCarousels.RulesSectionId + "-heading", DemoCarousels.RulesSectionId + "-slide" });
    }

    [Test]
    public async Task Rule_carousel_renders_nothing_in_a_culture_without_any_of_its_videos()
    {
        var catalog = new FakeVideoCatalog(DemoCarousels.DailyOperations.Videos.Concat(DemoCarousels.Containers.Videos).Select(video => video.VideoName).ToArray());

        var rules = await RenderAsync(DemoCarousels.Rules, catalog);

        rules.Trim().ShouldBeEmpty();
    }

    [Test]
    public async Task Scenario_carousel_renders_nothing_in_a_culture_without_any_of_its_videos()
    {
        var catalog = new FakeVideoCatalog(DemoCarousels.DailyOperations.Videos.Concat(DemoCarousels.Containers.Videos).Select(video => video.VideoName).ToArray());

        var scenarios = await RenderAsync(DemoCarousels.Scenarios, catalog);

        scenarios.Trim().ShouldBeEmpty();
    }

    [Test]
    public async Task Special_shift_carousel_renders_nothing_in_a_culture_without_any_of_its_videos()
    {
        var catalog = new FakeVideoCatalog(DemoCarousels.DailyOperations.Videos.Concat(DemoCarousels.Containers.Videos).Select(video => video.VideoName).ToArray());

        var specialShifts = await RenderAsync(DemoCarousels.SporadicTimeRange, catalog);

        specialShifts.Trim().ShouldBeEmpty();
    }

    [Test]
    public async Task Eyebrow_and_klacksy_tip_are_rendered_for_the_everyday_carousel_only()
    {
        var catalog = new FakeVideoCatalog(AllVideoNames());

        var daily = await RenderAsync(DemoCarousels.DailyOperations, catalog);
        var containers = await RenderAsync(DemoCarousels.Containers, catalog);

        daily.ShouldContain(">dailyOps.eyebrow<");
        daily.ShouldContain(">dailyOps.hintLabel<");
        daily.ShouldContain(">dailyOps.klacksyHint<");
        daily.ShouldContain("mt-4");
        containers.ShouldNotContain("dailyOps.eyebrow");
        containers.ShouldNotContain("dailyOps.hintLabel");
        containers.ShouldNotContain("klacksyHint");
    }

    private static string[] AllVideoNames() =>
        DemoCarousels.All.SelectMany(definition => definition.Videos).Select(video => video.VideoName).ToArray();

    private static IEnumerable<string> PillTitles(string html)
    {
        var pillBar = Regex.Match(html, @"role=""group"" aria-label=""[^""]*"">(.*?)</div>", RegexOptions.Singleline).Groups[1].Value;
        pillBar.Split(new[] { PillClass }, StringSplitOptions.None).Length.ShouldBeGreaterThan(1);
        return Regex.Matches(pillBar, @"<button\b[^>]*>([^<]+)</button>").Select(match => match.Groups[1].Value);
    }

    private static List<string> IdsOf(string html) =>
        Regex.Matches(html, @"\bid=""([^""]+)""").Select(match => match.Groups[1].Value).ToList();

    private static async Task<string> RenderAsync(DemoCarouselDefinition definition, ILocalizedVideoCatalog catalog)
    {
        var services = new ServiceCollection()
            .AddSingleton(catalog)
            .AddSingleton<IPageContentProvider>(new KeyEchoContentProvider())
            .AddSingleton<IJSRuntime>(new ReducedMotionOffJsRuntime())
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<DemoVideoCarousel>(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(DemoVideoCarousel.Culture)] = Culture,
                [nameof(DemoVideoCarousel.Definition)] = definition,
            }));
            return output.ToHtmlString();
        });
    }

    private sealed class FakeVideoCatalog(params string[] availableVideoNames) : ILocalizedVideoCatalog
    {
        public LocalizedVideoSources? Find(string videoName, string culture) =>
            availableVideoNames.Contains(videoName)
                ? new LocalizedVideoSources($"videos/{videoName}-{culture}.webm", $"videos/{videoName}-{culture}.mp4", $"videos/{videoName}-{culture}.webp")
                : null;
    }

    private sealed class KeyEchoContentProvider : IPageContentProvider
    {
        public string GetText(string cultureCode, string contentKey, string textKey) =>
            textKey == SlideLabelKey ? SlideLabelFormat : textKey;

        public IndustryPageContent GetIndustryPage(string cultureCode, string pageKey) => throw new NotSupportedException();

        public InstallPageContent GetInstallPage(string cultureCode, string pageKey) => throw new NotSupportedException();

        public bool HasContentIn(string cultureCode, string pageKey) => throw new NotSupportedException();

        public string? FindText(string cultureCode, string contentKey, string textKey) => throw new NotSupportedException();
    }

    private sealed class ReducedMotionOffJsRuntime : IJSRuntime
    {
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args) => ValueTask.FromResult(default(TValue)!);

        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args) =>
            ValueTask.FromResult(default(TValue)!);
    }
}
