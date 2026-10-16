// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The mode styles must not change any page that has no expert-mode switch: every selector of the mode section of
/// tailwind-input.css (from its marker comment to the end of the file) is scoped by the simple body class or by a hook
/// that only exists with a visible switch, and pages without switch render none of those hooks. While
/// SimpleMode:Enabled is off no page renders any mode hook at all. The header and the content wrapper carry their
/// mode modifier classes directly, so they change in the same DOM patch as the page on in-circuit navigation.
/// </summary>
[TestFixture]
public class ModeStyleScopeTests
{
    private const string TailwindInput = "tailwind-input.css";
    private const string ModeSectionMarker = "/* Simple / expert mode";
    private const string SwitchRoleHook = "role=\"switch\"";
    private const string NavClassPattern = "<nav class=\"([^\"]*)\"";
    private const string SiteMainClassPattern = "<div class=\"(site-main[^\"]*)\"";
    private const char SelectorSeparator = ',';
    private const char ClassSeparator = ' ';
    private const char AtRulePrefix = '@';

    private static readonly string[] ScopedSelectorHooks = { ".mode-simple", ".site-main", ".site-header-modes", ".site-header-simple", ".site-header-expert", ".mode-switch" };
    private static readonly string[] AnyModeMarkupHooks = { "mode-simple", "mode-expert", "site-main", "site-header-", "mode-switch", SwitchRoleHook };
    private static readonly string[] SwitchOnlyMarkupHooks = { "site-main", "site-header-", "mode-switch", SwitchRoleHook };
    private static readonly Regex CommentPattern = new(@"/\*.*?\*/", RegexOptions.Singleline);
    private static readonly Regex PreludePattern = new(@"([^{};]+)\{");

    [Test]
    public void Every_selector_of_the_mode_section_is_scoped()
    {
        var selectors = ModeSectionSelectors().ToList();
        var unscoped = selectors
            .Where(selector => !ScopedSelectorHooks.Any(hook => selector.Contains(hook, StringComparison.Ordinal)))
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

        foreach (var hook in AnyModeMarkupHooks)
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

    [TestCase("/land-ch", "site-header-simple", "site-main-simple", "site-header-expert", "site-main-expert")]
    [TestCase("/land-ch/experten", "site-header-expert", "site-main-expert", "site-header-simple", "site-main-simple")]
    [TestCase("/land-ch/spitex", "site-header-expert", "site-main-expert", "site-header-simple", "site-main-simple")]
    public async Task Header_and_content_with_switch_carry_their_mode_classes(string path, string header, string content, string otherHeader, string otherContent)
    {
        var html = await GetHtmlAsync(enabled: true, path);
        var navClasses = Classes(html, NavClassPattern);
        var mainClasses = Classes(html, SiteMainClassPattern);

        navClasses.ShouldContain("glass-nav");
        navClasses.ShouldContain("site-header-modes");
        navClasses.ShouldContain(header);
        navClasses.ShouldNotContain(otherHeader);
        mainClasses.ShouldContain("site-main");
        mainClasses.ShouldContain(content);
        mainClasses.ShouldNotContain(otherContent);
    }

    private static string[] Classes(string html, string pattern)
    {
        var match = Regex.Match(html, pattern);
        match.Success.ShouldBeTrue(pattern);
        return match.Groups[1].Value.Split(ClassSeparator, StringSplitOptions.RemoveEmptyEntries);
    }

    private static IEnumerable<string> ModeSectionSelectors()
    {
        var source = MarketingProjectPaths.ReadSource(TailwindInput);
        var start = source.IndexOf(ModeSectionMarker, StringComparison.Ordinal);
        start.ShouldBeGreaterThanOrEqualTo(0, ModeSectionMarker);
        var css = CommentPattern.Replace(source[start..], string.Empty);

        return PreludePattern.Matches(css)
            .Select(match => match.Groups[1].Value.Trim())
            .Where(prelude => prelude.Length > 0 && prelude[0] != AtRulePrefix)
            .SelectMany(prelude => prelude.Split(SelectorSeparator))
            .Select(selector => selector.Trim());
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
