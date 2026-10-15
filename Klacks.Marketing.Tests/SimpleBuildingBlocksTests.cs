// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using Klacks.Marketing.Shared;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The simple page's video plays only on request and is counted once by c.js, it falls back without recordings; the
/// share block offers a mail template and copying without any storage; the install link target exists on the
/// install page.
/// </summary>
[TestFixture]
public class SimpleBuildingBlocksTests
{
    private const string SwissCountry = "land-ch";

    [Test]
    public async Task Recorded_video_is_click_to_play_and_carries_the_play_event()
    {
        var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, SwissCountry), new StubVideoCatalog());

        var html = await MarketingComponentHost.RenderAsync<SimpleVideo>(services, new Dictionary<string, object?>
        {
            [nameof(SimpleVideo.VideoName)] = SimpleVideo.PlansWeekVideoName,
            [nameof(SimpleVideo.Label)] = "label",
        });

        html.ShouldContain("<video");
        html.ShouldContain("data-c-play=\"VideoPlay\"");
        html.ShouldContain("preload=\"none\"");
        html.ShouldContain(" controls");
        html.ShouldContain("poster=\"videos/simple-plans-week-de.webp\"");
        html.ShouldNotContain("autoplay");
        html.ShouldNotContain("rule-demo-video");
    }

    [Test]
    public async Task Missing_video_renders_nothing_without_fallback()
    {
        var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, SwissCountry));

        var html = await MarketingComponentHost.RenderAsync<SimpleVideo>(services, new Dictionary<string, object?>
        {
            [nameof(SimpleVideo.VideoName)] = "does-not-exist",
            [nameof(SimpleVideo.Label)] = "label",
        });

        html.Trim().ShouldBeEmpty();
    }

    [Test]
    public async Task Share_block_offers_mail_and_copy_with_the_share_event()
    {
        var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, SwissCountry));

        var html = WebUtility.HtmlDecode(await MarketingComponentHost.RenderAsync<ShareLinkButtons>(services, new Dictionary<string, object?>
        {
            [nameof(ShareLinkButtons.Url)] = "https://klacks-software.ch/land-ch",
        }));

        html.ShouldContain("href=\"mailto:?subject=");
        html.ShouldContain(Uri.EscapeDataString("https://klacks-software.ch/land-ch"));
        html.ShouldContain("Link kopieren");
        html.Split("data-c=\"ShareClick\"").Length.ShouldBe(3);
        html.ShouldContain("role=\"status\"");
    }

    [Test]
    public void Share_script_uses_the_clipboard_and_no_storage()
    {
        var script = MarketingProjectPaths.ReadSource("wwwroot/js/share-link.js");

        script.ShouldContain("navigator.clipboard.writeText");
        script.ShouldNotContain("localStorage");
        script.ShouldNotContain("sessionStorage");
        script.ShouldNotContain("document.cookie");
        MarketingProjectPaths.ReadSource("Pages/_Layout.cshtml").ShouldContain("js/share-link.js");
    }

    [Test]
    public void Install_page_marks_the_office_pc_card_for_the_simple_page_link()
    {
        MarketingProjectPaths.ReadSource("Shared/InstallPageTemplate.razor").ShouldContain("id=\"@PageSectionIds.OfficePc\"");
        PageSectionIds.OfficePc.ShouldBe("buero-pc");
    }

    [Test]
    public void Simple_section_ids_do_not_collide_with_the_expert_section_ids()
    {
        var expert = typeof(PageSectionIds).GetFields().Select(field => (string)field.GetValue(null)!);
        var simple = SimplePageSectionIds.Navigation.Select(anchor => anchor.Id).Append(SimplePageSectionIds.Share);

        simple.Intersect(expert).ShouldBeEmpty();
    }
}
