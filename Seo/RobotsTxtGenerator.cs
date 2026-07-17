using System.Text;

namespace Klacks.Marketing.Seo;

// Builds the robots.txt body. Everything is allowed for everyone; the explicit
// per-crawler Allow blocks (from AiCrawlers) make the welcome for AI crawlers
// unambiguous, since some only read their own named group. The Sitemap line must be
// an absolute URL per the standard, and a trailing comment points machine readers
// at the llms.txt companion file.
public static class RobotsTxtGenerator
{
    private const string WildcardUserAgent = "*";
    private const string AllowRoot = "/";
    private const string SitemapPath = "/sitemap.xml";
    private const string LlmsPath = "/llms.txt";

    public static string Build(string baseUrl)
    {
        var trimmedBase = baseUrl.TrimEnd('/');
        var sb = new StringBuilder();

        AppendAgent(sb, WildcardUserAgent);

        foreach (var crawler in AiCrawlers.UserAgents)
        {
            AppendAgent(sb, crawler);
        }

        sb.AppendLine($"Sitemap: {trimmedBase}{SitemapPath}");
        sb.AppendLine($"# llms.txt: {trimmedBase}{LlmsPath}");

        return sb.ToString();
    }

    private static void AppendAgent(StringBuilder sb, string userAgent)
    {
        sb.AppendLine($"User-agent: {userAgent}");
        sb.AppendLine($"Allow: {AllowRoot}");
        sb.AppendLine();
    }
}
