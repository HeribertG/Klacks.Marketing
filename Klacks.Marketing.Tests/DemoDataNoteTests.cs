// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Pages;
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
/// Guards the demo-data note (made-up names and places with a Swiss background in Latin script): the component renders
/// the shared text, every page template that shows recordings or screenshots of the app also shows the note, the
/// playground modal carries the short variant, the retired start.json note is no longer read, and every culture has
/// both texts in its own language.
/// </summary>
[TestFixture]
public class DemoDataNoteTests
{
    private const string BaseUrl = "https://klacks.example/";
    private const string BaseUrlSetting = "Site:BaseUrl";
    private const string SharedFile = "shared.json";
    private const string KlacksySlug = "klacksy";
    private const string SwissCountry = "land-ch";
    private const string RetiredNoteKey = "demo.dataNote";
    private const string MediaPattern = @"<video\b|\bmagnify-image\b|\brule-demo-poster\b";
    private const string GermanNoteStart = "Hinweis zu den Beispieldaten:";
    private const string EnglishNoteStart = "Note on the sample data:";
    private const string GermanShortStart = "Alle Namen und Orte im Playground";
    private const string EnglishShortStart = "All names and places in the Playground";

    private static readonly string[] NoteKeys = { DemoDataNote.NoteKey, DemoDataNote.NoteShortKey };

    private static readonly string[] SourcesWithoutRetiredNote =
    {
        "Shared/CountryStartTemplate.razor",
        "Shared/FeatureExplorer.razor",
        "Shared/IndustryPageTemplate.razor",
        "Pages/MittlereBetriebe.razor",
    };

    private static IEnumerable<string> CultureCodes => SupportedCultures.All.Select(culture => culture.Code);

    private static IEnumerable<string> NonDefaultCultureCodes => CultureCodes.Where(code => code != SupportedCultures.DefaultCode);

    private static IEnumerable<TestCaseData> IndustryPages()
    {
        foreach (var country in CountryIndustries.AllCountries)
        {
            yield return new TestCaseData(country, KlacksySlug).SetName($"{country}/{KlacksySlug}");
            foreach (var industry in CountryIndustries.ForCountry(country) ?? Array.Empty<CountryIndustry>())
            {
                yield return new TestCaseData(country, industry.Slug).SetName($"{country}/{industry.Slug}");
            }
        }
    }

    private static IEnumerable<TestCaseData> CountryCultures()
    {
        foreach (var country in CountryIndustries.AllCountries)
        {
            yield return new TestCaseData(country, SupportedCultures.DefaultCode).SetName($"{country}/{SupportedCultures.DefaultCode}");
        }

        foreach (var culture in NonDefaultCultureCodes)
        {
            if (LanguageCountries.TryGetCountries(culture, out var countries))
            {
                foreach (var country in countries)
                {
                    yield return new TestCaseData(country, culture).SetName($"{country}/{culture}");
                }
            }
        }
    }

    [TestCase("de", false, GermanNoteStart, "Winterthur")]
    [TestCase("en", false, EnglishNoteStart, "Winterthur")]
    [TestCase("de", true, GermanShortStart, "lateinische Schrift")]
    [TestCase("en", true, EnglishShortStart, "Latin script")]
    public async Task Component_renders_the_shared_note_text(string culture, bool isShort, string expectedStart, string expectedPart)
    {
        var html = WebUtility.HtmlDecode(await RenderAsync<DemoDataNote>(string.Empty, new Dictionary<string, object?>
        {
            [nameof(DemoDataNote.Culture)] = culture,
            [nameof(DemoDataNote.Short)] = isShort,
        }));

        html.ShouldContain(DemoDataNote.MarkerAttribute);
        html.ShouldContain(">" + expectedStart);
        html.ShouldContain(expectedPart);
        html.ShouldNotContain("text-xs");
        html.ShouldNotContain(" id=\"");
    }

    [TestCaseSource(nameof(IndustryPages))]
    public async Task Industry_page_shows_the_note_with_its_screenshots_and_recordings(string country, string slug)
    {
        var routePath = $"{country}/{slug}";
        var html = WebUtility.HtmlDecode(await RenderAsync<IndustryPageTemplate>(routePath, new Dictionary<string, object?>
        {
            [nameof(IndustryPageTemplate.PageKey)] = $"{country}-{slug}",
            [nameof(IndustryPageTemplate.RoutePath)] = routePath,
            [nameof(IndustryPageTemplate.Culture)] = SupportedCultures.DefaultCode,
        }));

        Regex.IsMatch(html, MediaPattern).ShouldBeTrue();
        CountNotes(html).ShouldBeGreaterThanOrEqualTo(2, "hero media and feature explorer");
        html.ShouldContain(GermanNoteStart);
    }

