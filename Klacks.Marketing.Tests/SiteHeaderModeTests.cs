// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The prerendered page carries the mode body class and the header of its mode: the simple page shows only jump links
/// to its own sections, the expert pages keep today's navigation; the logo always leads to the simple page; switching
/// language or country keeps the mode, but never links to an expert start page that a culture does not have. The simple
/// header keeps the country switch on phones as a compact flag button whose dropdown opens above the jump links.
/// </summary>
[TestFixture]
public class SiteHeaderModeTests
{
    private const string BodyClassPattern = @"<body class=""(mode-simple|mode-expert)\b";
    private const string SingleRowHeaderClass = "class=\"flex justify-between items-center gap-4 sm:gap-6 w-full px-4 sm:px-8 py-4 max-w-7xl mx-auto\"";
    private const string SingleRowLinksClass = "class=\"hidden xl:flex items-center gap-4 whitespace-nowrap\"";
    private const string SingleRowActionsClass = "class=\"hidden xl:flex items-center gap-3\"";
    private const string TwoRowHeaderClass = "h-[4.5rem]";
    private const string SecondRowClass = "h-11 px-";
    private const string SiteMainClass = "<div class=\"site-main ";
    private const string UnchangedBodyTag = "<body class=\"font-['Inter'] bg-background";
    private const string CountryMenuHiddenOnPhones = "class=\"relative hidden sm:block\"";
    private const string CountryToggleLabel = "aria-label=\"Länder\" aria-haspopup=\"true\"";
    private const string TopRowAboveJumpLinksClass = "class=\"relative z-10 flex justify-between";
    private const string CountryCodeFromSmallScreens = "<span class=\"hidden sm:inline\">CH</span>";

    [TestCase("/land-ch", true, "mode-simple")]
    [TestCase("/land-ch/experten", true, "mode-expert")]
    [TestCase("/land-ch/spitex", true, "mode-expert")]
    [TestCase("/fr/land-ch", true, "mode-simple")]
    [TestCase("/en/land-gb", true, "mode-simple")]
    [TestCase("/it/land-ch/experten", true, "mode-expert")]
    [TestCase("/es/land-es", true, "mode-expert")]
    public async Task Body_carries_the_mode_class(string path, bool enabled, string expected)
    {
        var html = await GetHtmlAsync(enabled, path);

        Regex.Match(html, BodyClassPattern).Groups[1].Value.ShouldBe(expected);
    }

    [TestCase("/land-ch")]
    [TestCase("/land-ch/spitex")]
    [TestCase("/fr/land-ch")]
    public async Task Body_has_no_mode_class_while_the_feature_is_off(string path)
    {
        var html = await GetHtmlAsync(enabled: false, path);

        html.ShouldNotContain(SiteModes.SimpleBodyClass);
        html.ShouldNotContain(SiteModes.ExpertBodyClass);
        html.ShouldContain(UnchangedBodyTag);
    }

    [Test]
    public async Task Simple_header_has_jump_links_and_no_expert_navigation()
    {
        var html = await GetHtmlAsync(enabled: true, "/land-ch");

        html.ShouldContain("href=\"/land-ch#was-klacksy-tut\"");
        html.ShouldContain("href=\"/land-ch#kosten\"");
        html.ShouldNotContain("href=\"/land-ch#regeln\"");
        html.ShouldNotContain("mobile-menu-panel");
    }

    [Test]
    public async Task Simple_header_offers_the_country_switch_on_phones_as_a_compact_flag_button()
    {
        var html = WebUtility.HtmlDecode(await GetHtmlAsync(enabled: true, "/land-ch"));

        html.ShouldNotContain(CountryMenuHiddenOnPhones);
        html.ShouldContain(CountryToggleLabel);
        html.ShouldContain(CountryCodeFromSmallScreens);
        html.ShouldContain("href=\"/land-de\"");
        html.ShouldContain(TopRowAboveJumpLinksClass);
    }

    [TestCase("/land-ch", false)]
    [TestCase("/land-ch/experten", true)]
    public async Task Headers_without_the_simple_mode_keep_the_plain_country_button(string path, bool enabled)
    {
        var html = WebUtility.HtmlDecode(await GetHtmlAsync(enabled, path));

        html.ShouldNotContain(CountryToggleLabel);
        html.ShouldNotContain(CountryCodeFromSmallScreens);
    }

