// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

/// <summary>
/// Hosts the real marketing app in memory with the visit counter writing to a temp folder (never into the source
/// tree) and a settable clock.
/// </summary>
/// <param name="dataDirectory">Temp folder for the month files</param>
/// <param name="statsToken">Configured /_stats token; null leaves it unset</param>
/// <param name="time">Clock injected as the app's TimeProvider</param>
/// <param name="enabled">Value of Analytics:Enabled</param>
internal sealed class VisitCounterAppFactory(string dataDirectory, string? statsToken, MutableTimeProvider time, bool enabled = true)
    : WebApplicationFactory<Program>
{
    private const string DevelopmentEnvironment = "Development";
    private const string DataDirectoryKey = "Analytics:DataDirectory";
    private const string StatsTokenKey = "Analytics:StatsToken";
    private const string EnabledKey = "Analytics:Enabled";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(DevelopmentEnvironment);
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                [DataDirectoryKey] = dataDirectory,
                [StatsTokenKey] = statsToken ?? string.Empty,
                [EnabledKey] = enabled.ToString(),
            }));
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(time);
        });
    }
}
