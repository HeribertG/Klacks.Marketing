// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The prerendered page carries the mode body class and the header of its mode: the simple page shows only jump links
/// to its own sections, the expert pages keep today's navigation; the logo always leads to the simple page; switching
/// language or country keeps the mode, but never links to an expert start page that a culture does not have.
/// </summary>
[TestFixture]
public class SiteHeaderModeTests
{
    private const string BodyClassPattern = @"<body class=""(mode-simple|mode-expert)\b";

    [TestCase("/land-ch", true, "mode-simple")]
    [TestCase("/land-ch/experten", true, "mode-expert")]
    [TestCase("/land-ch/spitex", true, "mode-expert")]
    [TestCase("/fr/land-ch", true, "mode-expert")]
    [TestCase("/land-ch", false, "mode-expert")]
    public async Task Body_carries_the_mode_class(string path, bool enabled, string expected)
    {
        var html = await GetHtmlAsync(enabled, path);

        Regex.Match(html, BodyClassPattern).Groups[1].Value.ShouldBe(expected);
    }

    [Test]
    public async Task Simple_header_has_jump_links_and_no_expert_navigation()
    {
        var html = await GetHtmlAsync(enabled: true, "/land-ch");

        html.ShouldContain("href=\"/land-ch#was-klacksy-tut\"");
        html.ShouldContain("href=\"/land-ch#kosten\"");
        html.ShouldNotContain("href=\"/land-ch#regeln\"");
        html.ShouldNotContain("mobile-menu-panel");
    }

    [Test]
    public async Task Expert_header_keeps_todays_navigation_and_the_logo_leads_to_the_simple_page()
    {
        var html = await GetHtmlAsync(enabled: true, "/land-ch/experten");

        html.ShouldContain("href=\"/land-ch/experten#regeln\"");
        html.ShouldContain("mobile-menu-panel");
        html.ShouldContain("<a href=\"/land-ch\" class=\"flex shrink-0 items-center gap-2");
    }

    [TestCase("/land-ch/experten", "href=\"/fr/land-ch\"", "href=\"/land-de/experten\"")]
    [TestCase("/fr/land-ch", "href=\"/land-ch/experten\"", "href=\"/fr/land-fr\"")]
    [TestCase("/land-ch", "href=\"/fr/land-ch\"", "href=\"/land-de\"")]
    public async Task Language_and_country_switch_keep_the_mode(string path, string languageLink, string countryLink)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        html.ShouldContain(languageLink);
        html.ShouldContain(countryLink);
    }

    [Test]
    public async Task Language_switch_on_an_expert_start_page_never_links_to_a_missing_expert_page()
    {
        var html = await GetHtmlAsync(enabled: true, "/land-ch/experten");
        var prefixedCultureSlugs = SupportedCultures.All
            .Where(culture => culture.UrlSlug.Length > 0 && !SiteModes.HasSimplePage(culture.Code, enabled: true))
            .Select(culture => Regex.Escape(culture.UrlSlug));
        var missingExpertLink = new Regex($"href=\"/({string.Join('|', prefixedCultureSlugs)})/land-[a-z]+/{SiteModes.ExpertSlug}");

        missingExpertLink.IsMatch(html).ShouldBeFalse();
        html.ShouldContain("href=\"/it/land-ch\"");
    }

    private static async Task<string> GetHtmlAsync(bool enabled, string path)
    {
        await using var factory = new SimpleModeAppFactory(enabled);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, path);
        return await response.Content.ReadAsStringAsync();
    }
}
