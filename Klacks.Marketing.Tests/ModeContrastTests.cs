// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Globalization;
using System.Text.RegularExpressions;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// WCAG contrast of the colour concept, read from the real tailwind.config.js tokens: dark text on Amber passes AA
/// (4.5:1), white on Amber does not (so it must never be used), and both switch tracks, thumbs and the focus ring reach
/// the 3:1 of WCAG 1.4.11 against the header and each other. The dark palette (theme-mode.js) has the same tokens and
/// meets the same minimums for the pairs the pages use. Also checks that the mode styles are in tailwind-input.css and in
/// the built site.css.
/// </summary>
[TestFixture]
public class ModeContrastTests
{
    private const double TextMinimum = 4.5;
    private const double ControlMinimum = 3.0;
    private const string TokenPatternFormat = "\"{0}\":\\s*\"#([0-9A-Fa-f]{{6}})\"";
    private const string AnyTokenPattern = "\"([a-z-]+)\":\\s*\"#[0-9A-Fa-f]{6}\"";
    private const string DarkPaletteMarker = "const darkColors";
    private const double LinearThreshold = 0.03928;
    private const double LinearDivisor = 12.92;
    private const double GammaOffset = 0.055;
    private const double GammaDivisor = 1.055;
    private const double Gamma = 2.4;
    private const double RedWeight = 0.2126;
    private const double GreenWeight = 0.7152;
    private const double BlueWeight = 0.0722;
    private const double LuminanceFlare = 0.05;
    private const double ChannelMaximum = 255.0;
    private const int ChannelLength = 2;
    private const int RedOffset = 0;
    private const int GreenOffset = 2;
    private const int BlueOffset = 4;

    [TestCase("on-tertiary-fixed", "tertiary-fixed", TextMinimum)]
    [TestCase("primary", "secondary-fixed", TextMinimum)]
    [TestCase("on-surface-variant", "secondary-fixed", TextMinimum)]
    [TestCase("secondary", "surface-container-lowest", TextMinimum)]
    [TestCase("on-tertiary-fixed-variant", "background", ControlMinimum)]
    [TestCase("secondary", "background", ControlMinimum)]
    [TestCase("on-secondary", "secondary", ControlMinimum)]
    [TestCase("primary", "background", ControlMinimum)]
    public void Token_pair_reaches_the_minimum_contrast(string foreground, string background, double minimum)
    {
        Ratio(Token(foreground), Token(background)).ShouldBeGreaterThanOrEqualTo(minimum, $"{foreground} on {background}");
    }

    [TestCase("on-surface", "background", TextMinimum)]
    [TestCase("on-surface-variant", "background", TextMinimum)]
    [TestCase("on-surface-variant", "surface-container-high", TextMinimum)]
    [TestCase("on-surface-variant", "secondary-fixed", TextMinimum)]
    [TestCase("primary", "background", TextMinimum)]
    [TestCase("primary", "secondary-fixed", TextMinimum)]
    [TestCase("on-primary", "primary", TextMinimum)]
    [TestCase("secondary", "surface-container-lowest", TextMinimum)]
    [TestCase("secondary", "surface-container", TextMinimum)]
    [TestCase("on-secondary", "secondary-fill", TextMinimum)]
    [TestCase("ink-muted", "background", TextMinimum)]
    [TestCase("ink-subtle", "chrome", TextMinimum)]
    [TestCase("link-hover", "chrome", TextMinimum)]
    [TestCase("on-tertiary-fixed", "tertiary-fixed", TextMinimum)]
    [TestCase("on-tertiary-fixed-variant", "background", ControlMinimum)]
    [TestCase("secondary", "background", ControlMinimum)]
    public void Dark_token_pair_reaches_the_minimum_contrast(string foreground, string background, double minimum)
    {
        Ratio(DarkToken(foreground), DarkToken(background)).ShouldBeGreaterThanOrEqualTo(minimum, $"{foreground} on {background}");
    }

