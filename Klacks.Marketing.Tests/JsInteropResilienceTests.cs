// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Shared;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Blazor Server kills the whole circuit when a component's first-render JS interop throws, so a site script that is not
/// yet (or no longer) defined must never take a page down: the components fall back to their defaults, and the layout
/// starts the circuit only after every site script has run. The static HtmlRenderer skips OnAfterRenderAsync, so these
/// tests render with a renderer that runs it and records the exceptions that would end the circuit.
/// </summary>
[TestFixture]
public class JsInteropResilienceTests
{
    private const string LayoutRelativePath = "Pages/_Layout.cshtml";
    private const string BlazorScriptSource = "~/_framework/blazor.server.js";
    private const string SiteScriptPrefix = "~/js/";
    private const string ScriptSrcAttribute = "<script src=\"";
    private const string PagePath = "land-ch";
    private const string Culture = "de";
    private const string UndefinedScriptMessage = "Could not find 'klacksCarouselControls.prefersReducedMotion' ('klacksCarouselControls' was undefined).";

    [Test]
    public async Task Carousel_does_not_end_the_circuit_when_the_controls_script_is_not_defined_yet()
    {
        var circuitExceptions = await RenderCarouselAsync(new ThrowingJsRuntime(new JSException(UndefinedScriptMessage)));

        circuitExceptions.ShouldBeEmpty();
    }

    [Test]
    public async Task Carousel_does_not_end_the_circuit_when_the_connection_is_already_gone()
    {
        var circuitExceptions = await RenderCarouselAsync(new ThrowingJsRuntime(new JSDisconnectedException(UndefinedScriptMessage)));

        circuitExceptions.ShouldBeEmpty();
    }

    [Test]
    public async Task Carousel_calls_the_controls_script_so_the_tests_above_exercise_the_guard()
    {
        var jsRuntime = new ThrowingJsRuntime(new JSException(UndefinedScriptMessage));

        await RenderCarouselAsync(jsRuntime);

        jsRuntime.Calls.ShouldContain("klacksCarouselControls.prefersReducedMotion");
    }

    [Test]
    public async Task Main_layout_does_not_end_the_circuit_when_site_scripts_are_missing_on_first_render()
    {
        var jsRuntime = new ThrowingJsRuntime(new JSException(UndefinedScriptMessage));
        var navigation = new NavigableNavigationManager(MarketingComponentHost.BaseUrl, PagePath);
        await using var services = MarketingComponentHost.CreateServices(navigation, jsRuntime: jsRuntime);
        await using var renderer = new AfterRenderTestRenderer(services);

        await renderer.RenderAsync<MainLayout>(new Dictionary<string, object?>
        {
            [nameof(MainLayout.Body)] = (RenderFragment)(_ => { }),
        });

        renderer.CircuitExceptions.ShouldBeEmpty();
        jsRuntime.Calls.ShouldContain("klacksScrollReveal.init");
    }

    [Test]
    public void Blazor_circuit_script_is_loaded_after_every_site_script()
    {
        var layout = MarketingProjectPaths.ReadSource(LayoutRelativePath);

        var blazorIndex = layout.IndexOf(ScriptSrcAttribute + BlazorScriptSource, StringComparison.Ordinal);
        var lastSiteScriptIndex = layout.LastIndexOf(ScriptSrcAttribute + SiteScriptPrefix, StringComparison.Ordinal);

        blazorIndex.ShouldBeGreaterThan(-1);
        lastSiteScriptIndex.ShouldBeGreaterThan(-1);
        blazorIndex.ShouldBeGreaterThan(lastSiteScriptIndex);
    }

    private static async Task<IReadOnlyList<Exception>> RenderCarouselAsync(ThrowingJsRuntime jsRuntime)
    {
        var navigation = new NavigableNavigationManager(MarketingComponentHost.BaseUrl, PagePath);
        await using var services = MarketingComponentHost.CreateServices(navigation, jsRuntime: jsRuntime);
        await using var renderer = new AfterRenderTestRenderer(services);

        await renderer.RenderAsync<DemoVideoCarousel>(new Dictionary<string, object?>
        {
            [nameof(DemoVideoCarousel.Culture)] = Culture,
            [nameof(DemoVideoCarousel.Definition)] = DemoCarousels.DailyOperations,
        });

        return renderer.CircuitExceptions;
    }

    private sealed class ThrowingJsRuntime(Exception exception) : IJSRuntime
    {
        public List<string> Calls { get; } = [];

        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args)
        {
            Calls.Add(identifier);
            return ValueTask.FromException<TValue>(exception);
        }

        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args) =>
            InvokeAsync<TValue>(identifier, args);
    }
}
