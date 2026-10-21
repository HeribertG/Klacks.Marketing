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
/// neutral "you", fr vous, it tu, and the register chosen for each of the other cultures), uses no jargon, none of the forbidden claims and no gender star or comparable short
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
    private const string HtmlEntityPattern = @"&(?:[A-Za-z][A-Za-z0-9]*|#\d+|#x[0-9A-Fa-f]+);";
    private const string IndustryTitleKeyPrefix = "industries.";
    private const string TitleKeySuffix = ".title";
    private const string LatinWordPatternFormat = @"(?<![A-Za-z]){0}(?![A-Za-z])";
    private const string WordPattern = @"\p{L}[\p{L}\p{N}'’-]*";
    private const int MaxMetaDescriptionLength = 155;

    private const string KlacksWithoutYPattern = @"Klacks(?!y)";
    private const string KlacksyName = "Klacksy";

    private static readonly string[] CalculationSentenceKeys = { "tasks.0.text", "tasks.1.text", "human.text" };

    private static readonly HashSet<string> SpacelessCultures = new() { "ja", "ko", "th", "zh-CN", "zh-TW" };

    private static readonly string[] Jargon ={ "Container", "Cutting", "Autofill", "LLM", "MCP", "Tool-Calling", "tool calling" };

    private static readonly string[] NonSectionKeyPrefixes = { "pageTitle", "metaDescription", "nav.", "switch.", "share.", "talk.videoLabel", "demoModal.", "demoData.", "story.", "weekStory." };

    // The German section text is held to the owner's budget of 350 words; the translations get the word count of their
    // faithful translation (no claim dropped), measured on 2026-10-17 (en, fr, it) and 2026-10-18 (the other cultures,
    // the measured value rounded up to the next 5): most languages need more words than German compounds. A translation
    // may get shorter, never longer. For ja, ko, th, vi, zh-CN and zh-TW the count (runs of letters, see WordPattern) is
    // not a word count - Han and Japanese text has no spaces, Thai splits at vowel marks - so there the budget is only a
    // growth guard on the measured value. 2026-10-18: the owner replaced "click work" by "Fleissarbeit" (drudge work) in the
    // hero, human and meta texts of all cultures; the longer phrasing raised en, fr, it, da, el, id, ko, ms, nb, pt, vi by 1-4 words.
    private static readonly Dictionary<string, int> MaxSectionWords = new()
    {
        [GermanCulture] = 350,
        ["en"] = 399,
        ["fr"] = 426,
        ["it"] = 402,
        ["ar"] = 340,
        ["cs"] = 355,
        ["da"] = 381,
        ["el"] = 423,
        ["es"] = 435,
        ["fi"] = 290,
        ["he"] = 350,
        ["id"] = 378,
        ["ms"] = 383,
        ["nb"] = 367,
        ["nl"] = 375,
        ["pl"] = 355,
        ["pt"] = 446,
        ["ro"] = 405,
        ["sv"] = 370,
        ["ja"] = 105,
        ["ko"] = 307,
        ["th"] = 460,
        ["vi"] = 537,
        ["zh-CN"] = 150,
        ["zh-TW"] = 145,
    };

    private static readonly Dictionary<string, string[]> SearchTerms = new()
    {
        [GermanCulture] = new[] { "Personalplanung" },
        ["en"] = new[] { "workforce planning" },
        ["fr"] = new[] { "planification du personnel" },
        ["it"] = new[] { "pianificazione del personale" },
        ["ar"] = new[] { "تخطيط القوى العاملة" },
        ["cs"] = new[] { "plánování personálu" },
        ["da"] = new[] { "personaleplanlægning" },
        ["el"] = new[] { "προγραμματισμός προσωπικού" },
        ["es"] = new[] { "planificación de personal" },
        ["fi"] = new[] { "henkilöstösuunnittelu" },
        ["he"] = new[] { "תכנון כוח אדם" },
        ["id"] = new[] { "penjadwalan tenaga kerja" },
        ["ja"] = new[] { "人員計画" },
        ["ko"] = new[] { "인력 배치 계획" },
        ["ms"] = new[] { "perancangan tenaga kerja" },
        ["nb"] = new[] { "bemanningsplanlegging" },
        ["nl"] = new[] { "personeelsplanning" },
        ["pl"] = new[] { "planowania personelu" },
        ["pt"] = new[] { "planeamento de pessoal" },
        ["ro"] = new[] { "planificarea personalului" },
        ["sv"] = new[] { "personalplanering" },
        ["th"] = new[] { "การวางแผนกำลังคน" },
        ["vi"] = new[] { "lập kế hoạch nhân sự" },
        ["zh-CN"] = new[] { "人员排班" },
        ["zh-TW"] = new[] { "人力排班" },
    };

    private static readonly Dictionary<string, string> RosterTerms = new()
    {
        [GermanCulture] = "Dienstplan",
        ["en"] = "rota",
        ["fr"] = "planning",
        ["it"] = "turni",
        ["ar"] = "جدول الدوام",
        ["cs"] = "rozpis směn",
        ["da"] = "vagtplan",
        ["el"] = "πρόγραμμα βαρδιών",
        ["es"] = "turnos",
        ["fi"] = "työvuorolista",
        ["he"] = "תוכנית משמרות",
        ["id"] = "jadwal kerja",
        ["ja"] = "シフト表",
        ["ko"] = "근무표",
        ["ms"] = "jadual syif",
        ["nb"] = "vaktplan",
        ["nl"] = "dienstrooster",
        ["pl"] = "grafik",
        ["pt"] = "escalas",
        ["ro"] = "ture",
        ["sv"] = "scheman",
        ["th"] = "ตารางเวร",
        ["vi"] = "phân ca",
        ["zh-CN"] = "排班表",
        ["zh-TW"] = "班表",
    };

    // Forms of the wrong address per culture (spec §6: de Du, fr vous, it tu; en has one neutral "you"). The other
    // cultures were translated with: es tú, ro dumneavoastră, sv du, cs vy, da du, fi sinä, el singular informal, nl je,
    // nb du, pl ty, pt neutral polite (no tu), id Anda, ms anda, vi bạn, ja polite (です/ます), ko 해요체, zh 您
    // throughout, th without ครับ/ค่ะ, ar/he plural. Each pattern is the forbidden form of that register; where the
    // forbidden form is also an ordinary word of the language the pattern is narrowed to what stays safe (cs "ty" =
    // "those", da/nb "De" = "they", pl "państwo" = "state" are left out).
    private static readonly Dictionary<string, string?> WrongAddressPatterns = new()
    {
        [GermanCulture] = @"\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b",
        ["en"] = null,
        ["fr"] = @"(?i)\b(tu|toi|te|ton|ta|tes|t')\b",
        ["it"] = @"\b(Lei|Sua|Suo|Sue|Suoi)\b",
        ["ar"] = @"\b(أنت|أنتِ|لك|معك|منك|إليك|عليك|بك)\b",
        ["cs"] = @"(?i)\b(tě|tebe|tobě|tebou|tvůj|tvá|tvé|tvoje|tvou|tvého|tvému|tvým|tvých)\b",
        ["da"] = @"\b(Dem|Deres)\b",
        ["el"] = @"(?i)\b(εσείς|εσάς|σας)\b",
        ["es"] = @"(?i)\b(usted|ustedes|su|sus)\b",
        ["fi"] = @"(?i)\b(te|teidän|teille|teitä|teidät)\b",
        ["he"] = @"\b(אתה|אותך|שלך|לך|ממך|איתך|בשבילך)\b",
        ["id"] = @"(?i)\b(kamu|engkau|kau|dikau)\b|-mu\b",
        ["ja"] = @"(である|ではない|じゃない|だった|[るくぐつぬぶむだ]。|(?<!ょ)う。|(?<![でま])す。)",
        ["ko"] = @"(니다(?![가-힣])|[가-힣]다[.!?])",
        ["ms"] = @"(?i)\b(kamu|engkau|kau|awak)\b",
        ["nb"] = @"\b(Dem|Deres)\b",
        ["nl"] = @"(?i)\b(u|uw|uzelf)\b",
        ["pl"] = @"(?i)\b(pan|pani|panu|panią|pana)\b",
        ["pt"] = @"\b([Tt]u|[Tt]e|[Tt]eu|[Tt]ua|[Tt]eus|[Tt]uas|[Cc]ontigo|ti)\b",
        ["ro"] = @"(?i)\b(tu|tău|ta|tale|tăi|te|ți|ție)\b",
        ["sv"] = @"(?i)\b(ni|er|ert|era|eder)\b",
        ["th"] = @"(ครับ|ค่ะ|คะ(?=\s|[.!?,]|$))",
        ["vi"] = @"(?i)\b(anh|chị|em|ông|bà|quý khách|quý vị|mày|cậu)\b",
        ["zh-CN"] = @"[你妳]",
        ["zh-TW"] = @"[你妳]",
    };

    // One sentence per culture in the forbidden register; proves that the pattern above is not accidentally inert.
    private static readonly Dictionary<string, string> WrongAddressSamples = new()
    {
        [GermanCulture] = "Sie entscheiden, Ihr Plan.",
        ["en"] = string.Empty,
        ["fr"] = "Tu décides toi-même.",
        ["it"] = "Lei decide.",
        ["ar"] = "هذا الخيار لك وحدك.",
        ["cs"] = "Je to tvůj plán.",
        ["da"] = "Deres plan afgør det.",
        ["el"] = "Το πρόγραμμά σας.",
        ["es"] = "Usted decide.",
        ["fi"] = "Te päätätte.",
        ["he"] = "זו ההחלטה שלך.",
        ["id"] = "Kamu memutuskan.",
        ["ja"] = "計画を作成するのは人である。",
        ["ko"] = "이 기능은 편리합니다.",
        ["ms"] = "Awak memutuskan.",
        ["nb"] = "Deres plan.",
        ["nl"] = "Dat bepaalt u zelf.",
        ["pl"] = "Pan decyduje.",
        ["pt"] = "Tu decides.",
        ["ro"] = "Tu decizi.",
        ["sv"] = "Ni bestämmer.",
        ["th"] = "ขอบคุณครับ",
        ["vi"] = "Anh quyết định.",
        ["zh-CN"] = "你来决定。",
        ["zh-TW"] = "你來決定。",
    };

    // Gender short forms of the other cultures ("o/a", "(a)", "@", "*"). ja and ko write "人工知能（AI）" / "인공지능(AI)",
    // so the bracket rule would hit their legitimate AI disclosure; their text has no gendered forms anyway.
    private static readonly string[] SlashShortForms = { @"\p{L}/\p{L}", @"\p{L}\*", @"\p{L}@\p{L}" };

    private static readonly string[] BracketAndSlashShortForms = { @"\p{L}/\p{L}", @"\p{L}\*", @"\p{L}@\p{L}", @"\p{L}\(\p{L}{1,2}\)" };

    private static readonly Dictionary<string, string[]> GenderShortFormPatterns = new()
    {
        [GermanCulture] = new[] { GenderStarPattern, GenderCapitalIPattern, GenderSlashPattern },
        ["en"] = new[] { @"(?i)\b(he/she|she/he|s/he|his/her|him/her|\(s\)he)\b" },
        ["fr"] = new[] { @"\p{L}·\p{L}", @"\p{L}\.e(s)?\b", @"\p{L}\(e\)", @"\p{L}/e\b" },
        ["it"] = new[] { "ə", @"\p{L}\*", @"\p{L}/a\b", @"\p{L}@\p{L}" },
        ["ar"] = BracketAndSlashShortForms,
        ["cs"] = BracketAndSlashShortForms,
        ["da"] = BracketAndSlashShortForms,
        ["el"] = BracketAndSlashShortForms,
        ["es"] = BracketAndSlashShortForms,
        ["fi"] = BracketAndSlashShortForms,
        ["he"] = BracketAndSlashShortForms,
        ["id"] = BracketAndSlashShortForms,
        ["ja"] = SlashShortForms,
        ["ko"] = SlashShortForms,
        ["ms"] = BracketAndSlashShortForms,
        ["nb"] = BracketAndSlashShortForms,
        ["nl"] = BracketAndSlashShortForms,
        ["pl"] = BracketAndSlashShortForms,
        ["pt"] = BracketAndSlashShortForms,
        ["ro"] = BracketAndSlashShortForms,
        ["sv"] = BracketAndSlashShortForms,
        ["th"] = BracketAndSlashShortForms,
        ["vi"] = BracketAndSlashShortForms,
        ["zh-CN"] = BracketAndSlashShortForms,
        ["zh-TW"] = BracketAndSlashShortForms,
    };

    private static readonly Dictionary<string, string[]> ForbiddenPhrases = new()
    {
        [GermanCulture] = new[]
        {
            "gratis", "kostenlos", "Klacksy plant", "Klacksy rechnet", "Klacksy berechnet", "Klacksy optimiert",
            "bewährt", "im Einsatz bei", "unsere Partner", "Pilotbetrieb", "verlassen das Haus", "automatisch anrufen", "bucht ein",
            "ein Satz genügt", "genügt ein Satz", "Klacksy prüft", "rechnet Klacksy",
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
            "i nostri partner", "pilota", "non lasciano mai", "chiama automaticamente", "basta una frase", "calcola Klacksy",
        },
        ["ar"] = new[]
        {
            "مجان", "بدون مقابل", "بلا مقابل",
            "Klacksy يخطط", "Klacksy يخطّط", "يخطط Klacksy", "Klacksy يحسب", "يحسب Klacksy", "يحسبها Klacksy", "Klacksy يحسّن", "Klacksy يُحسّن",
            "Klacksy يتحقق", "يتحقق Klacksy", "Klacksy يفحص", "Klacksy ينظم", "Klacksy ينظّم",
            "مجرّب", "مجرب", "أثبت جدارته", "أثبتت جدارتها",
            "قيد الاستخدام لدى", "يُستخدم لدى", "يستخدم لدى", "مستخدم لدى", "مستخدمة لدى", "تستخدمه شركات", "تستخدمه مؤسسات",
            "شركاؤنا", "شركاءنا", "شركائنا",
            "تشغيل تجريبي", "التشغيل التجريبي", "مشروع تجريبي", "المشروع التجريبي", "مرحلة تجريبية", "برنامج تجريبي", "مشروع رائد",
            "لا تغادر", "لا يغادر", "لا تخرج من", "لا يخرج من",
            "يتصل تلقائي", "تتصل تلقائي", "يتصل آلي", "يتصل بهم تلقائي", "يتصل بهم آلي", "اتصال تلقائي",
            "جملة واحدة تكفي", "تكفي جملة واحدة", "جملة واحدة كافية",
        },
        ["cs"] = new[]
        {
            "zdarma", "bezplatn", "gratis", "bez poplatku", "bez jakýchkoli poplatků", "bez placení",
            "Klacksy plánuj", "Klacksy naplánuj", "Klacksy počítá", "počítá Klacksy", "Klacksy vypočít", "Klacksy spočít", "Klacksy optimalizuj",
            "Klacksy kontroluj", "Klacksy zkontroluj", "Klacksy ověřuj", "Klacksy organizuj", "Klacksy sestavuj", "Klacksy sestaví",
            "osvědčen", "prověřen", "vyzkoušený", "vyzkoušená", "vyzkoušené", "ověřený v praxi", "ověřená v praxi", "ověřené v praxi",
            "v nasazení u", "v provozu u", "nasazen u", "nasazeno u", "používají ho firmy", "používají jej firmy", "používáno u", "využívají ho firmy",
            "naši partneři", "našich partnerů", "našim partnerům", "našimi partnery", "naše partnery",
            "pilot",
            "neopustí", "neopouští", "neopouštějí",
            "volá automaticky", "zavolá automaticky", "volají automaticky", "automaticky volá", "automaticky zavolá", "automaticky telefonuje", "telefonuje automaticky", "automatické hovory",
            "stačí jedna věta", "jedna věta stačí", "stačí jediná věta", "jediná věta stačí", "stačí jedna jediná věta",
        },
        ["da"] = new[]
        {
            "gratis", "vederlagsfri", "omkostningsfri", "uden beregning",
            "Klacksy planlæg", "Klacksy regner", "regner Klacksy", "Klacksy beregn", "Klacksy udregn", "Klacksy optimer", "Klacksy kontroller",
            "Klacksy tjekker", "Klacksy checker", "Klacksy organiser", "Klacksy tilrettelæg", "Klacksy laver vagtplan",
            "gennemprøvet", "velprøvet", "gennemtestet", "bevist",
            "i brug hos", "i drift hos", "anvendes hos", "bruges hos", "bruges af virksomheder", "bruges allerede af", "anvendes af virksomheder",
            "vores partnere", "vores samarbejdspartner",
            "pilot",
            "forlader aldrig", "forlader ikke huset", "forlader ikke din", "forlader ikke dit", "forlader ikke virksomheden",
            "ringer automatisk", "ringer op automatisk", "ringer dem op automatisk", "ringer til dem automatisk", "automatiske opkald",
            "én sætning er nok", "en sætning er nok", "én sætning er tilstrækkelig", "en sætning er tilstrækkelig", "nok med én sætning", "nok med en sætning", "én sætning rækker", "en sætning rækker",
        },
        ["el"] = new[]
        {
            "δωρεάν", "χωρίς χρέωση", "τζάμπα", "ανέξοδ",
            "Klacksy σχεδιάζ", "Klacksy προγραμματίζ", "Klacksy υπολογίζ", "Klacksy υπολογίσ", "υπολογίζει το Klacksy", "υπολογίζει ο Klacksy",
            "Klacksy βελτιστοποι", "Klacksy βελτιώ", "Klacksy ελέγχ", "Klacksy επαληθεύ", "Klacksy οργαν",
            "δοκιμασμέν", "αποδεδειγμέν",
            "σε χρήση από", "σε χρήση σε", "χρησιμοποιείται από", "χρησιμοποιείται ήδη", "χρησιμοποιούν ήδη",
            "οι συνεργάτες μας", "συνεργάτες μας", "συνεργατών μας", "εταίροι μας", "εταίρων μας", "εταίρους μας",
            "πιλοτικ",
            "δεν φεύγουν ποτέ", "δεν φεύγει ποτέ", "δεν βγαίνουν ποτέ", "δεν βγαίνει ποτέ", "δεν εγκαταλείπουν ποτέ", "δεν εγκαταλείπει ποτέ", "δεν φεύγουν από",
            "καλεί αυτόματα", "τηλεφωνεί αυτόματα", "αυτόματα καλεί", "αυτόματα τηλεφωνεί", "αυτόματες κλήσεις", "αυτόματη κλήση",
            "αρκεί μία πρόταση", "αρκεί μια πρόταση", "μία πρόταση αρκεί", "μια πρόταση αρκεί", "αρκεί μόνο μία πρόταση", "αρκεί μόνο μια πρόταση",
        },
        ["es"] = new[]
        {
            "gratis", "gratuito", "gratuita", "gratuitamente", "sin coste", "sin costo", "sin cargo",
            "Klacksy planific", "Klacksy planea", "Klacksy calcul", "calcula Klacksy", "Klacksy optimiz", "Klacksy comprueb", "Klacksy verific",
            "Klacksy revis", "Klacksy organiz", "Klacksy programa",
            " probado", " probada", "contrastado", "contrastada", "eficacia demostrada", "eficacia comprobada",
            "en uso en", "en uso por", "utilizado por", "usado por", "utilizada por", "usada por", "ya lo usan", "ya lo utilizan", "en funcionamiento en",
            "nuestros socios", "nuestros colaboradores", "nuestros aliados", "nuestros partners",
            "piloto",
            "nunca salen", "nunca sale", "jamás salen", "jamás sale", "nunca abandonan", "nunca abandona", "no salen de tu", "no sale de tu",
            "llama automáticamente", "llaman automáticamente", "telefonea automáticamente", "llamada automática", "llamadas automáticas", "llama de forma automática",
            "basta una frase", "basta con una frase", "una frase basta", "una sola frase basta", "basta con una sola frase", "con una frase es suficiente", "una frase es suficiente",
        },
        ["fi"] = new[]
        {
            "ilmai", "veloituksetta", "maksutta", "maksuton", "kustannuksetta",
            "Klacksy suunnittel", "Klacksy laskee", "laskee Klacksy", "Klacksy laatii", "Klacksy optimoi", "Klacksy tarkist", "Klacksy tarkast", "Klacksy organisoi",
            "koeteltu", "todistetusti", "käytännössä testattu", "todettu toimivaksi", "osoittautunut toimivaksi",
            "käytössä yrityksissä", "käyttävät jo", "käytössä asiakkailla", "käytössä mm.",
            "kumppanimme", "kumppaneitamme", "kumppaneidemme", "kumppaneillemme", "kumppaneiltamme",
            "pilotti", "pilotoi",
            "ei poistu koskaan", "eivät poistu koskaan", "ei koskaan poistu", "eivät koskaan poistu", "ei lähde koskaan", "eivät lähde koskaan", "ei koskaan lähde", "eivät koskaan lähde", "eivät poistu talosta",
            "soittaa automaattisesti", "soittavat automaattisesti", "automaattisesti soittaa", "automaattisesti soittavat",
            "yksi lause riittää", "riittää yksi lause", "yksi virke riittää", "riittää yksi virke", "yksi lause on riittävä", "yhdellä lauseella riittää", "riittää yhdellä lauseella",
        },
        ["he"] = new[]
        {
            "בחינם", "חינמי", "חינם", "ללא תשלום", "בלי תשלום", "ללא עלות", "בלי עלות",
            "Klacksy מתכנן", "Klacksy מחשב", "מחשב Klacksy", "Klacksy מייעל", "Klacksy בודק", "Klacksy מוודא", "Klacksy מארגן", "Klacksy מסדר",
            "מוכח", "הוכיח את עצמו", "הוכיחה את עצמה",
            "בשימוש אצל", "בשימוש בקרב", "בשימוש בחברות", "משמש חברות", "כבר משתמשים ב",
            "השותפים שלנו", "שותפים שלנו", "השותפות שלנו", "שותפינו",
            "פיילוט", "פילוט",
            "לעולם לא עוזב", "לעולם לא יוצא", "אף פעם לא עוזב", "אף פעם לא יוצא", "לא עוזבים לעולם", "לא יוצאים לעולם", "לא עוזבת לעולם", "לא יוצאת לעולם", "אינם עוזבים", "אינם יוצאים",
            "מתקשר אוטומטית", "מתקשרת אוטומטית", "מתקשרים אוטומטית", "מחייג אוטומטית", "מטלפן אוטומטית", "מתקשר באופן אוטומטי", "מתקשרים באופן אוטומטי",
            "משפט אחד מספיק", "מספיק משפט", "די במשפט אחד", "משפט אחד דיו", "משפט אחד בלבד מספיק",
        },
        ["id"] = new[]
        {
            "gratis", "cuma-cuma", "bebas biaya", "tidak dipungut biaya", "tanpa dipungut biaya", "tanpa biaya apa pun", "tanpa bayar",
            "Klacksy merencanakan", "Klacksy menjadwalkan", "Klacksy menghitung", "dihitung Klacksy", "dihitung oleh Klacksy", "Klacksy mengoptimalkan",
            "Klacksy mengoptimasi", "Klacksy memeriksa", "diperiksa Klacksy", "Klacksy mengecek", "Klacksy memverifikasi", "Klacksy mengorganisasi", "Klacksy menyusun",
            "terbukti", "teruji",
            "digunakan oleh", "dipakai oleh", "sudah dipakai", "sudah digunakan", "digunakan di berbagai", "dipakai di berbagai", "dipakai banyak",
            "mitra kami", "partner kami", "rekanan kami", "rekan kerja sama kami",
            "percontohan", "pilot",
            "tidak pernah keluar", "tak pernah keluar", "tidak pernah meninggalkan", "tak pernah meninggalkan", "tidak akan keluar dari", "tidak meninggalkan komputer", "tidak meninggalkan perusahaan",
            "menelepon secara otomatis", "menelepon otomatis", "menelpon otomatis", "otomatis menelepon", "secara otomatis menelepon", "menghubungi secara otomatis", "menghubungi otomatis",
            "satu kalimat cukup", "satu kalimat sudah cukup", "cukup satu kalimat", "cukup dengan satu kalimat", "cukup sebuah kalimat",
        },
        ["ja"] = new[]
        {
            "無料", "無償", "0円", "ゼロ円", "タダ",
            "Klacksyが計画", "Klacksyは計画を", "Klacksyは計画し", "Klacksyが計算", "Klacksyは計算", "Klacksyが最適化", "Klacksyは最適化", "Klacksyが確認", "Klacksyがチェック",
            "Klacksyが検証", "Klacksyが検査", "Klacksyが調整", "Klacksyがシフト", "Klacksyがルール", "Klacksyがあなたのルール",
            "実証済み", "実績豊富", "実績のある", "導入実績", "信頼と実績", "検証済み",
            "導入されて", "導入済み", "で採用されて", "採用されて", "企業で使われて", "企業で利用されて", "企業で使用されて", "でご利用いただいて", "利用中の企業",
            "当社のパートナー", "弊社のパートナー", "私たちのパートナー", "パートナー企業", "提携先", "パートナー各社",
            "試験運用", "パイロット", "試験導入", "先行導入", "実証実験",
            "外に出ません", "外部に出ません", "外に出ることはありません", "外部に送信されません", "外部へ送信されません", "社外に出ません", "手元から離れません", "手元を離れません", "外に出ない", "離れることはありません", "持ち出されません",
            "自動で電話", "自動的に電話", "自動で架電", "自動的に架電", "自動で発信", "自動発信", "自動的に発信", "自動で連絡", "自動的に連絡",
            "一言で十分", "一言で足り", "一言で済", "一文で十分", "一文で足り", "一文で済", "一言あれば十分", "一文あれば十分",
        },
        ["ko"] = new[]
        {
            "무료", "공짜", "무상", "0원", "비용 없이", "요금 없이",
            "Klacksy가 계획", "Klacksy는 계획을", "Klacksy는 계획해", "Klacksy가 일정", "Klacksy가 계산", "Klacksy는 계산", "Klacksy가 설정한 규칙", "Klacksy가 최적화", "Klacksy는 최적화",
            "Klacksy가 확인", "Klacksy는 확인", "Klacksy가 검사", "Klacksy가 검증", "Klacksy가 점검", "Klacksy가 근무표", "Klacksy가 조정",
            "검증된", "입증된", "검증 완료", "검증을 마친", "현장에서 검증", "실적이 입증",
            "도입한 기업", "도입되어 있", "기업에서 사용", "기업들이 사용", "기업에서 쓰", "고객사", "사용 중인 기업", "이미 사용하고 있",
            "파트너사", "저희 파트너", "우리 파트너", "파트너 기업", "협력사", "제휴사",
            "시범 운영", "파일럿", "시범 도입", "시범 적용", "시범 사업",
            "밖으로 나가지", "외부로 나가지", "외부로 전송되지", "외부로 유출되지", "떠나지 않", "벗어나지 않", "나가지 않",
            "자동으로 전화", "자동 전화", "자동으로 연락", "알아서 전화", "자동 발신", "자동으로 걸어",
            "한 문장이면 충분", "한 문장이면 돼", "한 문장이면 끝", "한 문장으로 충분", "한 문장만으로 충분", "한 문장이면 족", "한 문장만 있으면",
        },
        ["ms"] = new[]
        {
            "percuma", "tanpa bayaran", "tanpa kos", "tiada kos", "tiada bayaran", "tanpa caj", "tiada caj",
            "Klacksy merancang", "Klacksy mengira", "Klacksy akan mengira", "Klacksy mengoptimumkan", "Klacksy memeriksa", "Klacksy menyemak", "Klacksy mengesahkan",
            "Klacksy menjadualkan", "Klacksy menyusun", "Klacksy akan merancang", "Klacksy akan memeriksa", "dikira oleh Klacksy",
            "terbukti", "teruji",
            "digunakan oleh", "dipakai oleh", "telah digunakan di", "sudah digunakan di", "digunakan di pelbagai", "digunakan di banyak", "sedang digunakan di", "dalam penggunaan di",
            "rakan kongsi kami", "rakan kerjasama kami", "rakan niaga kami", "mitra kami", "partner kami", "rakan strategik kami",
            "pilot", "perintis", "operasi percubaan",
            "tidak pernah keluar", "tidak pernah meninggalkan", "tak pernah meninggalkan", "tak pernah keluar", "tidak akan keluar dari", "tidak akan meninggalkan", "tidak meninggalkan komputer", "tidak meninggalkan syarikat",
            "menelefon secara automatik", "menelefon automatik", "secara automatik menelefon", "menelefon mereka secara automatik", "menghubungi secara automatik", "menghubungi mereka secara automatik", "membuat panggilan secara automatik",
            "satu ayat sudah cukup", "satu ayat cukup", "cukup satu ayat", "cukup dengan satu ayat", "satu ayat memadai", "memadai dengan satu ayat",
        },
        ["nb"] = new[]
        {
            "gratis", "kostnadsfri", "uten kostnad", "uten kostnader", "uten betaling", "vederlagsfri",
            "Klacksy planlegg", "Klacksy regn", "regner Klacksy", "Klacksy beregn", "Klacksy optimaliser", "Klacksy kontroller", "Klacksy sjekk", "Klacksy organiser", "Klacksy lager vaktplan",
            "utprøvd", "velprøvd", "gjennomprøvd", "gjennomtestet", "bevist effektiv",
            "i bruk hos", "brukes hos", "brukes av bedrifter", "brukes av flere", "brukes allerede", "i drift hos", "benyttes av bedrifter",
            "våre partnere", "våre samarbeidspartner",
            "pilot",
            "forlater aldri", "forlater ikke huset", "forlater ikke din", "forlater ikke ditt", "forlater ikke bedriften", "forlater ikke virksomheten",
            "ringer automatisk", "ringer opp automatisk", "ringer dem automatisk", "automatiske anrop", "automatiske telefonanrop",
            "én setning er nok", "en setning er nok", "én setning holder", "en setning holder", "holder med én setning", "holder med en setning", "setning er tilstrekkelig", "nok med én setning", "nok med en setning",
        },
        ["nl"] = new[]
        {
            "gratis", "kosteloos", "kosteloze", "kostenloos", "kostenloze", "voor niks", "voor niets", "zonder betaling",
            "Klacksy plant", "Klacksy reken", "rekent Klacksy", "Klacksy bereken", "Klacksy optimaliseer", "Klacksy controleer", "Klacksy check", "Klacksy organiseer",
            "Klacksy rooster", "Klacksy maakt het rooster", "Klacksy stelt het rooster op",
            "bewezen", "beproefd", "in de praktijk getest", "getest in de praktijk",
            "in gebruik bij", "gebruikt door bedrijven", "gebruikt door organisaties", "gebruikt door klanten", "ingezet bij", "al in gebruik", "reeds in gebruik",
            "onze partners", "onze samenwerkingspartner", "onze partnerbedrijven",
            "pilot",
            "verlaat nooit", "verlaten nooit", "verlaat je computer niet", "verlaten je computer niet", "verlaat het bedrijf niet", "verlaten het bedrijf niet", "verlaat het huis niet", "verlaten het huis niet",
            "belt automatisch", "bellen automatisch", "automatisch belt", "automatisch bellen", "belt ze automatisch", "belt hen automatisch", "automatische telefoontjes", "automatische oproepen",
            "één zin is genoeg", "één zin is al genoeg", "een zin is genoeg", "één zin volstaat", "een zin volstaat", "één zin is voldoende", "een zin is voldoende", "volstaat één zin", "genoeg met één zin", "genoeg met een zin",
        },
        ["pl"] = new[]
        {
            "za darmo", "bezpłatn", "darmow", "gratis", "bez żadnych opłat",
            "Klacksy planuj", "Klacksy zaplanuj", "Klacksy licz", "liczy Klacksy", "Klacksy polic", "Klacksy oblicz", "Klacksy optymalizu", "Klacksy sprawdz", "sprawdza Klacksy",
            "Klacksy weryfik", "Klacksy zweryfik", "Klacksy kontrol", "Klacksy organizu", "Klacksy układ",
            "sprawdzon", "wypróbowan", "udowodnion", "przetestowan",
            "w użyciu u", "używany przez firmy", "używany przez klientów", "używają go już", "stosowany przez", "wdrożony u", "wdrożone u", "korzystają z niego",
            "nasi partnerzy", "naszych partnerów", "naszym partnerom", "naszymi partnerami", "naszych partnerach",
            "pilot",
            "nie opuszczają", "nie opuszcza", "nigdy nie wychodzą", "nigdy nie wychodzi", "nie wychodzą poza", "nie wychodzi poza",
            "dzwoni automatycznie", "dzwonią automatycznie", "automatycznie dzwoni", "automatycznie dzwonią", "telefonuje automatycznie", "automatycznie telefonuje", "automatyczne telefony", "automatyczne połączenia",
            "wystarczy jedno zdanie", "jedno zdanie wystarczy", "wystarczy tylko jedno zdanie", "wystarczy jedynie jedno zdanie", "wystarczy jedno krótkie zdanie", "wystarczy zdanie", "jedno zdanie to wszystko",
        },
        ["pt"] = new[]
        {
            "grátis", "gratuito", "gratuita", "gratuitamente", "de graça", "sem qualquer custo", "sem custo algum", "sem pagar nada",
            "Klacksy planeia", "Klacksy planej", "Klacksy planific", "Klacksy calcul", "calculado pelo Klacksy", "Klacksy otimiz", "Klacksy verific", "Klacksy valid",
            "Klacksy confer", "Klacksy organiz", "Klacksy agend", "Klacksy elabor",
            "comprovad", "provado na prática", "testado e aprovado", "experimentado e testado",
            "em uso em", "em uso por", "utilizado por", "usado por", "utilizada por", "usada por", "já é usado", "já é utilizado", "em utilização em",
            "nossos parceiros", "os nossos parceiros", "nossas parceiras", "nossas empresas parceiras",
            "piloto",
            "nunca saem", "nunca sai", "jamais saem", "jamais sai", "nunca abandonam", "nunca abandona", "não saem da sua", "não sai da sua", "não saem do seu", "não sai do seu",
            "telefona automaticamente", "liga automaticamente", "ligam automaticamente", "telefonam automaticamente", "ligação automática", "chamadas automáticas", "liga de forma automática",
            "basta uma frase", "uma frase basta", "uma frase é suficiente", "basta apenas uma frase", "basta uma única frase", "uma única frase basta", "uma frase chega", "chega uma frase",
        },
        ["ro"] = new[]
        {
            "gratuit", "gratis", "pe gratis", "fără niciun cost", "fără nicio plată", "fără plată", "cost zero", "zero costuri",
            "Klacksy planific", "Klacksy calcul", "calculează Klacksy", "Klacksy optimiz", "Klacksy verific", "Klacksy organiz", "Klacksy programeaz", "Klacksy întocme", "Klacksy controleaz",
            "dovedit", "încercat și testat", "verificat în practică", "testat în practică", " probat",
            "folosit de companii", "folosit de firme", "utilizat de companii", "utilizat de firme", "folosit deja", "utilizat deja", "în uz la", "în utilizare la", "în funcțiune la",
            "partenerii noștri", "partenerilor noștri", "partenerii nostri", "colaboratorii noștri",
            "pilot",
            "nu părăsesc niciodată", "nu părăsește niciodată", "niciodată nu părăsesc", "niciodată nu părăsește", "nu ies niciodată", "nu iese niciodată", "nu pleacă niciodată", "nu părăsesc calculatorul", "nu părăsesc firma",
            "sună automat", "apelează automat", "telefonează automat", "apel automat", "apeluri automate",
            "ajunge o frază", "ajunge o singură frază", "o frază ajunge", "o singură frază ajunge", "o frază este suficientă", "o singură frază este suficientă", "este suficientă o frază", "e suficientă o frază", "o frază e de ajuns",
        },
        ["sv"] = new[]
        {
            "gratis", "kostnadsfri", "utan kostnad", "utan avgift", "avgiftsfri",
            "Klacksy planer", "Klacksy räkn", "räknar Klacksy", "Klacksy beräkn", "Klacksy optimer", "Klacksy kontroller", "Klacksy kolla", "Klacksy organiser", "Klacksy schemalägg", "Klacksy upprättar",
            "beprövad", "beprövat", "bevisad", "utprövad",
            "används av företag", "används hos", "används redan", "används av flera", "i bruk hos", "i drift hos",
            "våra partners", "våra partner", "våra samarbetspartner", "våra partnerföretag",
            "pilot",
            "lämnar aldrig", "lämnar inte huset", "lämnar inte din", "lämnar inte ditt", "lämnar inte företaget",
            "ringer automatiskt", "ringer upp automatiskt", "ringer dem automatiskt", "ringer upp dem automatiskt", "automatiska samtal", "automatiska telefonsamtal",
            "en mening räcker", "en enda mening räcker", "räcker med en mening", "räcker med en enda mening", "en mening är nog", "en mening är tillräcklig",
        },
        ["th"] = new[]
        {
            "ฟรี", "ไม่มีค่าใช้จ่าย", "ไม่เสียค่าใช้จ่าย", "ไม่คิดค่าบริการ", "ไม่คิดเงิน", "ให้เปล่า",
            "Klacksy วางแผน", "Klacksy จะวางแผน", "Klacksy คำนวณ", "Klacksy จะคำนวณ", "Klacksy เป็นผู้คำนวณ", "Klacksy ตรวจ", "Klacksy จะตรวจ", "Klacksy ปรับให้เหมาะสม",
            "Klacksy เพิ่มประสิทธิภาพ", "Klacksy จัดตาราง", "Klacksy จัดเวร",
            "พิสูจน์แล้ว", "ผ่านการพิสูจน์", "ได้รับการพิสูจน์", "ผ่านการทดสอบมาแล้ว", "ผ่านการใช้งานจริงมาแล้ว",
            "ใช้งานอยู่ที่", "ใช้งานโดย", "ถูกใช้งานโดย", "ถูกใช้โดย", "ใช้อยู่ที่", "ลูกค้าที่ใช้",
            "พันธมิตรของเรา", "คู่ค้าของเรา", "หุ้นส่วนของเรา", "พันธมิตรทางธุรกิจของเรา", "พาร์ทเนอร์ของเรา", "พาร์ตเนอร์ของเรา",
            "นำร่อง", "ไพลอต", "ไพลอท", "พายลอต",
            "ไม่เคยออกจาก", "ไม่ออกจาก", "ไม่หลุดออก", "ไม่มีวันออกจาก",
            "โทรอัตโนมัติ", "โทรโดยอัตโนมัติ", "โทรหาโดยอัตโนมัติ", "โทรหาอัตโนมัติ", "โทรออกอัตโนมัติ", "โทรออกโดยอัตโนมัติ", "โทรศัพท์โดยอัตโนมัติ",
            "ประโยคเดียวก็พอ", "ประโยคเดียวพอ", "ประโยคเดียวก็เพียงพอ", "ประโยคเดียวเพียงพอ",
        },
        ["vi"] = new[]
        {
            "miễn phí", "không mất phí", "không tốn phí", "không mất tiền", "không tốn tiền", "không tính phí",
            "Klacksy lập kế hoạch", "Klacksy sẽ lập kế hoạch", "Klacksy lên kế hoạch", "Klacksy sẽ lên kế hoạch", "Klacksy tính", "Klacksy sẽ tính", "Klacksy tối ưu", "Klacksy sẽ tối ưu",
            "Klacksy kiểm tra", "Klacksy sẽ kiểm tra", "Klacksy xác minh", "Klacksy xếp ca", "Klacksy sắp xếp", "Klacksy tổ chức",
            "được kiểm chứng", "đã qua kiểm chứng", "được chứng minh", "được kiểm nghiệm", "qua kiểm nghiệm", "đã qua thử thách",
            "được sử dụng bởi", "được dùng bởi", "đang được sử dụng tại", "đang được dùng tại", "được triển khai tại", "được nhiều doanh nghiệp sử dụng", "được nhiều doanh nghiệp tin dùng",
            "đối tác của chúng tôi", "đối tác của chúng ta", "đối tác chiến lược của chúng tôi", "đối tác của bọn tôi",
            "thí điểm", "pilot", "vận hành thử nghiệm", "giai đoạn thử nghiệm",
            "không bao giờ rời", "không bao giờ ra khỏi", "chẳng bao giờ rời", "không rời khỏi", "không ra khỏi",
            "tự động gọi", "gọi điện tự động", "gọi tự động", "tự động điện thoại", "cuộc gọi tự động",
            "chỉ cần một câu", "một câu là đủ", "một câu đủ", "một câu thôi là đủ", "một câu là xong", "một câu duy nhất là đủ",
        },
        ["zh-CN"] = new[]
        {
            "免费", "无需付费", "不收费", "不收取费用", "零费用", "分文不取",
            "Klacksy 规划", "Klacksy 会规划", "Klacksy 负责规划", "Klacksy 计算", "Klacksy 会计算", "Klacksy 负责计算", "Klacksy 按您的规则", "Klacksy 优化", "Klacksy 会优化", "Klacksy 负责优化",
            "Klacksy 检查", "Klacksy 会检查", "Klacksy 负责检查", "Klacksy 核查", "Klacksy 校验", "Klacksy 验证", "Klacksy 编排", "Klacksy 排班", "Klacksy 会排班", "Klacksy 负责排班",
            "久经考验", "经过验证", "经过实践检验", "实践证明", "已被验证",
            "已有企业在使用", "已有多家企业使用", "已有许多企业使用", "已有众多企业使用", "众多企业正在使用", "正被企业使用", "我们的客户包括",
            "我们的合作伙伴", "我们的伙伴", "我们的合作方", "合作伙伴包括", "合作伙伴有",
            "试点", "试运行", "试行", "先导项目", "Pilot",
            "从不离开", "绝不离开", "永不离开", "永远不会离开", "数据不会离开", "不会流出", "不会外传", "不会外泄",
            "自动打电话", "自动拨打", "自动致电", "自动呼叫", "自动来电",
            "一句话就够", "一句话就足够", "一句话就行", "一句话即可", "一句话搞定", "只需一句话", "仅需一句话",
        },
        ["zh-TW"] = new[]
        {
            "免費", "無需付費", "不收費", "不收取費用", "零費用", "分文不取",
            "Klacksy 規劃", "Klacksy 會規劃", "Klacksy 負責規劃", "Klacksy 計算", "Klacksy 會計算", "Klacksy 負責計算", "Klacksy 依您的規則", "Klacksy 優化", "Klacksy 會優化", "Klacksy 負責優化",
            "Klacksy 檢查", "Klacksy 會檢查", "Klacksy 負責檢查", "Klacksy 核查", "Klacksy 校驗", "Klacksy 驗證", "Klacksy 編排", "Klacksy 排班", "Klacksy 會排班", "Klacksy 負責排班",
            "久經考驗", "經過驗證", "經過實際檢驗", "實證有效", "已被驗證",
            "已有企業在使用", "已有多家企業使用", "已有許多企業使用", "已有眾多企業使用", "眾多企業正在使用", "正被企業使用", "我們的客戶包括",
            "我們的合作夥伴", "我們的夥伴", "我們的合作方", "合作夥伴包括", "合作夥伴有",
            "試點", "試運行", "試營運", "先導", "Pilot",
            "從不離開", "絕不離開", "永不離開", "永遠不會離開", "資料不會離開", "不會流出", "不會外傳", "不會外洩",
            "自動打電話", "自動撥打", "自動致電", "自動呼叫", "自動來電",
            "一句話就夠", "一句話就足夠", "一句話就行", "一句話即可", "一句話搞定", "只需一句話", "僅需一句話",
        },
    };

    private static readonly Dictionary<string, string> AiDisclosureWords = new()
    {
        [GermanCulture] = "KI",
        ["en"] = "AI",
        ["fr"] = "IA",
        ["it"] = "IA",
        ["ar"] = "الذكاء الاصطناعي",
        ["cs"] = "AI",
        ["da"] = "AI",
        ["el"] = "AI",
        ["es"] = "IA",
        ["fi"] = "tekoälyllä",
        ["he"] = "בינה מלאכותית",
        ["id"] = "AI",
        ["ja"] = "AI",
        ["ko"] = "AI",
        ["ms"] = "AI",
        ["nb"] = "KI",
        ["nl"] = "AI",
        ["pl"] = "AI",
        ["pt"] = "IA",
        ["ro"] = "IA",
        ["sv"] = "AI",
        ["th"] = "AI",
        ["vi"] = "AI",
        ["zh-CN"] = "AI",
        ["zh-TW"] = "AI",
    };

    private static readonly (string Key, string Text)[] OwnerTexts =
    {
        ("hero.title", "Personalplanung mit Klacks. Klacksy nimmt dir die Fleissarbeit ab."),
        ("hero.subtitle", "Klacks ist eine Software für Dienstpläne und Personalplanung. Mit Klacksy, deinem elektronischen Mitarbeiter: Du sagst, was du brauchst – Klacksy erledigt es nach deinem Ja."),
        ("hero.trustLine", "Open Source · ohne Abo · läuft bei dir"),
        ("human.title", "Klacksy ersetzt niemanden in der Planung – Klacksy nimmt Fleissarbeit ab."),
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
        "Nächsten Dienstplan erstellen? Ein Satz an Klacksy startet die Planung. Klacks rechnet – und du sagst Ja.",
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
                Regex.IsMatch(value, string.Format(LatinWordPatternFormat, Regex.Escape(word)), RegexOptions.IgnoreCase).ShouldBeFalse($"{culture}/{key}: jargon '{word}'");
            }

            foreach (var phrase in ForbiddenPhrases[culture])
            {
                ContainsForbiddenPhrase(culture, value, phrase).ShouldBeFalse($"{culture}/{key}: forbidden '{phrase}' in '{value}'");
            }

            Regex.IsMatch(value, MitLicencePattern).ShouldBeFalse($"{culture}/{key}: the licence is AGPL-3.0-only, never MIT");
        }
    }

    [TestCaseSource(nameof(Cultures))]
    public void Texts_and_industry_titles_are_plain_text_because_the_page_encodes_them(string culture)
    {
        var plain = Load(culture).Concat(LoadFile(culture, IndexFileName).Where(entry => entry.Key.StartsWith(IndustryTitleKeyPrefix, StringComparison.Ordinal) && entry.Key.EndsWith(TitleKeySuffix, StringComparison.Ordinal)));

        plain.Where(entry => Regex.IsMatch(entry.Value, HtmlEntityPattern)).Select(entry => $"{entry.Key}: {entry.Value}")
            .ShouldBeEmpty($"{culture}: a literal HTML entity is shown as text");
    }

    [TestCaseSource(nameof(Cultures))]
    public void The_wrong_address_pattern_recognises_a_sentence_in_the_forbidden_register(string culture)
    {
        if (WrongAddressPatterns[culture] is not { } address)
        {
            return;
        }

        Regex.IsMatch(WrongAddressSamples[culture], address).ShouldBeTrue(culture);
    }

    // Proves that the forbidden claims "Klacksy plans/calculates/checks" are caught in the word order each language really
    // uses: in the claim sentences of the page (the text of tasks.0, tasks.1, human.text and the hero video label), which
    // correctly name Klacks as the one who calculates and checks, Klacks is replaced by Klacksy - the one-letter slip the
    // guard exists for - and the guard must then fire for every sentence.
    [TestCaseSource(nameof(Cultures))]
    public void Swapping_Klacks_for_Klacksy_in_the_calculation_sentences_is_caught_by_the_forbidden_phrases(string culture)
    {
        var texts = Load(culture);

        foreach (var key in CalculationSentenceKeys)
        {
            Regex.IsMatch(texts[key], KlacksWithoutYPattern).ShouldBeTrue($"{culture}/{key}: the sentence names Klacks as the actor");

            var slipped = Regex.Replace(texts[key], KlacksWithoutYPattern, KlacksyName);

            ForbiddenPhrases[culture].Any(phrase => ContainsForbiddenPhrase(culture, slipped, phrase))
                .ShouldBeTrue($"{culture}/{key}: no forbidden phrase catches '{slipped}'");
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
    public void Every_simple_culture_has_its_simple_content_and_the_cultures_without_one_are_none()
    {
        SiteModes.SimplePageCultures.OrderBy(code => code, StringComparer.Ordinal).ShouldBe(SupportedCultures.All.Select(culture => culture.Code).OrderBy(code => code, StringComparer.Ordinal));

        foreach (var culture in SupportedCultures.All)
        {
            File.Exists(Path.Combine(MarketingProjectPaths.ContentRoot, culture.Code, FileName))
                .ShouldBe(SiteModes.SimplePageCultures.Contains(culture.Code), culture.Code);
        }
    }

    [Test]
    public void Taiwan_is_named_with_the_owner_decided_wording_per_chinese_variant()
    {
        LoadFile("zh-CN", CountriesFileName)["land-tw"].ShouldBe("中国台湾");
        LoadFile("zh-TW", CountriesFileName)["land-tw"].ShouldBe("臺灣");
    }

    // Han, Japanese, Korean and Thai texts are written with or without a space next to a Latin name ("Klacksy 計算" and
    // "Klacksy計算"), and Latin word boundaries do not exist there: these cultures are compared without any whitespace.
    private static bool ContainsForbiddenPhrase(string culture, string value, string phrase)
    {
        if (!SpacelessCultures.Contains(culture))
        {
            return value.Contains(phrase, StringComparison.OrdinalIgnoreCase);
        }

        return RemoveWhitespace(value).Contains(RemoveWhitespace(phrase), StringComparison.OrdinalIgnoreCase);
    }

    private static string RemoveWhitespace(string text) => Regex.Replace(text, @"\s+", string.Empty);

    private static Dictionary<string, string> Load(string culture) => LoadFile(culture, FileName);

    private static Dictionary<string, string> LoadFile(string culture, string fileName)
        => JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(MarketingProjectPaths.ContentRoot, culture, fileName)))!;
}
