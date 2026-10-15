// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

/// <summary>
/// Hosts the real marketing app in memory with SimpleMode:Enabled set explicitly, so tests never depend on the
/// environment or on appsettings.json.
/// </summary>
/// <param name="simpleModeEnabled">Value of SimpleMode:Enabled</param>
internal sealed class SimpleModeAppFactory(bool simpleModeEnabled) : WebApplicationFactory<Program>
{
    private const string DevelopmentEnvironment = "Development";
    private const string EnabledKey = "SimpleMode:Enabled";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(DevelopmentEnvironment);
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
            new Dictionary<string, string?> { [EnabledKey] = simpleModeEnabled.ToString() }));
    }
}
