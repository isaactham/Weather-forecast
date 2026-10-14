# Weather-forecast

## Live demo

- Frontend: [<frontend URL>](<https://weather-hrbc.onrender.com>)
- Backend API: [<backend URL>](<https://weather-api-e1vm.onrender.com>)

The free API sleeps after 15 minutes of inactivity, so the first request can take about a minute while it wakes up.

## Deployment

The root [`render.yaml`](./render.yaml) is a Render Blueprint defining the Python API web service and React static site. In Render, create a Blueprint from this repository and provide these environment variables when prompted:

- `NOMINATIM_USER_AGENT` identifies this app when it requests reverse geocoding from Nominatim.
- `ALLOWED_ORIGINS` is the deployed frontend's full origin (for example, `https://weather.onrender.com`); the backend uses it for CORS.
- `VITE_API_URL` is the deployed backend's base URL (for example, `https://weather-api.onrender.com`). Vite embeds this value when it builds the static site, so changing it requires a new frontend build/deploy.
- `PYTHON_VERSION` is set to `3.13.2` in the Blueprint.

Deploy the Blueprint, note the backend URL, set that URL as `VITE_API_URL` and redeploy the static site, then set the frontend URL as `ALLOWED_ORIGINS` on the backend and redeploy the API. This order makes each service's URL available before configuring the service that depends on it.

## How to run

Start the backend first. It serves the forecast API on port 8000.

In a terminal:

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In a second terminal, configure and start the frontend:

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).
The frontend reads the backend base URL from `VITE_API_URL` in `.env`.

Run the tests in separate terminals:

```bash
cd backend
python3 -m pytest -v
```

```bash
cd web
npm test -- --run
```

## Architecture

The browser loads the React app from Vite. The app sends
`GET /api/forecast?q=<place-or-coordinates>` to FastAPI. FastAPI parses the
query, geocodes place names, reverse-geocodes coordinates for a display name,
and fetches current and daily weather from Open-Meteo. A reverse-geocoding
failure does not block the forecast; the original coordinates are used as the
location name instead. FastAPI reshapes the result into JSON and returns it to
React, where the location, hero, stat cards, temperature chart, forecast list,
and day-detail sheet display the data.

The Saved places page stores up to 20 named places and their coordinates in
browser local storage. It fetches current weather for saved places in one
`GET /api/current` request when the page is shown and the last result is at
least 10 minutes old, rather than storing weather that could become stale.
Selecting a saved-place card opens that place in Search. My location is
obtained from the browser's geolocation service and is not saved as a fixed
place.

The main frontend flow is in `web/src/App.jsx`; saved-place persistence and
coordinate-based IDs are in `web/src/utils/savedPlaces.js`; the dashboard cards
are in `web/src/components/SavedPlaces.jsx`. The backend's forecast and batch
current-weather routes are in `backend/app/main.py`.