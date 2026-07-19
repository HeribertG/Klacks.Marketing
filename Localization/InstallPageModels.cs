namespace Klacks.Marketing.Localization;

public sealed class InstallPageContent
{
    public required string PageTitle { get; init; }
    public string? MetaDescription { get; init; }
    public required InstallHero Hero { get; init; }
    public required InstallIndustryPicker Industry { get; init; }
    public required InstallPath OnPrem { get; init; }
    public required InstallPath Compose { get; init; }
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
