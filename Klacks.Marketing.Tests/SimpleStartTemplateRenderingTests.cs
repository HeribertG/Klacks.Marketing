// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Renders the real SimpleStartTemplate for every country in German: one H1, no duplicate id, every header jump target
/// present, no raw content key or placeholder, links stay on the country, the demo-data note sits below the media and
/// speaks in the Du form, industry chips lead to real industry pages, the share block shows the link as selectable
/// text below the copy status, and Amber surfaces always carry the dark Amber text colour.
/// </summary>
[TestFixture]
public class SimpleStartTemplateRenderingTests
{
    private const string H1Pattern = @"<h1\b[^>]*>(.*?)</h1>";
    private const string IdPattern = @"\bid=""([^""]+)""";
    private const string TextNodePattern = @">\s*([^<>]+?)\s*<";
    private const string LabelAttributePattern = @"\b(?:title|alt|aria-label)=""([^""]+)""";
    private const string ContentKeyPattern = @"^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9-]+)+$";
    private const string HrefPattern = @"\bhref=""(/[^""]*)""";
    private const string ClassPattern = @"\bclass=""([^""]*)""";
    private const string ImageSourcePattern = @"<img\b[^>]*\bsrc=""(images/[^""]+)""";
    private const string FormalAddressPattern = @"\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b";
    private const string ScriptPattern = @"<script\b.*?</script>";
    private const string StatusMarker = "role=\"status\"";
    private const string NoSelectClass = "select-none";
    private const string AmberSurface = "bg-tertiary-fixed";
    private const string AmberText = "text-on-tertiary-fixed";
    private const string DuNoteText = "In deiner eigenen Installation erfasst du deine eigenen Daten";

    private static IEnumerable<string> Countries => CountryIndustries.AllCountries;

    [TestCaseSource(nameof(Countries))]
    public async Task Simple_page_renders_one_h1_unique_ids_jump_targets_and_no_raw_key(string country)
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(country));

        var h1 = Regex.Matches(html, H1Pattern, RegexOptions.Singleline);
        h1.Count.ShouldBe(1);
        h1[0].Groups[1].Value.ShouldContain("Personal");

        var ids = Regex.Matches(html, IdPattern).Select(match => match.Groups[1].Value).ToList();
        ids.GroupBy(id => id).Where(group => group.Count() > 1).Select(group => group.Key).ShouldBeEmpty();
        foreach (var anchor in SimplePageSectionIds.Navigation)
        {
            ids.ShouldContain(anchor.Id);
        }

        ids.ShouldContain(SimplePageSectionIds.Share);
        RawKeys(html).ShouldBeEmpty();
        html.ShouldNotContain("{country}");
    }

    [TestCaseSource(nameof(Countries))]
    public async Task Internal_links_stay_on_the_country_and_reach_the_expert_install_and_industry_pages(string country)
    {
        var html = await RenderAsync(country);

        var links = Regex.Matches(html, HrefPattern).Select(match => match.Groups[1].Value).ToList();
        links.ShouldAllBe(link => link.StartsWith($"/{country}", StringComparison.Ordinal));
        links.ShouldContain($"/{country}/{SiteModes.ExpertSlug}");
        links.ShouldContain($"/{country}/{CountryPageLinks.InstallationSlug}#{PageSectionIds.OfficePc}");
        links.ShouldContain($"/{country}#{SimplePageSectionIds.Share}");
        foreach (var slug in SimpleStartTemplate.AudienceSlugs)
        {
            CountryIndustries.ProductSlugs.ShouldContain(slug);
            links.ShouldContain($"/{country}/{slug}");
        }
    }

    [Test]
    public async Task Without_recordings_the_hero_shows_an_existing_screenshot_and_the_demo_note()
    {
        var html = await RenderAsync(CountryIndustries.SwissCountryPageKey, new EmptyVideoCatalog());

        var image = Regex.Match(html, ImageSourcePattern);
        image.Success.ShouldBeTrue();
        File.Exists(Path.Combine(MarketingProjectPaths.WebRoot, image.Groups[1].Value)).ShouldBeTrue(image.Groups[1].Value);
        Regex.Matches(html, Regex.Escape(DemoDataNote.MarkerAttribute)).Count.ShouldBe(1);
    }

    [Test]
    public async Task With_recordings_both_videos_render_click_to_play_and_each_has_the_demo_note()
    {
        var html = await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog());

        html.ShouldContain($"{SimpleVideo.PlansWeekVideoName}-de.webp");
        html.ShouldContain($"{SimpleVideo.KlacksyCallVideoName}-de.webp");
        html.ShouldNotContain("autoplay");
        Regex.Matches(html, Regex.Escape(DemoDataNote.MarkerAttribute)).Count.ShouldBe(2);
    }

    [Test]
    public async Task Every_visible_text_uses_the_du_form_including_the_demo_note()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog()));

        html.ShouldContain(DuNoteText);
        VisibleTexts(Regex.Replace(html, ScriptPattern, string.Empty, RegexOptions.Singleline)).Where(text => Regex.IsMatch(text, FormalAddressPattern)).ShouldBeEmpty();
    }

    [Test]
    public async Task Share_block_shows_the_absolute_link_as_selectable_text_below_the_copy_status()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey));
        var shareUrl = MarketingComponentHost.BaseUrl + CountryIndustries.SwissCountryPageKey;

        var block = html[html.IndexOf($"id=\"{SimplePageSectionIds.Share}\"", StringComparison.Ordinal)..];
        var status = block.IndexOf(StatusMarker, StringComparison.Ordinal);
        var link = block.IndexOf($">{shareUrl}<", StringComparison.Ordinal);

        status.ShouldBeGreaterThan(0);
        link.ShouldBeGreaterThan(status);
        block[..link].ShouldNotContain(NoSelectClass);
    }

    [Test]
    public async Task Amber_surfaces_always_use_the_dark_amber_text()
    {
        var html = await RenderAsync(CountryIndustries.SwissCountryPageKey);

        var amber = Regex.Matches(html, ClassPattern).Select(match => match.Groups[1].Value)
            .Where(classes => classes.Split(' ').Contains(AmberSurface)).ToList();
        amber.ShouldNotBeEmpty();
        amber.ShouldAllBe(classes => classes.Split(' ').Contains(AmberText) && !classes.Contains("text-white"));
    }

    [Test]
    public async Task Playground_buttons_carry_the_demo_event_and_the_ai_section_names_the_providers()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey));

        html.Split("data-c=\"DemoModalOpened\"").Length.ShouldBe(3);
        foreach (var provider in KlacksyModelProviders.Names)
        {
            html.ShouldContain(provider);
        }
    }

    private static IEnumerable<string> VisibleTexts(string html)
        => Regex.Matches(html, TextNodePattern).Select(match => match.Groups[1].Value)
            .Concat(Regex.Matches(html, LabelAttributePattern).Select(match => match.Groups[1].Value));

    private static IEnumerable<string> RawKeys(string html)
        => VisibleTexts(html).Where(text => Regex.IsMatch(text.Trim(), ContentKeyPattern)).Distinct();

    private static Task<string> RenderAsync(string country, ILocalizedVideoCatalog? catalog = null)
    {
        var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, country), catalog);

        return MarketingComponentHost.RenderAsync<SimpleStartTemplate>(services, new Dictionary<string, object?>
        {
            [nameof(SimpleStartTemplate.PageKey)] = country,
            [nameof(SimpleStartTemplate.Culture)] = SupportedCultures.DefaultCode,
        });
    }
}
