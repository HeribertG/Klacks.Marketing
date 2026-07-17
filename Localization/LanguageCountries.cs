namespace Klacks.Marketing.Localization;

// Maps each culture to the countries where it is actually spoken/used, ordered by
// relevance. Shared by the layout (language/country switching) and the routing
// layer (redirecting the country-less legacy product URLs), so a visitor who hits
// "/spitex" directly and one who clicks the industry card both land on the same
// country page.
public static class LanguageCountries
{
    private static readonly Dictionary<string, string[]> ByLanguage = new(StringComparer.OrdinalIgnoreCase)
    {
        ["de"] = new[] { "land-de", "land-at", "land-ch" },
        ["en"] = new[] { "land-gb", "land-sa", "land-ae", "land-ie" },
        ["ar"] = new[] { "land-sa", "land-ae", "land-il" },
        ["he"] = new[] { "land-il" },
        ["ja"] = new[] { "land-jp" },
        ["ko"] = new[] { "land-kr" },
        ["zh-CN"] = new[] { "land-cn" },
        ["zh-TW"] = new[] { "land-tw" },
        ["ms"] = new[] { "land-my" },
        ["id"] = new[] { "land-id" },
        ["th"] = new[] { "land-th" },
        ["vi"] = new[] { "land-vn" },
        ["cs"] = new[] { "land-cz" },
        ["ro"] = new[] { "land-ro" },
        ["sv"] = new[] { "land-se", "land-fi" },
        ["fr"] = new[] { "land-fr", "land-ch", "land-be" },
        ["it"] = new[] { "land-it", "land-ch" },
        ["nl"] = new[] { "land-nl", "land-be" },
        ["da"] = new[] { "land-dk" },
        ["el"] = new[] { "land-gr" },
        ["es"] = new[] { "land-es" },
        ["fi"] = new[] { "land-fi" },
        ["nb"] = new[] { "land-no" },
        ["pl"] = new[] { "land-pl" },
        ["pt"] = new[] { "land-pt" },
    };

    public static bool TryGetCountries(string cultureCode, out string[] countries)
        => ByLanguage.TryGetValue(cultureCode, out countries!);

    // The country a culture falls back to when no country is in play yet. German
    // deliberately resolves to Switzerland rather than the first mapped country
    // (land-de), matching the existing "/" -> "/land-ch" redirect and the Swiss
    // go-to-market focus.
    public static string DefaultCountryFor(string cultureCode)
    {
        if (cultureCode.Equals(SupportedCultures.DefaultCode, StringComparison.OrdinalIgnoreCase))
        {
            return CountryIndustries.SwissCountryPageKey;
        }

        return ByLanguage.TryGetValue(cultureCode, out var countries) && countries.Length > 0
            ? countries[0]
            : CountryIndustries.SwissCountryPageKey;
    }
}
