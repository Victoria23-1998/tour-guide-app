using Microsoft.Extensions.Options;
using TourGuide.Api.Cors;
using TourGuide.Api.Places;
using TourGuide.Api.Wikipedia;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// ValidateOnStart: a bad "Wikipedia" config stops the app at startup, not on the first request.
builder.Services.AddOptions<WikipediaOptions>()
    .Bind(builder.Configuration.GetSection(WikipediaOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddFrontendCors(builder.Configuration);

builder.Services.AddHttpClient<IWikipediaClient, WikipediaClient>((services, client) =>
{
    var options = services.GetRequiredService<IOptions<WikipediaOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
    client.DefaultRequestHeaders.UserAgent.ParseAdd(options.UserAgent);
    client.Timeout = TimeSpan.FromSeconds(10);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors();

app.MapPlacesEndpoints();

app.Run();

// Lets the test project start the app with WebApplicationFactory<Program>.
public partial class Program;
