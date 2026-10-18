// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Table test of the mode switch: state per page type, target URL of the opposite page, hidden for a path without a
/// supported culture or country and while the feature is off; no body class at all while the feature is off. The resolver is pure, so the
/// same answer holds after in-circuit navigation.
/// </summary>
[TestFixture]
public class SiteModeResolverTests
{
    [TestCase("/land-ch", true, true, "/land-ch/experten")]
    [TestCase("land-ch", true, true, "/land-ch/experten")]
    [TestCase("/land-ch#was-klacksy-tut", true, true, "/land-ch/experten")]
    [TestCase("/LAND-AT", true, true, "/land-at/experten")]
    [TestCase("/land-ch/experten", true, false, "/land-ch")]
    [TestCase("/land-ch/spitex", true, false, "/land-ch")]
    [TestCase("/land-ch/", true, true, "/land-ch/experten")]
    [TestCase("/land-ch/experten/", true, false, "/land-ch")]
    [TestCase("/land-ch?ref=share", true, true, "/land-ch/experten")]
    [TestCase("/land-de/angebot?ref=x#preise", true, false, "/land-de")]
    public void Visible_switch_points_at_the_opposite_page(string path, bool enabled, bool isSimple, string target)
    {
        AssertVisible(path, enabled, isSimple, target, SupportedCultures.DefaultCode);
    }

    [TestCase("/fr/land-ch", true, "/fr/land-ch/experten", "fr")]
    [TestCase("/FR/LAND-CH", true, "/fr/land-ch/experten", "fr")]
    [TestCase("/fr/land-ch/experten", false, "/fr/land-ch", "fr")]
    [TestCase("/en/land-gb", true, "/en/land-gb/experten", "en")]
    [TestCase("/en/land-gb/experten", false, "/en/land-gb", "en")]
    [TestCase("/en/land-ch/spitex", false, "/en/land-ch", "en")]
    [TestCase("/it/land-ch", true, "/it/land-ch/experten", "it")]
    [TestCase("/it/land-it/impressum", false, "/it/land-it", "it")]
    [TestCase("/es/land-es", true, "/es/land-es/experten", "es")]
    [TestCase("/ES/land-es/experten", false, "/es/land-es", "es")]
    [TestCase("/zh-cn/land-tw", true, "/zh-cn/land-tw/experten", "zh-CN")]
    [TestCase("/zh-TW/land-tw/spitex", false, "/zh-tw/land-tw", "zh-TW")]
    public void Visible_switch_in_prefixed_cultures_keeps_the_culture_prefix(string path, bool isSimple, string target, string culture)
    {
        AssertVisible(path, enabled: true, isSimple, target, culture);
    }

    [TestCase("/es/land-es", false, "es")]
    [TestCase("/es/land-es/experten", false, "es")]
    [TestCase("/ES/land-es", false, "es")]
    [TestCase("/fr/land-ch", false, "fr")]
    [TestCase("/es", true, "es")]
    [TestCase("/xx/land-ch", true, "de")]
    [TestCase("/fr", true, "fr")]
    [TestCase("/en", true, "en")]
    [TestCase("/experten", true, "de")]
    [TestCase("/land-ch", false, "de")]
    [TestCase("/land-ch/experten", false, "de")]
    [TestCase("/", true, "de")]
    [TestCase("", true, "de")]
    [TestCase("/land-zz", true, "de")]
    [TestCase(null, true, "de")]
    public void Switch_is_hidden_and_the_page_counts_as_expert(string? path, bool enabled, string culture)
    {
        var state = SiteModeResolver.Resolve(path, enabled);

        state.ShowSwitch.ShouldBeFalse();
        state.IsSimple.ShouldBeFalse();
        state.SwitchTarget.ShouldBeNull();
        state.CultureCode.ShouldBe(culture);
        state.BodyClass.ShouldBe(enabled ? SiteModes.ExpertBodyClass : string.Empty);
    }

    private static void AssertVisible(string path, bool enabled, bool isSimple, string target, string culture)
    {
        var state = SiteModeResolver.Resolve(path, enabled);

        state.ShowSwitch.ShouldBeTrue();
        state.IsSimple.ShouldBe(isSimple);
        state.SwitchTarget.ShouldBe(target);
        state.CultureCode.ShouldBe(culture);
        state.BodyClass.ShouldBe(isSimple ? SiteModes.SimpleBodyClass : SiteModes.ExpertBodyClass);
    }

    [Test]
    public void Every_supported_culture_gets_the_switch_on_the_country_root_and_on_every_other_country_page()
    {
        foreach (var culture in SupportedCultures.All)
        {
            var prefix = culture.UrlSlug.Length == 0 ? string.Empty : $"/{culture.UrlSlug}";

            AssertVisible($"{prefix}/land-ch", enabled: true, isSimple: true, $"{prefix}/land-ch/experten", culture.Code);
            AssertVisible($"{prefix}/land-ch/experten", enabled: true, isSimple: false, $"{prefix}/land-ch", culture.Code);
            AssertVisible($"{prefix}/land-ch/spitex", enabled: true, isSimple: false, $"{prefix}/land-ch", culture.Code);
            SiteModeResolver.Resolve($"{prefix}/land-ch", simpleModeEnabled: false).ShowSwitch.ShouldBeFalse(culture.Code);
        }
    }
}
