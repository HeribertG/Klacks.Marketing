namespace Klacks.Marketing.Services.Contact;

public interface IContactMailService
{
    Task SendAsync(ContactFormModel model, CancellationToken cancellationToken);
}
