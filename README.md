# Weather Forecast

A mobile-first weather app that takes a place name, address or latitude/longitude and shows the weather for the next seven days. Built with a Python (FastAPI) backend and a React frontend, using the free [Open-Meteo](https://open-meteo.com/) API.

## Live demo

### 👉 [Open the app](https://weather-forecast-five-khaki.vercel.app)

|                        | Link                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **App**                | **[weather-forecast-five-khaki.vercel.app](https://weather-forecast-five-khaki.vercel.app)**                                 |
| API docs (interactive) | [weather-forecast-api-isaac-tham.vercel.app/docs](https://weather-forecast-api-isaac-tham.vercel.app/docs)                   |
| Health check           | [weather-forecast-api-isaac-tham.vercel.app/api/health](https://weather-forecast-api-isaac-tham.vercel.app/api/health)       |

Hosted on Vercel, where the API runs as serverless functions, so it responds quickly even after a quiet period.

### Backup deployment (Render)

If the main link is ever unavailable, the same code is also deployed on Render:

|                        | Link                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| App                    | [weather-hrbc.onrender.com](https://weather-hrbc.onrender.com)                               |
| API docs (interactive) | [weather-api-e1vm.onrender.com/docs](https://weather-api-e1vm.onrender.com/docs)             |
| Health check           | [weather-api-e1vm.onrender.com/api/health](https://weather-api-e1vm.onrender.com/api/health) |

> **Heads up:** the Render API runs on the free plan, which sleeps after 15 minutes without traffic. The first request after that can take up to a minute while it wakes up. The app shows a "Waking up the server…" message while this happens.

**Try these searches:** `Hamilton` (shows a "Did you mean…" list of every Hamilton), `Queenstown`, `-41.29, 174.78` (coordinates for Wellington), `218 Anglesea Street, Hamilton`.

**Preview every weather background:** add `?condition=` with `clear`, `cloudy`, `rain`, `snow` or `storm` to the app URL, e.g. [weather-forecast-five-khaki.vercel.app/?condition=snow](https://weather-forecast-five-khaki.vercel.app/?condition=snow).

---

## Features

**Search**

- Search by **place name, address or coordinates** (`-37.78, 175.28`, `-37.78,175.28` or `-37.78 175.28`)
- **"Did you mean…" dropdown** when a name matches several places (e.g. Hamilton in New Zealand, Canada and Scotland), fully usable with a keyboard
- **Reverse geocoding**: coordinate searches show the real place name instead of just numbers
- **Current location** on start-up using the browser's location (falls back to Hamilton if denied)

**Forecast**

- Current temperature and conditions, plus today's high, low, rain chance, wind and rainfall
- **7-day forecast** with a temperature range bar for each day
- **Temperature chart** showing the week's highs and lows
- **Day detail sheet**: tap any day for rain chance, rainfall, wind and UV index

**Saved places dashboard**

- A second page (swipe, or use the bottom tabs) listing your saved places as cards, like iOS Weather
- A **My location** card pinned at the top
- Tap **Save** on any search to add it; tap a card to open its full forecast
- Saved places are kept in the browser, so they survive a refresh

**Design**

- **Light and dark mode** with a toggle (defaults to your system setting)
- **Animated weather backgrounds** for clear, cloudy, rain, snow and storms, in day and night versions
- Accessible: keyboard navigation, screen reader labels, visible focus, good colour contrast, and animations switch off when "reduce motion" is turned on

---

## Tech stack

| Area     | Tools                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | Python, FastAPI, Pydantic, httpx                                                                                                             |
| Frontend | React, Vite, plain CSS with custom properties (no UI or chart libraries)                                                                     |
| Testing  | pytest + respx (backend), Vitest + Testing Library (frontend)                                                                                |
| Data     | [Open-Meteo](https://open-meteo.com/) forecast and geocoding APIs, [Nominatim](https://nominatim.org/) (OpenStreetMap) for reverse geocoding |
| Hosting  | [Vercel](https://vercel.com/) (main), with [Render](https://render.com/) as a backup configured by a Blueprint (`render.yaml`)                |

---

## How it works

```
Browser (React app)
   │  GET /api/forecast?q=Hamilton
   ▼
FastAPI backend
   ├─ parser.py       Is the text coordinates or a place name?
   ├─ geocoding.py    Place name  → coordinates   (Open-Meteo geocoding)
   │                  Coordinates → place name    (Nominatim reverse geocoding)
   ├─ forecast.py     Coordinates → 7-day forecast (Open-Meteo), reshaped into one object per day
   └─ main.py         Ties it together and turns errors into clear HTTP responses
   ▼
JSON back to the browser → cards, chart and background update
```

The backend sits between the app and the weather services so that:

- the frontend only ever talks to **one simple API** with a stable response shape
- the messy parts (parsing input, geocoding, reshaping data, error handling) are **written once and tested in Python**
- the weather provider could be swapped without changing the frontend

### API

| Endpoint                                       | What it does                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `GET /api/health`                              | Returns `{"status": "ok"}`                                                     |
| `GET /api/forecast?q=<place or "lat, lng">`    | Location, current weather and a 7-day forecast                                 |
| `GET /api/locations?q=<place>`                 | Up to 8 matching places, for the "Did you mean…" dropdown                      |
| `GET /api/current?lat=..&lng=..&lat=..&lng=..` | Current weather for up to 21 places in **one** request (used by the dashboard) |

**Example `/api/forecast` response (shortened):**

```json
{
  "location": {
    "name": "Hamilton, Waikato, New Zealand",
    "lat": -37.78,
    "lng": 175.28
  },
  "current": { "temperature": 15.2, "code": 61, "summary": "Slight rain" },
  "days": [
    {
      "date": "2026-10-16",
      "tempMax": 17.2,
      "tempMin": 8.1,
      "precipMm": 3.2,
      "precipChance": 70,
      "windMax": 22.0,
      "uvMax": 2.4,
      "code": 61,
      "summary": "Slight rain"
    }
  ]
}
```

**Errors** come back as `{"detail": "message"}`:

| Status | When                                                     |
| ------ | -------------------------------------------------------- |
| 400    | Empty search, or coordinates out of range (e.g. `91, 0`) |
| 404    | No place matches the search                              |
| 502    | A weather or geocoding service is down or timed out      |

---

## Project structure

```
Weather-forecast/
├── backend/
│   ├── app/
│   │   ├── main.py            API routes, CORS and error handling
│   │   ├── parser.py          Coordinates vs place-name detection
│   │   ├── geocoding.py       Forward and reverse geocoding
│   │   ├── forecast.py        Open-Meteo calls and data reshaping
│   │   ├── weather_codes.py   WMO weather code → readable description
│   │   └── models.py          Pydantic response models (the API contract)
│   ├── tests/                 pytest tests, with saved API responses in tests/fixtures/
│   ├── requirements.txt
│   └── .env.example
├── web/                       React + Vite frontend
│   ├── src/
│   │   ├── api.js             All calls to the backend
│   │   ├── components/        Search, hero, chart, forecast list, detail sheet, dashboard…
│   │   ├── utils/             Formatting, weather conditions, saved places, chart maths
│   │   └── __tests__/
│   └── .env.example
├── render.yaml                Backup deployment configuration (Render Blueprint)
├── DECISIONS.md               Design and technical decisions, with reasons
└── README.md
```

---

## Running it locally

**You'll need:** Python 3.11+ (built with 3.13) and Node.js 20+.

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # optional, defaults work for local use
uvicorn app.main:app --reload
```

The API runs at http://127.0.0.1:8000, with interactive docs at http://127.0.0.1:8000/docs.

### 2. Frontend (in a second terminal)

```bash
cd web
npm install
cp .env.example .env               # sets VITE_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5173.

The frontend must run on port **5173**, because that's the address the backend allows by default (CORS).

### Environment variables

| Variable               | Where   | Purpose                                                       | Default                  |
| ---------------------- | ------- | ------------------------------------------------------------- | ------------------------ |
| `ALLOWED_ORIGINS`      | backend | Comma-separated list of sites allowed to call the API         | `http://localhost:5173`  |
| `NOMINATIM_USER_AGENT` | backend | Identifies the app to Nominatim, as its usage policy requires | A generic app identifier |
| `VITE_API_URL`         | web     | Where the frontend finds the API (set at **build** time)      | `http://localhost:8000`  |

---

## Testing

```bash
# Backend
cd backend && python3 -m pytest -v

# Frontend
cd web && npm test
```

**What's covered:**

- **Input parsing:** valid coordinates in several formats, place names, postcodes, out-of-range values and empty input
- **Data reshaping:** Open-Meteo's lists are correctly turned into one object per day
- **External APIs:** success, "no results", server errors and timeouts, all mocked with `respx` so tests never hit the real services
- **Request correctness:** checks the exact parameters sent to Open-Meteo (this caught a real bug where fields were joined with `.` instead of `,`)
- **API routes:** one test per status code (200, 400, 404, 502)
- **Frontend:** API client error handling, search and dropdown behaviour, saved places, the dashboard, theme toggle and weather backgrounds, with `fetch` mocked

---

## Deployment

The same code is deployed to two hosts. Settings such as allowed origins and the API URL come only from environment variables, so no URLs are hard-coded, and that's what makes two hosts possible without code changes. Every push to `main` redeploys both.

### Vercel (main)

Two Vercel projects are created from this one repository:

- **weather-forecast-api**: Root Directory `backend`. Vercel detects the FastAPI `app` in `app/main.py` and runs it as serverless functions. Needs `ALLOWED_ORIGINS` and `NOMINATIM_USER_AGENT`.
- **weather-forecast**: Root Directory `web`, built with Vite. Needs `VITE_API_URL` set to the API's URL (no trailing slash).

Deployment Protection is turned off for both projects, since the app and API are meant to be public.

### Render (backup)

Deployed on Render's free plan using a **Blueprint** (`render.yaml`), so the hosting setup is version-controlled alongside the code:

- **weather-api**: a Python web service (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`), with a health check on `/api/health`
- **weather**: a static site built from `web/` with `npm run build`

### Trade-offs

- **Render** runs the API as an always-on server, but the free plan sleeps when idle, so the first request can take up to a minute.
- **Vercel** runs the API as serverless functions, which wake much faster. The trade-off is that in-memory caches (like the reverse-geocoding cache) aren't shared between instances, so a shared cache such as Redis would be the production fix.
- For production I'd consider AWS (for example App Runner or Elastic Beanstalk) or a paid instance, in a region closer to New Zealand.

---

## Key decisions

The full list, with reasons, is in [DECISIONS.md](DECISIONS.md). Some highlights:

- **One small module per job** (parsing, geocoding, forecast, weather codes), so each part is easy to test on its own
- **The parser only classifies input.** Whether a place actually exists is the geocoder's job
- **Two kinds of geocoding error:** "not found" (404, the user can fix their search) and "service down" (502, try again later)
- **Reverse geocoding fails gracefully:** if no place name is found (e.g. coordinates in the ocean), the forecast still loads and shows the coordinates instead
- **One request for the whole dashboard:** Open-Meteo accepts several coordinates at once, so all saved places are fetched together
- **Saved places store only a name and coordinates.** Weather is always fetched fresh, so it's never stale
- **All colours are CSS variables** with light and dark sets, so the theme toggle only changes one attribute
- **Animations use only `transform` and `opacity`** so they stay smooth on phones, and they turn off with "reduce motion"

---

## How I used AI

I used AI tools throughout, and treated their output as a starting point rather than a final answer:

- **Claude** for planning the scope, explaining concepts as I learned them (e.g. reshaping parallel lists, mocking HTTP calls, reverse geocoding), reviewing my code, and creating design mockups
- **GitHub Copilot (agent mode)** for implementing the frontend in small, reviewed phases from my own design and API contract

I wrote the core input-parsing logic myself, and worked through the backend modules step by step so I could explain every line. Every change was reviewed, tested by hand and covered by automated tests before committing. A manual end-to-end check is also how I found the reverse-geocoding bug, which the unit tests had missed.

---

## Known limitations and next steps

- **Saved places live in one browser.** User accounts and a database would let them sync across devices
- **Cold starts** on Render's free plan, and caches not shared between serverless instances on Vercel (see Deployment)
- **Hourly forecasts** for the detail sheet
- **Caching forecast responses** for a few minutes to reduce calls to Open-Meteo
- **Reverse geocoding and the forecast run one after the other.** Running them at the same time would make coordinate searches faster
- **Native mobile app:** the API is ready for a React Native client without changes

---

## Data and credits

- Weather data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0)
- Place search by Open-Meteo's geocoding API, based on [GeoNames](https://www.geonames.org/)
- Reverse geocoding by [Nominatim](https://nominatim.org/), data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

Built by [Isaac Tham](https://github.com/isaactham) as part of the MEA Mobile summer internship process.
