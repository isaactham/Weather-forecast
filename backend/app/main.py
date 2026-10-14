#FastAPI app + /api/forecast route
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.parser import parse_query
from app.geocoding import (
    geocode,
    reverse_geocode,
    search_locations,
    GeocodingError,
    LocationNotFoundError,
)
from app.forecast import (
    fetch_current_many,
    fetch_forecast,
    build_current,
    build_days,
    WeatherServiceError,
)
from app.models import CurrentSummary, LocationOption

app = FastAPI(title="Weather App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/current", response_model=list[CurrentSummary])
def get_current(
    lat: list[float] = Query(default=[]),
    lng: list[float] = Query(default=[]),
):
    if not lat or not lng:
        raise HTTPException(status_code=400, detail="Please provide at least one latitude and longitude.")
    if len(lat) != len(lng):
        raise HTTPException(
            status_code=400,
            detail="Latitude and longitude lists must have the same number of values.",
        )
    if len(lat) > 21:
        raise HTTPException(status_code=400, detail="A maximum of 21 locations is allowed.")
    if any(value < -90 or value > 90 for value in lat):
        raise HTTPException(status_code=400, detail="Latitude values must be between -90 and 90.")
    if any(value < -180 or value > 180 for value in lng):
        raise HTTPException(status_code=400, detail="Longitude values must be between -180 and 180.")

    try:
        return fetch_current_many(list(zip(lat, lng)))
    except WeatherServiceError:
        raise HTTPException(
            status_code=502,
            detail="The weather service is unavailable right now. Please try again shortly",
        )


@app.get("/api/locations", response_model=list[LocationOption])
def get_locations(q: str = Query(..., description="A place name to search")):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Please enter a place to search.")

    try:
        # No matches are a normal search result; the frontend displays its own message.
        return search_locations(q)
    except GeocodingError:
        raise HTTPException(
            status_code=502,
            detail="The weather service is unavailable right now. Please try again shortly",
        )


#GET request comes to this address
@app.get("/api/forecast")
def get_forecast(q: str = Query(..., description="A place name or coodinates like '-37.78, 175.28'")):
    try:
        parsed = parse_query(q)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    try:
        if parsed["type"] == "coords":
            lat, lng = parsed["lat"], parsed["lng"]
            try:
                location = reverse_geocode(lat, lng)
            except GeocodingError:
                location = None
            if location is None:
                # The forecast is the important part; a missing place name shouldn't return a 502.
                location = {"name": f"{lat}, {lng}", "lat": lat, "lng": lng}
        else:
            location = geocode(parsed["query"])

        raw = fetch_forecast(location["lat"], location["lng"])

    except LocationNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Couldn't find \"{q}\". Try a city name or coordinates.",
        )
    except (GeocodingError, WeatherServiceError):
        raise HTTPException(
            status_code=502,
            detail="The weather service is unavailable right now. Please try again shortly",
        )

    return {
        "location": location,
        "current": build_current(raw),
        "days": build_days(raw),
    }