    [TestCaseSource(nameof(CountryCultures))]
    public async Task Country_start_page_shows_the_note_whenever_it_shows_screenshots_or_recordings(string country, string culture)
    {
        var html = await RenderAsync<CountryStartTemplate>(country, new Dictionary<string, object?>
        {
            [nameof(CountryStartTemplate.PageKey)] = country,
            [nameof(CountryStartTemplate.Culture)] = culture,
        });

        if (Regex.IsMatch(html, MediaPattern))
        {
            CountNotes(html).ShouldBeGreaterThanOrEqualTo(1);
        }

        html.ShouldNotContain(RetiredNoteKey);
    }

    [TestCase("de", GermanNoteStart)]
    [TestCase("en", EnglishNoteStart)]
    public async Task Swiss_start_page_shows_the_note_below_the_hero_the_explorer_and_the_klacksy_screenshot(string culture, string expectedStart)
    {
        var html = WebUtility.HtmlDecode(await RenderAsync<CountryStartTemplate>(SwissCountry, new Dictionary<string, object?>
        {
            [nameof(CountryStartTemplate.PageKey)] = SwissCountry,
            [nameof(CountryStartTemplate.Culture)] = culture,
        }));

        CountNotes(html).ShouldBe(3);
        html.ShouldContain(expectedStart);
    }

    [Test]
    public async Task Mid_size_business_page_shows_the_note_below_its_recordings()
    {
        var html = WebUtility.HtmlDecode(await RenderAsync<MittlereBetriebe>($"{SwissCountry}/{CountryPageLinks.MidSizeBusinessSlug}", new Dictionary<string, object?>
        {
            [nameof(MittlereBetriebe.Culture)] = SupportedCultures.DefaultCode,
            [nameof(MittlereBetriebe.Country)] = SwissCountry,
        }));

        Regex.IsMatch(html, MediaPattern).ShouldBeTrue();
        CountNotes(html).ShouldBe(1);
        html.ShouldContain(GermanNoteStart);
    }

    [TestCase("de", GermanShortStart)]
    [TestCase("en", EnglishShortStart)]
    public async Task Playground_modal_shows_the_short_note(string culture, string expectedStart)
    {
        var html = WebUtility.HtmlDecode(await RenderAsync<DemoDisclaimerModal>(string.Empty, new Dictionary<string, object?>
        {
            [nameof(DemoDisclaimerModal.IsOpen)] = true,
            [nameof(DemoDisclaimerModal.Culture)] = culture,
        }));

        CountNotes(html).ShouldBe(1);
        html.ShouldContain(">" + expectedStart);
    }

    [Test]
    public void Retired_start_page_note_is_no_longer_read()
    {
        foreach (var source in SourcesWithoutRetiredNote)
        {
            MarketingProjectPaths.ReadSource(source).ShouldNotContain(RetiredNoteKey, Case.Sensitive, source);
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Every_culture_has_both_demo_data_notes(string culture)
    {
        var texts = LoadShared(culture);

        foreach (var key in NoteKeys)
        {
            texts.ShouldContainKey(key, $"{culture}/{SharedFile} lacks '{key}'");
            texts[key].ShouldNotBeNullOrWhiteSpace($"{culture}/{SharedFile}: {key}");
        }
    }

    [TestCaseSource(nameof(NonDefaultCultureCodes))]
    public void Non_default_cultures_translate_the_demo_data_notes(string culture)
    {
        var german = LoadShared(SupportedCultures.DefaultCode);
        var texts = LoadShared(culture);

        foreach (var key in NoteKeys)
        {
            texts.ShouldContainKey(key, $"{culture}/{SharedFile} lacks '{key}'");
            texts[key].ShouldNotBe(german[key], $"{culture}/{SharedFile} reuses the German '{key}'");
        }
    }

    private static int CountNotes(string html) => Regex.Matches(html, Regex.Escape(DemoDataNote.MarkerAttribute)).Count;

    private static Dictionary<string, string> LoadShared(string culture)
        => JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, culture, SharedFile)))!;

    private static async Task<string> RenderAsync<TComponent>(string path, IDictionary<string, object?> parameters)
        where TComponent : IComponent
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
            .AddSingleton<NavigationManager>(new TestNavigationManager(BaseUrl, path))
            .AddSingleton<IJSRuntime>(new NoOpJsRuntime())
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<TComponent>(ParameterView.FromDictionary(parameters));
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
