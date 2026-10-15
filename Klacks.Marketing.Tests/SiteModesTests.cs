// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The simple start page exists only in the explicitly listed cultures and only while the feature is switched on; the
/// expert start route is "/{country}/experten" and is recognised regardless of case.
/// </summary>
[TestFixture]
public class SiteModesTests
{
    [TestCase("de", true, true)]
    [TestCase("de", false, false)]
    [TestCase("fr", true, false)]
    [TestCase("en", true, false)]
    public void Simple_page_exists_only_for_listed_cultures_while_enabled(string culture, bool enabled, bool expected)
    {
        SiteModes.HasSimplePage(culture, enabled).ShouldBe(expected);
    }

    [Test]
    public void Only_the_default_culture_has_a_simple_page_in_stage_one()
    {
        SiteModes.SimplePageCultures.ShouldBe(new[] { SupportedCultures.DefaultCode });
    }

    [Test]
    public void Expert_route_path_appends_the_expert_slug_to_the_country()
    {
        SiteModes.ExpertRoutePath("land-ch").ShouldBe("land-ch/experten");
    }

    [TestCase("/land-ch/experten", true)]
    [TestCase("/LAND-CH/EXPERTEN/", true)]
    [TestCase("/land-ch", false)]
    [TestCase("/fr/land-ch/experten", false)]
    [TestCase("/land-ch/spitex", false)]
    public void Expert_start_path_is_recognised(string path, bool expected)
    {
        SiteModes.IsExpertStartPath(path).ShouldBe(expected);
    }

    [Test]
    public void Feature_is_off_by_default()
    {
        new SiteModeOptions().Enabled.ShouldBeFalse();
    }
}
