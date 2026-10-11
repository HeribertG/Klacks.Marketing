// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using Klacks.Marketing.Localization;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization.Seo;
using NUnit.Framework;
using Shouldly;

namespace Klacks.Marketing.Tests;

/// <summary>
/// Guards the owner decision that the China page family is kept out of search engines and the sitemap.
/// </summary>
[TestFixture]
public class CountryIndexingPolicyTests
{
    private const string BaseUrl = "https://klacks.example";
    private const string LocationPattern = "<loc>([^<]+)</loc>";
    private const string ChinaCountryPagePattern =
        "/land-cn(?:$|/(?!(?:impressum|datenschutz|lizenz|partner|vergleich|kleine-betriebe|ueber-uns|mittlere-betriebe|grosse-betriebe|angebot)$))";

    [TestCase("land-cn")]
    [TestCase("land-cn-spitex")]
    [TestCase("land-cn/installation")]
    [TestCase("land-cn/eigene-regeln")]
    public void China_page_keys_are_noindex(string pageKey) => CountryIndexingPolicy.IsNoindex(pageKey).ShouldBeTrue();

    [TestCase("land-ch")]
    [TestCase("land-ch-spitex")]
    [TestCase("land-cz")]
    [TestCase("land-cnx")]
    public void Other_country_pages_stay_indexable(string pageKey) => CountryIndexingPolicy.IsNoindex(pageKey).ShouldBeFalse();

    [Test]
    public void Sitemap_lists_no_china_country_page_in_any_culture()
    {
        var xml = SitemapGenerator.Build(BaseUrl, (_, _) => true);

        var chinaCountryPages = Regex.Matches(xml, LocationPattern)
            .Select(match => match.Groups[1].Value)
            .Where(url => Regex.IsMatch(url, ChinaCountryPagePattern))
            .ToList();

        chinaCountryPages.ShouldBeEmpty();
        xml.ShouldContain("land-ch");
    }
}
