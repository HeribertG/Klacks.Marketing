// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace Klacks.Marketing.Localization.Seo;

/// <summary>
/// Turns rich marketing copy (inline HTML tags and entities such as "&amp;mdash;") into a plain-text meta
/// description: tags removed, entities decoded, whitespace collapsed, and shortened at a sentence boundary.
/// Only when no complete sentence fits is the text cut at a word boundary and marked with an ellipsis.
/// </summary>
public static partial class SeoText
{
    public const int DefaultMaxLength = 160;

    private const int MinSentenceDescriptionLength = 70;
    private const string Ellipsis = "…";
    private const string SentenceSeparator = " ";
    private const string DotSentenceEnd = ".!?";
    private const string FullWidthSentenceEnd = "。！？";
    private const string DanglingPunctuation = ",;:–—-、，；：";
    private const string AbbreviationDot = ".";
    private const string ClauseTerminator = ".";
    private const int MinClauseLength = 30;

    private const string ElaborationDash = " — ";
    private const string ClauseSemicolon = "; ";
    private static readonly char[] DanglingPunctuationChars = DanglingPunctuation.ToCharArray();

    public static string ToDescription(string? source, int maxLength = DefaultMaxLength)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return string.Empty;
        }

        var withoutTags = TagPattern().Replace(source, " ");
        var decoded = WebUtility.HtmlDecode(withoutTags);
        var collapsed = WhitespacePattern().Replace(decoded, " ").Trim();

        if (collapsed.Length <= maxLength)
        {
            return collapsed;
        }

        return ShortenAtSentenceBoundary(collapsed, maxLength) ?? CutAtWordBoundary(collapsed, maxLength);
    }

    // Preferred: whole sentences. When they alone are too short, the next sentence is added up to its last
    // dash/semicolon. A short but complete result still beats a longer text that ends in an ellipsis.
    private static string? ShortenAtSentenceBoundary(string text, int maxLength)
    {
        var fitted = new StringBuilder();
        string? overflow = null;
        foreach (var sentence in SplitSentences(text))
        {
            var separatorLength = fitted.Length == 0 ? 0 : SentenceSeparator.Length;
            if (fitted.Length + separatorLength + sentence.Length > maxLength)
            {
                overflow = sentence;
                break;
            }

            fitted.Append(fitted.Length == 0 ? string.Empty : SentenceSeparator).Append(sentence);
        }

        if (fitted.Length >= MinSentenceDescriptionLength || overflow is null)
        {
            return fitted.Length > 0 ? fitted.ToString() : null;
        }

        var separator = fitted.Length == 0 ? string.Empty : SentenceSeparator;
        var clause = CutAtClauseBoundary(overflow, maxLength - fitted.Length - separator.Length);
        if (clause is not null)
        {
            return fitted + separator + clause;
        }

        return fitted.Length >= MinClauseLength ? fitted.ToString() : null;
    }

    // A long sentence is shortened at its elaboration dash or its last semicolon; the clause before it is a
    // complete statement, so it is closed with a full stop instead of "...". A sentence with two or more dashes
    // uses them as a parenthetical pair ("A - aside - B"), where cutting at one would leave a dangling clause.
    private static string? CutAtClauseBoundary(string sentence, int maxLength)
    {
        var window = sentence[..Math.Min(sentence.Length, Math.Max(0, maxLength))];
        var cut = window.LastIndexOf(ClauseSemicolon, StringComparison.Ordinal);
        if (CountOccurrences(sentence, ElaborationDash) == 1)
        {
            cut = Math.Max(cut, window.LastIndexOf(ElaborationDash, StringComparison.Ordinal));
        }

        if (cut < MinClauseLength)
        {
            return null;
        }

        var clause = sentence[..cut].TrimEnd().TrimEnd(DanglingPunctuationChars).TrimEnd();
        return clause.Length >= MinClauseLength && clause.Length + ClauseTerminator.Length <= maxLength
            ? clause + ClauseTerminator
            : null;
    }

    private static int CountOccurrences(string text, string value)
    {
        var count = 0;
        var index = text.IndexOf(value, StringComparison.Ordinal);
        while (index >= 0)
        {
            count++;
            index = text.IndexOf(value, index + value.Length, StringComparison.Ordinal);
        }

        return count;
    }

    private static string CutAtWordBoundary(string text, int maxLength)
    {
        var slice = text[..(maxLength - Ellipsis.Length)];
        var lastSpace = slice.LastIndexOf(' ');
        if (lastSpace > 0)
        {
            slice = slice[..lastSpace];
        }

        return slice.TrimEnd().TrimEnd(DanglingPunctuationChars).TrimEnd() + Ellipsis;
    }

    private static IEnumerable<string> SplitSentences(string text)
    {
        var start = 0;
        for (var index = 0; index < text.Length; index++)
        {
            if (!EndsSentence(text, start, index))
            {
                continue;
            }

            yield return text[start..(index + 1)].Trim();
            start = index + 1;
        }

        if (start < text.Length)
        {
            yield return text[start..].Trim();
        }
    }

    private static bool EndsSentence(string text, int sentenceStart, int index)
    {
        var current = text[index];
        if (FullWidthSentenceEnd.Contains(current))
        {
            return true;
        }

        if (!DotSentenceEnd.Contains(current))
        {
            return false;
        }

        var isLast = index == text.Length - 1;
        if (!isLast && !char.IsWhiteSpace(text[index + 1]))
        {
            return false;
        }

        return current != AbbreviationDot[0] || !IsAbbreviation(text, sentenceStart, index);
    }

    // "z. B.", "e.g.", "15. Juni": the token before the dot is a single letter, contains a dot, or is a number.
    private static bool IsAbbreviation(string text, int sentenceStart, int dotIndex)
    {
        var tokenStart = dotIndex;
        while (tokenStart > sentenceStart && !char.IsWhiteSpace(text[tokenStart - 1]))
        {
            tokenStart--;
        }

        var token = text[tokenStart..dotIndex];
        return token.Length == 1 || token.Contains(AbbreviationDot[0]) || token.All(char.IsDigit);
    }

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex TagPattern();

    [GeneratedRegex("\\s+")]
    private static partial Regex WhitespacePattern();
}
