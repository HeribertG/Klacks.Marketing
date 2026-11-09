// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.Encodings.Web;
using Klacks.Marketing.Localization;
using Microsoft.Extensions.Configuration;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The "office PC without Docker" install option: every culture carries a complete card including the x64/ARM note,
/// the Windows 10 note (Windows 11 is the stated requirement, Windows 10 22H2 runs but only gets updates through ESU)
/// and the "Mac: coming soon" note, and names the office PC in its page title and meta description. The shipped
/// appsettings.json switches the card on; the page is unchanged while NativeInstall:Enabled is off (two cards,
/// two-path hero), and with the switch on every culture renders three cards. The page downloads nothing itself: the
/// card's counted button links to the country's page in the Klacks Store, which hosts the Windows installer
/// (Klacks-Setup-win-x64.exe). The steps describe that installer, not the retired ZIP package with Installieren.cmd,
/// explain the Edge download warning (the .crdownload placeholder), name the signed installer's publisher instead of
/// calling it unsigned, and every culture explains how to uninstall through the Windows app settings and where the kept
/// data stays. The "Mac: coming soon" note is shown with the card.
/// </summary>
[TestFixture]
public class InstallPageNativeOptionTests
{
    private const string InstallPageKey = "installation";
    private const int ExpectedRequirementCount = 5;
    private const int ExpectedStepCount = 3;
    private const string WindowsInstallerFileName = "Klacks-Setup-win-x64.exe";
    private const string EdgeDownloadPlaceholderExtension = "crdownload";
    private const string StoreName = "Klacks Store";
    private const string InstallerPublisher = "Open Source Developer Heribert Gasparoli";
    private const string StoreRegionPageUrl = ExternalLinks.MarketplaceUrl + "/region/ch?culture=";
    private const string RetiredInstallScript = "Installieren.cmd";
    private const string RetiredPackageFormat = "ZIP";
    private const string KeptDataFolder = @"C:\ProgramData\Klacks";
    private const string ProductName = "Klacks";
    private const string StoreLinkAttributes = "target=\"_blank\" data-c=\"DownloadClick\"";
    private const string EnglishCulture = "en";
    private static readonly string[] RetiredUnsignedClaims = ["nicht digital signiert", "not digitally signed"];
    private static readonly string[] DirectDownloadMarkers = ["/releases/", "/api/regions/", ".exe\"", ".zip\""];
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
        new[] { native.Path.Title, native.Path.Text, native.Path.DownloadLabel, native.MacComingSoonNote, native.ArchitectureNote, native.LinuxNote, native.UninstallNote, native.HeroSubtitle }
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

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_describes_the_windows_installer_instead_of_the_retired_zip_package(string culture)
    {
        var native = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey).Native!;
        var texts = native.Path.Steps.SelectMany(step => new[] { step.Title, step.Text })
            .Append(native.Path.Title)
            .Append(native.Path.Text)
            .Append(native.UninstallNote);

