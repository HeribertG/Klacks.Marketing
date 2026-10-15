// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// One jump link of the simple page's header navigation.
/// </summary>
/// <param name="Id">DOM id of the target section on the simple start page</param>
/// <param name="LabelKey">Text key in simple.json</param>
public sealed record SimpleNavigationAnchor(string Id, string LabelKey);
