namespace Klacks.Marketing.Localization;

public sealed class InstallPageContent
{
    public required string PageTitle { get; init; }
    public string? MetaDescription { get; init; }
    public required InstallHero Hero { get; init; }
    public required InstallIndustryPicker Industry { get; init; }
    public required InstallPath OnPrem { get; init; }
    public required InstallPath Compose { get; init; }
    // Office-PC install without Docker; null in a culture file means the card is not offered there.
    public InstallNativeSection? Native { get; init; }
    // Linux-PC walkthrough for non-experts; always rendered, independent of the office-PC switch.
    public required InstallLinuxSection Linux { get; init; }
    public required InstallProfileSection Profile { get; init; }
    public required InstallFallbackSection Fallback { get; init; }
    public required InstallNotesSection Notes { get; init; }
    public required IndustryCta Cta { get; init; }
}

public sealed class InstallHero
{
    public required string BadgeIcon { get; init; }
    public required string Badge { get; init; }
    public required string TitleHtml { get; init; }
    public required string Subtitle { get; init; }
}

public sealed class InstallIndustryPicker
{
    public required string Eyebrow { get; init; }
    public required string Title { get; init; }
    public required string Text { get; init; }
    public required string AllLabel { get; init; }
}

public sealed class InstallPath
{
    public required string Icon { get; init; }
    public required string Title { get; init; }
    public required string Text { get; init; }
    public required string RequirementsTitle { get; init; }
    public required IReadOnlyList<string> Requirements { get; init; }
    public required string StepsTitle { get; init; }
    public required IReadOnlyList<InstallStep> Steps { get; init; }
    public required string DownloadLabel { get; init; }
}

// The "office PC without Docker" path: the card content (its DownloadLabel is the Windows
// button), the macOS button (only shown when a Mac URL is configured), the supported
// processor architectures (x64, ARM through emulation), the pointer for Linux users to the
// guided Docker installer, and the hero subtitle that replaces the two-path wording while
// the card is shown.
public sealed class InstallNativeSection
{
    public required InstallPath Path { get; init; }
    public required string MacDownloadLabel { get; init; }
    public required string ArchitectureNote { get; init; }
    public required string LinuxNote { get; init; }
    public required string HeroSubtitle { get; init; }
}

// The "Linux PC" walkthrough below the path cards: the card content (its DownloadLabel is the
// Linux button, which downloads the guided-installer package) and the note explaining the
// browser's certificate warning. The terminal command is not part of the content: the page
// builds it from the country package and renders it after the terminal step.
public sealed class InstallLinuxSection
{
    public required InstallPath Path { get; init; }
    public required string CertificateNote { get; init; }
}

public sealed class InstallStep
{
    public required string Title { get; init; }
    public required string Text { get; init; }
}

public sealed class InstallProfileSection
{
    public required string Icon { get; init; }
    public required string Title { get; init; }
    public required string Text { get; init; }
    public required string DownloadLabel { get; init; }
}

// Shown instead of the marketplace downloads for site countries that have no
// published region package (currently Belgium and Ireland).
public sealed class InstallFallbackSection
{
    public required string NoticeTitle { get; init; }
    public required string NoticeText { get; init; }
    public required string DownloadLabel { get; init; }
    public required string ComposeNote { get; init; }
}

public sealed class InstallNotesSection
{
    public required string Title { get; init; }
    public required IReadOnlyList<InstallNote> Items { get; init; }
}

public sealed class InstallNote
{
    public required string Icon { get; init; }
    public required string Title { get; init; }
    public required string Text { get; init; }
}
