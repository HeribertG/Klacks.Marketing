// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Content guard for wave 1 of the website rebuild: the German texts of the country start page and the business size
/// pages are complete, the honesty corrections hold (Klacksy understands and starts, the planning engine computes),
/// the playground has one name, the mandatory Klacksy video note is in place, and splitting a solution text into its
/// lead sentence never cuts through an HTML tag.
/// </summary>
[TestFixture]
public class StartPageContentTests
{
    private const string GermanCulture = "de";
    private const string StartFile = "start.json";
    private const string SharedFile = "shared.json";
    private const string MidSizeFile = "mittlere-betriebe.json";
    private const string LargeFile = "grosse-betriebe.json";
    private const string OfferFile = "angebot.json";
    private const string PlaygroundName = "Playground";
    private const string CountryContentPattern = "land-??.json";
    private const string LiteralTextKeyPattern = @"Tx\(""([^""{}]+)""\)";
    private const string TagPattern = @"<(/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(/?)>";
    private const string KlacksyVideoNote = "Wartezeiten im Video beschleunigt und markiert. Wie schnell Klacksy antwortet, hängt vom gewählten KI-Modell ab; die Planungs-Engine rechnet je nach Betriebsgrösse einige Minuten.";

    private static readonly string[] SizeKeys = { "small", "mid", "large" };
    private static readonly string[] SizeSuffixes = { "label", "range", "text" };
    private static readonly string[] TrustPointKeys = { "openSource", "data", "ai", "lockIn" };
    private static readonly string[] RulesViews = { FeatureExplorer.RulesViewCalendar, FeatureExplorer.RulesViewSettings, FeatureExplorer.RulesViewLive };
    private const int StatCount = 4;

    private static readonly string[] OverclaimingPhrases =
    {
        "Klacksy plant",
        "Klacksy rechnet",
        "Klacksy berechnet",
        "Klacksy optimiert",
        "rechnet alles neu",
        "Sprachbefehl",
        "Klacksy wendet",
        "Klacksy prüft",
        "Klacksy berücksichtigt",
        "von Klacksy automatisch mitgeplant",
        "und plant darin",
        "lernt Ihre betrieblichen Regeln",
        "aus bestehenden Mustern",
        "Fachvokabular trainieren",
        "Abkürzungen trainiert",
        "Vorschlagen &amp; Nachfragen",
        "bereitet Tourenvorschläge vor",
        "Kostenlos und ohne Lizenzvertrag",
    };

    private static readonly string[] PlaygroundLabelKeys =
    {
        "nav.tryNow",
        "cta.tryButton",
        "cta.demoLoginLabel",
        "cta.demoResetNote",
        "demoModal.title",
        "demoModal.body",
        "demoModal.continueButton",
    };

    private static readonly string[] RetiredPlaygroundNames = { "Live-Demo", "Testinstallation", "Test-Instanz", "zur Demo", "Demo-Zugang" };

    private static readonly HashSet<string> VoidElements = new(StringComparer.OrdinalIgnoreCase) { "br", "img", "hr", "wbr", "input" };

    private static IEnumerable<string> CultureCodes => SupportedCultures.All.Select(culture => culture.Code);

    [Test]
    public void German_start_content_has_every_key_the_country_start_page_reads()
    {
        var texts = LoadFlat(GermanCulture, StartFile);

        foreach (var key in ExpectedStartKeys())
        {
            texts.ShouldContainKey(key, $"{GermanCulture}/{StartFile} lacks '{key}'");
            texts[key].ShouldNotBeNullOrWhiteSpace(key);
        }
    }

    [TestCase(MidSizeFile, "Pages/MittlereBetriebe.razor")]
    [TestCase(LargeFile, "Pages/GrosseBetriebe.razor")]
    [TestCase(OfferFile, "Pages/Angebot.razor")]
    public void German_business_size_content_has_every_literal_key_its_page_reads(string contentFile, string pagePath)
    {
        var texts = LoadFlat(GermanCulture, contentFile);
        var keys = Regex.Matches(MarketingProjectPaths.ReadSource(pagePath), LiteralTextKeyPattern).Select(match => match.Groups[1].Value).Distinct();

        foreach (var key in keys)
        {
            texts.ShouldContainKey(key, $"{GermanCulture}/{contentFile} lacks '{key}'");
        }

        texts["pageTitle"].ShouldNotContain("Vorschau");
        texts["metaDescription"].ShouldNotContain("Vorschau");
    }

    [Test]
    public void Business_size_ranges_follow_the_owner_decision()
    {
        var start = LoadFlat(GermanCulture, StartFile);

        start["audience.small.range"].ShouldContain("50");
        start["audience.mid.range"].ShouldContain("50");
        start["audience.mid.range"].ShouldContain("250");
        start["audience.large.range"].ShouldContain("250");
        LoadFlat(GermanCulture, "kleine-betriebe.json")["hero.badge"].ShouldContain("5 bis 250");
    }

