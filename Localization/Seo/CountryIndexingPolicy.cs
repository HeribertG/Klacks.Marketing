// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization.Seo;

/// <summary>
/// Decides which country page families are kept out of search engines and the sitemap.
/// Owner decision 2026-10-10: the China pages stay reachable but are not promoted.
/// </summary>
public static class CountryIndexingPolicy
{
    private const char RouteSeparator = '/';
    private const char ContentSeparator = '-';

    private static readonly string[] NoindexCountryKeys = { "land-cn" };

    /// <param name="pageKey">Page key ("land-cn", "land-cn-spitex") or route key ("land-cn/installation")</param>
    public static bool IsNoindex(string pageKey)
        => NoindexCountryKeys.Any(countryKey =>
            pageKey.Equals(countryKey, StringComparison.OrdinalIgnoreCase)
            || pageKey.StartsWith(countryKey + ContentSeparator, StringComparison.OrdinalIgnoreCase)
            || pageKey.StartsWith(countryKey + RouteSeparator, StringComparison.OrdinalIgnoreCase));
}
