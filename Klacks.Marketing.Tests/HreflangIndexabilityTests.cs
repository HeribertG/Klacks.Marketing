// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Guards that hreflang alternates are rendered only on indexable pages: noindex pages (China country pages) must not
/// advertise a language cluster to search engines, indexable pages must.
/// </summary>
[TestFixture]
public class HreflangIndexabilityTests
{
    private const string DevelopmentEnvironment = "Development";
    private const string HreflangMarker = "hreflang=";
    private const string XDefaultMarker = "hreflang=\"x-default\"";
    private const string NoindexMarker = "name=\"robots\" content=\"noindex";

    [TestCase("/land-ch")]
    [TestCase("/land-de")]
    [TestCase("/zh-cn/land-cn/impressum")]
    public async Task Indexable_page_has_hreflang_alternates_and_no_noindex(string path)
    {
        var html = await GetHtmlAsync(path);

        html.ShouldContain(HreflangMarker);
        html.ShouldContain(XDefaultMarker);
        html.ShouldNotContain(NoindexMarker);
    }

    [TestCase("/zh-cn/land-cn")]
    [TestCase("/zh-cn/land-cn/installation")]
    [TestCase("/land-cn")]
    public async Task Noindex_page_has_no_hreflang_alternates(string path)
    {
        var html = await GetHtmlAsync(path);

        html.ShouldContain(NoindexMarker);
        html.ShouldNotContain(HreflangMarker);
    }

    private static async Task<string> GetHtmlAsync(string path)
    {
        await using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.UseEnvironment(DevelopmentEnvironment));
        using var client = factory.CreateClient();

        var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, path);
        return await response.Content.ReadAsStringAsync();
    }
}
