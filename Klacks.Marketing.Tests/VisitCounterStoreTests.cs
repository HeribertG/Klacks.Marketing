// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using System.Text.Json;
using Klacks.Marketing.Analytics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// The visit counter aggregates per day and dimension in memory, persists one JSON file per month atomically,
/// continues the counts after a restart and drops everything older than the retention window.
/// </summary>
[TestFixture]
public class VisitCounterStoreTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 11, 23, 30, 0, TimeSpan.Zero);
    private static readonly VisitLocation SwissStart = new(PageTypes.Start, "ch", "de");
    private static readonly VisitLocation EnglishInstall = new(PageTypes.Installation, "gb", "en");

    private string _directory = null!;
    private MutableTimeProvider _time = null!;

    [SetUp]
    public void SetUp()
    {
        _directory = Path.Combine(Path.GetTempPath(), "klacks-visit-store-" + Guid.NewGuid().ToString("N"));
        _time = new MutableTimeProvider(Now);
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, recursive: true);
        }
    }

    [Test]
    public void Counts_are_aggregated_per_day_and_dimension()
    {
        var store = CreateStore();

        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Google, VisitorClass.Human);
        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Google, VisitorClass.Human);
        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Google, VisitorClass.Bot);
        store.Record(VisitEvent.PageRequest, EnglishInstall, TrafficSources.Direct, VisitorClass.Human);
        store.Record(VisitEvent.DownloadClick, EnglishInstall, TrafficSources.Direct, VisitorClass.Human);
        _time.UtcNow = Now.AddHours(1);
        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Google, VisitorClass.Human);

        var today = DateOnly.FromDateTime(Now.UtcDateTime);
        var rows = store.Snapshot(today, today.AddDays(1)).ToDictionary(pair => pair.Key, pair => pair.Value);

        rows.Count.ShouldBe(5);
        rows[Key(today, VisitEvent.PageRequest, SwissStart, TrafficSources.Google, VisitorClass.Human)].ShouldBe(2);
        rows[Key(today, VisitEvent.PageRequest, SwissStart, TrafficSources.Google, VisitorClass.Bot)].ShouldBe(1);
        rows[Key(today, VisitEvent.PageRequest, EnglishInstall, TrafficSources.Direct, VisitorClass.Human)].ShouldBe(1);
        rows[Key(today, VisitEvent.DownloadClick, EnglishInstall, TrafficSources.Direct, VisitorClass.Human)].ShouldBe(1);
        rows[Key(today.AddDays(1), VisitEvent.PageRequest, SwissStart, TrafficSources.Google, VisitorClass.Human)].ShouldBe(1);
    }

    [Test]
    public void Flush_writes_one_json_file_per_month_with_the_documented_format()
    {
        var store = CreateStore();
        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.ChatGpt, VisitorClass.Human);
        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.ChatGpt, VisitorClass.Human);
        _time.UtcNow = new DateTimeOffset(2026, 11, 1, 0, 5, 0, TimeSpan.Zero);
        store.Record(VisitEvent.CircuitStarted, SwissStart, TrafficSources.Direct, VisitorClass.Human);

        store.Flush();

        Directory.GetFiles(_directory).Select(Path.GetFileName).OrderBy(name => name)
            .ShouldBe(new[] { "visits-2026-10.json", "visits-2026-11.json" });

        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(_directory, "visits-2026-10.json")));
        var root = document.RootElement;
        root.GetProperty("schemaVersion").GetInt32().ShouldBe(1);
        root.GetProperty("month").GetString().ShouldBe("2026-10");
        var entry = root.GetProperty("entries").EnumerateArray().Single();
        entry.GetProperty("date").GetString().ShouldBe("2026-10-11");
        entry.GetProperty("event").GetString().ShouldBe("PageRequest");
        entry.GetProperty("pageType").GetString().ShouldBe("start");
        entry.GetProperty("country").GetString().ShouldBe("ch");
        entry.GetProperty("culture").GetString().ShouldBe("de");
        entry.GetProperty("source").GetString().ShouldBe("chatgpt.com");
        entry.GetProperty("visitor").GetString().ShouldBe("Human");
        entry.GetProperty("count").GetInt64().ShouldBe(2);
        entry.EnumerateObject().Select(property => property.Name).ShouldBe(new[]
        {
            "date", "event", "pageType", "country", "culture", "source", "visitor", "count",
        });
    }

    [Test]
    public void A_restarted_store_continues_the_persisted_counts()
    {
        var first = CreateStore();
        first.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        first.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        first.Flush();

        var second = CreateStore();
        second.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        second.Flush();

        var today = DateOnly.FromDateTime(Now.UtcDateTime);
        CreateStore().Snapshot(today, today).Single().Value.ShouldBe(3);
    }

    [Test]
    public void A_month_file_locked_during_loading_is_retried_instead_of_overwritten()
    {
        var first = CreateStore();
        first.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        first.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        first.Flush();
        var path = Path.Combine(_directory, "visits-2026-10.json");

        var second = CreateStore();
        using (new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.None))
        {
            second.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        }

        second.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        second.Flush();

        var today = DateOnly.FromDateTime(Now.UtcDateTime);
        CreateStore().Snapshot(today, today).Single().Value.ShouldBe(3);
    }

    [Test]
    public void Client_event_rate_limit_is_process_wide()
    {
        using var limiter = new ClientEventRateLimiter();

        for (var permit = 0; permit < ClientEventRateLimiter.PermitsPerWindow; permit++)
        {
            limiter.TryAcquire().ShouldBeTrue();
        }

        limiter.TryAcquire().ShouldBeFalse();
    }

    [Test]
    public void Writes_are_atomic_and_leave_no_temp_files()
    {
        var store = CreateStore();
        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        store.Flush();
        var path = Path.Combine(_directory, "visits-2026-10.json");
        var before = File.ReadAllText(path);

        store.Record(VisitEvent.OutboundClick, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        store.Flush();

        Directory.GetFiles(_directory).Select(Path.GetFileName).ShouldBe(new[] { "visits-2026-10.json" });
        var after = File.ReadAllText(path);
        after.ShouldNotBe(before);
        Should.NotThrow(() => JsonDocument.Parse(after).Dispose());
        after.ShouldContain("OutboundClick");
    }

    [Test]
    public void Write_goes_through_a_temp_file_in_the_same_directory()
    {
        var source = MarketingProjectPaths.ReadSource("Analytics/VisitCounterFileStorage.cs");

        source.ShouldContain("File.Move(temp, target, overwrite: true)");
        source.ShouldContain("Path.Combine(Directory, FilePrefix + month + TempSeparator");
    }

    [Test]
    public void Retention_deletes_months_older_than_the_window_and_trims_the_boundary_month()
    {
        var storage = new VisitCounterFileStorage(_directory, NullLogger.Instance);
        var cutoff = DateOnly.FromDateTime(Now.UtcDateTime).AddDays(-VisitCounterStore.RetentionDays);
        storage.Write("2025-08", new[] { Entry(new DateOnly(2025, 8, 31)) });
        storage.Write(VisitCounterFileStorage.MonthOf(cutoff), new[] { Entry(cutoff.AddDays(-1)), Entry(cutoff) });

        var store = CreateStore();
        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        store.Flush();

        File.Exists(storage.PathOf("2025-08")).ShouldBeFalse();
        storage.Load(VisitCounterFileStorage.MonthOf(cutoff)).Select(entry => entry.Date).ShouldBe(new[] { cutoff });
        store.Snapshot(cutoff.AddDays(-10), cutoff.AddDays(-1)).ShouldBeEmpty();
    }

    [Test]
    public void Retention_window_is_400_days()
    {
        VisitCounterStore.RetentionDays.ShouldBe(400);
    }

    [Test]
    public void A_corrupt_month_file_is_quarantined_instead_of_overwritten()
    {
        Directory.CreateDirectory(_directory);
        File.WriteAllText(Path.Combine(_directory, "visits-2026-10.json"), "{ not json");

        var store = CreateStore();
        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        store.Flush();

        Directory.GetFiles(_directory, "visits-2026-10.json.corrupt-*").Length.ShouldBe(1);
        File.ReadAllText(Path.Combine(_directory, "visits-2026-10.json")).ShouldContain("\"count\": 1");
    }

    [Test]
    public void A_disabled_store_records_and_writes_nothing()
    {
        var store = CreateStore(enabled: false);

        store.Record(VisitEvent.PageRequest, SwissStart, TrafficSources.Direct, VisitorClass.Human);
        store.Flush();

        Directory.Exists(_directory).ShouldBeFalse();
        store.Snapshot(DateOnly.MinValue.AddYears(2000), DateOnly.FromDateTime(Now.UtcDateTime)).ShouldBeEmpty();
    }

    [Test]
    public void Relative_data_directory_resolves_against_the_content_root()
    {
        var store = new VisitCounterStore(
            Options.Create(new AnalyticsOptions()),
            new TestWebHostEnvironment(),
            _time,
            NullLogger<VisitCounterStore>.Instance);

        store.DataDirectory.ShouldBe(Path.GetFullPath(Path.Combine(MarketingProjectPaths.ProjectRoot, "data", "analytics")));
    }

    private VisitCounterStore CreateStore(bool enabled = true)
        => new(
            Options.Create(new AnalyticsOptions { Enabled = enabled, DataDirectory = _directory }),
            new TestWebHostEnvironment(),
            _time,
            NullLogger<VisitCounterStore>.Instance);

    private static VisitKey Key(DateOnly date, VisitEvent visitEvent, VisitLocation location, string source, VisitorClass visitor)
        => new(date, visitEvent, location.PageType, location.Country, location.Culture, source, visitor);

    private static VisitCounterFileEntry Entry(DateOnly date) => new()
    {
        Date = date,
        Event = VisitEvent.PageRequest,
        PageType = PageTypes.Start,
        Country = "ch",
        Culture = "de",
        Source = TrafficSources.Direct,
        Visitor = VisitorClass.Human,
        Count = 1,
    };
}
