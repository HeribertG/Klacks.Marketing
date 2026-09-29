namespace Klacks.Marketing.Localization;

/// <summary>
/// Builds links to country-scoped pages that keep the active culture and country
/// ("/it/land-ch/partner"), so in-page links never fall back to the default culture.
/// </summary>
/// <param name="cultureSlug">The culture URL segment of the current route, null for the default culture</param>
/// <param name="country">The country page key of the current route ("land-ch")</param>
/// <param name="slug">The target page slug under the country</param>
public static class CountryPageLinks
{
    public const string InstallationSlug = "installation";
    public const string PartnerSlug = "partner";
    public const string LicenseSlug = "lizenz";
    public const string ImprintSlug = "impressum";
    public const string SmallBusinessSlug = "kleine-betriebe";
    public const string AboutSlug = "ueber-uns";

    public static string Href(string? cultureSlug, string? country, string slug)
    {
        var culture = SupportedCultures.Resolve(cultureSlug);
        var countryKey = string.IsNullOrEmpty(country) ? LanguageCountries.DefaultCountryFor(culture.Code) : country;

        return culture.UrlSlug.Length == 0
            ? $"/{countryKey}/{slug}"
            : $"/{culture.UrlSlug}/{countryKey}/{slug}";
    }
}
