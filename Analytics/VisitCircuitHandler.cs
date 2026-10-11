// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Server.Circuits;
using Microsoft.AspNetCore.WebUtilities;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Counts every opened Blazor circuit as CircuitStarted. A circuit only exists when a browser executed the Blazor
/// script, so it is always recorded as human; page dimensions come from the circuit's start URL, the source only
/// from a utm_source / ref parameter in that URL (the original Referer is not available here).
/// </summary>
/// <param name="store">Aggregate that receives the count</param>
/// <param name="navigationManager">Supplies the URL the circuit started on</param>
public sealed class VisitCircuitHandler(VisitCounterStore store, NavigationManager navigationManager) : CircuitHandler
{
    public override Task OnCircuitOpenedAsync(Circuit circuit, CancellationToken cancellationToken)
    {
        if (store.IsEnabled && Uri.TryCreate(navigationManager.Uri, UriKind.Absolute, out var uri))
        {
            var query = QueryHelpers.ParseQuery(uri.Query);
            var campaign = query.TryGetValue(TrafficSourceClassifier.UtmSourceParameter, out var utmSource) && utmSource.Count > 0
                ? utmSource.ToString()
                : query.GetValueOrDefault(TrafficSourceClassifier.RefParameter).ToString();

            store.Record(
                VisitEvent.CircuitStarted,
                VisitPathClassifier.Classify(uri.AbsolutePath),
                TrafficSourceClassifier.Classify(campaign, refererHost: null, ownHost: uri.Host),
                VisitorClass.Human);
        }

        return Task.CompletedTask;
    }
}
