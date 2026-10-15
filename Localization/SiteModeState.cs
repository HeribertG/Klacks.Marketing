// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

/// <summary>
/// Mode of the page at a given path, derived by <see cref="SiteModeResolver"/>.
/// </summary>
/// <param name="IsSimple">True on the simple start page of a country</param>
/// <param name="ShowSwitch">True when the header shows the expert-mode switch (culture with a simple page, feature on)</param>
/// <param name="SwitchTarget">Absolute path of the opposite page the switch navigates to; null while hidden</param>
/// <param name="CultureCode">Culture code of the path</param>
public sealed record SiteModeState(bool IsSimple, bool ShowSwitch, string? SwitchTarget, string CultureCode)
{
    public string BodyClass => IsSimple ? SiteModes.SimpleBodyClass : SiteModes.ExpertBodyClass;
}