    [Test]
    public async Task Expert_header_keeps_todays_navigation_and_the_logo_leads_to_the_simple_page()
    {
        var html = await GetHtmlAsync(enabled: true, "/land-ch/experten");

        html.ShouldContain("href=\"/land-ch/experten#regeln\"");
        html.ShouldContain("mobile-menu-panel");
        html.ShouldContain("<a href=\"/land-ch\" class=\"flex shrink-0 items-center gap-2");
    }

    [TestCase("/land-ch/experten", "href=\"/fr/land-ch/experten\"", "href=\"/land-de/experten\"")]
    [TestCase("/fr/land-ch", "href=\"/land-ch\"", "href=\"/fr/land-fr\"")]
    [TestCase("/land-ch", "href=\"/fr/land-ch\"", "href=\"/land-de\"")]
    [TestCase("/fr/land-ch/experten", "href=\"/it/land-ch/experten\"", "href=\"/fr/land-fr/experten\"")]
    [TestCase("/en/land-gb/experten", "href=\"/land-de/experten\"", "href=\"/en/land-ie/experten\"")]
    public async Task Language_and_country_switch_keep_the_mode(string path, string languageLink, string countryLink)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        html.ShouldContain(languageLink);
        html.ShouldContain(countryLink);
    }

    [TestCase("/es/land-es")]
    [TestCase("/es/land-es/spitex")]
    public async Task Language_switch_from_a_culture_without_simple_page_leads_to_the_simple_page(string path)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        html.ShouldContain("href=\"/land-de\"");
        html.ShouldNotContain("href=\"/land-de/experten\"");
        html.ShouldContain("href=\"/fr/land-fr\"");
        html.ShouldNotContain("href=\"/fr/land-fr/experten\"");
    }

    [TestCase("/land-ch/experten", "href=\"/it/land-ch/experten\"")]
    [TestCase("/land-ch/klacksy", "href=\"/it/land-ch/experten\"")]
    [TestCase("/land-ch/spitex", "href=\"/it/land-ch/experten\"")]
    [TestCase("/land-ch/impressum", "href=\"/it/land-ch/impressum\"")]
    public async Task Language_switch_on_an_expert_page_never_links_to_a_missing_expert_page(string path, string italianLink)
    {
        var html = await GetHtmlAsync(enabled: true, path);
        var prefixedCultureSlugs = SupportedCultures.All
            .Where(culture => culture.UrlSlug.Length > 0 && !SiteModes.HasSimplePage(culture.Code, enabled: true))
            .Select(culture => Regex.Escape(culture.UrlSlug));
        var missingExpertLink = new Regex($"href=\"/({string.Join('|', prefixedCultureSlugs)})/land-[a-z]+/{SiteModes.ExpertSlug}");

        missingExpertLink.IsMatch(html).ShouldBeFalse();
        html.ShouldContain(italianLink);
    }

    [TestCase("/land-ch", false)]
    [TestCase("/land-ch/spitex", false)]
    [TestCase("/land-ch/impressum", false)]
    [TestCase("/es/land-es", true)]
    [TestCase("/es/land-es/spitex", true)]
    [TestCase("/ja/land-jp", true)]
    public async Task Header_without_switch_keeps_the_single_row_layout(string path, bool enabled)
    {
        var html = await GetHtmlAsync(enabled, path);

        html.ShouldContain(SingleRowHeaderClass);
        html.ShouldContain(SingleRowLinksClass);
        html.ShouldContain(SingleRowActionsClass);
        html.ShouldContain("mobile-menu-panel");
        html.ShouldNotContain(TwoRowHeaderClass);
        html.ShouldNotContain(SecondRowClass);
        html.ShouldNotContain("mode-switch");
        html.ShouldNotContain(SiteMainClass);
    }

    [TestCase("/land-ch")]
    [TestCase("/land-ch/experten")]
    [TestCase("/fr/land-ch")]
    [TestCase("/en/land-gb/experten")]
    [TestCase("/it/land-it/spitex")]
    public async Task Header_with_switch_has_two_rows(string path)
    {
        var html = await GetHtmlAsync(enabled: true, path);

        html.ShouldContain(TwoRowHeaderClass);
        html.ShouldContain("mode-switch");
        html.ShouldContain(SiteMainClass);
        html.ShouldNotContain(SingleRowHeaderClass);
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
