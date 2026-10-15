# Open-Meteo / Nominatim lookups

import os
from functools import lru_cache

import httpx

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
REVERSE_GEOCODING_URL = "https://nominatim.openstreetmap.org/reverse"
NOMINATIM_USER_AGENT = os.getenv(
    "NOMINATIM_USER_AGENT",
    "WeatherForecastDemo/1.0 (github.com/isaactham/Weather-forecast)",
)

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


@lru_cache(maxsize=256)
def _reverse_geocode_cached(lat: float, lng: float) -> str | None:
    # On serverless platforms like Vercel, each instance has its own cache, so
    # this helps less than on an always-on server; Redis would share it in production.
    # Nominatim asks clients to cache results and stay below one request per second;
    # repeated searches often use the same location.
    params = {
        "lat": lat,
        "lon": lng,
        "format": "jsonv2",
        "zoom": 10,
        "addressdetails": 1,
        "accept-language": "en",
    }

    try:
        # Nominatim's usage policy requires requests to identify the application.
        response = httpx.get(
            REVERSE_GEOCODING_URL,
            params=params,
            headers={"User-Agent": NOMINATIM_USER_AGENT},
            timeout=5,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise GeocodingError("Geocoding service is unavailable") from error

    try:
        data = response.json()
    except ValueError as error:
        raise GeocodingError("Geocoding service returned an invalid response") from error

    if not isinstance(data, dict) or data.get("error"):
        return None

    address = data.get("address")
    if not isinstance(address, dict):
        return None

    city = next(
        (
            address[key]
            for key in ("city", "town", "village", "suburb", "municipality", "county")
            if address.get(key)
        ),
        None,
    )
    region = address.get("state")
    country = address.get("country")
    if not any((city, region, country)):
        return None

    return format_name({"name": city, "admin1": region, "country": country})


def reverse_geocode(lat: float, lng: float) -> dict | None:
    name = _reverse_geocode_cached(round(lat, 3), round(lng, 3))
    if name is None:
        return None

    return {"name": name, "lat": lat, "lng": lng}
