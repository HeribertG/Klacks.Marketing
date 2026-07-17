using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();
builder.Services.AddSingleton<IPageContentProvider, JsonPageContentProvider>();

// klacks-proxy sits on the same Docker network, not on loopback — trust its
// forwarded headers so scheme-dependent middleware sees the original HTTPS request.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseForwardedHeaders();
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
    }

    await next();
});

app.UseRouting();

app.MapRazorPages();
app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

app.MapGet("/sitemap.xml", (IConfiguration configuration) =>
    Results.Text(SitemapGenerator.Build(configuration["Site:BaseUrl"] ?? string.Empty), "application/xml"));

app.Run();

// Framework paths and static assets are served by endpoints, not by component
// routes, so they must bypass the known-page check.
static bool RequiresKnownPage(string path) =>
    !path.StartsWith("/_", StringComparison.Ordinal) && !Path.HasExtension(path);
