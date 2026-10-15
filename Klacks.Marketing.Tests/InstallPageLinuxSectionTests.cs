// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Encodings.Web;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The "Linux PC" section for non-experts: every culture carries a complete, translated section, it is rendered whether
/// the office-PC switch is on or off, its button downloads the guided-installer package, the terminal command uses the
/// country wrapper (install-&lt;cc&gt;.sh) only when a country package exists, and the office-PC card's Linux note
/// links to the section with a path-qualified href (a bare "#linux" would resolve against &lt;base href="/"&gt;).
/// </summary>
[TestFixture]
public class InstallPageLinuxSectionTests
{
    private const string InstallPageKey = "installation";
    private const string EnglishCulture = "en";
    private const int ExpectedRequirementCount = 4;
    private const int ExpectedStepCount = 3;
    private const string HrefPlaceholderLink = "<a href=\"{0}\">";
    private const string LinuxSectionIdAttribute = "id=\"" + PageSectionIds.Linux + "\"";
    private const string PackageCommand = "sudo bash install-ch.sh";
    private const string FallbackCommand = "sudo bash install.sh";
    private const string FallbackWrapperFragment = "install-be.sh";
    private const string PackageCountryCode = "ch";
    private const string DownloadCounterAttribute = "rel=\"nofollow\" data-c=\"DownloadClick\"";

    private static IEnumerable<string> Cultures() => SupportedCultures.All.Select(culture => culture.Code);

    private static IEnumerable<TestCaseData> CulturesWithSwitch()
        => Cultures().SelectMany(culture => new[] { new TestCaseData(culture, false), new TestCaseData(culture, true) });

    private static InstallPageContent Content(string culture)
        => new JsonPageContentProvider(new TestWebHostEnvironment()).GetInstallPage(culture, InstallPageKey);

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_carries_a_complete_linux_section(string culture)
    {
        var linux = Content(culture).Linux;

        linux.Path.Requirements.Count.ShouldBe(ExpectedRequirementCount);
        linux.Path.Steps.Count.ShouldBe(ExpectedStepCount);
        InstallPageTemplate.LinuxCommandStepIndex.ShouldBeLessThan(linux.Path.Steps.Count);
        new[] { linux.Path.Icon, linux.Path.Title, linux.Path.Text, linux.Path.RequirementsTitle, linux.Path.StepsTitle, linux.Path.DownloadLabel, linux.CertificateNote }
            .Concat(linux.Path.Requirements)
            .Concat(linux.Path.Steps.SelectMany(step => new[] { step.Title, step.Text }))
            .ShouldAllBe(text => !string.IsNullOrWhiteSpace(text));
    }

    [TestCaseSource(nameof(Cultures))]
    public void Every_non_english_culture_translates_the_linux_section(string culture)
    {
        if (culture == EnglishCulture)
        {
            Assert.Pass();
        }

        var linux = Content(culture).Linux;
        var english = Content(EnglishCulture).Linux;

        linux.Path.Title.ShouldNotBe(english.Path.Title);
        linux.Path.Text.ShouldNotBe(english.Path.Text);
        linux.Path.DownloadLabel.ShouldNotBe(english.Path.DownloadLabel);
        linux.CertificateNote.ShouldNotBe(english.CertificateNote);
        linux.Path.Steps.Select(step => step.Text).ShouldNotBe(english.Path.Steps.Select(step => step.Text));
    }

    [TestCaseSource(nameof(Cultures))]
    public void Every_culture_points_the_office_pc_linux_note_to_the_section(string culture)
    {
        Content(culture).Native!.LinuxNote.ShouldContain(HrefPlaceholderLink);
    }

    [TestCaseSource(nameof(CulturesWithSwitch))]
    public async Task Linux_section_renders_regardless_of_the_office_pc_switch(string culture, bool enabled)
    {
        var html = await InstallPageRenderer.RenderAsync(culture, enabled);
        var linux = Content(culture).Linux;

        var sectionStart = html.IndexOf(LinuxSectionIdAttribute, StringComparison.Ordinal);
        sectionStart.ShouldBeGreaterThan(0);
        var section = html[sectionStart..];

        section.ShouldContain(linux.Path.Title);
        section.ShouldContain(linux.CertificateNote);
        section.ShouldContain(DownloadCounterAttribute);
        section.ShouldContain(HtmlEncoder.Default.Encode(linux.Path.DownloadLabel));
        section.ShouldContain(PackageCommand);
    }

    [Test]
    public async Task Country_with_package_uses_the_country_wrapper_and_the_marketplace_package()
    {
        var html = await InstallPageRenderer.RenderAsync(SupportedCultures.DefaultCode, enabled: false);
        var packageUrl = RegionPackages.DownloadUrl(ExternalLinks.MarketplaceUrl, PackageCountryCode, RegionPackages.AllIndustries, RegionPackages.OnPremZipArtifact);

        html.ShouldContain($"<code dir=\"ltr\" class=\"block mt-3 px-4 py-3 rounded-xl bg-night text-white font-mono text-sm select-all break-all\">{PackageCommand}</code>");
        html.ShouldNotContain($">{FallbackCommand}<");
        CountOccurrences(html, $"href=\"{HtmlEncoder.Default.Encode(packageUrl)}\" {DownloadCounterAttribute}").ShouldBe(2);
    }

    [Test]
    public async Task Country_without_package_uses_install_sh_and_the_standard_package()
    {
        var html = await InstallPageRenderer.RenderAsync(
            SupportedCultures.DefaultCode,
            enabled: false,
            pageKey: InstallPageRenderer.FallbackCountryPageKey,
            routePath: InstallPageRenderer.FallbackCountryRoutePath);

        html.ShouldContain($">{FallbackCommand}</code>");
        html.ShouldNotContain(FallbackWrapperFragment);
        CountOccurrences(html, $"href=\"{ExternalLinks.OnPremBundleUrl}\" {DownloadCounterAttribute}").ShouldBe(2);
    }

    [Test]
    public async Task Command_is_shown_under_the_terminal_step()
    {
        var html = await InstallPageRenderer.RenderAsync(SupportedCultures.DefaultCode, enabled: false);
        var steps = Content(SupportedCultures.DefaultCode).Linux.Path.Steps;

        var terminalStep = html.IndexOf(steps[InstallPageTemplate.LinuxCommandStepIndex].Text, StringComparison.Ordinal);
        var command = html.IndexOf(PackageCommand, StringComparison.Ordinal);
        var nextStep = html.IndexOf(steps[InstallPageTemplate.LinuxCommandStepIndex + 1].Title, StringComparison.Ordinal);

        terminalStep.ShouldBeGreaterThan(0);
        command.ShouldBeGreaterThan(terminalStep);
        command.ShouldBeLessThan(nextStep);
    }

    [TestCase("de", "/land-ch/installation#linux")]
    [TestCase("en", "/en/land-ch/installation#linux")]
    [TestCase("zh-CN", "/zh-cn/land-ch/installation#linux")]
    public async Task Office_pc_linux_note_links_to_the_section_on_the_same_page(string culture, string expectedHref)
    {
        var html = await InstallPageRenderer.RenderAsync(culture, enabled: true);

        html.ShouldContain($"<a href=\"{expectedHref}\">");
        html.ShouldNotContain("{0}");
    }

    private static int CountOccurrences(string text, string value)
    {
        var count = 0;
        var index = text.IndexOf(value, StringComparison.Ordinal);
        while (index >= 0)
        {
            count++;
            index = text.IndexOf(value, index + value.Length, StringComparison.Ordinal);
        }

        return count;
    }
}
