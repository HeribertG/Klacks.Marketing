// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.JSInterop;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The "office PC without Docker" install option: every culture carries a complete card including the x64/ARM note,
/// the page is unchanged while NativeInstall:Enabled is off (two cards, two-path hero), and with the switch on every
/// culture renders three cards with the counted Windows package link from the rolling "office-pc" release; the Mac
/// button only appears when NativeInstall:MacUrl is configured.
/// </summary>
[TestFixture]
public class InstallPageNativeOptionTests
{
    private const string BaseUrl = "https://klacks.example/";
    private const string BaseUrlSetting = "Site:BaseUrl";
    private const string InstallPageKey = "installation";
    private const string CountryPageKey = "land-ch-installation";
    private const string CountryRoutePath = "land-ch/installation";
    private const int ExpectedRequirementCount = 4;
    private const int ExpectedStepCount = 3;
    private const string RollingWindowsPackageUrl = "https://github.com/HeribertG/Klacks.Api/releases/download/office-pc/klacks-office-pc-win-x64.zip";
    private const string ConfiguredMacUrl = "https://downloads.example/klacks.pkg";
    private const string DownloadCounterAttribute = "data-c=\"DownloadClick\"";
    private const string EnglishCulture = "en";
    private const string EnglishMacLabel = "Download for Mac";
    private static readonly string[] ArchitectureNoteFacts = ["x64", "ARM", "Snapdragon X"];

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
        new[] { native.Path.Title, native.Path.Text, native.Path.DownloadLabel, native.MacDownloadLabel, native.ArchitectureNote, native.LinuxNote, native.HeroSubtitle }
            .ShouldAllBe(text => !string.IsNullOrWhiteSpace(text));
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

    private static async Task<string> RenderAsync(string culture, bool enabled, string? windowsUrl = null, string? macUrl = null)
    {
        var environment = new TestWebHostEnvironment();
        var settings = new Dictionary<string, string?>
        {
            [BaseUrlSetting] = BaseUrl,
            [NativeInstallSettings.EnabledKey] = enabled.ToString(),
            [NativeInstallSettings.WindowsUrlKey] = windowsUrl,
            [NativeInstallSettings.MacUrlKey] = macUrl,
        };
        var services = new ServiceCollection()
            .AddSingleton<IWebHostEnvironment>(environment)
            .AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(settings).Build())
            .AddSingleton<IPageContentProvider>(new JsonPageContentProvider(environment))
            .AddSingleton<NavigationManager>(new TestNavigationManager(BaseUrl, CountryRoutePath))
            .AddSingleton<IJSRuntime>(new NoOpJsRuntime())
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<InstallPageTemplate>(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(InstallPageTemplate.PageKey)] = CountryPageKey,
                [nameof(InstallPageTemplate.RoutePath)] = CountryRoutePath,
                [nameof(InstallPageTemplate.Culture)] = culture,
            }));
            return output.ToHtmlString();
        });
    }

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

    private sealed class TestNavigationManager : NavigationManager
    {
        public TestNavigationManager(string baseUrl, string path)
        {
            Initialize(baseUrl, baseUrl + path);
        }

        protected override void NavigateToCore(string uri, bool forceLoad)
        {
        }
    }

    private sealed class NoOpJsRuntime : IJSRuntime
    {
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args) => ValueTask.FromResult(default(TValue)!);

        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args) =>
            ValueTask.FromResult(default(TValue)!);
    }
}
