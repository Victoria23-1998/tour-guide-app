using System.ComponentModel.DataAnnotations;
using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TourGuide.Api.Cors;
using TourGuide.Api.Places;
using TourGuide.Api.Wikipedia;

namespace TourGuide.Api.Tests;

public class CorsTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private const string FrontendOrigin = "http://localhost:4200";
    private const string NearbyUrl = "/api/places/nearby?lat=40.4168&lon=-3.7038";

    [Fact]
    public async Task Get_FromFrontendOrigin_ReturnsAllowOriginHeader()
    {
        var response = await SendAsync(HttpMethod.Get, FrontendOrigin);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(FrontendOrigin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
    }

    [Fact]
    public async Task Get_FromOtherOrigin_HasNoCorsHeaders()
    {
        var response = await SendAsync(HttpMethod.Get, "https://evil.example");

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Preflight_FromFrontendOrigin_AllowsGet()
    {
        var response = await SendAsync(HttpMethod.Options, FrontendOrigin, requestMethod: "GET");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(FrontendOrigin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        Assert.Contains("GET", response.Headers.GetValues("Access-Control-Allow-Methods"));
    }

    [Fact]
    public async Task Preflight_ForPost_IsNotAllowed()
    {
        var response = await SendAsync(HttpMethod.Options, FrontendOrigin, requestMethod: "POST");

        // The browser blocks the request because POST is not in the allowed methods.
        var allowed = response.Headers.TryGetValues("Access-Control-Allow-Methods", out var methods)
            ? string.Join(",", methods)
            : "";
        Assert.DoesNotContain("POST", allowed);
    }

    [Theory]
    [InlineData("http://localhost:4200/")]
    [InlineData("http://localhost:4200/app")]
    [InlineData("localhost:4200")]
    [InlineData("ftp://localhost:4200")]
    [InlineData("")]
    public void App_DoesNotStart_WithInvalidOrigin(string origin)
    {
        var badFactory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Cors:AllowedOrigins:0"] = origin,
                })));

        Assert.Throws<OptionsValidationException>(() => badFactory.CreateClient());
    }

    [Fact]
    public void Settings_WithNoOrigins_AreInvalid()
    {
        // An empty array can't be expressed by overriding configuration, so validate directly.
        var settings = new CorsSettings { AllowedOrigins = [] };

        var valid = Validator.TryValidateObject(
            settings, new ValidationContext(settings), [], validateAllProperties: true);

        Assert.False(valid);
    }

    private async Task<HttpResponseMessage> SendAsync(
        HttpMethod method, string origin, string? requestMethod = null)
    {
        var client = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
                services.AddSingleton<IWikipediaClient>(new EmptyWikipediaClient())))
            .CreateClient();

        var request = new HttpRequestMessage(method, NearbyUrl);
        request.Headers.Add("Origin", origin);
        if (requestMethod is not null)
        {
            request.Headers.Add("Access-Control-Request-Method", requestMethod);
        }
        return await client.SendAsync(request);
    }

    private class EmptyWikipediaClient : IWikipediaClient
    {
        public Task<IReadOnlyList<NearbyPlace>> GetNearbyAsync(
            double lat, double lon, int radiusMeters, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<NearbyPlace>>([]);
    }
}
