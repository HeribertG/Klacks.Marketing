// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// Keys of the pseudonymisation promise (names become codes before a request reaches a cloud AI provider). The texts
/// live once per culture in shared.json, so the industry card, the expert hero chip and the simple hero pill say the same.
/// </summary>
public static class PseudonymisationContent
{
    public const string ContentKey = "shared";
    public const string TitleKey = "pseudonymisation.title";
    public const string TextKey = "pseudonymisation.text";
    public const string Icon = "shield_lock";
}
