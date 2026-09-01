using System.Text.Json.Serialization;

namespace Klacks.Marketing.Localization.Seo;

// Schema.org JSON-LD node models. Every serialized member carries an explicit
// [JsonPropertyName] so the output keeps schema.org's exact key casing (and the
// "@context"/"@type" keys, which are not valid C# identifiers). Optional members
// are nullable and dropped from the output when null (see JsonLdBuilder options),
// so a fact the site cannot back stays out of the markup entirely.

public sealed record JsonLdOrganization
{
    [JsonPropertyName("@context")] public string Context => JsonLd.Context;
    [JsonPropertyName("@type")] public string Type => "Organization";
    [JsonPropertyName("name")] public required string Name { get; init; }
    [JsonPropertyName("url")] public required string Url { get; init; }
    [JsonPropertyName("email")] public string? Email { get; init; }
    [JsonPropertyName("telephone")] public string? Telephone { get; init; }
    [JsonPropertyName("founder")] public JsonLdPerson? Founder { get; init; }
    [JsonPropertyName("address")] public JsonLdPostalAddress? Address { get; init; }
}

public sealed record JsonLdPerson
{
    [JsonPropertyName("@type")] public string Type => "Person";
    [JsonPropertyName("name")] public required string Name { get; init; }
}

public sealed record JsonLdPostalAddress
{
    [JsonPropertyName("@type")] public string Type => "PostalAddress";
    [JsonPropertyName("streetAddress")] public string? StreetAddress { get; init; }
    [JsonPropertyName("postalCode")] public string? PostalCode { get; init; }
    [JsonPropertyName("addressLocality")] public string? AddressLocality { get; init; }
    [JsonPropertyName("addressCountry")] public string? AddressCountry { get; init; }
}

public sealed record JsonLdPublisher
{
    [JsonPropertyName("@type")] public string Type => "Organization";
    [JsonPropertyName("name")] public required string Name { get; init; }
    [JsonPropertyName("url")] public required string Url { get; init; }
}

public sealed record JsonLdSoftwareApplication
{
    [JsonPropertyName("@context")] public string Context => JsonLd.Context;
    [JsonPropertyName("@type")] public string Type => "SoftwareApplication";
    [JsonPropertyName("name")] public required string Name { get; init; }
    [JsonPropertyName("applicationCategory")] public required string ApplicationCategory { get; init; }
    [JsonPropertyName("operatingSystem")] public required string OperatingSystem { get; init; }
    [JsonPropertyName("url")] public required string Url { get; init; }
    [JsonPropertyName("inLanguage")] public required string InLanguage { get; init; }
    [JsonPropertyName("description")] public string? Description { get; init; }
    [JsonPropertyName("publisher")] public JsonLdPublisher? Publisher { get; init; }
}

public sealed record JsonLdWebSite
{
    [JsonPropertyName("@context")] public string Context => JsonLd.Context;
    [JsonPropertyName("@type")] public string Type => "WebSite";
    [JsonPropertyName("name")] public required string Name { get; init; }
    [JsonPropertyName("url")] public required string Url { get; init; }
    [JsonPropertyName("inLanguage")] public required string InLanguage { get; init; }
    [JsonPropertyName("publisher")] public JsonLdPublisher? Publisher { get; init; }
}

public sealed record JsonLdBreadcrumbList
{
    [JsonPropertyName("@context")] public string Context => JsonLd.Context;
    [JsonPropertyName("@type")] public string Type => "BreadcrumbList";
    [JsonPropertyName("itemListElement")] public required IReadOnlyList<JsonLdListItem> ItemListElement { get; init; }
}

public sealed record JsonLdListItem
{
    [JsonPropertyName("@type")] public string Type => "ListItem";
    [JsonPropertyName("position")] public required int Position { get; init; }
    [JsonPropertyName("name")] public required string Name { get; init; }
    [JsonPropertyName("item")] public required string Item { get; init; }
}

public sealed record JsonLdFAQPage
{
    [JsonPropertyName("@context")] public string Context => JsonLd.Context;
    [JsonPropertyName("@type")] public string Type => "FAQPage";
    [JsonPropertyName("mainEntity")] public required IReadOnlyList<JsonLdFAQQuestion> MainEntity { get; init; }
}

public sealed record JsonLdFAQQuestion
{
    [JsonPropertyName("@type")] public string Type => "Question";
    [JsonPropertyName("name")] public required string Name { get; init; }
    [JsonPropertyName("acceptedAnswer")] public required JsonLdAnswer AcceptedAnswer { get; init; }
}

public sealed record JsonLdAnswer
{
    [JsonPropertyName("@type")] public string Type => "Answer";
    [JsonPropertyName("text")] public required string Text { get; init; }
}

public static class JsonLd
{
    public const string Context = "https://schema.org";
}
