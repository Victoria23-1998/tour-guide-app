using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TourGuide.Api.Places;
using TourGuide.Api.Wikipedia;

namespace TourGuide.Api.Tests;

public class PlacesEndpointsTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Nearby_ReturnsPlaces()
    {
        var fake = new FakeWikipediaClient
        {
            Places = [new NearbyPlace(1, "Puerta del Sol", 40.4169, -3.7035, 25.1)],
        };
        var client = CreateClient(fake);

        var response = await client.GetAsync("/api/places/nearby?lat=40.4168&lon=-3.7038");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var places = await response.Content.ReadFromJsonAsync<List<NearbyPlace>>();
        Assert.Equal("Puerta del Sol", Assert.Single(places!).Title);
        Assert.Equal(PlacesEndpoints.DefaultRadiusMeters, fake.LastRadius);
    }

    [Theory]
    [InlineData("/api/places/nearby?lon=-3.7038", "lat")]
    [InlineData("/api/places/nearby?lat=&lon=0", "lat")]
    [InlineData("/api/places/nearby?lat=100&lon=0", "lat")]
    [InlineData("/api/places/nearby?lat=0&lon=-181", "lon")]
    [InlineData("/api/places/nearby?lat=NaN&lon=0", "lat")]
    [InlineData("/api/places/nearby?lat=0&lon=Infinity", "lon")]
    [InlineData("/api/places/nearby?lat=abc&lon=0", "lat")]
    [InlineData("/api/places/nearby?lat=0&lon=0&radius=50000", "radius")]
    [InlineData("/api/places/nearby?lat=0&lon=0&radius=5", "radius")]
    [InlineData("/api/places/nearby?lat=0&lon=0&radius=1.5", "radius")]
    [InlineData("/api/places/nearby?lat=0&lon=0&radius=99999999999", "radius")]
    public async Task Nearby_ReturnsValidationProblem_ForInvalidInput(string url, string field)
    {
        var fake = new FakeWikipediaClient();
        var client = CreateClient(fake);

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
        Assert.Null(fake.LastRadius); // Wikipedia was not called
    }

    [Fact]
    public async Task Nearby_AcceptsCustomRadius()
    {
        var fake = new FakeWikipediaClient();
        var client = CreateClient(fake);

        var response = await client.GetAsync("/api/places/nearby?lat=40.4168&lon=-3.7038&radius=300");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(300, fake.LastRadius);
    }

    [Theory]
    [InlineData("Wikipedia:BaseUrl", "")]
    [InlineData("Wikipedia:BaseUrl", "not a url")]
    [InlineData("Wikipedia:UserAgent", "")]
    public void App_DoesNotStart_WithInvalidWikipediaConfig(string key, string value)
    {
        var badFactory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?> { [key] = value })));

        Assert.Throws<OptionsValidationException>(() => badFactory.CreateClient());
    }

    [Fact]
    public async Task Nearby_ReturnsBadGateway_WhenWikipediaFails()
    {
        var client = CreateClient(new FakeWikipediaClient { Error = new HttpRequestException("boom") });

        var response = await client.GetAsync("/api/places/nearby?lat=40.4168&lon=-3.7038");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    private HttpClient CreateClient(IWikipediaClient wikipedia) =>
        factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services => services.AddSingleton(wikipedia)))
        .CreateClient();

    private class FakeWikipediaClient : IWikipediaClient
    {
        public List<NearbyPlace> Places { get; init; } = [];
        public Exception? Error { get; init; }
        public int? LastRadius { get; private set; }

        public Task<IReadOnlyList<NearbyPlace>> GetNearbyAsync(
            double lat, double lon, int radiusMeters, CancellationToken cancellationToken = default)
        {
            LastRadius = radiusMeters;
            return Error is null
                ? Task.FromResult<IReadOnlyList<NearbyPlace>>(Places)
                : Task.FromException<IReadOnlyList<NearbyPlace>>(Error);
        }
    }
}
