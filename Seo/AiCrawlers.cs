namespace Klacks.Marketing.Seo;

// Single source of the AI-crawler User-Agent product tokens the site cares about,
// shared by RobotsTxtGenerator (one explicit Allow block per token) and
// AiCrawlerLoggingMiddleware (substring match against the User-Agent header).
// Keeping the list in one place stops the two consumers from drifting apart.
public static class AiCrawlers
{
    public static readonly IReadOnlyList<string> UserAgents = new[]
    {
        "GPTBot",
        "OAI-SearchBot",
        "ChatGPT-User",
        "ClaudeBot",
        "Claude-User",
        "Claude-SearchBot",
        "PerplexityBot",
        "Perplexity-User",
        "Google-Extended",
        "CCBot",
        "meta-externalagent",
        "Amazonbot",
        "Bytespider",
    };

    // Returns the first known crawler token contained in the User-Agent header, or
    // null when the request is not from a recognised AI crawler.
    public static string? Match(string userAgent)
    {
        foreach (var token in UserAgents)
        {
            if (userAgent.Contains(token, StringComparison.OrdinalIgnoreCase))
            {
                return token;
            }
        }

        return null;
    }
}
