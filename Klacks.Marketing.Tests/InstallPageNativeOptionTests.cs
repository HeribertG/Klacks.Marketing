// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using Klacks.Marketing.Localization;
using Microsoft.Extensions.Configuration;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The "office PC without Docker" install option: every culture carries a complete card including the x64/ARM note,
/// the Windows 10 note (Windows 11 is the stated requirement, Windows 10 22H2 runs but only gets updates through ESU)
/// and the "Mac: coming soon" note, and names the office PC in its page title and meta description. The shipped
/// appsettings.json switches the card on; the page is unchanged while NativeInstall:Enabled is off (two cards,
/// two-path hero), and with the switch on every culture renders three cards with the counted Windows package link
/// from the rolling "office-pc" release. The Mac button only appears when NativeInstall:MacUrl is configured;
/// otherwise the "coming soon" note stands in its place.
/// </summary>
[TestFixture]
public class InstallPageNativeOptionTests
{
    private const string InstallPageKey = "installation";
    private const int ExpectedRequirementCount = 5;
    private const int ExpectedStepCount = 3;
    private const string RollingWindowsPackageUrl = "https://github.com/HeribertG/Klacks.Api/releases/download/office-pc/klacks-office-pc-win-x64.zip";
    private const string ConfiguredMacUrl = "https://downloads.example/klacks.pkg";
    private const string DownloadCounterAttribute = "data-c=\"DownloadClick\"";
    private const string EnglishCulture = "en";
    private const string EnglishMacLabel = "Download for Mac";
    private static readonly string[] ArchitectureNoteFacts = ["x64", "ARM", "Snapdragon X"];
    private const string SupportedWindows = "Windows 11";
    private const string OutOfSupportWindows = "Windows 10";
    private static readonly string[] Windows10NoteFacts = ["Windows 10 22H2", "ESU"];
    private const string AppSettingsFileName = "appsettings.json";

    // The culture's own word for the office PC, taken from its card title, that the page title and meta description
    // must contain so search results mention the Windows package and not only the guided installer and Docker Compose.
    private static readonly IReadOnlyDictionary<string, string> OfficePcTerms = new Dictionary<string, string>
    {
        ["ar"] = "حاسوب المكتب",
        ["cs"] = "kancelářské PC",
        ["da"] = "kontor-pc",
        ["de"] = "Büro-PC",
        ["el"] = "γραφείου",
        ["en"] = "office PC",
        ["es"] = "PC de oficina",
        ["fi"] = "toimiston PC",
        ["fr"] = "PC de bureau",
        ["he"] = "מחשב המשרד",
        ["id"] = "PC kantor",
        ["it"] = "PC dell'ufficio",
        ["ja"] = "オフィスのPC",
        ["ko"] = "사무실 PC",
        ["ms"] = "PC pejabat",
        ["nb"] = "kontor-PC",
        ["nl"] = "kantoor-pc",
        ["pl"] = "komputer biurowy",
        ["pt"] = "PC do escritório",
        ["ro"] = "de birou",
        ["sv"] = "kontorsdator",
        ["th"] = "พีซีในสำนักงาน",
        ["vi"] = "máy tính văn phòng",
        ["zh-CN"] = "办公电脑",
        ["zh-TW"] = "辦公室電腦",
    };

    private static IEnumerable<string> Cultures() => SupportedCultures.All.Select(culture => culture.Code);

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_carries_a_complete_office_pc_card(string culture)
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        provider.HasContentIn(culture, InstallPageKey).ShouldBeTrue();

        var native = provider.GetInstallPage(culture, InstallPageKey).Native;

