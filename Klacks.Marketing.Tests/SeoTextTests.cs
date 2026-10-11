// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Klacks.Marketing.Localization.Seo;
using NUnit.Framework;
using Shouldly;

/// <summary>
/// Meta descriptions are shortened at a sentence or clause boundary; the ellipsis is only the last resort.
/// </summary>
[TestFixture]
public class SeoTextTests
{
    private const int MaxLength = SeoText.DefaultMaxLength;
    private const string Ellipsis = "…";

    [Test]
    public void Text_within_the_limit_is_returned_unchanged_apart_from_tags_and_entities()
    {
        SeoText.ToDescription("<p>Klacks &mdash; planning.</p>").ShouldBe("Klacks — planning.");
    }

    [Test]
    public void Empty_source_gives_empty_description()
    {
        SeoText.ToDescription(null).ShouldBeEmpty();
        SeoText.ToDescription("  ").ShouldBeEmpty();
    }

    [Test]
    public void Whole_sentences_that_fit_are_kept_and_the_overflowing_one_is_dropped()
    {
        const string First = "Klacks plans shifts automatically and checks the statutory rest periods for every employee.";
        const string Second = "It runs on your own server.";
        const string Third = "Open source under the AGPL, with no per-user licence fees and no lock-in whatsoever for your company.";

        var result = SeoText.ToDescription($"{First} {Second} {Third}");

        result.ShouldBe($"{First} {Second}");
        result.ShouldNotEndWith(Ellipsis);
        result.Length.ShouldBeLessThanOrEqualTo(MaxLength);
    }

    [Test]
    public void Ordinal_numbers_and_abbreviations_do_not_end_a_sentence()
    {
        const string Text = "Klacks schedules outdoor work in the legal midday ban from 15. June to 15. September, z. B. for cleaning crews and container terminals, and warns before the limit is reached.";

        var result = SeoText.ToDescription(Text);

        result.ShouldEndWith(Ellipsis);
        result.ShouldNotEndWith("15.");
        result.ShouldNotEndWith("z.");
        result.Length.ShouldBeLessThanOrEqualTo(MaxLength);
    }

    [Test]
    public void A_long_sentence_is_cut_at_its_elaboration_dash_and_closed_with_a_full_stop()
    {
        const string Head = "Klacks plans services, kitchen and housekeeping for your hotel and catering business";
        var text = $"{Head} — with split shifts, Sunday and public-holiday premiums, and a check of statutory rest periods that flags violations.";

        var result = SeoText.ToDescription(text);

        result.ShouldBe($"{Head}.");
        result.ShouldNotContain(Ellipsis);
    }

    [Test]
    public void A_parenthetical_dash_pair_is_not_cut_inside_the_aside()
    {
        const string Text = "Install Klacks on your own infrastructure: guided installer or Docker Compose stack, preconfigured with public holidays, working-time rules and – where available – local labour law defaults for your country.";

        var result = SeoText.ToDescription(Text);

        result.ShouldEndWith(Ellipsis);
        result.ShouldNotEndWith("and.");
    }

    [Test]
    public void A_single_over_long_sentence_without_a_clause_break_ends_at_a_word_with_an_ellipsis()
    {
        var text = string.Join(' ', Enumerable.Repeat("scheduling", 40));

        var result = SeoText.ToDescription(text);

        result.ShouldEndWith(Ellipsis);
        result.Length.ShouldBeLessThanOrEqualTo(MaxLength);
        result[..^1].Split(' ').ShouldAllBe(word => word == "scheduling");
    }

    [Test]
    public void Cjk_sentence_terminators_split_sentences_without_spaces()
    {
        var first = new string('甲', 90) + "。";
        var second = new string('乙', 90) + "。";

        var result = SeoText.ToDescription(first + second);

        result.ShouldBe(first);
    }
}
