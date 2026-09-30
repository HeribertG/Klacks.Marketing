// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Globalization;
using Microsoft.Extensions.FileProviders;

namespace Klacks.Marketing.Localization;

/// <summary>
/// Finds the demo video recorded in the visitor's culture ("&lt;name&gt;-&lt;culture&gt;.webm/.mp4/.webp").
/// A video only counts as available when the WebM, MP4 and WebP poster all exist; there is deliberately
/// no fallback to another culture, since a video of a foreign-language app UI would mislead the visitor.
/// Culture suffixes are lowercase (e.g. "rest-conflict-zh-cn.webm").
/// </summary>
/// <param name="webRootFileProvider">File provider of wwwroot; the videos folder is listed once at construction and cached.</param>
public sealed class LocalizedVideoCatalog : ILocalizedVideoCatalog
{
    public const string VideosFolder = "videos";
    public const string WebmExtension = ".webm";
    public const string Mp4Extension = ".mp4";
    public const string PosterExtension = ".webp";
    public const string LocalizedFileNameFormat = "{0}-{1}{2}";

    private const string PathSeparator = "/";

    private readonly HashSet<string> _availableFiles;

    public LocalizedVideoCatalog(IFileProvider webRootFileProvider)
    {
        _availableFiles = webRootFileProvider.GetDirectoryContents(VideosFolder)
            .Where(entry => !entry.IsDirectory)
            .Select(entry => entry.Name)
            .ToHashSet(StringComparer.Ordinal);
    }

    public LocalizedVideoSources? Find(string videoName, string culture)
    {
        var suffix = LocalizedScreenshotResolver.ToFileSuffix(culture);
        var webm = BuildFileName(videoName, suffix, WebmExtension);
        var mp4 = BuildFileName(videoName, suffix, Mp4Extension);
        var poster = BuildFileName(videoName, suffix, PosterExtension);

        if (!_availableFiles.Contains(webm) || !_availableFiles.Contains(mp4) || !_availableFiles.Contains(poster))
        {
            return null;
        }

        return new LocalizedVideoSources(ToWebPath(webm), ToWebPath(mp4), ToWebPath(poster));
    }

    private static string BuildFileName(string videoName, string suffix, string extension) =>
        string.Format(CultureInfo.InvariantCulture, LocalizedFileNameFormat, videoName, suffix, extension);

    private static string ToWebPath(string file) => VideosFolder + PathSeparator + file;
}
