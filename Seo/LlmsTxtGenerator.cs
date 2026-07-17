using System.Text;
using Klacks.Marketing.Localization;

namespace Klacks.Marketing.Seo;

// Builds the llms.txt and llms-full.txt bodies (llmstxt.org format, English). Every
// linked URL is produced through SitemapGenerator.BuildUrl over real page keys, so
// the files can only point at routes the site actually serves. All claims are taken
// from the published English marketing content (Localization/Content/en) — nothing
// is invented; payroll calculation, biometric hardware and hard-blocking are
// deliberately never claimed.
public static class LlmsTxtGenerator
{
    private const string EnglishCultureCode = "en";
    private const string KlacksySlug = "klacksy";
    private const string ImpressumSlug = "impressum";
    private const string DatenschutzSlug = "datenschutz";

    private const string Tagline =
        "Open-source, on-premise workforce scheduling for shift- and field-based operations — home care, hospitals, security, cleaning and logistics. Automatic shift scheduling, route optimisation and a voice- and chat-controlled AI assistant (Klacksy) with your own choice of language model.";

    // English-language country landing pages (page key -> English country name).
    // Only countries with their own English content are listed here; the site
    // serves ~30 country sites in total (CountryIndustries.AllCountries).
    private static readonly (string PageKey, string Name)[] EnglishMarkets =
    {
        ("land-ie", "Ireland"),
        ("land-ae", "United Arab Emirates"),
        ("land-sa", "Saudi Arabia"),
        ("land-il", "Israel"),
    };

    private static SupportedCulture English =>
        SupportedCultures.All.First(culture => culture.Code == EnglishCultureCode);

    // The country every English URL defaults to (land-gb), matching how
    // SitemapGenerator resolves the homepage and the legal pages for this culture.
    private static string HomeCountry => LanguageCountries.DefaultCountryFor(EnglishCultureCode);

    public static string BuildShort(string baseUrl)
    {
        var trimmedBase = baseUrl.TrimEnd('/');
        var sb = new StringBuilder();

        sb.AppendLine("# Klacks");
        sb.AppendLine();
        sb.AppendLine($"> {Tagline}");
        sb.AppendLine();
        sb.AppendLine("Klacks runs on your own infrastructure and is open source under the MIT licence. The application ships in four core languages — German, French, Italian and English — with more languages, geodata and calendar rules available as plugins.");
        sb.AppendLine();

        sb.AppendLine("## Product");
        sb.AppendLine();
        AppendLink(sb, trimmedBase, HomeCountry, "Klacks", "On-premise, open-source workforce scheduling — overview and get started.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{KlacksySlug}", "Klacksy — AI assistant", "Voice- and chat-controlled scheduling assistant with free choice of language model.");
        sb.AppendLine();

        sb.AppendLine("## Countries");
        sb.AppendLine();
        foreach (var (pageKey, name) in EnglishMarkets)
        {
            AppendLink(sb, trimmedBase, pageKey, name, null);
        }
        sb.AppendLine();

        sb.AppendLine("## Legal");
        sb.AppendLine();
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{ImpressumSlug}", "Legal notice", null);
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{DatenschutzSlug}", "Privacy", null);

        return sb.ToString();
    }

