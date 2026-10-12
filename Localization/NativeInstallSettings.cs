namespace Klacks.Marketing.Localization;

/// <summary>
/// Reads the switch and download targets of the "office PC without Docker" install path.
/// The path stays hidden until NativeInstall:Enabled is true, i.e. until signed native
/// installers are published as release assets; the URLs default to those assets.
/// </summary>
public sealed record NativeInstallSettings(bool Enabled, string WindowsUrl, string MacUrl)
{
    public const string EnabledKey = "NativeInstall:Enabled";
    public const string WindowsUrlKey = "NativeInstall:WindowsUrl";
    public const string MacUrlKey = "NativeInstall:MacUrl";

    public static NativeInstallSettings From(IConfiguration configuration)
        => new(
            configuration.GetValue(EnabledKey, false),
            NonEmpty(configuration[WindowsUrlKey]) ?? ExternalLinks.NativeWindowsInstallerUrl,
            NonEmpty(configuration[MacUrlKey]) ?? ExternalLinks.NativeMacInstallerUrl);

    private static string? NonEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
}
