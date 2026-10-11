// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization.Seo;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The og:url derived from the raw request path matches the normalized canonical form: lower-case, no trailing
/// slash, culture prefix only for non-default cultures.
/// </summary>
[TestFixture]
public class SeoUrlsRequestPathTests
{
    private const string BaseUrl = "https://klacks.example";

    [TestCase("/land-ch/spitex", "https://klacks.example/land-ch/spitex")]
    [TestCase("/LAND-CH/SPITEX", "https://klacks.example/land-ch/spitex")]
    [TestCase("/land-ch/spitex/", "https://klacks.example/land-ch/spitex")]
    [TestCase("/FR/Land-FR/", "https://klacks.example/fr/land-fr")]
    [TestCase("/zh-CN/land-cn", "https://klacks.example/zh-cn/land-cn")]
    [TestCase("/en", "https://klacks.example/en")]
    [TestCase("/", "https://klacks.example/")]
    [TestCase("", "https://klacks.example/")]
    [TestCase(null, "https://klacks.example/")]
    public void FromRequestPath_returns_the_normalized_absolute_url(string? requestPath, string expected)
    {
        SeoUrls.FromRequestPath(BaseUrl, requestPath).ShouldBe(expected);
    }

    [Test]
    public void FromRequestPath_matches_Absolute_for_the_same_page()
    {
        var french = Klacks.Marketing.Localization.SupportedCultures.Resolve("fr");

        SeoUrls.FromRequestPath(BaseUrl, "/FR/land-fr/spitex/")
            .ShouldBe(SeoUrls.Absolute(BaseUrl, french, "land-fr/spitex"));
    }
}
