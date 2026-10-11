// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization;
using Klacks.Marketing.Shared;
using Microsoft.Extensions.FileProviders;
using NUnit.Framework;
using Shouldly;

[TestFixture]
public class LocalizedVideoCatalogTests
{
    private const string RestConflict = "rest-conflict";
    private const string KlacksyPlansWeek = "klacksy-plans-week";

    private string _webRoot = string.Empty;

    [SetUp]
    public void SetUp()
    {
        _webRoot = Path.Combine(Path.GetTempPath(), "klacks-marketing-video-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(_webRoot, LocalizedVideoCatalog.VideosFolder));
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
    public void Culture_with_webm_mp4_and_poster_returns_all_three_paths()
    {
        var catalog = CreateCatalog("rest-conflict-ja.webm", "rest-conflict-ja.mp4", "rest-conflict-ja.webp");

        var sources = catalog.Find(RestConflict, "ja");

        sources.ShouldNotBeNull();
        sources.WebmPath.ShouldBe("videos/rest-conflict-ja.webm");
        sources.Mp4Path.ShouldBe("videos/rest-conflict-ja.mp4");
        sources.PosterPath.ShouldBe("videos/rest-conflict-ja.webp");
    }

    [TestCase("rest-conflict-fr.mp4", "rest-conflict-fr.webp")]
    [TestCase("rest-conflict-fr.webm", "rest-conflict-fr.webp")]
    [TestCase("rest-conflict-fr.webm", "rest-conflict-fr.mp4")]
    public void Culture_missing_one_file_has_no_video(string first, string second)
    {
        var catalog = CreateCatalog(first, second);

        catalog.Find(RestConflict, "fr").ShouldBeNull();
    }

    [Test]
    public void Culture_without_video_does_not_fall_back_to_default_culture()
    {
        var catalog = CreateCatalog("rest-conflict-de.webm", "rest-conflict-de.mp4", "rest-conflict-de.webp");

        catalog.Find(RestConflict, "ko").ShouldBeNull();
        catalog.Find(RestConflict, "de").ShouldNotBeNull();
    }

    [Test]
    public void Region_culture_maps_to_lowercase_file_suffix()
    {
        var catalog = CreateCatalog("rest-conflict-zh-cn.webm", "rest-conflict-zh-cn.mp4", "rest-conflict-zh-cn.webp");

        catalog.Find(RestConflict, "zh-CN")!.WebmPath.ShouldBe("videos/rest-conflict-zh-cn.webm");
        catalog.Find(RestConflict, "zh-TW").ShouldBeNull();
    }

    [Test]
    public void Video_names_are_resolved_independently_per_video()
    {
        var catalog = CreateCatalog(
            "klacksy-plans-week-ja.webm", "klacksy-plans-week-ja.mp4", "klacksy-plans-week-ja.webp",
            "rest-conflict-de.webm", "rest-conflict-de.mp4", "rest-conflict-de.webp");

        var plansWeek = catalog.Find(KlacksyPlansWeek, "ja");

        plansWeek.ShouldNotBeNull();
        plansWeek.WebmPath.ShouldBe("videos/klacksy-plans-week-ja.webm");
        plansWeek.Mp4Path.ShouldBe("videos/klacksy-plans-week-ja.mp4");
        plansWeek.PosterPath.ShouldBe("videos/klacksy-plans-week-ja.webp");
        catalog.Find(RestConflict, "ja").ShouldBeNull();
        catalog.Find(KlacksyPlansWeek, "de").ShouldBeNull();
        catalog.Find(RestConflict, "de").ShouldNotBeNull();
    }

    [Test]
    public void Klacksy_plans_week_culture_without_video_does_not_fall_back_to_default_culture()
    {
        var catalog = CreateCatalog("klacksy-plans-week-de.webm", "klacksy-plans-week-de.mp4", "klacksy-plans-week-de.webp");

        catalog.Find(KlacksyPlansWeek, "ar").ShouldBeNull();
        catalog.Find(KlacksyPlansWeek, "de").ShouldNotBeNull();
    }

    [Test]
    public void Video_name_constants_match_the_recorded_file_names()
    {
        DemoVideo.RestConflictVideoName.ShouldBe(RestConflict);
        DemoVideo.RuleCollisionVideoName.ShouldBe("rule-collision");
        DemoVideo.RuleConsecutiveDaysVideoName.ShouldBe("rule-consecutive-days");
        DemoVideo.RuleHolidayWorkVideoName.ShouldBe("rule-holiday-work");
        DemoVideo.KlacksyPlansWeekVideoName.ShouldBe(KlacksyPlansWeek);
        DemoVideo.KlacksyGroupsAddressVideoName.ShouldBe("klacksy-groups-address");
        DemoVideo.KlacksyGroupsQualificationVideoName.ShouldBe("klacksy-groups-qualification");
        DemoVideo.KlacksyGroupsMixedVideoName.ShouldBe("klacksy-groups-mixed");
        DemoVideo.ExpensesVideoName.ShouldBe("expenses");
        DemoVideo.CorrectionVideoName.ShouldBe("correction");
        DemoVideo.ReplacementVideoName.ShouldBe("replacement");
        DemoVideo.HoursAdjustmentVideoName.ShouldBe("hours-adjustment");
        DemoVideo.Timeline24hVideoName.ShouldBe("timeline-24h");
        DemoVideo.TimelineDayDragDropVideoName.ShouldBe("timeline-day-dragdrop");
        DemoVideo.ContainerFillVideoName.ShouldBe("container-fill");
        DemoVideo.ContainerAutofillVideoName.ShouldBe("container-autofill");
        DemoVideo.ContainerPauseVideoName.ShouldBe("container-pause");
        DemoVideo.ContainerRouteVideoName.ShouldBe("container-route");
        DemoVideo.ContainerSplitVideoName.ShouldBe("container-split");
        DemoVideo.ScenarioCreateVideoName.ShouldBe("scenario-create");
        DemoVideo.ScenarioAutoWizardVideoName.ShouldBe("scenario-autowizard");
        DemoVideo.ScenarioCompareVideoName.ShouldBe("scenario-compare");
        DemoVideo.ScenarioRuleViolationVideoName.ShouldBe("scenario-rule-violation");
        DemoVideo.ShiftSporadicVideoName.ShouldBe("shift-sporadic");
        DemoVideo.ShiftTimeRangeVideoName.ShouldBe("shift-time-range");
        DemoVideo.ShiftSumEmployeesVideoName.ShouldBe("shift-sum-employees");
        DemoVideo.ShiftQuantityVideoName.ShouldBe("shift-quantity");
        DemoVideo.ShiftQualificationVideoName.ShouldBe("shift-qualification");
    }

    [Test]
    public void Hyphenated_video_name_with_region_culture_resolves_the_lowercase_file_names()
    {
        var catalog = CreateCatalog("hours-adjustment-zh-tw.webm", "hours-adjustment-zh-tw.mp4", "hours-adjustment-zh-tw.webp");

        catalog.Find(DemoVideo.HoursAdjustmentVideoName, "zh-TW")!.PosterPath.ShouldBe("videos/hours-adjustment-zh-tw.webp");
        catalog.Find(DemoVideo.HoursAdjustmentVideoName, "zh-CN").ShouldBeNull();
    }

    [Test]
    public void Partially_recorded_new_video_is_available_only_in_the_recorded_cultures_and_each_name_independently()
    {
        var catalog = CreateCatalog(
            "container-split-de.webm", "container-split-de.mp4", "container-split-de.webp",
            "container-split-ja.webm", "container-split-ja.mp4",
            "timeline-24h-de.webm", "timeline-24h-de.mp4", "timeline-24h-de.webp");

        catalog.Find(DemoVideo.ContainerSplitVideoName, "de").ShouldNotBeNull();
        catalog.Find(DemoVideo.ContainerSplitVideoName, "ja").ShouldBeNull();
        catalog.Find(DemoVideo.ContainerSplitVideoName, "fr").ShouldBeNull();
        catalog.Find(DemoVideo.Timeline24hVideoName, "de")!.PosterPath.ShouldBe("videos/timeline-24h-de.webp");
        catalog.Find(DemoVideo.TimelineDayDragDropVideoName, "de").ShouldBeNull();
        catalog.Find(DemoVideo.ContainerFillVideoName, "de").ShouldBeNull();
    }

    [Test]
    public void Missing_videos_folder_yields_no_video()
    {
        Directory.Delete(Path.Combine(_webRoot, LocalizedVideoCatalog.VideosFolder));
        using var provider = new PhysicalFileProvider(_webRoot);

        new LocalizedVideoCatalog(provider).Find(RestConflict, "de").ShouldBeNull();
    }

    [Test]
    public void Files_added_after_construction_are_not_seen()
    {
        var catalog = CreateCatalog();
        CreateFiles("rest-conflict-de.webm", "rest-conflict-de.mp4", "rest-conflict-de.webp");

        catalog.Find(RestConflict, "de").ShouldBeNull();
    }

    private LocalizedVideoCatalog CreateCatalog(params string[] files)
    {
        CreateFiles(files);
        using var provider = new PhysicalFileProvider(_webRoot);
        return new LocalizedVideoCatalog(provider);
    }

    private void CreateFiles(params string[] files)
    {
        foreach (var file in files)
        {
            File.WriteAllBytes(Path.Combine(_webRoot, LocalizedVideoCatalog.VideosFolder, file), []);
        }
    }
}
