namespace TourGuide.Api.Places;

public record NearbyPlace(int PageId, string Title, double Lat, double Lon, double DistanceMeters);
