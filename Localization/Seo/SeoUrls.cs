namespace Klacks.Marketing.Localization.Seo;

// Absolute-URL and locale helpers for the SEO head. The URL rule matches the one
// the sitemap and canonical links already use, so canonical links, sitemap entries
// and breadcrumb item URLs all resolve to the exact same string for a given page.
public static class SeoUrls
{
    private const string CountryPagePrefix = "land-";

    // Builds the absolute URL for a route path under a culture. The default culture
    // lives at the site root ("/land-ch"); every other culture sits under its slug
    // ("/fr/land-ch"). An empty route path yields the culture home. Delegates to
    // SitemapGenerator.BuildUrl, which implements the exact same rule, so the two
    // never drift apart; BuildUrl expects an already-trimmed base URL.
    public static string Absolute(string baseUrl, SupportedCulture culture, string routePath)
        => Localization.SitemapGenerator.BuildUrl(baseUrl.TrimEnd('/'), culture, routePath);

    // Normalizes a raw request path ("/FR/Land-CH/Spitex/") to the absolute URL the
    // canonical link uses for that page: lower-case, no trailing slash, no query, and
    // the culture prefix only for non-default cultures. Routes are matched
    // case-insensitively and tolerate a trailing slash, so several raw paths serve one
    // page. Country-independent pages (SeoHead.SameForEveryCountry) are not remapped
    // to the culture's default country here, since the path alone does not reveal them.
    public static string FromRequestPath(string baseUrl, string? requestPath)
    {
        var segments = (requestPath ?? string.Empty)
            .ToLowerInvariant()
            .Split('/', StringSplitOptions.RemoveEmptyEntries);

        var culture = SupportedCultures.Resolve(segments.FirstOrDefault());
        var routeSegments = culture.UrlSlug.Length > 0 ? segments.Skip(1) : segments;

        return Absolute(baseUrl, culture, string.Join('/', routeSegments));
    }

    // The Open Graph locale in "language_TERRITORY" form (e.g. "de_CH", "fr_FR").
    // The language comes from the culture, the territory from the country the page
    // is served under.
    public static string OgLocale(SupportedCulture culture, string countryPageKey)
    {
        var language = culture.Code.Split('-')[0];
        return $"{language}_{CountryCode(countryPageKey)}";
    }

    // "land-ch" -> "CH". Any non-country key falls back to its own upper-cased value.
    public static string CountryCode(string countryPageKey)
        => countryPageKey.StartsWith(CountryPagePrefix, StringComparison.OrdinalIgnoreCase)
            ? countryPageKey[CountryPagePrefix.Length..].ToUpperInvariant()
            : countryPageKey.ToUpperInvariant();
}
