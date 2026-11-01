// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The imports and exports page is written in German, English, French and Italian: these are indexable and listed in the
/// sitemap, every other culture serves the English text marked lang="en" and stays noindex and out of the sitemap. Its meta description
/// fits the search snippet and the page carries a dated "as of" line, so outdated versions are recognisable.
/// </summary>
[TestFixture]
public class ExportsPageTests
{
    private const string SitemapBaseUrl = "https://klacks.example";
    private const string ContentFile = "exporte.json";
    private const string SharedFile = "shared.json";
    private const string FooterExportsKey = "footer.exports";
    private const string MetaDescriptionKey = "metaDescription";
    private const string AsOfKey = "asOf";
    private const string NoIndex = "noindex";
    private const string EnglishContentMarker = "lang=\"en\" dir=\"ltr\"";
    private const int MetaDescriptionMaxLength = 155;
    private const int ExpertLinksToExportsPage = 3;
    private const int SimpleLinksToExportsPage = 1;
    private const string ExportsLinkPattern = "href=\"[^\"]*/exporte\"";

    private static readonly string[] WrittenCultures = { "de", "en", "fr", "it" };

    [TestCase("/land-ch/exporte")]
    [TestCase("/en/land-gb/exporte")]
    [TestCase("/fr/land-fr/exporte")]
    [TestCase("/it/land-it/exporte")]
    public async Task Written_cultures_render_an_indexable_page(string path)
    {
        var html = await GetHtmlAsync(path);

        html.ShouldNotContain(NoIndex);
        html.ShouldContain("legal-prose");
    }

    [TestCase("/fr/land-fr/exporte", "fr")]
    [TestCase("/it/land-it/exporte", "it")]
    public async Task French_and_italian_render_their_own_text_not_the_english_fallback(string path, string culture)
    {
        var html = await GetHtmlAsync(path);

        html.ShouldContain($"lang=\"{culture}\" dir=\"ltr\"");
        html.ShouldNotContain(EnglishContentMarker);
        WebUtility.HtmlDecode(html).ShouldContain(Text(culture, "hero.title"));
    }

    [TestCase("/ja/land-jp/exporte")]
    [TestCase("/ar/land-sa/exporte")]
    [TestCase("/es/land-es/exporte")]
    public async Task Other_cultures_show_the_english_text_and_stay_noindex(string path)
    {
        var html = await GetHtmlAsync(path);
        var english = Text("en", "hero.title");

        html.ShouldContain(NoIndex);
        html.ShouldContain(EnglishContentMarker);
        WebUtility.HtmlDecode(html).ShouldContain(english);
    }

    [Test]
    public void Only_german_english_french_and_italian_have_their_own_text()
    {
        var cultures = SupportedCultures.All
            .Where(culture => File.Exists(Path.Combine(MarketingProjectPaths.ContentRoot, culture.Code, ContentFile)))
            .Select(culture => culture.Code);

        cultures.ShouldBe(WrittenCultures, ignoreOrder: true);
    }

    [TestCase("de")]
    [TestCase("en")]
    [TestCase("fr")]
    [TestCase("it")]
    public void Meta_description_and_as_of_line_are_present(string culture)
    {
        Text(culture, MetaDescriptionKey).Length.ShouldBeInRange(1, MetaDescriptionMaxLength);
        Text(culture, AsOfKey).ShouldNotBeNullOrWhiteSpace();
    }

    [Test]
    public void Sitemap_lists_the_page_only_for_german_english_french_and_italian()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        var sitemap = SitemapGenerator.Build(SitemapBaseUrl, provider.HasContentIn);

        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/land-ch/exporte</loc>");
        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/en/land-gb/exporte</loc>");
        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/fr/land-fr/exporte</loc>");
        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/it/land-it/exporte</loc>");
        sitemap.ShouldNotContain($"<loc>{SitemapBaseUrl}/ja/land-jp/exporte</loc>");
        sitemap.ShouldNotContain($"<loc>{SitemapBaseUrl}/es/land-es/exporte</loc>");
    }

    [TestCase("/land-ch/experten", "/land-ch/exporte", "de")]
    [TestCase("/en/land-gb/experten", "/en/land-gb/exporte", "en")]
    [TestCase("/fr/land-fr/experten", "/fr/land-fr/exporte", "fr")]
    [TestCase("/ja/land-jp/experten", "/ja/land-jp/exporte", "ja")]
    public async Task Expert_start_page_links_the_page_in_the_desktop_and_mobile_menu_and_the_footer_in_every_culture(string path, string href, string culture)
    {
        var html = await GetHtmlAsync(path);
        var label = SharedText(culture, FooterExportsKey);

        Regex.Matches(html, Regex.Escape($"href=\"{href}\"")).Count.ShouldBe(ExpertLinksToExportsPage);
        Regex.IsMatch(html, $"<a class=\"nav-link[^\"]*\" href=\"{Regex.Escape(href)}\"").ShouldBeTrue();
        WebUtility.HtmlDecode(html).ShouldContain($">{label}</a>");
    }

    [Test]
    public void Every_culture_has_a_footer_label_for_the_page()
    {
        foreach (var culture in SupportedCultures.All)
        {
            SharedText(culture.Code, FooterExportsKey).ShouldNotBeNullOrWhiteSpace(culture.Code);
        }
    }

    [Test]
    public async Task Simple_start_page_keeps_only_the_footer_link()
    {
        var html = await GetHtmlAsync("/land-ch");

        Regex.Matches(html, ExportsLinkPattern).Count.ShouldBe(SimpleLinksToExportsPage);
    }

    private static string Text(string culture, string key) => ReadText(culture, ContentFile, key);

    private static string SharedText(string culture, string key) => ReadText(culture, SharedFile, key);

    private static string ReadText(string culture, string file, string key)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, culture, file)));
        return document.RootElement.GetProperty(key).GetString() ?? string.Empty;
    }

    private static async Task<string> GetHtmlAsync(string path)
    {
        await using var factory = new SimpleModeAppFactory(simpleModeEnabled: true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, path);
        return await response.Content.ReadAsStringAsync();
    }
}
