// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using Klacks.Marketing.Localization.Seo;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// A dedicated meta description (flat key "privacy.metaDescription" / "imprint.metaDescription", root key
/// "metaDescription" on industry pages) wins over the text-derived one, and the finished German and English
/// descriptions never end in a cut-off ellipsis.
/// </summary>
[TestFixture]
public class MetaDescriptionTests
{
    private const string Ellipsis = "…";
    private const string OwnCulture = "en";
    private const string OtherCulture = "fr";
    private const string PrivacyOverride = "privacy.metaDescription";
    private const string PrivacyText = "privacy.contentHtml";
    private const string DedicatedText = "Dedicated description.";
    private const string PageText = "<h2>1. Controller</h2><p>Page text.</p>";
    private const int DedicatedMaxLength = 155;
    private static readonly string[] FinishedCultures = SupportedCultures.All.Select(culture => culture.Code).ToArray();

    [Test]
    public void A_dedicated_description_of_the_own_culture_wins_over_the_page_text()
    {
        var provider = new StubProvider(OwnCulture, new Dictionary<string, string>
        {
            [PrivacyOverride] = DedicatedText,
            [PrivacyText] = PageText,
        });

        MetaDescriptionSource.ForLegalPage(provider, OwnCulture, MetaDescriptionSource.PrivacyKeyPrefix).ShouldBe(DedicatedText);
    }

    [Test]
    public void Without_a_dedicated_description_the_page_text_is_used_and_no_foreign_description_leaks_in()
    {
        var provider = new StubProvider(OwnCulture, new Dictionary<string, string>
        {
            [PrivacyOverride] = DedicatedText,
            [PrivacyText] = PageText,
        });

        MetaDescriptionSource.ForLegalPage(provider, OtherCulture, MetaDescriptionSource.PrivacyKeyPrefix).ShouldBe(PageText);
    }

    [Test]
    public void Legal_pages_serve_a_dedicated_description_in_german_and_english()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());

        foreach (var culture in FinishedCultures)
        {
            foreach (var prefix in new[] { MetaDescriptionSource.PrivacyKeyPrefix, MetaDescriptionSource.ImprintKeyPrefix })
            {
                var key = MetaDescriptionSource.KeyOf(prefix, MetaDescriptionSource.MetaDescriptionSuffix);
                var text = provider.FindText(culture, MetaDescriptionSource.LegalContentKey, key);

                text.ShouldNotBeNullOrWhiteSpace($"{culture}/{key}");
                text!.Length.ShouldBeLessThanOrEqualTo(DedicatedMaxLength, $"{culture}/{key}");
            }
        }
    }

    [Test]
    public void No_german_or_english_page_serves_a_description_ending_in_an_ellipsis()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());

        var cut = MetaDescriptionCatalog.Build(provider, MarketingProjectPaths.ContentRoot, FinishedCultures)
            .Where(entry => entry.Description.EndsWith(Ellipsis, StringComparison.Ordinal))
            .Select(entry => $"{entry.Culture} {entry.Route} ({entry.File} {entry.Key})")
            .ToList();

        cut.ShouldBeEmpty();
    }

    [Test]
    public void Every_german_and_english_description_is_present_and_within_the_limit()
    {
        var provider = new JsonPageContentProvider(new TestWebHostEnvironment());

        var invalid = MetaDescriptionCatalog.Build(provider, MarketingProjectPaths.ContentRoot, FinishedCultures)
            .Where(entry => string.IsNullOrWhiteSpace(entry.Description) || entry.Description.Length > SeoText.DefaultMaxLength)
            .Select(entry => $"{entry.Culture} {entry.Route}")
            .ToList();

        invalid.ShouldBeEmpty();
    }

    private sealed class StubProvider(string culture, Dictionary<string, string> texts) : IPageContentProvider
    {
        public string GetText(string cultureCode, string contentKey, string textKey) =>
            texts.TryGetValue(textKey, out var value) ? value : textKey;

        public string? FindText(string cultureCode, string contentKey, string textKey) =>
            cultureCode == culture && texts.TryGetValue(textKey, out var value) ? value : null;

        public IndustryPageContent GetIndustryPage(string cultureCode, string pageKey) => throw new NotSupportedException();

        public InstallPageContent GetInstallPage(string cultureCode, string pageKey) => throw new NotSupportedException();

        public bool HasContentIn(string cultureCode, string pageKey) => throw new NotSupportedException();
    }
}
