// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Text.RegularExpressions;
using NUnit.Framework;
using Shouldly;

namespace Klacks.Marketing.Tests;

/// <summary>
/// Keeps data-flow promises off the site: Klacks stores data on the customer's servers, but address search and
/// routing call public OpenStreetMap services by default, so no page may claim that data "never leaves" the house
/// or country. Only storage-location statements are allowed.
/// </summary>
[TestFixture]
public class DataFlowClaimGuardTests
{
    private const string ContentFilePattern = "*.json";

    private static readonly (string Culture, string Pattern)[] ForbiddenClaims =
    {
        ("de", @"im Land bleibt"),
        ("de", @"bleib\w+ im Haus"),
        ("de", @"ohne Auslandtransfer von"),
        ("de", @"Haus verlassen"),
        ("de", @"verlassen Ihr Haus nicht"),
        ("de", @"Daten bleiben in "),
        ("en", @"never leaves? (?:your|the)"),
        ("en", @"stays? in the country"),
        ("zh-CN", @"不出境"),
        ("zh-CN", @"留存[^,。]{0,6}境内"),
        ("zh-CN", @"留在[^,。]{0,4}境内"),
    };

    [Test]
    public void No_page_promises_that_data_never_leaves_the_house_or_country()
    {
        var violations = new List<string>();

        foreach (var (culture, pattern) in ForbiddenClaims)
        {
            var directory = Path.Combine(MarketingProjectPaths.ContentRoot, culture);
            foreach (var file in Directory.EnumerateFiles(directory, ContentFilePattern))
            {
                var lines = File.ReadAllLines(file);
                for (var index = 0; index < lines.Length; index++)
                {
                    if (Regex.IsMatch(lines[index], pattern))
                    {
                        violations.Add($"{culture}/{Path.GetFileName(file)}:{index + 1} /{pattern}/");
                    }
                }
            }
        }

        violations.ShouldBeEmpty();
    }
}
