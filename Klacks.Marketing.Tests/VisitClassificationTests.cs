// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Analytics;
using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The visit counter derives page type, country and culture from the route, human/bot from a small token list and
/// the traffic source from an allowlist; every stored value comes from a closed set.
/// </summary>
[TestFixture]
public class VisitClassificationTests
{
    private const string ChromeUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
    private const string OwnHost = "klacks-software.ch";

    [TestCase("/", PageTypes.Start, "none", "de")]
    [TestCase("/land-ch", PageTypes.Start, "ch", "de")]
    [TestCase("/en/land-gb", PageTypes.Start, "gb", "en")]
    [TestCase("/en/land-de/spitex", PageTypes.Industry, "de", "en")]
    [TestCase("/land-ch/hotellerie-gastronomie", PageTypes.Industry, "ch", "de")]
    [TestCase("/land-ch/eigene-regeln", PageTypes.Industry, "ch", "de")]
    [TestCase("/land-ch/klacksy", PageTypes.Industry, "ch", "de")]
    [TestCase("/fr/land-ch/installation", PageTypes.Installation, "ch", "fr")]
    [TestCase("/land-ch/angebot", PageTypes.Offer, "ch", "de")]
    [TestCase("/land-ch/vergleich", PageTypes.Comparison, "ch", "de")]
    [TestCase("/land-ch/ueber-uns", PageTypes.AboutUs, "ch", "de")]
    [TestCase("/land-ch/partner", PageTypes.Partner, "ch", "de")]
    [TestCase("/land-ch/lizenz", PageTypes.License, "ch", "de")]
    [TestCase("/it/land-it/kleine-betriebe", PageTypes.SmallBusiness, "it", "it")]
    [TestCase("/land-at/mittlere-betriebe", PageTypes.MidSizeBusiness, "at", "de")]
    [TestCase("/land-at/grosse-betriebe", PageTypes.LargeBusiness, "at", "de")]
    [TestCase("/zh-tw/land-tw/datenschutz", PageTypes.Legal, "tw", "zh-TW")]
    [TestCase("/land-ch/impressum", PageTypes.Legal, "ch", "de")]
    [TestCase("/docs-sitemap-index.xml", PageTypes.DocsSitemap, "none", "de")]
    [TestCase("/land-ch/unbekannt", PageTypes.Other, "ch", "de")]
    [TestCase("/en/land-zz", PageTypes.Other, "none", "en")]
    [TestCase("/xx/land-ch/spitex", PageTypes.Other, "none", "de")]
    [TestCase("/LAND-CH/SPITEX", PageTypes.Industry, "ch", "de")]
    public void Route_maps_to_page_type_country_and_culture(string path, string pageType, string country, string culture)
    {
        VisitPathClassifier.Classify(path).ShouldBe(new VisitLocation(pageType, country, culture));
    }

    [TestCase("/en/land-zz/<script>")]
    [TestCase("/land-ch/spitex/extra/segments")]
    [TestCase("/../../etc/passwd")]
    public void Arbitrary_paths_only_yield_closed_set_values(string path)
    {
        var location = VisitPathClassifier.Classify(path);

        var countries = CountryIndustries.AllCountries.Select(key => key["land-".Length..]).Append(VisitLocation.NoCountry);

        location.PageType.ShouldBe(PageTypes.Other);
        countries.ShouldContain(location.Country);
        SupportedCultures.All.Select(culture => culture.Code).ShouldContain(location.Culture);
    }

    [TestCase(ChromeUserAgent, VisitorClass.Human)]
    [TestCase("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1", VisitorClass.Human)]
    [TestCase("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)", VisitorClass.Bot)]
    [TestCase("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", VisitorClass.Bot)]
    [TestCase("Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)", VisitorClass.Bot)]
    [TestCase("Mozilla/5.0 HeadlessChrome/141.0", VisitorClass.Bot)]
    [TestCase("curl/8.9.1", VisitorClass.Bot)]
    [TestCase("python-requests/2.32", VisitorClass.Bot)]
    [TestCase("", VisitorClass.Bot)]
    [TestCase(null, VisitorClass.Bot)]
    public void User_agent_is_reduced_to_human_or_bot(string? userAgent, VisitorClass expected)
    {
        BotUserAgents.Classify(userAgent).ShouldBe(expected);
    }

    [TestCase("chatgpt.com", null, TrafficSources.ChatGpt)]
    [TestCase("ChatGPT", null, TrafficSources.ChatGpt)]
    [TestCase("perplexity.ai", null, TrafficSources.Perplexity)]
    [TestCase("claude.ai", null, TrafficSources.Claude)]
    [TestCase("linkedin", null, TrafficSources.LinkedIn)]
    [TestCase("direct", null, TrafficSources.Direct)]
    [TestCase("newsletter-2026", "www.google.com", TrafficSources.Other)]
    [TestCase(null, "www.google.de", TrafficSources.Google)]
    [TestCase(null, "www.bing.com", TrafficSources.Bing)]
    [TestCase(null, "duckduckgo.com", TrafficSources.DuckDuckGo)]
    [TestCase(null, "github.com", TrafficSources.GitHub)]
    [TestCase(null, "lnkd.in", TrafficSources.LinkedIn)]
    [TestCase(null, "chatgpt.com", TrafficSources.ChatGpt)]
    [TestCase(null, "www.perplexity.ai", TrafficSources.Perplexity)]
    [TestCase(null, "www.klacks-software.ch", TrafficSources.Direct)]
    [TestCase(null, "evil.example", TrafficSources.Other)]
    [TestCase(null, null, TrafficSources.Direct)]
    [TestCase("", "", TrafficSources.Direct)]
    public void Source_is_limited_to_the_allowlist(string? campaign, string? refererHost, string expected)
    {
        TrafficSourceClassifier.Classify(campaign, refererHost, OwnHost).ShouldBe(expected);
    }

    [Test]
    public void Overlong_campaign_values_collapse_to_other()
    {
        var value = "google" + new string('x', 200);

        TrafficSourceClassifier.Classify(value, null, OwnHost).ShouldBe(TrafficSources.Other);
    }

    [Test]
    public void Allowlist_matches_the_specification()
    {
        TrafficSources.All.ShouldBe(new[]
        {
            "chatgpt.com", "perplexity", "claude", "google", "bing", "duckduckgo", "github", "linkedin", "direct", "other",
        });
    }
}
