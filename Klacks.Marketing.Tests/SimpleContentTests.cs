// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Content guard of the simple start page (spec §5/§6) for every culture with a simple page: the German owner texts
/// appear word for word; every culture has exactly the German key set; each culture keeps its address form (de Du, en
/// neutral "you", fr vous, it tu), uses no jargon, none of the forbidden claims and no gender star or comparable short
/// forms, names the playground "Playground", has {country} as its only placeholder, names its search terms in title,
/// meta description and hero, and stays within its section word budget. The industry chips of the translated pages use
/// the titles of the industry pages they link to, and every prefixed simple culture names all countries in its language.
/// </summary>
[TestFixture]
public class SimpleContentTests
{
    private const string GermanCulture = "de";
    private const string FileName = "simple.json";
    private const string IndexFileName = "index.json";
    private const string CountriesFileName = "countries.json";
    private const string PlaygroundName = "Playground";
    private const string AllowedPlaceholder = "{country}";
    private const string PlaceholderPattern = @"\{[a-zA-Z]+\}";
    private const string GenderStarPattern = @"\w[*:_]innen\b";
    private const string GenderCapitalIPattern = @"[a-zäöü]Innen\b";
    private const string GenderSlashPattern = @"/innen\b";
    private const string MitLicencePattern = @"\bMIT\b";
    private const string DemoModalKeyPrefix = "demoModal.";
    private const string AudienceChipPrefix = "audience.chip.";
    private const string IndustryTitleKeyFormat = "industries.{0}.title";
    private const string SharedFileName = "shared.json";
    private const string WordPattern = @"\p{L}[\p{L}\p{N}'’-]*";
    private const int MaxMetaDescriptionLength = 155;

    private static readonly string[] Jargon = { "Container", "Cutting", "Autofill", "LLM", "MCP", "Tool-Calling", "tool calling" };

    private static readonly string[] NonSectionKeyPrefixes = { "pageTitle", "metaDescription", "nav.", "switch.", "share.", "hero.videoLabel", "hero.imageAlt", "talk.videoLabel", "demoModal.", "demoData.", "videos.title", "videos.subtitle", "videos.plansWeek.title", "videos.klacksyCall.title", "story." };

    // The German section text is held to the owner's budget of 350 words; the translations get the word count of their
    // faithful translation (no claim dropped), measured on 2026-10-17: English, French and Italian need more words than
    // German compounds. A translation may get shorter, never longer.
    private static readonly Dictionary<string, int> MaxSectionWords = new()
    {
        [GermanCulture] = 350,
        ["en"] = 395,
        ["fr"] = 424,
        ["it"] = 400,
    };

    private static readonly Dictionary<string, string[]> SearchTerms = new()
    {
        [GermanCulture] = new[] { "Personalplanung" },
        ["en"] = new[] { "workforce planning" },
        ["fr"] = new[] { "planification du personnel" },
        ["it"] = new[] { "pianificazione del personale" },
    };

    private static readonly Dictionary<string, string> RosterTerms = new()
    {
        [GermanCulture] = "Dienstplan",
        ["en"] = "rota",
        ["fr"] = "planning",
        ["it"] = "turni",
    };

    // Forms of the wrong address per culture (spec §6: de Du, fr vous, it tu; en has one neutral "you").
    private static readonly Dictionary<string, string?> WrongAddressPatterns = new()
    {
        [GermanCulture] = @"\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b",
        ["en"] = null,
        ["fr"] = @"(?i)\b(tu|toi|te|ton|ta|tes|t')\b",
        ["it"] = @"\b(Lei|Sua|Suo|Sue|Suoi)\b",
    };

    private static readonly Dictionary<string, string[]> GenderShortFormPatterns = new()
    {
        [GermanCulture] = new[] { GenderStarPattern, GenderCapitalIPattern, GenderSlashPattern },
        ["en"] = new[] { @"(?i)\b(he/she|she/he|s/he|his/her|him/her|\(s\)he)\b" },
        ["fr"] = new[] { @"\p{L}·\p{L}", @"\p{L}\.e(s)?\b", @"\p{L}\(e\)", @"\p{L}/e\b" },
        ["it"] = new[] { "ə", @"\p{L}\*", @"\p{L}/a\b", @"\p{L}@\p{L}" },
    };

