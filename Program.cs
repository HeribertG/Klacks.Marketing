using Klacks.Marketing.Analytics;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Seo;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();
builder.Services.AddSingleton<IPageContentProvider, JsonPageContentProvider>();
builder.Services.AddSingleton<ILocalizedScreenshotResolver>(services =>
    new LocalizedScreenshotResolver(services.GetRequiredService<IWebHostEnvironment>().WebRootFileProvider));
builder.Services.AddSingleton<ILocalizedVideoCatalog>(services =>
    new LocalizedVideoCatalog(services.GetRequiredService<IWebHostEnvironment>().WebRootFileProvider));
builder.Services.AddVisitCounter(builder.Configuration);
builder.Services.Configure<SiteModeOptions>(builder.Configuration.GetSection(SiteModeOptions.SectionName));

// klacks-proxy sits on the same Docker network, not on loopback — trust its
// forwarded headers so scheme-dependent middleware sees the original HTTPS request.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

_ = app.Services.GetRequiredService<ILocalizedScreenshotResolver>();
_ = app.Services.GetRequiredService<ILocalizedVideoCatalog>();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseForwardedHeaders();

// Logs requests from known AI crawlers. Registered early — before HTTPS redirection
// and routing — so every crawler hit is captured; it is a no-op for requests
// without a matching User-Agent.
app.UseMiddleware<AiCrawlerLoggingMiddleware>();

app.UseHttpsRedirection();

// Renders the branded 404 page while keeping the 404 status code. Registered
// ahead of the known-page guard below so it catches the status that guard sets.
// The re-executed path starts with "_", so RequiresKnownPage lets it through
// instead of looping back into the guard.
app.UseStatusCodePagesWithReExecute(NotFoundPage.Route);

app.UseStaticFiles();

// Legacy country-less product URLs redirect, and unknown page URLs answer 404
// instead of being swallowed by the "/{culture}" route — that route matches any
// single unknown segment and renders the German default page with HTTP 200 (a soft
// 404 duplicating the homepage under arbitrary URLs). Both checks live here, ahead
// of routing: the 404 guard would otherwise short-circuit any redirect endpoint
// before it is reached. Runs after UseStaticFiles so real assets are already
// served, and skips framework paths ("/_blazor") plus anything with a file
// extension ("/sitemap.xml"), which are endpoints rather than component routes.
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "/";

    if (path == "/" && (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)))
    {
        context.Response.Headers.Append(HeaderNames.Vary, HeaderNames.AcceptLanguage);

        if (BrowserLanguageRedirect.ResolveTarget(context.Request.Headers.AcceptLanguage.ToString()) is { } browserTarget)
        {
            context.Response.Redirect(browserTarget + context.Request.QueryString, permanent: false);
            return;
        }
    }

    if (RequiresKnownPage(path))
    {
        if (LegacyProductRoutes.ResolveTarget(path) is { } target)
        {
            context.Response.Redirect(target + context.Request.QueryString, permanent: true);
            return;
        }

        if (!KnownPageRoutes.Contains(path))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        // The expert start route is a real component route, so only this check keeps it dark while
        // SimpleMode:Enabled is off and in every culture without a simple page (the known-page set is derived
        // statically from the @page directives and expands "/{culture}/{country}/experten" over all cultures).
        if (SiteModes.TryGetExpertStartCulture(path, out var expertCulture)
            && !SiteModes.HasSimplePage(expertCulture, context.RequestServices.GetRequiredService<IOptions<SiteModeOptions>>().Value.Enabled))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }
    }

    await next();
});

app.UseRouting();

// Anonymous daily page counter: wraps endpoint execution and counts only GET text/html answers with status 200.
app.UseVisitCounter();

app.MapVisitCounterEndpoints();
app.MapRazorPages();
app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

// Resolved once so the SEO endpoints below don't each index IConfiguration separately.
var baseUrl = app.Configuration["Site:BaseUrl"] ?? string.Empty;

const string XmlContentType = "application/xml";
const string PlainTextContentType = "text/plain; charset=utf-8";
string[] seoEndpointMethods = [HttpMethods.Get, HttpMethods.Head];

app.MapMethods("/sitemap.xml", seoEndpointMethods, (HttpContext context, IPageContentProvider contentProvider, IOptions<SiteModeOptions> siteMode) =>
    SeoText(context, XmlContentType, () => SitemapGenerator.Build(baseUrl, contentProvider.HasContentIn, siteMode.Value.Enabled)));

app.MapMethods(DocsSitemapIndexGenerator.IndexPath, seoEndpointMethods, (HttpContext context) =>
    SeoText(context, XmlContentType, () => DocsSitemapIndexGenerator.Build(baseUrl)));

// robots.txt and the llms.txt companions carry a ".txt" extension, so the
// known-page guard in the pipeline above lets them straight through to routing
// (same mechanism as /sitemap.xml).
app.MapMethods("/robots.txt", seoEndpointMethods, (HttpContext context) =>
    SeoText(context, PlainTextContentType, () => RobotsTxtGenerator.Build(baseUrl)));

app.MapMethods("/llms.txt", seoEndpointMethods, (HttpContext context) =>
    SeoText(context, PlainTextContentType, () => LlmsTxtGenerator.BuildShort(baseUrl)));

app.MapMethods("/llms-full.txt", seoEndpointMethods, (HttpContext context) =>
    SeoText(context, PlainTextContentType, () => LlmsTxtGenerator.BuildFull(baseUrl)));

app.Run();

// HEAD answers with the headers only, so the (large) body is not generated just to
// be discarded; GET behaves exactly as before.
static IResult SeoText(HttpContext context, string contentType, Func<string> build)
{
    if (HttpMethods.IsHead(context.Request.Method))
    {
        context.Response.ContentType = contentType;
        return Results.Empty;
    }

    return Results.Text(build(), contentType);
}

// Framework paths and static assets are served by endpoints, not by component
// routes, so they must bypass the known-page check.
static bool RequiresKnownPage(string path) =>
    !path.StartsWith("/_", StringComparison.Ordinal) && !Path.HasExtension(path);
