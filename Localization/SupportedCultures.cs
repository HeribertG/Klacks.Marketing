namespace Klacks.Marketing.Localization;

public sealed record SupportedCulture(string Code, string UrlSlug, string NativeName, bool IsCore, bool IsRtl);

public static class SupportedCultures
{
    public const string DefaultCode = "de";

    // UrlSlug "" marks the unprefixed default culture at the site root ("/", "/spitex").
    // All other cultures are reachable under a path prefix ("/en", "/en/spitex").
    public static readonly IReadOnlyList<SupportedCulture> All = new[]
    {
        new SupportedCulture("de", "", "Deutsch", IsCore: true, IsRtl: false),
        new SupportedCulture("en", "en", "English", IsCore: true, IsRtl: false),
        new SupportedCulture("fr", "fr", "Français", IsCore: true, IsRtl: false),
        new SupportedCulture("it", "it", "Italiano", IsCore: true, IsRtl: false),
    };

    public static SupportedCulture Default { get; } = All.First(c => c.Code == DefaultCode);

    public static SupportedCulture Resolve(string? urlSlug)
    {
        if (string.IsNullOrEmpty(urlSlug))
        {
            return Default;
        }

        return All.FirstOrDefault(c => c.UrlSlug.Length > 0 && c.UrlSlug.Equals(urlSlug, StringComparison.OrdinalIgnoreCase))
            ?? Default;
    }
}
