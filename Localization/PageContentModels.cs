namespace Klacks.Marketing.Localization;

public sealed class IndustryPageContent
{
    public required string PageTitle { get; init; }

    // Optional dedicated meta description. When absent, the SEO head falls back to
    // the stripped hero subtitle, so no page needs a hand-written description.
    public string? MetaDescription { get; init; }

    public required IndustryHero Hero { get; init; }
    public required IndustrySection Challenges { get; init; }
    public IndustryRulesCalendarSection? RulesCalendar { get; init; }
    public IndustryTrustSection? OpenSource { get; init; }
    public required IndustrySection Solutions { get; init; }
    public IndustryAssistantSection? Klacksy { get; init; }
    public IndustryExample? Example { get; init; }
    public IndustryGallery? Gallery { get; init; }
    public bool ShowRoutePlanning { get; init; } = true;
    public required IndustryCta Cta { get; init; }

    // Optionale Redesign-Sektionen (Hero-Mockup, Ticker, Steps, Stats). Nullable =
    // rückwärtskompatibel: Seiten ohne diese Keys rendern exakt wie bisher. Fehlen
    // sie im Seiten-JSON, füllt der Provider sie aus der kulturspezifischen
    // redesign.json nach (get; set; statt init genau dafür).
    public IndustryHeroMockup? HeroMockup { get; set; }
    public IndustryTickerSection? Ticker { get; set; }
    public IndustryStepsSection? Steps { get; set; }
    public IndustryStatsSection? Stats { get; set; }
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

public sealed class IndustryGallery
{
    public string? Eyebrow { get; init; }
    public required string Title { get; init; }
    public string? Subtitle { get; init; }
    public required IReadOnlyList<IndustryGalleryImage> Items { get; init; }
}

public sealed class IndustryGalleryImage
{
    public required string File { get; init; }
    public required string Alt { get; init; }
    public string? Label { get; init; }
    public string? Caption { get; init; }
}

public sealed class IndustryRulesCalendarSection
{
    public string? Eyebrow { get; init; }
    public required string Title { get; init; }
    public required string Text { get; init; }
    public required IReadOnlyList<IndustryItem> Items { get; init; }
    public required string ImageFile { get; init; }
    public required string ImageAlt { get; init; }
    public string? ImageCaption { get; init; }
}

public sealed class IndustryTrustSection
{
    public string? Eyebrow { get; init; }
    public required string Title { get; init; }
    public required string Text { get; init; }
    public required IReadOnlyList<string> Bullets { get; init; }
}

public sealed class IndustryAssistantSection
{
    public string? Eyebrow { get; init; }
    public required string Title { get; init; }
    public required string Text { get; init; }
    public required string ImageFile { get; init; }
    public required string ImageAlt { get; init; }
    public string? ImageCaption { get; init; }
}

// Browser-Mockup im Hero: Screenshot-Slideshow + schwebende Badge-Karten.
public sealed class IndustryHeroMockup
{
    public required IReadOnlyList<IndustryMockupImage> Images { get; init; }
    public required IReadOnlyList<IndustryIconLabel> Badges { get; init; }
}

public sealed class IndustryMockupImage
{
    public required string File { get; init; }
    public required string Alt { get; init; }
}

// Icon + Kurztext — für Mockup-Badges und den Feature-Ticker.
public sealed class IndustryIconLabel
{
    public required string Icon { get; init; }
    public required string Text { get; init; }
}

public sealed class IndustryTickerSection
{
    public required IReadOnlyList<IndustryIconLabel> Items { get; init; }
}

public sealed class IndustryStepsSection
{
    public string? Eyebrow { get; init; }
    public required string Title { get; init; }
    public required IReadOnlyList<IndustryItem> Items { get; init; }
}

public sealed class IndustryStatsSection
{
    public string? Eyebrow { get; init; }
    public required string Title { get; init; }
    public required IReadOnlyList<IndustryStatItem> Items { get; init; }
}

public sealed class IndustryStatItem
{
    public required double Value { get; init; }
    public string? Suffix { get; init; }
    public required string Label { get; init; }
    public int Decimals { get; init; }
}

// Inhalt von Localization/Content/{kultur}/redesign.json: die kulturweit
// geteilten Redesign-Sektionen, die der Provider in Seiten ohne eigene
// Keys nachfüllt.
public sealed class IndustryRedesignContent
{
    public IndustryHeroMockup? HeroMockup { get; init; }
    public IndustryTickerSection? Ticker { get; init; }
    public IndustryStepsSection? Steps { get; init; }
    public IndustryStatsSection? Stats { get; init; }
}
