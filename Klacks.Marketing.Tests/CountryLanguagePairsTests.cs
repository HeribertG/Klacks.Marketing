// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Localization.Seo;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Guards the owner model of the real pages (2026-10-21): a country is served only in the languages spoken there
/// (LanguageCountries); every other culture/country combination answers 301 to the culture's home country, the German
/// variant of a foreign country is a noindex preview, and the sitemap, the hreflang sets and the rendered links only
/// ever point at real pages.
/// </summary>
[TestFixture]
public class CountryLanguagePairsTests
{
    private const string BaseUrl = "https://klacks.example";
    private const string NoindexMarker = "name=\"robots\" content=\"noindex";
    private const string UrlBlockPattern = @"<url>\s*<loc>([^<]*)</loc>(.*?)</url>";
    private const string AlternatePattern = @"hreflang=""([^""]+)"" href=""([^""]+)""";
    private const string InternalHrefPattern = @"href=""(/[^""#?]*)";
    private const string XDefault = "x-default";

    private static readonly string[] SampleSubPaths = { "", "/spitex", "/klacksy", "/installation", "/impressum", "/experten", "/mittlere-betriebe" };

    [Test]
    public void Every_pair_has_its_own_country_text()
    {
        foreach (var culture in SupportedCultures.All)
        {
            foreach (var country in CountryIndustries.AllCountries.Where(country => CountryLanguagePairs.IsPair(culture.Code, country)))
            {
                File.Exists(Path.Combine(MarketingProjectPaths.ContentRoot, culture.Code, country + ".json")).ShouldBeTrue($"{culture.Code}/{country}");
            }
        }
    }

    [TestCase("de", "land-ch", true)]
    [TestCase("fr", "land-ch", true)]
    [TestCase("it", "land-ch", true)]
    [TestCase("en", "land-ch", false)]
    [TestCase("ja", "land-ch", false)]
    [TestCase("ja", "land-jp", true)]
    [TestCase("de", "land-jp", false)]
    [TestCase("de", "land-be", false)]
    [TestCase("en", "land-ae", true)]
    [TestCase("en", "land-il", false)]
    [TestCase("sv", "land-fi", true)]
    public void Pair_follows_the_languages_spoken_in_the_country(string culture, string country, bool expected)
    {
        CountryLanguagePairs.IsPair(culture, country).ShouldBe(expected);
    }

    [TestCase("land-ch", "de")]
    [TestCase("land-de", "de")]
    [TestCase("land-jp", "ja")]
    [TestCase("land-il", "he")]
    [TestCase("land-sa", "ar")]
    [TestCase("land-be", "fr")]
    [TestCase("land-fi", "fi")]
    [TestCase("land-ie", "en")]
    public void Primary_culture_is_the_home_language_of_the_country(string country, string expected)
    {
        CountryLanguagePairs.PrimaryCultureFor(country).Code.ShouldBe(expected);
    }

    [TestCase("/ja/land-ch", "/ja/land-jp")]
    [TestCase("/en/land-ch/spitex", "/en/land-gb/spitex")]
    [TestCase("/ja/land-ch/impressum", "/ja/land-jp/impressum")]
    [TestCase("/it/land-de/experten", "/it/land-it/experten")]
    [TestCase("/zh-cn/land-tw", "/zh-cn/land-cn")]
    [TestCase("/fr/LAND-DE", "/fr/land-fr")]
    [TestCase("/fr/land-ch", null)]
    [TestCase("/land-ch/spitex", null)]
    [TestCase("/ja/land-jp", null)]
    [TestCase("/land-jp", null)]
    [TestCase("/land-jp/spitex", null)]
    [TestCase("/ja", null)]
    [TestCase("/impressum", null)]
    public void Redirect_target_moves_a_foreign_language_to_its_home_country(string path, string? expected)
    {
        CountryLanguagePairs.RedirectTarget(path).ShouldBe(expected);
    }

