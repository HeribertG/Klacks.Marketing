// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
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
/// Renders the real CountryStartTemplate with the real content, screenshots and recordings for every country in
/// German and in each culture spoken there: one H1, no duplicate DOM id, the header anchors (#branchen, #kontrolle,
/// #regeln) present, links that keep the culture, and never a raw content key - cultures without their own
/// start.json fall back to the German text per key until the translation wave.
/// </summary>
[TestFixture]
public class CountryStartTemplateRenderingTests
{
    private const string BaseUrl = "https://klacks.example/";
    private const string BaseUrlSetting = "Site:BaseUrl";
    private const string H1Pattern = "<h1\\b";
    private const string IdPattern = @"\bid=""([^""]+)""";
    private const string TextNodePattern = @">\s*([^<>]+?)\s*<";
    private const string LabelAttributePattern = @"\b(?:title|alt|aria-label)=""([^""]+)""";
    private const string ContentKeyPattern = @"^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9-]+)+$";
    private const string HrefPattern = @"\bhref=""(/[^""]*)""";

    private static readonly string[] HeaderAnchorIds = { PageSectionIds.Industries, PageSectionIds.Solutions, PageSectionIds.Rules, PageSectionIds.Download, PageSectionIds.Agents };

    private static IEnumerable<TestCaseData> CountryCultures()
    {
        foreach (var country in CountryIndustries.AllCountries)
        {
            yield return new TestCaseData(country, SupportedCultures.DefaultCode);
        }

        foreach (var culture in SupportedCultures.All.Where(culture => culture.Code != SupportedCultures.DefaultCode))
        {
            if (LanguageCountries.TryGetCountries(culture.Code, out var countries))
            {
                foreach (var country in countries)
                {
                    yield return new TestCaseData(country, culture.Code);
                }
            }
        }
    }

    [TestCaseSource(nameof(CountryCultures))]
    public async Task Country_start_page_renders_one_h1_unique_ids_and_no_raw_content_key(string country, string culture)
    {
        var html = await RenderAsync(country, culture);

        Regex.Matches(html, H1Pattern).Count.ShouldBe(1);
        var ids = Regex.Matches(html, IdPattern).Select(match => match.Groups[1].Value).ToList();
        ids.GroupBy(id => id).Where(group => group.Count() > 1).Select(group => group.Key).ShouldBeEmpty();
        foreach (var anchor in HeaderAnchorIds)
        {
            ids.ShouldContain(anchor);
        }

        RawKeys(html).ShouldBeEmpty();
    }

    [TestCase("land-ch", "fr", "/fr/")]
    [TestCase("land-jp", "ja", "/ja/")]
    [TestCase("land-ch", "de", "/land-ch")]
    public async Task Internal_links_keep_the_culture_and_the_country(string country, string culture, string expectedPrefix)
    {
        var html = await RenderAsync(country, culture);

        var internalLinks = Regex.Matches(html, HrefPattern).Select(match => match.Groups[1].Value).ToList();
        internalLinks.ShouldNotBeEmpty();
        internalLinks.ShouldAllBe(link => link.StartsWith(expectedPrefix, StringComparison.Ordinal));
        internalLinks.ShouldContain(link => link.EndsWith($"{country}/{CountryPageLinks.MidSizeBusinessSlug}", StringComparison.Ordinal));
        internalLinks.ShouldContain(link => link.EndsWith($"{country}/{CountryPageLinks.LargeBusinessSlug}", StringComparison.Ordinal));
        internalLinks.ShouldContain(link => link.EndsWith($"{country}#{DemoCarousels.KlacksySectionId}", StringComparison.Ordinal));
    }

    [Test]
    public async Task Swiss_start_page_keeps_the_country_texts_and_shows_the_mandatory_video_note()
    {
        var html = System.Net.WebUtility.HtmlDecode(await RenderAsync(CountryIndustries.SwissCountryPageKey, SupportedCultures.DefaultCode));

        html.ShouldContain("Frühschicht unbesetzt? Klacks schlägt Ersatz vor, der passt. <span class=\"text-secondary\">Die Ruhezeiten prüft es, bevor der Plan rausgeht.</span>");
        html.ShouldContain("data-carousel");
        html.ShouldContain("klacksy-plans-week-de");
        html.ShouldContain("ArG, Datenschutz und der Ruf nach Kontrolle");
        html.ShouldContain("Ein Kalender für jede Realität");
        html.ShouldContain("Bis auf Gemeinde-Ebene");
        html.ShouldContain("Alles eine Frage der Einstellung");
        html.ShouldContain("Wochenhöchstarbeitszeit im Blick behalten");
        html.ShouldContain("Nachtarbeit und Wochenhöchstarbeitszeit, ein Blick");
        html.ShouldContain("Wartezeiten im Video beschleunigt und markiert.");
        html.ShouldContain("Playground öffnen");
        html.ShouldNotContain("Live-Demo");
    }

    private static IEnumerable<string> RawKeys(string html)
    {
        var texts = Regex.Matches(html, TextNodePattern).Select(match => match.Groups[1].Value)
            .Concat(Regex.Matches(html, LabelAttributePattern).Select(match => match.Groups[1].Value));

        return texts.Where(text => Regex.IsMatch(text.Trim(), ContentKeyPattern)).Distinct();
    }

    private static async Task<string> RenderAsync(string country, string culture)
    {
        var environment = new TestWebHostEnvironment();
        var services = new ServiceCollection()
            .AddSingleton<IWebHostEnvironment>(environment)
            .AddSingleton<IConfiguration>(new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { [BaseUrlSetting] = BaseUrl })
                .Build())
            .AddSingleton<IPageContentProvider>(new JsonPageContentProvider(environment))
            .AddSingleton<ILocalizedScreenshotResolver>(new LocalizedScreenshotResolver(environment.WebRootFileProvider))
            .AddSingleton<ILocalizedVideoCatalog>(new LocalizedVideoCatalog(environment.WebRootFileProvider))
            .AddSingleton<NavigationManager>(new TestNavigationManager(BaseUrl, country))
            .AddSingleton<IJSRuntime>(new NoOpJsRuntime())
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<CountryStartTemplate>(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(CountryStartTemplate.PageKey)] = country,
                [nameof(CountryStartTemplate.Culture)] = culture,
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
