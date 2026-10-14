Parser

- Parser only classifies input; checking if a place is real is the geocoder's job
- Catch ValueError only (not bare except) so real bugs aren't hidden as "place"
- Range check written as not (-90 <= lat <= 90) so "nan" is rejected
- Range check kept outside try/except so the out-of-range error isn't swallowed

Weather codes:

- “Open-Meteo returns WMO weather codes as numbers, so I map them to readable labels with a dictionary. I used .get() with a default so an unexpected code shows ‘Unknown’ instead of crashing the whole forecast.”

## Forecast reshaping (forecast.py → build_days)

- Reshape Open-Meteo's parallel daily lists into one object per day. The frontend
  draws one card per day, so this shape is what it actually needs.
- Reshaping happens in the backend, not the frontend. The UI depends on my own
  format instead of Open-Meteo's, so switching weather provider would only
  change build_days.
- build_days is a pure function (data in, data out, no network calls). This keeps
  it fast and easy to test without the internet.
- Fetching from Open-Meteo is a separate function from reshaping. Logic and network
  calls are kept apart so each can be tested on its own.
- Tests use a saved real response (tests/fixtures/forecast_hamilton.json) instead
  of calling the live API, so they're fast and don't change when the weather does.
- Tests compare output against the raw fixture lists instead of hard-coded numbers,
  so they still pass if the fixture is re-downloaded on another day.
- Response keys use camelCase (tempMax, precipChance) because the frontend is
  JavaScript, where camelCase is the convention.
- Missing values (e.g. precipitation_probability_max can be null) are passed through
  as None instead of crashing. The UI can show "–" for that day.
- summary is filled in with describe() so the frontend gets readable text and
  doesn't need its own copy of the weather code table.

### Fetch_forecast

- fetch_forecast wraps all httpx errors in my own WeatherServiceError, so the route
  only handles one error type and doesn't depend on httpx details.
- 10 second timeout so a slow Open-Meteo can't hang the request forever.
- raise_for_status() so 4xx/5xx responses are treated as errors, not silently used.
- Settings (URL, daily fields) kept as constants at the top for easy changes.
- Network calls mocked with respx in tests: fast, reliable, and lets me test
  failure cases (500, timeout) that are hard to trigger for real.
- Used synchronous httpx for simplicity. Async would scale better under heavy
  load and is a possible improvement.

## API route (main.py)

- One endpoint, GET /api/forecast?q=..., so the frontend only needs one call.
- Errors mapped to status codes: 400 bad input, 404 place not found,
  502 upstream service down. The frontend can show a specific message for each.
- Parsing has its own try block so only parser ValueErrors become 400s.
- Reverse geocoding uses Nominatim because Open-Meteo has no reverse lookup.
- Results are cached by rounded coordinates and requests send an identifying
  User-Agent, as Nominatim's usage policy requires.
- Reverse geocoding failure falls back to showing coordinates instead of failing
  the request, because the forecast matters more than the label.
- The original coordinates are kept, not Nominatim's snapped point, so the
  forecast is for exactly where the user asked.
- CORS allows only the local frontend origin and GET requests (least access needed).
- Route tests use FastAPI's TestClient with both APIs mocked by respx, covering
  each status code.

## Frontend behavior

- `--emphasis` is a semantic token so orange stays limited to the four priority values in dark mode.
- The sticky hero reads progress from one rAF-coalesced scroll callback through a CSS variable, avoiding per-scroll UI rerenders.
- A themed content panel slides over the sticky hero while the higher-z-index sheet remains available above it.
- The theme switch renders only its active icon, and ISO dates are parsed at local midnight to prevent date drift.

## Animated weather backgrounds

- One pure WMO mapper handles current and daily forecast codes so weather scenes share a single condition map.
- Particle positions are deterministic and cached once so scenes remain stable and tests are reproducible.
- Scene motion uses transform and opacity; reduced-motion mode freezes visible particles and suppresses lightning.
- The `?condition=` override makes every weather scene demoable without changing the forecast data.

## React API integration

- The API base URL comes from `VITE_API_URL`, so deployment can change the service URL without a code change.
- `fetch()` does not reject on HTTP 4xx/5xx responses, so `api.js` checks `response.ok` and surfaces the backend's `detail` message.
- `AbortController` cancels stale requests so a slower earlier search cannot overwrite a newer search.
- One `status` value (`idle`, `loading`, `success`, or `error`) represents request state instead of separate booleans, preventing contradictory states.
- The previous successful forecast stays visible while another search is loading or after it fails, so the screen does not go blank.
- Current-location searches send coordinates to the same forecast endpoint because the backend parser already accepts coordinates.
- CORS is restricted to the local frontend origins; a Vite development proxy was considered as an alternative.
- Local calendar dates are parsed with a local midnight rather than UTC so they do not shift to the previous or next day across time zones.

## Location disambiguation

- A separate `/api/locations` endpoint lets the search UI show choices, while `/api/forecast` stays simple and unchanged.
- No matches return HTTP 200 with an empty list because nothing found is a normal search result, not an error.
- The chosen place is loaded by coordinates so the user gets exactly the place they picked, not the top match again.
- The option's label is kept for display because a coordinates lookup has no place name.
- Single matches skip the dropdown so the common case stays one step.
- The dropdown follows the ARIA combobox pattern so it works with a keyboard and screen readers.

## Saved places dashboard

- Save place names and coordinates in browser local storage, but fetch weather again when the Saved page is shown so stored forecasts do not go stale.
- Request current weather for saved places through one batch endpoint instead of making one request per card.
- Identify duplicate saved places by coordinates rounded to three decimals, and cap the saved list at 20 places to keep the dashboard manageable.
- Do not persist My location as a fixed saved place; request the device's current coordinates for the current session.
- Open a saved card in Search using its saved label, so the dashboard choice remains recognizable even when the forecast request uses coordinates.
- Keep Saved and Search as horizontal pages with URL hashes and browser history, so page navigation works with back/forward controls and direct links.
