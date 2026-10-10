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
    private const string InstallationSlug = "installation";
    private const string ImpressumSlug = "impressum";
    private const string DatenschutzSlug = "datenschutz";
    private const string LicenseSlug = "lizenz";
    private const string PartnerSlug = "partner";
    private const string ComparisonSlug = "vergleich";

    private const string Tagline =
        "Open-source, on-premise workforce scheduling for shift- and field-based operations — home care, hospitals, security, cleaning, logistics and hospitality. Automatic shift scheduling, route optimisation and a voice- and chat-controlled AI assistant (Klacksy) with your own choice of language model.";

    // Six core industries with use-case descriptions for LLM recommendation context.
    // Each entry includes the industry name, a short use-case description, and key
    // compliance/qualification features that differentiate Klacks in that sector.
    private static readonly (string Name, string UseCase, string ComplianceHighlight)[] Industries =
    {
        (
            "Homecare / Spitex",
            "Ambulatory care visit planning with tour optimisation and qualification tracking. " +
            "Qualification presets for registered nurses and care assistants.",
            "Weekly hour caps and rest periods per the country's working-time law, night surcharges documented, travel time between visits optimised."
        ),
        (
            "Healthcare / Hospitals",
            "Hospital shift planning with department-based qualification, rolling rest periods, " +
            "and multi-department staff sharing without double-booking.",
            "Daily and weekly limits per the country's working-time law, supervisor override with documented approval, night-work rules."
        ),
        (
            "Security",
            "Guard scheduling with post-based assignment, qualification expiry tracking " +
            "(national security-guard licences and training certificates), and shift handover management.",
            "Maximum daily shift length, competence-expiry alerts, night-shift presets."
        ),
        (
            "Facility / Cleaning",
            "Cleaning crew scheduling with object-based assignment, mobile team tour planning, " +
            "and qualification tracking for building cleaners and glass/facade specialists.",
            "Mobile route optimisation (ant-colony algorithm), shift windows by object opening hours."
        ),
        (
            "Logistics",
            "Driver scheduling with licence tracking (C/CE, ADR, Code 95), vehicle assignment, " +
            "and compliance with driving-time regulations.",
            "Driving-time rules, rest-period enforcement, ADR/licence expiry tracking."
        ),
        (
            "Hospitality / Hotels & Gastro",
            "Hotel and restaurant shift planning with seasonal workforce, split-shift support, " +
            "and food-hygiene qualification tracking.",
            "Hospitality exceptions of the working-time law, split-shift handling, weekend/holiday premium rates."
        ),
    };

    // Company-size pages (page slug -> English title, one-line summary, longer summary). The audience
    // sizes are copied verbatim from each page's badge; the descriptions only condense the English content.
    private static readonly (string Slug, string Title, string Summary, string Detail)[] BusinessSizePages =
    {
        (
            CountryPageLinks.SmallBusinessSlug,
            "Klacks for SMEs",
            "For SMEs with 5 to 250 employees: plans shifts and tours, checks rest periods and qualifications, and runs on an office PC or your own server. Open source, no license fees.",
            "For SMEs with 5 to 250 employees who schedule with Excel, on paper or in a group chat today. Klacks plans shifts and tours, checks rest periods and qualifications, and runs on your side — on an office PC (Windows or Mac with Docker Desktop, 16 GB of memory recommended) or on your own Linux server (at least 8 GB of memory and 4 CPU cores). Open source, no license fees; employees can be entered directly or imported from an Excel or CSV file, with a preview before anything is saved, and at period closing Klacks creates the payroll export."
        ),
        (
            CountryPageLinks.MidSizeBusinessSlug,
            "Klacks for mid-sized businesses",
            "For businesses with 50 to 250 employees: fills gaps in line with your rules, suggests a replacement who fits, and lets you prepare scenarios in advance — no license fees.",
            "For businesses with 50 to 250 employees. The planning assistant fills open shifts while keeping to your rules — rest periods, qualifications, availability — and plans in a scenario first, so nothing is applied until you give your OK. If someone drops out, you can ask Klacksy for a replacement: only people who are not absent that day, have the required qualification, get no overlap and keep to the rest period are suggested. Klacks does not replace a scheduler: the rule-based planning engine calculates the plan, Klacksy takes over the clicking, and you decide."
        ),
        (
            CountryPageLinks.LargeBusinessSlug,
            "Klacks for large businesses",
            "For businesses with over 250 employees: no license per employee, no user fees, no subscription. Roles, group visibility, LDAP/OIDC sign-in and payroll export.",
            "For businesses with over 250 employees: no license per employee, no user fees, no subscription. Costs on your side are server or hosting, operation and maintenance, the AI model (external providers bill by usage; a model you run yourself needs suitable hardware) and the rollout. Klacks offers roles and rights, visibility by group, sign-in via LDAP or Active Directory, OpenID Connect and OAuth 2.0, a payroll export (among others for DATEV and Abacus, as well as CSV or Excel), approval levels, signed automatic updates and an MCP server through which AI agents work with the rights of the connected user. Klacksy does not replace schedulers — it takes over the clicking, while the rule-based planning engine calculates the plan."
        ),
    };

    private const string InstallDocsPath = "erste-schritte/installation-und-playground/";
    private const string InstallFolderName = "onprem";
    private const string ExampleServerName = "klacks.example.com";
    private const string ExampleRegion = "de";
    private const string DocsHomeTitle = "Klacks documentation";
    private const string DocsInstallTitle = "Installation and Playground (documentation)";

    private const string AboutTitle = "Who is behind Klacks";
    private const string AboutSummary = "Klacks is developed by Heribert Gasparoli in Liebefeld (Switzerland) and is open source under the GNU AGPL-3.0.";
    private const string AboutDetail =
        "Klacks is developed by Heribert Gasparoli in Liebefeld (Switzerland) and is open source under the GNU AGPL-3.0. AI helps with research, texts, translation and marketing drafts, and what an AI writes is labeled as such; the founder handles inquiries personally and decides prices, offers, contracts and invoices himself. The installation and the database run in your business, with the data stored in PostgreSQL, an open database; with standard tools you can reach all your data at any time, even without Klacks.";

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
        sb.AppendLine("Klacks runs on your own infrastructure and is open source under the GNU AGPL-3.0 licence. The application ships in four core languages — German, French, Italian and English — with more languages, geodata and calendar rules available as plugins.");
        sb.AppendLine();

        sb.AppendLine("## Product");
        sb.AppendLine();
        AppendLink(sb, trimmedBase, HomeCountry, "Klacks", "On-premise, open-source workforce scheduling — overview and get started.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{KlacksySlug}", "Klacksy — AI assistant", "Voice- and chat-controlled scheduling assistant with free choice of language model.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{InstallationSlug}", "Install Klacks", "Download country packages for on-premise or Docker Compose installation.");
        AppendDocsLink(sb, DocsHomeUrl(trimmedBase), DocsHomeTitle, "Documentation, including the step-by-step installation guide with the real commands.");
        sb.AppendLine();

        sb.AppendLine("## Industries");
        sb.AppendLine();
        sb.AppendLine("Six industry templates with compliance enforcement: homecare/spitex, healthcare/hospitals, security, facility/cleaning, logistics, hospitality/hotellerie-gastro. Custom industry profiles supported.");
        sb.AppendLine();

        sb.AppendLine("## Company size");
        sb.AppendLine();
        AppendBusinessSizeLinks(sb, trimmedBase);
        sb.AppendLine();

        sb.AppendLine("## Countries");
        sb.AppendLine();
        foreach (var (pageKey, name) in EnglishMarkets)
        {
            AppendLink(sb, trimmedBase, pageKey, name, null);
        }
        sb.AppendLine();

        sb.AppendLine("## About");
        sb.AppendLine();
        AppendAboutLink(sb, trimmedBase);
        sb.AppendLine();

        sb.AppendLine("## Legal");
        sb.AppendLine();
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{ImpressumSlug}", "Legal notice", null);
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{DatenschutzSlug}", "Privacy", null);
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{LicenseSlug}", "Commercial license", "When the AGPL-3.0 is enough and when a commercial license is needed.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{PartnerSlug}", "For consultants and integrators", "Klacks as a scheduling engine for service providers.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{ComparisonSlug}", "Comparison", "Klacks compared with typical SaaS scheduling tools.");

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
        sb.AppendLine("Klacks is a workforce-scheduling application for organisations that plan staff in shifts, in the field and by qualification. It is open source under the GNU AGPL-3.0 licence and runs on your own infrastructure (on-premise), so personnel and patient records are stored on your own servers. There is no vendor lock-in and no forced cloud.");
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
        sb.AppendLine("- Because Klacksy can run on a local language model, an assistant can build schedules and operate the app without any request to the language model going to an external AI provider.");
        sb.AppendLine();

        sb.AppendLine("## Model Context Protocol (MCP)");
        sb.AppendLine();
        sb.AppendLine("The Klacks application (not this marketing site) exposes an authenticated Model Context Protocol endpoint over Streamable HTTP, secured with OAuth 2.1 and personal access tokens, so external AI assistants can connect to Klacks and operate it directly.");
        sb.AppendLine();

        sb.AppendLine("## Industries");
        sb.AppendLine();
        foreach (var (name, useCase, compliance) in Industries)
        {
            sb.AppendLine($"### {name}");
            sb.AppendLine();
            sb.AppendLine(useCase);
            sb.AppendLine();
            sb.AppendLine($"Compliance: {compliance}");
            sb.AppendLine();
        }

        sb.AppendLine("### Custom Industries");
        sb.AppendLine();
        sb.AppendLine("Beyond the six shipped templates, Klacks allows creating custom industry profiles. " +
            "Via the Planning Profile Setup flow, administrators define their own scheduling rules " +
            "(29+ parameters: working hours, rest periods, overtime tiers, night/holiday rates, contract limits). " +
            "The system sets ACTIVE_INDUSTRIES=custom and copies base templates as new rows.");
        sb.AppendLine();

        sb.AppendLine("## Company sizes");
        sb.AppendLine();
        foreach (var (_, title, _, detail) in BusinessSizePages)
        {
            sb.AppendLine($"### {title}");
            sb.AppendLine();
            sb.AppendLine(detail);
            sb.AppendLine();
        }

        sb.AppendLine("## About");
        sb.AppendLine();
        sb.AppendLine(AboutDetail);
        sb.AppendLine();

        sb.AppendLine("## Countries and languages");
        sb.AppendLine();
        sb.AppendLine($"Country-specific sites exist for {CountryIndustries.AllCountries.Count} markets across Europe, the Middle East and Asia, and the site is presented in {SupportedCultures.All.Count} languages. The application itself ships in four core languages — German, French, Italian and English — with additional languages added as plugins that bring their own geodata, calendar rules and assistant terminology.");
        sb.AppendLine();

        sb.AppendLine("## Get started");
        sb.AppendLine();
        sb.AppendLine("- Playground: a public Klacks instance with sample data, right in the browser, no installation and no registration.");
        sb.AppendLine("- On-premise package: Docker images, installer, database, HTTPS and automatic updates in a single bundle.");
        sb.AppendLine("- Country packages: preconfigured downloads (installer bundle, Docker Compose bundle or profile file) for 30 countries, with an optional industry preselection, served by the Klacks Marketplace.");
        sb.AppendLine("- Source code: Klacks is open source under the GNU AGPL-3.0 licence, with backend, frontend and Docker images public on GitHub.");
        sb.AppendLine();

        AppendInstallSection(sb, trimmedBase);

        sb.AppendLine("## Links");
        sb.AppendLine();
        AppendLink(sb, trimmedBase, HomeCountry, "Klacks", "Product overview and get started.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{KlacksySlug}", "Klacksy — AI assistant", "The scheduling assistant in detail.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{InstallationSlug}", "Install Klacks", "Country packages for on-premise or Docker Compose installation.");
        AppendDocsLinks(sb, trimmedBase);
        AppendBusinessSizeLinks(sb, trimmedBase);
        foreach (var (pageKey, name) in EnglishMarkets)
        {
            AppendLink(sb, trimmedBase, pageKey, name, null);
        }
        AppendAboutLink(sb, trimmedBase);
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{ImpressumSlug}", "Legal notice", null);
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{DatenschutzSlug}", "Privacy", null);
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{LicenseSlug}", "Commercial license", "When the AGPL-3.0 is enough and when a commercial license is needed.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{PartnerSlug}", "For consultants and integrators", "Klacks as a scheduling engine for service providers.");
        AppendLink(sb, trimmedBase, $"{HomeCountry}/{ComparisonSlug}", "Comparison", "Klacks compared with typical SaaS scheduling tools.");

        return sb.ToString();
    }

    // Install walkthrough for assistants helping a layperson. Every command and limit is taken from the
    // on-prem bundle (README.md, install.sh, install.ps1), the English installation docs page and the
    // English marketing content; anything those sources do not state is left out.
    private static void AppendInstallSection(StringBuilder sb, string baseUrl)
    {
        var bundleUrl = ExternalLinks.OnPremBundleUrl;
        var bundleFile = ExternalLinks.OnPremBundleFileName;

        sb.AppendLine("## Install Klacks (step by step)");
        sb.AppendLine();
        sb.AppendLine("Klacks runs on your own Windows or Linux machine with Docker; there is no forced cloud. Use the commands below exactly as written and do not invent others. macOS is not covered by these steps.");
        sb.AppendLine();

        sb.AppendLine("### 1. Requirements");
        sb.AppendLine();
        sb.AppendLine("- A host with at least 8 GB of RAM and 4 vCPU (Klacks runs its retrieval models locally inside the API container). For an office PC, 16 GB of memory is recommended.");
        sb.AppendLine("- Docker Desktop on Windows, or Docker Engine with the Compose plugin on Linux.");
        sb.AppendLine("- Outbound internet access to ghcr.io and github.com (Docker images and updates).");
        sb.AppendLine("- Ports 80 and 443 free (configurable, see the options below).");
        sb.AppendLine("- On Windows: a folder on a local drive to install into, for example C:\\klacks.");
        sb.AppendLine();

        sb.AppendLine("### 2. Download");
        sb.AppendLine();
        sb.AppendLine($"The installation package is a single ZIP file, {bundleFile}, published as the latest GitHub release: {bundleUrl}");
        sb.AppendLine($"It extracts into a folder named {InstallFolderName} that contains the installer scripts (install.sh for Linux, install.ps1 for Windows), the Docker Compose stack and a regions folder with the country profiles.");
        sb.AppendLine();

        sb.AppendLine("### 3a. Linux");
        sb.AppendLine();
        sb.AppendLine("```bash");
        sb.AppendLine($"curl -fsSLO {bundleUrl}");
        sb.AppendLine($"unzip {bundleFile} && cd {InstallFolderName} && ./install.sh");
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine("With your own server name and an optional country profile:");
        sb.AppendLine();
        sb.AppendLine("```bash");
        sb.AppendLine($"SERVER_NAME={ExampleServerName} REGION={ExampleRegion} ./install.sh");
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine("Optional environment variables: SERVER_NAME (defaults to localhost), REGION, HTTP_PORT and HTTPS_PORT (default 80 and 443).");
        sb.AppendLine();

        sb.AppendLine("### 3b. Windows (PowerShell)");
        sb.AppendLine();
        sb.AppendLine($"Download {bundleUrl}, extract it into a folder on a local drive (for example C:\\klacks) and run the installer from the extracted folder:");
        sb.AppendLine();
        sb.AppendLine("```powershell");
        sb.AppendLine($"powershell -ExecutionPolicy Bypass -File .\\install.ps1 -ServerName {ExampleServerName} -Region {ExampleRegion}");
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine("Optional parameters: -ServerName (defaults to localhost), -Region, -HttpPort and -HttpsPort (default 80 and 443). The installer maps the install folder into the Docker Desktop VM so that the automatic updater can recreate containers with the right bind mounts, which is why the folder must be on a local drive.");
        sb.AppendLine();

        sb.AppendLine("### 4. What the installer does");
        sb.AppendLine();
        sb.AppendLine("It checks that Docker and the Compose plugin respond, generates secrets and a self-signed certificate, pins the latest released version, pulls the images, starts the stack and waits until the API reports healthy. The first start migrates and seeds the database and can take a while; allow about half an hour depending on your computer and internet connection. The script can be run again at any time: it keeps existing secrets and certificate and just pulls and restarts the stack.");
        sb.AppendLine();
        sb.AppendLine("The country profile (REGION or -Region) is optional. It pre-configures the country's locale, holidays, working-time limits, surcharges and industry presets on first boot. The code must match a file in the regions folder of the package, otherwise the installer aborts.");
        sb.AppendLine();
        sb.AppendLine("When it is done, open https://<your server name> in a browser. The certificate is self-signed, so browsers warn until you place a trusted certificate in nginx/certs (nginx\\certs on Windows).");
        sb.AppendLine();

        sb.AppendLine("### 5. First login");
        sb.AppendLine();
        sb.AppendLine($"On a fresh installation the login is {ExternalLinks.DemoLoginEmail} / {ExternalLinks.DemoLoginPassword}. Change this password immediately after the first login and set your mail/SMTP settings in the admin UI.");
        sb.AppendLine();

        sb.AppendLine("### 6. Updates");
        sb.AppendLine();
        sb.AppendLine("On Linux and Windows an update service inside the stack applies newly released versions automatically, with a backup before every update and automatic rollback if anything goes wrong. On Windows this only works if the install folder is on a local drive; installations made with an older install.ps1 must run the script once again from a current package, otherwise automatic updates break.");
        sb.AppendLine();

        sb.AppendLine("### 7. Known limits");
        sb.AppendLine();
        sb.AppendLine("- Office-PC setup: the PC must be running during working hours. The team reaches Klacks on the office network; access from outside is not set up.");
        sb.AppendLine("- Docker Desktop is a separate product with its own licence limit: according to the Klacks SME page it is free of charge for businesses with fewer than 250 employees and less than 10 million USD in annual revenue.");
        sb.AppendLine("- Data is stored in your installation in the open PostgreSQL database; with standard tools you can reach all your data at any time, even without Klacks.");
        sb.AppendLine("- Keep the .env file in the install folder safe: it holds the generated secrets, and without it every stored password and API key is unrecoverable.");
        sb.AppendLine("- Klacks was developed and tested with a dataset of 5,000 employees; how smoothly it runs on a PC depends on the PC's performance.");
        sb.AppendLine("- macOS is not covered by these steps.");
        sb.AppendLine();

        sb.AppendLine("### 8. If something fails");
        sb.AppendLine();
        sb.AppendLine("- The installer stops right at the start: it first runs docker version and docker compose version. Docker with the Compose plugin must be installed and respond to both commands.");
        sb.AppendLine("- \"regions/<code>.json not found — aborting\": the country code does not match a file in the regions folder. Use a code that exists there or leave REGION / -Region out.");
        sb.AppendLine("- \"Could not fetch manifest. Falling back to :latest tags\": the installer could not read the release manifest on github.com and continues with the latest image tags. Check the outbound access to github.com.");
        sb.AppendLine("- Windows, \"Could not map this folder into the Docker VM; automatic updates will not work\": install Klacks on a local drive (for example C:\\klacks) and run the script again.");
        sb.AppendLine("- Windows, \"Could not create the certificate\": place server.crt and server.key in nginx\\certs and run the script again.");
        sb.AppendLine("- \"API did not report healthy yet\": run docker compose logs klacks-api in the install folder to see why.");
        sb.AppendLine("- \"update-public-key.pem missing\": automatic update signature verification cannot run until UPDATE_SIGNATURE_PUBLIC_KEY is set.");
        sb.AppendLine("- Ports 80 and 443 must be free; they can be changed with HTTP_PORT / HTTPS_PORT (Linux) or -HttpPort / -HttpsPort (Windows).");
        sb.AppendLine();

        sb.AppendLine("### 9. Documentation");
        sb.AppendLine();
        AppendDocsLinks(sb, baseUrl);
        sb.AppendLine();
    }

    private static string DocsHomeUrl(string baseUrl)
    {
        return $"{baseUrl}{ExternalLinks.DocsBasePath}{English.DocsLocale}/";
    }

    private static void AppendDocsLinks(StringBuilder sb, string baseUrl)
    {
        var docsHome = DocsHomeUrl(baseUrl);
        AppendDocsLink(sb, docsHome, DocsHomeTitle, "Product documentation.");
        AppendDocsLink(sb, $"{docsHome}{InstallDocsPath}", DocsInstallTitle, "Playground and on-premise installation.");
    }

    private static void AppendDocsLink(StringBuilder sb, string url, string title, string description)
    {
        sb.AppendLine($"- [{title}]({url}): {description}");
    }

    private static void AppendBusinessSizeLinks(StringBuilder sb, string baseUrl)
    {
        foreach (var (slug, title, summary, _) in BusinessSizePages)
        {
            AppendLink(sb, baseUrl, $"{HomeCountry}/{slug}", title, summary);
        }
    }

    private static void AppendAboutLink(StringBuilder sb, string baseUrl)
    {
        AppendLink(sb, baseUrl, $"{HomeCountry}/{CountryPageLinks.AboutSlug}", AboutTitle, AboutSummary);
    }

    private static void AppendLink(StringBuilder sb, string baseUrl, string pageKey, string title, string? description)
    {
        var url = SitemapGenerator.BuildUrl(baseUrl, English, pageKey);

        sb.AppendLine(description is null
            ? $"- [{title}]({url})"
            : $"- [{title}]({url}): {description}");
    }
}
