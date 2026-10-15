// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using Klacks.Marketing.Seo;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// llms-full.txt carries the real install commands and docs links, so an assistant helping a layperson does not
/// have to invent commands; llms.txt links the docs as well.
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
        blocks.ShouldContain(block => block.Contains(ExternalLinks.OnPremBundleUrl));
    }

    [Test]
    public void Full_runs_the_linux_installer_with_sudo_and_passes_variables_after_sudo()
    {
        var blocks = ExtractCodeBlocks(LlmsTxtGenerator.BuildFull(BaseUrl));
        var linuxRuns = blocks.SelectMany(block => block.Split(LineBreak)).Where(line => line.Contains("install.sh")).ToList();

        linuxRuns.ShouldNotBeEmpty();
        linuxRuns.ShouldAllBe(line => line.Contains("sudo "));
        linuxRuns.ShouldContain(line => line.Contains("sudo bash ./install.sh"));
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
