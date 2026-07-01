namespace Klacks.Marketing.Localization;

public sealed record SupportedCulture(string Code, string UrlSlug, string NativeName, bool IsCore, bool IsRtl);

public static class SupportedCultures
{
    public const string DefaultCode = "de";

    // UrlSlug "" marks the unprefixed default culture at the site root ("/", "/spitex").
    // All other cultures are reachable under a path prefix ("/en", "/en/spitex").
    // ar/cs/.../zh-TW are Klacksy chatbot plugin languages only — the real app UI
    // ships in de/en/fr/it (IsCore: true); see the screenshotCaption content field.
    public static readonly IReadOnlyList<SupportedCulture> All = new[]
    {
        new SupportedCulture("de", "", "Deutsch", IsCore: true, IsRtl: false),
        new SupportedCulture("en", "en", "English", IsCore: true, IsRtl: false),
        new SupportedCulture("fr", "fr", "Français", IsCore: true, IsRtl: false),
        new SupportedCulture("it", "it", "Italiano", IsCore: true, IsRtl: false),
        new SupportedCulture("ar", "ar", "العربية", IsCore: false, IsRtl: true),
        new SupportedCulture("cs", "cs", "Čeština", IsCore: false, IsRtl: false),
        new SupportedCulture("da", "da", "Dansk", IsCore: false, IsRtl: false),
        new SupportedCulture("el", "el", "Ελληνικά", IsCore: false, IsRtl: false),
        new SupportedCulture("es", "es", "Español", IsCore: false, IsRtl: false),
        new SupportedCulture("fi", "fi", "Suomi", IsCore: false, IsRtl: false),
        new SupportedCulture("he", "he", "עברית", IsCore: false, IsRtl: true),
        new SupportedCulture("id", "id", "Bahasa Indonesia", IsCore: false, IsRtl: false),
        new SupportedCulture("ja", "ja", "日本語", IsCore: false, IsRtl: false),
        new SupportedCulture("ko", "ko", "한국어", IsCore: false, IsRtl: false),
        new SupportedCulture("ms", "ms", "Bahasa Melayu", IsCore: false, IsRtl: false),
        new SupportedCulture("nb", "nb", "Norsk Bokmål", IsCore: false, IsRtl: false),
        new SupportedCulture("nl", "nl", "Nederlands", IsCore: false, IsRtl: false),
        new SupportedCulture("pl", "pl", "Polski", IsCore: false, IsRtl: false),
        new SupportedCulture("pt", "pt", "Português", IsCore: false, IsRtl: false),
        new SupportedCulture("ro", "ro", "Română", IsCore: false, IsRtl: false),
        new SupportedCulture("sv", "sv", "Svenska", IsCore: false, IsRtl: false),
        new SupportedCulture("th", "th", "ไทย", IsCore: false, IsRtl: false),
        new SupportedCulture("vi", "vi", "Tiếng Việt", IsCore: false, IsRtl: false),
        new SupportedCulture("zh-CN", "zh-cn", "简体中文", IsCore: false, IsRtl: false),
        new SupportedCulture("zh-TW", "zh-tw", "繁體中文", IsCore: false, IsRtl: false),
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
