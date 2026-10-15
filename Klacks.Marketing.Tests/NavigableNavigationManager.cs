// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Microsoft.AspNetCore.Components;

/// <summary>
/// Navigation manager for component tests that really moves to the new URI and raises LocationChanged, like an
/// in-circuit navigation of Blazor Server.
/// </summary>
/// <param name="baseUrl">Base URI with trailing slash</param>
/// <param name="path">Initial path relative to the base URI</param>
internal sealed class NavigableNavigationManager : NavigationManager
{
    public NavigableNavigationManager(string baseUrl, string path)
    {
        Initialize(baseUrl, baseUrl + path);
    }

    protected override void NavigateToCore(string uri, bool forceLoad)
    {
        Uri = ToAbsoluteUri(uri).ToString();
        NotifyLocationChanged(isInterceptedLink: false);
    }
}
