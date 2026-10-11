// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

/// <summary>
/// The anonymous page dimensions derived from a request path; every value comes from a closed set.
/// </summary>
/// <param name="PageType">One of the <see cref="PageTypes"/> constants</param>
/// <param name="Country">Two-letter country code from a "land-xx" segment, or <see cref="VisitLocation.NoCountry"/></param>
/// <param name="Culture">Culture code of a supported culture (the unprefixed default is "de")</param>
public sealed record VisitLocation(string PageType, string Country, string Culture)
{
    public const string NoCountry = "none";
}
