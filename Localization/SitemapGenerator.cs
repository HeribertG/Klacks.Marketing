using System.Text;

namespace Klacks.Marketing.Localization;

public static class SitemapGenerator
{
    private static readonly string[] PageKeys =
    {
        // Every page exists only under a country; the country-less variants
        // (including the homepages) are legacy redirects (LegacyProductRoutes) and
        // are not listed here. The country-scoped legal pages are appended by
        // AllPageKeys.
        "land-de", "land-at", "land-fr", "land-it", "land-ch",
        "land-ch/spitex", "land-ch/spitaeler", "land-ch/security", "land-ch/hausdienste", "land-ch/logistik", "land-ch/hotellerie-gastronomie",
        "land-de/spitex", "land-de/spitaeler", "land-de/security", "land-de/hausdienste", "land-de/logistik", "land-de/hotellerie-gastronomie",
        "land-at/spitex", "land-at/spitaeler", "land-at/security", "land-at/hausdienste", "land-at/logistik", "land-at/hotellerie-gastronomie",
        "land-fr/spitex", "land-fr/spitaeler", "land-fr/security", "land-fr/hausdienste", "land-fr/logistik", "land-fr/hotellerie-gastronomie",
        "land-it/spitex", "land-it/spitaeler", "land-it/security", "land-it/hausdienste", "land-it/logistik", "land-it/hotellerie-gastronomie",
        "land-sa", "land-ae", "land-il",
        "land-be", "land-gb", "land-ie", "land-no", "land-pl", "land-pt", "land-ro", "land-cz", "land-dk", "land-es", "land-fi", "land-gr", "land-nl", "land-se",
        "land-be/spitex", "land-be/spitaeler", "land-be/security", "land-be/hausdienste", "land-be/logistik", "land-be/hotellerie-gastronomie",
        "land-gb/spitex", "land-gb/spitaeler", "land-gb/security", "land-gb/hausdienste", "land-gb/logistik", "land-gb/hotellerie-gastronomie",
        "land-ie/spitex", "land-ie/spitaeler", "land-ie/security", "land-ie/hausdienste", "land-ie/logistik", "land-ie/hotellerie-gastronomie",
        "land-no/spitex", "land-no/spitaeler", "land-no/security", "land-no/hausdienste", "land-no/logistik", "land-no/hotellerie-gastronomie",
        "land-pl/spitex", "land-pl/spitaeler", "land-pl/security", "land-pl/hausdienste", "land-pl/logistik", "land-pl/hotellerie-gastronomie",
        "land-pt/spitex", "land-pt/spitaeler", "land-pt/security", "land-pt/hausdienste", "land-pt/logistik", "land-pt/hotellerie-gastronomie",
        "land-ro/spitex", "land-ro/spitaeler", "land-ro/security", "land-ro/hausdienste", "land-ro/logistik", "land-ro/hotellerie-gastronomie",
        "land-cz/spitex", "land-cz/spitaeler", "land-cz/security", "land-cz/hausdienste", "land-cz/logistik", "land-cz/hotellerie-gastronomie",
        "land-dk/spitex", "land-dk/spitaeler", "land-dk/security", "land-dk/hausdienste", "land-dk/logistik", "land-dk/hotellerie-gastronomie",
        "land-es/spitex", "land-es/spitaeler", "land-es/security", "land-es/hausdienste", "land-es/logistik", "land-es/hotellerie-gastronomie",
        "land-fi/spitex", "land-fi/spitaeler", "land-fi/security", "land-fi/hausdienste", "land-fi/logistik", "land-fi/hotellerie-gastronomie",
        "land-gr/spitex", "land-gr/spitaeler", "land-gr/security", "land-gr/hausdienste", "land-gr/logistik", "land-gr/hotellerie-gastronomie",
        "land-nl/spitex", "land-nl/spitaeler", "land-nl/security", "land-nl/hausdienste", "land-nl/logistik", "land-nl/hotellerie-gastronomie",
        "land-se/spitex", "land-se/spitaeler", "land-se/security", "land-se/hausdienste", "land-se/logistik", "land-se/hotellerie-gastronomie",
        "land-jp", "land-kr", "land-cn", "land-tw", "land-my", "land-id", "land-th", "land-vn",
        "land-ae/spitex", "land-ae/spitaeler", "land-ae/security", "land-ae/hausdienste", "land-ae/logistik", "land-ae/hotellerie-gastronomie",
        "land-sa/spitex", "land-sa/spitaeler", "land-sa/security", "land-sa/hausdienste", "land-sa/logistik", "land-sa/hotellerie-gastronomie",
        "land-il/spitex", "land-il/spitaeler", "land-il/security", "land-il/hausdienste", "land-il/logistik", "land-il/hotellerie-gastronomie",
        "land-jp/spitex", "land-jp/spitaeler", "land-jp/security", "land-jp/hausdienste", "land-jp/logistik", "land-jp/hotellerie-gastronomie",
        "land-kr/spitex", "land-kr/spitaeler", "land-kr/security", "land-kr/hausdienste", "land-kr/logistik", "land-kr/hotellerie-gastronomie",
        "land-cn/spitex", "land-cn/spitaeler", "land-cn/security", "land-cn/hausdienste", "land-cn/logistik", "land-cn/hotellerie-gastronomie",
        "land-tw/spitex", "land-tw/spitaeler", "land-tw/security", "land-tw/hausdienste", "land-tw/logistik", "land-tw/hotellerie-gastronomie",
        "land-my/spitex", "land-my/spitaeler", "land-my/security", "land-my/hausdienste", "land-my/logistik", "land-my/hotellerie-gastronomie",
        "land-id/spitex", "land-id/spitaeler", "land-id/security", "land-id/hausdienste", "land-id/logistik", "land-id/hotellerie-gastronomie",
        "land-th/spitex", "land-th/spitaeler", "land-th/security", "land-th/hausdienste", "land-th/logistik", "land-th/hotellerie-gastronomie",
        "land-vn/spitex", "land-vn/spitaeler", "land-vn/security", "land-vn/hausdienste", "land-vn/logistik", "land-vn/hotellerie-gastronomie",
        "land-ae/klacksy", "land-at/klacksy", "land-be/klacksy", "land-ch/klacksy", "land-cn/klacksy",
        "land-cz/klacksy", "land-de/klacksy", "land-dk/klacksy", "land-es/klacksy", "land-fi/klacksy",
        "land-fr/klacksy", "land-gb/klacksy", "land-gr/klacksy", "land-id/klacksy", "land-ie/klacksy",
        "land-il/klacksy", "land-it/klacksy", "land-jp/klacksy", "land-kr/klacksy", "land-my/klacksy",
        "land-nl/klacksy", "land-no/klacksy", "land-pl/klacksy", "land-pt/klacksy", "land-ro/klacksy",
        "land-sa/klacksy", "land-se/klacksy", "land-th/klacksy", "land-tw/klacksy", "land-vn/klacksy",
        "land-ae/eigene-regeln", "land-at/eigene-regeln", "land-be/eigene-regeln", "land-ch/eigene-regeln", "land-cn/eigene-regeln",
        "land-cz/eigene-regeln", "land-de/eigene-regeln", "land-dk/eigene-regeln", "land-es/eigene-regeln", "land-fi/eigene-regeln",
        "land-fr/eigene-regeln", "land-gb/eigene-regeln", "land-gr/eigene-regeln", "land-id/eigene-regeln", "land-ie/eigene-regeln",
        "land-il/eigene-regeln", "land-it/eigene-regeln", "land-jp/eigene-regeln", "land-kr/eigene-regeln", "land-my/eigene-regeln",
        "land-nl/eigene-regeln", "land-no/eigene-regeln", "land-pl/eigene-regeln", "land-pt/eigene-regeln", "land-ro/eigene-regeln",
        "land-sa/eigene-regeln", "land-se/eigene-regeln", "land-th/eigene-regeln", "land-tw/eigene-regeln", "land-vn/eigene-regeln",
    };

