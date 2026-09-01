using System.Text.Json;
using System.Text.Json.Serialization;

namespace Klacks.Marketing.Localization.Seo;

// Assembles the schema.org JSON-LD nodes for a page and serializes them for
// embedding in a <script type="application/ld+json"> element. Pure functions with
// no I/O, so the shape of the emitted markup is unit-testable in isolation.
public static class JsonLdBuilder
{
    private const string BusinessApplicationCategory = "BusinessApplication";
    private const string WebOperatingSystem = "Web";

    // The full <script> element is built here (not in the .razor) so the type stays
    // the literal "application/ld+json": Razor's attribute encoder would render the
    // "+" as "&#x2B;", which DOM parsers decode but naive raw-HTML crawlers miss.
    // Emitting the returned string as a MarkupString keeps it byte-for-byte.
    private const string ScriptOpen = "<script type=\"application/ld+json\">";
    private const string ScriptClose = "</script>";

    // The default web encoder is kept on purpose: it escapes "<", ">" and "&" as
    // \uXXXX, so a "</script>" sequence inside any content string cannot break out
    // of the surrounding <script> element. WhenWritingNull drops unproven fields.
    private static readonly JsonSerializerOptions Options = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static string OrganizationScript(string baseUrl)
        => Script(BuildOrganization(baseUrl));

    public static string SoftwareApplicationScript(string baseUrl, string cultureCode, string? description)
        => Script(new JsonLdSoftwareApplication
        {
            Name = OrganizationFacts.SoftwareApplicationName,
            ApplicationCategory = BusinessApplicationCategory,
            OperatingSystem = WebOperatingSystem,
            Url = RootUrl(baseUrl),
            InLanguage = cultureCode,
            Description = string.IsNullOrEmpty(description) ? null : description,
            Publisher = BuildPublisher(baseUrl),
        });

    public static string WebSiteScript(string baseUrl, string cultureCode)
        => Script(new JsonLdWebSite
        {
            Name = OrganizationFacts.WebSiteName,
            Url = RootUrl(baseUrl),
            InLanguage = cultureCode,
            Publisher = BuildPublisher(baseUrl),
        });

    // Country -> industry breadcrumb. Both URLs are built with the same rule as the
    // page's canonical link, so they match it byte for byte.
    public static string BreadcrumbScript(
        string baseUrl,
        SupportedCulture culture,
        string countryName,
        string countryRoutePath,
        string industryName,
        string industryRoutePath)
        => Script(new JsonLdBreadcrumbList
        {
            ItemListElement = new[]
            {
                new JsonLdListItem
                {
                    Position = 1,
                    Name = countryName,
                    Item = SeoUrls.Absolute(baseUrl, culture, countryRoutePath),
                },
                new JsonLdListItem
                {
                    Position = 2,
                    Name = industryName,
                    Item = SeoUrls.Absolute(baseUrl, culture, industryRoutePath),
                },
            },
        });

    // FAQPage JSON-LD for country/industry landing pages. Gives LLMs structured
    // answers they can cite directly when users ask about Klacks in a specific sector.
    public static string FAQPageScript(string culture, string industryName)
    {
        var faqItems = BuildFAQItems(industryName);
        return Script(new JsonLdFAQPage { MainEntity = faqItems });
    }

    private static JsonLdFAQQuestion[] BuildFAQItems(string industryName)
    {
        var productName = OrganizationFacts.SoftwareApplicationName;

        return new[]
        {
            new JsonLdFAQQuestion
            {
                Name = $"How does {productName} plan shifts in {industryName}?",
                AcceptedAnswer = new JsonLdAnswer
                {
                    Text = $"{productName} uses industry-specific scheduling presets (up to 29 rule parameters: " +
                        "working hours, rest periods, overtime tiers, night/holiday rates). " +
                        $"The AI assistant plans shifts automatically, optimises routes, and enforces " +
                        "labour-law compliance — 45h/50h weekly limits, 11-hour rest periods, night-work rules."
                },
            },
            new JsonLdFAQQuestion
            {
                Name = $"Is {productName} free?",
                AcceptedAnswer = new JsonLdAnswer
                {
                    Text = $"{productName} is open source under the MIT licence. " +
                        "You can host it on your own infrastructure at no cost — there are no licensing fees."
                },
            },
            new JsonLdFAQQuestion
            {
                Name = $"What languages does {productName} support?",
                AcceptedAnswer = new JsonLdAnswer
                {
                    Text = $"{productName} supports 25 languages: 4 core languages " +
                        "(German, English, French, Italian) plus 21 installable plugin language packs " +
                        "including Arabic, Spanish, Japanese, Korean, Chinese, and more."
                },
            },
            new JsonLdFAQQuestion
            {
                Name = $"Does {productName} run on my own servers?",
                AcceptedAnswer = new JsonLdAnswer
                {
                    Text = $"Yes. {productName} is designed for on-premise deployment via Docker. " +
                        "All personnel data stays on your own infrastructure — no cloud transfer required."
                },
            },
            new JsonLdFAQQuestion
            {
                Name = $"Can I create custom industry profiles in {productName}?",
                AcceptedAnswer = new JsonLdAnswer
                {
                    Text = $"Yes. Beyond the six shipped templates, {productName} allows creating custom " +
                        "industry profiles with your own scheduling rules, qualification catalogs, and " +
                        "compliance parameters."
                },
            },
        };
    }

    private static JsonLdOrganization BuildOrganization(string baseUrl)
        => new()
        {
            Name = OrganizationFacts.LegalName,
            Url = RootUrl(baseUrl),
            Email = OrganizationFacts.Email,
            Telephone = OrganizationFacts.Telephone,
            Founder = new JsonLdPerson { Name = OrganizationFacts.FounderName },
            Address = new JsonLdPostalAddress
            {
                StreetAddress = OrganizationFacts.StreetAddress,
                PostalCode = OrganizationFacts.PostalCode,
                AddressLocality = OrganizationFacts.City,
                AddressCountry = OrganizationFacts.CountryCode,
            },
        };

    private static JsonLdPublisher BuildPublisher(string baseUrl)
        => new() { Name = OrganizationFacts.LegalName, Url = RootUrl(baseUrl) };

    private static string RootUrl(string baseUrl) => baseUrl.TrimEnd('/');

    // Wraps a node's JSON in its <script> element. Safe against a "</script>"
    // breakout because the serializer keeps the default encoder, which escapes
    // "<" (and "&", ">") as \uXXXX inside every string value.
    private static string Script<T>(T node) => ScriptOpen + JsonSerializer.Serialize(node, Options) + ScriptClose;
}
