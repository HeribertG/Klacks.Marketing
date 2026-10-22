// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.Json;
using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The technical facts page exists in German and English only (owner decision 2026-10-22): both are indexable, every
/// other culture serves the English text marked lang="en" and stays noindex and out of the sitemap. Its meta description
/// fits the search snippet and the page carries a dated "as of" line, so outdated versions are recognisable.
/// </summary>
[TestFixture]
public class TechPageTests
{
    private const string SitemapBaseUrl = "https://klacks.example";
    private const string ContentFile = "technik.json";
    private const string MetaDescriptionKey = "metaDescription";
    private const string AsOfKey = "asOf";
    private const string NoIndex = "noindex";
    private const string EnglishContentMarker = "lang=\"en\" dir=\"ltr\"";
    private const int MetaDescriptionMaxLength = 155;

    private static readonly string[] WrittenCultures = { "de", "en" };

    [TestCase("/land-ch/technik")]
    [TestCase("/en/land-gb/technik")]
    public async Task Written_cultures_render_an_indexable_page(string path)
    {
        var html = await GetHtmlAsync(path);

        html.ShouldNotContain(NoIndex);
        html.ShouldContain("legal-prose");
    }

    [TestCase("/fr/land-fr/technik")]
    [TestCase("/ja/land-jp/technik")]
    [TestCase("/ar/land-sa/technik")]
    public async Task Other_cultures_show_the_english_text_and_stay_noindex(string path)
    {
        var html = await GetHtmlAsync(path);
        var english = Text("en", "hero.title");

        html.ShouldContain(NoIndex);
        html.ShouldContain(EnglishContentMarker);
        WebUtility.HtmlDecode(html).ShouldContain(english);
    }

    [Test]
    public void Only_german_and_english_have_their_own_text()
    {
        var cultures = SupportedCultures.All
            .Where(culture => File.Exists(Path.Combine(MarketingProjectPaths.ContentRoot, culture.Code, ContentFile)))
            .Select(culture => culture.Code);

        cultures.ShouldBe(WrittenCultures, ignoreOrder: true);
    }

    [TestCase("de")]
    [TestCase("en")]
    public void Meta_description_and_as_of_line_are_present(string culture)
    {
        Text(culture, MetaDescriptionKey).Length.ShouldBeInRange(1, MetaDescriptionMaxLength);
        Text(culture, AsOfKey).ShouldNotBeNullOrWhiteSpace();
    }

    [Test]
    public void Sitemap_lists_the_page_only_for_german_and_english()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        var sitemap = SitemapGenerator.Build(SitemapBaseUrl, provider.HasContentIn);

        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/land-ch/technik</loc>");
        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/en/land-gb/technik</loc>");
        sitemap.ShouldNotContain($"<loc>{SitemapBaseUrl}/fr/land-fr/technik</loc>");
    }

    private static string Text(string culture, string key)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, culture, ContentFile)));
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
