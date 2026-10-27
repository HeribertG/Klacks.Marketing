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
    private const string FollowingHeading = "<h2>6. ";
    private const string PrivacyContactAddress = "marketing@klacks-software.ch";
    private const string RetentionDays = "400";

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

    [TestCaseSource(nameof(AllCultureCodes))]
    public void Account_section_follows_the_store_section_and_names_contact_and_retention(string cultureCode)
    {
        var section = Section(cultureCode, NextHeading, FollowingHeading);

        section.Contains(PrivacyContactAddress, StringComparison.Ordinal).ShouldBeTrue(cultureCode);
        section.Contains(RetentionDays, StringComparison.Ordinal).ShouldBeTrue(cultureCode);
    }

    private static IEnumerable<string> AllCultureCodes() => SupportedCultures.All.Select(culture => culture.Code);

    private static string StoreSection(string cultureCode) => Section(cultureCode, StoreHeading, NextHeading);

    private static string Section(string cultureCode, string startHeading, string endHeading)
    {
        var path = Path.Combine(MarketingProjectPaths.ContentRoot, cultureCode, LegalFile);
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var html = document.RootElement.GetProperty(PrivacyKey).GetString()!;
        var start = html.IndexOf(startHeading, StringComparison.Ordinal);
        start.ShouldBeGreaterThanOrEqualTo(0, cultureCode);
        var end = html.IndexOf(endHeading, start, StringComparison.Ordinal);
        end.ShouldBeGreaterThan(start, cultureCode);

        return html[start..end];
    }
}
