// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Analytics;
using Microsoft.AspNetCore.Components;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// An opened Blazor circuit counts as CircuitStarted (always human) with the dimensions of its start URL; the source
/// only comes from a utm_source / ref parameter.
/// </summary>
[TestFixture]
public class VisitCircuitHandlerTests
{
    private const string TestBaseUri = "https://klacks.example/";

    private string _directory = null!;

    [SetUp]
    public void SetUp() => _directory = Path.Combine(Path.GetTempPath(), "klacks-visit-circuit-" + Guid.NewGuid().ToString("N"));

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, recursive: true);
        }
    }

    [TestCase("https://klacks.example/en/land-ch/spitex?utm_source=claude.ai", PageTypes.Industry, "ch", "en", TrafficSources.Claude)]
    [TestCase("https://klacks.example/land-de?ref=github", PageTypes.Start, "de", "de", TrafficSources.GitHub)]
    [TestCase("https://klacks.example/land-at/angebot", PageTypes.Offer, "at", "de", TrafficSources.Direct)]
    public async Task Opened_circuit_is_counted_with_its_start_url_dimensions(
        string uri, string pageType, string country, string culture, string source)
    {
        var store = new VisitCounterStore(
            Options.Create(new AnalyticsOptions { DataDirectory = _directory }),
            new TestWebHostEnvironment(),
            TimeProvider.System,
            NullLogger<VisitCounterStore>.Instance);
        var handler = new VisitCircuitHandler(store, new FixedNavigationManager(uri));

        await handler.OnCircuitOpenedAsync(null!, CancellationToken.None);

        var row = store.Snapshot(store.Today, store.Today).ShouldHaveSingleItem();
        row.Key.ShouldBe(new VisitKey(store.Today, VisitEvent.CircuitStarted, pageType, country, culture, source, VisitorClass.Human));
        row.Value.ShouldBe(1);
    }

    private sealed class FixedNavigationManager : NavigationManager
    {
        public FixedNavigationManager(string uri) => Initialize(TestBaseUri, uri);

        protected override void NavigateToCore(string uri, NavigationOptions options) => throw new NotSupportedException();
    }
}
