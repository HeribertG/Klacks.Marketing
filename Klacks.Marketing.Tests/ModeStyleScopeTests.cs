// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The mode styles must not change any page that has no expert-mode switch: every selector of tailwind-input.css that
/// names a mode hook is scoped by a hook that only exists with a visible switch (the expert body class alone is also
/// set on pages without switch while the feature is on), and pages without switch render none of those hooks. While
/// SimpleMode:Enabled is off no page renders any mode hook at all, so the new rules have no effect.
/// </summary>
[TestFixture]
public class ModeStyleScopeTests
{
    private const string TailwindInput = "tailwind-input.css";
    private const string ExpertBodyHook = "mode-expert";
    private const string SwitchRoleHook = "role=\"switch\"";
    private const string ToplineHeaderClass = "glass-nav no-line-rule site-header-modes";
    private const char SelectorSeparator = ',';
    private const char AtRulePrefix = '@';

    private static readonly string[] ModeHooks = { "mode-simple", ExpertBodyHook, "site-main", "site-header-modes", "mode-switch" };
    private static readonly string[] SwitchOnlySelectorHooks = { ".site-main", ".site-header-modes", ".mode-switch" };
    private static readonly string[] SwitchOnlyMarkupHooks = { "site-main", "site-header-modes", "mode-switch", SwitchRoleHook };
    private static readonly Regex CommentPattern = new(@"/\*.*?\*/", RegexOptions.Singleline);
    private static readonly Regex PreludePattern = new(@"([^{};]+)\{");

    [Test]
    public void Every_expert_mode_selector_is_scoped_to_the_switch_header()
    {
        var selectors = ModeSelectors().ToList();
        var unscoped = selectors
            .Where(selector => selector.Contains(ExpertBodyHook, StringComparison.Ordinal))
            .Where(selector => !SwitchOnlySelectorHooks.Any(hook => selector.Contains(hook, StringComparison.Ordinal)))
            .ToList();

        selectors.ShouldNotBeEmpty();
        unscoped.ShouldBeEmpty();
    }

    [TestCase("/land-ch")]
    [TestCase("/land-ch/spitex")]
    [TestCase("/land-ch/impressum")]
    [TestCase("/fr/land-ch")]
    [TestCase("/it/land-ch/impressum")]
    public async Task Feature_off_renders_no_mode_hook(string path)
    {
        var html = await GetHtmlAsync(enabled: false, path);

        foreach (var hook in ModeHooks.Append(SwitchRoleHook))
        {
            html.ShouldNotContain(hook, Case.Sensitive, $"{path}: {hook}");
        }
    }

    [TestCase("/fr/land-ch")]
    [TestCase("/fr/land-ch/spitex")]
    [TestCase("/it/land-ch/impressum")]
    public async Task Feature_on_page_without_switch_renders_no_switch_only_hook(string path)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        foreach (var hook in SwitchOnlyMarkupHooks)
        {
            html.ShouldNotContain(hook, Case.Sensitive, $"{path}: {hook}");
        }
    }

    [TestCase("/land-ch")]
    [TestCase("/land-ch/experten")]
    public async Task Header_with_switch_carries_the_topline_hook(string path)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        html.ShouldContain(ToplineHeaderClass);
    }

    private static IEnumerable<string> ModeSelectors()
    {
        var css = CommentPattern.Replace(MarketingProjectPaths.ReadSource(TailwindInput), string.Empty);

        return PreludePattern.Matches(css)
            .Select(match => match.Groups[1].Value.Trim())
            .Where(prelude => prelude.Length > 0 && prelude[0] != AtRulePrefix)
            .SelectMany(prelude => prelude.Split(SelectorSeparator))
            .Select(selector => selector.Trim())
            .Where(selector => ModeHooks.Any(hook => selector.Contains(hook, StringComparison.Ordinal)));
    }

    private static async Task<string> GetHtmlAsync(bool enabled, string path)
    {
        await using var factory = new SimpleModeAppFactory(enabled);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, path);
        return await response.Content.ReadAsStringAsync();
    }
}
