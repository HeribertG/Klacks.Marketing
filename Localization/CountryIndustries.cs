namespace Klacks.Marketing.Localization;

// A single branch/industry entry for a country that has dedicated industry
// sub-pages. Slug is the URL segment under "/land-xx/"; LabelKey and TextKey
// point into the "index" content namespace (reused so labels stay localized);
// Icon is the Material Symbols name shown on the card.
public sealed record CountryIndustry(string Slug, string LabelKey, string TextKey, string Icon);

// Registry of per-country industry sub-pages. Switzerland is the pilot; other
// countries have no sub-pages yet and therefore resolve to null, which keeps the
// industry dropdown and the on-page industry grid hidden for them.
public static class CountryIndustries
{
    public const string SwissCountryPageKey = "land-ch";

    private static readonly IReadOnlyList<CountryIndustry> Swiss = new[]
    {
        new CountryIndustry("spitex", "industries.spitex.title", "industries.spitex.text", "home_health"),
        new CountryIndustry("spitaeler", "industries.spitaeler.title", "industries.spitaeler.text", "local_hospital"),
        new CountryIndustry("security", "industries.security.title", "industries.security.text", "security"),
        new CountryIndustry("hausdienste", "industries.hausdienste.title", "industries.hausdienste.text", "cleaning_services"),
        new CountryIndustry("logistik", "industries.logistik.title", "industries.logistik.text", "local_shipping"),
    };

    private static readonly Dictionary<string, IReadOnlyList<CountryIndustry>> ByCountry =
        new(StringComparer.OrdinalIgnoreCase)
        {
            [SwissCountryPageKey] = Swiss,
        };

    // Returns the industry sub-pages for a country page key ("land-ch"), or null
    // when that country has no industry sub-pages yet.
    public static IReadOnlyList<CountryIndustry>? ForCountry(string countryPageKey)
        => ByCountry.TryGetValue(countryPageKey, out var list) ? list : null;

    public static bool HasIndustries(string countryPageKey) => ByCountry.ContainsKey(countryPageKey);

    // Resolves the country page key that owns the given page ("land-ch-security"
    // and "land-ch" itself both resolve to "land-ch"), or null when the page
    // doesn't belong to any country that has industry sub-pages.
    public static string? OwningCountry(string pageKey)
    {
        foreach (var countryKey in ByCountry.Keys)
        {
            if (pageKey.Equals(countryKey, StringComparison.OrdinalIgnoreCase) ||
                pageKey.StartsWith(countryKey + "-", StringComparison.OrdinalIgnoreCase))
            {
                return countryKey;
            }
        }

        return null;
    }
}
