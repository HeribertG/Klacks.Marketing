// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// GET /_stats?days=N: returns the counters of the last N UTC days (default <see cref="DefaultDays"/>, at most the
/// retention) as rows plus per-dimension sums split by event and human/bot. Answers 404 when no
/// Analytics:StatsToken is configured and 401 when the X-Stats-Token header does not match it.
/// </summary>
public static class StatsEndpoint
{
    public const int DefaultDays = 30;
    public const string DaysParameter = "days";

    private const string JsonContentType = "application/json; charset=utf-8";
    private const string EventDimension = "event";
    private const string DateDimension = "date";
    private const string PageTypeDimension = "pageType";
    private const string CountryDimension = "country";
    private const string CultureDimension = "culture";
    private const string SourceDimension = "source";
    private const string DateFormat = "yyyy-MM-dd";

    public static async Task HandleAsync(HttpContext context)
    {
        AnalyticsResponseHeaders.Apply(context);

        var options = context.RequestServices.GetRequiredService<IOptions<AnalyticsOptions>>().Value;
        var store = context.RequestServices.GetRequiredService<VisitCounterStore>();

        if (!store.IsEnabled || string.IsNullOrEmpty(options.StatsToken))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        if (!StatsTokenComparer.Matches(options.StatsToken, context.Request.Headers[AnalyticsRoutes.StatsTokenHeader].ToString()))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        var to = store.Today;
        var from = to.AddDays(1 - ReadDays(context.Request.Query));
        var rows = store.Snapshot(from, to);
        var timeProvider = context.RequestServices.GetRequiredService<TimeProvider>();

        context.Response.StatusCode = StatusCodes.Status200OK;
        context.Response.ContentType = JsonContentType;
        await JsonSerializer.SerializeAsync(
            context.Response.Body,
            Build(rows, from, to, timeProvider.GetUtcNow()),
            VisitCounterJson.Options,
            context.RequestAborted);
    }

    public static VisitStatsResponse Build(
        IReadOnlyList<KeyValuePair<VisitKey, long>> rows,
        DateOnly from,
        DateOnly to,
        DateTimeOffset generatedAtUtc)
    {
        var totals = new Dictionary<string, IReadOnlyList<VisitStatsTotal>>
        {
            [EventDimension] = Sum(rows, key => key.Event.ToString()),
            [DateDimension] = Sum(rows, key => key.Date.ToString(DateFormat, CultureInfo.InvariantCulture)),
            [PageTypeDimension] = Sum(rows, key => key.PageType),
            [CountryDimension] = Sum(rows, key => key.Country),
            [CultureDimension] = Sum(rows, key => key.Culture),
            [SourceDimension] = Sum(rows, key => key.Source),
        };

        var entries = rows
            .Select(pair => new VisitCounterFileEntry
            {
                Date = pair.Key.Date,
                Event = pair.Key.Event,
                PageType = pair.Key.PageType,
                Country = pair.Key.Country,
                Culture = pair.Key.Culture,
                Source = pair.Key.Source,
                Visitor = pair.Key.Visitor,
                Count = pair.Value,
            })
            .OrderBy(entry => entry.Date)
            .ThenBy(entry => entry.Event)
            .ThenByDescending(entry => entry.Count)
            .ToList();

        return new VisitStatsResponse(generatedAtUtc, from, to, rows.Sum(pair => pair.Value), totals, entries);
    }

    private static int ReadDays(IQueryCollection query)
    {
        var raw = query[DaysParameter].ToString();

        return int.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out var days)
            ? Math.Clamp(days, 1, VisitCounterStore.RetentionDays)
            : DefaultDays;
    }

    private static IReadOnlyList<VisitStatsTotal> Sum(
        IEnumerable<KeyValuePair<VisitKey, long>> rows,
        Func<VisitKey, string> dimension)
        => rows
            .GroupBy(pair => (Value: dimension(pair.Key), pair.Key.Event, pair.Key.Visitor))
            .Select(group => new VisitStatsTotal(group.Key.Value, group.Key.Event, group.Key.Visitor, group.Sum(pair => pair.Value)))
            .OrderBy(total => total.Value, StringComparer.Ordinal)
            .ThenBy(total => total.Event)
            .ThenBy(total => total.Visitor)
            .ToList();
}
