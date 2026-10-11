// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Text.Json;
using System.Text.Json.Serialization;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Shared JSON settings for the counter files and the /_stats response: camelCase, enums as names.
/// </summary>
public static class VisitCounterJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter(allowIntegerValues: false) },
    };
}
