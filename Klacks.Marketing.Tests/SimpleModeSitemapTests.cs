// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// With the feature on, the sitemap lists both the simple page ("/land-ch", with its hreflang cluster) and the German
/// expert start page ("/land-ch/experten", without alternates, spec §3); China stays out; with the feature off there
/// is no expert entry.
/// </summary>
[TestFixture]
public class SimpleModeSitemapTests
{
    private const string BaseUrl = "https://klacks.example";
    private const string ExpertBlockPattern = @"<url>\s*<loc>[^<]*/experten</loc>(.*?)</url>";

    [Test]
    public void Enabled_sitemap_lists_the_expert_start_pages_without_alternates()
    {
        var xml = SitemapGenerator.Build(BaseUrl, (_, _) => true, includeExpertStartPages: true);

        xml.ShouldContain($"<loc>{BaseUrl}/land-ch/experten</loc>");
        xml.ShouldContain($"<loc>{BaseUrl}/land-ch</loc>");
        xml.ShouldNotContain("/land-cn/experten");
        var blocks = Regex.Matches(xml, ExpertBlockPattern, RegexOptions.Singleline);
        blocks.Count.ShouldBe(CountryIndustries.AllCountries.Count - 1);
        blocks.ShouldAllBe(block => !block.Groups[1].Value.Contains("xhtml:link"));
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

        (await client.GetStringAsync("/sitemap.xml")).Contains("/land-ch/experten</loc>").ShouldBe(expected);
    }
}
