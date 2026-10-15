// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using Klacks.Marketing.Localization;
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
/// "/land-xx/experten" serves today's country start page in German only: canonical on itself, no hreflang set (stage 1),
/// 404 for every culture-prefixed or unknown variant, and 404 altogether while SimpleMode:Enabled is off. The page
/// component itself renders "not found" while the switch is off or the country is unknown, so navigation inside the
/// Blazor circuit (which skips the HTTP guard) never shows it either.
/// </summary>
[TestFixture]
public class ExpertStartRouteTests
{
    private const string ExpertHeroText = "Frühschicht unbesetzt?";
    private const string HreflangMarker = "hreflang=";
    private const string NoindexMarker = "name=\"robots\" content=\"noindex";
    private const string NotFoundText = "Page not found.";

    [TestCase("/land-ch/experten", "https://klacks-software.ch/land-ch/experten")]
    [TestCase("/land-de/experten", "https://klacks-software.ch/land-de/experten")]
    public async Task Expert_start_page_has_a_self_canonical_and_no_hreflang(string path, string canonical)
    {
        var (status, html) = await GetAsync(enabled: true, path);

        status.ShouldBe(HttpStatusCode.OK);
        html.ShouldContain(ExpertHeroText);
        html.ShouldContain($"<link rel=\"canonical\" href=\"{canonical}\"");
        html.ShouldNotContain(HreflangMarker);
        html.ShouldNotContain(NoindexMarker);
    }

    [Test]
    public async Task Upper_case_country_resolves_to_the_lower_case_content()
    {
        var (status, html) = await GetAsync(enabled: true, "/LAND-CH/experten");

        status.ShouldBe(HttpStatusCode.OK);
        html.ShouldContain(ExpertHeroText);
    }

    [Test]
    public async Task Chapter_links_of_the_expert_page_stay_on_the_expert_page()
    {
        var (_, html) = await GetAsync(enabled: true, "/land-ch/experten");

        html.ShouldContain($"href=\"/land-ch/experten#{DemoCarousels.KlacksySectionId}\"");
        html.ShouldContain("href=\"/land-ch/spitex\"");
        html.ShouldNotContain("/land-ch/experten/spitex");
    }

    [TestCase("/fr/land-ch/experten")]
    [TestCase("/de/land-ch/experten")]
    [TestCase("/land-zz/experten")]
    [TestCase("/en/experten")]
    [TestCase("/experten")]
    public async Task Culture_prefixed_and_unknown_expert_routes_are_404(string path)
    {
        var (status, _) = await GetAsync(enabled: true, path);

        status.ShouldBe(HttpStatusCode.NotFound);
    }

    [TestCase("/land-ch/experten")]
    [TestCase("/land-de/experten")]
    public async Task Expert_route_is_404_while_the_feature_is_off(string path)
    {
        var (status, _) = await GetAsync(enabled: false, path);

        status.ShouldBe(HttpStatusCode.NotFound);
    }

    [TestCase(false, "land-ch")]
    [TestCase(true, "en")]
    [TestCase(true, "land-zz")]
    public async Task Expert_page_component_renders_not_found_when_off_or_for_an_unknown_country(bool enabled, string country)
    {
        var html = await RenderComponentAsync(enabled, country);

        html.ShouldContain(NotFoundText);
        html.ShouldNotContain(ExpertHeroText);
    }

    private static async Task<(HttpStatusCode Status, string Html)> GetAsync(bool enabled, string path)
    {
        await using var factory = new SimpleModeAppFactory(enabled);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        return (response.StatusCode, WebUtility.HtmlDecode(await response.Content.ReadAsStringAsync()));
    }

    private static async Task<string> RenderComponentAsync(bool enabled, string country)
    {
        var services = new ServiceCollection()
            .AddSingleton<IOptions<SiteModeOptions>>(Options.Create(new SiteModeOptions { Enabled = enabled }))
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<CountryExpertStart>(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(CountryExpertStart.Country)] = country,
            }));
            return output.ToHtmlString();
        });
    }
}
