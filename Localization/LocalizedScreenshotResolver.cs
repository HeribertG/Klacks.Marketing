// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.FileProviders;

namespace Klacks.Marketing.Localization;

/// <summary>
/// Picks the app screenshot matching the visitor's culture for a base file name from the content JSONs
/// ("app-&lt;view&gt;-&lt;xx&gt;.png"). Candidates are tried in the order culture WebP, culture PNG,
/// default-culture WebP, original file; names that do not follow the pattern pass through unchanged.
/// Localized files use the lowercase culture code as suffix (e.g. "app-schedule-zh-cn.webp").
/// </summary>
/// <param name="webRootFileProvider">File provider of wwwroot; the images folder is listed once at construction and cached.</param>
public sealed partial class LocalizedScreenshotResolver : ILocalizedScreenshotResolver
{
    public const string ImagesFolder = "images";
    public const string WebpExtension = ".webp";
    public const string PngExtension = ".png";
    public const string LocalizedFileNameFormat = "app-{0}-{1}{2}";

    private const string ViewGroup = "view";
    private const string LanguageGroup = "lang";

    private readonly HashSet<string> _availableFiles;

    public LocalizedScreenshotResolver(IFileProvider webRootFileProvider)
    {
        _availableFiles = webRootFileProvider.GetDirectoryContents(ImagesFolder)
            .Where(entry => !entry.IsDirectory)
            .Select(entry => entry.Name)
            .ToHashSet(StringComparer.Ordinal);
    }

    public string Resolve(string file, string culture) => Select(file, culture).File;

    public bool IsLocalized(string file, string culture) => Select(file, culture).IsLocalized;

    public static string ToFileSuffix(string culture) => culture.ToLowerInvariant();

    [GeneratedRegex(@"^app-(?<view>.+)-(?<lang>[a-z]{2})\.png$", RegexOptions.CultureInvariant)]
    private static partial Regex BaseFileNamePattern();

    private (string File, bool IsLocalized) Select(string file, string culture)
    {
        var match = BaseFileNamePattern().Match(file);
        if (!match.Success)
        {
            return (file, false);
        }

        var view = match.Groups[ViewGroup].Value;
        var originalSuffix = match.Groups[LanguageGroup].Value;
        var cultureSuffix = ToFileSuffix(culture);
        var defaultSuffix = ToFileSuffix(SupportedCultures.DefaultCode);

        var candidates = new (string File, bool IsLocalized)[]
        {
            (BuildFileName(view, cultureSuffix, WebpExtension), true),
            (BuildFileName(view, cultureSuffix, PngExtension), true),
            (BuildFileName(view, defaultSuffix, WebpExtension), defaultSuffix == cultureSuffix),
        };

        foreach (var candidate in candidates)
        {
            if (_availableFiles.Contains(candidate.File))
            {
                return candidate;
            }
        }

        return (file, originalSuffix == cultureSuffix);
    }

    private static string BuildFileName(string view, string suffix, string extension) =>
        string.Format(CultureInfo.InvariantCulture, LocalizedFileNameFormat, view, suffix, extension);
}
