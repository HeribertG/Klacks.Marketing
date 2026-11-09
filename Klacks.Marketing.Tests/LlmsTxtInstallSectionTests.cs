// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Seo;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// llms-full.txt carries the real install commands and docs links, so an assistant helping a layperson does not
/// have to invent commands; llms.txt links the docs as well. Both point to the Klacks Store for installing and no longer
/// to the retired installation pages.
/// </summary>
[TestFixture]
public class LlmsTxtInstallSectionTests
{
    private const string BaseUrl = "https://klacks.example";
    private const string SectionHeading = "## Install Klacks (step by step)";
    private const string CodeFence = "```";
    private const char LineBreak = '\n';
    private const string DocsHomeUrl = BaseUrl + ExternalLinks.DocsBasePath + "en/";
    private const string DocsInstallUrl = DocsHomeUrl + "erste-schritte/installation-und-playground/";
    private const string StoreHomeUrl = ExternalLinks.MarketplaceUrl + "/?culture=en";
    private const string InstallationPagePattern = @"/installation(?![\w-])";
    private static readonly string[] DirectDownloadMarkers = ["/releases/", "/api/regions/", "curl ", "wget "];

    [Test]
    public void Full_contains_install_section_heading()
    {
        LlmsTxtGenerator.BuildFull(BaseUrl).ShouldContain(SectionHeading);
    }

    [Test]
    public void Full_contains_code_blocks_for_install_sh_and_install_ps1()
    {
        var blocks = ExtractCodeBlocks(LlmsTxtGenerator.BuildFull(BaseUrl));

        blocks.ShouldContain(block => block.Contains("install.sh"));
        blocks.ShouldContain(block => block.Contains("install.ps1"));
    }

    [Test]
    public void Full_and_short_point_to_the_klacks_store_as_the_only_download_source()
    {
        var full = LlmsTxtGenerator.BuildFull(BaseUrl);
        var shortText = LlmsTxtGenerator.BuildShort(BaseUrl);

        full.ShouldContain(StoreHomeUrl);
        shortText.ShouldContain(StoreHomeUrl);
        foreach (var marker in DirectDownloadMarkers)
        {
            full.ShouldNotContain(marker);
            shortText.ShouldNotContain(marker);
        }
    }

    [Test]
    public void Full_and_short_no_longer_link_the_retired_installation_pages()
    {
        Regex.IsMatch(LlmsTxtGenerator.BuildFull(BaseUrl), InstallationPagePattern).ShouldBeFalse();
        Regex.IsMatch(LlmsTxtGenerator.BuildShort(BaseUrl), InstallationPagePattern).ShouldBeFalse();
    }

    [Test]
    public void Full_runs_the_linux_installer_with_sudo_and_passes_variables_after_sudo()
    {
        var blocks = ExtractCodeBlocks(LlmsTxtGenerator.BuildFull(BaseUrl));
        var linuxRuns = blocks.SelectMany(block => block.Split(LineBreak))
            .Where(line => line.Contains("./install") && line.Contains(".sh"))
            .ToList();

        linuxRuns.ShouldNotBeEmpty();
        linuxRuns.ShouldAllBe(line => line.Contains("sudo "));
        linuxRuns.ShouldContain(line => line.Contains("sudo bash ./install-"));
        linuxRuns.ShouldContain(line => line.Contains("sudo SERVER_NAME=") && line.Contains(" bash ./install.sh"));
        linuxRuns.ShouldNotContain(line => line.TrimStart().StartsWith("SERVER_NAME=", StringComparison.Ordinal));
    }

    [Test]
    public void Full_explains_the_docker_install_offer_on_linux()
    {
        LlmsTxtGenerator.BuildFull(BaseUrl).ShouldContain(
            "If Docker is missing, the installer offers to install Docker Engine via Docker's official convenience script (Ubuntu, Debian, Fedora); otherwise install Docker Engine with the Compose plugin first.");
    }

    [Test]
    public void Full_links_docs_home_and_installation_page()
    {
        var full = LlmsTxtGenerator.BuildFull(BaseUrl);

        full.ShouldContain(DocsHomeUrl);
        full.ShouldContain(DocsInstallUrl);
    }

    [Test]
    public void Short_links_docs_home()
    {
        LlmsTxtGenerator.BuildShort(BaseUrl).ShouldContain(DocsHomeUrl);
    }

    [Test]
    public void Full_does_not_present_macos_as_install_path()
    {
        var full = LlmsTxtGenerator.BuildFull(BaseUrl);
        var section = full[full.IndexOf(SectionHeading, StringComparison.Ordinal)..];

        section.ShouldContain("macOS is not covered by these steps");
        ExtractCodeBlocks(full).ShouldNotContain(block => block.Contains("macOS", StringComparison.OrdinalIgnoreCase));
    }

    private static List<string> ExtractCodeBlocks(string text)
    {
        var blocks = new List<string>();
        var parts = text.Split(CodeFence);
        for (var i = 1; i < parts.Length; i += 2)
        {
            blocks.Add(parts[i]);
        }

        return blocks;
    }
}
