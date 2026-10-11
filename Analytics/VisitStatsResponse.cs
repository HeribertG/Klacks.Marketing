// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

public sealed record VisitStatsResponse(
    DateTimeOffset GeneratedAtUtc,
    DateOnly From,
    DateOnly To,
    long Total,
    IReadOnlyDictionary<string, IReadOnlyList<VisitStatsTotal>> Totals,
    IReadOnlyList<VisitCounterFileEntry> Rows);
