// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

using System.Security.Cryptography;
using System.Text;

namespace Klacks.Marketing.Analytics;

/// <summary>
/// Constant-time comparison of the /_stats token. Both values are hashed first, so a length mismatch does not
/// short-circuit the comparison either.
/// </summary>
public static class StatsTokenComparer
{
    public static bool Matches(string expected, string? provided)
    {
        if (string.IsNullOrEmpty(provided))
        {
            return false;
        }

        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        var providedHash = SHA256.HashData(Encoding.UTF8.GetBytes(provided));

        return CryptographicOperations.FixedTimeEquals(expectedHash, providedHash);
    }
}
