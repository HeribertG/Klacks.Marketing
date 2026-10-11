// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using Klacks.Marketing.Localization.Seo;

/// <summary>
/// Enumerates the meta description every page serves in every culture, using the same source selection as the
/// page components: dedicated "metaDescription" first, then the hero subtitle (or the page text for legal pages).
/// </summary>
internal static class MetaDescriptionCatalog
{
    private const string MetaDescriptionKey = "metaDescription";
    private const string HeroSubtitleKey = "hero.subtitle";
    private const string KlacksySlug = "klacksy";
    private const string InstallationSlug = "installation";
    private const string CountryStartType = "country-start";
    private const string MasterCountryKey = "land-ch";
    private const string JsonExtension = ".json";
    private const string SmallBusinessPage = "kleine-betriebe";
    private const string LicensePage = "lizenz";
    private const string PrivacyPage = "datenschutz";
    private const string ImprintPage = "impressum";

    private static readonly string[] FlatBusinessSizePages = { SmallBusinessPage, "mittlere-betriebe", "grosse-betriebe", "angebot" };
    private static readonly string[] FlatSubtitlePages = { "ueber-uns", "partner", "lizenz", "vergleich" };

    internal sealed record Entry(
        string Culture,
        string PageType,
        string PageKey,
        string Route,
        string File,
        string Key,
        string SourceText,
        string Description,
        bool Indexed);

    public static IReadOnlyList<Entry> Build(IPageContentProvider provider, string contentRoot, IEnumerable<string> cultures)
    {
        var entries = new List<Entry>();
        foreach (var culture in cultures)
        {
            var slug = SupportedCultures.All.First(c => c.Code == culture).UrlSlug;
            var prefix = slug.Length == 0 ? string.Empty : "/" + slug;
            AddCountryPages(entries, provider, contentRoot, culture, prefix);
            AddFlatPages(entries, provider, contentRoot, culture, prefix);
        }

        return entries;
    }

    private static void AddCountryPages(List<Entry> entries, IPageContentProvider provider, string contentRoot, string culture, string prefix)
    {
        foreach (var country in CountryIndustries.AllCountries)
        {
            var slugs = (CountryIndustries.ForCountry(country) ?? Array.Empty<CountryIndustry>())
                .Select(industry => industry.Slug)
                .Append(KlacksySlug);

            AddIndustry(entries, provider, contentRoot, culture, CountryStartType, country, $"{prefix}/{country}");
            foreach (var slugName in slugs)
            {
                AddIndustry(entries, provider, contentRoot, culture, slugName, $"{country}-{slugName}", $"{prefix}/{country}/{slugName}");
            }

            var installKey = $"{country}-{InstallationSlug}";
            var install = provider.GetInstallPage(culture, installKey);
            var installKeyName = install.MetaDescription is null ? HeroSubtitleKey : MetaDescriptionKey;
            var installSource = install.MetaDescription ?? install.Hero.Subtitle;
            entries.Add(new Entry(
                culture, InstallationSlug, installKey, $"{prefix}/{country}/{InstallationSlug}",
                ResolveFile(contentRoot, culture, installKey), installKeyName, installSource,
                SeoText.ToDescription(installSource), provider.HasContentIn(culture, installKey)));
        }
    }

    private static void AddIndustry(
        List<Entry> entries, IPageContentProvider provider, string contentRoot, string culture,
        string pageType, string pageKey, string route)
    {
        var content = provider.GetIndustryPage(culture, pageKey);
        var key = content.MetaDescription is null ? HeroSubtitleKey : MetaDescriptionKey;
        var source = content.MetaDescription ?? content.Hero.Subtitle;
        entries.Add(new Entry(
            culture, pageType, pageKey, route, ResolveFile(contentRoot, culture, pageKey), key, source,
            SeoText.ToDescription(source), provider.HasContentIn(culture, pageKey)));
    }

    private static void AddFlatPages(List<Entry> entries, IPageContentProvider provider, string contentRoot, string culture, string prefix)
    {
        foreach (var page in FlatBusinessSizePages)
        {
            var source = provider.GetText(culture, page, MetaDescriptionKey);
            entries.Add(new Entry(
                culture, page, page, $"{prefix}/{MasterCountryKey}/{page}", FlatFile(contentRoot, culture, page),
                MetaDescriptionKey, source, SeoText.ToDescription(source),
                page == SmallBusinessPage || provider.HasContentIn(culture, page)));
        }

        foreach (var page in FlatSubtitlePages)
        {
            var source = page == LicensePage
                ? MetaDescriptionSource.Resolve(provider, culture, page, MetaDescriptionSource.MetaDescriptionSuffix, HeroSubtitleKey)
                : provider.GetText(culture, page, HeroSubtitleKey);
            entries.Add(new Entry(
                culture, page, page, $"{prefix}/{MasterCountryKey}/{page}", FlatFile(contentRoot, culture, page),
                HeroSubtitleKey, source, SeoText.ToDescription(source), true));
        }

        AddLegal(entries, provider, contentRoot, culture, prefix, PrivacyPage, MetaDescriptionSource.PrivacyKeyPrefix);
        AddLegal(entries, provider, contentRoot, culture, prefix, ImprintPage, MetaDescriptionSource.ImprintKeyPrefix);
    }

    private static void AddLegal(
        List<Entry> entries, IPageContentProvider provider, string contentRoot, string culture, string prefix,
        string page, string keyPrefix)
    {
        var source = MetaDescriptionSource.ForLegalPage(provider, culture, keyPrefix);
        var overrideKey = MetaDescriptionSource.KeyOf(keyPrefix, MetaDescriptionSource.MetaDescriptionSuffix);
        var hasOverride = provider.FindText(culture, MetaDescriptionSource.LegalContentKey, overrideKey) is not null;
        var key = hasOverride ? overrideKey : MetaDescriptionSource.KeyOf(keyPrefix, MetaDescriptionSource.ContentHtmlSuffix);
        entries.Add(new Entry(
            culture, page, page, $"{prefix}/{MasterCountryKey}/{page}",
            FlatFile(contentRoot, culture, MetaDescriptionSource.LegalContentKey), key, source,
            SeoText.ToDescription(source), true));
    }

    private static string FlatFile(string contentRoot, string culture, string contentKey)
        => File.Exists(Path.Combine(contentRoot, culture, contentKey + JsonExtension))
            ? $"{culture}/{contentKey}{JsonExtension}"
            : $"{SupportedCultures.DefaultCode}/{contentKey}{JsonExtension}";

    // Mirrors JsonPageContentProvider's resolution order: own culture (page, then country-less master), then the default culture.
    private static string ResolveFile(string contentRoot, string culture, string pageKey)
    {
        var country = CountryIndustries.OwningCountry(pageKey);
        var master = country is not null && pageKey.Length > country.Length + 1 ? pageKey[(country.Length + 1)..] : null;
        var candidates = new List<string> { $"{culture}/{pageKey}{JsonExtension}" };
        if (master is not null)
        {
            candidates.Add($"{culture}/{master}{JsonExtension}");
        }

        candidates.Add($"{SupportedCultures.DefaultCode}/{pageKey}{JsonExtension}");
        if (master is not null)
        {
            candidates.Add($"{SupportedCultures.DefaultCode}/{master}{JsonExtension}");
        }

        return candidates.First(candidate => File.Exists(Path.Combine(contentRoot, candidate)));
    }
}
