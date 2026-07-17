namespace Klacks.Marketing.Localization.Seo;

// Verified company facts for the Organization JSON-LD block. Every value here is
// copied verbatim from the imprint (Localization/Content/de/legal.json,
// "imprint.contentHtml") — nothing is invented. The public site URL is not held
// here because it is configured per environment (Site:BaseUrl) and passed in.
public static class OrganizationFacts
{
    // The trading name as stated in the imprint ("Klacks Software"); the product
    // itself is marketed as "Klacks" (see SoftwareApplicationName).
    public const string LegalName = "Klacks Software";

    public const string SoftwareApplicationName = "Klacks";

    public const string WebSiteName = "Klacks";

    public const string FounderName = "Heribert Gasparoli";

    public const string StreetAddress = "Kirchstrasse 52";

    public const string PostalCode = "3097";

    public const string City = "Liebefeld";

    // ISO 3166-1 alpha-2 country code for Switzerland ("CH-3097 Liebefeld").
    public const string CountryCode = "CH";

    public const string Telephone = "+41 79 102 14 02";

    public const string Email = "hgasparoli@hotmail.com";
}
