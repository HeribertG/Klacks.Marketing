// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Xml.Linq;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Seo;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The docs sitemap index lists exactly one sitemap per supported culture (default locale at the docs root, the others in
/// their Docusaurus locale folder), and robots.txt announces both the site sitemap and the index.
/// </summary>
[TestFixture]
public class DocsSitemapIndexTests
{
    private const string BaseUrl = "https://klacks.example";
    private const int ExpectedDocsLocaleCount = 25;
    private const string HttpsPrefix = "https://";
    private const string DocsRootSitemap = "https://klacks.example/docs/sitemap.xml";
    private const string SitemapLinePrefix = "Sitemap: ";
    private static readonly XNamespace SitemapNamespace = "http://www.sitemaps.org/schemas/sitemap/0.9";

    private static readonly IReadOnlyDictionary<string, string> ExpectedLocaleFolders = new Dictionary<string, string>
    {
        ["zh-CN"] = "zh-Hans",
        ["zh-TW"] = "zh-Hant",
        ["en"] = "en",
        ["fr"] = "fr",
        ["it"] = "it",
        ["ar"] = "ar",
        ["he"] = "he",
        ["nb"] = "nb",
    };

    [Test]
    public void Index_lists_exactly_one_sitemap_per_supported_culture()
    {
        var locs = ParseLocs(DocsSitemapIndexGenerator.Build(BaseUrl));

        locs.Count.ShouldBe(ExpectedDocsLocaleCount);
        locs.Count.ShouldBe(SupportedCultures.All.Count);
    }

    [Test]
    public void Every_entry_is_absolute_https_unique_and_a_docs_sitemap()
    {
        var locs = ParseLocs(DocsSitemapIndexGenerator.Build(BaseUrl));

        locs.ShouldAllBe(loc => loc.StartsWith(HttpsPrefix, StringComparison.Ordinal));
        locs.ShouldAllBe(loc => loc.StartsWith(BaseUrl + ExternalLinks.DocsBasePath, StringComparison.Ordinal));
        locs.ShouldAllBe(loc => loc.EndsWith("/sitemap.xml", StringComparison.Ordinal));
        locs.Distinct(StringComparer.Ordinal).Count().ShouldBe(locs.Count);
    }

    [Test]
    public void Default_locale_sitemap_sits_at_the_docs_root_and_is_listed_first()
    {
        var locs = ParseLocs(DocsSitemapIndexGenerator.Build(BaseUrl));

        locs[0].ShouldBe(DocsRootSitemap);
        locs.Count(loc => loc == DocsRootSitemap).ShouldBe(1);
    }

    [TestCaseSource(nameof(ExpectedLocaleFolderCases))]
    public void Non_default_locales_use_their_docusaurus_folder_name(string cultureCode, string folder)
    {
        var culture = SupportedCultures.All.Single(c => c.Code == cultureCode);
        var locs = ParseLocs(DocsSitemapIndexGenerator.Build(BaseUrl));

        culture.DocsLocale.ShouldBe(folder);
        locs.ShouldContain($"{BaseUrl}/docs/{folder}/sitemap.xml");
    }

    [Test]
    public void Chinese_cultures_never_leak_their_marketing_codes_into_the_index()
    {
        var index = DocsSitemapIndexGenerator.Build(BaseUrl);

        index.ShouldNotContain("zh-CN");
        index.ShouldNotContain("zh-TW");
    }

    [Test]
    public void Trailing_slash_on_the_base_url_is_ignored()
    {
        DocsSitemapIndexGenerator.Build(BaseUrl + "/").ShouldBe(DocsSitemapIndexGenerator.Build(BaseUrl));
    }

    [Test]
    public void Index_route_lives_outside_the_docs_path_served_by_the_docs_proxy()
    {
        DocsSitemapIndexGenerator.IndexPath.ShouldNotStartWith(ExternalLinks.DocsBasePath);
        DocsSitemapIndexGenerator.IndexPath.ShouldEndWith(".xml");
    }

    [Test]
    public void Robots_txt_announces_the_site_sitemap_and_the_docs_sitemap_index()
    {
        var sitemapLines = RobotsTxtGenerator.Build(BaseUrl)
            .Split('\n', StringSplitOptions.TrimEntries)
            .Where(line => line.StartsWith(SitemapLinePrefix, StringComparison.Ordinal))
            .ToList();

        sitemapLines.ShouldBe(new[]
        {
            $"{SitemapLinePrefix}{BaseUrl}/sitemap.xml",
            $"{SitemapLinePrefix}{BaseUrl}{DocsSitemapIndexGenerator.IndexPath}",
        });
    }

    public static IEnumerable<TestCaseData> ExpectedLocaleFolderCases() =>
        ExpectedLocaleFolders.Select(pair => new TestCaseData(pair.Key, pair.Value));

    private static List<string> ParseLocs(string xml)
    {
        var root = XDocument.Parse(xml).Root!;

        root.Name.ShouldBe(SitemapNamespace + "sitemapindex");
        return root.Elements(SitemapNamespace + "sitemap")
            .Select(entry => entry.Element(SitemapNamespace + "loc")!.Value)
            .ToList();
    }
}
