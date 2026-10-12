# Open-Meteo / Nominatim lookups

import httpx

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"

class GeocodingError(Exception):
    """Raised when the geocoding service can't be reached or returns an error."""

class LocationNotFoundError(Exception):
    """Raised when no place matches the search."""

def format_name(result: dict) -> str:
    """
    Build a readable name like "Hamilton, Waikato, New Zealand"
    Some results have no admin1 (region), so ski[ any missing parts.
    """

    parts = [result.get("name"), result.get("admin1"), result.get("country")]

    present = [part for part in parts if part]

    return ", ".join(present)

def geocode(query: str) -> dict:
    params = {"name": query, "count": 1}
    
    # TODO 1: call httpx.get with a timeout, raise_for_status,
    #         wrap httpx.HTTPError in GeocodingError (same as fetch_forecast)

    try:
        response = httpx.get(GEOCODING_URL, params= params, timeout= 10)
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise GeocodingError("Geocoding service is unavailable") from error

    # TODO 2: get the results list. If it's missing or empty,
    #         raise LocationNotFoundError

    data = response.json()
    results = data.get("results", [])
    if not results:
        raise LocationNotFoundError("Location Not Found")

    # TODO 3: take the first result and return {"name": ..., "lat": ..., "lng": ...}
    place = results[0]
    return {
        "name": format_name(place),
        "lat": place["latitude"],
        "lng": place["longitude"]
    }
    
