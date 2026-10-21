// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using Microsoft.Extensions.DependencyInjection;
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
    private const string SharedUrl = "https://klacks-software.ch/land-ch";
    private const string OfficePcDownloadUrl = "https://example.test/klacks-office-pc-win-x64.zip";
    private const string SectionStart = "<section";
    private const string SectionEnd = "</section>";
    private const string OfficePcCardStart = "<div class=\"card-hover p-8 ";

    [Test]
    public async Task Recorded_video_plays_like_the_expert_demo_videos_and_carries_the_play_event()
    {
        var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, SwissCountry), new StubVideoCatalog());

        var html = await MarketingComponentHost.RenderAsync<SimpleVideo>(services, new Dictionary<string, object?>
        {
            [nameof(SimpleVideo.VideoName)] = SimpleVideo.KlacksyCallVideoName,
            [nameof(SimpleVideo.Label)] = "label",
        });

        html.ShouldContain("<video");
        html.ShouldContain("data-c-play=\"VideoPlay\"");
        html.ShouldContain("rule-demo-video");
        html.ShouldContain("autoplay");
        html.ShouldContain(" loop");
        html.ShouldContain("rule-demo-poster");
        html.ShouldContain("screenshot-hover-zoom");
        html.ShouldContain("poster=\"videos/simple-klacksy-call-de.webp\"");
        html.ShouldNotContain(" controls");
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
    public async Task Copy_button_carries_url_and_result_texts_for_the_script_and_the_status_element()
    {
        var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, SwissCountry));

        var html = WebUtility.HtmlDecode(await MarketingComponentHost.RenderAsync<ShareLinkButtons>(services, new Dictionary<string, object?>
        {
            [nameof(ShareLinkButtons.Url)] = SharedUrl,
        }));

        html.ShouldContain("data-share-block");
        html.ShouldContain($"data-share-copy=\"{SharedUrl}\"");
        html.ShouldContain("data-share-copied=\"Link kopiert.\"");
        html.ShouldContain("data-share-failed=\"Kopieren hat nicht geklappt.");
        html.ShouldContain("data-share-status");
        html.ShouldContain("data-share-url");
        html.ShouldContain("aria-live=\"polite\"");
    }

    [Test]
    public async Task Visible_share_url_wraps_only_after_slashes_and_before_the_query_and_keeps_its_exact_text()
    {
        const string urlWithQuery = "https://klacks-software.ch/land-ch?ref=share";
        var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, SwissCountry));

        var html = WebUtility.HtmlDecode(await MarketingComponentHost.RenderAsync<ShareLinkButtons>(services, new Dictionary<string, object?>
        {
            [nameof(ShareLinkButtons.Url)] = urlWithQuery,
        }));

        var urlElement = Regex.Match(html, "<p[^>]*data-share-url[^>]*>(.*?)</p>", RegexOptions.Singleline);
        urlElement.Success.ShouldBeTrue();
        urlElement.Value.ShouldNotContain("break-all");
        var inner = urlElement.Groups[1].Value;
        Regex.Replace(inner, "<[^>]+>", string.Empty).ShouldBe(urlWithQuery);
        Regex.Matches(inner, "<span class=\"whitespace-nowrap\">([^<]*)</span>").Select(match => match.Groups[1].Value)
            .ShouldBe(["https://", "klacks-software.ch/", "land-ch", "?ref=share"]);
        Regex.Matches(inner, "<wbr\\s*/?>").Count.ShouldBe(3);
        html.ShouldContain($"data-share-copy=\"{urlWithQuery}\"");
    }

    [Test]
    public void Copy_runs_in_the_click_handler_without_a_circuit_round_trip()
    {
        MarketingProjectPaths.ReadSource("Shared/ShareLinkButtons.razor").ShouldNotContain("InvokeAsync");
        MarketingProjectPaths.ReadSource("Shared/ShareLinkButtons.razor").ShouldNotContain("@onclick");

        var script = MarketingProjectPaths.ReadSource("wwwroot/js/share-link.js");

        script.ShouldContain("addEventListener('click'");
        script.ShouldContain("[data-share-copy]");
        script.ShouldContain("execCommand('copy')");
        script.ShouldContain("textContent = ''");
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
    public async Task Install_page_puts_the_office_pc_anchor_outside_the_reveal_animation()
    {
        PageSectionIds.OfficePc.ShouldBe("buero-pc");

        var html = await InstallPageRenderer.RenderAsync(SupportedCultures.DefaultCode, enabled: true, windowsUrl: OfficePcDownloadUrl);
        var anchor = html.IndexOf($"id=\"{PageSectionIds.OfficePc}\"", StringComparison.Ordinal);

        anchor.ShouldBeGreaterThan(-1);
        html.IndexOf($"id=\"{PageSectionIds.OfficePc}\"", anchor + 1, StringComparison.Ordinal).ShouldBe(-1);
        var lastSectionStart = html.LastIndexOf(SectionStart, anchor, StringComparison.Ordinal);
        var lastSectionEnd = html.LastIndexOf(SectionEnd, anchor, StringComparison.Ordinal);
        lastSectionEnd.ShouldBeGreaterThan(lastSectionStart, "the anchor must not sit inside a .reveal section: its transform shifts the jump target under the fixed header");
        html.IndexOf(OfficePcCardStart, anchor, StringComparison.Ordinal).ShouldBeGreaterThan(anchor);
    }

    [Test]
    public void Simple_section_ids_do_not_collide_with_the_expert_section_ids()
    {
        var expert = typeof(PageSectionIds).GetFields().Select(field => (string)field.GetValue(null)!);
        var simple = SimplePageSectionIds.Navigation.Select(anchor => anchor.Id).Append(SimplePageSectionIds.Share);

        simple.Intersect(expert).ShouldBeEmpty();
    }
}
