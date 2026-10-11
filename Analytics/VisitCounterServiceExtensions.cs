// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using Microsoft.AspNetCore.Components.Server.Circuits;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Wires the anonymous visit counter into the host: services, the page-request middleware and the two endpoints.
/// </summary>
public static class VisitCounterServiceExtensions
{
    public static IServiceCollection AddVisitCounter(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AnalyticsOptions>(configuration.GetSection(AnalyticsOptions.SectionName));
        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<VisitCounterStore>();
        services.AddSingleton<ClientEventRateLimiter>();
        services.AddHostedService<VisitCounterFlushService>();
        services.TryAddEnumerable(ServiceDescriptor.Scoped<CircuitHandler, VisitCircuitHandler>());

        return services;
    }

    // Must run after UseRouting so it only wraps requests that reach an endpoint; the known-page guard ahead of it
    // already short-circuits redirects and 404s.
    public static IApplicationBuilder UseVisitCounter(this IApplicationBuilder app)
        => app.UseMiddleware<PageRequestCountingMiddleware>();

    public static IEndpointRouteBuilder MapVisitCounterEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost(AnalyticsRoutes.ClientEventPath, ClientEventEndpoint.HandleAsync);
        endpoints.MapGet(AnalyticsRoutes.StatsPath, StatsEndpoint.HandleAsync);

        return endpoints;
    }
}
