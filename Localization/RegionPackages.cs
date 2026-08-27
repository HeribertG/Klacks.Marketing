namespace Klacks.Marketing.Localization;

// Registry of the country region packages published on the Klacks Marketplace
// and of the download API contract (see Klacks.Marketplace
// Api/RegionPackagesApiController.cs). The marketplace patches the chosen
// industry into the profile as "activeIndustries"; its industry slugs differ
// from the marketing site's industry page slugs, so both the availability set
// and the slug mapping live here in one place.
public static class RegionPackages
{
    public const string ProfileJsonArtifact = "profileJson";
    public const string OnPremZipArtifact = "onpremZip";
    public const string ComposeZipArtifact = "composeZip";
    public const string AllIndustries = "all";

    private const string DownloadPathFormat = "/api/regions/{0}/download?industry={1}&artifact={2}";
    private const string CountryPageKeyPrefix = "land-";

    // The 30 country codes with a published region package on the marketplace.
    // Not identical to the site's country pages: the site serves Belgium and
    // Ireland, which have no package (yet), while the marketplace additionally
    // carries Liechtenstein and the US, which have no marketing page.
    private static readonly HashSet<string> AvailableCountryCodes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ae", "at", "ch", "cn", "cz", "de", "dk", "es", "fi", "fr",
        "gb", "gr", "id", "il", "it", "jp", "kr", "li", "my", "nl",
        "no", "pl", "pt", "ro", "sa", "se", "th", "tw", "us", "vn",
    };

    // Marketing industry page slug -> marketplace industry slug ("activeIndustries" key).
    private static readonly Dictionary<string, string> IndustryByMarketingSlug = new(StringComparer.OrdinalIgnoreCase)
    {
        ["spitex"] = "homecare",
        ["spitaeler"] = "healthcare",
        ["security"] = "security",
        ["hausdienste"] = "facility",
        ["logistik"] = "logistics",
        ["hotellerie-gastronomie"] = "hospitality",
    };

    // "land-ch" -> "ch"; null when the key is not a country page key.
    public static string? CountryCode(string countryPageKey)
        => countryPageKey.StartsWith(CountryPageKeyPrefix, StringComparison.OrdinalIgnoreCase)
            ? countryPageKey[CountryPageKeyPrefix.Length..].ToLowerInvariant()
            : null;

    public static bool HasPackage(string countryCode) => AvailableCountryCodes.Contains(countryCode);

    public static bool HasIndustryMapping(string marketingSlug) => IndustryByMarketingSlug.ContainsKey(marketingSlug);

    // The marketplace industry slug for a marketing industry page slug, or "all"
    // when the slug has no marketplace counterpart (e.g. the Klacksy pseudo-industry).
    public static string IndustryFor(string marketingSlug)
        => IndustryByMarketingSlug.TryGetValue(marketingSlug, out var industry) ? industry : AllIndustries;

    public static string DownloadUrl(string marketplaceBaseUrl, string countryCode, string industry, string artifact)
        => marketplaceBaseUrl.TrimEnd('/') + string.Format(DownloadPathFormat, countryCode, industry, artifact);
}
