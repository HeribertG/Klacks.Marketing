// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Shared;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The expert-mode switch is a real checkbox with role="switch" and a label, off on the simple page and on elsewhere,
/// hidden in cultures without a simple page and while the feature is off, and it follows an in-circuit navigation
/// without a reload.
/// </summary>
[TestFixture]
public class ExpertModeSwitchTests
{
    private const string SwitchMarker = "role=\"switch\"";
    private const string CheckedMarker = " checked";

    [TestCase("land-ch", false)]
    [TestCase("land-ch/experten", true)]
    [TestCase("land-ch/spitex", true)]
    [TestCase("land-ch/impressum", true)]
    public async Task Switch_state_follows_the_page_type(string path, bool expectedChecked)
    {
        var html = await RenderAsync(path, enabled: true);

        html.ShouldContain(SwitchMarker);
        html.ShouldContain("type=\"checkbox\"");
        html.ShouldContain("data-c=\"ExpertToggle\"");
        html.ShouldContain("Expertenmodus");
        html.Contains(CheckedMarker).ShouldBe(expectedChecked);
    }

    [TestCase("fr/land-ch", true)]
    [TestCase("land-ch", false)]
    public async Task Switch_is_hidden_without_a_simple_page(string path, bool enabled)
    {
        (await RenderAsync(path, enabled)).ShouldNotContain(SwitchMarker);
    }

    [Test]
    public async Task Switch_follows_an_in_circuit_navigation()
    {
        var navigation = new NavigableNavigationManager(MarketingComponentHost.BaseUrl, "land-ch");
        await using var services = MarketingComponentHost.CreateServices(navigation);
        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);

        var output = await renderer.Dispatcher.InvokeAsync(() => renderer.RenderComponentAsync<ExpertModeSwitch>(ParameterView.Empty));
        (await renderer.Dispatcher.InvokeAsync(output.ToHtmlString)).Contains(CheckedMarker).ShouldBeFalse();

        await renderer.Dispatcher.InvokeAsync(() => navigation.NavigateTo("/land-ch/experten"));
        await output.QuiescenceTask;

        (await renderer.Dispatcher.InvokeAsync(output.ToHtmlString)).Contains(CheckedMarker).ShouldBeTrue();
    }

    [Test]
    public void Switch_stores_nothing()
    {
        var source = MarketingProjectPaths.ReadSource("Shared/ExpertModeSwitch.razor") + MarketingProjectPaths.ReadSource("wwwroot/js/site-mode.js");

        source.ShouldNotContain("localStorage");
        source.ShouldNotContain("sessionStorage");
        source.ShouldNotContain("cookie", Case.Insensitive);
    }

    private static async Task<string> RenderAsync(string path, bool enabled)
    {
        await using var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, path), simpleModeEnabled: enabled);

        return await MarketingComponentHost.RenderAsync<ExpertModeSwitch>(services, new Dictionary<string, object?>());
    }
}
