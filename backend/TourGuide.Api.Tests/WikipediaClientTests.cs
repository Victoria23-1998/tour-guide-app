using System.Globalization;
using System.Net;
using System.Text;
using TourGuide.Api.Wikipedia;

namespace TourGuide.Api.Tests;

public class WikipediaClientTests
{
    private const string GeoSearchJson = """
        {
          "batchcomplete": "",
          "query": {
            "geosearch": [
              { "pageid": 2, "ns": 0, "title": "Far Place", "lat": 40.42, "lon": -3.70, "dist": 450.5, "primary": "" },
              { "pageid": 1, "ns": 0, "title": "Puerta del Sol", "lat": 40.4169, "lon": -3.7035, "dist": 25.1, "primary": "" }
            ]
          }
        }
        """;

    private const string ErrorJson = """
        { "error": { "code": "invalid-coord", "info": "Invalid coordinate provided" } }
        """;

    [Fact]
    public async Task GetNearbyAsync_MapsFieldsAndSortsByDistance()
    {
        var client = CreateClient(GeoSearchJson, out _);

        var places = await client.GetNearbyAsync(40.4168, -3.7038, 1000);

        Assert.Equal(2, places.Count);
        Assert.Equal(1, places[0].PageId);
        Assert.Equal("Puerta del Sol", places[0].Title);
        Assert.Equal(40.4169, places[0].Lat);
        Assert.Equal(-3.7035, places[0].Lon);
        Assert.Equal(25.1, places[0].DistanceMeters);
        Assert.Equal("Far Place", places[1].Title);
    }

    [Fact]
    public async Task GetNearbyAsync_UsesDotsInCoordinates_EvenWithSpanishCulture()
    {
        var client = CreateClient(GeoSearchJson, out var handler);
        var originalCulture = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = new CultureInfo("es-ES");

        try
        {
            await client.GetNearbyAsync(40.4168, -3.7038, 500);
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
        }

        var query = Uri.UnescapeDataString(handler.LastRequestUri!.Query);
        Assert.Contains("gscoord=40.4168|-3.7038", query);
        Assert.Contains("gsradius=500", query);
    }

    [Fact]
    public async Task GetNearbyAsync_ThrowsWhenWikipediaReturnsError()
    {
        var client = CreateClient(ErrorJson, out _);

        await Assert.ThrowsAsync<HttpRequestException>(() => client.GetNearbyAsync(0, 0, 1000));
    }

    private static WikipediaClient CreateClient(string json, out StubHandler handler)
    {
        handler = new StubHandler(json);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://en.wikipedia.org/w/api.php") };
        return new WikipediaClient(httpClient);
    }

    private class StubHandler(string json) : HttpMessageHandler
    {
        public Uri? LastRequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequestUri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            });
        }
    }
}
