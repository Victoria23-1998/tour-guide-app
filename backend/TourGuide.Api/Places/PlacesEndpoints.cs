using System.Globalization;
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

    // Query values are bound as strings and parsed in Validate, so malformed numbers
    // ("abc", "1.5" for radius) get the same ValidationProblem response as out-of-range ones.
    private static async Task<IResult> GetNearbyAsync(
        string? lat,
        string? lon,
        string? radius,
        IWikipediaClient wikipedia,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger(typeof(PlacesEndpoints));

        var errors = Validate(lat, lon, radius, out var query);
        if (query is null)
        {
            return Results.ValidationProblem(errors);
        }

        try
        {
            var places = await wikipedia.GetNearbyAsync(query.Lat, query.Lon, query.RadiusMeters, cancellationToken);
            return Results.Ok(places);
        }
        // TaskCanceledException is the HttpClient timeout, unless the caller cancelled the request.
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException
                                   && !cancellationToken.IsCancellationRequested)
        {
            // Don't log lat/lon: they are the user's exact location (personal data).
            logger.LogError(ex, "Wikipedia geosearch failed");
            return Results.Problem(
                statusCode: StatusCodes.Status502BadGateway,
                title: "Wikipedia is not available",
                detail: "Could not get nearby places right now. Please try again later.");
        }
    }

    public record NearbyQuery(double Lat, double Lon, int RadiusMeters);

    /// <summary>
    /// Parses and checks the raw query values. Returns the errors per field;
    /// <paramref name="query"/> is set only when there are no errors.
    /// </summary>
    public static Dictionary<string, string[]> Validate(
        string? lat, string? lon, string? radius, out NearbyQuery? query)
    {
        var errors = new Dictionary<string, string[]>();

        var latValue = ParseCoordinate("lat", lat, 90, errors);
        var lonValue = ParseCoordinate("lon", lon, 180, errors);

        var radiusMeters = DefaultRadiusMeters;
        if (!string.IsNullOrWhiteSpace(radius)
            && (!int.TryParse(radius, NumberStyles.Integer, CultureInfo.InvariantCulture, out radiusMeters)
                || radiusMeters is < MinRadiusMeters or > MaxRadiusMeters))
        {
            errors["radius"] = [$"radius must be a whole number between {MinRadiusMeters} and {MaxRadiusMeters} meters."];
        }

        query = errors.Count == 0 ? new NearbyQuery(latValue, lonValue, radiusMeters) : null;
        return errors;
    }

    private static double ParseCoordinate(
        string name, string? value, double limit, Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[name] = [$"{name} is required."];
            return 0;
        }

        // IsFinite rejects "NaN" and "Infinity", which TryParse accepts and range checks don't catch.
        if (!double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var result)
            || !double.IsFinite(result)
            || result < -limit || result > limit)
        {
            errors[name] = [$"{name} must be a number between -{limit} and {limit}."];
            return 0;
        }

        return result;
    }
}
