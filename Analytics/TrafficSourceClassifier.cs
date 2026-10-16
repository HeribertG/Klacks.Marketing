// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Reduces a campaign parameter (utm_source / ref) or a Referer host to one value of the <see cref="TrafficSources"/>
/// allowlist. The raw parameter and host are only inspected here and never stored.
/// </summary>
public static class TrafficSourceClassifier
{
    public const string UtmSourceParameter = "utm_source";
    public const string RefParameter = "ref";

    private const int MaxInspectedLength = 100;
    private const string WwwPrefix = "www.";

    private static readonly (string Token, string Source)[] TokenSources =
    {
        ("chatgpt", TrafficSources.ChatGpt),
        ("openai", TrafficSources.ChatGpt),
        ("perplexity", TrafficSources.Perplexity),
        ("claude", TrafficSources.Claude),
        ("anthropic", TrafficSources.Claude),
        ("duckduckgo", TrafficSources.DuckDuckGo),
        ("google", TrafficSources.Google),
        ("bing", TrafficSources.Bing),
        ("github", TrafficSources.GitHub),
        ("linkedin", TrafficSources.LinkedIn),
        ("lnkd.in", TrafficSources.LinkedIn),
    };

    /// <param name="campaignParameter">Value of utm_source or ref, if present</param>
    /// <param name="refererHost">Host of the Referer, if present</param>
    /// <param name="ownHost">Host of this site; a referer from it counts as direct</param>
    public static string Classify(string? campaignParameter, string? refererHost, string? ownHost)
    {
        if (!string.IsNullOrWhiteSpace(campaignParameter))
        {
            var value = campaignParameter.Trim();
            if (value.Equals(TrafficSources.Direct, StringComparison.OrdinalIgnoreCase))
            {
                return TrafficSources.Direct;
            }

            if (value.Equals(TrafficSources.Share, StringComparison.OrdinalIgnoreCase))
            {
                return TrafficSources.Share;
            }

            return MatchToken(value) ?? TrafficSources.Other;
        }

        if (string.IsNullOrWhiteSpace(refererHost) || IsSameSite(refererHost, ownHost))
        {
            return TrafficSources.Direct;
        }

        return MatchToken(refererHost) ?? TrafficSources.Other;
    }

    public static string? HostOf(string? url)
        => Uri.TryCreate(url, UriKind.Absolute, out var uri) ? uri.Host : null;

    private static string? MatchToken(string value)
    {
        if (value.Length > MaxInspectedLength)
        {
            return null;
        }

        foreach (var (token, source) in TokenSources)
        {
            if (value.Contains(token, StringComparison.OrdinalIgnoreCase))
            {
                return source;
            }
        }

        return null;
    }

    private static bool IsSameSite(string refererHost, string? ownHost)
        => !string.IsNullOrEmpty(ownHost)
            && StripWww(refererHost).Equals(StripWww(ownHost), StringComparison.OrdinalIgnoreCase);

    private static string StripWww(string host)
        => host.StartsWith(WwwPrefix, StringComparison.OrdinalIgnoreCase) ? host[WwwPrefix.Length..] : host;
}
