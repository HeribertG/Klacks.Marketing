// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

/// <summary>
/// Klacks is installed only via the Klacks Store (owner decision 2026-11-09), so the former installation pages
/// ("/land-ch/installation", "/fr/land-ch/installation") and their country-less legacy URLs ("/installation",
/// "/en/installation") permanently redirect in a single hop to the store page of the country (RegionPackages.StoreUrl).
/// The culture is the prefixed one, otherwise the unprefixed default; a country-less URL uses the culture's default
/// country. The requested country is kept even where the site would not serve it in that culture ("/ja/land-ch"),
/// since the store page exists in every culture. Returns null for every other path, including unknown countries
/// and culture slugs, which keeps their 404.
/// </summary>
/// <param name="path">Request path ("/fr/land-ch/installation")</param>
/// <param name="marketplaceBaseUrl">Base URL of the Klacks Store ("https://klacks-software.ch/store")</param>
public static class InstallationRedirect
{
    private const char PathSeparator = '/';

    public static string? ResolveTarget(string path, string marketplaceBaseUrl)
    {
        var segments = path.Split(PathSeparator, StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0
            || !segments[^1].Equals(CountryPageLinks.InstallationSlug, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var leading = segments[..^1];
        var culture = leading.Length > 0 ? SiteModes.FindPrefixedCulture(leading[0]) : null;
        var countrySegments = culture is null ? leading : leading[1..];
        culture ??= SupportedCultures.Default;

        string countryPageKey;
        switch (countrySegments.Length)
        {
            case 0:
                countryPageKey = LanguageCountries.DefaultCountryFor(culture.Code);
                break;
            case 1:
                var known = CountryIndustries.AllCountries.FirstOrDefault(country =>
                    country.Equals(countrySegments[0], StringComparison.OrdinalIgnoreCase));
                if (known is null)
                {
                    return null;
                }

                countryPageKey = known;
                break;
            default:
                return null;
        }

        return RegionPackages.StoreUrl(marketplaceBaseUrl, RegionPackages.CountryCode(countryPageKey), culture.Code);
    }
}
