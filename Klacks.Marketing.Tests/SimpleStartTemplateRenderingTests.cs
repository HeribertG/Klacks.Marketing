// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Localization.Seo;
using Klacks.Marketing.Shared;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Renders the real SimpleStartTemplate for every country in German and in each translated culture (all 24, also without any recording): one H1, no duplicate id, every header jump target
/// present, no raw content key or placeholder, links stay on the country, the demo-data note sits below the media and
/// speaks in the Du form (structured data included), industry chips lead to real industry pages, the share block shows
/// the link with the share reference as selectable text below the copy status, the talk text spans the row without the
/// Klacksy video, and Amber surfaces always carry the dark Amber text colour.
/// </summary>
[TestFixture]
public class SimpleStartTemplateRenderingTests
{
    private const string H1Pattern = @"<h1\b[^>]*>(.*?)</h1>";
    private const string HtmlEntityPattern = @"&(?:[A-Za-z][A-Za-z0-9]*|#\d+|#x[0-9A-Fa-f]+);";
    private const string IdPattern = @"\bid=""([^""]+)""";
    private const string TextNodePattern = @">\s*([^<>]+?)\s*<";
    private const string LabelAttributePattern = @"\b(?:title|alt|aria-label)=""([^""]+)""";
    private const string ContentKeyPattern = @"^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9-]+)+$";
    private const string HrefPattern = @"\bhref=""(/[^""]*)""";
    private const string ClassPattern = @"\bclass=""([^""]*)""";
    private const string HeroPattern = @"<header\b.*?</header>";
    private const string FormalAddressPattern = @"\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b";
    private const string JsonLdPattern = @"<script type=""application/ld\+json"">(.*?)</script>";
    private const string SoftwareApplicationType = "SoftwareApplication";
    private const string TalkSectionPattern = @"<section id=""so-gehts"".*?</section>";
    private const string TextColumnFullWidth = "lg:col-span-12";
    private const string VideoColumn = "lg:col-span-7";
    private const string StatusMarker = "role=\"status\"";
    private const string UrlBreakMarkupPattern = @"<wbr\s*/?>|<span class=""whitespace-nowrap"">|</span>";
    private const string NoSelectClass = "select-none";
    private const string AmberSurface = "bg-tertiary-fixed";
    private const string AmberText = "text-on-tertiary-fixed";
    private const string DuNoteText = "In deiner eigenen Installation erfasst du deine eigenen Daten";
    private const string H1ClassPattern = @"<h1\b[^>]*\bclass=""([^""]*)""";
    private const string ManualHyphensClass = "hyphens-manual";
    private const string AutoHyphensClass = "hyphens-auto";
    private const string StartSectionPattern = @"<section id=""loslegen"".*?</section>";
    private const string StartPlaygroundButtonPattern = @"<button\b[^>]*\bclass=""([^""]*)""";
    private const string TopAlignedClasses = "flex flex-col items-start justify-start";

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
        CountryIndustries.ProductSlugs.ShouldContain(SimpleStartTemplate.CustomRulesSlug);
        links.ShouldContain($"/{country}/{SimpleStartTemplate.CustomRulesSlug}");
    }

    [Test]
    public async Task Hero_shows_only_text_without_video_screenshot_or_demo_note()
    {
        var html = await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog());

        var hero = Regex.Match(html, HeroPattern, RegexOptions.Singleline);
        hero.Success.ShouldBeTrue();
        hero.Value.ShouldNotContain("<video");
        hero.Value.ShouldNotContain("<img");
        hero.Value.ShouldNotContain(DemoDataNote.MarkerAttribute);
    }

    [Test]
    public async Task With_recordings_the_call_video_plays_like_the_expert_demo_videos_with_the_demo_note()
    {
        var html = await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog());

        html.ShouldContain($"{SimpleVideo.KlacksyCallVideoName}-de.webp");
        Regex.Matches(html, "class=\"rule-demo-video ").Count.ShouldBe(3);
        Regex.Matches(html, Regex.Escape(DemoDataNote.MarkerAttribute)).Count.ShouldBe(1);
    }

    [Test]
    public async Task Story_clip_opens_the_page_above_the_hero_with_its_question_controls_and_the_ai_note()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog()));

        html.ShouldContain("Kennst du diese Situation?");
        html.ShouldContain($"{SimpleVideo.StoryComicVideoName}-de.webp");
        html.ShouldContain(" controls");
        html.ShouldContain("Comic, mit KI erstellt.");
        html.IndexOf("simple-story-heading", StringComparison.Ordinal).ShouldBeLessThan(html.IndexOf("<h1", StringComparison.Ordinal));
    }

    [Test]
    public async Task Klacksy_intro_clip_sits_between_the_audience_chips_and_the_call_to_try_klacksy()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog()));

        html.ShouldContain($"{SimpleVideo.KlacksyIntroVideoName}-de.webp");
        html.ShouldContain("Klacksy stellt sich vor");
        html.IndexOf("simple-audience-heading", StringComparison.Ordinal).ShouldBeLessThan(html.IndexOf("simple-intro-heading", StringComparison.Ordinal));
        html.IndexOf("simple-intro-heading", StringComparison.Ordinal).ShouldBeLessThan(html.IndexOf("simple-start-heading", StringComparison.Ordinal));
    }

    [Test]
    public async Task Story_clips_run_in_one_carousel_replacement_first_then_the_week_plan()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog()));

        html.ShouldContain($"id=\"{DemoCarousels.SimpleStoriesSectionId}-slide\"");
        html.IndexOf(">Ausfall decken</button>", StringComparison.Ordinal).ShouldBeLessThan(html.IndexOf(">Wochenplanung</button>", StringComparison.Ordinal));
        html.IndexOf(DemoCarousels.SimpleStoriesSectionId, StringComparison.Ordinal).ShouldBeLessThan(html.IndexOf("<h1", StringComparison.Ordinal));
        Regex.Matches(html, "daily-ops-carousel-no-arrows").Count.ShouldBe(1);
    }

    [Test]
    public async Task Every_text_uses_the_du_form_including_the_demo_note_and_the_structured_data()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog()));

        html.ShouldContain(DuNoteText);
        VisibleTexts(html).Where(text => Regex.IsMatch(text, FormalAddressPattern)).ShouldBeEmpty();
    }

    [Test]
    public async Task Share_block_shows_the_absolute_link_as_selectable_text_below_the_copy_status()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey));
        var shareUrl = MarketingComponentHost.BaseUrl + CountryIndustries.SwissCountryPageKey + SimpleStartTemplate.ShareReferenceQuery;

        var block = WithoutUrlBreakMarkup(html[html.IndexOf($"id=\"{SimplePageSectionIds.Share}\"", StringComparison.Ordinal)..]);
        var status = block.IndexOf(StatusMarker, StringComparison.Ordinal);
        var link = block.IndexOf($">{shareUrl}<", StringComparison.Ordinal);

        status.ShouldBeGreaterThan(0);
        link.ShouldBeGreaterThan(status);
        block[..link].ShouldNotContain(NoSelectClass);
    }

    [Test]
    public async Task Mail_copy_and_visible_link_share_the_canonical_url_with_the_share_reference()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey));
        var shareUrl = MarketingComponentHost.BaseUrl + CountryIndustries.SwissCountryPageKey + SimpleStartTemplate.ShareReferenceQuery;

        SimpleStartTemplate.ShareReferenceQuery.ShouldBe("?ref=share");
        html.ShouldContain($"data-share-copy=\"{shareUrl}\"");
        WithoutUrlBreakMarkup(html).ShouldContain($">{shareUrl}<");
        html.ShouldContain(Uri.EscapeDataString(shareUrl));
    }

    [Test]
    public async Task Without_the_klacksy_video_the_talk_text_takes_the_full_width()
    {
        var talk = TalkSection(await RenderAsync(CountryIndustries.SwissCountryPageKey, new EmptyVideoCatalog()));

        talk.ShouldContain(TextColumnFullWidth);
        talk.ShouldNotContain(VideoColumn);
        talk.ShouldNotContain("<video");
    }

    [Test]
    public async Task With_the_klacksy_video_the_talk_section_keeps_the_two_columns()
    {
        var talk = TalkSection(await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog()));

        talk.ShouldContain(VideoColumn);
        talk.ShouldNotContain(TextColumnFullWidth);
    }

    [Test]
    public async Task Structured_data_describes_the_product_with_the_simple_meta_description()
    {
        var html = await RenderAsync(CountryIndustries.SwissCountryPageKey);

        SoftwareApplicationDescription(html).ShouldBe(SeoText.ToDescription(Content.GetText(SupportedCultures.DefaultCode, SiteModes.SimpleContentKey, "metaDescription")));
    }

    [Test]
    public async Task Expert_start_page_keeps_the_index_pitch_as_product_description()
    {
        var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, CountryIndustries.SwissCountryPageKey));
        var html = await MarketingComponentHost.RenderAsync<CountryStartTemplate>(services, new Dictionary<string, object?>
        {
            [nameof(CountryStartTemplate.PageKey)] = CountryIndustries.SwissCountryPageKey,
            [nameof(CountryStartTemplate.Culture)] = SupportedCultures.DefaultCode,
        });

        SoftwareApplicationDescription(html).ShouldBe(SeoText.ToDescription(Content.GetText(SupportedCultures.DefaultCode, "index", "hero.subtitle")));
    }

    [Test]
    public async Task Hero_title_breaks_only_at_manual_hyphenation_points()
    {
        var html = await RenderAsync(CountryIndustries.SwissCountryPageKey);

        var classes = Regex.Match(html, H1ClassPattern).Groups[1].Value.Split(' ');
        classes.ShouldContain(ManualHyphensClass);
        classes.ShouldNotContain(AutoHyphensClass);
    }

    [Test]
    public async Task Start_playground_card_aligns_its_content_to_the_top_like_its_neighbours()
    {
        var html = await RenderAsync(CountryIndustries.SwissCountryPageKey);
        var start = Regex.Match(html, StartSectionPattern, RegexOptions.Singleline);
        start.Success.ShouldBeTrue();

        var buttonClasses = Regex.Match(start.Value, StartPlaygroundButtonPattern).Groups[1].Value;
        buttonClasses.ShouldContain(TopAlignedClasses);
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
    public async Task Playground_buttons_carry_the_demo_event_and_the_ai_section_names_cloud_and_local_providers()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey));

        html.Split("data-c=\"DemoModalOpened\"").Length.ShouldBe(3);
        foreach (var provider in KlacksyModelProviders.Names)
        {
            html.ShouldContain(provider);
        }
        html.ShouldContain("Lokale KI deiner Wahl (Ollama, LM Studio)");
        html.ShouldContain("… und vieles mehr");
    }

    [TestCase("en", "land-gb", "Workforce planning", "United Kingdom")]
    [TestCase("en", "land-ch", "Workforce planning", "Switzerland")]
    [TestCase("fr", "land-ch", "planification du personnel", "Suisse")]
    [TestCase("fr", "land-be", "planification du personnel", "Belgique")]
    [TestCase("it", "land-it", "Pianificazione del personale", "Italia")]
    [TestCase("it", "land-ch", "Pianificazione del personale", "Svizzera")]
    public async Task Translated_simple_page_renders_in_its_culture_without_any_recording(string culture, string country, string h1Term, string countryName)
    {
        var slug = SupportedCultures.All.First(record => record.Code == culture).UrlSlug;
        var html = WebUtility.HtmlDecode(await RenderAsync(country, new EmptyVideoCatalog(), culture));

        var h1 = Regex.Matches(html, H1Pattern, RegexOptions.Singleline);
        h1.Count.ShouldBe(1);
        h1[0].Groups[1].Value.ShouldContain(h1Term);
        Regex.Matches(html, IdPattern).Select(match => match.Groups[1].Value).GroupBy(id => id).Where(group => group.Count() > 1).ShouldBeEmpty();
        RawKeys(html).ShouldBeEmpty();
        html.ShouldNotContain("{country}");
        html.ShouldNotContain("simple-story-heading");
        html.ShouldNotContain("simple-intro-heading");
        html.ShouldNotContain("<video");
        TalkSection(html).ShouldContain(TextColumnFullWidth);
        Regex.Matches(html, Regex.Escape(DemoDataNote.MarkerAttribute)).Count.ShouldBe(0);

        foreach (var german in new[] { "Personalplanung", "Klacksy ausprobieren", "Expertenmodus", "Hinweis zu den Beispieldaten", "Schweiz" })
        {
            html.ShouldNotContain(german, Case.Sensitive, $"{culture}: German text '{german}'");
        }

        SoftwareApplicationDescription(html).ShouldBe(SeoText.ToDescription(Content.GetText(culture, SiteModes.SimpleContentKey, "metaDescription")));
        Content.GetText(culture, SiteModes.SimpleContentKey, "pageTitle").ShouldContain("{country}");
        countryName.ShouldBe(Content.FindText(culture, SiteModes.CountryNamesContentKey, country));

        var links = Regex.Matches(html, HrefPattern).Select(match => match.Groups[1].Value).ToList();
        links.ShouldAllBe(link => link.StartsWith($"/{slug}/{country}", StringComparison.Ordinal));
        links.ShouldContain($"/{slug}/{country}/{SiteModes.ExpertSlug}");
        links.ShouldContain($"/{slug}/{country}/{CountryPageLinks.InstallationSlug}#{PageSectionIds.OfficePc}");
        foreach (var industry in SimpleStartTemplate.AudienceSlugs)
        {
            links.ShouldContain($"/{slug}/{country}/{industry}");
        }
    }

    private static IEnumerable<TestCaseData> CulturePageCombinations
        => SupportedCultures.All.Where(culture => culture.UrlSlug.Length > 0)
            .SelectMany(culture => new[] { LanguageCountries.DefaultCountryFor(culture.Code), CountryIndustries.SwissCountryPageKey }
                .Distinct().Select(country => new TestCaseData(culture.Code, country).SetArgDisplayNames(culture.Code, country)));

    [TestCaseSource(nameof(CulturePageCombinations))]
    public async Task Every_translated_culture_renders_its_own_simple_page_with_plain_entities_and_no_german_text(string culture, string country)
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(country, new EmptyVideoCatalog(), culture));
        var slug = SupportedCultures.All.First(record => record.Code == culture).UrlSlug;
        var heroTitle = Content.GetText(culture, SiteModes.SimpleContentKey, "hero.title");

        var h1 = Regex.Matches(html, H1Pattern, RegexOptions.Singleline);
        h1.Count.ShouldBe(1, $"{culture}/{country}");
        WebUtility.HtmlDecode(h1[0].Groups[1].Value).ShouldBe(heroTitle, $"{culture}/{country}");
        Regex.Matches(html, IdPattern).Select(match => match.Groups[1].Value).GroupBy(id => id).Where(group => group.Count() > 1).ShouldBeEmpty();
        RawKeys(html).ShouldBeEmpty();
        html.ShouldNotContain("{country}");
        VisibleTexts(html).Where(text => Regex.IsMatch(text, HtmlEntityPattern)).ShouldBeEmpty($"{culture}/{country}: HTML entity shown as text");
        foreach (var german in new[] { "Personalplanung", "Klacksy ausprobieren", "Expertenmodus", "Hinweis zu den Beispieldaten" })
        {
            html.ShouldNotContain(german, Case.Sensitive, $"{culture}: German text '{german}'");
        }

        Regex.Matches(html, HrefPattern).Select(match => match.Groups[1].Value)
            .ShouldAllBe(link => link.StartsWith($"/{slug}/{country}", StringComparison.Ordinal), $"{culture}/{country}");
    }

    [TestCase("en")]
    [TestCase("fr")]
    [TestCase("it")]
    public async Task Translated_simple_page_shares_its_own_culture_url(string culture)
    {
        var slug = SupportedCultures.All.First(record => record.Code == culture).UrlSlug;
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey, new EmptyVideoCatalog(), culture));
        var shareUrl = $"{MarketingComponentHost.BaseUrl}{slug}/{CountryIndustries.SwissCountryPageKey}{SimpleStartTemplate.ShareReferenceQuery}";

        html.ShouldContain($"data-share-copy=\"{shareUrl}\"");
    }

    [TestCase("en")]
    [TestCase("fr")]
    [TestCase("it")]
    public async Task With_recordings_in_the_culture_the_story_clip_and_the_call_video_use_the_culture_files(string culture)
    {
        var html = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey, new StubVideoCatalog(), culture));

        html.ShouldContain($"{SimpleVideo.StoryComicVideoName}-{culture}.webp");
        html.ShouldContain($"{SimpleVideo.KlacksyCallVideoName}-{culture}.webp");
        html.ShouldNotContain("-de.webp");
        html.ShouldContain(Content.GetText(culture, SiteModes.SimpleContentKey, "story.note"));
    }

    private static IPageContentProvider Content => new JsonPageContentProvider(new TestWebHostEnvironment());

    private static string TalkSection(string html)
    {
        var match = Regex.Match(html, TalkSectionPattern, RegexOptions.Singleline);
        match.Success.ShouldBeTrue();
        return match.Value;
    }

    private static string? SoftwareApplicationDescription(string html)
    {
        foreach (Match match in Regex.Matches(html, JsonLdPattern, RegexOptions.Singleline))
        {
            using var document = JsonDocument.Parse(match.Groups[1].Value);
            if (document.RootElement.TryGetProperty("@type", out var type) && type.GetString() == SoftwareApplicationType)
            {
                return document.RootElement.GetProperty("description").GetString();
            }
        }

        return null;
    }

    private static IEnumerable<string> VisibleTexts(string html)
        => Regex.Matches(html, TextNodePattern).Select(match => match.Groups[1].Value)
            .Concat(Regex.Matches(html, LabelAttributePattern).Select(match => match.Groups[1].Value));

    private static IEnumerable<string> RawKeys(string html)
        => VisibleTexts(html).Where(text => Regex.IsMatch(text.Trim(), ContentKeyPattern)).Distinct();

    private static Task<string> RenderAsync(string country, ILocalizedVideoCatalog? catalog = null, string culture = SupportedCultures.DefaultCode)
    {
        var slug = SupportedCultures.All.First(record => record.Code == culture).UrlSlug;
        var relativePath = slug.Length == 0 ? country : $"{slug}/{country}";
        var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, relativePath), catalog);

        return MarketingComponentHost.RenderAsync<SimpleStartTemplate>(services, new Dictionary<string, object?>
        {
            [nameof(SimpleStartTemplate.PageKey)] = country,
            [nameof(SimpleStartTemplate.Culture)] = culture,
        });
    }

    private static string WithoutUrlBreakMarkup(string html) => Regex.Replace(html, UrlBreakMarkupPattern, string.Empty);
}
