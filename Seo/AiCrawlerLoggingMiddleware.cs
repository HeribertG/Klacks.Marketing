namespace Klacks.Marketing.Seo;

// Logs one structured line per request coming from a known AI crawler (see
// AiCrawlers), making the crawler traffic that robots.txt invites visible in the
// logs. A normal request costs at most one substring scan of the User-Agent header
// and only when that header is present — no allocation of state, no I/O, no
// database.
public sealed class AiCrawlerLoggingMiddleware
{
    private const string LogTemplate = "AI crawler {Crawler} requested {RequestPath}";

    private readonly RequestDelegate _next;
    private readonly ILogger<AiCrawlerLoggingMiddleware> _logger;

    public AiCrawlerLoggingMiddleware(RequestDelegate next, ILogger<AiCrawlerLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public Task InvokeAsync(HttpContext context)
    {
        var userAgent = context.Request.Headers.UserAgent.ToString();

        if (userAgent.Length > 0 && AiCrawlers.Match(userAgent) is { } crawler)
        {
            _logger.LogInformation(LogTemplate, crawler, context.Request.Path.Value);
        }

        return _next(context);
    }
}
