namespace Klacks.Marketing.Localization;

// Registry of the country region packages published in the Klacks Store (Klacks.Marketplace) and the store
// page an install page links to. Klacks is downloaded only in the store: the installation pages explain the
// install paths but link to the country's region page (with its own industry choice) instead of downloading.
public static class RegionPackages
{
    private const string RegionPagePathFormat = "/region/{0}?culture={1}";
    // Trailing slash is required: nginx 301-redirects the bare "/store" path without
    // preserving the query string, which would silently drop ?culture=.
    private const string StoreHomePathFormat = "/?culture={0}";
    private const string CountryPageKeyPrefix = "land-";

    // The 32 country codes with a published region package on the marketplace.
    // Not identical to the site's country pages: the marketplace additionally
    // carries Liechtenstein and the US, which have no marketing page.
    private static readonly HashSet<string> AvailableCountryCodes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ae", "at", "be", "ch", "cn", "cz", "de", "dk", "es", "fi", "fr",
        "gb", "gr", "id", "ie", "il", "it", "jp", "kr", "li", "my", "nl",
        "no", "pl", "pt", "ro", "sa", "se", "th", "tw", "us", "vn",
    };

    // "land-ch" -> "ch"; null when the key is not a country page key.
    public static string? CountryCode(string countryPageKey)
        => countryPageKey.StartsWith(CountryPageKeyPrefix, StringComparison.OrdinalIgnoreCase)
            ? countryPageKey[CountryPageKeyPrefix.Length..].ToLowerInvariant()
            : null;

    public static bool HasPackage(string countryCode) => AvailableCountryCodes.Contains(countryCode);

    // The store's region page for a country with a published package, otherwise the store home.
    public static string StoreUrl(string marketplaceBaseUrl, string? countryCode, string culture)
    {
        var baseUrl = marketplaceBaseUrl.TrimEnd('/');
        return countryCode is not null && HasPackage(countryCode)
            ? baseUrl + string.Format(RegionPagePathFormat, countryCode, culture)
            : baseUrl + string.Format(StoreHomePathFormat, culture);
    }
}
