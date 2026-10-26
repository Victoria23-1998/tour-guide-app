using System.Text.Json.Serialization;

namespace TourGuide.Api.Wikipedia;

// Shape of https://en.wikipedia.org/w/api.php?action=query&list=geosearch&format=json
public record GeoSearchResponse(
    [property: JsonPropertyName("query")] GeoSearchQuery? Query,
    [property: JsonPropertyName("error")] WikipediaError? Error);

public record GeoSearchQuery(
    [property: JsonPropertyName("geosearch")] List<GeoSearchItem> GeoSearch);

public record GeoSearchItem(
    [property: JsonPropertyName("pageid")] int PageId,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("lat")] double Lat,
    [property: JsonPropertyName("lon")] double Lon,
    [property: JsonPropertyName("dist")] double Dist);

public record WikipediaError(
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("info")] string Info);
