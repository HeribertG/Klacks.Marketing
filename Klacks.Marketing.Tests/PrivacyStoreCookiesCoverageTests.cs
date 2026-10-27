// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Json;
using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The privacy statement names the cookies and the browser storage key of the Klacks Store (klacks-software.ch/store/) in
/// every language, so the "no cookies" promise of the marketing pages is never read as covering the store.
/// </summary>
[TestFixture]
public class PrivacyStoreCookiesCoverageTests
{
    private const string LegalFile = "legal.json";
    private const string PrivacyKey = "privacy.contentHtml";
    private const string StoreHeading = "<h2>4. ";
    private const string NextHeading = "<h2>5. ";

    private static readonly string[] StoreTokens =
    [
        "MarketplaceAuth",
        ".AspNetCore.Culture",
        ".AspNetCore.Antiforgery",
        "klacks-store-theme",
        "sessionStorage",
    ];

    [TestCaseSource(nameof(AllCultureCodes))]
    public void Store_section_names_every_store_cookie_and_the_theme_key(string cultureCode)
    {
        var section = StoreSection(cultureCode);

        foreach (var token in StoreTokens)
        {
            section.Contains(token, StringComparison.Ordinal).ShouldBeTrue($"{cultureCode}: {token}");
        }
    }

    private static IEnumerable<string> AllCultureCodes() => SupportedCultures.All.Select(culture => culture.Code);

    private static string StoreSection(string cultureCode)
    {
        var path = Path.Combine(MarketingProjectPaths.ContentRoot, cultureCode, LegalFile);
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var html = document.RootElement.GetProperty(PrivacyKey).GetString()!;
        var start = html.IndexOf(StoreHeading, StringComparison.Ordinal);
        start.ShouldBeGreaterThanOrEqualTo(0, cultureCode);
        var end = html.IndexOf(NextHeading, start, StringComparison.Ordinal);
        end.ShouldBeGreaterThan(start, cultureCode);

        return html[start..end];
    }
}
