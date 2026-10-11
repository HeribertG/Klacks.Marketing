// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

/// <summary>
/// Locates the Klacks.Marketing project folder (the first folder above the test output that contains the project file), so
/// the tests read the real sources, content files and recorded videos instead of copies.
/// </summary>
internal static class MarketingProjectPaths
{
    private const string ProjectFileName = "Klacks.Marketing.csproj";
    private const string ContentRelativePath = "Localization/Content";
    private const string WebRootFolder = "wwwroot";

    public static string ProjectRoot { get; } = FindProjectRoot();

    public static string ContentRoot => Path.Combine(ProjectRoot, ContentRelativePath);

    public static string WebRoot => Path.Combine(ProjectRoot, WebRootFolder);

    public static string ReadSource(string relativePath) => File.ReadAllText(Path.Combine(ProjectRoot, relativePath));

    private static string FindProjectRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, ProjectFileName)))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException($"'{ProjectFileName}' not found above {AppContext.BaseDirectory}.");
    }
}