        native.ShouldNotBeNull();
        native.Path.Requirements.Count.ShouldBe(ExpectedRequirementCount);
        native.Path.Steps.Count.ShouldBe(ExpectedStepCount);
        new[] { native.Path.Title, native.Path.Text, native.Path.DownloadLabel, native.MacDownloadLabel, native.MacComingSoonNote, native.ArchitectureNote, native.LinuxNote, native.HeroSubtitle }
            .ShouldAllBe(text => !string.IsNullOrWhiteSpace(text));
    }

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_translates_the_mac_coming_soon_note(string culture)
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        var note = provider.GetInstallPage(culture, InstallPageKey).Native!.MacComingSoonNote;

        note.ShouldContain("Mac");
        if (culture != EnglishCulture)
        {
            note.ShouldNotBe(provider.GetInstallPage(EnglishCulture, InstallPageKey).Native!.MacComingSoonNote);
        }
    }

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_names_the_office_pc_in_page_title_and_meta_description(string culture)
    {
        var content = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey);
        var term = OfficePcTerms[culture];

        WebUtility.HtmlDecode(content.PageTitle).ShouldContain(term, Case.Insensitive);
        content.MetaDescription.ShouldNotBeNull();
        WebUtility.HtmlDecode(content.MetaDescription).ShouldContain(term, Case.Insensitive);
        content.MetaDescription.ShouldContain("Windows");
    }

    [Test]
    public void Office_pc_terms_cover_every_culture()
    {
        OfficePcTerms.Keys.OrderBy(code => code, StringComparer.Ordinal)
            .ShouldBe(Cultures().OrderBy(code => code, StringComparer.Ordinal));
    }

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_requires_Windows_11_and_notes_Windows_10_with_ESU(string culture)
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        var requirements = provider.GetInstallPage(culture, InstallPageKey).Native!.Path.Requirements;

        requirements[0].ShouldStartWith(SupportedWindows);
        requirements[0].ShouldNotContain(OutOfSupportWindows);
        Windows10NoteFacts.ShouldAllBe(fact => requirements[1].Contains(fact, StringComparison.Ordinal));
    }

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_states_the_supported_processor_architectures(string culture)
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        var note = provider.GetInstallPage(culture, InstallPageKey).Native!.ArchitectureNote;

        ArchitectureNoteFacts.ShouldAllBe(fact => note.Contains(fact, StringComparison.Ordinal));
        if (culture != EnglishCulture)
        {
            note.ShouldNotBe(provider.GetInstallPage(EnglishCulture, InstallPageKey).Native!.ArchitectureNote);
        }
    }

    [Test]
    public void Windows_package_defaults_to_the_rolling_office_pc_release_and_mac_to_none()
    {
        ExternalLinks.NativeWindowsPackageUrl.ShouldBe(RollingWindowsPackageUrl);

        var settings = NativeInstallSettings.From(new ConfigurationBuilder().Build());

        settings.Enabled.ShouldBeFalse();
        settings.WindowsUrl.ShouldBe(RollingWindowsPackageUrl);
        settings.MacUrl.ShouldBeNull();
    }

    [Test]
    public async Task Shipped_configuration_shows_the_office_pc_card_with_the_rolling_package_and_no_mac_button()
    {
        var configuration = new ConfigurationBuilder()
            .AddJsonFile(Path.Combine(MarketingProjectPaths.ProjectRoot, AppSettingsFileName), optional: false)
            .Build();
        var settings = NativeInstallSettings.From(configuration);

        settings.Enabled.ShouldBeTrue();
        settings.WindowsUrl.ShouldBe(RollingWindowsPackageUrl);
        settings.MacUrl.ShouldBeNull();

        var html = await RenderAsync(SupportedCultures.DefaultCode, settings.Enabled, settings.WindowsUrl, settings.MacUrl);

        html.ShouldContain("lg:grid-cols-3");
        html.ShouldContain($"href=\"{RollingWindowsPackageUrl}\" rel=\"nofollow\" {DownloadCounterAttribute}");
        html.ShouldContain("Für Mac: kommt in Kürze.");
    }

    [TestCaseSource(nameof(Cultures))]
    public async Task Mac_coming_soon_note_appears_only_without_a_configured_mac_url(string culture)
    {
        var note = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey).Native!.MacComingSoonNote;

        (await RenderAsync(culture, enabled: true)).ShouldContain(note);
        (await RenderAsync(culture, enabled: true, macUrl: ConfiguredMacUrl)).ShouldNotContain(note);
        (await RenderAsync(culture, enabled: false)).ShouldNotContain(note);
    }

    [Test]
    public async Task Switch_off_keeps_the_two_card_page()
    {
        var html = await RenderAsync(SupportedCultures.DefaultCode, enabled: false);

        html.ShouldContain("lg:grid-cols-2");
        html.ShouldNotContain(ExternalLinks.NativeWindowsPackageUrl);
        html.ShouldContain("Zwei Wege");
    }

    [TestCaseSource(nameof(Cultures))]
    public async Task Switch_on_shows_the_office_pc_card_with_the_counted_windows_package_and_the_architecture_note(string culture)
    {
        var html = await RenderAsync(culture, enabled: true);
        var native = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey).Native!;

        html.ShouldContain("lg:grid-cols-3");
        html.ShouldContain($"href=\"{RollingWindowsPackageUrl}\" rel=\"nofollow\" {DownloadCounterAttribute}");
        html.ShouldContain(native.ArchitectureNote);
    }

    [TestCaseSource(nameof(Cultures))]
    public async Task Mac_button_appears_only_with_a_configured_mac_url(string culture)
    {
        var withoutMac = await RenderAsync(culture, enabled: true);
        var withMac = await RenderAsync(culture, enabled: true, macUrl: ConfiguredMacUrl);

        CountOccurrences(withMac, DownloadCounterAttribute).ShouldBe(CountOccurrences(withoutMac, DownloadCounterAttribute) + 1);
        withMac.ShouldContain($"href=\"{ConfiguredMacUrl}\" rel=\"nofollow\" {DownloadCounterAttribute}");
    }

    [Test]
    public async Task English_page_hides_the_mac_label_without_a_mac_url()
    {
        (await RenderAsync(EnglishCulture, enabled: true)).ShouldNotContain(EnglishMacLabel);
        (await RenderAsync(EnglishCulture, enabled: true, macUrl: ConfiguredMacUrl)).ShouldContain(EnglishMacLabel);
    }

    [Test]
    public async Task Switch_on_uses_the_three_path_hero_and_configured_urls()
    {
        const string windowsUrl = "https://downloads.example/klacks.zip";

        var html = await RenderAsync(SupportedCultures.DefaultCode, enabled: true, windowsUrl, ConfiguredMacUrl);

        html.ShouldContain("Drei Wege");
        html.ShouldContain(windowsUrl);
        html.ShouldNotContain(RollingWindowsPackageUrl);
        html.ShouldContain(ConfiguredMacUrl);
    }

    private static Task<string> RenderAsync(string culture, bool enabled, string? windowsUrl = null, string? macUrl = null)
        => InstallPageRenderer.RenderAsync(culture, enabled, windowsUrl, macUrl);

    private static int CountOccurrences(string text, string value)
    {
        var count = 0;
        var index = text.IndexOf(value, StringComparison.Ordinal);
        while (index >= 0)
        {
            count++;
            index = text.IndexOf(value, index + value.Length, StringComparison.Ordinal);
        }

        return count;
    }
}
