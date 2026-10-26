using System.ComponentModel.DataAnnotations;

namespace TourGuide.Api.Cors;

// Named CorsSettings, not CorsOptions, to avoid a clash with ASP.NET Core's own CorsOptions.
public class CorsSettings : IValidatableObject
{
    public const string SectionName = "Cors";

    // Origins of the frontend, e.g. "http://localhost:4200".
    [Required, MinLength(1)]
    public string[] AllowedOrigins { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var origin in AllowedOrigins)
        {
            if (!IsValidOrigin(origin))
            {
                yield return new ValidationResult(
                    $"'{origin}' is not a valid origin. Use scheme, host and optional port only, " +
                    "with no path or trailing slash, e.g. 'http://localhost:4200'.",
                    [nameof(AllowedOrigins)]);
            }
        }
    }

    // The browser's Origin header is scheme://host[:port] with no trailing slash,
    // so anything else would never match and CORS would fail silently.
    private static bool IsValidOrigin(string origin) =>
        Uri.TryCreate(origin, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
        && origin == uri.GetLeftPart(UriPartial.Authority);
}
