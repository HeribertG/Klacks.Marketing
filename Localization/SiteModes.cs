// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

/// <summary>
/// Constants of the simple / expert mode of the site: the expert route slug, the content key of the simple page, the
/// body classes and the cultures that have a simple start page: every supported culture (SupportedCultures.All). Every
/// such culture gets the simple page at "/[culture/]land-xx" and the expert start page at "/[culture/]land-xx/experten";
/// a code outside the supported cultures has neither. A new supported culture therefore needs its simple.json (and
/// countries.json when prefixed) before it ships; SimpleContentTests fails until both exist.
/// </summary>
/// <param name="cultureCode">Culture code of the page ("de")</param>
/// <param name="enabled">Value of SimpleMode:Enabled</param>
/// <param name="countryPageKey">Country page key ("land-ch")</param>
/// <param name="path">Request path that may be an expert start route</param>
public static class SiteModes
{
    public const string ExpertSlug = "experten";
    public const string SimpleContentKey = "simple";
    public const string CountryNamesContentKey = "countries";
    public const string SimpleBodyClass = "mode-simple";
    public const string ExpertBodyClass = "mode-expert";

    private const char PathSeparator = '/';
    private const int UnprefixedExpertStartSegmentCount = 2;
    private const int PrefixedExpertStartSegmentCount = 3;

    private static readonly string[] CulturesWithSimplePage = SupportedCultures.All.Select(culture => culture.Code).ToArray();

    public static IReadOnlyList<string> SimplePageCultures => CulturesWithSimplePage;

    public static bool HasSimplePage(string cultureCode, bool enabled)
        => enabled && CulturesWithSimplePage.Contains(cultureCode, StringComparer.OrdinalIgnoreCase);

    public static string ExpertRoutePath(string countryPageKey) => countryPageKey + PathSeparator + ExpertSlug;

    public static bool IsExpertStartPath(string path) => TryGetExpertStartCulture(path, out _);

    /// <summary>
    /// True when the path has the shape of an expert start route: "/{country}/experten" (default culture) or
    /// "/{culture}/{country}/experten" with a known prefixed culture slug. The culture is returned so the caller can
    /// decide whether that culture serves the route at all.
    /// </summary>
    public static bool TryGetExpertStartCulture(string path, out string cultureCode)
    {
        cultureCode = SupportedCultures.DefaultCode;
        var segments = path.Split(PathSeparator, StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0 || !segments[^1].Equals(ExpertSlug, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (segments.Length == UnprefixedExpertStartSegmentCount)
        {
            return true;
        }

        if (segments.Length == PrefixedExpertStartSegmentCount && FindPrefixedCulture(segments[0]) is { } culture)
        {
            cultureCode = culture.Code;
            return true;
        }

        return false;
    }

    public static SupportedCulture? FindPrefixedCulture(string? segment)
        => segment is null
            ? null
            : SupportedCultures.All.FirstOrDefault(culture =>
                culture.UrlSlug.Length > 0 && culture.UrlSlug.Equals(segment, StringComparison.OrdinalIgnoreCase));
}
