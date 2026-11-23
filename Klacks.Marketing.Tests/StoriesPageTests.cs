// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Pages;
using Microsoft.AspNetCore.Mvc.Testing;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The stories page collects the story clips (comic scene plus real recordings, music, no speech). The clips carry
/// burnt-in text, so the page is written in German, English, French and Italian: these are indexable and listed in the
/// sitemap, every other culture serves the English text and clips marked lang="en" and stays noindex. Every clip has its
/// video and poster in each written culture, nothing loads with the page, a clip enlarges and plays while the mouse
/// pointer is over it (shared hover-zoom frame plus story-clip-hover.js), and the page names the AI
/// origin of the comic scenes and the music credit the licence (CC BY 3.0) requires.
/// </summary>
[TestFixture]
public class StoriesPageTests
{
    private const string SitemapBaseUrl = "https://klacks.example";
    private const string ContentFile = "geschichten.json";
    private const string SharedFile = "shared.json";
    private const string FooterStoriesKey = "footer.stories";
    private const string MetaDescriptionKey = "metaDescription";
    private const string MusicKey = "music";
    private const string NoteKey = "note";
    private const string NoIndex = "noindex";
    private const string EnglishContentMarker = "lang=\"en\" dir=\"ltr\"";
    private const string MusicCredit = "Kevin MacLeod (incompetech.com), CC BY 3.0";
    private const string VideoTagPattern = "<video[^>]*>";
    private const int MetaDescriptionMaxLength = 155;
    private const int ExpertLinksToStoriesPage = 3;
    private const int SimpleLinksToStoriesPage = 2;

    private static readonly string[] WrittenCultures = { "de", "en", "fr", "it" };

    private static readonly Dictionary<string, string> AiWords = new() { ["de"] = "KI", ["en"] = "AI", ["fr"] = "IA", ["it"] = "IA" };

    [TestCase("/land-ch/geschichten", "de")]
    [TestCase("/en/land-gb/geschichten", "en")]
    [TestCase("/fr/land-fr/geschichten", "fr")]
    [TestCase("/it/land-it/geschichten", "it")]
    public async Task Written_cultures_render_an_indexable_page_with_their_own_clips(string path, string culture)
    {
        var html = await GetHtmlAsync(path);

        html.ShouldNotContain(NoIndex);
        WebUtility.HtmlDecode(html).ShouldContain(Text(culture, "hero.title"));
        foreach (var clip in Geschichten.Clips)
        {
            html.ShouldContain($"{Geschichten.ClipsFolder}/{clip}-{culture}{Geschichten.VideoExtension}");
            html.ShouldContain($"{Geschichten.ClipsFolder}/{clip}-{culture}{Geschichten.PosterExtension}");
        }
    }

    [TestCase("/ja/land-jp/geschichten")]
    [TestCase("/ar/land-sa/geschichten")]
    [TestCase("/es/land-es/geschichten")]
    public async Task Other_cultures_show_the_english_text_and_clips_and_stay_noindex(string path)
    {
        var html = await GetHtmlAsync(path);

        html.ShouldContain(NoIndex);
        html.ShouldContain(EnglishContentMarker);
        WebUtility.HtmlDecode(html).ShouldContain(Text("en", "hero.title"));
        html.ShouldContain($"{Geschichten.ClipsFolder}/{Geschichten.Clips[0]}-en{Geschichten.VideoExtension}");
    }

    [Test]
    public async Task No_clip_loads_or_plays_with_the_page_and_each_one_enlarges_and_plays_on_hover()
    {
        var html = await GetHtmlAsync("/land-ch/geschichten");
        var videos = Regex.Matches(html, VideoTagPattern).Select(match => match.Value).ToList();

        videos.Count.ShouldBe(Geschichten.Clips.Count);
        Regex.Matches(html, Regex.Escape($"class=\"{Geschichten.ClipFrameClass}\"")).Count.ShouldBe(Geschichten.Clips.Count);
        html.ShouldContain(Geschichten.HoverScript);
        File.Exists(Path.Combine(MarketingProjectPaths.WebRoot, Geschichten.HoverScript)).ShouldBeTrue();
        foreach (var video in videos)
        {
            video.ShouldContain("preload=\"none\"");
            video.ShouldContain("controls");
            video.ShouldNotContain("autoplay");
        }
    }