    [TestCase("on-secondary", "secondary-fill", TextMinimum)]
    [TestCase("ink-muted", "background", TextMinimum)]
    [TestCase("ink-subtle", "chrome", TextMinimum)]
    [TestCase("link-hover", "chrome", TextMinimum)]
    public void Light_token_pair_of_the_new_tokens_reaches_the_minimum_contrast(string foreground, string background, double minimum)
    {
        Ratio(Token(foreground), Token(background)).ShouldBeGreaterThanOrEqualTo(minimum, $"{foreground} on {background}");
    }

    [Test]
    public void Dark_palette_defines_exactly_the_light_tokens()
    {
        var parts = MarketingProjectPaths.ReadSource("tailwind.config.js").Split(DarkPaletteMarker);

        parts.Length.ShouldBe(2);
        TokenNames(parts[1]).ShouldBe(TokenNames(parts[0]));
    }

    [Test]
    public void White_on_amber_fails_aa_and_is_therefore_never_used()
    {
        Ratio(Token("on-tertiary"), Token("tertiary-fixed")).ShouldBeLessThan(TextMinimum);
    }

    [Test]
    public void Mode_styles_are_written_out_in_the_tailwind_input()
    {
        var css = MarketingProjectPaths.ReadSource("tailwind-input.css");

        css.ShouldContain("body.mode-simple");
        css.ShouldContain(".site-main-simple");
        css.ShouldContain(".site-main-expert");
        css.ShouldContain(".site-header-simple");
        css.ShouldContain(".site-header-expert");
        css.ShouldContain("--site-header-row");
        css.ShouldContain(".mode-switch-track");
        css.ShouldContain(".mode-switch[aria-checked=\"true\"]");
        css.ShouldContain(".mode-switch:focus-visible");
        css.ShouldContain("--site-header-extra");
        css.ShouldContain("scroll-padding-top");
        MarketingProjectPaths.ReadSource("wwwroot/css/site.css").ShouldContain("mode-switch-track");
    }

    [Test]
    public void Built_css_contains_the_dark_palette()
    {
        MarketingProjectPaths.ReadSource("tailwind.config.js").ShouldContain("safelist: [\"dark\"]");
        MarketingProjectPaths.ReadSource("wwwroot/css/site.css").ShouldContain(":root.dark{");
    }

    private static string Token(string name)
    {
        var match = Regex.Match(MarketingProjectPaths.ReadSource("tailwind.config.js"), string.Format(CultureInfo.InvariantCulture, TokenPatternFormat, Regex.Escape(name)));
        match.Success.ShouldBeTrue(name);
        return match.Groups[1].Value;
    }

    private static string DarkToken(string name)
    {
        var darkPalette = MarketingProjectPaths.ReadSource("tailwind.config.js").Split(DarkPaletteMarker)[1];
        var match = Regex.Match(darkPalette, string.Format(CultureInfo.InvariantCulture, TokenPatternFormat, Regex.Escape(name)));
        match.Success.ShouldBeTrue(name);
        return match.Groups[1].Value;
    }

    private static List<string> TokenNames(string source)
        => Regex.Matches(source, AnyTokenPattern).Select(match => match.Groups[1].Value).OrderBy(name => name, StringComparer.Ordinal).ToList();

    private static double Ratio(string first, string second)
    {
        var a = Luminance(first);
        var b = Luminance(second);
        return (Math.Max(a, b) + LuminanceFlare) / (Math.Min(a, b) + LuminanceFlare);
    }

    private static double Luminance(string hex)
    {
        double Channel(int offset)
        {
            var value = int.Parse(hex.Substring(offset, ChannelLength), NumberStyles.HexNumber, CultureInfo.InvariantCulture) / ChannelMaximum;
            return value <= LinearThreshold ? value / LinearDivisor : Math.Pow((value + GammaOffset) / GammaDivisor, Gamma);
        }

        return RedWeight * Channel(RedOffset) + GreenWeight * Channel(GreenOffset) + BlueWeight * Channel(BlueOffset);
    }
}
