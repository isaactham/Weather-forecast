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


def search_locations(query: str, count: int = 8) -> list[dict]:
    params = {"name": query, "count": count}

    try:
        response = httpx.get(GEOCODING_URL, params=params, timeout=10)
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise GeocodingError("Geocoding service is unavailable") from error

    results = response.json().get("results", [])
    locations = []
    seen = set()

    for result in results:
        key = (result.get("name"), result.get("admin1"), result.get("country"))
        if key in seen:
            continue
        seen.add(key)
        locations.append({
            "id": result["id"],
            "name": result["name"],
            "region": result.get("admin1"),
            "country": result.get("country"),
            "countryCode": result.get("country_code"),
            "lat": result["latitude"],
            "lng": result["longitude"],
            "label": format_name(result),
        })

    return locations


def geocode(query: str) -> dict:
    locations = search_locations(query, count=1)
    if not locations:
        raise LocationNotFoundError("Location Not Found")

    location = locations[0]
    return {
        "name": location["label"],
        "lat": location["lat"],
        "lng": location["lng"],
    }
