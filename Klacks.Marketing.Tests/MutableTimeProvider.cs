// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

/// <summary>
/// Time provider whose UTC "now" the test sets, so day keys and the retention window are deterministic.
/// </summary>
/// <param name="utcNow">Initial UTC instant</param>
internal sealed class MutableTimeProvider(DateTimeOffset utcNow) : TimeProvider
{
    public DateTimeOffset UtcNow { get; set; } = utcNow;

    public override DateTimeOffset GetUtcNow() => UtcNow;
}
