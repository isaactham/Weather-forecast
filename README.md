# Weather-forecast

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
query, geocodes place names, and fetches current and daily weather from
Open-Meteo. Coordinate searches skip geocoding because the parser already
recognizes coordinates. FastAPI reshapes the result into JSON and returns it
to React, where the location, hero, stat cards, temperature chart, forecast
list, and day-detail sheet display the data.