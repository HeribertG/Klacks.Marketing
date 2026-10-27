// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The header logo leads to the start page of the active mode and scrolls to the top: the simple mode stays on the
/// simple page, the expert mode on the expert start page, with the feature off it leads to the country page.
/// </summary>
[TestFixture]
public class LogoLinkTests
{
    private const string LogoLinkPattern = @"<a href=""([^""]+)""( data-scroll-top)?[^>]*>\s*(?:<!--!-->)?\s*<img src=""images/klacks-logo.svg""";

    [TestCase("/land-ch", true, "/land-ch")]
    [TestCase("/fr/land-ch", true, "/fr/land-ch")]
    [TestCase("/land-ch/experten", true, "/land-ch/experten")]
    [TestCase("/fr/land-ch/experten", true, "/fr/land-ch/experten")]
    [TestCase("/land-ch/spitex", true, "/land-ch/experten")]
    [TestCase("/fr/land-ch/grosse-betriebe", true, "/fr/land-ch/experten")]
    [TestCase("/land-ch", false, "/land-ch")]
    [TestCase("/land-ch/spitex", false, "/land-ch")]
    public async Task Logo_keeps_the_active_mode(string path, bool enabled, string expectedHref)
    {
        await using var factory = new SimpleModeAppFactory(enabled);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var html = await response.Content.ReadAsStringAsync();
        var logos = Regex.Matches(html, LogoLinkPattern);
        logos.ShouldNotBeEmpty();
        logos.ShouldAllBe(match => match.Groups[1].Value == expectedHref && match.Groups[2].Success);
    }

    [Test]
    public void Mode_script_scrolls_to_the_top_for_marked_links_without_modifier_keys()
    {
        var script = MarketingProjectPaths.ReadSource("wwwroot/js/site-mode.js");

        script.ShouldContain("a[data-scroll-top]");
        script.ShouldContain("addEventListener('click'");
        script.ShouldContain("window.scrollTo(0, 0)");
        script.ShouldContain("ev.ctrlKey");
    }
}