    // The legal pages are country-scoped like everything else, but their content is
    // company-wide — so they are generated per country rather than hand-listed.
    private static readonly string[] LegalSlugs = { "impressum", "datenschutz" };

    private const string InstallationSlug = "installation";

    public static string Build(string baseUrl)
    {
        var trimmedBase = baseUrl.TrimEnd('/');
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">");

        foreach (var pageKey in PageKeys)
        {
            foreach (var culture in SupportedCultures.All)
            {
                AppendUrl(sb, trimmedBase, culture, _ => pageKey);
            }
        }

        foreach (var countryPageKey in CountryIndustries.AllCountries)
        {
            foreach (var culture in SupportedCultures.All)
            {
                AppendUrl(sb, trimmedBase, culture, _ => $"{countryPageKey}/{InstallationSlug}");
            }
        }

        // The legal pages are reachable under every country, but their content is
        // identical everywhere and their canonical URL is the culture's default
        // country (SeoHead.SameForEveryCountry). Listing only that one keeps the
        // sitemap free of ~1500 duplicates of the same two documents.
        foreach (var slug in LegalSlugs)
        {
            foreach (var culture in SupportedCultures.All)
            {
                AppendUrl(sb, trimmedBase, culture, target => $"{LanguageCountries.DefaultCountryFor(target.Code)}/{slug}");
            }
        }

        sb.AppendLine("</urlset>");
        return sb.ToString();
    }

    // pageKeyFor resolves the page key per culture, since a page can live under a
    // different country depending on the language.
    private static void AppendUrl(StringBuilder sb, string baseUrl, SupportedCulture culture, Func<SupportedCulture, string> pageKeyFor)
    {
        sb.AppendLine("  <url>");
        sb.AppendLine($"    <loc>{BuildUrl(baseUrl, culture, pageKeyFor(culture))}</loc>");

        foreach (var altCulture in SupportedCultures.All)
        {
            sb.AppendLine($"    <xhtml:link rel=\"alternate\" hreflang=\"{altCulture.Code}\" href=\"{BuildUrl(baseUrl, altCulture, pageKeyFor(altCulture))}\" />");
        }

        sb.AppendLine("  </url>");
    }

    // Public so SEO generators (llms.txt) can build the exact same absolute URLs
    // from the same page keys instead of hand-assembling routes that might drift.
    public static string BuildUrl(string baseUrl, SupportedCulture culture, string pageKey)
    {
        var path = culture.Code == SupportedCultures.DefaultCode
            ? (pageKey.Length == 0 ? "/" : $"/{pageKey}")
            : (pageKey.Length == 0 ? $"/{culture.UrlSlug}" : $"/{culture.UrlSlug}/{pageKey}");

        return $"{baseUrl}{path}";
    }
}
