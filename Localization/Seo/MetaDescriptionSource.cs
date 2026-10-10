// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization.Seo;

/// <summary>
/// Picks the raw text a flat-keyed page derives its meta description from: a dedicated, hand-written description
/// stored in the culture's own content file wins; otherwise the page text is used and shortened by SeoText.
/// </summary>
public static class MetaDescriptionSource
{
    public const string PrivacyKeyPrefix = "privacy";
    public const string ImprintKeyPrefix = "imprint";
    public const string LegalContentKey = "legal";
    public const string MetaDescriptionSuffix = "metaDescription";
    public const string ContentHtmlSuffix = "contentHtml";

    public static string KeyOf(string keyPrefix, string suffix) => $"{keyPrefix}.{suffix}";

    /// <param name="provider">Content provider to read the texts from</param>
    /// <param name="cultureCode">Culture of the rendered page</param>
    /// <param name="contentKey">Content file (without extension), for example "legal"</param>
    /// <param name="overrideKey">Optional dedicated description key, read from the culture's own file only</param>
    /// <param name="fallbackKey">Page text key used when the culture has no dedicated description</param>
    public static string Resolve(IPageContentProvider provider, string cultureCode, string contentKey, string overrideKey, string fallbackKey)
    {
        var dedicated = provider.FindText(cultureCode, contentKey, overrideKey);

        return string.IsNullOrWhiteSpace(dedicated)
            ? provider.GetText(cultureCode, contentKey, fallbackKey)
            : dedicated;
    }

    public static string ForLegalPage(IPageContentProvider provider, string cultureCode, string keyPrefix)
        => Resolve(
            provider,
            cultureCode,
            LegalContentKey,
            KeyOf(keyPrefix, MetaDescriptionSuffix),
            KeyOf(keyPrefix, ContentHtmlSuffix));
}
