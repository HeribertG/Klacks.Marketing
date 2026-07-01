using System.ComponentModel.DataAnnotations;

namespace Klacks.Marketing.Services.Contact;

public sealed class ContactFormModel
{
    [Required(ErrorMessage = "Bitte geben Sie Ihren Namen an.")]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Bitte geben Sie Ihre E-Mail-Adresse an.")]
    [EmailAddress(ErrorMessage = "Bitte geben Sie eine gültige E-Mail-Adresse an.")]
    [StringLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Bitte geben Sie eine Nachricht ein.")]
    [StringLength(4000)]
    public string Message { get; set; } = string.Empty;

    // Honeypot: hidden from real users, bots tend to fill every field. Must stay empty.
    [StringLength(200)]
    public string CompanyWebsite { get; set; } = string.Empty;
}
