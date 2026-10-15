// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

/// <summary>
/// Constants of the simple / expert mode of the site: the expert route slug, the content key of the simple page, the
/// body classes and the cultures that have a simple start page. The culture list is explicit on purpose: a new
/// simple.json alone must not switch a culture over, since the expert route exists only for the unprefixed default
/// culture ("/{country}/experten").
/// </summary>
/// <param name="cultureCode">Culture code of the page ("de")</param>
/// <param name="enabled">Value of SimpleMode:Enabled</param>
/// <param name="countryPageKey">Country page key ("land-ch")</param>
public static class SiteModes
{
    public const string ExpertSlug = "experten";
    public const string SimpleContentKey = "simple";
    public const string SimpleBodyClass = "mode-simple";
    public const string ExpertBodyClass = "mode-expert";

    private const char PathSeparator = '/';
    private const int ExpertStartSegmentCount = 2;

    private static readonly string[] CulturesWithSimplePage = { SupportedCultures.DefaultCode };

    public static IReadOnlyList<string> SimplePageCultures => CulturesWithSimplePage;

    public static bool HasSimplePage(string cultureCode, bool enabled)
        => enabled && CulturesWithSimplePage.Contains(cultureCode, StringComparer.OrdinalIgnoreCase);

    public static string ExpertRoutePath(string countryPageKey) => countryPageKey + PathSeparator + ExpertSlug;

    public static bool IsExpertStartPath(string path)
    {
        var segments = path.Split(PathSeparator, StringSplitOptions.RemoveEmptyEntries);

        return segments.Length == ExpertStartSegmentCount
            && segments[1].Equals(ExpertSlug, StringComparison.OrdinalIgnoreCase);
    }
}
