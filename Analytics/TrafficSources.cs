// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Allowlist of traffic source values the visit counter may store; anything else collapses to <see cref="Other"/>.
/// </summary>
public static class TrafficSources
{
    public const string ChatGpt = "chatgpt.com";
    public const string Perplexity = "perplexity";
    public const string Claude = "claude";
    public const string Google = "google";
    public const string Bing = "bing";
    public const string DuckDuckGo = "duckduckgo";
    public const string GitHub = "github";
    public const string LinkedIn = "linkedin";
    public const string Direct = "direct";
    public const string Share = "share";
    public const string Other = "other";

    public static readonly IReadOnlyList<string> All = new[]
    {
        ChatGpt, Perplexity, Claude, Google, Bing, DuckDuckGo, GitHub, LinkedIn, Direct, Share, Other,
    };
}
