using System.Net;
using System.Net.Mail;

namespace Klacks.Marketing.Services.Contact;

public sealed class SmtpContactMailService(IConfiguration configuration, ILogger<SmtpContactMailService> logger) : IContactMailService
{
    private const string DefaultRecipient = "info@klacks.ch";
    private const int DefaultPort = 587;

    public async Task SendAsync(ContactFormModel model, CancellationToken cancellationToken)
    {
        var host = configuration["SMTP_HOST"];
        var username = configuration["SMTP_USERNAME"];
        var password = configuration["SMTP_PASSWORD"];
        var recipient = configuration["CONTACT_RECIPIENT"];
        var port = int.TryParse(configuration["SMTP_PORT"], out var configuredPort) ? configuredPort : DefaultPort;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogError("SMTP configuration is incomplete; contact message from {Email} was not sent.", model.Email);
            throw new InvalidOperationException("Contact mail service is not configured.");
        }

        using var client = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(username, password),
            EnableSsl = true,
        };

        using var message = new MailMessage
        {
            From = new MailAddress(username, "Klacks Marketing"),
            Subject = $"Demo-Anfrage von {model.Name}",
            Body = $"Name: {model.Name}\nE-Mail: {model.Email}\n\n{model.Message}",
        };
        message.To.Add(string.IsNullOrWhiteSpace(recipient) ? DefaultRecipient : recipient);
        message.ReplyToList.Add(new MailAddress(model.Email, model.Name));

        await client.SendMailAsync(message, cancellationToken);
    }
}
