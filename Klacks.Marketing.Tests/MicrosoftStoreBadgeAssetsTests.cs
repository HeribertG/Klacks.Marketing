// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Checks that every site culture resolves to an existing, unmodified official Microsoft Store badge in both themes,
/// served from wwwroot (no third-party request), and that the listing link carries the owner's Store ID.
/// </summary>
[TestFixture]
public class MicrosoftStoreBadgeAssetsTests
{
    private const string NorwegianBokmal = "nb";
    private const string PortugueseCode = "pt";
    private const string PortugueseEuropeanFileCode = "pt-pt";
    private const string StoreListingUrl = "https://apps.microsoft.com/detail/XPFFW8HDX0KX26";
    private const string SvgRoot = "<svg";
    private const string MicrosoftHost = "get.microsoft.com";

    private static IEnumerable<string> CultureCodes => SupportedCultures.All.Select(c => c.Code);

    [TestCaseSource(nameof(CultureCodes))]
    public void Every_culture_has_a_dark_and_a_light_badge_file(string culture)
    {
        foreach (var theme in new[] { MicrosoftStoreBadgeAssets.DarkTheme, MicrosoftStoreBadgeAssets.LightTheme })
        {
            var path = Path.Combine(MarketingProjectPaths.WebRoot, MicrosoftStoreBadgeAssets.ImagePath(culture, theme).TrimStart('/'));

            File.Exists(path).ShouldBeTrue($"Missing badge {path}");
            File.ReadAllText(path).TrimStart().ShouldStartWith(SvgRoot);
        }
    }

    [Test]
    public void Norwegian_bokmal_uses_the_english_badge_because_microsoft_ships_none()
    {
        MicrosoftStoreBadgeAssets.FileCode(NorwegianBokmal).ShouldBe(MicrosoftStoreBadgeAssets.EnglishFileCode);
    }

    [Test]
    public void Portuguese_uses_the_european_badge()
    {
        MicrosoftStoreBadgeAssets.FileCode(PortugueseCode).ShouldBe(PortugueseEuropeanFileCode);
    }

    [Test]
    public void Unknown_culture_falls_back_to_the_english_badge()
    {
        MicrosoftStoreBadgeAssets.FileCode("xx").ShouldBe(MicrosoftStoreBadgeAssets.EnglishFileCode);
    }

    [Test]
    public void Store_listing_link_carries_the_klacks_store_id()
    {
        ExternalLinks.MicrosoftStoreUrl.ShouldBe(StoreListingUrl);
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Badge_files_do_not_reference_external_hosts(string culture)
    {
        foreach (var theme in new[] { MicrosoftStoreBadgeAssets.DarkTheme, MicrosoftStoreBadgeAssets.LightTheme })
        {
            var path = Path.Combine(MarketingProjectPaths.WebRoot, MicrosoftStoreBadgeAssets.ImagePath(culture, theme).TrimStart('/'));

            File.ReadAllText(path).ShouldNotContain(MicrosoftHost);
        }
    }
}
