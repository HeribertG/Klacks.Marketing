namespace Klacks.Marketing.Localization;

public interface IPageContentProvider
{
    IndustryPageContent GetIndustryPage(string cultureCode, string pageKey);

    InstallPageContent GetInstallPage(string cultureCode, string pageKey);

    string GetText(string cultureCode, string contentKey, string textKey);
}
