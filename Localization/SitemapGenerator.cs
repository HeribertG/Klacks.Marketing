using System.Text;

namespace Klacks.Marketing.Localization;

public static class SitemapGenerator
{
    private static readonly string[] PageKeys = { "", "spitex", "spitaeler", "security", "hausdienste", "logistik" };

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
                sb.AppendLine("  <url>");
                sb.AppendLine($"    <loc>{BuildUrl(trimmedBase, culture, pageKey)}</loc>");

                foreach (var altCulture in SupportedCultures.All)
                {
                    sb.AppendLine($"    <xhtml:link rel=\"alternate\" hreflang=\"{altCulture.Code}\" href=\"{BuildUrl(trimmedBase, altCulture, pageKey)}\" />");
                }

                sb.AppendLine("  </url>");
            }
        }

        sb.AppendLine("</urlset>");
        return sb.ToString();
    }

    private static string BuildUrl(string baseUrl, SupportedCulture culture, string pageKey)
    {
        var path = culture.Code == SupportedCultures.DefaultCode
            ? (pageKey.Length == 0 ? "/" : $"/{pageKey}")
            : (pageKey.Length == 0 ? $"/{culture.UrlSlug}" : $"/{culture.UrlSlug}/{pageKey}");

        return $"{baseUrl}{path}";
    }
}
