using Klacks.Marketing.Localization;
using Klacks.Marketing.Services.Contact;
using Microsoft.AspNetCore.Components.Server.Circuits;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();
builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<InMemoryContactRateLimiter>();
builder.Services.AddScoped<ContactCircuitIpProvider>();
builder.Services.AddScoped<CircuitHandler, ContactIpCircuitHandler>();
builder.Services.AddScoped<IContactMailService, SmtpContactMailService>();
builder.Services.AddSingleton<IPageContentProvider, JsonPageContentProvider>();

// klacks-proxy sits on the same Docker network, not on loopback — trust its
// forwarded headers so the contact-form rate limiter sees the real client IP.
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
app.UseStaticFiles();
app.UseRouting();

app.MapRazorPages();
app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

app.MapGet("/sitemap.xml", (IConfiguration configuration) =>
    Results.Text(SitemapGenerator.Build(configuration["Site:BaseUrl"] ?? string.Empty), "application/xml"));

// "de" is the unprefixed default culture (served at "/"), so "/de/..." must not
// resolve as a second, duplicate URL for the same content — SupportedCultures.Resolve
// would otherwise silently fall back to German for any unrecognized prefix.
app.MapGet("/de", () => Results.NotFound());
app.MapGet("/de/{**path}", () => Results.NotFound());

app.Run();
