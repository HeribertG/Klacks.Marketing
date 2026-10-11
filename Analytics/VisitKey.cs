// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

/// <summary>
/// One aggregation bucket of the visit counter: a UTC day plus the anonymous dimensions. No URL, IP or User-Agent.
/// </summary>
/// <param name="Date">UTC calendar day of the event</param>
/// <param name="Event">What happened</param>
/// <param name="PageType">Page type from <see cref="PageTypes"/></param>
/// <param name="Country">Country code or "none"</param>
/// <param name="Culture">Supported culture code</param>
/// <param name="Source">Traffic source from the <see cref="TrafficSources"/> allowlist</param>
/// <param name="Visitor">Human or bot, derived from the User-Agent which is then discarded</param>
public sealed record VisitKey(
    DateOnly Date,
    VisitEvent Event,
    string PageType,
    string Country,
    string Culture,
    string Source,
    VisitorClass Visitor);
