// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// Splits a content text into its first sentence and the remainder, so a page can show the lead sentence and fold
/// the rest away (preview start page: solution cards with a details element). A sentence ends at a period that is
/// followed by a space and an upper-case letter; periods after a digit ("25. Nacht") or after a single-letter
/// abbreviation ("z. B.") do not end a sentence.
/// </summary>
/// <param name="text">The content text, may contain inline HTML entities but no tags spanning the split point</param>
public static class LeadSentence
{
    private const char Period = '.';
    private const char Space = ' ';

    public static (string Lead, string Remainder) Split(string text)
    {
        for (var index = 1; index < text.Length - 2; index++)
        {
            if (text[index] != Period || text[index + 1] != Space || !char.IsUpper(text[index + 2]))
            {
                continue;
            }

            if (char.IsDigit(text[index - 1]) || IsSingleLetterAbbreviation(text, index))
            {
                continue;
            }

            return (text[..(index + 1)], text[(index + 2)..]);
        }

        return (text, string.Empty);
    }

    private static bool IsSingleLetterAbbreviation(string text, int periodIndex)
        => char.IsLetter(text[periodIndex - 1]) && (periodIndex == 1 || text[periodIndex - 2] == Space);
}
