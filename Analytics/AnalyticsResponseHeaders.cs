// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Net.Http.Headers;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Common response preparation for /_c and /_stats: noindex, no caching, and no re-execution of error statuses into
/// the branded HTML 404 page (which would drop these headers and answer with a page instead of a status).
/// </summary>
public static class AnalyticsResponseHeaders
{
    private const string NoStore = "no-store";

    public static void Apply(HttpContext context)
    {
        context.Response.Headers[AnalyticsRoutes.RobotsTagHeader] = AnalyticsRoutes.RobotsTagValue;
        context.Response.Headers[HeaderNames.CacheControl] = NoStore;

        if (context.Features.Get<IStatusCodePagesFeature>() is { } statusCodePages)
        {
            statusCodePages.Enabled = false;
        }
    }
}
