using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Options;

namespace TourGuide.Api.Cors;

public static class CorsExtensions
{
    // Lets the Angular app call the API from another origin (e.g. localhost:4200 → localhost:5063).
    public static IServiceCollection AddFrontendCors(
        this IServiceCollection services, IConfiguration configuration)
    {
        // ValidateOnStart: a bad "Cors" config stops the app at startup, not on the first request.
        services.AddOptions<CorsSettings>()
            .Bind(configuration.GetSection(CorsSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddCors();
        services.AddOptions<CorsOptions>()
            .Configure<IOptions<CorsSettings>>((cors, settings) =>
                cors.AddDefaultPolicy(policy => policy
                    .WithOrigins(settings.Value.AllowedOrigins)
                    .WithMethods(HttpMethods.Get)
                    .AllowAnyHeader()));

        return services;
    }
}
