// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Globalization;
using System.Text.Json;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Reads and writes one JSON file per month ("visits-yyyy-MM.json"). Writes go to a temp file in the same
/// directory and are then moved over the target, so a crash never leaves a half-written month file.
/// </summary>
/// <param name="directory">Absolute folder that holds the month files</param>
/// <param name="logger">Receives warnings about unreadable files</param>
public sealed class VisitCounterFileStorage(string directory, ILogger logger)
{
    public const int SchemaVersion = 1;
    public const string MonthFormat = "yyyy-MM";

    private const string FilePrefix = "visits-";
    private const string FileExtension = ".json";
    private const string TempSeparator = ".";
    private const string TempExtension = ".tmp";
    private const string GuidFormat = "N";
    private const string CorruptSuffix = ".corrupt-";
    private const string CorruptStampFormat = "yyyyMMddHHmmss";

    public string Directory { get; } = directory;

    public static string MonthOf(DateOnly date) => date.ToString(MonthFormat, CultureInfo.InvariantCulture);

    public string PathOf(string month) => Path.Combine(Directory, FilePrefix + month + FileExtension);

    public IReadOnlyList<VisitCounterFileEntry> Load(string month)
    {
        var path = PathOf(month);
        if (!File.Exists(path))
        {
            return Array.Empty<VisitCounterFileEntry>();
        }

        try
        {
            var document = JsonSerializer.Deserialize<VisitCounterFileDocument>(File.ReadAllText(path), VisitCounterJson.Options);

            return document?.Entries ?? new List<VisitCounterFileEntry>();
        }
        catch (JsonException exception)
        {
            var quarantine = path + CorruptSuffix + DateTime.UtcNow.ToString(CorruptStampFormat, CultureInfo.InvariantCulture);
            File.Move(path, quarantine, overwrite: true);
            logger.LogError(exception, "Unreadable visit counter file moved to {Quarantine}", quarantine);

            return Array.Empty<VisitCounterFileEntry>();
        }
    }

    public void Write(string month, IEnumerable<VisitCounterFileEntry> entries)
    {
        System.IO.Directory.CreateDirectory(Directory);

        var document = new VisitCounterFileDocument
        {
            SchemaVersion = SchemaVersion,
            Month = month,
            Entries = entries
                .OrderBy(entry => entry.Date)
                .ThenBy(entry => entry.Event)
                .ThenBy(entry => entry.PageType, StringComparer.Ordinal)
                .ThenBy(entry => entry.Country, StringComparer.Ordinal)
                .ThenBy(entry => entry.Culture, StringComparer.Ordinal)
                .ThenBy(entry => entry.Source, StringComparer.Ordinal)
                .ThenBy(entry => entry.Visitor)
                .ToList(),
        };

        var target = PathOf(month);
        var temp = Path.Combine(Directory, FilePrefix + month + TempSeparator + Guid.NewGuid().ToString(GuidFormat) + TempExtension);

        try
        {
            using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                JsonSerializer.Serialize(stream, document, VisitCounterJson.Options);
                stream.Flush(flushToDisk: true);
            }

            File.Move(temp, target, overwrite: true);
        }
        finally
        {
            if (File.Exists(temp))
            {
                File.Delete(temp);
            }
        }
    }

    public IReadOnlyList<string> ExistingMonths()
    {
        if (!System.IO.Directory.Exists(Directory))
        {
            return Array.Empty<string>();
        }

        return System.IO.Directory.EnumerateFiles(Directory, FilePrefix + "*" + FileExtension)
            .Select(path => Path.GetFileNameWithoutExtension(path)[FilePrefix.Length..])
            .Where(month => DateOnly.TryParseExact(month, MonthFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            .ToList();
    }

    public void Delete(string month)
    {
        var path = PathOf(month);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    public static DateOnly FirstDayOf(string month)
        => DateOnly.ParseExact(month, MonthFormat, CultureInfo.InvariantCulture, DateTimeStyles.None);
}
