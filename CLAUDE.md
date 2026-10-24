# CLAUDE.md

This file guides Claude Code when working in this repository.

## Project

An audio tour guide PWA: the phone sends GPS coordinates, the backend finds nearby places (Wikipedia geosearch), generates a short narration with an AI model, caches it in MySQL, and the phone reads it aloud with the Web Speech API. See [README.md](README.md) for the product scope, MVP features and out-of-scope list.

## Current state

Both apps are still the framework scaffolds. Nothing in the planned architecture is implemented yet.

- **Backend** ([backend/TourGuide.Api/](backend/TourGuide.Api/)): ASP.NET Core minimal API template on **.NET 10**. [Program.cs](backend/TourGuide.Api/Program.cs) only has the template `/weatherforecast` endpoint and OpenAPI (`/openapi/v1.json` in Development). No EF Core, MySQL, CORS, Wikipedia or AI integration yet. No `.sln` file and no test project.
- **Frontend** ([frontend/](frontend/)): Angular **22** CLI scaffold, standalone components, signals, no NgModules. [app.html](frontend/src/app/app.html) is the default placeholder page, `routes` is empty. Tailwind CSS **v4** is wired through PostCSS ([.postcssrc.json](frontend/.postcssrc.json), `@import 'tailwindcss'` in [styles.css](frontend/src/styles.css)); there is no `tailwind.config.js`. PWA support (service worker/manifest) is not added yet.

## Commands

Backend (from `backend/TourGuide.Api`):

```powershell
dotnet run                    # http://localhost:5063
dotnet run --launch-profile https   # https://localhost:7072 + http://localhost:5063
dotnet build
```

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
- **Backend:** nullable reference types and implicit usings are enabled. Minimal API style (`app.MapGet(...)`) in `Program.cs`.
- **Tests:** Vitest globals (`describe`/`it`/`expect`) with Angular `TestBed`. [app.spec.ts](frontend/src/app/app.spec.ts) asserts the placeholder `<h1>` text ("Hello, frontend"), so update it when replacing the placeholder template.
- **Workflow:** one GitHub issue per feature, work on a branch, merge to `main` through small, focused pull requests.
- The repo is developed on Windows. Use PowerShell syntax in docs.
