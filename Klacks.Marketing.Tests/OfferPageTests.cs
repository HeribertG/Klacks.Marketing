// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Pages;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.JSInterop;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The German-only offer and pricing page: it renders with the real content, uses the owner's wording for the pilot
/// ("ohne Verrechnung", never "gratis"/"kostenlos"), keeps its meta description within 155 characters, and - like the
/// mid-size and large business pages - is listed in the sitemap only for German while other cultures stay noindex.
/// </summary>
[TestFixture]
public class OfferPageTests
{
    private const string BaseUrl = "https://klacks.example/";
    private const string SitemapBaseUrl = "https://klacks.example";
    private const string BaseUrlSetting = "Site:BaseUrl";
    private const string GermanCulture = "de";
    private const string FrenchCulture = "fr";
    private const string ContentFile = "angebot.json";
    private const string MetaDescriptionKey = "metaDescription";
    private const int MetaDescriptionMaxLength = 155;
    private const string H1Pattern = "<h1\\b";
    private const string TextNodePattern = @">\s*([^<>]+?)\s*<";
    private const string ContentKeyPattern = @"^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9-]+)+$";
    private const string PilotWording = "ohne Verrechnung";
    private const string ExternalServicesAnchor = "/docs/erste-schritte/installation-und-playground/#welche-externen-dienste-klacks-aufruft";

    private static readonly string[] ForbiddenWords = { "gratis", "kostenlos" };

    [Test]
    public async Task German_offer_page_renders_with_the_pilot_wording_and_without_raw_keys()
    {
        var html = await RenderAsync(CountryIndustries.SwissCountryPageKey, null);
        var decoded = WebUtility.HtmlDecode(html);

        Regex.Matches(html, H1Pattern).Count.ShouldBe(1);
        decoded.ShouldContain("Angebot und Preise");
        decoded.ShouldContain(PilotWording);
        decoded.ShouldContain("Pilotplätze: 3");
        decoded.ShouldContain("IT-Partner gesucht");
        decoded.ShouldContain($"mailto:{ExternalLinks.ContactEmail}");
        decoded.ShouldContain(ExternalServicesAnchor);
        decoded.ShouldContain($"/{CountryIndustries.SwissCountryPageKey}/{CountryPageLinks.PartnerSlug}");
        decoded.ShouldContain($"/{CountryIndustries.SwissCountryPageKey}/{CountryPageLinks.ImprintSlug}");
        RawKeys(html).ShouldBeEmpty();
    }

    [Test]
    public async Task Offer_page_never_says_gratis_or_kostenlos()
    {
        var decoded = WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey, null));
        var content = File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, GermanCulture, ContentFile));

        foreach (var word in ForbiddenWords)
        {
            decoded.ShouldNotContain(word, Case.Insensitive);
            content.ShouldNotContain(word, Case.Insensitive);
        }
    }

    [Test]
    public void Meta_description_fits_the_search_snippet()
    {
        var texts = JsonSerializer.Deserialize<Dictionary<string, string>>(
            File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, GermanCulture, ContentFile)))!;

        texts[MetaDescriptionKey].ShouldNotBeNullOrWhiteSpace();
        texts[MetaDescriptionKey].Length.ShouldBeLessThanOrEqualTo(MetaDescriptionMaxLength);
    }

    [Test]
    public void Offer_page_is_in_the_sitemap_for_german_only()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());

        var sitemap = SitemapGenerator.Build(SitemapBaseUrl, provider.HasContentIn);

        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/land-ch/{CountryPageLinks.OfferSlug}</loc>");
        sitemap.ShouldNotContain($"/fr/land-fr/{CountryPageLinks.OfferSlug}");
        sitemap.ShouldNotContain($"/en/land-gb/{CountryPageLinks.OfferSlug}");
    }

    [Test]
    public async Task French_offer_page_falls_back_to_german_text_and_is_not_indexed()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());

        provider.HasContentIn(GermanCulture, CountryPageLinks.OfferSlug).ShouldBeTrue();
        provider.HasContentIn(FrenchCulture, CountryPageLinks.OfferSlug).ShouldBeFalse();
        MarketingProjectPaths.ReadSource("Pages/Angebot.razor").ShouldContain("IndexTranslatedOnly=\"true\"");

        var decoded = WebUtility.HtmlDecode(await RenderAsync("land-fr", FrenchCulture));
        decoded.ShouldContain(PilotWording);
        RawKeys(decoded).ShouldBeEmpty();
    }

    private static IEnumerable<string> RawKeys(string html)
        => Regex.Matches(html, TextNodePattern)
            .Select(match => match.Groups[1].Value.Trim())
            .Where(text => Regex.IsMatch(text, ContentKeyPattern))
            .Distinct();

    private static async Task<string> RenderAsync(string country, string? culture)
    {
        var environment = new TestWebHostEnvironment();
        var services = new ServiceCollection()
            .AddSingleton<IWebHostEnvironment>(environment)
            .AddSingleton<IConfiguration>(new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { [BaseUrlSetting] = BaseUrl })
                .Build())
            .AddSingleton<IPageContentProvider>(new JsonPageContentProvider(environment))
            .AddSingleton<NavigationManager>(new TestNavigationManager(BaseUrl, country))
            .AddSingleton<IJSRuntime>(new NoOpJsRuntime())
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<Angebot>(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(Angebot.Country)] = country,
                [nameof(Angebot.Culture)] = culture,
            }));
            return output.ToHtmlString();
        });
    }

    private sealed class TestNavigationManager : NavigationManager
    {
        public TestNavigationManager(string baseUrl, string path)
        {
            Initialize(baseUrl, baseUrl + path);
        }

        protected override void NavigateToCore(string uri, bool forceLoad)
        {
        }
    }

    private sealed class NoOpJsRuntime : IJSRuntime
    {
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args) => ValueTask.FromResult(default(TValue)!);

        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args) =>
            ValueTask.FromResult(default(TValue)!);
    }
}
