// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using NUnit.Framework;
using Shouldly;

/// <summary>
/// Selected pills must not combine bg-primary with text-white: primary is a light colour in the dark theme, so the
/// label disappears. The selected state uses bg-secondary text-white like every other pill.
/// </summary>
[TestFixture]
public class SelectedPillContrastTests
{
    private const string UnreadableSelectedPill = "bg-primary text-white";

    [TestCase("Shared/FeatureExplorer.razor")]
    [TestCase("Shared/DemoVideoCarousel.razor")]
    public void Selected_pill_keeps_a_readable_label_in_the_dark_theme(string relativePath)
    {
        MarketingProjectPaths.ReadSource(relativePath).ShouldNotContain(UnreadableSelectedPill);
    }
}
