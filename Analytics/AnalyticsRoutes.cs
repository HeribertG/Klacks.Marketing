// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Paths and header names of the visit counter endpoints, shared by the endpoints, robots.txt and the tests.
/// </summary>
public static class AnalyticsRoutes
{
    public const string ClientEventPath = "/_c";
    public const string StatsPath = "/_stats";
    public const string StatsTokenHeader = "X-Stats-Token";
    public const string RobotsTagHeader = "X-Robots-Tag";
    public const string RobotsTagValue = "noindex, nofollow";
}