    private static readonly Dictionary<string, string[]> ForbiddenPhrases = new()
    {
        [GermanCulture] = new[]
        {
            "gratis", "kostenlos", "Klacksy plant", "Klacksy rechnet", "Klacksy berechnet", "Klacksy optimiert",
            "bewährt", "im Einsatz bei", "unsere Partner", "Pilotbetrieb", "verlassen das Haus", "automatisch anrufen", "bucht ein",
            "ein Satz genügt", "genügt ein Satz", "Klacksy prüft",
        },
        ["en"] = new[]
        {
            "free of charge", "for free", "Klacksy plans", "Klacksy calculates", "Klacksy optimises", "Klacksy optimizes",
            "Klacksy checks", "proven", "used by", "our partners", "pilot", "never leaves", "calls automatically", "one sentence is enough",
        },
        ["fr"] = new[]
        {
            "gratuit", "Klacksy planifie", "Klacksy calcule", "Klacksy optimise", "Klacksy vérifie", "éprouvé",
            "nos partenaires", "pilote", "ne quittent jamais", "appelle automatiquement", "une phrase suffit",
        },
        ["it"] = new[]
        {
            "gratis", "gratuit", "Klacksy pianifica", "Klacksy calcola", "Klacksy ottimizza", "Klacksy verifica", "collaudato",
            "i nostri partner", "pilota", "non lasciano mai", "chiama automaticamente", "basta una frase",
        },
    };

