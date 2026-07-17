namespace Klacks.Marketing.Localization;

// Every page lives under a country ("/land-ch/spitex", "/land-ch/impressum"). The
// country-less variants ("/spitex", "/en/klacksy", "/impressum") are legacy URLs
// that are still indexed and linked from outside, so they permanently redirect to
// the country page of the culture instead of 404-ing. Built from
// CountryIndustries.ProductSlugs so a new product page cannot be forgotten here.
public static class LegacyProductRoutes
{
    // Legal pages are not products but follow the same country-scoped rule.
    private static readonly string[] LegalSlugs = { "impressum", "datenschutz" };

    private static readonly Dictionary<string, string> Redirects = Build();

    // Every page lives under a country, so the country-less homepages ("/", "/en")
    // redirect to the culture's country landing page as well.
    private static void AddHomepages(Dictionary<string, string> map)
    {
        foreach (var culture in SupportedCultures.All)
        {
            var country = LanguageCountries.DefaultCountryFor(culture.Code);

            var source = culture.UrlSlug.Length == 0 ? "/" : $"/{culture.UrlSlug}";
            var target = culture.UrlSlug.Length == 0 ? $"/{country}" : $"/{culture.UrlSlug}/{country}";

            map[source] = target;
        }
    }

    // The permanent target for a legacy country-less product URL, or null when the
    // path is not one.
    public static string? ResolveTarget(string path)
        => Redirects.TryGetValue(Normalize(path), out var target) ? target : null;

    private static Dictionary<string, string> Build()
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var slug in CountryIndustries.ProductSlugs.Concat(LegalSlugs))
        {
            foreach (var culture in SupportedCultures.All)
            {
                var country = LanguageCountries.DefaultCountryFor(culture.Code);

                var source = culture.UrlSlug.Length == 0 ? $"/{slug}" : $"/{culture.UrlSlug}/{slug}";
                var target = culture.UrlSlug.Length == 0
                    ? $"/{country}/{slug}"
                    : $"/{culture.UrlSlug}/{country}/{slug}";

                map[source] = target;
            }
        }

        AddHomepages(map);

        return map;
    }

    private static string Normalize(string path)
    {
        var trimmed = path.TrimEnd('/');

        return trimmed.Length == 0 ? "/" : trimmed;
    }
}
