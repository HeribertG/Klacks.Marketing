// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Shared;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The expert-mode switch is a real link to the opposite page with role="switch", aria-checked and a visible label, so
/// it works before and without the circuit; off on the simple page and on elsewhere, hidden in cultures without a simple
/// page and while the feature is off, Space activates it like Enter, and it follows an in-circuit navigation without a
/// reload.
/// </summary>
[TestFixture]
public class ExpertModeSwitchTests
{
    private const string SwitchMarker = "role=\"switch\"";
    private const string CheckedMarker = "aria-checked=\"true\"";
    private const string UncheckedMarker = "aria-checked=\"false\"";

    [TestCase("land-ch", false, "/land-ch/experten")]
    [TestCase("land-ch/experten", true, "/land-ch")]
    [TestCase("land-ch/spitex", true, "/land-ch")]
    [TestCase("land-ch/impressum", true, "/land-ch")]
    public async Task Switch_is_a_link_to_the_opposite_page(string path, bool expectedChecked, string target)
    {
        var html = await RenderAsync(path, enabled: true);

        html.ShouldContain(SwitchMarker);
        html.ShouldContain($"<a href=\"{target}\"");
        html.ShouldContain(expectedChecked ? CheckedMarker : UncheckedMarker);
        html.ShouldNotContain(expectedChecked ? UncheckedMarker : CheckedMarker);
        html.ShouldContain("data-c=\"ExpertToggle\"");
        html.ShouldContain("Expertenmodus");
        html.ShouldNotContain("type=\"checkbox\"");
    }

    [Test]
    public void Space_activates_the_switch_like_enter()
    {
        var script = MarketingProjectPaths.ReadSource("wwwroot/js/site-mode.js");

        script.ShouldContain("addEventListener('keydown'");
        script.ShouldContain("[role=\"switch\"]");
        script.ShouldContain(".click()");
    }

    [Test]
    public void Mode_script_does_nothing_without_a_mode_class()
    {
        MarketingProjectPaths.ReadSource("wwwroot/js/site-mode.js").ShouldContain("if (!modeClass)");
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
