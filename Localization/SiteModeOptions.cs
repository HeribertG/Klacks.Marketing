// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

/// <summary>
/// Configuration of the simple start page (section "SimpleMode"). While disabled, every country start page keeps the
/// expert template, "/land-xx/experten" answers 404 and the header shows no mode switch, so the feature can be merged
/// before go-live.
/// </summary>
/// <param name="Enabled">Switches the simple start page, the expert start route, the mode switch and the sitemap entries on or off</param>
public sealed class SiteModeOptions
{
    public const string SectionName = "SimpleMode";

    public bool Enabled { get; set; }
}
