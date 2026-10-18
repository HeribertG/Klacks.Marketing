// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Localization.Seo;
using Klacks.Marketing.Pages;
using Klacks.Marketing.Shared;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// "/[culture/]land-xx/experten" serves today's country start page in every supported culture (de unprefixed, the other
/// 24 prefixed): canonical on itself, hreflang set limited to the cultures with own country text (each alternate
/// answers 200, is indexable and links back), 404 for unknown or "de" prefixes and unknown countries, and 404
/// altogether while SimpleMode:Enabled is off. The page component itself renders "not
/// found" in those cases, so navigation inside the Blazor circuit (which skips the HTTP guard) never shows it either.
/// </summary>
[TestFixture]
public class ExpertStartRouteTests
{
    private const string ExpertHeroText = "Frühschicht unbesetzt?";
    private const string FrenchExpertHeroText = "vous gardez le contrôle.";
    private const string EnglishExpertHeroText = "you stay in control.";
    private const string HreflangMarker = "hreflang=";
    private const string NoindexMarker = "name=\"robots\" content=\"noindex";
    private const string NotFoundText = "Page not found.";
    private const string SiteBaseUrl = "https://klacks-software.ch";
    private const string AlternatePattern = @"<link rel=""alternate"" hreflang=""([^""]+)"" href=""([^""]+)""";

    [TestCase("/land-ch/experten", "/land-ch/experten", ExpertHeroText)]
    [TestCase("/land-de/experten", "/land-de/experten", ExpertHeroText)]
    [TestCase("/fr/land-ch/experten", "/fr/land-ch/experten", FrenchExpertHeroText)]
    [TestCase("/en/land-gb/experten", "/en/land-gb/experten", EnglishExpertHeroText)]
    public async Task Expert_start_page_has_a_self_canonical_and_is_indexable(string path, string canonicalPath, string heroText)
    {
        var (status, html) = await GetAsync(enabled: true, path);

        status.ShouldBe(HttpStatusCode.OK);
        html.ShouldContain(heroText);
        html.ShouldContain($"<link rel=\"canonical\" href=\"{SiteBaseUrl}{canonicalPath}\"");
        html.ShouldNotContain(NoindexMarker);
    }

    [TestCase("/land-ch/experten", "de,fr,it")]
    [TestCase("/it/land-ch/experten", "de,fr,it")]
    [TestCase("/en/land-gb/experten", "de,en")]
    [TestCase("/land-jp/experten", "de,ja")]
    [TestCase("/ja/land-jp/experten", "de,ja")]
    [TestCase("/land-ae/experten", "de,en,ar")]
    [TestCase("/nl/land-be/experten", "de,fr,nl")]
    [TestCase("/zh-tw/land-tw/experten", "de,zh-TW")]
    public async Task Hreflang_set_lists_only_cultures_with_own_country_text(string path, string expectedCultures)
    {
        var (_, html) = await GetAsync(enabled: true, path);

        Alternates(html).Where(alternate => alternate.Culture != "x-default").Select(alternate => alternate.Culture)
            .ShouldBe(expectedCultures.Split(','));
        html.ShouldContain($"hreflang=\"x-default\" href=\"{SiteBaseUrl}/{CountryOf(path)}/{SiteModes.ExpertSlug}\"");
    }

