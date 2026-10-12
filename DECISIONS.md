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