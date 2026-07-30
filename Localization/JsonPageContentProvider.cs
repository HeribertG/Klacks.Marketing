using System.Collections.Concurrent;
using System.Text.Json;

namespace Klacks.Marketing.Localization;

public sealed class JsonPageContentProvider : IPageContentProvider
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly string _contentRoot;
    private readonly ConcurrentDictionary<string, IndustryPageContent?> _industryCache = new();
    private readonly ConcurrentDictionary<string, InstallPageContent?> _installCache = new();
    private readonly ConcurrentDictionary<string, IReadOnlyDictionary<string, string>?> _flatCache = new();
    private readonly ConcurrentDictionary<string, IndustryRedesignContent?> _redesignCache = new();

    public JsonPageContentProvider(IWebHostEnvironment environment)
    {
        _contentRoot = Path.Combine(environment.ContentRootPath, "Localization", "Content");
    }

    // Resolution order deliberately puts the visitor's language before the country
    // specialization: a country page without its own translation ("land-gb-klacksy"
    // in English) reads better from the country-less master in the right language
    // ("klacksy" in English) than from the country copy in German.
    public IndustryPageContent GetIndustryPage(string cultureCode, string pageKey)
    {
        var masterKey = CountryLessKey(pageKey);

        return LoadIndustryPage(cultureCode, pageKey)
            ?? (masterKey is null ? null : LoadIndustryPage(cultureCode, masterKey))
            ?? LoadIndustryPage(SupportedCultures.DefaultCode, pageKey)
            ?? (masterKey is null ? null : LoadIndustryPage(SupportedCultures.DefaultCode, masterKey))
            ?? throw new InvalidOperationException($"No content found for industry page '{pageKey}'.");
    }

    public InstallPageContent GetInstallPage(string cultureCode, string pageKey)
    {
        var masterKey = CountryLessKey(pageKey);

        return LoadInstallPage(cultureCode, pageKey)
            ?? (masterKey is null ? null : LoadInstallPage(cultureCode, masterKey))
            ?? LoadInstallPage(SupportedCultures.DefaultCode, pageKey)
            ?? (masterKey is null ? null : LoadInstallPage(SupportedCultures.DefaultCode, masterKey))
            ?? throw new InvalidOperationException($"No content found for install page '{pageKey}'.");
    }

    // "land-gb-klacksy" -> "klacksy"; null when the key is not country-scoped.
    private static string? CountryLessKey(string pageKey)
    {
        var country = CountryIndustries.OwningCountry(pageKey);

        return country is not null && pageKey.Length > country.Length + 1
            ? pageKey[(country.Length + 1)..]
            : null;
    }

    // Falls back to the default culture per key, not just per file: a culture whose
    // file exists but lacks a key would otherwise render the raw key name.
    public string GetText(string cultureCode, string contentKey, string textKey)
    {
        if (LoadFlatContent(cultureCode, contentKey) is { } dictionary && dictionary.TryGetValue(textKey, out var value))
        {
            return value;
        }

        if (LoadFlatContent(SupportedCultures.DefaultCode, contentKey) is { } fallback && fallback.TryGetValue(textKey, out var fallbackValue))
        {
            return fallbackValue;
        }

        return textKey;
    }

    private IndustryPageContent? LoadIndustryPage(string cultureCode, string pageKey)
    {
        return _industryCache.GetOrAdd($"{cultureCode}/{pageKey}", _ =>
        {
            var path = Path.Combine(_contentRoot, cultureCode, $"{pageKey}.json");
            if (!File.Exists(path))
            {
                return null;
            }

            using var stream = File.OpenRead(path);
            var content = JsonSerializer.Deserialize<IndustryPageContent>(stream, SerializerOptions);
            if (content is not null)
            {
                ApplyRedesign(cultureCode, content);
            }

            return content;
        });
    }

    // Füllt die optionalen Redesign-Sektionen (HeroMockup/Ticker/Steps/Stats) aus
    // der kulturspezifischen redesign.json nach, wenn die Seite sie nicht selbst
    // definiert. Läuft hier (nicht in GetIndustryPage), damit die nachgefüllte
    // Kultur immer zur Kultur der tatsächlich geladenen Datei passt — sonst käme
    // z. B. arabische Redesign-Sprache auf den deutschen Fallback-Inhalt.
    private void ApplyRedesign(string cultureCode, IndustryPageContent content)
    {
        if (content.HeroMockup is not null && content.Ticker is not null
            && content.Steps is not null && content.Stats is not null)
        {
            return;
        }

        var redesign = LoadRedesign(cultureCode) ?? LoadRedesign(SupportedCultures.DefaultCode);
        if (redesign is null)
        {
            return;
        }

        content.HeroMockup ??= redesign.HeroMockup;
        content.Ticker ??= redesign.Ticker;
        content.Steps ??= redesign.Steps;
        content.Stats ??= redesign.Stats;
    }

    private IndustryRedesignContent? LoadRedesign(string cultureCode)
    {
        return _redesignCache.GetOrAdd(cultureCode, _ =>
        {
            var path = Path.Combine(_contentRoot, cultureCode, "redesign.json");
            if (!File.Exists(path))
            {
                return null;
            }

            using var stream = File.OpenRead(path);
            return JsonSerializer.Deserialize<IndustryRedesignContent>(stream, SerializerOptions);
        });
    }

    private InstallPageContent? LoadInstallPage(string cultureCode, string pageKey)
    {
        return _installCache.GetOrAdd($"{cultureCode}/{pageKey}", _ =>
        {
            var path = Path.Combine(_contentRoot, cultureCode, $"{pageKey}.json");
            if (!File.Exists(path))
            {
                return null;
            }

            using var stream = File.OpenRead(path);
            return JsonSerializer.Deserialize<InstallPageContent>(stream, SerializerOptions);
        });
    }

    private IReadOnlyDictionary<string, string>? LoadFlatContent(string cultureCode, string contentKey)
    {
        return _flatCache.GetOrAdd($"{cultureCode}/{contentKey}", _ =>
        {
            var path = Path.Combine(_contentRoot, cultureCode, $"{contentKey}.json");
            if (!File.Exists(path))
            {
                return null;
            }

            using var stream = File.OpenRead(path);
            return JsonSerializer.Deserialize<Dictionary<string, string>>(stream, SerializerOptions);
        });
    }
}
