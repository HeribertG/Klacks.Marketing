// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Content guard of the simple start page (spec §5): the owner texts appear word for word, the page speaks in the
/// informal Du form, uses no jargon and none of the forbidden claims, names the playground "Playground", has no gender
/// star, has {country} as its only placeholder and stays within about 350 words of section text.
/// </summary>
[TestFixture]
public class SimpleContentTests
{
    private const string GermanCulture = "de";
    private const string FileName = "simple.json";
    private const string PlaygroundName = "Playground";
    private const string AllowedPlaceholder = "{country}";
    private const string PlaceholderPattern = @"\{[a-zA-Z]+\}";
    private const string FormalAddressPattern = @"\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b";
    private const string GenderStarPattern = @"\w[*:_]innen\b";
    private const string GenderCapitalIPattern = @"[a-zäöü]Innen\b";
    private const string GenderSlashPattern = @"/innen\b";
    private const string DemoModalKeyPrefix = "demoModal.";
    private const string SharedFileName = "shared.json";
    private const string WordPattern = @"\p{L}[\p{L}\p{N}'’-]*";
    private const int MaxSectionWords = 350;
    private const int MaxMetaDescriptionLength = 155;

    private static readonly string[] Jargon = { "Container", "Cutting", "Autofill", "LLM", "MCP", "Tool-Calling" };

    private static readonly string[] ForbiddenPhrases =
    {
        "gratis", "kostenlos", "Klacksy plant", "Klacksy rechnet", "Klacksy berechnet", "Klacksy optimiert",
        "bewährt", "im Einsatz bei", "unsere Partner", "Pilotbetrieb", "verlassen das Haus", "automatisch anrufen", "bucht ein",
        "ein Satz genügt", "genügt ein Satz", "Klacksy prüft",
    };

    private static readonly string[] NonSectionKeyPrefixes = { "pageTitle", "metaDescription", "nav.", "switch.", "share.", "hero.videoLabel", "hero.imageAlt", "talk.videoLabel", "demoModal.", "demoData." };

    private static readonly (string Key, string Text)[] OwnerTexts =
    {
        ("hero.title", "Personalplanung mit Klacks. Klacksy nimmt dir die Klickarbeit ab."),
        ("hero.subtitle", "Klacks ist eine Software für Dienstpläne und Personalplanung. Mit Klacksy, deinem elektronischen Mitarbeiter: Du sagst, was du brauchst – Klacksy erledigt es nach deinem Ja."),
        ("hero.trustLine", "Open Source · ohne Abo · läuft bei dir"),
        ("human.title", "Klacksy ersetzt niemanden in der Planung – Klacksy nimmt Klickarbeit ab."),
        ("human.text", "Du sagst in einem Satz, was du brauchst. Klacksy zeigt dir eine Vorschau und erledigt es erst nach deinem Ja. Den Plan rechnet Klacks nach deinen Regeln. Was nur du weisst – wer nachts erreichbar ist, wem ein Einsatz gerade zu viel ist –, steht in keinem System. Darum entscheidest du."),
        ("talk.text", "Ein Klick auf Klacksy oben rechts – und los."),
        ("talk.bubble.0", "Plane die Woche ab 2. November."),
        ("talk.bubble.1", "Anna ist morgen krank. Wer kann einspringen?"),
        ("talk.bubble.2", "Warum ist der Dienst von Beat rot?"),
        ("ai.text", "Klacks stellt Klacksy die Fähigkeiten bereit. Das KI-Modell dahinter bestimmst du: von einem Anbieter deiner Wahl oder auf deinem eigenen Server. Heute das beste, morgen das nächste – du bist an niemanden gebunden."),
        ("data.text", "Deine Daten liegen bei dir – nicht bei uns und in keiner Klacks-Cloud. Welche Dienste Klacks von aussen nutzt – etwa das KI-Modell oder den Kartendienst –, bestimmst du."),
        ("start.text", "Haben wir dich neugierig gemacht? Rede mit unserem elektronischen Mitarbeiter."),
    };

    private static readonly string[] OwnerCards =
    {
        "Nächste Woche planen? Ein Satz an Klacksy startet die Planung. Klacks rechnet – und du sagst Ja.",
        "Warum ist ein Dienst rot? Klacks zeigt Regelverstösse, bevor etwas gilt – Klacksy erklärt sie dir.",
        "Jemand fällt aus? Klacksy zeigt passende Leute mit Begründung – du wählst.",
    };

    private const string OwnerCostText = "Keine Lizenzgebühren, kein Abo – Klacks ist Open Source. Du brauchst nur einen eigenen PC oder Server und das KI-Modell deiner Wahl. Und wenn du willst, einen IT-Dienstleister, der Klacks für dich betreut.";

