// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using Microsoft.Net.Http.Headers;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Counts successful HTML page requests after the endpoint has run. Only the derived page type, country, culture,
/// traffic source and human/bot class are recorded; path, query string, Referer, IP and User-Agent are discarded.
/// Redirects, 404s, HEAD requests, framework paths and assets are never counted.
/// </summary>
/// <param name="next">Next middleware in the pipeline</param>
/// <param name="store">Aggregate that receives the counts</param>
public sealed class PageRequestCountingMiddleware(RequestDelegate next, VisitCounterStore store)
{
    private const string HtmlMediaType = "text/html";
    private const string FrameworkPathPrefix = "/_";

    private static readonly string[] ExcludedPrefixes =
    {
        "/_framework", "/_blazor", "/css", "/js", "/images", "/videos", "/fonts", "/store", "/docs",
        AnalyticsRoutes.ClientEventPath, AnalyticsRoutes.StatsPath, "/robots.txt", "/sitemap", "/llms",
    };

    public async Task InvokeAsync(HttpContext context)
    {
        await next(context);

        if (store.IsEnabled && ShouldCount(context))
        {
            var request = context.Request;
            var location = VisitPathClassifier.Classify(request.Path.Value);
            var source = TrafficSourceClassifier.Classify(
                CampaignParameter(request.Query),
                TrafficSourceClassifier.HostOf(request.Headers.Referer.ToString()),
                request.Host.Host);
            var visitor = BotUserAgents.Classify(request.Headers.UserAgent.ToString());

            store.Record(VisitEvent.PageRequest, location, source, visitor);
        }
    }

    public static bool IsExcludedPath(string path)
        => path.StartsWith(FrameworkPathPrefix, StringComparison.Ordinal)
            || Path.HasExtension(path)
            || ExcludedPrefixes.Any(prefix => path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));

    public static string? CampaignParameter(IQueryCollection query)
    {
        var utmSource = query[TrafficSourceClassifier.UtmSourceParameter].ToString();

        return utmSource.Length > 0 ? utmSource : query[TrafficSourceClassifier.RefParameter].ToString();
    }

    private static bool ShouldCount(HttpContext context)
    {
        var request = context.Request;
        var response = context.Response;

        return HttpMethods.IsGet(request.Method)
            && response.StatusCode == StatusCodes.Status200OK
            && !IsExcludedPath(request.Path.Value ?? string.Empty)
            && request.Headers.Accept.ToString().Contains(HtmlMediaType, StringComparison.OrdinalIgnoreCase)
            && (response.ContentType ?? string.Empty).StartsWith(HtmlMediaType, StringComparison.OrdinalIgnoreCase);
    }
}
