// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

/// <summary>
/// Maps a request or base-relative path onto the page mode: the country root ("/land-ch") is the simple page, every
/// other page under a country is an expert page whose switch leads back to the country's simple page, and the expert
/// start page ("/land-ch/experten") leads to the simple page as well. Pure and stateless, so the prerender
/// (_Layout.cshtml), the layout and the switch component all agree after every in-circuit navigation.
/// </summary>
/// <param name="path">Absolute or base-relative path, may carry query and fragment</param>
/// <param name="simpleModeEnabled">Value of SimpleMode:Enabled</param>
public static class SiteModeResolver
{
    private const char PathSeparator = '/';
    private const char QuerySeparator = '?';
    private const char FragmentSeparator = '#';

    public static SiteModeState Resolve(string? path, bool simpleModeEnabled)
    {
        var clean = (path ?? string.Empty).Split(FragmentSeparator)[0].Split(QuerySeparator)[0];
        var segments = clean.Split(PathSeparator, StringSplitOptions.RemoveEmptyEntries);
        var culture = SupportedCultures.Default;
        var index = 0;

        if (segments.Length > 0 && FindPrefixedCulture(segments[0]) is { } prefixed)
        {
            culture = prefixed;
            index = 1;
        }

        var hidden = new SiteModeState(IsSimple: false, ShowSwitch: false, SwitchTarget: null, CultureCode: culture.Code, FeatureEnabled: simpleModeEnabled);
        if (!SiteModes.HasSimplePage(culture.Code, simpleModeEnabled) || index >= segments.Length)
        {
            return hidden;
        }

        var country = segments[index].ToLowerInvariant();
        if (!CountryIndustries.AllCountries.Contains(country, StringComparer.OrdinalIgnoreCase))
        {
            return hidden;
        }

        var prefix = culture.UrlSlug.Length == 0 ? string.Empty : PathSeparator + culture.UrlSlug;
        var isCountryRoot = segments.Length == index + 1;

        return isCountryRoot
            ? new SiteModeState(IsSimple: true, ShowSwitch: true, SwitchTarget: $"{prefix}{PathSeparator}{SiteModes.ExpertRoutePath(country)}", CultureCode: culture.Code, FeatureEnabled: simpleModeEnabled)
            : new SiteModeState(IsSimple: false, ShowSwitch: true, SwitchTarget: $"{prefix}{PathSeparator}{country}", CultureCode: culture.Code, FeatureEnabled: simpleModeEnabled);
    }

    private static SupportedCulture? FindPrefixedCulture(string segment)
        => SupportedCultures.All.FirstOrDefault(culture =>
            culture.UrlSlug.Length > 0 && culture.UrlSlug.Equals(segment, StringComparison.OrdinalIgnoreCase));
}
