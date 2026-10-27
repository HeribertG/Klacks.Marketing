// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using NUnit.Framework;
using Shouldly;

/// <summary>
/// A hover-zoomed video or screenshot must paint above the following sections. The .reveal sections and
/// .reveal-stagger children form their own stacking contexts (opacity/transform), so the enclosing context has to be
/// lifted while a zoom frame inside it is hovered; the committed stylesheet must carry that rule.
/// </summary>
[TestFixture]
public class HoverZoomStackingTests
{
    private const string LiftRevealSection = ".reveal:has(.screenshot-hover-zoom:hover)";
    private const string LiftStaggerChild = ".reveal-stagger>:has(.screenshot-hover-zoom:hover)";

    [Test]
    public void Input_stylesheet_lifts_the_reveal_context_of_a_hovered_zoom_frame()
    {
        var source = MarketingProjectPaths.ReadSource("tailwind-input.css");

        source.ShouldContain(LiftRevealSection);
        source.ShouldContain(".reveal-stagger > *:has(.screenshot-hover-zoom:hover)");
    }

    [Test]
    public void Built_stylesheet_carries_the_lift_rule()
    {
        var built = MarketingProjectPaths.ReadSource("wwwroot/css/site.css");

        built.ShouldContain(LiftRevealSection);
        built.ShouldContain(LiftStaggerChild);
    }
}
