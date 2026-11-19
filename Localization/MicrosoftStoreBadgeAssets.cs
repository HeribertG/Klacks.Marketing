// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

/// <summary>
/// Resolves the locally hosted, unmodified official "Get it from Microsoft" badge images (downloaded from
/// get.microsoft.com/images, one dark and one light variant per language) for a site culture. Microsoft ships
/// no Norwegian Bokmal badge (only Nynorsk) and its own badge component then falls back to English, so "nb"
/// uses the English badge; Portuguese uses the European variant.
/// </summary>
/// <param name="cultureCode">Site culture code ("de", "zh-CN")</param>
/// <param name="theme">Badge theme: Dark for light backgrounds, Light for dark backgrounds</param>
public static class MicrosoftStoreBadgeAssets
{
    public const string DarkTheme = "dark";
    public const string LightTheme = "light";
    public const string ImageFolder = "/images/ms-store";
    public const string EnglishFileCode = "en-us";

    private static readonly IReadOnlyDictionary<string, string> FileCodes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["ar"] = "ar",
        ["cs"] = "cs",
        ["da"] = "da",
        ["de"] = "de",
        ["el"] = "el",
        ["en"] = EnglishFileCode,
        ["es"] = "es",
        ["fi"] = "fi",
        ["fr"] = "fr",
        ["he"] = "he",
        ["id"] = "id",
        ["it"] = "it",
        ["ja"] = "ja",
        ["ko"] = "ko",
        ["ms"] = "ms",
        ["nb"] = EnglishFileCode,
        ["nl"] = "nl",
        ["pl"] = "pl",
        ["pt"] = "pt-pt",
        ["ro"] = "ro",
        ["sv"] = "sv",
        ["th"] = "th",
        ["vi"] = "vi",
        ["zh-CN"] = "zh-cn",
        ["zh-TW"] = "zh-tw",
    };

    public static string FileCode(string cultureCode) =>
        FileCodes.TryGetValue(cultureCode, out var code) ? code : EnglishFileCode;

    public static string ImagePath(string cultureCode, string theme) =>
        $"{ImageFolder}/{FileCode(cultureCode)}-{theme}.svg";
}