    public static string BuildFull(string baseUrl)
    {
        var trimmedBase = baseUrl.TrimEnd('/');
        var sb = new StringBuilder();

        sb.AppendLine("# Klacks");
        sb.AppendLine();
        sb.AppendLine($"> {Tagline}");
        sb.AppendLine();

        sb.AppendLine("## Overview");
        sb.AppendLine();
        sb.AppendLine("Klacks is a workforce-scheduling application for organisations that plan staff in shifts, in the field and by qualification. It is open source under the MIT licence and runs on your own infrastructure (on-premise), so no personnel or patient records have to leave the building. There is no vendor lock-in and no forced cloud.");
        sb.AppendLine();

        sb.AppendLine("## Key features");
        sb.AppendLine();
        sb.AppendLine("- Automatic shift scheduling: an evolutionary algorithm checks thousands of variants in seconds and respects labour-law constraints, qualifications, availability and travel distances.");
        sb.AppendLine("- Route and tour optimisation: an ant-colony algorithm orders service addresses into the shortest sensible route — by car, bike, on foot or mixed — for mobile operations.");
        sb.AppendLine("- Modular scheduling without double-booking: schedule sheets hold references instead of copies, so staff can be shared across departments and a change is instantly visible everywhere.");
        sb.AppendLine("- Absence management: vacation, sick leave and custom absence types shown as a Gantt chart, with one-click PDF export.");
        sb.AppendLine("- Staged approval workflow: draft, confirmed, approved and completed, with group-based access rights.");
        sb.AppendLine("- Interactive schedule grid: move shifts by drag and drop, with changes appearing in real time for everyone involved.");
        sb.AppendLine("- Calendar and rules down to municipality level: country, region and municipality come pre-configured, calendars from several countries can be mixed, and you decide per calendar whether a public holiday affects hours and pay premiums or is only a reminder.");
        sb.AppendLine();

        sb.AppendLine("## Klacksy — the AI assistant");
        sb.AppendLine();
        sb.AppendLine("- Control in natural language, typed or spoken.");
        sb.AppendLine("- Free choice of language model: OpenAI, Anthropic, DeepSeek, Gemini — or a fully local model, so you decide on cost, privacy and provider.");
        sb.AppendLine("- 170+ skills: create staff, manage groups, set permissions and navigate the app through conversation.");
        sb.AppendLine("- Adjustable per-user autonomy levels, a personality editor, learned company terminology and operating rules set up by chat — traceable in a rule register and reversible.");
        sb.AppendLine("- Because Klacksy can run on a local language model, an assistant can build schedules and operate the app by voice without a single record leaving your infrastructure.");
        sb.AppendLine();

        sb.AppendLine("## Model Context Protocol (MCP)");
        sb.AppendLine();
        sb.AppendLine("The Klacks application (not this marketing site) exposes an authenticated Model Context Protocol endpoint over Streamable HTTP, secured with OAuth 2.1 and personal access tokens, so external AI assistants can connect to Klacks and operate it directly.");
        sb.AppendLine();

        sb.AppendLine("## Industries");
        sb.AppendLine();
        sb.AppendLine("Klacks is built for shift- and field-based operations: home care, hospitals, security, cleaning services and logistics — anywhere staff are scheduled in shifts, in the field and by qualification.");
        sb.AppendLine();

        sb.AppendLine("## Countries and languages");
        sb.AppendLine();
        sb.AppendLine($"Country-specific sites exist for {CountryIndustries.AllCountries.Count} markets across Europe, the Middle East and Asia, and the site is presented in {SupportedCultures.All.Count} languages. The application itself ships in four core languages — German, French, Italian and English — with additional languages added as plugins that bring their own geodata, calendar rules and assistant terminology.");
        sb.AppendLine();

        sb.AppendLine("## Get started");
        sb.AppendLine();
        sb.AppendLine("- Playground: a public Klacks instance with sample data, right in the browser, no installation and no registration.");
        sb.AppendLine("- On-premise package: Docker images, installer, database, HTTPS and automatic updates in a single bundle.");
        sb.AppendLine("- Source code: Klacks is open source under the MIT licence, with backend, frontend and Docker images public on GitHub.");
        sb.AppendLine();

        sb.AppendLine("## Links");
        sb.AppendLine();
        AppendLink(sb, trimmedBase, HomeCountry, "Klacks", "Product overview and get started.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{KlacksySlug}", "Klacksy — AI assistant", "The scheduling assistant in detail.");
        foreach (var (pageKey, name) in EnglishMarkets)
        {
            AppendLink(sb, trimmedBase, pageKey, name, null);
        }
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{ImpressumSlug}", "Legal notice", null);
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{DatenschutzSlug}", "Privacy", null);

        return sb.ToString();
    }

    private static void AppendLink(StringBuilder sb, string baseUrl, string pageKey, string title, string? description)
    {
        var url = SitemapGenerator.BuildUrl(baseUrl, English, pageKey);

        sb.AppendLine(description is null
            ? $"- [{title}]({url})"
            : $"- [{title}]({url}): {description}");
    }
}