        texts.ShouldAllBe(text => !text.Contains(RetiredInstallScript, StringComparison.OrdinalIgnoreCase));
        texts.ShouldAllBe(text => !text.Contains(RetiredPackageFormat, StringComparison.OrdinalIgnoreCase));
        native.Path.Steps[0].Text.ShouldContain(WindowsInstallerFileName);
    }

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_downloads_the_installer_from_the_store_and_explains_the_edge_warning(string culture)
    {
        var steps = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey).Native!.Path.Steps;

        steps[0].Text.ShouldContain(StoreName);
        steps[0].Text.ShouldContain(EdgeDownloadPlaceholderExtension);
        steps[1].Text.ShouldContain(InstallerPublisher);
    }

    [TestCaseSource(nameof(Cultures))]
    public void No_culture_calls_the_installer_unsigned(string culture)
    {
        var native = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey).Native!;
        var texts = native.Path.Steps.Select(step => step.Text).Append(native.Path.Text);

        texts.ShouldAllBe(text => RetiredUnsignedClaims.All(claim => !text.Contains(claim, StringComparison.OrdinalIgnoreCase)));
    }

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_explains_uninstalling_and_where_the_kept_data_stays(string culture)
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        var note = provider.GetInstallPage(culture, InstallPageKey).Native!.UninstallNote;

        note.ShouldContain(ProductName);
        note.ShouldContain(KeptDataFolder);
        if (culture != EnglishCulture)
        {
            note.ShouldNotBe(provider.GetInstallPage(EnglishCulture, InstallPageKey).Native!.UninstallNote);
        }
    }

    [TestCaseSource(nameof(Cultures))]
    public async Task Uninstall_note_appears_only_with_the_office_pc_card(string culture)
    {
        var note = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey).Native!.UninstallNote;

        (await RenderAsync(culture, enabled: true)).ShouldContain(note);
        (await RenderAsync(culture, enabled: false)).ShouldNotContain(note);
    }

    [Test]
    public void Office_pc_switch_defaults_to_off()
    {
        NativeInstallSettings.From(new ConfigurationBuilder().Build()).Enabled.ShouldBeFalse();
    }

    [Test]
    public async Task Shipped_configuration_shows_the_office_pc_card_linking_to_the_store()
    {
        var configuration = new ConfigurationBuilder()
            .AddJsonFile(Path.Combine(MarketingProjectPaths.ProjectRoot, AppSettingsFileName), optional: false)
            .Build();
        var settings = NativeInstallSettings.From(configuration);

        settings.Enabled.ShouldBeTrue();

        var html = await RenderAsync(SupportedCultures.DefaultCode, settings.Enabled);

        html.ShouldContain("lg:grid-cols-3");
        html.ShouldContain($"href=\"{StoreLink(SupportedCultures.DefaultCode)}\" {StoreLinkAttributes}");
        html.ShouldContain("Für Mac: kommt in Kürze.");
    }

    [TestCaseSource(nameof(Cultures))]
    public async Task Mac_coming_soon_note_appears_only_with_the_office_pc_card(string culture)
    {
        var note = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey).Native!.MacComingSoonNote;

        (await RenderAsync(culture, enabled: true)).ShouldContain(note);
        (await RenderAsync(culture, enabled: false)).ShouldNotContain(note);
    }

    [Test]
    public async Task Switch_off_keeps_the_two_card_page()
    {
        var html = await RenderAsync(SupportedCultures.DefaultCode, enabled: false);
        var native = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(SupportedCultures.DefaultCode, InstallPageKey).Native!;

        html.ShouldContain("lg:grid-cols-2");
        html.ShouldNotContain(native.Path.DownloadLabel);
        html.ShouldContain("Zwei Wege");
    }

    [TestCaseSource(nameof(Cultures))]
    public async Task Switch_on_shows_the_office_pc_card_with_the_counted_store_link_and_the_architecture_note(string culture)
    {
        var html = await RenderAsync(culture, enabled: true);
        var native = new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey).Native!;

        html.ShouldContain("lg:grid-cols-3");
        html.ShouldContain($"href=\"{StoreLink(culture)}\" {StoreLinkAttributes}");
        html.ShouldContain(native.ArchitectureNote);
    }

    [TestCaseSource(nameof(Cultures))]
    public async Task Install_page_links_no_direct_download(string culture)
    {
        var html = await RenderAsync(culture, enabled: true);

        DirectDownloadMarkers.ShouldAllBe(marker => !html.Contains(marker, StringComparison.OrdinalIgnoreCase));
        html.ShouldNotContain("rel=\"nofollow\"");
    }

    [Test]
    public async Task Switch_on_uses_the_three_path_hero()
    {
        (await RenderAsync(SupportedCultures.DefaultCode, enabled: true)).ShouldContain("Drei Wege");
    }

    private static Task<string> RenderAsync(string culture, bool enabled)
        => InstallPageRenderer.RenderAsync(culture, enabled);

    private static string StoreLink(string culture) => HtmlEncoder.Default.Encode(StoreRegionPageUrl + culture);
}