    [Test]
    public void Only_german_english_french_and_italian_have_their_own_text()
    {
        var cultures = SupportedCultures.All
            .Where(culture => File.Exists(Path.Combine(MarketingProjectPaths.ContentRoot, culture.Code, ContentFile)))
            .Select(culture => culture.Code);

        cultures.ShouldBe(WrittenCultures, ignoreOrder: true);
    }

    [TestCase("de")]
    [TestCase("en")]
    [TestCase("fr")]
    [TestCase("it")]
    public void Every_clip_has_its_video_poster_title_and_text(string culture)
    {
        var folder = Path.Combine(MarketingProjectPaths.WebRoot, Geschichten.ClipsFolder);

        foreach (var clip in Geschichten.Clips)
        {
            File.Exists(Path.Combine(folder, $"{clip}-{culture}{Geschichten.VideoExtension}")).ShouldBeTrue($"{clip}-{culture} video");
            File.Exists(Path.Combine(folder, $"{clip}-{culture}{Geschichten.PosterExtension}")).ShouldBeTrue($"{clip}-{culture} poster");
            Text(culture, $"clip.{clip}.title").ShouldNotBeNullOrWhiteSpace();
            Text(culture, $"clip.{clip}.text").ShouldNotBeNullOrWhiteSpace();
        }
    }

    [TestCase("de")]
    [TestCase("en")]
    [TestCase("fr")]
    [TestCase("it")]
    public void Page_names_the_ai_origin_and_the_music_credit_and_its_meta_description_fits(string culture)
    {
        Text(culture, MetaDescriptionKey).Length.ShouldBeInRange(1, MetaDescriptionMaxLength);
        Text(culture, MusicKey).ShouldContain(MusicCredit);
        Regex.IsMatch(Text(culture, NoteKey), $@"\b{AiWords[culture]}\b").ShouldBeTrue(culture);
    }

    [Test]
    public void Sitemap_lists_the_page_only_for_german_english_french_and_italian()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());
        var sitemap = SitemapGenerator.Build(SitemapBaseUrl, provider.HasContentIn);

        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/land-ch/geschichten</loc>");
        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/en/land-gb/geschichten</loc>");
        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/fr/land-fr/geschichten</loc>");
        sitemap.ShouldContain($"<loc>{SitemapBaseUrl}/it/land-it/geschichten</loc>");
        sitemap.ShouldNotContain($"<loc>{SitemapBaseUrl}/ja/land-jp/geschichten</loc>");
        sitemap.ShouldNotContain($"<loc>{SitemapBaseUrl}/es/land-es/geschichten</loc>");
    }

    [TestCase("/land-ch/experten", "/land-ch/geschichten", ExpertLinksToStoriesPage)]
    [TestCase("/ja/land-jp/experten", "/ja/land-jp/geschichten", ExpertLinksToStoriesPage)]
    [TestCase("/land-ch", "/land-ch/geschichten", SimpleLinksToStoriesPage)]
    public async Task Start_pages_link_the_page_in_the_menu_and_the_footer(string path, string href, int links)
    {
        var html = await GetHtmlAsync(path);

        Regex.Matches(html, Regex.Escape($"href=\"{href}\"")).Count.ShouldBe(links);
    }

    [Test]
    public void Every_culture_has_a_footer_label_for_the_page()
    {
        foreach (var culture in SupportedCultures.All)
        {
            SharedText(culture.Code, FooterStoriesKey).ShouldNotBeNullOrWhiteSpace(culture.Code);
        }
    }

    private static string Text(string culture, string key) => ReadText(culture, ContentFile, key);

    private static string SharedText(string culture, string key) => ReadText(culture, SharedFile, key);

    private static string ReadText(string culture, string file, string key)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, culture, file)));
        return document.RootElement.GetProperty(key).GetString() ?? string.Empty;
    }

    private static async Task<string> GetHtmlAsync(string path)
    {
        await using var factory = new SimpleModeAppFactory(simpleModeEnabled: true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, path);
        return await response.Content.ReadAsStringAsync();
    }
}
