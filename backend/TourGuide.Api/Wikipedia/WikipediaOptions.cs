namespace TourGuide.Api.Wikipedia;

public class WikipediaOptions
{
    public const string SectionName = "Wikipedia";

    public string BaseUrl { get; set; } = "https://en.wikipedia.org/w/api.php";

    // Wikimedia requires a descriptive User-Agent with contact info.
    public string UserAgent { get; set; } = "TourGuideApp/0.1";
}
