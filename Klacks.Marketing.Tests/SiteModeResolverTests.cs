// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Table test of the mode switch: state per page type, target URL of the opposite page, hidden in cultures without a
/// simple page and while the feature is off; no body class at all while the feature is off. The resolver is pure, so the
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
        var state = SiteModeResolver.Resolve(path, enabled);

        state.ShowSwitch.ShouldBeTrue();
        state.IsSimple.ShouldBe(isSimple);
        state.SwitchTarget.ShouldBe(target);
        state.CultureCode.ShouldBe(SupportedCultures.DefaultCode);
        state.BodyClass.ShouldBe(isSimple ? SiteModes.SimpleBodyClass : SiteModes.ExpertBodyClass);
    }

    [TestCase("/fr/land-ch", true, "fr")]
    [TestCase("/en/land-gb/experten", true, "en")]
    [TestCase("/FR/land-ch", true, "fr")]
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
}
