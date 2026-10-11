// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

public sealed record VisitStatsTotal(string Value, VisitEvent Event, VisitorClass Visitor, long Count);
