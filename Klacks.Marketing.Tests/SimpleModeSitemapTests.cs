// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Localization.Seo;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// With the feature on, the sitemap lists both the simple pages ("/land-ch", "/ja/land-ch", with their hreflang cluster,
/// in every culture with its simple.json) and the expert start pages ("/land-ch/experten", "/fr/land-ch/experten") of the cultures with a simple page (all 25
/// supported cultures, each only where it has its own country text); the alternates of an expert start page are limited
/// to those cultures, so no entry points at an expert route that answers 404. China stays out; with the feature off there is no expert entry.
/// </summary>
[TestFixture]
public class SimpleModeSitemapTests
{
    private const string BaseUrl = "https://klacks.example";
    private const string ExpertBlockPattern = @"<url>\s*<loc>([^<]*/experten)</loc>(.*?)</url>";
    private const string SwissCountry = "land-ch";
    private const string AlternateHrefPattern = @"hreflang=""([^""]+)"" href=""([^""]+)""";

    [Test]
    public void Enabled_sitemap_lists_the_expert_start_pages_of_every_simple_page_culture()
    {
        var xml = SitemapGenerator.Build(BaseUrl, (_, _) => true, simpleModeEnabled: true);

        xml.ShouldContain($"<loc>{BaseUrl}/land-ch/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/fr/land-ch/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/en/land-gb/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/it/land-it/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/es/land-es/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/zh-tw/land-tw/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/land-ch</loc>");
        xml.ShouldNotContain("/land-cn/experten");
        var blocks = Regex.Matches(xml, ExpertBlockPattern, RegexOptions.Singleline);
        blocks.Count.ShouldBe((CountryIndustries.AllCountries.Count - 1) * SiteModes.SimplePageCultures.Count);
    }

    [Test]
    public void Expert_start_alternates_never_point_at_a_culture_without_the_expert_route()
    {
        var xml = SitemapGenerator.Build(BaseUrl, (_, _) => true, simpleModeEnabled: true);

        foreach (Match block in Regex.Matches(xml, ExpertBlockPattern, RegexOptions.Singleline))
        {
            var cultures = Regex.Matches(block.Groups[2].Value, AlternateHrefPattern).Select(match => match.Groups[1].Value).ToList();
            cultures.ShouldAllBe(culture => culture == "x-default" || SiteModes.SimplePageCultures.Contains(culture), block.Groups[1].Value);
            Regex.Matches(block.Groups[2].Value, AlternateHrefPattern).Select(match => match.Groups[2].Value)
                .ShouldAllBe(href => href.EndsWith("/experten", StringComparison.Ordinal));
        }
    }

    [Test]
    public void Expert_start_entries_follow_the_country_text_of_the_culture()
    {
        var xml = SitemapGenerator.Build(BaseUrl, (culture, key) => culture == SupportedCultures.DefaultCode || (culture == "fr" && key == "land-ch"), simpleModeEnabled: true);

        xml.ShouldContain($"<loc>{BaseUrl}/fr/land-ch/experten</loc>");
        xml.ShouldNotContain($"<loc>{BaseUrl}/fr/land-fr/experten</loc>");
        xml.ShouldNotContain($"<loc>{BaseUrl}/en/land-gb/experten</loc>");
        xml.ShouldContain($"hreflang=\"fr\" href=\"{BaseUrl}/fr/land-ch/experten\"");
    }

    [Test]
    public void Expert_start_entries_of_every_country_follow_the_country_texts_on_disk_in_every_supported_culture()
    {
        var xml = SitemapGenerator.Build(BaseUrl, HasCountryTextOnDisk, simpleModeEnabled: true);
        var expertLocs = Regex.Matches(xml, ExpertBlockPattern, RegexOptions.Singleline).Select(match => match.Groups[1].Value).ToHashSet();

        foreach (var country in CountryIndustries.AllCountries.Where(key => !CountryIndexingPolicy.IsNoindex(key)))
        {
            var expected = SupportedCultures.All
                .Where(culture => HasCountryTextOnDisk(culture.Code, country))
                .Select(culture => ExpertLoc(culture, country))
                .ToList();

            expected.ShouldContain(ExpertLoc(SupportedCultures.Default, country), country);
            expertLocs.Where(loc => loc.EndsWith($"/{country}/{SiteModes.ExpertSlug}", StringComparison.Ordinal))
                .OrderBy(loc => loc, StringComparer.Ordinal)
                .ShouldBe(expected.OrderBy(loc => loc, StringComparer.Ordinal), country);
        }

        expertLocs.ShouldNotContain(loc => loc.Contains("/land-cn/", StringComparison.Ordinal));
    }

    [Test]
    public void Enabled_sitemap_lists_the_simple_country_roots_in_every_culture_with_its_simple_text()
    {
        var xml = SitemapGenerator.Build(BaseUrl, HasContentOnDisk, simpleModeEnabled: true);

        foreach (var culture in SupportedCultures.All)
        {
            var loc = SitemapGenerator.BuildUrl(BaseUrl, culture, SwissCountry);
            Regex.Matches(xml, $"<loc>{Regex.Escape(loc)}</loc>").Count.ShouldBe(1, loc);
            Regex.Matches(xml, $"hreflang=\"{Regex.Escape(culture.Code)}\" href=\"{Regex.Escape(loc)}\"").Count.ShouldBe(SupportedCultures.All.Count, loc);
        }

        xml.ShouldNotContain($"{BaseUrl}/ja/land-cn</loc>");
    }

    [Test]
    public void Disabled_sitemap_lists_the_country_roots_only_in_the_cultures_with_own_country_text()
    {
        var xml = SitemapGenerator.Build(BaseUrl, HasContentOnDisk);

        foreach (var culture in SupportedCultures.All)
        {
            var loc = SitemapGenerator.BuildUrl(BaseUrl, culture, SwissCountry);
            xml.Contains($"<loc>{loc}</loc>").ShouldBe(HasCountryTextOnDisk(culture.Code, SwissCountry), loc);
        }
    }

    [Test]
    public void Disabled_sitemap_has_no_expert_start_page()
    {
        SitemapGenerator.Build(BaseUrl, (_, _) => true).ShouldNotContain("/experten");
    }

    [TestCase(true, true)]
    [TestCase(false, false)]
    public async Task Served_sitemap_follows_the_feature_switch(bool enabled, bool expected)
    {
        await using var factory = new SimpleModeAppFactory(enabled);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var xml = await client.GetStringAsync("/sitemap.xml");

        xml.Contains("/land-ch/experten</loc>").ShouldBe(expected);
        xml.Contains("/fr/land-ch/experten</loc>").ShouldBe(expected);
        xml.Contains("/es/land-es/experten</loc>").ShouldBe(expected);
        xml.Contains("/ja/land-jp/experten</loc>").ShouldBe(expected);
        xml.Contains("/zh-tw/land-tw/experten</loc>").ShouldBe(expected);
    }

    private static bool HasContentOnDisk(string culture, string contentKey)
        => HasCountryTextOnDisk(culture, contentKey);

    private static bool HasCountryTextOnDisk(string culture, string countryPageKey)
        => File.Exists(Path.Combine(MarketingProjectPaths.ContentRoot, culture, countryPageKey + ".json"));

    private static string ExpertLoc(SupportedCulture culture, string country)
        => $"{BaseUrl}/{(culture.UrlSlug.Length == 0 ? string.Empty : culture.UrlSlug + "/")}{country}/{SiteModes.ExpertSlug}";
}
