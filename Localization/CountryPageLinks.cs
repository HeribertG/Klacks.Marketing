namespace Klacks.Marketing.Localization;

/// <summary>
/// Builds links to country-scoped pages that keep the active culture and country
/// ("/it/land-ch/partner"), so in-page links never fall back to the default culture.
/// </summary>
/// <param name="cultureSlug">The culture URL segment of the current route, null for the default culture</param>
/// <param name="country">The country page key of the current route ("land-ch")</param>
/// <param name="slug">The target page slug under the country</param>
/// <param name="simpleModeEnabled">Value of SimpleMode:Enabled; StartHref then targets the expert start page instead of the simple country root</param>
public static class CountryPageLinks
{
    // Slug of the former installation pages, which now redirect to the Klacks Store (InstallationRedirect).
    public const string InstallationSlug = "installation";
    public const string PartnerSlug = "partner";
    public const string LicenseSlug = "lizenz";
    public const string ImprintSlug = "impressum";
    public const string SmallBusinessSlug = "kleine-betriebe";
    public const string MidSizeBusinessSlug = "mittlere-betriebe";
    public const string LargeBusinessSlug = "grosse-betriebe";
    public const string AboutSlug = "ueber-uns";
    public const string OfferSlug = "angebot";
    public const string TechSlug = "technik";
    public const string ExportsSlug = "exporte";

    public static string StartHref(string? cultureSlug, string? country, bool simpleModeEnabled)
    {
        var culture = SupportedCultures.Resolve(cultureSlug);
        var countryKey = string.IsNullOrEmpty(country) ? LanguageCountries.DefaultCountryFor(culture.Code) : country;
        var path = SiteModes.HasSimplePage(culture.Code, simpleModeEnabled) ? SiteModes.ExpertRoutePath(countryKey) : countryKey;

        return culture.UrlSlug.Length == 0 ? $"/{path}" : $"/{culture.UrlSlug}/{path}";
    }

    // The Klacks Store page of the country (store home for a country without a package) in the active culture: Klacks
    // is installed only via the store. Accepts the culture's URL slug or code ("zh-cn", "zh-CN"; null for the default).
    public static string StoreHref(string? cultureSlug, string? country)
    {
        var culture = SupportedCultures.Resolve(cultureSlug);
        var countryKey = string.IsNullOrEmpty(country) ? LanguageCountries.DefaultCountryFor(culture.Code) : country;

        return RegionPackages.StoreUrl(ExternalLinks.MarketplaceUrl, RegionPackages.CountryCode(countryKey), culture.Code);
    }

    public static string Href(string? cultureSlug, string? country, string slug)
    {
        var culture = SupportedCultures.Resolve(cultureSlug);
        var countryKey = string.IsNullOrEmpty(country) ? LanguageCountries.DefaultCountryFor(culture.Code) : country;

        return culture.UrlSlug.Length == 0
            ? $"/{countryKey}/{slug}"
            : $"/{culture.UrlSlug}/{countryKey}/{slug}";
    }
}
