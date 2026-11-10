// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Globalization;
using Microsoft.Extensions.FileProviders;

namespace Klacks.Marketing.Localization;

/// <summary>
/// Finds the demo video recorded in the visitor's culture ("&lt;name&gt;-&lt;culture&gt;.webm/.mp4/.webp").
/// A video only counts as available when the WebM, MP4 and WebP poster all exist; there is deliberately
/// no fallback to another culture, since a video of a foreign-language app UI would mislead the visitor.
/// Culture suffixes are lowercase (e.g. "rest-conflict-zh-cn.webm"). Paths carry the file size as "?v=" so a re-recorded
/// video under the same name is not served from the browser cache.
/// </summary>
/// <param name="webRootFileProvider">File provider of wwwroot; the videos folder is listed once at construction and cached.</param>
public sealed class LocalizedVideoCatalog : ILocalizedVideoCatalog
{
    public const string VideosFolder = "videos";
    public const string WebmExtension = ".webm";
    public const string Mp4Extension = ".mp4";
    public const string PosterExtension = ".webp";
    public const string LocalizedFileNameFormat = "{0}-{1}{2}";

    public const string VersionQueryFormat = "{0}?v={1}";

    private const string PathSeparator = "/";

    private readonly Dictionary<string, long> _availableFiles;

    public LocalizedVideoCatalog(IFileProvider webRootFileProvider)
    {
        _availableFiles = webRootFileProvider.GetDirectoryContents(VideosFolder)
            .Where(entry => !entry.IsDirectory)
            .ToDictionary(entry => entry.Name, entry => entry.Length, StringComparer.Ordinal);
    }

    public LocalizedVideoSources? Find(string videoName, string culture)
    {
        var suffix = LocalizedScreenshotResolver.ToFileSuffix(culture);
        var webm = BuildFileName(videoName, suffix, WebmExtension);
        var mp4 = BuildFileName(videoName, suffix, Mp4Extension);
        var poster = BuildFileName(videoName, suffix, PosterExtension);

        if (!_availableFiles.ContainsKey(webm) || !_availableFiles.ContainsKey(mp4) || !_availableFiles.ContainsKey(poster))
        {
            return null;
        }

        return new LocalizedVideoSources(ToVersionedWebPath(webm), ToVersionedWebPath(mp4), ToVersionedWebPath(poster));
    }

    private string ToVersionedWebPath(string file)
    {
        var path = VideosFolder + PathSeparator + file;
        var length = _availableFiles[file];
        return length > 0 ? string.Format(CultureInfo.InvariantCulture, VersionQueryFormat, path, length) : path;
    }

    private static string BuildFileName(string videoName, string suffix, string extension) =>
        string.Format(CultureInfo.InvariantCulture, LocalizedFileNameFormat, videoName, suffix, extension);
}
