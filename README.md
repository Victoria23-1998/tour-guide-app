# Tour Guide App

An audio tour guide in your pocket. The app detects where you are and tells you the history and interesting facts about the places around you, in real time, while you walk.

## The problem

Many travellers like exploring new places at their own pace, without joining a guided tour. But they still want to learn about the history and stories behind what they see. Today there's no convenient app that works like a personal tour guide, speaking to you as you move around the city.

## Target users

Independent travellers who enjoy history and curious facts, and who prefer exploring on their own instead of following a group.

## MVP features

1. Show the user's location on a map.
2. Find nearby points of interest.
3. When the user gets close to a place, show a short story about it.
4. Read the story aloud with text-to-speech.

### Out of scope for the MVP

- User accounts and favourites
- Multiple languages
- Offline mode
- Background location (requires a native app, planned with Capacitor)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular (PWA), Tailwind CSS |
| Backend | .NET Web API, C#, Entity Framework Core |
| Database | MySQL |
| Places data | Wikipedia API (geosearch) |
| Story generation | AI model API, called from the backend |
| Audio | Browser text-to-speech (Web Speech API) |
| Native app (later) | Capacitor |

## Architecture

The Angular app runs on the user's phone and only talks to our .NET API. The API calls external services and stores results in MySQL.

```
Phone (Angular PWA)  →  .NET API  →  Wikipedia API
                            │     →  AI model
                            ↓
                          MySQL (cached places and stories)
```

### Main flow

1. The phone sends its GPS coordinates to the API.
2. The API asks Wikipedia for nearby places and returns them.
3. When the user gets close to a place, the phone asks the API for its story.
4. The API checks MySQL first. If the story isn't saved yet, it gets the Wikipedia article, asks the AI model to turn it into a short tour guide narration, saves it, and returns it.
5. The phone reads the story aloud.

### Why a backend?

- **Security:** the AI API key stays on the server, never in the frontend.
- **Cost and speed:** each story is generated once and cached in MySQL.
- **Flexibility:** we can change data sources without updating the app.

## Repository structure

```
tour-guide-app/
├── backend/
│   └── TourGuide.Api/    .NET Web API
├── frontend/             Angular app
└── README.md
```

## Getting started

Requirements: .NET SDK (LTS), Node.js (LTS), Angular CLI.

```powershell
# Backend
cd backend/TourGuide.Api
dotnet run

# Frontend
cd frontend
npm install
ng serve
```

Then open http://localhost:4200.

## Development workflow

- Every feature starts as a GitHub issue.
- Work happens on a branch, and changes go into `main` through a pull request.
- Pull requests are reviewed with AI tools (Copilot, Claude Code) before merging.
- Keep pull requests small and focused on one feature.