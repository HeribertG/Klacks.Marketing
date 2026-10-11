// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using Klacks.Marketing.Seo;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Small list of User-Agent tokens of obvious crawlers and scripted clients. Only the resulting class (human or bot)
/// is stored, never the User-Agent itself.
/// </summary>
public static class BotUserAgents
{
    public static readonly IReadOnlyList<string> Tokens = new[]
    {
        "bot", "crawl", "spider", "slurp", "facebookexternalhit", "headless", "lighthouse", "preview",
        "curl", "wget", "python", "httpclient", "go-http-client", "java/", "libwww", "scrapy", "okhttp",
        "axios", "node-fetch", "monitor", "uptime",
    };

    public static VisitorClass Classify(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return VisitorClass.Bot;
        }

        var isBot = Tokens.Any(token => userAgent.Contains(token, StringComparison.OrdinalIgnoreCase))
            || AiCrawlers.Match(userAgent) is not null;

        return isBot ? VisitorClass.Bot : VisitorClass.Human;
    }
}
