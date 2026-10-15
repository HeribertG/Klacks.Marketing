// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Routing of the start pages through the real app: with the feature on, "/land-ch" is the simple page (title with
/// "Personalplanung", canonical on itself, the existing land-ch hreflang cluster) and "/fr/land-ch" stays the expert
/// page until stage 3; with the feature off, "/land-ch" is today's page.
/// </summary>
[TestFixture]
public class SimpleStartPageTests
{
    private const string SimpleHeroText = "Personalplanung mit Klacks.";
    private const string ExpertHeroText = "Frühschicht unbesetzt?";
    private const string HreflangMarker = "hreflang=";

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

    [TestCase("/fr/land-ch")]
    [TestCase("/en/land-gb")]
    public async Task Other_cultures_keep_the_expert_page_until_stage_three(string path)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        html.ShouldNotContain(SimpleHeroText);
    }

    [Test]
    public async Task With_the_feature_off_the_german_country_root_stays_the_expert_page()
    {
        var html = await GetHtmlAsync(enabled: false, "/land-ch");

        html.ShouldContain(ExpertHeroText);
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
