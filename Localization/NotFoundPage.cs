namespace Klacks.Marketing.Localization;

// Routing details of the branded 404 page. The route starts with "_" on purpose:
// Program.cs lets such paths bypass the known-page guard, so re-executing it
// cannot loop back into another 404.
public static class NotFoundPage
{
    public const string Route = "/_notfound";

    // The culture the visitor was aiming at, taken from the first segment of the
    // URL they actually requested. Unknown segments fall back to the default
    // culture — the page is a dead end either way, and German is the safest guess.
    public static SupportedCulture ResolveCulture(string originalPath)
    {
        var firstSegment = originalPath.Trim('/').Split('/').FirstOrDefault() ?? string.Empty;

        return SupportedCultures.Resolve(firstSegment);
    }

    // Every page lives under a country, so the way out points at the culture's
    // country landing page rather than at a country-less root.
    public static string HomeHref(SupportedCulture culture)
    {
        var country = LanguageCountries.DefaultCountryFor(culture.Code);

        return culture.UrlSlug.Length == 0 ? $"/{country}" : $"/{culture.UrlSlug}/{country}";
    }
}
