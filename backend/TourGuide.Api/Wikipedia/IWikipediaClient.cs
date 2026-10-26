using TourGuide.Api.Places;

namespace TourGuide.Api.Wikipedia;

public interface IWikipediaClient
{
    Task<IReadOnlyList<NearbyPlace>> GetNearbyAsync(
        double lat, double lon, int radiusMeters, CancellationToken cancellationToken = default);
}
