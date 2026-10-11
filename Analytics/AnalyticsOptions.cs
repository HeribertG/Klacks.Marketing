// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Configuration of the anonymous visit counter (section "Analytics").
/// </summary>
/// <param name="Enabled">Switches counting and both endpoints on or off</param>
/// <param name="DataDirectory">Folder for the monthly JSON files; relative paths resolve against the content root</param>
/// <param name="StatsToken">Secret expected in the X-Stats-Token header of /_stats; empty disables the endpoint (404)</param>
public sealed class AnalyticsOptions
{
    public const string SectionName = "Analytics";
    public const string DefaultDataDirectory = "./data/analytics";

    public bool Enabled { get; set; } = true;

    public string DataDirectory { get; set; } = DefaultDataDirectory;

    public string? StatsToken { get; set; }
}
