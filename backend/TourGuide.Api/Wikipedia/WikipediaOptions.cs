using System.ComponentModel.DataAnnotations;

namespace TourGuide.Api.Wikipedia;

public class WikipediaOptions
{
    public const string SectionName = "Wikipedia";

    [Required, Url]
    public string BaseUrl { get; set; } = "https://en.wikipedia.org/w/api.php";

    // Wikimedia requires a descriptive User-Agent with contact info.
    [Required]
    public string UserAgent { get; set; } = "TourGuideApp/0.1 (https://github.com/Victoria23-1998/tour-guide-app)";
}
