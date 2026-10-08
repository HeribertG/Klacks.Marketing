using System.Globalization;
using Microsoft.Net.Http.Headers;

namespace Klacks.Marketing.Localization;

// Picks the landing page for a visitor who opens the bare site root ("/") from the
// browser's Accept-Language header. The header carries a language and only sometimes
// a region, so a region ("de-AT") selects a country page only when that country is
// mapped to the language in LanguageCountries; otherwise the language's default
// country applies. Returns null when no listed language is supported, so the caller
// keeps its fixed fallback. Crawlers send no header and therefore never reach this
// result, which keeps the indexed root target stable.
public static class BrowserLanguageRedirect
{
    private const char RegionSeparator = '-';
    private const string CountryKeyPrefix = "land-";
    private const string SimplifiedChineseCode = "zh-CN";
    private const string TraditionalChineseCode = "zh-TW";
    private const string NorwegianBokmalCode = "nb";

    private static readonly HashSet<string> TraditionalChineseTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "zh-Hant", "zh-TW", "zh-HK", "zh-MO",
    };

    private static readonly HashSet<string> NorwegianTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "no", "nn", "nb",
    };

    public static string? ResolveTarget(string? acceptLanguage)
    {
        if (string.IsNullOrWhiteSpace(acceptLanguage)
            || !StringWithQualityHeaderValue.TryParseList(acceptLanguage.Split(','), out var tags))
        {
            return null;
        }

        foreach (var tag in tags.Where(t => t.Quality != 0).OrderByDescending(t => t.Quality ?? 1))
        {
            if (tag.Value.HasValue && TryBuildTarget(tag.Value.Value, out var target))
            {
                return target;
            }
        }

        return null;
    }

    private static bool TryBuildTarget(string languageTag, out string target)
    {
        target = string.Empty;

        var culture = ResolveCulture(languageTag);
        if (culture is null)
        {
            return false;
        }

        var country = ResolveCountry(culture, languageTag);
        target = culture.UrlSlug.Length == 0 ? $"/{country}" : $"/{culture.UrlSlug}/{country}";
        return true;
    }

    private static SupportedCulture? ResolveCulture(string languageTag)
    {
        var code = languageTag.Split(RegionSeparator)[0];

        if (code.Equals("zh", StringComparison.OrdinalIgnoreCase))
        {
            code = TraditionalChineseTags.Contains(languageTag) ? TraditionalChineseCode : SimplifiedChineseCode;
        }
        else if (NorwegianTags.Contains(code))
        {
            code = NorwegianBokmalCode;
        }

        return SupportedCultures.All.FirstOrDefault(c => c.Code.Equals(code, StringComparison.OrdinalIgnoreCase));
    }

    private static string ResolveCountry(SupportedCulture culture, string languageTag)
    {
        var parts = languageTag.Split(RegionSeparator);
        var region = parts.Length > 1 && parts[^1].Length == 2 ? parts[^1] : null;

        if (region is not null
            && LanguageCountries.TryGetCountries(culture.Code, out var countries))
        {
            var key = CountryKeyPrefix + region.ToLower(CultureInfo.InvariantCulture);
            if (countries.Contains(key, StringComparer.Ordinal))
            {
                return key;
            }
        }

        return LanguageCountries.DefaultCountryFor(culture.Code);
    }
}
