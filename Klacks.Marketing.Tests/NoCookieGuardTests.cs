// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The privacy statement promises "Diese Website setzt keine Cookies" (legal.json): neither the simple nor the expert
/// pages, the root redirect, the Blazor negotiate call nor the event beacon answer with Set-Cookie (with SimpleMode on and
/// off), and no script of the site reaches for cookies or any other browser storage, so the mode choice is never stored.
/// </summary>
[TestFixture]
public class NoCookieGuardTests
{
    private const string SetCookieHeader = "Set-Cookie";
    private const string AcceptLanguageHeader = "Accept-Language";
    private const string BeaconPayload = """{"e":"ExpertToggle","p":"/land-ch","s":"","r":""}""";
    private const string BlazorNegotiatePath = "/_blazor/negotiate?negotiateVersion=1";
    private const string ScriptSearchPattern = "*.js";
    private const string ScriptsRelativePath = "js";

    private static readonly string[] BrowserStorageApis = ["document.cookie", "localStorage", "sessionStorage", "indexedDB"];

    [TestCase(true, "/land-ch", HttpStatusCode.OK)]
    [TestCase(true, "/land-ch/experten", HttpStatusCode.OK)]
    [TestCase(true, "/land-ch/spitex", HttpStatusCode.OK)]
    [TestCase(true, "/fr/land-ch", HttpStatusCode.OK)]
    [TestCase(true, "/fr/land-ch/experten", HttpStatusCode.OK)]
    [TestCase(true, "/en/land-gb", HttpStatusCode.OK)]
    [TestCase(true, "/en/land-gb/experten", HttpStatusCode.OK)]
    [TestCase(true, "/it/land-ch", HttpStatusCode.OK)]
    [TestCase(true, "/it/land-ch/experten", HttpStatusCode.OK)]
    [TestCase(true, "/es/land-es", HttpStatusCode.OK)]
    [TestCase(false, "/fr/land-ch/experten", HttpStatusCode.NotFound)]
    [TestCase(false, "/land-ch", HttpStatusCode.OK)]
    [TestCase(false, "/land-ch/experten", HttpStatusCode.NotFound)]
    [TestCase(false, "/land-ch/spitex", HttpStatusCode.OK)]
    [TestCase(false, "/fr/land-ch", HttpStatusCode.OK)]
    public async Task Pages_set_no_cookie(bool simpleModeEnabled, string path, HttpStatusCode expectedStatus)
    {
        await using var factory = new SimpleModeAppFactory(simpleModeEnabled);
        using var client = CreateClient(factory);
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(expectedStatus, path);
        response.Headers.Contains(SetCookieHeader).ShouldBeFalse(path);
    }

    [TestCase(true, "", HttpStatusCode.MovedPermanently)]
    [TestCase(true, "de-CH,de;q=0.9", HttpStatusCode.Redirect)]
    [TestCase(false, "", HttpStatusCode.MovedPermanently)]
    [TestCase(false, "de-CH,de;q=0.9", HttpStatusCode.Redirect)]
    public async Task Root_redirect_sets_no_cookie(bool simpleModeEnabled, string acceptLanguage, HttpStatusCode expectedStatus)
    {
        await using var factory = new SimpleModeAppFactory(simpleModeEnabled);
        using var client = CreateClient(factory);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/");
        if (acceptLanguage.Length > 0)
        {
            request.Headers.Add(AcceptLanguageHeader, acceptLanguage);
        }

        using var response = await client.SendAsync(request);

        response.StatusCode.ShouldBe(expectedStatus, acceptLanguage);
        response.Headers.Contains(SetCookieHeader).ShouldBeFalse(acceptLanguage);
    }

    [TestCase(true)]
    [TestCase(false)]
    public async Task Event_beacon_sets_no_cookie(bool simpleModeEnabled)
    {
        await using var factory = new SimpleModeAppFactory(simpleModeEnabled);
        using var client = CreateClient(factory);
        using var content = new StringContent(BeaconPayload, Encoding.UTF8, "text/plain");
        using var response = await client.PostAsync("/_c", content);

        response.Headers.Contains(SetCookieHeader).ShouldBeFalse();
    }

    [TestCase(true)]
    [TestCase(false)]
    public async Task Blazor_negotiate_sets_no_cookie(bool simpleModeEnabled)
    {
        await using var factory = new SimpleModeAppFactory(simpleModeEnabled);
        using var client = CreateClient(factory);
        using var response = await client.PostAsync(BlazorNegotiatePath, new StringContent(string.Empty));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Headers.Contains(SetCookieHeader).ShouldBeFalse();
    }

    [Test]
    public void Site_scripts_use_no_cookie_or_browser_storage_api()
    {
        var scripts = Directory.GetFiles(Path.Combine(MarketingProjectPaths.WebRoot, ScriptsRelativePath), ScriptSearchPattern);

        scripts.ShouldNotBeEmpty();
        foreach (var script in scripts)
        {
            var source = File.ReadAllText(script);
            foreach (var api in BrowserStorageApis)
            {
                source.Contains(api, StringComparison.Ordinal).ShouldBeFalse($"{Path.GetFileName(script)} uses {api}");
            }
        }
    }

    private static HttpClient CreateClient(SimpleModeAppFactory factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false, HandleCookies = false });
}
