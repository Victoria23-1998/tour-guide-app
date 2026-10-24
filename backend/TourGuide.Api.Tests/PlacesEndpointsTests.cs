using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
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
    [InlineData("/api/places/nearby?lon=-3.7038")]
    [InlineData("/api/places/nearby?lat=100&lon=0")]
    [InlineData("/api/places/nearby?lat=0&lon=-181")]
    [InlineData("/api/places/nearby?lat=0&lon=0&radius=50000")]
    [InlineData("/api/places/nearby?lat=0&lon=0&radius=5")]
    public async Task Nearby_ReturnsBadRequest_ForInvalidInput(string url)
    {
        var client = CreateClient(new FakeWikipediaClient());

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
