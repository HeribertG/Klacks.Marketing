namespace Klacks.Marketing.Localization;

public interface IPageContentProvider
{
    IndustryPageContent GetIndustryPage(string cultureCode, string pageKey);

    InstallPageContent GetInstallPage(string cultureCode, string pageKey);

    string GetText(string cultureCode, string contentKey, string textKey);

    // True when an industry or install page has content written in the requested
    // culture itself (its own file or the country-less master), i.e. it does not
    // fall back to the default culture's text.
    bool HasContentIn(string cultureCode, string pageKey);

    // The text from the culture's own content file only, or null when that file does not contain the key.
    // Unlike GetText there is no fallback to the default culture and no echo of the key, so an optional
    // text (such as a dedicated meta description) never leaks a foreign-language value into another culture.
    string? FindText(string cultureCode, string contentKey, string textKey);
}
