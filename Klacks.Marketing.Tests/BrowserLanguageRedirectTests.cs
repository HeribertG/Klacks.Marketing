// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The bare site root redirects by the browser's Accept-Language header: language first, country only when the
/// region is mapped to that language, and no result at all for missing or unsupported headers so crawlers keep the
/// fixed root target.
/// </summary>
[TestFixture]
public class BrowserLanguageRedirectTests
{
    [TestCase("de-AT,de;q=0.9", "/land-at")]
    [TestCase("de-DE,de;q=0.9", "/land-de")]
    [TestCase("de", "/land-ch")]
    [TestCase("fr-BE", "/fr/land-be")]
    [TestCase("fr", "/fr/land-fr")]
    [TestCase("ja-JP,ja;q=0.9,en;q=0.5", "/ja/land-jp")]
    [TestCase("en-GB", "/en/land-gb")]
    [TestCase("en-US,en;q=0.9", "/en/land-gb")]
    [TestCase("zh-TW", "/zh-tw/land-tw")]
    [TestCase("zh-Hant", "/zh-tw/land-tw")]
    [TestCase("zh", "/zh-cn/land-cn")]
    [TestCase("no", "/nb/land-no")]
    [TestCase("sv-FI", "/sv/land-fi")]
    public void Resolves_language_and_mapped_country(string header, string expected)
    {
        BrowserLanguageRedirect.ResolveTarget(header).ShouldBe(expected);
    }

    [Test]
    public void Highest_quality_supported_language_wins()
    {
        BrowserLanguageRedirect.ResolveTarget("sw,it;q=0.4,fr;q=0.8").ShouldBe("/fr/land-fr");
    }

    [Test]
    public void Languages_with_zero_quality_are_ignored()
    {
        BrowserLanguageRedirect.ResolveTarget("ja;q=0,en;q=0.5").ShouldBe("/en/land-gb");
    }

    [TestCase(null)]
    [TestCase("")]
    [TestCase("sw,tr;q=0.8")]
    [TestCase("*")]
    [TestCase("not a valid ;; header")]
    public void Returns_null_without_a_supported_language(string? header)
    {
        BrowserLanguageRedirect.ResolveTarget(header).ShouldBeNull();
    }

    [Test]
    public void Every_resolved_target_is_a_known_country_page()
    {
        foreach (var culture in SupportedCultures.All)
        {
            var target = BrowserLanguageRedirect.ResolveTarget(culture.Code)!;

            var country = target.Split('/')[^1];
            CountryIndustries.AllCountries.ShouldContain(country, $"{culture.Code} -> {target}");
        }
    }
}
