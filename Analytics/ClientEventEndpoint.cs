// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Text.Json;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// POST /_c: accepts one of the four client events from wwwroot/js/c.js (body at most <see cref="MaxBodyBytes"/>
/// bytes, sent as text/plain by navigator.sendBeacon). Server-side events (PageRequest, CircuitStarted), numeric
/// names and unknown names are rejected with 400.
/// </summary>
public static class ClientEventEndpoint
{
    public const int MaxBodyBytes = 200;

    private const char PathRoot = '/';

    private static readonly Dictionary<string, VisitEvent> ClientEvents = new(StringComparer.Ordinal)
    {
        [nameof(VisitEvent.DemoModalOpened)] = VisitEvent.DemoModalOpened,
        [nameof(VisitEvent.PlaygroundContinue)] = VisitEvent.PlaygroundContinue,
        [nameof(VisitEvent.DownloadClick)] = VisitEvent.DownloadClick,
        [nameof(VisitEvent.OutboundClick)] = VisitEvent.OutboundClick,
    };

    public static IReadOnlyCollection<string> AcceptedEventNames => ClientEvents.Keys;

    public static async Task HandleAsync(HttpContext context)
    {
        AnalyticsResponseHeaders.Apply(context);

        var store = context.RequestServices.GetRequiredService<VisitCounterStore>();
        if (!store.IsEnabled)
        {
            context.Response.StatusCode = StatusCodes.Status204NoContent;
            return;
        }

        if (!context.RequestServices.GetRequiredService<ClientEventRateLimiter>().TryAcquire())
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            return;
        }

        if (context.Request.ContentLength > MaxBodyBytes)
        {
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            return;
        }

        var body = await ReadBodyAsync(context.Request.Body, context.RequestAborted);
        if (body is null)
        {
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            return;
        }

        var payload = Parse(body);
        if (payload?.Event is null || !ClientEvents.TryGetValue(payload.Event, out var visitEvent))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        var request = context.Request;
        store.Record(
            visitEvent,
            ClassifyPath(payload.Path),
            TrafficSourceClassifier.Classify(payload.Campaign, payload.RefererHost, request.Host.Host),
            BotUserAgents.Classify(request.Headers.UserAgent.ToString()));

        context.Response.StatusCode = StatusCodes.Status204NoContent;
    }

    private static VisitLocation ClassifyPath(string? path)
        => !string.IsNullOrEmpty(path) && path[0] == PathRoot
            ? VisitPathClassifier.Classify(path)
            : VisitPathClassifier.Classify(null) with { PageType = PageTypes.Other };

    private static ClientEventPayload? Parse(byte[] body)
    {
        try
        {
            return JsonSerializer.Deserialize<ClientEventPayload>(body, VisitCounterJson.Options);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    // Reads at most MaxBodyBytes + 1 bytes regardless of Content-Length (which may be absent or chunked);
    // returns null when the body is larger than allowed.
    private static async Task<byte[]?> ReadBodyAsync(Stream body, CancellationToken cancellationToken)
    {
        var buffer = new byte[MaxBodyBytes + 1];
        var total = 0;

        while (total < buffer.Length)
        {
            var read = await body.ReadAsync(buffer.AsMemory(total), cancellationToken);
            if (read == 0)
            {
                break;
            }

            total += read;
        }

        return total > MaxBodyBytes ? null : buffer[..total];
    }
}
