// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Analytics;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Every event name written into the markup (data-c, data-c-play) is accepted by POST /_c, so no click is silently
/// dropped with 400; c.js derives the early toggle from a 10-second page clock and counts the first play per video,
/// and the layout restarts both on every in-circuit navigation.
/// </summary>
[TestFixture]
public class ClientEventMarkupGuardTests
{
    private const string EventAttributePattern = @"\bdata-c(?:-play)?=""([^""@]+)""";
    private const string ScriptEventLiteralPattern = @"'([A-Z][A-Za-z]+)'";
    private const string ScriptPath = "wwwroot/js/c.js";
    private const string LayoutPath = "Shared/MainLayout.razor";
    private const string PageShownFunction = "klacksC.pageShown";

    [Test]
    public void Every_markup_event_name_is_accepted_by_the_endpoint()
    {
        var names = Directory.EnumerateFiles(MarketingProjectPaths.ProjectRoot, "*.razor", SearchOption.AllDirectories)
            .Where(file => !file.Contains(Path.DirectorySeparatorChar + "bin" + Path.DirectorySeparatorChar)
                && !file.Contains(Path.DirectorySeparatorChar + "obj" + Path.DirectorySeparatorChar))
            .SelectMany(file => Regex.Matches(File.ReadAllText(file), EventAttributePattern).Select(match => match.Groups[1].Value))
            .Distinct()
            .ToList();

        names.ShouldNotBeEmpty();
        names.ShouldAllBe(name => ClientEventEndpoint.AcceptedEventNames.Contains(name));
    }

    [Test]
    public void Client_script_derives_the_early_toggle_and_counts_video_plays()
    {
        var script = MarketingProjectPaths.ReadSource(ScriptPath);

        script.ShouldContain("'ExpertToggleEarly'");
        script.ShouldContain("10000");
        script.ShouldContain("data-c-play");
        script.ShouldContain("pageShown");
        ClientEventEndpoint.AcceptedEventNames.ShouldContain(nameof(VisitEvent.ExpertToggleEarly));
        script.ShouldNotContain("localStorage");
        script.ShouldNotContain("document.cookie");
    }

    [Test]
    public void Every_event_name_literal_in_the_script_is_accepted_by_the_endpoint()
    {
        var literals = Regex.Matches(MarketingProjectPaths.ReadSource(ScriptPath), ScriptEventLiteralPattern)
            .Select(match => match.Groups[1].Value)
            .Distinct()
            .ToList();

        literals.ShouldNotBeEmpty();
        literals.ShouldAllBe(name => ClientEventEndpoint.AcceptedEventNames.Contains(name));
    }

    [Test]
    public void Page_shown_ignores_navigations_that_keep_path_and_query()
    {
        var script = MarketingProjectPaths.ReadSource(ScriptPath);

        script.ShouldContain("new Set()");
        script.ShouldContain("location.pathname + location.search");
        script.ShouldContain("pageKey");
    }

    [Test]
    public void Layout_restarts_the_page_clock_on_every_navigation()
    {
        MarketingProjectPaths.ReadSource(LayoutPath).ShouldContain($"\"{PageShownFunction}\"");
        LocationChangedHandler().ShouldContain("PageShownFunction");
    }

    [Test]
    public void Layout_interop_in_the_navigation_handler_never_breaks_the_ui()
    {
        var handler = LocationChangedHandler();

        handler.ShouldContain("catch (JSDisconnectedException)");
        handler.ShouldContain("catch (JSException)");
        handler.LastIndexOf("PageShownFunction", StringComparison.Ordinal)
            .ShouldBeGreaterThan(handler.IndexOf("ModeApplyFunction", StringComparison.Ordinal));
        handler.LastIndexOf("PageShownFunction", StringComparison.Ordinal)
            .ShouldBeLessThan(handler.IndexOf("StateHasChanged", StringComparison.Ordinal));
    }

    private static string LocationChangedHandler()
    {
        var layout = MarketingProjectPaths.ReadSource(LayoutPath);
        var start = layout.IndexOf("private void HandleLocationChanged", StringComparison.Ordinal);
        var end = layout.IndexOf("private void ToggleMobileMenu", StringComparison.Ordinal);

        return layout[start..end];
    }
}
