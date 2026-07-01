using Microsoft.Extensions.Caching.Memory;

namespace Klacks.Marketing.Services.Contact;

public sealed class InMemoryContactRateLimiter(IMemoryCache cache)
{
    private const int MaxSubmissionsPerWindow = 3;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(10);

    public bool TryRegisterSubmission(string clientIp)
    {
        var key = $"contact-rate:{clientIp}";
        var count = cache.TryGetValue(key, out int existing) ? existing : 0;

        if (count >= MaxSubmissionsPerWindow)
        {
            return false;
        }

        cache.Set(key, count + 1, Window);
        return true;
    }
}
