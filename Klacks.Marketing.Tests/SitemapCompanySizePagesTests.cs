// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The mid-size and large business pages are in the sitemap, but - unlike the legal pages - only in the cultures
/// that have their own text for them, at the culture's default country; the retired preview URLs are not listed.
/// </summary>
[TestFixture]
public class SitemapCompanySizePagesTests
{
    private const string BaseUrl = "https://klacks.example";
    private const string MidSizeSlug = "mittlere-betriebe";
    private const string LargeSlug = "grosse-betriebe";

    [Test]
    public void Business_size_pages_are_listed_only_in_cultures_with_their_own_text()
    {
        var sitemap = SitemapGenerator.Build(BaseUrl, (culture, pageKey) =>
            culture == SupportedCultures.DefaultCode || (culture == "fr" && pageKey == MidSizeSlug));

        sitemap.ShouldContain($"<loc>{BaseUrl}/land-ch/{MidSizeSlug}</loc>");
        sitemap.ShouldContain($"<loc>{BaseUrl}/land-ch/{LargeSlug}</loc>");
        sitemap.ShouldContain($"<loc>{BaseUrl}/fr/land-fr/{MidSizeSlug}</loc>");
        sitemap.ShouldNotContain($"/fr/land-fr/{LargeSlug}");
        sitemap.ShouldNotContain($"/en/land-gb/{MidSizeSlug}");
        sitemap.ShouldNotContain($"/en/land-gb/{LargeSlug}");
    }

    [Test]
    public void Business_size_pages_are_not_listed_under_every_country()
    {
        var sitemap = SitemapGenerator.Build(BaseUrl, (_, _) => true);

        sitemap.ShouldContain($"<loc>{BaseUrl}/land-ch/{MidSizeSlug}</loc>");
        sitemap.ShouldNotContain($"<loc>{BaseUrl}/land-de/{MidSizeSlug}</loc>");
        sitemap.ShouldContain($"<loc>{BaseUrl}/ja/land-jp/{LargeSlug}</loc>");
    }

    [Test]
    public void Retired_preview_urls_are_not_in_the_sitemap()
    {
        var sitemap = SitemapGenerator.Build(BaseUrl, (_, _) => true);

        sitemap.ShouldNotContain("vorschau");
    }

    [Test]
    public void Real_content_lists_the_business_size_pages_for_german()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());

        var sitemap = SitemapGenerator.Build(BaseUrl, provider.HasContentIn);

        sitemap.ShouldContain($"<loc>{BaseUrl}/land-ch/{MidSizeSlug}</loc>");
        sitemap.ShouldContain($"<loc>{BaseUrl}/land-ch/{LargeSlug}</loc>");
    }
}
