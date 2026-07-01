using System.Collections.Concurrent;
using System.Text.Json;

namespace Klacks.Marketing.Localization;

public sealed class JsonPageContentProvider : IPageContentProvider
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly string _contentRoot;
    private readonly ConcurrentDictionary<string, IndustryPageContent?> _industryCache = new();
    private readonly ConcurrentDictionary<string, IReadOnlyDictionary<string, string>?> _flatCache = new();

    public JsonPageContentProvider(IWebHostEnvironment environment)
    {
        _contentRoot = Path.Combine(environment.ContentRootPath, "Localization", "Content");
    }

    public IndustryPageContent GetIndustryPage(string cultureCode, string pageKey)
    {
        return LoadIndustryPage(cultureCode, pageKey)
            ?? LoadIndustryPage(SupportedCultures.DefaultCode, pageKey)
            ?? throw new InvalidOperationException($"No content found for industry page '{pageKey}'.");
    }

    public string GetText(string cultureCode, string contentKey, string textKey)
    {
        var dictionary = LoadFlatContent(cultureCode, contentKey) ?? LoadFlatContent(SupportedCultures.DefaultCode, contentKey);

        return dictionary is not null && dictionary.TryGetValue(textKey, out var value) ? value : textKey;
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
            return JsonSerializer.Deserialize<IndustryPageContent>(stream, SerializerOptions);
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
