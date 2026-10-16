// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Closed set of page types the visit counter stores instead of URLs.
/// </summary>
public static class PageTypes
{
    public const string Start = "start";
    public const string ExpertStart = "experten-start";
    public const string Industry = "branche";
    public const string Installation = "installation";
    public const string Offer = "angebot";
    public const string Comparison = "vergleich";
    public const string AboutUs = "ueber-uns";
    public const string Partner = "partner";
    public const string License = "lizenz";
    public const string SmallBusiness = "kleine-betriebe";
    public const string MidSizeBusiness = "mittlere-betriebe";
    public const string LargeBusiness = "grosse-betriebe";
    public const string Legal = "legal";
    public const string DocsSitemap = "docs-sitemap";
    public const string Other = "sonstiges";

    public static readonly IReadOnlyList<string> All = new[]
    {
        Start, ExpertStart, Industry, Installation, Offer, Comparison, AboutUs, Partner, License,
        SmallBusiness, MidSizeBusiness, LargeBusiness, Legal, DocsSitemap, Other,
    };
}
