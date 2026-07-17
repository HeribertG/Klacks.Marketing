using System.Net;
using System.Text.RegularExpressions;

namespace Klacks.Marketing.Localization.Seo;

// Turns rich marketing copy (which contains inline HTML tags and entities such as
// "&mdash;") into a plain-text meta description: tags removed, entities decoded,
// whitespace collapsed, and truncated at a word boundary.
public static partial class SeoText
{
    private const int DefaultMaxLength = 160;
    private const string Ellipsis = "…";

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

        var slice = collapsed[..maxLength];
        var lastSpace = slice.LastIndexOf(' ');
        if (lastSpace > 0)
        {
            slice = slice[..lastSpace];
        }

        return slice.TrimEnd() + Ellipsis;
    }

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex TagPattern();

    [GeneratedRegex("\\s+")]
    private static partial Regex WhitespacePattern();
}
