// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

public sealed class VisitCounterFileEntry
{
    public DateOnly Date { get; set; }

    public VisitEvent Event { get; set; }

    public string PageType { get; set; } = PageTypes.Other;

    public string Country { get; set; } = VisitLocation.NoCountry;

    public string Culture { get; set; } = string.Empty;

    public string Source { get; set; } = TrafficSources.Other;

    public VisitorClass Visitor { get; set; }

    public long Count { get; set; }
}
