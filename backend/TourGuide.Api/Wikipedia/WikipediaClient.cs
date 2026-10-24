using System.Globalization;
using TourGuide.Api.Places;

namespace TourGuide.Api.Wikipedia;

public class WikipediaClient(HttpClient httpClient) : IWikipediaClient
{
    private const int MaxResults = 20;

    public async Task<IReadOnlyList<NearbyPlace>> GetNearbyAsync(
        double lat, double lon, int radiusMeters, CancellationToken cancellationToken = default)
    {
        // InvariantCulture keeps "40.4168" from becoming "40,4168" on a Spanish-locale machine.
        var coord = string.Create(CultureInfo.InvariantCulture, $"{lat}|{lon}");
        var url = string.Create(
            CultureInfo.InvariantCulture,
            $"?action=query&list=geosearch&gscoord={Uri.EscapeDataString(coord)}&gsradius={radiusMeters}&gslimit={MaxResults}&format=json");

        var response = await httpClient.GetFromJsonAsync<GeoSearchResponse>(url, cancellationToken);

        if (response?.Error is { } error)
        {
            throw new HttpRequestException($"Wikipedia error '{error.Code}': {error.Info}");
        }

        return (response?.Query?.GeoSearch ?? [])
            .Select(item => new NearbyPlace(item.PageId, item.Title, item.Lat, item.Lon, item.Dist))
            .OrderBy(place => place.DistanceMeters)
            .ToList();
    }
}
