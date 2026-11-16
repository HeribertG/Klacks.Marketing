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
/// The technical facts page is written in all 25 cultures (owner decision 2026-11-16, replacing the German/English-only
/// decision of 2026-10-22): every culture renders its own text with its own lang/dir, is indexable and is listed in the
/// sitemap at its default country. Every translation keeps the German keys, HTML structure and code identifiers; its
/// meta description fits the search snippet and the page carries a dated "as of" line, so outdated versions are recognisable.
/// </summary>
[TestFixture]
public class TechPageTests
{
    private const string SitemapBaseUrl = "https://klacks.example";
    private const string PageSlug = "technik";
    private const string ContentFile = "technik.json";
    private const string ContentHtmlKey = "contentHtml";
    private const string MetaDescriptionKey = "metaDescription";
    private const string HeroTitleKey = "hero.title";
    private const string AsOfKey = "asOf";
    private const string NoIndex = "noindex";
    private const string TagPattern = "</?[a-z0-9]+";
    private const string CodePattern = "<code>(.*?)</code>";
    private const string HrefPattern = "href=\"([^\"]*)\"";
    private const int MetaDescriptionMaxLength = 155;

    private static readonly string[] AllCultures = SupportedCultures.All.Select(culture => culture.Code).ToArray();

    private static readonly string[] TranslatedCultures = AllCultures.Where(code => code != SupportedCultures.DefaultCode).ToArray();

    [TestCase("/land-ch/technik", "de", "ltr")]
    [TestCase("/en/land-gb/technik", "en", "ltr")]
    [TestCase("/fr/land-fr/technik", "fr", "ltr")]
    [TestCase("/ja/land-jp/technik", "ja", "ltr")]
    [TestCase("/ar/land-sa/technik", "ar", "rtl")]
    public async Task Every_culture_renders_its_own_indexable_text(string path, string culture, string direction)
    {
        var html = await GetHtmlAsync(path);

        html.ShouldNotContain(NoIndex);
        html.ShouldContain("legal-prose");
        html.ShouldContain($"lang=\"{culture}\" dir=\"{direction}\"");
        WebUtility.HtmlDecode(html).ShouldContain(Text(culture, HeroTitleKey));
    }

    [Test]
    public void Every_culture_has_its_own_text()
    {
        var cultures = SupportedCultures.All
            .Where(culture => File.Exists(Path.Combine(MarketingProjectPaths.ContentRoot, culture.Code, ContentFile)))
            .Select(culture => culture.Code);

        cultures.ShouldBe(AllCultures, ignoreOrder: true);
    }

    [TestCaseSource(nameof(AllCultures))]
    public void Meta_description_and_as_of_line_are_present(string culture)
    {
        Text(culture, MetaDescriptionKey).Length.ShouldBeInRange(1, MetaDescriptionMaxLength);
        Text(culture, AsOfKey).ShouldNotBeNullOrWhiteSpace();
    }

    [TestCaseSource(nameof(TranslatedCultures))]
    public void Translation_keeps_the_german_keys_markup_and_code(string culture)
    {
        Keys(culture).ShouldBe(Keys(SupportedCultures.DefaultCode), culture);

        var german = Text(SupportedCultures.DefaultCode, ContentHtmlKey);
        var translated = Text(culture, ContentHtmlKey);

        Matches(translated, TagPattern).ShouldBe(Matches(german, TagPattern), $"{culture}: HTML tags");
        Matches(translated, CodePattern).ShouldBe(Matches(german, CodePattern), $"{culture}: code");
        Matches(translated, HrefPattern).ShouldBe(Matches(german, HrefPattern), $"{culture}: links");
    }

    [Test]
    public void Sitemap_lists_the_page_in_every_culture_at_its_default_country()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        var sitemap = SitemapGenerator.Build(SitemapBaseUrl, provider.HasContentIn);

        foreach (var culture in SupportedCultures.All)
        {
            var prefix = culture.UrlSlug.Length == 0 ? string.Empty : "/" + culture.UrlSlug;
            var country = LanguageCountries.DefaultCountryFor(culture.Code);
            sitemap.ShouldContain($"<loc>{SitemapBaseUrl}{prefix}/{country}/{PageSlug}</loc>", Case.Sensitive, culture.Code);
        }
    }

    private static string Text(string culture, string key)
    {
        using var document = Read(culture);
        return document.RootElement.GetProperty(key).GetString() ?? string.Empty;
    }

    private static List<string> Keys(string culture)
    {
        using var document = Read(culture);
        return document.RootElement.EnumerateObject().Select(property => property.Name).ToList();
    }

    private static JsonDocument Read(string culture)
        => JsonDocument.Parse(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, culture, ContentFile)));

    private static List<string> Matches(string text, string pattern)
        => Regex.Matches(text, pattern).Select(match => match.Groups[match.Groups.Count - 1].Value).ToList();

    private static async Task<string> GetHtmlAsync(string path)
    {
        await using var factory = new SimpleModeAppFactory(simpleModeEnabled: true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, path);
        return await response.Content.ReadAsStringAsync();
    }
}
