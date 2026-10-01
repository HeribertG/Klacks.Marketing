// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// One slide of a demo video carousel: the recorded video plus the shared.json keys of its pill title, label and caption.
/// </summary>
/// <param name="VideoName">Name of the recorded video, see the constants of <see cref="DemoVideo"/></param>
/// <param name="TitleKey">Key of the pill and slide heading</param>
/// <param name="LabelKey">Key of the accessible video label</param>
/// <param name="CaptionKey">Key of the caption below the video</param>
public sealed record DemoCarouselVideo(string VideoName, string TitleKey, string LabelKey, string CaptionKey);