    private static readonly Dictionary<string, string> AiDisclosureWords = new()
    {
        [GermanCulture] = "KI",
        ["en"] = "AI",
        ["fr"] = "IA",
        ["it"] = "IA",
    };

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
        ("talk.bubble.2", "Warum steht Beat in der Fehlerliste?"),
        ("ai.text", "Klacks stellt Klacksy die Fähigkeiten bereit. Das KI-Modell dahinter bestimmst du: von einem Anbieter deiner Wahl oder auf deinem eigenen Server. Heute das beste, morgen das nächste – du bist an niemanden gebunden."),
        ("data.text", "Deine Daten liegen bei dir – nicht bei uns und in keiner Klacks-Cloud. Welche Dienste Klacks von aussen nutzt – etwa das KI-Modell oder den Kartendienst –, bestimmst du."),
        ("start.text", "Haben wir dich neugierig gemacht? Rede mit unserem elektronischen Mitarbeiter."),
    };

    private static readonly string[] OwnerCards =
    {
        "Nächste Woche planen? Ein Satz an Klacksy startet die Planung. Klacks rechnet – und du sagst Ja.",
        "Was steht in der Fehlerliste? Klacks prüft deine Regeln. Verstösse zeigt die Fehlerliste – Klacksy erklärt sie.",
        "Jemand fällt aus? Klacksy zeigt passende Leute mit Begründung – du wählst.",
    };

    private const string OwnerCostText = "Keine Lizenzgebühren, kein Abo – Klacks ist Open Source. Du brauchst nur einen eigenen PC oder Server und das KI-Modell deiner Wahl. Und wenn du willst, einen IT-Dienstleister, der Klacks für dich betreut.";

    private static readonly string[] OwnerChips = { "Spitex", "Spitäler", "Hotellerie & Gastronomie", "Logistik", "Security", "Hausdienste" };

    private static IEnumerable<string> Cultures => SiteModes.SimplePageCultures;

    private static IEnumerable<string> TranslatedCultures => SiteModes.SimplePageCultures.Where(culture => culture != GermanCulture);

    [Test]
    public void Owner_texts_appear_word_for_word()
    {
        var texts = Load(GermanCulture);

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

    [TestCaseSource(nameof(TranslatedCultures))]
    public void Every_translation_has_exactly_the_german_keys_and_no_empty_or_untranslated_text(string culture)
    {
        var german = Load(GermanCulture);
        var texts = Load(culture);

        texts.Keys.OrderBy(key => key, StringComparer.Ordinal).ShouldBe(german.Keys.OrderBy(key => key, StringComparer.Ordinal), culture);
        texts.Values.ShouldAllBe(value => !string.IsNullOrWhiteSpace(value), culture);
        texts.Where(entry => entry.Value == german[entry.Key] && !entry.Key.StartsWith(AudienceChipPrefix, StringComparison.Ordinal) && entry.Value.Split(' ').Length > 2)
            .Select(entry => entry.Key).ShouldBeEmpty($"{culture}: German text left untranslated");
    }

    [TestCaseSource(nameof(Cultures))]
    public void Title_meta_and_hero_name_the_search_terms(string culture)
    {
        var texts = Load(culture);

        foreach (var term in SearchTerms[culture])
        {
            foreach (var key in new[] { "pageTitle", "metaDescription", "hero.title", "hero.subtitle" })
            {
                texts[key].ShouldContain(term, Case.Insensitive, $"{culture}/{key}");
            }
        }

        texts["pageTitle"].ShouldContain(RosterTerms[culture], Case.Insensitive, culture);
        texts["pageTitle"].ShouldContain(AllowedPlaceholder, Case.Sensitive, culture);
    }

    [TestCaseSource(nameof(Cultures))]
    public void Meta_description_fits_the_search_snippet(string culture)
    {
        Load(culture)["metaDescription"].Length.ShouldBeLessThanOrEqualTo(MaxMetaDescriptionLength, culture);
    }

    [Test]
    public void Every_shared_demo_modal_key_has_a_simple_counterpart()
    {
        var simple = Load(GermanCulture);
        var shared = LoadFile(GermanCulture, SharedFileName);
        var modalKeys = shared.Keys.Where(key => key.StartsWith(DemoModalKeyPrefix, StringComparison.Ordinal)).ToList();

        modalKeys.ShouldNotBeEmpty();
        foreach (var key in modalKeys)
        {
            simple.ContainsKey(key).ShouldBeTrue(key);
        }
    }

    [TestCaseSource(nameof(Cultures))]
    public void Texts_keep_the_address_form_no_jargon_no_forbidden_claims_and_no_gender_short_form(string culture)
    {
        foreach (var (key, value) in Load(culture))
        {
            if (WrongAddressPatterns[culture] is { } address)
            {
                Regex.IsMatch(value, address).ShouldBeFalse($"{culture}/{key}: wrong address form in '{value}'");
            }

            foreach (var pattern in GenderShortFormPatterns[culture])
            {
                Regex.IsMatch(value, pattern).ShouldBeFalse($"{culture}/{key}: gender short form /{pattern}/ in '{value}'");
            }

            foreach (var word in Jargon)
            {
                Regex.IsMatch(value, $@"\b{Regex.Escape(word)}\b", RegexOptions.IgnoreCase).ShouldBeFalse($"{culture}/{key}: jargon '{word}'");
            }

            foreach (var phrase in ForbiddenPhrases[culture])
            {
                value.ShouldNotContain(phrase, Case.Insensitive, $"{culture}/{key}: forbidden '{phrase}'");
            }

            Regex.IsMatch(value, MitLicencePattern).ShouldBeFalse($"{culture}/{key}: the licence is AGPL-3.0-only, never MIT");
        }
    }

    [TestCaseSource(nameof(Cultures))]
    public void Country_is_the_only_placeholder(string culture)
    {
        foreach (var (key, value) in Load(culture))
        {
            Regex.Matches(value, PlaceholderPattern).Select(match => match.Value).ShouldAllBe(placeholder => placeholder == AllowedPlaceholder, $"{culture}/{key}");
        }
    }

    [TestCaseSource(nameof(Cultures))]
    public void Playground_entry_names_the_playground_and_the_story_note_discloses_ai(string culture)
    {
        var texts = Load(culture);

        texts["start.playgroundSubtitle"].ShouldContain(PlaygroundName, Case.Sensitive, culture);
        Regex.IsMatch(texts["story.note"], $@"\b{AiDisclosureWords[culture]}\b").ShouldBeTrue(culture);
    }

    [TestCaseSource(nameof(Cultures))]
    public void Section_text_stays_within_the_word_budget_of_the_culture(string culture)
    {
        var words = Load(culture)
            .Where(entry => !NonSectionKeyPrefixes.Any(prefix => entry.Key.StartsWith(prefix, StringComparison.Ordinal)))
            .Sum(entry => Regex.Matches(entry.Value, WordPattern).Count);

        words.ShouldBeLessThanOrEqualTo(MaxSectionWords[culture], culture);
    }

    [Test]
    public void Every_simple_culture_has_a_word_budget_search_terms_and_guards()
    {
        foreach (var culture in Cultures)
        {
            MaxSectionWords.ShouldContainKey(culture);
            SearchTerms.ShouldContainKey(culture);
            RosterTerms.ShouldContainKey(culture);
            WrongAddressPatterns.ShouldContainKey(culture);
            GenderShortFormPatterns.ShouldContainKey(culture);
            ForbiddenPhrases.ShouldContainKey(culture);
            AiDisclosureWords.ShouldContainKey(culture);
        }
    }

    [TestCaseSource(nameof(TranslatedCultures))]
    public void Industry_chips_use_the_titles_of_the_linked_industry_pages(string culture)
    {
        var texts = Load(culture);
        var index = LoadFile(culture, IndexFileName);

        foreach (var slug in Shared.SimpleStartTemplate.AudienceSlugs)
        {
            texts[AudienceChipPrefix + slug].ShouldBe(index[string.Format(IndustryTitleKeyFormat, slug)], $"{culture}/{slug}");
        }
    }

    [TestCaseSource(nameof(TranslatedCultures))]
    public void Prefixed_simple_cultures_name_every_country_in_their_language(string culture)
    {
        var names = LoadFile(culture, CountriesFileName);

        names.Keys.OrderBy(key => key, StringComparer.Ordinal).ShouldBe(CountryIndustries.AllCountries.OrderBy(key => key, StringComparer.Ordinal), culture);
        names.Values.ShouldAllBe(value => !string.IsNullOrWhiteSpace(value), culture);
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

    private static Dictionary<string, string> Load(string culture) => LoadFile(culture, FileName);

    private static Dictionary<string, string> LoadFile(string culture, string fileName)
        => JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, culture, fileName)))!;
}
