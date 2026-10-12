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
/// The "office PC without Docker" install option: every culture carries a complete card, the page is unchanged while
/// NativeInstall:Enabled is off (two cards, two-path hero), and with the switch on every culture renders three cards
/// with the Windows and Mac installer links.
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
        new[] { native.Path.Title, native.Path.Text, native.Path.DownloadLabel, native.MacDownloadLabel, native.LinuxNote, native.HeroSubtitle }
            .ShouldAllBe(text => !string.IsNullOrWhiteSpace(text));
    }

    [Test]
    public async Task Switch_off_keeps_the_two_card_page()
    {
        var html = await RenderAsync(SupportedCultures.DefaultCode, enabled: false);

        html.ShouldContain("lg:grid-cols-2");
        html.ShouldNotContain(ExternalLinks.NativeWindowsInstallerUrl);
        html.ShouldNotContain(ExternalLinks.NativeMacInstallerUrl);
        html.ShouldContain("Zwei Wege");
    }

    [TestCaseSource(nameof(Cultures))]
    public async Task Switch_on_shows_the_office_pc_card_with_both_installers(string culture)
    {
        var html = await RenderAsync(culture, enabled: true);

        html.ShouldContain("lg:grid-cols-3");
        html.ShouldContain(ExternalLinks.NativeWindowsInstallerUrl);
        html.ShouldContain(ExternalLinks.NativeMacInstallerUrl);
    }

    [Test]
    public async Task Switch_on_uses_the_three_path_hero_and_configured_urls()
    {
        const string windowsUrl = "https://downloads.example/klacks.exe";
        const string macUrl = "https://downloads.example/klacks.pkg";

        var html = await RenderAsync(SupportedCultures.DefaultCode, enabled: true, windowsUrl, macUrl);

        html.ShouldContain("Drei Wege");
        html.ShouldContain(windowsUrl);
        html.ShouldContain(macUrl);
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
