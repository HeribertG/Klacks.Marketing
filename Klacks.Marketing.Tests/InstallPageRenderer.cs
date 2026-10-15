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

/// <summary>
/// Renders the install page template server-side to HTML for a culture and country page, with the office-PC switch
/// and its download URLs taken from in-memory configuration.
/// </summary>
internal static class InstallPageRenderer
{
    public const string BaseUrl = "https://klacks.example/";
    public const string PackageCountryPageKey = "land-ch-installation";
    public const string PackageCountryRoutePath = "land-ch/installation";
    public const string FallbackCountryPageKey = "land-be-installation";
    public const string FallbackCountryRoutePath = "land-be/installation";
    private const string BaseUrlSetting = "Site:BaseUrl";

    public static async Task<string> RenderAsync(
        string culture,
        bool enabled,
        string? windowsUrl = null,
        string? macUrl = null,
        string pageKey = PackageCountryPageKey,
        string routePath = PackageCountryRoutePath)
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
            .AddSingleton<NavigationManager>(new TestNavigationManager(BaseUrl, routePath))
            .AddSingleton<IJSRuntime>(new NoOpJsRuntime())
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<InstallPageTemplate>(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(InstallPageTemplate.PageKey)] = pageKey,
                [nameof(InstallPageTemplate.RoutePath)] = routePath,
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
