namespace Klacks.Marketing.Localization;

// Human-readable display names for the country page keys ("land-ch" -> "Schweiz").
// Shared by the navigation country switcher and the breadcrumb structured data so
// both name a country the same way. The names are German (matching the site's
// country dropdown); localizing them per culture is a future enhancement.
public static class CountryNames
{
    private static readonly Dictionary<string, string> DisplayNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["land-de"] = "Deutschland",
        ["land-at"] = "Österreich",
        ["land-ch"] = "Schweiz",
        ["land-sa"] = "Saudi-Arabien",
        ["land-ae"] = "VAE",
        ["land-il"] = "Israel",
        ["land-se"] = "Schweden",
        ["land-ie"] = "Irland",
        ["land-cz"] = "Tschechien",
        ["land-gb"] = "Grossbritannien",
        ["land-ro"] = "Rumänien",
        ["land-jp"] = "Japan",
        ["land-kr"] = "Südkorea",
        ["land-cn"] = "China",
        ["land-tw"] = "Taiwan",
        ["land-my"] = "Malaysia",
        ["land-id"] = "Indonesien",
        ["land-th"] = "Thailand",
        ["land-vn"] = "Vietnam",
        ["land-fr"] = "Frankreich",
        ["land-it"] = "Italien",
        ["land-nl"] = "Niederlande",
        ["land-be"] = "Belgien",
        ["land-dk"] = "Dänemark",
        ["land-gr"] = "Griechenland",
        ["land-es"] = "Spanien",
        ["land-fi"] = "Finnland",
        ["land-no"] = "Norwegen",
        ["land-pl"] = "Polen",
        ["land-pt"] = "Portugal",
    };

    // The display name for a country page key, or the key itself when unmapped.
    public static string DisplayName(string countryPageKey)
        => DisplayNames.GetValueOrDefault(countryPageKey, countryPageKey);
}
