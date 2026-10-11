// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Threading.RateLimiting;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// One process-wide fixed window for /_c. There is deliberately no per-client partition, because partitioning
/// would require processing the caller's IP address.
/// </summary>
public sealed class ClientEventRateLimiter : IDisposable
{
    public const int PermitsPerWindow = 600;

    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    private readonly FixedWindowRateLimiter _limiter = new(new FixedWindowRateLimiterOptions
    {
        PermitLimit = PermitsPerWindow,
        Window = Window,
        QueueLimit = 0,
        AutoReplenishment = true,
    });

    public bool TryAcquire()
    {
        using var lease = _limiter.AttemptAcquire();

        return lease.IsAcquired;
    }

    public void Dispose() => _limiter.Dispose();
}
