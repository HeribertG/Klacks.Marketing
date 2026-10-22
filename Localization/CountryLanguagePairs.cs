// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

/// <summary>
/// The real pages of the site (owner decision 2026-10-21): a country is served only in the languages spoken there, as
/// listed in LanguageCountries ("land-ch" in de, fr and it, "land-jp" in ja, English for GB, IE, SA and AE). Every other
/// culture/country combination ("/ja/land-ch") is not a page and permanently redirects to the culture's home country
/// ("/ja/land-jp"), the same jump the language switch makes. German is the exception: its variants of the other
/// countries ("/land-jp") are the authoring masters of the translations and stay reachable as a noindex preview.
/// </summary>
/// <param name="cultureCode">Culture code of the page ("de", "ja")</param>
/// <param name="countryPageKey">Country page key ("land-ch")</param>
/// <param name="path">Request path ("/ja/land-ch/spitex")</param>
public static class CountryLanguagePairs
{
    private const char PathSeparator = '/';

    public static bool IsPair(string cultureCode, string countryPageKey)
        => LanguageCountries.TryGetCountries(cultureCode, out var countries)
            && countries.Contains(countryPageKey, StringComparer.OrdinalIgnoreCase);

    public static bool IsAuthoringPreview(string cultureCode, string countryPageKey)
        => cultureCode.Equals(SupportedCultures.DefaultCode, StringComparison.OrdinalIgnoreCase)
            && !IsPair(cultureCode, countryPageKey);

    // The culture whose page is the x-default of a country's hreflang cluster: the culture that has this country as
    // its home ("ja" for land-jp, "he" for land-il, "de" for land-ch), otherwise the first culture serving the country.
    public static SupportedCulture PrimaryCultureFor(string countryPageKey)
    {
        var cultures = SupportedCultures.All.Where(culture => IsPair(culture.Code, countryPageKey)).ToList();

        return cultures.FirstOrDefault(culture =>
                LanguageCountries.DefaultCountryFor(culture.Code).Equals(countryPageKey, StringComparison.OrdinalIgnoreCase))
            ?? cultures.FirstOrDefault()
            ?? SupportedCultures.Default;
    }

    // The permanent target for a country page served in a culture that is not spoken there: the same page under the
    // culture's home country, or that country's root when the page does not exist there. Null for real pages, for the
    // German authoring previews and for paths that are not country pages.
    public static string? RedirectTarget(string path)
    {
        var segments = path.Split(PathSeparator, StringSplitOptions.RemoveEmptyEntries);
        var culture = segments.Length > 0 ? SiteModes.FindPrefixedCulture(segments[0]) : null;
        var countryIndex = culture is null ? 0 : 1;
        culture ??= SupportedCultures.Default;

        if (segments.Length <= countryIndex
            || !CountryIndustries.AllCountries.Contains(segments[countryIndex], StringComparer.OrdinalIgnoreCase)
            || IsPair(culture.Code, segments[countryIndex])
            || IsAuthoringPreview(culture.Code, segments[countryIndex]))
        {
            return null;
        }

        var prefix = culture.UrlSlug.Length == 0 ? string.Empty : PathSeparator + culture.UrlSlug;
        var countryRoot = $"{prefix}{PathSeparator}{LanguageCountries.DefaultCountryFor(culture.Code)}";
        var rest = segments[(countryIndex + 1)..];
        var target = rest.Length == 0 ? countryRoot : countryRoot + PathSeparator + string.Join(PathSeparator, rest);

        return KnownPageRoutes.Contains(target) ? target : countryRoot;
    }
}
