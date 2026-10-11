// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;

/// <summary>
/// Web host environment rooted in the real Klacks.Marketing project, so the content provider, the screenshot resolver
/// and the video catalog read the real content files and recordings.
/// </summary>
internal sealed class TestWebHostEnvironment : IWebHostEnvironment
{
    private const string TestEnvironmentName = "Test";
    private const string MarketingApplicationName = "Klacks.Marketing";

    public TestWebHostEnvironment()
    {
        ContentRootPath = MarketingProjectPaths.ProjectRoot;
        WebRootPath = MarketingProjectPaths.WebRoot;
        ContentRootFileProvider = new PhysicalFileProvider(ContentRootPath);
        WebRootFileProvider = new PhysicalFileProvider(WebRootPath);
    }

    public string WebRootPath { get; set; }

    public IFileProvider WebRootFileProvider { get; set; }

    public string ApplicationName { get; set; } = MarketingApplicationName;

    public IFileProvider ContentRootFileProvider { get; set; }

    public string ContentRootPath { get; set; }

    public string EnvironmentName { get; set; } = TestEnvironmentName;
}
