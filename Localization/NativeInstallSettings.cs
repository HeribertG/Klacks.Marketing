// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

/// <summary>
/// Reads the switch of the "office PC without Docker" install path. The card stays hidden until NativeInstall:Enabled is true;
/// its button links to the Klacks Store, which hosts the Windows installer.
/// </summary>
/// <param name="Enabled">Whether the office-PC card is shown</param>
public sealed record NativeInstallSettings(bool Enabled)
{
    public const string EnabledKey = "NativeInstall:Enabled";

    public static NativeInstallSettings From(IConfiguration configuration)
        => new(configuration.GetValue(EnabledKey, false));
}
