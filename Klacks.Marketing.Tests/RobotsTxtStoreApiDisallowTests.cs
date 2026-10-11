// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Seo;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Every User-agent group in robots.txt keeps Allow: / and disallows the store API, so crawlers cannot inflate the
/// public download counter through the install-page links.
/// </summary>
[TestFixture]
public class RobotsTxtStoreApiDisallowTests
{
    private const string BaseUrl = "https://klacks.example";
    private const string UserAgentPrefix = "User-agent:";
    private const string AllowRootLine = "Allow: /";
    private const string DisallowStoreApiLine = "Disallow: /store/api/";

    [Test]
    public void Every_user_agent_group_disallows_the_store_api_and_allows_root()
    {
        var groups = ParseGroups(RobotsTxtGenerator.Build(BaseUrl));

        groups.Count.ShouldBe(AiCrawlers.UserAgents.Count + 1);
        foreach (var group in groups)
        {
            group.Lines.ShouldContain(DisallowStoreApiLine, $"group '{group.UserAgent}'");
            group.Lines.ShouldContain(AllowRootLine, $"group '{group.UserAgent}'");
        }
    }

    [Test]
    public void Wildcard_group_and_every_named_crawler_are_present()
    {
        var agents = ParseGroups(RobotsTxtGenerator.Build(BaseUrl)).Select(g => g.UserAgent).ToList();

        agents.ShouldContain("*");
        foreach (var crawler in AiCrawlers.UserAgents)
        {
            agents.ShouldContain(crawler);
        }
    }

    private static List<Group> ParseGroups(string robotsTxt)
    {
        var groups = new List<Group>();
        Group? current = null;

        foreach (var raw in robotsTxt.Split('\n'))
        {
            var line = raw.Trim();
            if (line.StartsWith(UserAgentPrefix, StringComparison.Ordinal))
            {
                current = new Group(line[UserAgentPrefix.Length..].Trim());
                groups.Add(current);
            }
            else if (line.Length == 0)
            {
                current = null;
            }
            else if (current != null)
            {
                current.Lines.Add(line);
            }
        }

        return groups;
    }

    private sealed class Group(string userAgent)
    {
        public string UserAgent { get; } = userAgent;

        public List<string> Lines { get; } = new();
    }
}