    private static readonly string[] OwnerChips = { "Spitex", "Spitäler", "Hotellerie & Gastronomie", "Logistik", "Security", "Hausdienste" };

    [Test]
    public void Owner_texts_appear_word_for_word()
    {
        var texts = Load();

        foreach (var (key, text) in OwnerTexts)
        {
            texts[key].ShouldBe(text, key);
        }

        for (var index = 0; index < OwnerCards.Length; index++)
        {
            $"{texts[$"tasks.{index}.title"]} {texts[$"tasks.{index}.text"]}".ShouldBe(OwnerCards[index]);
        }

        string.Join(" ", Enumerable.Range(0, 3).Select(index => texts[$"cost.item.{index}"])).ShouldBe(OwnerCostText);
        Shared.SimpleStartTemplate.AudienceSlugs.Select(slug => texts[$"audience.chip.{slug}"]).ShouldBe(OwnerChips);
    }

    [Test]
    public void Title_meta_and_subtitle_name_the_search_terms()
    {
        var texts = Load();

        texts["pageTitle"].ShouldContain("Personalplanung");
        texts["pageTitle"].ShouldContain("Dienstplan");
        texts["metaDescription"].ShouldContain("Personalplanung");
        texts["hero.subtitle"].ShouldContain("Personalplanung");
    }

    [Test]
    public void Meta_description_fits_the_search_snippet()
    {
        Load()["metaDescription"].Length.ShouldBeLessThanOrEqualTo(MaxMetaDescriptionLength);
    }

    [Test]
    public void Every_shared_demo_modal_key_has_a_simple_counterpart()
    {
        var simple = Load();
        var shared = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, GermanCulture, SharedFileName)))!;
        var modalKeys = shared.Keys.Where(key => key.StartsWith(DemoModalKeyPrefix, StringComparison.Ordinal)).ToList();

        modalKeys.ShouldNotBeEmpty();
        foreach (var key in modalKeys)
        {
            simple.ContainsKey(key).ShouldBeTrue(key);
        }
    }

    [Test]
    public void Texts_use_the_du_form_no_jargon_no_forbidden_claims_and_no_gender_star()
    {
        foreach (var (key, value) in Load())
        {
            Regex.IsMatch(value, FormalAddressPattern).ShouldBeFalse($"{key}: formal address in '{value}'");
            Regex.IsMatch(value, GenderStarPattern).ShouldBeFalse($"{key}: gender star in '{value}'");
            Regex.IsMatch(value, GenderCapitalIPattern).ShouldBeFalse($"{key}: capital-I gender form in '{value}'");
            Regex.IsMatch(value, GenderSlashPattern, RegexOptions.IgnoreCase).ShouldBeFalse($"{key}: slash gender form in '{value}'");
            foreach (var word in Jargon)
            {
                Regex.IsMatch(value, $@"\b{Regex.Escape(word)}\b", RegexOptions.IgnoreCase).ShouldBeFalse($"{key}: jargon '{word}'");
            }

            foreach (var phrase in ForbiddenPhrases)
            {
                value.ShouldNotContain(phrase, Case.Insensitive, $"{key}: forbidden '{phrase}'");
            }
        }
    }

    [Test]
    public void Country_is_the_only_placeholder()
    {
        foreach (var (key, value) in Load())
        {
            Regex.Matches(value, PlaceholderPattern).Select(match => match.Value).ShouldAllBe(placeholder => placeholder == AllowedPlaceholder, key);
        }
    }

    [Test]
    public void Playground_entry_names_the_playground()
    {
        Load()["start.playgroundSubtitle"].ShouldContain(PlaygroundName, Case.Sensitive);
    }

    [Test]
    public void Section_text_stays_within_about_350_words()
    {
        var words = Load()
            .Where(entry => !NonSectionKeyPrefixes.Any(prefix => entry.Key.StartsWith(prefix, StringComparison.Ordinal)))
            .Sum(entry => Regex.Matches(entry.Value, WordPattern).Count);

        words.ShouldBeLessThanOrEqualTo(MaxSectionWords);
    }

    [Test]
    public void Only_the_listed_cultures_have_simple_content()
    {
        foreach (var culture in SupportedCultures.All)
        {
            File.Exists(Path.Combine(MarketingProjectPaths.ContentRoot, culture.Code, FileName))
                .ShouldBe(SiteModes.SimplePageCultures.Contains(culture.Code), culture.Code);
        }
    }

    private static Dictionary<string, string> Load()
        => JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, GermanCulture, FileName)))!;
}
