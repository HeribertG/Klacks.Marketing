// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

public sealed class VisitCounterFileDocument
{
    public int SchemaVersion { get; set; }

    public string Month { get; set; } = string.Empty;

    public List<VisitCounterFileEntry> Entries { get; set; } = new();
}