    [Test]
    public void Every_redirect_target_is_a_known_real_page()
    {
        foreach (var culture in SupportedCultures.All)
        {
            foreach (var country in CountryIndustries.AllCountries)
            {
                foreach (var subPath in SampleSubPaths)
                {
                    var path = SitemapGenerator.BuildUrl(string.Empty, culture, country) + subPath;
                    if (CountryLanguagePairs.RedirectTarget(path) is not { } target)
                    {
                        continue;
                    }

                    KnownPageRoutes.Contains(target).ShouldBeTrue($"{path} -> {target}");
                    CountryLanguagePairs.RedirectTarget(target).ShouldBeNull($"{path} -> {target}");
                    target.ShouldContain($"/{LanguageCountries.DefaultCountryFor(culture.Code)}", Case.Sensitive, path);
                }
            }
        }
    }

    [TestCase("/ja/land-ch?ref=share", "/ja/land-jp?ref=share")]
    [TestCase("/en/land-ch/spitex", "/en/land-gb/spitex")]
    [TestCase("/nb/land-ch", "/nb/land-no")]
    [TestCase("/en/land-cn", "/en/land-gb")]
    public async Task Foreign_language_country_page_answers_301_to_the_home_country(string path, string expectedLocation)
    {
        await using var factory = new SimpleModeAppFactory(true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.MovedPermanently, path);
        response.Headers.Location!.OriginalString.ShouldBe(expectedLocation);
    }

    [Test]
    public async Task Dark_expert_route_stays_404_instead_of_redirecting()
    {
        await using var factory = new SimpleModeAppFactory(false);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync("/ja/land-ch/experten");

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Test]
    public async Task German_preview_of_a_foreign_country_answers_200_with_noindex()
    {
        await using var factory = new SimpleModeAppFactory(true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync("/land-jp/spitex");
        var html = await response.Content.ReadAsStringAsync();

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        html.ShouldContain(NoindexMarker);
        html.ShouldNotContain("hreflang=");
    }

    [TestCase(true)]
    [TestCase(false)]
    public void Sitemap_lists_only_real_pages_with_an_x_default_inside_the_cluster(bool simpleModeEnabled)
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        var xml = SitemapGenerator.Build(BaseUrl, provider.HasContentIn, simpleModeEnabled);
        var blocks = Regex.Matches(xml, UrlBlockPattern, RegexOptions.Singleline);

        blocks.Count.ShouldBeGreaterThan(0);
        foreach (Match block in blocks)
        {
            var loc = block.Groups[1].Value;
            var alternates = Regex.Matches(block.Groups[2].Value, AlternatePattern)
                .Select(match => (Culture: match.Groups[1].Value, Href: match.Groups[2].Value))
                .ToList();

            IsRealPage(new Uri(loc).AbsolutePath).ShouldBeTrue(loc);
            alternates.ShouldAllBe(alternate => IsRealPage(new Uri(alternate.Href).AbsolutePath), loc);
            var xDefault = alternates.Single(alternate => alternate.Culture == XDefault).Href;
            alternates.Where(alternate => alternate.Culture != XDefault).Select(alternate => alternate.Href).ShouldContain(xDefault, loc);
        }
    }

    [TestCase("/land-ch")]
    [TestCase("/fr/land-ch/spitex")]
    [TestCase("/ja/land-jp")]
    [TestCase("/en/land-gb/impressum")]
    [TestCase("/ar/land-sa")]
    [TestCase("/land-ch/experten")]
    public async Task Rendered_links_point_only_at_real_pages(string path)
    {
        await using var factory = new SimpleModeAppFactory(true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var html = WebUtility.HtmlDecode(await client.GetStringAsync(path));

        foreach (var href in Regex.Matches(html, InternalHrefPattern).Select(match => match.Groups[1].Value).Distinct())
        {
            IsRealPage(href).ShouldBeTrue($"{path}: {href}");
        }
    }

    // A path is a real page when it is not a country page at all or names a culture that is spoken in its country.
    private static bool IsRealPage(string path)
    {
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var culture = segments.Length > 0 ? SiteModes.FindPrefixedCulture(segments[0]) : null;
        var countryIndex = culture is null ? 0 : 1;
        culture ??= SupportedCultures.Default;

        return segments.Length <= countryIndex
            || !CountryIndustries.AllCountries.Contains(segments[countryIndex], StringComparer.OrdinalIgnoreCase)
            || CountryLanguagePairs.IsPair(culture.Code, segments[countryIndex]);
    }
}