    [Test]
    public void Mandatory_klacksy_video_note_is_shared_and_attached_to_the_klacksy_carousel()
    {
        LoadFlat(GermanCulture, SharedFile)[DemoCarousels.KlacksyVideoNoteKey].ShouldBe(KlacksyVideoNote);
        DemoCarousels.Klacksy.NoteKey.ShouldBe(DemoCarousels.KlacksyVideoNoteKey);
        DemoCarousels.All.Where(definition => definition != DemoCarousels.Klacksy).ShouldAllBe(definition => definition.NoteKey == null);
    }

    [Test]
    public void German_content_never_lets_klacksy_plan_or_compute_by_itself()
    {
        foreach (var file in Directory.GetFiles(Path.Combine(MarketingProjectPaths.ContentRoot, GermanCulture), "*.json"))
        {
            var text = File.ReadAllText(file);
            foreach (var phrase in OverclaimingPhrases)
            {
                text.ShouldNotContain(phrase, Case.Sensitive, $"{Path.GetFileName(file)} still contains '{phrase}'");
            }
        }
    }

    [Test]
    public void German_playground_entry_points_use_the_one_name_playground()
    {
        var shared = LoadFlat(GermanCulture, SharedFile);

        foreach (var key in PlaygroundLabelKeys)
        {
            shared[key].ShouldContain(PlaygroundName, Case.Sensitive, key);
            foreach (var retired in RetiredPlaygroundNames)
            {
                shared[key].ShouldNotContain(retired, Case.Sensitive, key);
            }
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Start_and_size_pages_are_translated_with_the_german_key_set(string culture)
    {
        foreach (var fileName in new[] { StartFile, MidSizeFile, LargeFile })
        {
            var expected = LoadFlat(GermanCulture, fileName);
            var actual = LoadFlat(culture, fileName);

            actual.Keys.OrderBy(key => key, StringComparer.Ordinal)
                .ShouldBe(expected.Keys.OrderBy(key => key, StringComparer.Ordinal), $"{culture}/{fileName}");
            actual.Values.ShouldAllBe(value => !string.IsNullOrWhiteSpace(value), $"{culture}/{fileName}");
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Lead_sentence_split_never_cuts_through_an_html_element_of_a_solution_text(string culture)
    {
        var folder = Path.Combine(MarketingProjectPaths.ContentRoot, culture);
        foreach (var file in Directory.GetFiles(folder, CountryContentPattern))
        {
            using var document = JsonDocument.Parse(File.ReadAllText(file));
            foreach (var item in document.RootElement.GetProperty("solutions").GetProperty("items").EnumerateArray())
            {
                var text = item.GetProperty("text").GetString() ?? string.Empty;
                var (lead, rest) = LeadSentence.Split(text);

                IsBalanced(lead).ShouldBeTrue($"{culture}/{Path.GetFileName(file)}: lead '{lead}'");
                IsBalanced(rest).ShouldBeTrue($"{culture}/{Path.GetFileName(file)}: rest '{rest}'");
            }
        }
    }

    private static IEnumerable<string> ExpectedStartKeys()
    {
        var literal = Regex.Matches(MarketingProjectPaths.ReadSource("Shared/CountryStartTemplate.razor"), LiteralTextKeyPattern)
            .Concat(Regex.Matches(MarketingProjectPaths.ReadSource("Shared/FeatureExplorer.razor"), LiteralTextKeyPattern))
            .Select(match => match.Groups[1].Value);

        var dynamicKeys = SizeKeys.SelectMany(size => SizeSuffixes.Select(suffix => $"audience.{size}.{suffix}"))
            .Concat(TrustPointKeys.SelectMany(point => new[] { $"trust.{point}.title", $"trust.{point}.text" }))
            .Concat(Enumerable.Range(0, StatCount).Select(index => $"trust.stat.{index}"))
            .Concat(RulesViews.Select(view => $"explorer.rulesView.{view}"))
            .Concat(DemoCarousels.All.SelectMany(definition => new[]
            {
                $"explorer.chapter.{definition.SectionId}.title",
                $"explorer.chapter.{definition.SectionId}.teaser",
            }))
            .Append("explorer.subtitlePrefix");

        return literal.Concat(dynamicKeys).Distinct();
    }

    private static bool IsBalanced(string html)
    {
        var open = new Stack<string>();
        foreach (Match match in Regex.Matches(html, TagPattern))
        {
            var isClosing = match.Groups[1].Value.Length > 0;
            var name = match.Groups[2].Value;
            var isSelfClosing = match.Groups[3].Value.Length > 0 || VoidElements.Contains(name);
            if (isSelfClosing)
            {
                continue;
            }

            if (!isClosing)
            {
                open.Push(name);
            }
            else if (open.Count == 0 || !open.Pop().Equals(name, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        return open.Count == 0 && html.Count(character => character == '<') == html.Count(character => character == '>');
    }

    private static Dictionary<string, string> LoadFlat(string culture, string fileName)
        => JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, culture, fileName)))!;
}
