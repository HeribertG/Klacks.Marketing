// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The back arrows on the expert pages (industry pages, mid-size and large business pages) lead to the expert start
/// page of the country while the simple mode is on, never to the simple country root; with the feature off they keep
/// leading to the country root.
/// </summary>
[TestFixture]
public class BackToStartLinkTests
{
    private const string BackLinkPattern = @"<a href=""([^""]+)""[^>]*>\s*<span[^>]*>arrow_back</span>";

    [TestCase("fr", "land-ch", true, "/fr/land-ch/experten")]
    [TestCase(null, "land-ch", true, "/land-ch/experten")]
    [TestCase("", "land-ch", true, "/land-ch/experten")]
    [TestCase(null, "land-ch", false, "/land-ch")]
    [TestCase("fr", "land-ch", false, "/fr/land-ch")]
    [TestCase(null, null, true, "/land-ch/experten")]
    public void StartHref_targets_the_expert_start_page_only_while_the_simple_mode_is_on(string? slug, string? country, bool enabled, string expected)
    {
        CountryPageLinks.StartHref(slug, country, enabled).ShouldBe(expected);
    }

    [TestCase("/land-ch/spitex", true, "/land-ch/experten")]
    [TestCase("/land-ch/klacksy", true, "/land-ch/experten")]
    [TestCase("/fr/land-ch/spitex", true, "/fr/land-ch/experten")]
    [TestCase("/land-ch/mittlere-betriebe", true, "/land-ch/experten")]
    [TestCase("/land-ch/grosse-betriebe", true, "/land-ch/experten")]
    [TestCase("/fr/land-ch/grosse-betriebe", true, "/fr/land-ch/experten")]
    [TestCase("/land-ch/spitex", false, "/land-ch")]
    [TestCase("/land-ch/mittlere-betriebe", false, "/land-ch")]
    [TestCase("/land-ch/grosse-betriebe", false, "/land-ch")]
    public async Task Back_arrow_leads_to_the_start_page_of_the_active_mode(string path, bool enabled, string expectedHref)
    {
        await using var factory = new SimpleModeAppFactory(enabled);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var html = await response.Content.ReadAsStringAsync();
        Regex.Matches(html, BackLinkPattern).Select(match => match.Groups[1].Value).ShouldContain(expectedHref);
    }
}
