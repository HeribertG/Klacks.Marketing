// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using Microsoft.Extensions.Options;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Thread-safe in-memory aggregate of the anonymous daily visit counters. Holds the totals of every month it has
/// touched (loaded from disk on first use, so a restart continues the counts) and writes changed months back on
/// <see cref="Flush"/>. Entries older than <see cref="RetentionDays"/> are dropped from memory and disk.
/// </summary>
/// <param name="options">Enabled switch and data directory</param>
/// <param name="environment">Content root that a relative data directory resolves against</param>
/// <param name="timeProvider">Source of the current UTC day</param>
/// <param name="logger">Receives persistence failures; counting never throws into a request</param>
public sealed class VisitCounterStore
{
    public const int RetentionDays = 400;

    private readonly object _gate = new();
    private readonly object _flushGate = new();
    private readonly Dictionary<VisitKey, long> _counts = new();
    private readonly HashSet<string> _loadedMonths = new(StringComparer.Ordinal);
    private readonly HashSet<string> _dirtyMonths = new(StringComparer.Ordinal);
    private readonly VisitCounterFileStorage _storage;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<VisitCounterStore> _logger;
    private DateOnly _lastRetentionDay = DateOnly.MinValue;

    public VisitCounterStore(
        IOptions<AnalyticsOptions> options,
        IHostEnvironment environment,
        TimeProvider timeProvider,
        ILogger<VisitCounterStore> logger)
    {
        IsEnabled = options.Value.Enabled;
        _timeProvider = timeProvider;
        _logger = logger;
        _storage = new VisitCounterFileStorage(ResolveDirectory(options.Value.DataDirectory, environment.ContentRootPath), logger);
    }

    public bool IsEnabled { get; }

    public string DataDirectory => _storage.Directory;

    public DateOnly Today => DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime);

    public void Record(VisitEvent visitEvent, VisitLocation location, string source, VisitorClass visitor)
    {
        if (!IsEnabled)
        {
            return;
        }

        var key = new VisitKey(Today, visitEvent, location.PageType, location.Country, location.Culture, source, visitor);
        var month = VisitCounterFileStorage.MonthOf(key.Date);

        try
        {
            lock (_gate)
            {
                EnsureLoaded(month);
                _counts[key] = _counts.GetValueOrDefault(key) + 1;
                _dirtyMonths.Add(month);
            }
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(exception, "Visit counter could not load month {Month}", month);
        }
    }

    public IReadOnlyList<KeyValuePair<VisitKey, long>> Snapshot(DateOnly from, DateOnly to)
    {
        lock (_gate)
        {
            for (var month = new DateOnly(from.Year, from.Month, 1); month <= to; month = month.AddMonths(1))
            {
                EnsureLoaded(VisitCounterFileStorage.MonthOf(month));
            }

            return _counts.Where(pair => pair.Key.Date >= from && pair.Key.Date <= to).ToList();
        }
    }

    public void Flush()
    {
        if (!IsEnabled)
        {
            return;
        }

        lock (_flushGate)
        {
            var cutoff = Today.AddDays(-RetentionDays);
            var pending = TakeDirtyMonths(cutoff);

            foreach (var (month, entries) in pending)
            {
                try
                {
                    _storage.Write(month, entries);
                }
                catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
                {
                    _logger.LogWarning(exception, "Visit counter could not write month {Month}", month);
                    lock (_gate)
                    {
                        _dirtyMonths.Add(month);
                    }
                }
            }

            ApplyRetention(cutoff);
        }
    }

    private List<(string Month, List<VisitCounterFileEntry> Entries)> TakeDirtyMonths(DateOnly cutoff)
    {
        lock (_gate)
        {
            foreach (var expired in _counts.Keys.Where(key => key.Date < cutoff).ToList())
            {
                _counts.Remove(expired);
            }

            var pending = _dirtyMonths
                .Select(month => (month, _counts
                    .Where(pair => VisitCounterFileStorage.MonthOf(pair.Key.Date) == month)
                    .Select(pair => ToEntry(pair.Key, pair.Value))
                    .ToList()))
                .ToList();
            _dirtyMonths.Clear();

            return pending;
        }
    }

    private void ApplyRetention(DateOnly cutoff)
    {
        if (_lastRetentionDay == Today)
        {
            return;
        }

        try
        {
            foreach (var month in _storage.ExistingMonths())
            {
                var firstDay = VisitCounterFileStorage.FirstDayOf(month);
                var lastDay = firstDay.AddMonths(1).AddDays(-1);

                if (lastDay < cutoff)
                {
                    _storage.Delete(month);
                    lock (_gate)
                    {
                        _loadedMonths.Remove(month);
                    }
                }
                else if (firstDay < cutoff)
                {
                    _storage.Write(month, _storage.Load(month).Where(entry => entry.Date >= cutoff));
                }
            }

            _lastRetentionDay = Today;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(exception, "Visit counter retention pass failed");
        }
    }

    private void EnsureLoaded(string month)
    {
        if (_loadedMonths.Contains(month))
        {
            return;
        }

        // Marked as loaded only after a successful read: a transient lock must not let a later flush overwrite the
        // persisted month with counts that started from zero.
        var cutoff = Today.AddDays(-RetentionDays);
        var persisted = _storage.Load(month).Where(entry => entry.Date >= cutoff).ToList();

        foreach (var entry in persisted)
        {
            var key = new VisitKey(entry.Date, entry.Event, entry.PageType, entry.Country, entry.Culture, entry.Source, entry.Visitor);
            _counts[key] = _counts.GetValueOrDefault(key) + entry.Count;
        }

        _loadedMonths.Add(month);
    }

    private static VisitCounterFileEntry ToEntry(VisitKey key, long count) => new()
    {
        Date = key.Date,
        Event = key.Event,
        PageType = key.PageType,
        Country = key.Country,
        Culture = key.Culture,
        Source = key.Source,
        Visitor = key.Visitor,
        Count = count,
    };

    private static string ResolveDirectory(string configured, string contentRoot)
    {
        var directory = string.IsNullOrWhiteSpace(configured) ? AnalyticsOptions.DefaultDataDirectory : configured;

        return Path.GetFullPath(Path.IsPathRooted(directory) ? directory : Path.Combine(contentRoot, directory));
    }
}
