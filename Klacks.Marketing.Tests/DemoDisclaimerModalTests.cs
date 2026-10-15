// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Net;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The playground modal speaks the Du form on the simple start page (texts from simple.json) and keeps today's Sie
/// texts from shared.json everywhere else; the layout picks the simple texts only while the page is the simple page.
/// </summary>
[TestFixture]
public class DemoDisclaimerModalTests
{
    private const string DuBodyPart = "gib keine echten Personendaten ein";
    private const string SieBodyPart = "geben Sie keine echten Personendaten ein";
    private const string DuLanguagePart = "Du kannst die Sprache";
    private const string SieLanguagePart = "Sie können die Sprache";
    private const string LoginLabel = "Zugang zum Playground";
    private const string RawKeyPrefix = "demoModal.";

    [Test]
    public async Task Simple_content_renders_the_du_texts_with_the_shared_login_label()
    {
        var html = await RenderAsync(SiteModes.SimpleContentKey);

        html.ShouldContain(DuBodyPart);
        html.ShouldContain(DuLanguagePart);
        html.ShouldNotContain(SieBodyPart);
        html.ShouldNotContain(SieLanguagePart);
        html.ShouldContain(LoginLabel);
        html.ShouldNotContain(RawKeyPrefix);
    }

    [Test]
    public async Task Default_content_keeps_the_shared_sie_texts()
    {
        var html = await RenderAsync(contentKey: null);

        html.ShouldContain(SieBodyPart);
        html.ShouldContain(SieLanguagePart);
        html.ShouldContain(LoginLabel);
        html.ShouldNotContain(RawKeyPrefix);
    }

    [Test]
    public void Layout_passes_the_simple_texts_only_on_the_simple_page()
    {
        var source = MarketingProjectPaths.ReadSource("Shared/MainLayout.razor");

        source.ShouldContain("<DemoDisclaimerModal IsOpen=\"_showDemoModal\" Culture=\"@CurrentCultureRecord.Code\" ContentKey=\"@DemoModalContentKey\"");
        source.ShouldContain("IsSimpleMode ? SiteModes.SimpleContentKey : DemoDisclaimerModal.DefaultContentKey");
        source.ShouldContain("SiteModeResolver.Resolve(");
    }

    private static async Task<string> RenderAsync(string? contentKey)
    {
        await using var services = MarketingComponentHost.CreateServices(new NavigableNavigationManager(MarketingComponentHost.BaseUrl, CountryIndustries.SwissCountryPageKey));
        var parameters = new Dictionary<string, object?>
        {
            [nameof(DemoDisclaimerModal.IsOpen)] = true,
            [nameof(DemoDisclaimerModal.Culture)] = SupportedCultures.DefaultCode,
        };
        if (contentKey is not null)
        {
            parameters[nameof(DemoDisclaimerModal.ContentKey)] = contentKey;
        }

        return WebUtility.HtmlDecode(await MarketingComponentHost.RenderAsync<DemoDisclaimerModal>(services, parameters));
    }
}
