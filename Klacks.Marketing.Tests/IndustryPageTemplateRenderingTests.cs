// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Microsoft.Extensions.Options;
using Klacks.Marketing.Shared;
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
/// Renders the real IndustryPageTemplate for every country's Klacksy page and every industry page in German: the demo
/// carousels are bundled into one feature explorer like on the country start page, no DOM id is duplicated, the
/// "#regeln" header anchor stays, and the Klacksy page opens the Klacksy chapter while industry pages open the rules.
/// </summary>
[TestFixture]
public class IndustryPageTemplateRenderingTests
{
    private const string BaseUrl = "https://klacks.example/";
    private const string BaseUrlSetting = "Site:BaseUrl";
    private const string IdPattern = @"\bid=""([^""]+)""";
    private const string KlacksySlug = "klacksy";
    private const string ExplorerSectionTag = "<section id=\"" + FeatureExplorer.SectionId + "\"";
    private const string CarouselSectionMarker = "aria-roledescription=\"carousel\"";

    private static IEnumerable<TestCaseData> Pages()
    {
        foreach (var country in CountryIndustries.AllCountries)
        {
            yield return new TestCaseData(country, KlacksySlug, DemoCarousels.KlacksySectionId).SetName($"{country}/{KlacksySlug}");
            foreach (var industry in CountryIndustries.ForCountry(country) ?? Array.Empty<CountryIndustry>())
            {
                yield return new TestCaseData(country, industry.Slug, DemoCarousels.RulesSectionId).SetName($"{country}/{industry.Slug}");
            }
        }
    }

    [TestCaseSource(nameof(Pages))]
    public async Task Industry_page_bundles_the_carousels_into_one_feature_explorer(string country, string slug, string expectedOpenChapter)
    {
        var html = await RenderAsync(country, slug);

        Regex.Matches(html, Regex.Escape(ExplorerSectionTag)).Count.ShouldBe(1);
        Regex.Matches(html, Regex.Escape(CarouselSectionMarker)).Count.ShouldBe(1);
        var ids = Regex.Matches(html, IdPattern).Select(match => match.Groups[1].Value).ToList();
        ids.GroupBy(id => id).Where(group => group.Count() > 1).Select(group => group.Key).ShouldBeEmpty();
        ids.ShouldContain(PageSectionIds.Rules);
        html.ShouldContain($"id=\"{expectedOpenChapter}-button\"");
        Regex.IsMatch(html, $@"id=""{Regex.Escape(expectedOpenChapter)}-button""[^>]*aria-expanded=""true""").ShouldBeTrue();
    }

    [TestCase("land-ch", "spitex")]
    [TestCase("land-de", "logistik")]
    public async Task Rules_chapter_of_an_industry_page_shows_the_country_calendar_and_a_teaser_listing_exactly_its_views(string country, string slug)
    {
        var html = System.Net.WebUtility.HtmlDecode(await RenderAsync(country, slug));

        html.ShouldContain(">Kalender</button>");
        html.ShouldContain(">Zuschläge</button>");
        html.ShouldContain(">Verstösse live</button>");
        html.ShouldContain(">Kalender · Zuschläge · Verstösse live</span>");
    }
    [TestCase("land-gb", "klacksy", "en", "You tell Klacksy what to do")]
    [TestCase("land-ch", "spitex", "fr", "Collisions horaires")]
    public async Task Chapter_subtitle_without_the_recording_prefix_starts_with_a_capital_letter(string country, string slug, string culture, string expectedStart)
    {
        var html = System.Net.WebUtility.HtmlDecode(await RenderAsync(country, slug, culture));

        html.ShouldContain(">" + expectedStart);
    }

    private static async Task<string> RenderAsync(string country, string slug, string culture = SupportedCultures.DefaultCode)
    {
        var environment = new TestWebHostEnvironment();
        var routePath = $"{country}/{slug}";
        var services = new ServiceCollection()
            .AddSingleton<IWebHostEnvironment>(environment)
            .AddSingleton<IConfiguration>(new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { [BaseUrlSetting] = BaseUrl })
                .Build())
            .AddSingleton<IPageContentProvider>(new JsonPageContentProvider(environment))
            .AddSingleton<ILocalizedScreenshotResolver>(new LocalizedScreenshotResolver(environment.WebRootFileProvider))
            .AddSingleton<ILocalizedVideoCatalog>(new LocalizedVideoCatalog(environment.WebRootFileProvider))
            .AddSingleton<NavigationManager>(new TestNavigationManager(BaseUrl, routePath))
            .AddSingleton<IJSRuntime>(new NoOpJsRuntime())
            .AddSingleton<IOptions<SiteModeOptions>>(Options.Create(new SiteModeOptions()))
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<IndustryPageTemplate>(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(IndustryPageTemplate.PageKey)] = $"{country}-{slug}",
                [nameof(IndustryPageTemplate.RoutePath)] = routePath,
                [nameof(IndustryPageTemplate.Culture)] = culture,
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
