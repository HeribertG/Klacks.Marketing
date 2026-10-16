// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Json;
using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The "anonymous visit statistics" section of the privacy statement names the share marker ref=share in every language
/// and, in German, every additionally counted action (video play, mode switch, share buttons) without weakening the
/// no-cookie, aggregated-only claims.
/// </summary>
[TestFixture]
public class PrivacyStatisticsCoverageTests
{
    private const string LegalFile = "legal.json";
    private const string PrivacyKey = "privacy.contentHtml";
    private const string StatisticsHeading = "<h3>";
    private const string ShareMarker = "ref=share";
    private const string GermanCode = "de";

    private static readonly string[] GermanCountedActions =
    [
        "Abspielen eines Videos",
        "Wechsel zwischen einfacher Ansicht und Expertenmodus",
        "Nutzung der Schaltflächen zum Weiterleiten",
        "ref=share",
        "als grobe Herkunft gezählt",
    ];

    private static readonly string[] GermanKeptClaims =
    [
        "Es werden keine Cookies gesetzt",
        "ausschliesslich aggregierte Zähler",
        "ein Profil einzelner Besucher entsteht nicht",
    ];

    [TestCaseSource(nameof(AllCultureCodes))]
    public void Statistics_section_names_the_share_marker(string cultureCode)
    {
        StatisticsSection(cultureCode).ShouldContain(ShareMarker);
    }

    [Test]
    public void German_statistics_section_lists_the_additionally_counted_actions_and_keeps_its_claims()
    {
        var statistics = StatisticsSection(GermanCode);

        foreach (var phrase in GermanCountedActions.Concat(GermanKeptClaims))
        {
            statistics.ShouldContain(phrase);
        }
    }

    private static IEnumerable<string> AllCultureCodes() => SupportedCultures.All.Select(culture => culture.Code);

    private static string StatisticsSection(string cultureCode)
    {
        var path = Path.Combine(MarketingProjectPaths.ContentRoot, cultureCode, LegalFile);
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var html = document.RootElement.GetProperty(PrivacyKey).GetString()!;
        var start = html.IndexOf(StatisticsHeading, StringComparison.Ordinal);
        var end = html.IndexOf("<h2>", start, StringComparison.Ordinal);

        return html[start..end];
    }
}
