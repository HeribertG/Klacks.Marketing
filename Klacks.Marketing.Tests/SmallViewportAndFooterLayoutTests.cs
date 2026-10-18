// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Layout guards of the simple start page: the H1 shrinks fluidly on narrow phones (so the longest compound word of any
/// culture fits the column without a mid-word break, because soft hyphens are forbidden) and the footer copyright is an
/// LTR island inside RTL pages, whose footer text gets a larger size and no letter-spacing.
/// </summary>
[TestFixture]
public class SmallViewportAndFooterLayoutTests
{
    private const string H1ClassPattern = @"<h1\b[^>]*\bclass=""([^""]*)""";
    private const string CopyrightSpanPattern = @"<span dir=""ltr"" class=""footer-copyright[^""]*"">\s*(?:<!--.*?-->)?\s*(?:&copy;|©)";
    private const string FluidHeadlineClass = "text-[clamp(1.5rem,7.5vw,2.25rem)]";
    private const string FluidDesktopHeadlineClass = "lg:text-[clamp(2rem,calc((100vw-7.5rem)/24.2),2.625rem)]";
    private const string FixedSmallHeadlineClass = "text-[2rem]";
    private const string FluidHeadlineRule = "font-size:clamp(1.5rem,7.5vw,2.25rem)";
    private const string FluidDesktopHeadlineRule = "font-size:clamp(2rem,calc(4.13223vw - .30992rem),2.625rem)";
    private const string FooterRtlRulePattern = @"\[dir=""rtl""\]\s*\.footer-meta\s*,\s*\[dir=""rtl""\]\s*\.footer-meta\s+a\s*\{([^}]*)\}";
    private const string RtlLetterSpacing = "letter-spacing: 0";
    private const string RtlFontSize = "font-size: 0.8125rem";
    private const string RtlCss = "wwwroot/css/rtl.css";
    private const string SiteCss = "wwwroot/css/site.css";
    private const char ClassSeparator = ' ';

    [TestCase("/land-ch")]
    [TestCase("/da/land-ch")]
    [TestCase("/fi/land-ch")]
    [TestCase("/nb/land-ch")]
    public async Task Simple_hero_title_uses_the_fluid_size_and_keeps_manual_hyphenation(string path)
    {
        var html = await GetHtmlAsync(path);

        var classes = Regex.Match(html, H1ClassPattern).Groups[1].Value.Split(ClassSeparator, StringSplitOptions.RemoveEmptyEntries);
        classes.ShouldContain(FluidHeadlineClass);
        classes.ShouldContain(FluidDesktopHeadlineClass);
        classes.ShouldNotContain(FixedSmallHeadlineClass);
        classes.ShouldContain("hyphens-manual");
        classes.ShouldNotContain("hyphens-auto");
    }

    [Test]
    public void Compiled_site_css_contains_the_fluid_headline_rule()
    {
        var css = MarketingProjectPaths.ReadSource(SiteCss);

        css.ShouldContain(FluidHeadlineRule);
        css.ShouldContain(FluidDesktopHeadlineRule);
    }

    [TestCase("/land-ch")]
    [TestCase("/ar/land-ch")]
    [TestCase("/he/land-ch")]
    public async Task Footer_copyright_is_an_ltr_island(string path)
    {
        var html = await GetHtmlAsync(path);

        Regex.IsMatch(html, CopyrightSpanPattern, RegexOptions.Singleline).ShouldBeTrue(path);
    }

    [Test]
    public void Rtl_stylesheet_enlarges_footer_text_and_drops_letter_spacing()
    {
        var css = MarketingProjectPaths.ReadSource(RtlCss);

        var rule = Regex.Match(css, FooterRtlRulePattern);
        rule.Success.ShouldBeTrue();
        rule.Groups[1].Value.ShouldContain(RtlFontSize);
        rule.Groups[1].Value.ShouldContain(RtlLetterSpacing);
    }

    private static async Task<string> GetHtmlAsync(string path)
    {
        await using var factory = new SimpleModeAppFactory(true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, path);
        return await response.Content.ReadAsStringAsync();
    }
}
