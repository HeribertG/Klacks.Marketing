// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// Drops the last sentence of a content text. The hero carousel shows the video note ("waiting times shortened ...")
/// right below the caption, so the caption's own closing sentence about the shortened waiting times would be said twice.
/// A sentence ends at a period (ASCII or ideographic); a text without an earlier sentence end (Thai uses no periods) is
/// returned unchanged.
/// </summary>
/// <param name="text">The caption text, may contain inline HTML entities</param>
public static class ClosingSentence
{
    private const char AsciiPeriod = '.';
    private const char IdeographicPeriod = '。';

    public static string Remove(string text)
    {
        var trimmed = text.TrimEnd();
        if (trimmed.Length == 0 || !IsSentenceEnd(trimmed[^1]))
        {
            return text;
        }

        for (var index = trimmed.Length - 2; index >= 0; index--)
        {
            if (IsSentenceEnd(trimmed[index]))
            {
                return trimmed[..(index + 1)];
            }
        }

        return text;
    }

    private static bool IsSentenceEnd(char value) => value is AsciiPeriod or IdeographicPeriod;
}
