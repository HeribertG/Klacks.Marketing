// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Localization.Seo;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Routing of the start pages through the real app: with the feature on, the country root of every supported culture
/// ("/land-ch", "/en/land-gb", "/fr/land-ch", "/es/land-es", "/zh-tw/land-tw", ...) is the simple page of its culture
/// (localized title with the country name in the page language, canonical on itself, indexable in every culture with
/// its simple.json and a land-xx hreflang cluster over all those cultures, since the page renders no land-xx.json
/// text); the expert start page stays indexable only where the culture has own country text; with the feature off,
/// every country root is today's page.
/// </summary>
[TestFixture]
public class SimpleStartPageTests
{
    private const string SimpleHeroText = "Personalplanung mit Klacks.";
    private const string ExpertHeroText = "Frühschicht unbesetzt?";
    private const string HreflangMarker = "hreflang=";
    private const string NoindexMarker = "name=\"robots\" content=\"noindex";
    private const string SiteBaseUrl = "https://klacks-software.ch";
    private const string H1Pattern = @"<h1\b[^>]*>(.*?)</h1>";
    private const string BodyClassPattern = @"<body class=""(mode-simple|mode-expert)\b";

    [Test]
    public async Task German_country_root_is_the_simple_page_with_title_canonical_and_hreflang()
    {
        var html = await GetHtmlAsync(enabled: true, "/land-ch");

        html.ShouldContain(SimpleHeroText);
        html.ShouldNotContain(ExpertHeroText);
        html.ShouldContain("<title>Klacks – Software für Dienstplan und Personalplanung · Schweiz</title>");
        html.ShouldContain("<link rel=\"canonical\" href=\"https://klacks-software.ch/land-ch\"");
        html.ShouldContain(HreflangMarker);
    }

    [TestCase("/en/land-gb", "Klacks – rota and workforce planning software · United Kingdom", "Workforce planning with Klacks.")]
    [TestCase("/en/land-ie", "Klacks – rota and workforce planning software · Ireland", "Workforce planning with Klacks.")]
    [TestCase("/fr/land-ch", "Klacks – plannings de service et planification du personnel · Suisse", "La planification du personnel avec Klacks.")]
    [TestCase("/fr/land-be", "Klacks – plannings de service et planification du personnel · Belgique", "La planification du personnel avec Klacks.")]
    [TestCase("/it/land-ch", "Klacks – software per turni e pianificazione del personale · Svizzera", "Pianificazione del personale con Klacks.")]
    [TestCase("/it/land-it", "Klacks – software per turni e pianificazione del personale · Italia", "Pianificazione del personale con Klacks.")]
    public async Task Prefixed_simple_cultures_serve_their_own_simple_page_indexable_with_the_country_cluster(string path, string title, string h1Start)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        html.ShouldContain($"<title>{title}</title>");
        Regex.Match(html, H1Pattern, RegexOptions.Singleline).Groups[1].Value.ShouldStartWith(h1Start);
        html.ShouldNotContain(SimpleHeroText);
        html.ShouldContain($"<link rel=\"canonical\" href=\"{SiteBaseUrl}{path}\"");
        html.ShouldContain(HreflangMarker);
        html.ShouldNotContain(NoindexMarker);
    }

    [TestCase("/fr/land-ch", "de,fr,it")]
    [TestCase("/en/land-gb", "de,en")]
    public async Task Simple_page_keeps_the_country_hreflang_cluster(string path, string cultures)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        foreach (var culture in cultures.Split(','))
        {
            html.ShouldContain($"hreflang=\"{culture}\"");
        }
    }

    [TestCase("/land-ch")]
    [TestCase("/en/land-ch")]
    [TestCase("/ja/land-ch")]
    [TestCase("/it/land-de")]
    public async Task Simple_page_is_indexable_with_the_hreflang_cluster_of_every_culture(string path)
    {
        var html = await GetHtmlAsync(enabled: true, path);
        var country = path.Split('/', StringSplitOptions.RemoveEmptyEntries)[^1];

        html.ShouldNotContain(NoindexMarker);
        foreach (var culture in SupportedCultures.All)
        {
            html.ShouldContain($"hreflang=\"{culture.Code}\" href=\"{SeoUrls.Absolute(SiteBaseUrl, culture, country)}\"", Case.Sensitive, path);
        }
    }

    [TestCase("/en/land-ch/experten")]
    [TestCase("/ja/land-ch/experten")]
    public async Task Expert_start_page_without_own_country_text_of_the_culture_stays_noindex(string path)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        html.ShouldContain(NoindexMarker);
        html.ShouldNotContain(HreflangMarker);
    }

    private static IEnumerable<SupportedCulture> PrefixedCultures => SupportedCultures.All.Where(culture => culture.UrlSlug.Length > 0);

    [TestCaseSource(nameof(PrefixedCultures))]
    public async Task Every_prefixed_culture_serves_its_simple_page_on_the_root_of_its_default_country(SupportedCulture culture)
    {
        var country = LanguageCountries.DefaultCountryFor(culture.Code);
        var path = $"/{culture.UrlSlug}/{country}";
        var html = await GetHtmlAsync(enabled: true, path);
        var texts = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, culture.Code, "simple.json")))!;

        Regex.Match(html, BodyClassPattern).Groups[1].Value.ShouldBe(SiteModes.SimpleBodyClass, path);
        Regex.Match(html, H1Pattern, RegexOptions.Singleline).Groups[1].Value.ShouldBe(texts["hero.title"], path);
        html.ShouldNotContain(SimpleHeroText);
        html.ShouldNotContain(ExpertHeroText);
        html.ShouldContain($"<link rel=\"canonical\" href=\"{SiteBaseUrl}{path}\"");
        html.ShouldContain($"href=\"{path}/{SiteModes.ExpertSlug}\"");

        if (CountryIndexingPolicy.IsNoindex(country))
        {
            html.ShouldContain(NoindexMarker);
        }
        else
        {
            html.ShouldNotContain(NoindexMarker);
            html.ShouldContain($"hreflang=\"{culture.Code}\"");
        }
    }

    [TestCase("/es/land-es")]
    [TestCase("/ja/land-jp")]
    [TestCase("/zh-cn/land-cn")]
    public async Task With_the_feature_off_the_country_root_of_the_other_cultures_stays_the_expert_page(string path)
    {
        var html = await GetHtmlAsync(enabled: false, path);

        html.ShouldNotContain("mode-simple");
        html.ShouldNotContain(SimpleHeroText);
    }

    [TestCase("/land-ch", ExpertHeroText)]
    [TestCase("/fr/land-ch", "vous gardez le contrôle.")]
    [TestCase("/en/land-gb", "you stay in control.")]
    public async Task With_the_feature_off_the_country_root_stays_the_expert_page(string path, string expertText)
    {
        var html = await GetHtmlAsync(enabled: false, path);

        html.ShouldContain(expertText);
        html.ShouldNotContain(SimpleHeroText);
    }

    private static async Task<string> GetHtmlAsync(bool enabled, string path)
    {
        await using var factory = new SimpleModeAppFactory(enabled);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, path);
        return WebUtility.HtmlDecode(await response.Content.ReadAsStringAsync());
    }
}
