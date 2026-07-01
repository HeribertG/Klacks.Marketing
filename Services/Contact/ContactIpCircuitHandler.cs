using Microsoft.AspNetCore.Components.Server.Circuits;

namespace Klacks.Marketing.Services.Contact;

// Blazor Server clears HttpContext once the interactive circuit takes over, so the
// client IP must be captured here, while the connect request still carries it.
public sealed class ContactIpCircuitHandler(IHttpContextAccessor httpContextAccessor, ContactCircuitIpProvider ipProvider) : CircuitHandler
{
    public override Task OnCircuitOpenedAsync(Circuit circuit, CancellationToken cancellationToken)
    {
        ipProvider.ClientIp = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
        return base.OnCircuitOpenedAsync(circuit, cancellationToken);
    }
}
