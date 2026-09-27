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
}
