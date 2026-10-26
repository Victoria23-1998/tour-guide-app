using System.Text.Json;
using TourGuide.Api.Wikipedia;

namespace TourGuide.Api.Places;

public static class PlacesEndpoints
{
    public const int DefaultRadiusMeters = 1000;
    public const int MinRadiusMeters = 10;
    public const int MaxRadiusMeters = 10000; // Wikipedia geosearch limit

    public static IEndpointRouteBuilder MapPlacesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/places");

        group.MapGet("/nearby", GetNearbyAsync).WithName("GetNearbyPlaces");

        return app;
    }

    private static async Task<IResult> GetNearbyAsync(
        double? lat,
        double? lon,
        int? radius,
        IWikipediaClient wikipedia,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger(typeof(PlacesEndpoints));

        var radiusMeters = radius ?? DefaultRadiusMeters;
        var errors = Validate(lat, lon, radiusMeters);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        try
        {
            var places = await wikipedia.GetNearbyAsync(lat!.Value, lon!.Value, radiusMeters, cancellationToken);
            return Results.Ok(places);
        }
        // TaskCanceledException is the HttpClient timeout, unless the caller cancelled the request.
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException
                                   && !cancellationToken.IsCancellationRequested)
        {
            logger.LogError(ex, "Wikipedia geosearch failed for {Lat},{Lon}", lat, lon);
            return Results.Problem(
                statusCode: StatusCodes.Status502BadGateway,
                title: "Wikipedia is not available",
                detail: "Could not get nearby places right now. Please try again later.");
        }
    }

    public static Dictionary<string, string[]> Validate(double? lat, double? lon, int radiusMeters)
    {
        var errors = new Dictionary<string, string[]>();

        if (lat is null)
        {
            errors["lat"] = ["lat is required."];
        }
        else if (lat is < -90 or > 90)
        {
            errors["lat"] = ["lat must be between -90 and 90."];
        }

        if (lon is null)
        {
            errors["lon"] = ["lon is required."];
        }
        else if (lon is < -180 or > 180)
        {
            errors["lon"] = ["lon must be between -180 and 180."];
        }

        if (radiusMeters is < MinRadiusMeters or > MaxRadiusMeters)
        {
            errors["radius"] = [$"radius must be between {MinRadiusMeters} and {MaxRadiusMeters} meters."];
        }

        return errors;
    }
}
