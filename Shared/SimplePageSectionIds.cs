// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// DOM ids of the simple start page's sections and the header jump links to them ("/land-ch#kosten"). They differ
/// from <see cref="PageSectionIds"/>, so no anchor ever means two different sections.
/// </summary>
public static class SimplePageSectionIds
{
    public const string Tasks = "was-klacksy-tut";
    public const string Talk = "so-gehts";
    public const string Cost = "kosten";
    public const string Start = "loslegen";
    public const string Share = "weiterschicken";

    public static readonly IReadOnlyList<SimpleNavigationAnchor> Navigation = new[]
    {
        new SimpleNavigationAnchor(Tasks, "nav.tasks"),
        new SimpleNavigationAnchor(Talk, "nav.talk"),
        new SimpleNavigationAnchor(Cost, "nav.cost"),
        new SimpleNavigationAnchor(Start, "nav.start"),
    };
}
