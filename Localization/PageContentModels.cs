namespace Klacks.Marketing.Localization;

public sealed class IndustryPageContent
{
    public required string PageTitle { get; init; }
    public required IndustryHero Hero { get; init; }
    public required IndustrySection Challenges { get; init; }
    public required IndustrySection Solutions { get; init; }
    public IndustryExample? Example { get; init; }
    public bool ShowRoutePlanning { get; init; } = true;
    public required IndustryCta Cta { get; init; }
}

public sealed class IndustryHero
{
    public required string BadgeIcon { get; init; }
    public required string Badge { get; init; }
    public required string TitleHtml { get; init; }
    public required string Subtitle { get; init; }
    public required string ScreenshotFile { get; init; }
    public required string ScreenshotAlt { get; init; }
    public required string ScreenshotLabel { get; init; }

    // Screenshots only exist with German app UI — null for de, a translated note for every other locale.
    public string? ScreenshotCaption { get; init; }
}

public sealed class IndustrySection
{
    public string? Eyebrow { get; init; }
    public required string Title { get; init; }
    public string? Subtitle { get; init; }
    public required IReadOnlyList<IndustryItem> Items { get; init; }
}

public sealed class IndustryItem
{
    public required string Icon { get; init; }
    public required string Title { get; init; }
    public required string Text { get; init; }
}

public sealed class IndustryExample
{
    public required string Eyebrow { get; init; }
    public required string Title { get; init; }
    public required string Text { get; init; }
}

public sealed class IndustryCta
{
    public required string Title { get; init; }
    public required string Text { get; init; }
}
