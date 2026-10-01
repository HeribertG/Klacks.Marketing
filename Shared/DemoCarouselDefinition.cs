// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// Describes one carousel section of a landing page: its anchor, its texts in shared.json and its videos.
/// </summary>
/// <param name="SectionId">Unique anchor of the section; the heading and slide DOM ids are derived from it</param>
/// <param name="TitleKey">Key of the section heading</param>
/// <param name="SubtitleKey">Key of the text below the heading</param>
/// <param name="Videos">The slides in display order; a culture without any recorded video of them omits the whole section</param>
/// <param name="EyebrowKey">Optional key of the small label above the heading</param>
/// <param name="HintKey">Optional key of the Klacksy tip shown below the carousel</param>
public sealed record DemoCarouselDefinition(
    string SectionId,
    string TitleKey,
    string SubtitleKey,
    IReadOnlyList<DemoCarouselVideo> Videos,
    string? EyebrowKey = null,
    string? HintKey = null);
