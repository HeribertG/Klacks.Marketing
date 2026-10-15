// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;

/// <summary>
/// Video catalog that knows no recording at all, so fallback rendering can be checked independently of the files that
/// currently sit in wwwroot/videos.
/// </summary>
internal sealed class EmptyVideoCatalog : ILocalizedVideoCatalog
{
    public LocalizedVideoSources? Find(string videoName, string culture) => null;
}
