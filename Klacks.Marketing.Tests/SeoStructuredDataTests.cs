// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Json;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Localization.Seo;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The JSON-LD blocks describe an installed, AGPL-licensed product and link to its public identities; the sitemap
/// carries the same x-default alternate as the pages themselves.
/// </summary>
[TestFixture]
public class SeoStructuredDataTests
{
    private const string BaseUrl = "https://klacks.example";
    private const string ScriptOpen = "<script type=\"application/ld+json\">";
    private const string ScriptClose = "</script>";

    [Test]
    public void Software_application_names_the_installable_platforms_licence_and_public_profiles()
    {
        var node = Parse(JsonLdBuilder.SoftwareApplicationScript(BaseUrl, "en", "Klacks plans shifts."));

        node.GetProperty("operatingSystem").GetString().ShouldBe("Linux, Windows");
        node.GetProperty("license").GetString().ShouldBe("https://www.gnu.org/licenses/agpl-3.0.html");
        node.GetProperty("sameAs").EnumerateArray().Select(item => item.GetString()).ShouldBe(new[]
        {
            "https://github.com/HeribertG/Klacks.Api",
            "https://www.wikidata.org/wiki/Q141398267",
        });
    }

    [Test]
    public void Organization_links_to_its_github_profile_and_wikidata_item()
    {
        var node = Parse(JsonLdBuilder.OrganizationScript(BaseUrl));

        node.GetProperty("sameAs").EnumerateArray().Select(item => item.GetString()).ShouldBe(new[]
        {
            "https://github.com/HeribertG",
            "https://www.wikidata.org/wiki/Q141398266",
        });
    }

    [Test]
    public void Sitemap_entries_carry_an_x_default_alternate_pointing_at_the_default_culture()
    {
        var sitemap = SitemapGenerator.Build(BaseUrl, (_, _) => true);

        var urlCount = CountOccurrences(sitemap, "<url>");
        CountOccurrences(sitemap, "hreflang=\"x-default\"").ShouldBe(urlCount);
        sitemap.ShouldContain($"hreflang=\"x-default\" href=\"{BaseUrl}/land-ch\" />");
    }

    [Test]
    public void Marketing_sources_contain_no_discord_link()
    {
        foreach (var relativePath in new[] { "Shared/MainLayout.razor", "Shared/CountryStartTemplate.razor", "Pages/KleineBetriebe.razor", "Localization/ExternalLinks.cs" })
        {
            MarketingProjectPaths.ReadSource(relativePath).ShouldNotContain("discord", Case.Insensitive);
        }
    }

    private static JsonElement Parse(string script)
    {
        script.ShouldStartWith(ScriptOpen);
        script.ShouldEndWith(ScriptClose);
        var json = script[ScriptOpen.Length..^ScriptClose.Length];
        return JsonDocument.Parse(json).RootElement.Clone();
    }

    private static int CountOccurrences(string text, string value)
    {
        var count = 0;
        var index = text.IndexOf(value, StringComparison.Ordinal);
        while (index >= 0)
        {
            count++;
            index = text.IndexOf(value, index + value.Length, StringComparison.Ordinal);
        }

        return count;
    }
}
