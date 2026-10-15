// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;

/// <summary>
/// Video catalog that reports every requested video as recorded, so templates can be checked with videos present
/// before the real recordings exist.
/// </summary>
internal sealed class StubVideoCatalog : ILocalizedVideoCatalog
{
    public LocalizedVideoSources? Find(string videoName, string culture)
        => new($"videos/{videoName}-{culture}.webm", $"videos/{videoName}-{culture}.mp4", $"videos/{videoName}-{culture}.webp");
}
