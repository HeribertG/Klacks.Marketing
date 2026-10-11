// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Persists the visit counter every <see cref="FlushInterval"/> and once more when the host shuts down.
/// </summary>
/// <param name="store">The in-memory aggregate to persist</param>
/// <param name="timeProvider">Drives the periodic timer</param>
public sealed class VisitCounterFlushService(VisitCounterStore store, TimeProvider timeProvider) : BackgroundService
{
    public static readonly TimeSpan FlushInterval = TimeSpan.FromSeconds(60);

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await base.StopAsync(cancellationToken);
        store.Flush();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!store.IsEnabled)
        {
            return;
        }

        using var timer = new PeriodicTimer(FlushInterval, timeProvider);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                store.Flush();
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
    }
}
