// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Checks the real wwwroot/images folder: every app screenshot view and the Open Graph image exist for every culture,
/// so no visitor silently gets an image in a foreign language.
/// </summary>
[TestFixture]
public class LocalizedImageCompletenessTests
{
    private const string ImagesRelativePath = "images";
    private const string DefaultCultureScreenshotPattern = "app-*-de.webp";
    private const string LocalizedScreenshotFormat = "app-{0}-{1}.webp";
    private const string LocalizedOgImageFormat = "og-image-{0}.png";

    private static readonly Regex ViewNamePattern = new("^app-(?<view>.+)-de\\.webp$", RegexOptions.CultureInvariant);

    private static IEnumerable<string> CultureCodes => SupportedCultures.All.Select(c => c.Code);

    [TestCaseSource(nameof(CultureCodes))]
    public void Every_culture_has_every_app_screenshot_view(string culture)
    {
        var imagesFolder = Path.Combine(MarketingProjectPaths.WebRoot, ImagesRelativePath);
        var suffix = LocalizedScreenshotResolver.ToFileSuffix(culture);

        var views = Directory.GetFiles(imagesFolder, DefaultCultureScreenshotPattern)
            .Select(file => ViewNamePattern.Match(Path.GetFileName(file)))
            .Where(match => match.Success)
            .Select(match => match.Groups["view"].Value)
            .ToList();

        views.ShouldNotBeEmpty();

        var missing = views
            .Select(view => string.Format(LocalizedScreenshotFormat, view, suffix))
            .Where(file => !File.Exists(Path.Combine(imagesFolder, file)))
            .ToList();

        missing.ShouldBeEmpty($"Missing screenshots for {culture}: {string.Join(", ", missing)}");
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Every_culture_has_an_open_graph_image(string culture)
    {
        var file = string.Format(LocalizedOgImageFormat, LocalizedScreenshotResolver.ToFileSuffix(culture));

        File.Exists(Path.Combine(MarketingProjectPaths.WebRoot, ImagesRelativePath, file)).ShouldBeTrue($"Missing Open Graph image {file}");
    }
}
