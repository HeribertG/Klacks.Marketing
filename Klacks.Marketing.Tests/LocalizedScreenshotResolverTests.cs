// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using Microsoft.Extensions.FileProviders;
using NUnit.Framework;
using Shouldly;

[TestFixture]
public class LocalizedScreenshotResolverTests
{
    private const string ScheduleDe = "app-schedule-de.png";

    private string _webRoot = string.Empty;

    [SetUp]
    public void SetUp()
    {
        _webRoot = Path.Combine(Path.GetTempPath(), "klacks-marketing-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(_webRoot, LocalizedScreenshotResolver.ImagesFolder));
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_webRoot))
        {
            Directory.Delete(_webRoot, recursive: true);
        }
    }

    [Test]
    public void Culture_webp_wins_over_all_other_candidates()
    {
        var resolver = CreateResolver(ScheduleDe, "app-schedule-ja.webp", "app-schedule-ja.png", "app-schedule-de.webp");

        resolver.Resolve(ScheduleDe, "ja").ShouldBe("app-schedule-ja.webp");
        resolver.IsLocalized(ScheduleDe, "ja").ShouldBeTrue();
    }

    [Test]
    public void Culture_png_wins_over_default_webp()
    {
        var resolver = CreateResolver(ScheduleDe, "app-schedule-ja.png", "app-schedule-de.webp");

        resolver.Resolve(ScheduleDe, "ja").ShouldBe("app-schedule-ja.png");
        resolver.IsLocalized(ScheduleDe, "ja").ShouldBeTrue();
    }

    [Test]
    public void Default_webp_is_used_when_culture_has_no_screenshot()
    {
        var resolver = CreateResolver(ScheduleDe, "app-schedule-de.webp");

        resolver.Resolve(ScheduleDe, "ja").ShouldBe("app-schedule-de.webp");
        resolver.IsLocalized(ScheduleDe, "ja").ShouldBeFalse();
    }

    [Test]
    public void Original_file_is_kept_when_no_candidate_exists()
    {
        var resolver = CreateResolver(ScheduleDe);

        resolver.Resolve(ScheduleDe, "ja").ShouldBe(ScheduleDe);
        resolver.IsLocalized(ScheduleDe, "ja").ShouldBeFalse();
    }

    [Test]
    public void Default_culture_is_localized_for_its_own_screenshot()
    {
        var resolver = CreateResolver(ScheduleDe);

        resolver.Resolve(ScheduleDe, SupportedCultures.DefaultCode).ShouldBe(ScheduleDe);
        resolver.IsLocalized(ScheduleDe, SupportedCultures.DefaultCode).ShouldBeTrue();
    }

    [Test]
    public void Default_webp_is_localized_for_default_culture()
    {
        var resolver = CreateResolver(ScheduleDe, "app-schedule-de.webp");

        resolver.Resolve(ScheduleDe, SupportedCultures.DefaultCode).ShouldBe("app-schedule-de.webp");
        resolver.IsLocalized(ScheduleDe, SupportedCultures.DefaultCode).ShouldBeTrue();
    }

    [Test]
    public void Non_matching_file_names_pass_through_untouched()
    {
        var resolver = CreateResolver("klacks-logo.svg", "og-image.png", "app-schedule-ja.webp");

        resolver.Resolve("klacks-logo.svg", "ja").ShouldBe("klacks-logo.svg");
        resolver.Resolve("og-image.png", "ja").ShouldBe("og-image.png");
        resolver.Resolve("app-schedule.png", "ja").ShouldBe("app-schedule.png");
        resolver.Resolve("app-schedule-de.jpg", "ja").ShouldBe("app-schedule-de.jpg");
        resolver.IsLocalized("og-image.png", "ja").ShouldBeFalse();
    }

    [Test]
    public void Chinese_cultures_use_lowercase_file_suffix()
    {
        var resolver = CreateResolver(ScheduleDe, "app-schedule-zh-cn.webp", "app-schedule-zh-tw.png");

        resolver.Resolve(ScheduleDe, "zh-CN").ShouldBe("app-schedule-zh-cn.webp");
        resolver.Resolve(ScheduleDe, "zh-TW").ShouldBe("app-schedule-zh-tw.png");
        resolver.IsLocalized(ScheduleDe, "zh-CN").ShouldBeTrue();
    }

    [Test]
    public void Mixed_case_culture_file_is_not_matched()
    {
        var resolver = CreateResolver(ScheduleDe, "app-schedule-zh-CN.webp");

        resolver.Resolve(ScheduleDe, "zh-CN").ShouldBe(ScheduleDe);
        resolver.IsLocalized(ScheduleDe, "zh-CN").ShouldBeFalse();
    }

    [Test]
    public void View_names_with_hyphens_are_parsed()
    {
        var resolver = CreateResolver("app-editshift-form-ar.png", "app-editshift-form-ja.webp");

        resolver.Resolve("app-editshift-form-ar.png", "ja").ShouldBe("app-editshift-form-ja.webp");
    }

    [Test]
    public void Existing_culture_png_replaces_german_base_file()
    {
        var resolver = CreateResolver("app-calendar-de.png", "app-calendar-ar.png");

        resolver.Resolve("app-calendar-de.png", "ar").ShouldBe("app-calendar-ar.png");
        resolver.IsLocalized("app-calendar-de.png", "ar").ShouldBeTrue();
    }

    [Test]
    public void Files_added_after_construction_are_ignored()
    {
        var resolver = CreateResolver(ScheduleDe);
        File.WriteAllBytes(Path.Combine(_webRoot, LocalizedScreenshotResolver.ImagesFolder, "app-schedule-ja.webp"), []);

        resolver.Resolve(ScheduleDe, "ja").ShouldBe(ScheduleDe);
    }

    private LocalizedScreenshotResolver CreateResolver(params string[] files)
    {
        foreach (var file in files)
        {
            File.WriteAllBytes(Path.Combine(_webRoot, LocalizedScreenshotResolver.ImagesFolder, file), []);
        }

        using var provider = new PhysicalFileProvider(_webRoot);
        return new LocalizedScreenshotResolver(provider);
    }
}
