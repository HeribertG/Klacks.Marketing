// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Json;
using System.Text.RegularExpressions;
using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Checks the "It all comes down to the settings" section (surcharges and scheduling rules): every culture has all
/// of its texts in its own language, the Klacksy tip names the assistant, headings stay short, and the real component
/// renders with the real content provider in all cultures without showing a raw text key.
/// </summary>
[TestFixture]
public class RuleSettingsSectionTests
{
    private const string SharedFileName = "shared.json";
    private const string MarketingProjectName = "Klacks.Marketing";
    private const string KeyPrefix = "ruleSettings.";
    private const string KlacksyName = "Klacksy";
    private const string GermanAppMacroTerm = "Makro";
    private const string TitleSuffix = ".title";
    private const int MaxSectionTitleLength = 50;
    private const int MaxCardTitleLength = 40;
    private const string TestEnvironmentName = "Development";
    private const string HtmlEntityPattern = "&(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);";

    private static IEnumerable<string> CultureCodes => SupportedCultures.All.Select(c => c.Code);

    [TestCaseSource(nameof(CultureCodes))]
    public void Every_culture_has_every_text_of_the_section(string culture)
    {
        var texts = LoadSharedTexts(culture);

        foreach (var key in RuleSettingsSection.AllTextKeys.Append(RuleSettingsSection.HintLabelKey))
        {
            texts.ShouldContainKey(key, $"{culture}/{SharedFileName} lacks '{key}'");
            texts[key].ShouldNotBeNullOrWhiteSpace($"{culture}/{SharedFileName} has an empty '{key}'");
        }
    }

    [Test]
    public void Non_default_cultures_do_not_reuse_the_german_texts()
    {
        var german = LoadSharedTexts(SupportedCultures.DefaultCode);

        foreach (var culture in CultureCodes.Where(c => c != SupportedCultures.DefaultCode))
        {
            var texts = LoadSharedTexts(culture);

            foreach (var key in RuleSettingsSection.AllTextKeys)
            {
                texts[key].ShouldNotBe(german[key], $"{culture}/{SharedFileName} '{key}' is a copy of the German text");
            }
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Klacksy_tip_names_the_assistant(string culture)
    {
        LoadSharedTexts(culture)[RuleSettingsSection.KlacksyHintKey]
            .ShouldContain(KlacksyName, Case.Sensitive, $"{culture}/{SharedFileName} '{RuleSettingsSection.KlacksyHintKey}' does not name {KlacksyName}");
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Section_and_card_titles_stay_short(string culture)
    {
        var texts = LoadSharedTexts(culture);

        texts[RuleSettingsSection.TitleKey].Length.ShouldBeLessThanOrEqualTo(MaxSectionTitleLength, $"{culture}/{SharedFileName} section title is too long");
        foreach (var item in RuleSettingsSection.Items)
        {
            texts[item.TitleKey].Length.ShouldBeLessThanOrEqualTo(MaxCardTitleLength, $"{culture}/{SharedFileName} '{item.TitleKey}' is too long");
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public void Texts_are_plain_text_without_markup_or_entities(string culture)
    {
        var texts = LoadSharedTexts(culture);

        foreach (var key in RuleSettingsSection.AllTextKeys)
        {
            texts[key].ShouldNotContain("<", customMessage: $"{culture}/{SharedFileName} '{key}' contains markup");
            Regex.IsMatch(texts[key], HtmlEntityPattern).ShouldBeFalse($"{culture}/{SharedFileName} '{key}' contains an HTML entity");
        }
    }

    [Test]
    public void German_texts_use_the_app_term_macro()
    {
        var german = LoadSharedTexts(SupportedCultures.DefaultCode);

        foreach (var key in RuleSettingsSection.AllTextKeys)
        {
            german[key].ShouldNotContain(GermanAppMacroTerm, Case.Insensitive, $"de/{SharedFileName} '{key}' must use the app term 'Macro'");
        }
    }

    [TestCaseSource(nameof(CultureCodes))]
    public async Task Section_renders_in_every_culture_without_raw_keys(string culture)
    {
        var html = await RenderAsync(culture);

        html.ShouldContain($"id=\"{RuleSettingsSection.SectionId}\"");
        html.ShouldNotContain(KeyPrefix, customMessage: $"{culture} renders a raw '{KeyPrefix}*' key");
        foreach (var item in RuleSettingsSection.Items)
        {
            html.ShouldContain(item.Icon);
        }
    }

    [Test]
    public void Card_title_keys_are_titles()
    {
        RuleSettingsSection.Items.ShouldAllBe(item => item.TitleKey.EndsWith(TitleSuffix, StringComparison.Ordinal));
    }

    private static async Task<string> RenderAsync(string culture)
    {
        var services = new ServiceCollection()
            .AddSingleton<IPageContentProvider>(new JsonPageContentProvider(new ContentRootEnvironment(MarketingProjectPaths.ProjectRoot)))
            .BuildServiceProvider();

        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var output = await renderer.RenderComponentAsync<RuleSettingsSection>(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(RuleSettingsSection.Culture)] = culture,
            }));
            return output.ToHtmlString();
        });
    }

    private static Dictionary<string, string> LoadSharedTexts(string culture)
    {
        var path = Path.Combine(MarketingProjectPaths.ContentRoot, culture, SharedFileName);
        return JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(path))
            ?? throw new InvalidOperationException($"{path} is empty.");
    }

    private sealed class ContentRootEnvironment(string contentRootPath) : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = contentRootPath;

        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();

        public string ApplicationName { get; set; } = MarketingProjectName;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();

        public string ContentRootPath { get; set; } = contentRootPath;

        public string EnvironmentName { get; set; } = TestEnvironmentName;
    }
}
