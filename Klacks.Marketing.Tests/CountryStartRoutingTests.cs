// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Wave 1 of the website rebuild: every country start page uses the CountryHome dispatcher (simple or expert template), the industry pages
/// stay on IndustryPageTemplate, the mid-size and large business pages are country-scoped like kleine-betriebe, and
/// the retired preview URLs redirect permanently to their production pages.
/// </summary>
[TestFixture]
public class CountryStartRoutingTests
{
    private const string PagesFolder = "Pages";
    private const string CountryPagePattern = "Land??.razor";
    private const string CountryStartTag = @"<CountryHome PageKey=""(land-[a-z]{2})"" Culture=""@ResolvedCulture"" />";
    private const string RoutePattern = @"@page ""/(land-[a-z]{2})""";

    [Test]
    public void Every_country_start_page_uses_the_country_home_dispatcher_with_its_own_page_key()
    {
        var files = Directory.GetFiles(Path.Combine(MarketingProjectPaths.ProjectRoot, PagesFolder), CountryPagePattern);

        files.Length.ShouldBe(CountryIndustries.AllCountries.Count);
        foreach (var file in files)
        {
            var source = File.ReadAllText(file);
            var template = Regex.Match(source, CountryStartTag);
            var route = Regex.Match(source, RoutePattern);

            template.Success.ShouldBeTrue($"{Path.GetFileName(file)} does not use CountryHome");
            route.Success.ShouldBeTrue($"{Path.GetFileName(file)} has no country route");
            template.Groups[1].Value.ShouldBe(route.Groups[1].Value, Path.GetFileName(file));
            source.ShouldNotContain("IndustryPageTemplate");
        }
    }

    [Test]
    public void Country_home_chooses_between_the_simple_and_the_expert_template()
    {
        var source = MarketingProjectPaths.ReadSource("Shared/CountryHome.razor");

        source.ShouldContain("SiteModes.HasSimplePage(");
        source.ShouldContain("<SimpleStartTemplate ");
        source.ShouldContain("<CountryStartTemplate ");
    }

    [TestCase("Pages/LandChSpitex.razor")]
    [TestCase("Pages/LandJpLogistik.razor")]
    [TestCase("Pages/LandChKlacksy.razor")]
    public void Industry_pages_keep_the_industry_page_template(string relativePath)
    {
        var source = MarketingProjectPaths.ReadSource(relativePath);

        source.ShouldContain("<IndustryPageTemplate ");
        source.ShouldNotContain("CountryStartTemplate");
    }

    [TestCase("/vorschau-start", "/land-ch")]
    [TestCase("/vorschau-mittlere-betriebe", "/land-ch/mittlere-betriebe")]
    [TestCase("/vorschau-grosse-betriebe", "/land-ch/grosse-betriebe")]
    [TestCase("/vorschau-start/", "/land-ch")]
    public void Retired_preview_routes_redirect_to_their_production_pages(string source, string target)
    {
        LegacyProductRoutes.ResolveTarget(source).ShouldBe(target);
    }

    [TestCase("/mittlere-betriebe", "/land-ch/mittlere-betriebe")]
    [TestCase("/grosse-betriebe", "/land-ch/grosse-betriebe")]
    [TestCase("/en/mittlere-betriebe", "/en/land-gb/mittlere-betriebe")]
    [TestCase("/ja/grosse-betriebe", "/ja/land-jp/grosse-betriebe")]
    [TestCase("/kleine-betriebe", "/land-ch/kleine-betriebe")]
    [TestCase("/angebot", "/land-ch/angebot")]
    [TestCase("/", "/land-ch")]
    [TestCase("/fr", "/fr/land-fr")]
    public void Country_less_business_pages_and_homepages_redirect_to_the_culture_default_country(string source, string target)
    {
        LegacyProductRoutes.ResolveTarget(source).ShouldBe(target);
    }

    [TestCase("/land-ch")]
    [TestCase("/fr/land-ch")]
    [TestCase("/ar/land-ae")]
    [TestCase("/land-ch/mittlere-betriebe")]
    [TestCase("/land-de/grosse-betriebe")]
    [TestCase("/en/land-gb/mittlere-betriebe")]
    [TestCase("/zh-cn/land-cn/grosse-betriebe")]
    [TestCase("/land-ch/spitex")]
    [TestCase("/land-ch/angebot")]
    [TestCase("/fr/land-fr/angebot")]
    [TestCase("/land-ch/experten")]
    [TestCase("/land-cn/experten")]
    public void Production_pages_are_known_routes(string path)
    {
        KnownPageRoutes.Contains(path).ShouldBeTrue(path);
    }

    [TestCase("/vorschau-start")]
    [TestCase("/vorschau-mittlere-betriebe")]
    [TestCase("/vorschau-grosse-betriebe")]
    [TestCase("/land-xx/mittlere-betriebe")]
    [TestCase("/de/land-ch/grosse-betriebe")]
    [TestCase("/de/land-ch/angebot")]
    [TestCase("/fr/land-ch/experten")]
    [TestCase("/de/land-ch/experten")]
    [TestCase("/land-xx/experten")]
    [TestCase("/en/experten")]
    public void Preview_pages_and_unknown_countries_are_no_component_routes(string path)
    {
        KnownPageRoutes.Contains(path).ShouldBeFalse(path);
    }

    [TestCase("Pages/MittlereBetriebe.razor", "mittlere-betriebe")]
    [TestCase("Pages/GrosseBetriebe.razor", "grosse-betriebe")]
    [TestCase("Pages/Angebot.razor", "angebot")]
    public void Business_size_pages_are_indexable_and_noindex_only_without_own_translation(string relativePath, string slug)
    {
        var source = MarketingProjectPaths.ReadSource(relativePath);

        source.ShouldContain($"@page \"/{{country}}/{slug}\"");
        source.ShouldContain($"@page \"/{{culture}}/{{country}}/{slug}\"");
        source.ShouldContain("<SeoHead ");
        source.ShouldContain("SameForEveryCountry=\"true\"");
        source.ShouldContain("IndexTranslatedOnly=\"true\"");
        source.ShouldNotContain("<meta name=\"robots\"");
        source.ShouldNotContain("PreviewHead");
    }

    [Test]
    public void Preview_only_components_are_gone()
    {
        File.Exists(Path.Combine(MarketingProjectPaths.ProjectRoot, "Pages/VorschauStart.razor")).ShouldBeFalse();
        File.Exists(Path.Combine(MarketingProjectPaths.ProjectRoot, "Shared/PreviewHead.razor")).ShouldBeFalse();
        File.Exists(Path.Combine(MarketingProjectPaths.ProjectRoot, "Shared/PreviewMobilePlaygroundButton.razor")).ShouldBeFalse();
        MarketingProjectPaths.ReadSource("tailwind-input.css").ShouldNotContain("preview-page");
    }

    [Test]
    public void Expert_start_page_has_the_german_only_country_route()
    {
        var source = MarketingProjectPaths.ReadSource("Pages/CountryExpertStart.razor");

        source.ShouldContain("@page \"/{country}/experten\"");
        source.ShouldNotContain("{culture}");
        source.ShouldContain("<CountryStartTemplate ");
        source.ShouldContain("SuppressHreflang=\"true\"");
    }
}
