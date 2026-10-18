// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The simple start page exists in every supported culture (the list is derived from SupportedCultures.All) and only
/// while the feature is switched on; a code that is not a supported culture has none. The expert start route is
/// "/{country}/experten" for the default culture and "/{culture}/{country}/experten" for prefixed cultures, recognised
/// regardless of case.
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
    [TestCase("es", true, true)]
    [TestCase("es", false, false)]
    [TestCase("ja", true, true)]
    [TestCase("zh-CN", true, true)]
    [TestCase("zh-cn", true, true)]
    [TestCase("zh-TW", false, false)]
    [TestCase("xx", true, false)]
    [TestCase("", true, false)]
    public void Simple_page_exists_for_every_supported_culture_while_enabled(string culture, bool enabled, bool expected)
    {
        SiteModes.HasSimplePage(culture, enabled).ShouldBe(expected);
    }

    [Test]
    public void The_simple_page_cultures_are_exactly_the_supported_cultures()
    {
        SiteModes.SimplePageCultures.ShouldBe(SupportedCultures.All.Select(culture => culture.Code));
        SiteModes.SimplePageCultures.ShouldBeUnique();
        SiteModes.SimplePageCultures.Count.ShouldBe(25);
    }

    [Test]
    public void Every_supported_culture_has_a_simple_page_and_an_expert_route_while_enabled()
    {
        foreach (var culture in SupportedCultures.All)
        {
            SiteModes.HasSimplePage(culture.Code, enabled: true).ShouldBeTrue(culture.Code);
            SiteModes.HasSimplePage(culture.Code, enabled: false).ShouldBeFalse(culture.Code);

            var path = culture.UrlSlug.Length == 0 ? "/land-ch/experten" : $"/{culture.UrlSlug}/land-ch/experten";
            SiteModes.TryGetExpertStartCulture(path, out var code).ShouldBeTrue(path);
            code.ShouldBe(culture.Code, path);
        }
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
