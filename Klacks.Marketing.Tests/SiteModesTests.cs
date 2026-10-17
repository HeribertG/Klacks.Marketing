// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The simple start page exists only in the explicitly listed cultures (de, en, fr, it) and only while the feature is
/// switched on; the expert start route is "/{country}/experten" for the default culture and
/// "/{culture}/{country}/experten" for prefixed cultures, recognised regardless of case. Spanish is the reference culture
/// without a simple page in the routing and header tests, so it must stay off the list until those tests move on.
/// </summary>
[TestFixture]
public class SiteModesTests
{
    [TestCase("de", true, true)]
    [TestCase("de", false, false)]
    [TestCase("fr", true, true)]
    [TestCase("en", true, true)]
    [TestCase("it", true, true)]
    [TestCase("IT", true, true)]
    [TestCase("it", false, false)]
    [TestCase("es", true, false)]
    [TestCase("ja", true, false)]
    public void Simple_page_exists_only_for_listed_cultures_while_enabled(string culture, bool enabled, bool expected)
    {
        SiteModes.HasSimplePage(culture, enabled).ShouldBe(expected);
    }

    [Test]
    public void The_simple_page_cultures_are_an_explicit_list()
    {
        SiteModes.SimplePageCultures.ShouldBe(new[] { SupportedCultures.DefaultCode, "en", "fr", "it" });
        SiteModes.SimplePageCultures.ShouldAllBe(code => SupportedCultures.All.Any(culture => culture.Code == code));
    }

    [Test]
    public void Expert_route_path_appends_the_expert_slug_to_the_country()
    {
        SiteModes.ExpertRoutePath("land-ch").ShouldBe("land-ch/experten");
    }

    [TestCase("/land-ch/experten", true, "de")]
    [TestCase("/LAND-CH/EXPERTEN/", true, "de")]
    [TestCase("/fr/land-ch/experten", true, "fr")]
    [TestCase("/EN/land-gb/experten", true, "en")]
    [TestCase("/es/land-es/experten", true, "es")]
    [TestCase("/zh-cn/land-cn/experten", true, "zh-CN")]
    [TestCase("/xx/land-ch/experten", false, "de")]
    [TestCase("/de/land-ch/experten", false, "de")]
    [TestCase("/land-ch", false, "de")]
    [TestCase("/fr/land-ch", false, "de")]
    [TestCase("/land-ch/spitex", false, "de")]
    [TestCase("/experten", false, "de")]
    [TestCase("/fr/land-ch/experten/x", false, "de")]
    public void Expert_start_path_is_recognised_with_its_culture(string path, bool expected, string culture)
    {
        SiteModes.TryGetExpertStartCulture(path, out var code).ShouldBe(expected);
        SiteModes.IsExpertStartPath(path).ShouldBe(expected);
        code.ShouldBe(culture);
    }

    [Test]
    public void Feature_is_off_by_default()
    {
        new SiteModeOptions().Enabled.ShouldBeFalse();
    }
}
