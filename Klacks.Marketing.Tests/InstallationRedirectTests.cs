// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Klacks is installed only via the Klacks Store (owner decision 2026-11-09): the former installation pages and their
/// country-less legacy URLs answer with a single 301 to the store page of the country, unknown countries and culture
/// slugs stay 404, and neither the router nor the sitemap knows an installation page any more.
/// </summary>
[TestFixture]
public class InstallationRedirectTests
{
    private const string StoreBase = ExternalLinks.MarketplaceUrl;
    private const string BaseUrl = "https://klacks.example";
    private const string InstallationPagePattern = @"/installation(?![\w-])";

    [TestCase("/land-ch/installation", "/region/ch?culture=de")]
    [TestCase("/fr/land-ch/installation", "/region/ch?culture=fr")]
    [TestCase("/land-be/installation", "/region/be?culture=de")]
    [TestCase("/fr/land-be/installation", "/region/be?culture=fr")]
    [TestCase("/en/land-ie/installation", "/region/ie?culture=en")]
    [TestCase("/zh-cn/land-cn/installation", "/region/cn?culture=zh-CN")]
    [TestCase("/ja/land-ch/installation", "/region/ch?culture=ja")]
    [TestCase("/land-jp/installation", "/region/jp?culture=de")]
    [TestCase("/LAND-CH/Installation/", "/region/ch?culture=de")]
    [TestCase("/installation", "/region/ch?culture=de")]
    [TestCase("/en/installation", "/region/gb?culture=en")]
    [TestCase("/ja/installation", "/region/jp?culture=ja")]
    public void Installation_urls_resolve_to_the_store_page_of_the_country(string path, string expectedStorePath)
    {
        InstallationRedirect.ResolveTarget(path, StoreBase).ShouldBe(StoreBase + expectedStorePath);
    }

    [TestCase("/land-zz/installation")]
    [TestCase("/xx/land-ch/installation")]
    [TestCase("/de/land-ch/installation")]
    [TestCase("/xx/installation")]
    [TestCase("/en/land-ch/spitex/installation")]
    [TestCase("/land-ch/installation/extra")]
    [TestCase("/land-ch/spitex")]
    [TestCase("/installation-und-playground")]
    [TestCase("/")]
    public void Other_paths_are_not_redirected(string path)
    {
        InstallationRedirect.ResolveTarget(path, StoreBase).ShouldBeNull();
    }

    [Test]
    public void Every_country_of_the_site_redirects_to_its_own_store_region_page()
    {
        foreach (var country in CountryIndustries.AllCountries)
        {
            var code = RegionPackages.CountryCode(country)!;

            InstallationRedirect.ResolveTarget($"/{country}/installation", StoreBase)
                .ShouldBe($"{StoreBase}/region/{code}?culture=de", country);
        }
    }

    [Test]
    public void Store_url_falls_back_to_the_store_home_for_a_country_without_a_package()
    {
        RegionPackages.HasPackage("xx").ShouldBeFalse();
        RegionPackages.StoreUrl(StoreBase + "/", "xx", "fr").ShouldBe(StoreBase + "/?culture=fr");
        RegionPackages.StoreUrl(StoreBase, null, "en").ShouldBe(StoreBase + "/?culture=en");
    }

    [Test]
    public void The_redirect_uses_the_configured_store_base_url()
    {
        InstallationRedirect.ResolveTarget("/land-de/installation", "https://store.example/")
            .ShouldBe("https://store.example/region/de?culture=de");
    }

    [TestCase("/land-be/installation", "/region/be?culture=de")]
    [TestCase("/en/land-ie/installation", "/region/ie?culture=en")]
    [TestCase("/zh-cn/land-cn/installation", "/region/cn?culture=zh-CN")]
    [TestCase("/installation", "/region/ch?culture=de")]
    [TestCase("/en/installation", "/region/gb?culture=en")]
    [TestCase("/fr/land-ch/installation?utm_source=newsletter", "/region/ch?culture=fr")]
    public async Task Installation_page_answers_a_single_301_to_the_store(string path, string expectedStorePath)
    {
        await using var factory = new SimpleModeAppFactory(false);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.MovedPermanently, path);
        response.Headers.Location!.OriginalString.ShouldBe(StoreBase + expectedStorePath);
    }

    [TestCase("/land-zz/installation")]
    [TestCase("/xx/land-ch/installation")]
    public async Task Unknown_country_or_culture_stays_404(string path)
    {
        await using var factory = new SimpleModeAppFactory(false);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound, path);
    }

    [Test]
    public void The_router_no_longer_serves_an_installation_page()
    {
        KnownPageRoutes.Contains("/land-ch/installation").ShouldBeFalse();
        KnownPageRoutes.Contains("/fr/land-be/installation").ShouldBeFalse();
    }

    [TestCase(true)]
    [TestCase(false)]
    public void Sitemap_lists_no_installation_page(bool simpleModeEnabled)
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());

        Regex.IsMatch(SitemapGenerator.Build(BaseUrl, provider.HasContentIn, simpleModeEnabled), InstallationPagePattern).ShouldBeFalse();
    }
}
