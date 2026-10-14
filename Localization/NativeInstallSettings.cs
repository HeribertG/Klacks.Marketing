namespace Klacks.Marketing.Localization;

/// <summary>
/// Reads the switch and download targets of the "office PC without Docker" install path.
/// The path stays hidden until NativeInstall:Enabled is true. Windows defaults to the office-PC package in the rolling
/// "office-pc" release of Klacks.Api; the Mac button only appears when NativeInstall:MacUrl is configured, because no
/// macOS package exists yet.
/// </summary>
/// <param name="Enabled">Whether the office-PC card is shown</param>
/// <param name="WindowsUrl">Download URL of the Windows x64 office-PC package</param>
/// <param name="MacUrl">Download URL of the macOS package; null hides the Mac button</param>
public sealed record NativeInstallSettings(bool Enabled, string WindowsUrl, string? MacUrl)
{
    public const string EnabledKey = "NativeInstall:Enabled";
    public const string WindowsUrlKey = "NativeInstall:WindowsUrl";
    public const string MacUrlKey = "NativeInstall:MacUrl";

    public static NativeInstallSettings From(IConfiguration configuration)
        => new(
            configuration.GetValue(EnabledKey, false),
            NonEmpty(configuration[WindowsUrlKey]) ?? ExternalLinks.NativeWindowsPackageUrl,
            NonEmpty(configuration[MacUrlKey]));

    private static string? NonEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
}
