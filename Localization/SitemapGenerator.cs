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
        "land-ch/spitex", "land-ch/spitaeler", "land-ch/security", "land-ch/hausdienste", "land-ch/logistik",
        "land-de/spitex", "land-de/spitaeler", "land-de/security", "land-de/hausdienste", "land-de/logistik",
        "land-at/spitex", "land-at/spitaeler", "land-at/security", "land-at/hausdienste", "land-at/logistik",
        "land-fr/spitex", "land-fr/spitaeler", "land-fr/security", "land-fr/hausdienste", "land-fr/logistik",
        "land-it/spitex", "land-it/spitaeler", "land-it/security", "land-it/hausdienste", "land-it/logistik",
        "land-sa", "land-ae", "land-il",
        "land-be", "land-gb", "land-ie", "land-no", "land-pl", "land-pt", "land-ro", "land-cz", "land-dk", "land-es", "land-fi", "land-gr", "land-nl", "land-se",
        "land-be/spitex", "land-be/spitaeler", "land-be/security", "land-be/hausdienste", "land-be/logistik",
        "land-gb/spitex", "land-gb/spitaeler", "land-gb/security", "land-gb/hausdienste", "land-gb/logistik",
        "land-ie/spitex", "land-ie/spitaeler", "land-ie/security", "land-ie/hausdienste", "land-ie/logistik",
        "land-no/spitex", "land-no/spitaeler", "land-no/security", "land-no/hausdienste", "land-no/logistik",
        "land-pl/spitex", "land-pl/spitaeler", "land-pl/security", "land-pl/hausdienste", "land-pl/logistik",
        "land-pt/spitex", "land-pt/spitaeler", "land-pt/security", "land-pt/hausdienste", "land-pt/logistik",
        "land-ro/spitex", "land-ro/spitaeler", "land-ro/security", "land-ro/hausdienste", "land-ro/logistik",
        "land-cz/spitex", "land-cz/spitaeler", "land-cz/security", "land-cz/hausdienste", "land-cz/logistik",
        "land-dk/spitex", "land-dk/spitaeler", "land-dk/security", "land-dk/hausdienste", "land-dk/logistik",
        "land-es/spitex", "land-es/spitaeler", "land-es/security", "land-es/hausdienste", "land-es/logistik",
        "land-fi/spitex", "land-fi/spitaeler", "land-fi/security", "land-fi/hausdienste", "land-fi/logistik",
        "land-gr/spitex", "land-gr/spitaeler", "land-gr/security", "land-gr/hausdienste", "land-gr/logistik",
        "land-nl/spitex", "land-nl/spitaeler", "land-nl/security", "land-nl/hausdienste", "land-nl/logistik",
        "land-se/spitex", "land-se/spitaeler", "land-se/security", "land-se/hausdienste", "land-se/logistik",
        "land-jp", "land-kr", "land-cn", "land-tw", "land-my", "land-id", "land-th", "land-vn",
        "land-ae/spitex", "land-ae/spitaeler", "land-ae/security", "land-ae/hausdienste", "land-ae/logistik",
        "land-sa/spitex", "land-sa/spitaeler", "land-sa/security", "land-sa/hausdienste", "land-sa/logistik",
        "land-il/spitex", "land-il/spitaeler", "land-il/security", "land-il/hausdienste", "land-il/logistik",
        "land-jp/spitex", "land-jp/spitaeler", "land-jp/security", "land-jp/hausdienste", "land-jp/logistik",
        "land-kr/spitex", "land-kr/spitaeler", "land-kr/security", "land-kr/hausdienste", "land-kr/logistik",
        "land-cn/spitex", "land-cn/spitaeler", "land-cn/security", "land-cn/hausdienste", "land-cn/logistik",
        "land-tw/spitex", "land-tw/spitaeler", "land-tw/security", "land-tw/hausdienste", "land-tw/logistik",
        "land-my/spitex", "land-my/spitaeler", "land-my/security", "land-my/hausdienste", "land-my/logistik",
        "land-id/spitex", "land-id/spitaeler", "land-id/security", "land-id/hausdienste", "land-id/logistik",
        "land-th/spitex", "land-th/spitaeler", "land-th/security", "land-th/hausdienste", "land-th/logistik",
        "land-vn/spitex", "land-vn/spitaeler", "land-vn/security", "land-vn/hausdienste", "land-vn/logistik",
        "land-ae/klacksy", "land-at/klacksy", "land-be/klacksy", "land-ch/klacksy", "land-cn/klacksy",
        "land-cz/klacksy", "land-de/klacksy", "land-dk/klacksy", "land-es/klacksy", "land-fi/klacksy",
        "land-fr/klacksy", "land-gb/klacksy", "land-gr/klacksy", "land-id/klacksy", "land-ie/klacksy",
        "land-il/klacksy", "land-it/klacksy", "land-jp/klacksy", "land-kr/klacksy", "land-my/klacksy",
        "land-nl/klacksy", "land-no/klacksy", "land-pl/klacksy", "land-pt/klacksy", "land-ro/klacksy",
        "land-sa/klacksy", "land-se/klacksy", "land-th/klacksy", "land-tw/klacksy", "land-vn/klacksy",
    };

    // The legal pages are country-scoped like everything else, but their content is
    // company-wide — so they are generated per country rather than hand-listed.
    private static readonly string[] LegalSlugs = { "impressum", "datenschutz" };

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
