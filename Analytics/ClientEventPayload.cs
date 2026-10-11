// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Text.Json.Serialization;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Body of a beacon sent by wwwroot/js/c.js. All fields are only classified and then discarded.
/// </summary>
/// <param name="Event">Name of one of the four client events</param>
/// <param name="Path">location.pathname of the page the click happened on</param>
/// <param name="Campaign">utm_source or ref parameter of that page, if any</param>
/// <param name="RefererHost">Host of document.referrer, if any</param>
public sealed record ClientEventPayload(
    [property: JsonPropertyName("e")] string? Event,
    [property: JsonPropertyName("p")] string? Path,
    [property: JsonPropertyName("s")] string? Campaign,
    [property: JsonPropertyName("r")] string? RefererHost);
