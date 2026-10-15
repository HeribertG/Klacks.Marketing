// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.JSInterop;

/// <summary>
/// Services and static rendering for component tests against the real content files, screenshots and recordings.
/// </summary>
/// <param name="navigation">Navigation manager placed at the page under test</param>
/// <param name="videoCatalog">Optional replacement for the real video catalog</param>
/// <param name="simpleModeEnabled">Value of SimpleMode:Enabled</param>
internal static class MarketingComponentHost
{
    public const string BaseUrl = "https://klacks.example/";

    private const string BaseUrlSetting = "Site:BaseUrl";

    public static ServiceProvider CreateServices(NavigationManager navigation, ILocalizedVideoCatalog? videoCatalog = null, bool simpleModeEnabled = true)
    {
        var environment = new TestWebHostEnvironment();

        return new ServiceCollection()
            .AddSingleton<IWebHostEnvironment>(environment)
            .AddSingleton<IConfiguration>(new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { [BaseUrlSetting] = BaseUrl })
                .Build())
            .AddSingleton<IPageContentProvider>(new JsonPageContentProvider(environment))
            .AddSingleton<ILocalizedScreenshotResolver>(new LocalizedScreenshotResolver(environment.WebRootFileProvider))
            .AddSingleton(videoCatalog ?? new LocalizedVideoCatalog(environment.WebRootFileProvider))
            .AddSingleton(navigation)
            .AddSingleton<IJSRuntime>(new NullJsRuntime())
            .AddSingleton<IOptions<SiteModeOptions>>(Options.Create(new SiteModeOptions { Enabled = simpleModeEnabled }))
            .BuildServiceProvider();
    }

    public static async Task<string> RenderAsync<TComponent>(IServiceProvider services, IDictionary<string, object?> parameters)
        where TComponent : IComponent
    {
        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);

        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<TComponent>(ParameterView.FromDictionary(parameters));
            return output.ToHtmlString();
        });
    }
}
