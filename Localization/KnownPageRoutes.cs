using System.Reflection;
using Microsoft.AspNetCore.Components;

namespace Klacks.Marketing.Localization;

// The set of page paths the Blazor router can actually serve, derived once at
// startup from the components' @page directives and expanded over the culture
// prefixes. Deriving it from the routes themselves (instead of a hand-kept list)
// is deliberate: the "/{culture}" route matches any single unknown segment and
// SupportedCultures.Resolve maps every unrecognized slug onto the German default,
// so an unknown URL would silently render the German page with HTTP 200 instead
// of a 404. A hand-kept list is what let that drift in unnoticed in the first
// place — SitemapGenerator.PageKeys still misses /impressum and /datenschutz.
public static class KnownPageRoutes
{
    private const string CultureParameter = "{culture}";
    private const string CountryParameter = "{country}";
    private const string RootPath = "/";

    private static readonly HashSet<string> Paths = Build();

    // True when the Blazor router has a component route for this exact path.
    public static bool Contains(string path) => Paths.Contains(Normalize(path));

    private static HashSet<string> Build()
    {
        var templates = typeof(KnownPageRoutes).Assembly.GetTypes()
            .Where(type => typeof(IComponent).IsAssignableFrom(type))
            .SelectMany(type => type.GetCustomAttributes<RouteAttribute>())
            .Select(attribute => attribute.Template);

        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var template in templates)
        {
            foreach (var expanded in Expand(template))
            {
                paths.Add(Normalize(expanded));
            }
        }

        return paths;
    }

    // Turns a route template into every concrete path it can legally serve, by
    // substituting the known cultures and countries for their parameters. Any
    // other value for those segments is not a real page and must 404.
    private static IEnumerable<string> Expand(string template)
    {
        IEnumerable<string> expanded = new[] { template };

        if (template.Contains(CountryParameter, StringComparison.Ordinal))
        {
            expanded = expanded.SelectMany(_ => CountryIndustries.AllCountries
                .Select(country => template.Replace(CountryParameter, country, StringComparison.Ordinal)));
        }

        if (expanded.First().Contains(CultureParameter, StringComparison.Ordinal))
        {
            // "de" is the unprefixed default culture served at "/", so it must not
            // resolve a second time under a "/de" prefix.
            expanded = expanded.SelectMany(path => SupportedCultures.All
                .Where(culture => culture.UrlSlug.Length > 0)
                .Select(culture => path.Replace(CultureParameter, culture.UrlSlug, StringComparison.Ordinal)));
        }

        return expanded;
    }

    private static string Normalize(string path)
    {
        var trimmed = path.TrimEnd('/');

        return trimmed.Length == 0 ? RootPath : trimmed;
    }
}
