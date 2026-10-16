// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using Klacks.Marketing.Localization;
using Klacks.Marketing.Seo;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Maps a request path onto page type, country and culture. Only values from closed sets leave this class, so no
/// part of the URL itself is ever stored.
/// </summary>
public static class VisitPathClassifier
{
    private const char PathSeparator = '/';
    private const string CountryPrefix = "land-";
    private const string KlacksySlug = "klacksy";
    private const string InstallationSlug = "installation";
    private const string ImprintSlug = "impressum";
    private const string PrivacySlug = "datenschutz";

    private static readonly Dictionary<string, string> PageTypeBySlug = BuildPageTypeBySlug();

    private static readonly HashSet<string> Countries =
        new(CountryIndustries.AllCountries, StringComparer.OrdinalIgnoreCase);

    public static VisitLocation Classify(string? path)
    {
        var segments = (path ?? string.Empty).Split(PathSeparator, StringSplitOptions.RemoveEmptyEntries);
        var index = 0;
        var culture = SupportedCultures.Default.Code;

        if (index < segments.Length && FindCulture(segments[index]) is { } prefixedCulture)
        {
            culture = prefixedCulture.Code;
            index++;
        }

        var country = VisitLocation.NoCountry;
        if (index < segments.Length && Countries.Contains(segments[index]))
        {
            country = segments[index][CountryPrefix.Length..].ToLowerInvariant();
            index++;
        }

        var remaining = segments.Length - index;
        var pageType = remaining switch
        {
            0 => PageTypes.Start,
            1 => PageTypeBySlug.GetValueOrDefault(segments[index], PageTypes.Other),
            _ => PageTypes.Other,
        };

        return new VisitLocation(pageType, country, culture);
    }

    private static SupportedCulture? FindCulture(string segment)
        => SupportedCultures.All.FirstOrDefault(culture =>
            culture.UrlSlug.Length > 0 && culture.UrlSlug.Equals(segment, StringComparison.OrdinalIgnoreCase));

    private static Dictionary<string, string> BuildPageTypeBySlug()
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [SiteModes.ExpertSlug] = PageTypes.ExpertStart,
            [KlacksySlug] = PageTypes.Industry,
            [InstallationSlug] = PageTypes.Installation,
            [PageTypes.Offer] = PageTypes.Offer,
            [PageTypes.Comparison] = PageTypes.Comparison,
            [PageTypes.AboutUs] = PageTypes.AboutUs,
            [PageTypes.Partner] = PageTypes.Partner,
            [PageTypes.License] = PageTypes.License,
            [PageTypes.SmallBusiness] = PageTypes.SmallBusiness,
            [PageTypes.MidSizeBusiness] = PageTypes.MidSizeBusiness,
            [PageTypes.LargeBusiness] = PageTypes.LargeBusiness,
            [ImprintSlug] = PageTypes.Legal,
            [PrivacySlug] = PageTypes.Legal,
            [DocsSitemapIndexGenerator.IndexPath.TrimStart(PathSeparator)] = PageTypes.DocsSitemap,
        };

        foreach (var slug in CountryIndustries.ProductSlugs)
        {
            map[slug] = PageTypes.Industry;
        }

        return map;
    }
}
