// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// With the feature on, the sitemap lists both the simple pages ("/land-ch", "/fr/land-ch", with their hreflang cluster)
/// and the expert start pages ("/land-ch/experten", "/fr/land-ch/experten") of the cultures with a simple page; the
/// alternates of an expert start page are limited to those cultures, so no entry points at an expert route that answers
/// 404. China stays out; with the feature off there is no expert entry.
/// </summary>
[TestFixture]
public class SimpleModeSitemapTests
{
    private const string BaseUrl = "https://klacks.example";
    private const string ExpertBlockPattern = @"<url>\s*<loc>([^<]*/experten)</loc>(.*?)</url>";
    private const string AlternateHrefPattern = @"hreflang=""([^""]+)"" href=""([^""]+)""";

    [Test]
    public void Enabled_sitemap_lists_the_expert_start_pages_of_every_simple_page_culture()
    {
        var xml = SitemapGenerator.Build(BaseUrl, (_, _) => true, includeExpertStartPages: true);

        xml.ShouldContain($"<loc>{BaseUrl}/land-ch/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/fr/land-ch/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/en/land-gb/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/it/land-it/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/land-ch</loc>");
        xml.ShouldNotContain("/land-cn/experten");
        var blocks = Regex.Matches(xml, ExpertBlockPattern, RegexOptions.Singleline);
        blocks.Count.ShouldBe((CountryIndustries.AllCountries.Count - 1) * SiteModes.SimplePageCultures.Count);
    }

    [Test]
    public void Expert_start_alternates_never_point_at_a_culture_without_the_expert_route()
    {
        var xml = SitemapGenerator.Build(BaseUrl, (_, _) => true, includeExpertStartPages: true);

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
        var xml = SitemapGenerator.Build(BaseUrl, (culture, key) => culture == SupportedCultures.DefaultCode || (culture == "fr" && key == "land-ch"), includeExpertStartPages: true);

        xml.ShouldContain($"<loc>{BaseUrl}/fr/land-ch/experten</loc>");
        xml.ShouldNotContain($"<loc>{BaseUrl}/fr/land-fr/experten</loc>");
        xml.ShouldNotContain($"<loc>{BaseUrl}/en/land-gb/experten</loc>");
        xml.ShouldContain($"hreflang=\"fr\" href=\"{BaseUrl}/fr/land-ch/experten\"");
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
        xml.Contains("/es/land-es/experten").ShouldBeFalse();
    }
}
