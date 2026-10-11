// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Checks the real wwwroot/videos folder for every video of the demo carousels (rule violations, scenarios, everyday work, tour containers, special shifts, Klacksy tasks).
/// Explicit on purpose: it only passes once every culture has been recorded, so it must not run in the normal suite.
/// </summary>
[TestFixture]
[Explicit("Run after all localized carousel videos have been recorded.")]
public class RecordedVideoCompletenessTests
{
    private const string VideosRelativePath = "videos";

    private static readonly string[] VideoNames = DemoCarousels.All
        .SelectMany(definition => definition.Videos)
        .Select(video => video.VideoName)
        .ToArray();

    private static readonly string[] Extensions =
    {
        LocalizedVideoCatalog.WebmExtension,
        LocalizedVideoCatalog.Mp4Extension,
        LocalizedVideoCatalog.PosterExtension,
    };

    private static IEnumerable<string> CultureCodes => SupportedCultures.All.Select(c => c.Code);

    [TestCaseSource(nameof(CultureCodes))]
    public void Every_culture_has_webm_mp4_and_poster_for_each_carousel_video(string culture)
    {
        var videosFolder = Path.Combine(MarketingProjectPaths.WebRoot, VideosRelativePath);
        var suffix = LocalizedScreenshotResolver.ToFileSuffix(culture);

        var missing = VideoNames
            .SelectMany(name => Extensions.Select(extension => string.Format(LocalizedVideoCatalog.LocalizedFileNameFormat, name, suffix, extension)))
            .Where(file => !File.Exists(Path.Combine(videosFolder, file)))
            .ToList();

        missing.ShouldBeEmpty($"Missing video files for {culture}: {string.Join(", ", missing)}");
    }
}
