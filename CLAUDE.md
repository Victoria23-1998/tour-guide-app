# CLAUDE.md

This file guides Claude Code when working in this repository.

## Project

An audio tour guide PWA: the phone sends GPS coordinates, the backend finds nearby places (Wikipedia geosearch), generates a short narration with an AI model, caches it in MySQL, and the phone reads it aloud with the Web Speech API. See [README.md](README.md) for the product scope, MVP features and out-of-scope list.

## Current state

- **Backend** ([backend/](backend/)): ASP.NET Core minimal API on **.NET 10**, solution [TourGuide.slnx](backend/TourGuide.slnx).
  - `GET /api/places/nearby?lat=&lon=&radius=` returns Wikipedia geosearch results sorted by distance. Invalid input returns 400 (ValidationProblem), and a Wikipedia failure or timeout returns 502.
  - OpenAPI is served at `/openapi/v1.json` in Development.
  - Not built yet: EF Core, MySQL, CORS and the AI integration.
  - Tests live in [TourGuide.Api.Tests](backend/TourGuide.Api.Tests/) (xUnit + `WebApplicationFactory<Program>`).
- **Frontend** ([frontend/](frontend/)): Angular **22** CLI scaffold, standalone components, signals, no NgModules. [app.html](frontend/src/app/app.html) is the default placeholder page, `routes` is empty. Tailwind CSS **v4** is wired through PostCSS ([.postcssrc.json](frontend/.postcssrc.json), `@import 'tailwindcss'` in [styles.css](frontend/src/styles.css)); there is no `tailwind.config.js`. PWA support (service worker/manifest) is not added yet.

## Commands

Backend (from `backend/TourGuide.Api`):

```powershell
dotnet run                    # http://localhost:5063
dotnet run --launch-profile https   # https://localhost:7072 + http://localhost:5063
```

Backend build and tests (from `backend`):

```powershell
dotnet build TourGuide.slnx
dotnet test TourGuide.slnx
dotnet test TourGuide.slnx --filter "FullyQualifiedName~PlacesEndpointsTests"   # one test class
```

If a running `dotnet run` locks `bin/`, build somewhere else with `--artifacts-path <temp dir>`.

Frontend (from `frontend`):

```powershell
npm install
npm start          # ng serve → http://localhost:4200
npm run build      # production build (budgets: 500kB warn / 1MB error initial; 4kB/8kB per component style)
npm test           # ng test → Vitest with jsdom
npx ng test --include src/app/app.spec.ts   # single spec file
npx prettier --write .
```

## Conventions

- **Architecture rule:** the Angular app talks only to the .NET API. External services (Wikipedia, AI model) are called from the backend so API keys never reach the frontend. Generated stories are cached in MySQL, so check the cache before calling the AI.
- **Frontend:** Angular file naming without suffixes (`app.ts`, `app.html`, `app.css`, `app.spec.ts`; class `App`). Component selector prefix `app`. Prettier: 100 columns, single quotes, Angular parser for HTML. Strict TypeScript (see [tsconfig.json](frontend/tsconfig.json)). Use Tailwind utility classes for styling.
- **Backend:** nullable reference types and implicit usings are enabled. Minimal API style.
  - Group code by feature folder: endpoints go in `Places/PlacesEndpoints.cs` as a `MapXxxEndpoints()` extension that `Program.cs` calls.
  - External APIs live in their own folder (`Wikipedia/`) as an interface plus a typed `HttpClient`, with settings bound from `appsettings.json` (`WikipediaOptions`).
  - Options use DataAnnotations with `ValidateOnStart()`, so bad config stops the app at startup.
  - Endpoints bind numeric query values as `string?` and parse them in `Validate`, so malformed input gets the same 400 ValidationProblem as out-of-range input. Use `double.IsFinite` to reject `NaN`/`Infinity`.
  - Never log user coordinates. They are personal data.
  - Format numbers in URLs with `CultureInfo.InvariantCulture`. The dev machine uses the Spanish locale, which would turn decimal points into commas.
  - Wikipedia requires a descriptive `User-Agent`.
- **Backend tests:** use a fake `HttpMessageHandler` for client tests and replace the interface in DI for endpoint tests. Tests never call the real network.
- **Frontend tests:** Vitest globals (`describe`/`it`/`expect`) with Angular `TestBed`. [app.spec.ts](frontend/src/app/app.spec.ts) asserts the placeholder `<h1>` text ("Hello, frontend"), so update it when replacing the placeholder template.
- **Workflow:** one GitHub issue per feature, work on a branch, merge to `main` through small, focused pull requests.
- The repo is developed on Windows. Use PowerShell syntax in docs.
