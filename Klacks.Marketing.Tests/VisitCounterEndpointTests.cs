// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text;
using System.Text.Json;
using Klacks.Marketing.Analytics;
using Klacks.Marketing.Seo;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// End-to-end checks of the anonymous visit counter in the real app pipeline: which requests count as PageRequest,
/// payload validation of POST /_c, token protection of GET /_stats, noindex headers, robots.txt and sitemap
/// exclusion, and that the persisted JSON contains neither IP, User-Agent, URL nor query string.
/// </summary>
[TestFixture]
public class VisitCounterEndpointTests
{
    private const string StatsToken = "test-stats-token-4711";
    private const string HtmlAccept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    private const string ChromeUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
    private const string GptBotUserAgent = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)";
    private const string PlainText = "text/plain";

    private static readonly DateTimeOffset Now = new(2026, 10, 11, 12, 0, 0, TimeSpan.Zero);

    private string _directory = null!;
    private MutableTimeProvider _time = null!;

    [SetUp]
    public void SetUp()
    {
        _directory = Path.Combine(Path.GetTempPath(), "klacks-visit-endpoints-" + Guid.NewGuid().ToString("N"));
        _time = new MutableTimeProvider(Now);
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, recursive: true);
        }
    }

    [Test]
    public async Task Html_page_request_is_counted_with_route_dimensions_and_source()
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);

        await GetHtmlAsync(client, "/en/land-ch/spitex?utm_source=chatgpt.com", ChromeUserAgent);
        await GetHtmlAsync(client, "/land-ch", GptBotUserAgent, referer: "https://www.google.com/");

        var rows = Snapshot(factory);
        rows.ShouldContain(Row(VisitEvent.PageRequest, PageTypes.Industry, "ch", "en", TrafficSources.ChatGpt, VisitorClass.Human, 1));
        rows.ShouldContain(Row(VisitEvent.PageRequest, PageTypes.Start, "ch", "de", TrafficSources.Google, VisitorClass.Bot, 1));
        rows.Count.ShouldBe(2);
    }

    [Test]
    public async Task Redirects_404s_assets_head_requests_and_non_html_requests_are_not_counted()
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);

        using (var redirect = new HttpRequestMessage(HttpMethod.Get, "/"))
        {
            redirect.Headers.Add("Accept", HtmlAccept);
            redirect.Headers.Add("Accept-Language", "en");
            using var response = await client.SendAsync(redirect);
            response.StatusCode.ShouldBe(HttpStatusCode.Redirect);
        }

        (await GetHtmlAsync(client, "/land-ch/gibt-es-nicht", ChromeUserAgent)).ShouldBe(HttpStatusCode.NotFound);
        (await GetHtmlAsync(client, "/vorschau-start", ChromeUserAgent)).ShouldBe(HttpStatusCode.MovedPermanently);
        (await GetHtmlAsync(client, "/css/site.css", ChromeUserAgent)).ShouldBe(HttpStatusCode.OK);
        (await GetHtmlAsync(client, "/robots.txt", ChromeUserAgent)).ShouldBe(HttpStatusCode.OK);
        (await GetHtmlAsync(client, "/llms.txt", ChromeUserAgent)).ShouldBe(HttpStatusCode.OK);

        using (var head = new HttpRequestMessage(HttpMethod.Head, "/land-ch"))
        {
            head.Headers.Add("Accept", HtmlAccept);
            using var response = await client.SendAsync(head);
        }

        using (var anyAccept = new HttpRequestMessage(HttpMethod.Get, "/land-ch"))
        {
            anyAccept.Headers.Add("Accept", "*/*");
            using var response = await client.SendAsync(anyAccept);
            await response.Content.ReadAsStringAsync();
            response.StatusCode.ShouldBe(HttpStatusCode.OK);
        }

        Snapshot(factory).ShouldBeEmpty();
    }

    [TestCase("DemoModalOpened")]
    [TestCase("PlaygroundContinue")]
    [TestCase("DownloadClick")]
    [TestCase("OutboundClick")]
    [TestCase("ExpertToggle")]
    [TestCase("ExpertToggleEarly")]
    [TestCase("VideoPlay")]
    [TestCase("ShareClick")]
    public async Task Client_event_is_accepted_and_counted(string eventName)
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);

        using var response = await PostEventAsync(client, $$"""{"e":"{{eventName}}","p":"/fr/land-ch/installation","s":"","r":"www.bing.com"}""");

        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
        response.Headers.GetValues(AnalyticsRoutes.RobotsTagHeader).ShouldContain(AnalyticsRoutes.RobotsTagValue);
        Snapshot(factory).ShouldBe(new[]
        {
            Row(Enum.Parse<VisitEvent>(eventName), PageTypes.Installation, "ch", "fr", TrafficSources.Bing, VisitorClass.Human, 1),
        });
    }

    [TestCase("""{"e":"Unknown"}""")]
    [TestCase("""{"e":"PageRequest","p":"/land-ch"}""")]
    [TestCase("""{"e":"CircuitStarted"}""")]
    [TestCase("""{"e":"3"}""")]
    [TestCase("""{"e":3}""")]
    [TestCase("""{"e":"downloadclick"}""")]
    [TestCase("""{"p":"/land-ch"}""")]
    [TestCase("not json")]
    [TestCase("")]
    public async Task Invalid_client_payload_is_rejected_with_400(string body)
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);

        using var response = await PostEventAsync(client, body);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        response.Headers.GetValues(AnalyticsRoutes.RobotsTagHeader).ShouldContain(AnalyticsRoutes.RobotsTagValue);
        Snapshot(factory).ShouldBeEmpty();
    }

    [Test]
    public async Task Client_payload_over_200_bytes_is_rejected()
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);
        var body = $$"""{"e":"DownloadClick","p":"/{{new string('a', ClientEventEndpoint.MaxBodyBytes)}}"}""";

        using var response = await PostEventAsync(client, body);

        response.StatusCode.ShouldBe(HttpStatusCode.RequestEntityTooLarge);
        Snapshot(factory).ShouldBeEmpty();
    }

    [Test]
    public async Task Stats_answers_404_when_no_token_is_configured()
    {
        await using var factory = CreateFactory(statsToken: null);
        using var client = CreateClient(factory);

        using var request = new HttpRequestMessage(HttpMethod.Get, AnalyticsRoutes.StatsPath);
        request.Headers.Add(AnalyticsRoutes.StatsTokenHeader, "anything");
        using var response = await client.SendAsync(request);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        response.Headers.GetValues(AnalyticsRoutes.RobotsTagHeader).ShouldContain(AnalyticsRoutes.RobotsTagValue);
        (await response.Content.ReadAsStringAsync()).ShouldBeEmpty();
    }

    [TestCase(null)]
    [TestCase("")]
    [TestCase("wrong-token")]
    [TestCase(StatsToken + "x")]
    public async Task Stats_answers_401_without_the_correct_token(string? token)
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);

        using var request = new HttpRequestMessage(HttpMethod.Get, AnalyticsRoutes.StatsPath);
        if (token is not null)
        {
            request.Headers.Add(AnalyticsRoutes.StatsTokenHeader, token);
        }

        using var response = await client.SendAsync(request);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        response.Headers.GetValues(AnalyticsRoutes.RobotsTagHeader).ShouldContain(AnalyticsRoutes.RobotsTagValue);
    }

    [Test]
    public async Task Stats_with_token_returns_rows_and_sums()
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);
        await GetHtmlAsync(client, "/land-ch", ChromeUserAgent);
        await GetHtmlAsync(client, "/land-ch", ChromeUserAgent);
        await GetHtmlAsync(client, "/en/land-gb/angebot", GptBotUserAgent);
        using (await PostEventAsync(client, """{"e":"DemoModalOpened","p":"/land-ch"}"""))
        {
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, AnalyticsRoutes.StatsPath + "?days=7");
        request.Headers.Add(AnalyticsRoutes.StatsTokenHeader, StatsToken);
        using var response = await client.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        TestContext.Out.WriteLine(json);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.ShouldBe("application/json");
        response.Headers.GetValues(AnalyticsRoutes.RobotsTagHeader).ShouldContain(AnalyticsRoutes.RobotsTagValue);
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        root.GetProperty("from").GetString().ShouldBe("2026-10-05");
        root.GetProperty("to").GetString().ShouldBe("2026-10-11");
        root.GetProperty("total").GetInt64().ShouldBe(4);
        root.GetProperty("rows").GetArrayLength().ShouldBe(3);
        var pageTypes = root.GetProperty("totals").GetProperty("pageType").EnumerateArray()
            .Select(total => (total.GetProperty("value").GetString(), total.GetProperty("event").GetString(), total.GetProperty("visitor").GetString(), total.GetProperty("count").GetInt64()))
            .ToList();
        pageTypes.ShouldContain(("start", "PageRequest", "Human", 2L));
        pageTypes.ShouldContain(("angebot", "PageRequest", "Bot", 1L));
        pageTypes.ShouldContain(("start", "DemoModalOpened", "Human", 1L));
        foreach (var dimension in new[] { "event", "date", "pageType", "country", "culture", "source" })
        {
            root.GetProperty("totals").TryGetProperty(dimension, out _).ShouldBeTrue(dimension);
        }
    }

    [Test]
    public async Task Persisted_json_contains_no_ip_user_agent_url_or_query_string()
    {
        const string ClientIp = "203.0.113.77";
        const string ProbeUserAgent = "Mozilla/5.0 (Windows NT 10.0) PrivacyProbe/9.9 Chrome/141.0";
        const string SecretQuery = "secret=Geheim123";
        const string RefererQuery = "q=klacks+privacy+probe";

        var factory = CreateFactory();
        using (var client = CreateClient(factory))
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/en/land-ch/spitex?utm_source=perplexity&" + SecretQuery);
            request.Headers.Add("Accept", HtmlAccept);
            request.Headers.Add("User-Agent", ProbeUserAgent);
            request.Headers.Add("X-Forwarded-For", ClientIp);
            request.Headers.Add("Referer", "https://www.google.com/search?" + RefererQuery);
            using var response = await client.SendAsync(request);
            await response.Content.ReadAsStringAsync();
            response.StatusCode.ShouldBe(HttpStatusCode.OK);

            using var beacon = new HttpRequestMessage(HttpMethod.Post, AnalyticsRoutes.ClientEventPath)
            {
                Content = new StringContent("""{"e":"DownloadClick","p":"/en/land-ch/installation","s":"x","r":"tracker.example"}""", Encoding.UTF8, PlainText),
            };
            beacon.Headers.Add("User-Agent", ProbeUserAgent);
            beacon.Headers.Add("X-Forwarded-For", ClientIp);
            using var beaconResponse = await client.SendAsync(beacon);
            beaconResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);
        }

        await factory.DisposeAsync();

        var files = Directory.GetFiles(_directory);
        files.Select(Path.GetFileName).ShouldBe(new[] { "visits-2026-10.json" });
        var stored = File.ReadAllText(files[0]);
        TestContext.Out.WriteLine(stored);

        stored.ShouldNotContain(ClientIp);
        stored.ShouldNotContain("PrivacyProbe");
        stored.ShouldNotContain("Mozilla");
        stored.ShouldNotContain("Geheim123");
        stored.ShouldNotContain("secret");
        stored.ShouldNotContain("utm_source");
        stored.ShouldNotContain("?");
        stored.ShouldNotContain("klacks+privacy");
        stored.ShouldNotContain("google");
        stored.ShouldNotContain("tracker.example");
        stored.ShouldNotContain("/en/");
        stored.ShouldNotContain("spitex");
        stored.ShouldContain("\"source\": \"perplexity\"");
        stored.ShouldContain("\"pageType\": \"branche\"");
        stored.ShouldContain("\"event\": \"DownloadClick\"");
    }

    [Test]
    public async Task Robots_txt_disallows_both_paths_and_the_sitemap_does_not_list_them()
    {
        var robots = RobotsTxtGenerator.Build("https://klacks.example");
        robots.ShouldContain("Disallow: /_c");
        robots.ShouldContain("Disallow: /_stats");

        await using var factory = CreateFactory();
        using var client = CreateClient(factory);
        var sitemap = await client.GetStringAsync("/sitemap.xml");

        sitemap.ShouldNotContain("/_c<");
        sitemap.ShouldNotContain("/_stats");
    }

    [Test]
    public async Task Disabled_counter_records_nothing_and_hides_stats()
    {
        await using var factory = new VisitCounterAppFactory(_directory, StatsToken, _time, enabled: false);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        await GetHtmlAsync(client, "/land-ch", ChromeUserAgent);
        using var beacon = await PostEventAsync(client, """{"e":"DownloadClick"}""");
        using var request = new HttpRequestMessage(HttpMethod.Get, AnalyticsRoutes.StatsPath);
        request.Headers.Add(AnalyticsRoutes.StatsTokenHeader, StatsToken);
        using var stats = await client.SendAsync(request);

        beacon.StatusCode.ShouldBe(HttpStatusCode.NoContent);
        stats.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        Snapshot(factory).ShouldBeEmpty();
    }

    [Test]
    public void Client_script_stays_small_and_uses_no_storage_or_cookies()
    {
        var path = Path.Combine(MarketingProjectPaths.WebRoot, "js", "c.js");
        var script = File.ReadAllText(path);

        Encoding.UTF8.GetByteCount(script.Replace("\r\n", "\n")).ShouldBeLessThan(2048);
        script.ShouldNotContain("cookie");
        script.ShouldNotContain("localStorage");
        script.ShouldNotContain("sessionStorage");
        script.ShouldContain("navigator.sendBeacon('/_c'");
        MarketingProjectPaths.ReadSource("Pages/_Layout.cshtml").ShouldContain("~/js/c.js");
    }

    [TestCase("Shared/DemoDisclaimerModal.razor", "data-c=\"PlaygroundContinue\"")]
    [TestCase("Shared/InstallPathCard.razor", "data-c=\"DownloadClick\"")]
    [TestCase("Shared/MainLayout.razor", "data-c=\"DemoModalOpened\"")]
    [TestCase("Shared/ExpertModeSwitch.razor", "data-c=\"ExpertToggle\"")]
    [TestCase("Shared/ShareLinkButtons.razor", "data-c=\"ShareClick\"")]
    [TestCase("Shared/SimpleVideo.razor", "data-c-play=\"VideoPlay\"")]
    public void Markup_carries_the_client_event_attributes(string relativePath, string attribute)
    {
        MarketingProjectPaths.ReadSource(relativePath).ShouldContain(attribute);
    }

    [Test]
    public void Every_demo_modal_button_carries_the_demo_event_attribute()
    {
        var sources = Directory.EnumerateFiles(MarketingProjectPaths.ProjectRoot, "*.razor", SearchOption.AllDirectories)
            .Where(file => !file.Contains(Path.DirectorySeparatorChar + "bin" + Path.DirectorySeparatorChar)
                && !file.Contains(Path.DirectorySeparatorChar + "obj" + Path.DirectorySeparatorChar));

        foreach (var file in sources)
        {
            foreach (var line in File.ReadLines(file).Where(line => line.Contains("@onclick=\"OpenDemoModal")))
            {
                line.ShouldContain("data-c=\"DemoModalOpened\"", customMessage: Path.GetFileName(file));
            }
        }
    }

    private VisitCounterAppFactory CreateFactory(string? statsToken = StatsToken)
        => new(_directory, statsToken, _time);

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory)
        => factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    private static async Task<HttpStatusCode> GetHtmlAsync(HttpClient client, string url, string userAgent, string? referer = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("Accept", HtmlAccept);
        request.Headers.Add("User-Agent", userAgent);
        if (referer is not null)
        {
            request.Headers.Add("Referer", referer);
        }

        using var response = await client.SendAsync(request);
        await response.Content.ReadAsStringAsync();

        return response.StatusCode;
    }

    private static Task<HttpResponseMessage> PostEventAsync(HttpClient client, string body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, AnalyticsRoutes.ClientEventPath)
        {
            Content = new StringContent(body, Encoding.UTF8, PlainText),
        };
        request.Headers.Add("User-Agent", ChromeUserAgent);

        return client.SendAsync(request);
    }

    private static List<StoredRow> Snapshot(WebApplicationFactory<Program> factory)
    {
        var store = factory.Services.GetRequiredService<VisitCounterStore>();
        var today = store.Today;

        return store.Snapshot(today, today)
            .Select(pair => new StoredRow(
                pair.Key.Event, pair.Key.PageType, pair.Key.Country, pair.Key.Culture, pair.Key.Source, pair.Key.Visitor, pair.Value))
            .ToList();
    }

    private static StoredRow Row(
        VisitEvent visitEvent, string pageType, string country, string culture, string source, VisitorClass visitor, long count)
        => new(visitEvent, pageType, country, culture, source, visitor, count);

    private sealed record StoredRow(
        VisitEvent Event, string PageType, string Country, string Culture, string Source, VisitorClass Visitor, long Count);
}