    [TestCase("/land-ch/experten")]
    [TestCase("/en/land-gb/experten")]
    [TestCase("/ar/land-ae/experten")]
    [TestCase("/sv/land-fi/experten")]
    public async Task Every_hreflang_alternate_answers_200_is_indexable_and_links_back(string path)
    {
        await using var factory = new SimpleModeAppFactory(true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var source = WebUtility.HtmlDecode(await client.GetStringAsync(path));
        var sourceAlternates = Alternates(source).ToList();
        sourceAlternates.ShouldNotBeEmpty();

        foreach (var (culture, href) in sourceAlternates)
        {
            using var response = await client.GetAsync(new Uri(href).PathAndQuery);
            response.StatusCode.ShouldBe(HttpStatusCode.OK, href);
            var html = WebUtility.HtmlDecode(await response.Content.ReadAsStringAsync());

            html.ShouldNotContain(NoindexMarker, customMessage: href);
            html.ShouldContain($"<link rel=\"canonical\" href=\"{href}\"", customMessage: culture);
            Alternates(html).ShouldBe(sourceAlternates, href);
        }
    }

    [TestCase("/en/land-ch/experten")]
    [TestCase("/it/land-de/experten")]
    public async Task Expert_page_without_own_country_text_is_noindex_without_hreflang(string path)
    {
        var (status, html) = await GetAsync(enabled: true, path);

        status.ShouldBe(HttpStatusCode.OK);
        html.ShouldContain(NoindexMarker);
        html.ShouldNotContain(HreflangMarker);
    }

    [Test]
    public async Task Upper_case_country_resolves_to_the_lower_case_content()
    {
        var (status, html) = await GetAsync(enabled: true, "/LAND-CH/experten");

        status.ShouldBe(HttpStatusCode.OK);
        html.ShouldContain(ExpertHeroText);
    }

    [TestCase("", "land-ch")]
    [TestCase("/fr", "land-ch")]
    public async Task Chapter_links_of_the_expert_page_stay_on_the_expert_page(string prefix, string country)
    {
        var (_, html) = await GetAsync(enabled: true, $"{prefix}/{country}/experten");

        html.ShouldContain($"href=\"{prefix}/{country}/experten#{DemoCarousels.KlacksySectionId}\"");
        html.ShouldContain($"href=\"{prefix}/{country}/spitex\"");
        html.ShouldNotContain($"{prefix}/{country}/experten/spitex");
    }

    [TestCase("/de/land-ch/experten")]
    [TestCase("/xx/land-ch/experten")]
    [TestCase("/land-zz/experten")]
    [TestCase("/fr/land-zz/experten")]
    [TestCase("/en/experten")]
    [TestCase("/experten")]
    public async Task Expert_routes_of_unknown_cultures_and_unknown_routes_are_404(string path)
    {
        var (status, _) = await GetAsync(enabled: true, path);

        status.ShouldBe(HttpStatusCode.NotFound);
    }

    [TestCase("/land-ch/experten")]
    [TestCase("/land-de/experten")]
    [TestCase("/fr/land-ch/experten")]
    [TestCase("/en/land-gb/experten")]
    public async Task Expert_route_is_404_while_the_feature_is_off(string path)
    {
        var (status, _) = await GetAsync(enabled: false, path);

        status.ShouldBe(HttpStatusCode.NotFound);
    }

    [TestCase(false, null, "land-ch")]
    [TestCase(false, "fr", "land-ch")]
    [TestCase(true, null, "en")]
    [TestCase(true, null, "land-zz")]
    [TestCase(true, "de", "land-ch")]
    [TestCase(true, "xx", "land-ch")]
    [TestCase(true, "fr", "land-zz")]
    public async Task Expert_page_component_renders_not_found_when_off_or_for_an_unknown_route(bool enabled, string? culture, string country)
    {
        var html = await RenderComponentAsync(enabled, culture, country);

        html.ShouldContain(NotFoundText);
        html.ShouldNotContain(ExpertHeroText);
        html.ShouldNotContain(FrenchExpertHeroText);
    }

    private static IEnumerable<SupportedCulture> PrefixedCultures => SupportedCultures.All.Where(culture => culture.UrlSlug.Length > 0);

    [TestCaseSource(nameof(PrefixedCultures))]
    public async Task Every_prefixed_culture_serves_the_expert_start_page_of_its_default_country(SupportedCulture culture)
    {
        var country = LanguageCountries.DefaultCountryFor(culture.Code);
        var path = $"/{culture.UrlSlug}/{country}/{SiteModes.ExpertSlug}";
        var (status, html) = await GetAsync(enabled: true, path);

        status.ShouldBe(HttpStatusCode.OK, path);
        html.ShouldContain($"<link rel=\"canonical\" href=\"{SiteBaseUrl}{path}\"");
        html.ShouldNotContain(NotFoundText);
        if (!CountryIndexingPolicy.IsNoindex(country))
        {
            html.ShouldNotContain(NoindexMarker);
            Alternates(html).Select(alternate => alternate.Culture).ShouldContain(culture.Code, path);
        }
    }

    private static string CountryOf(string path)
        => path.Split('/', StringSplitOptions.RemoveEmptyEntries).First(segment => segment.StartsWith("land-", StringComparison.Ordinal));

    private static IEnumerable<(string Culture, string Href)> Alternates(string html)
        => Regex.Matches(html, AlternatePattern).Select(match => (match.Groups[1].Value, match.Groups[2].Value));

    private static async Task<(HttpStatusCode Status, string Html)> GetAsync(bool enabled, string path)
    {
        await using var factory = new SimpleModeAppFactory(enabled);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        return (response.StatusCode, WebUtility.HtmlDecode(await response.Content.ReadAsStringAsync()));
    }

    private static async Task<string> RenderComponentAsync(bool enabled, string? culture, string country)
    {
        var services = new ServiceCollection()
            .AddSingleton<IOptions<SiteModeOptions>>(Options.Create(new SiteModeOptions { Enabled = enabled }))
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<CountryExpertStart>(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(CountryExpertStart.Culture)] = culture,
                [nameof(CountryExpertStart.Country)] = country,
            }));
            return output.ToHtmlString();
        });
    }
}
