import json
from pathlib import Path

import httpx
import pytest
import respx

from app.geocoding import geocode, format_name, GeocodingError, LocationNotFoundError

FIXTURE = Path(__file__).parent / "fixtures" / "geocode_hamilton.json"


def load_fixture():
    return json.loads(FIXTURE.read_text())


@respx.mock
def test_geocode_returns_name_and_coordinates():
    respx.get(host="geocoding-api.open-meteo.com", path="/v1/search").mock(
        return_value=httpx.Response(200, json=load_fixture())
    )
    result = geocode("Hamilton")
    first = load_fixture()["results"][0]

    assert result["lat"] == first["latitude"]
    assert result["lng"] == first["longitude"]
    assert "Hamilton" in result["name"]


@respx.mock
def test_no_results_raises_location_not_found():
    respx.get(host="geocoding-api.open-meteo.com", path="/v1/search").mock(
        return_value=httpx.Response(200, json={})   # no "results" key, like the real API
    )
    with pytest.raises(LocationNotFoundError):
        geocode("asdfghjkl")


@respx.mock
def test_server_error_raises_geocoding_error():
    respx.get(host="geocoding-api.open-meteo.com", path="/v1/search").mock(
        return_value=httpx.Response(500)
    )
    with pytest.raises(GeocodingError):
        geocode("Hamilton")


def test_format_name_with_all_parts():
    result = {"name": "Hamilton", "admin1": "Waikato", "country": "New Zealand"}
    assert format_name(result) == "Hamilton, Waikato, New Zealand"


def test_format_name_skips_missing_region():
    result = {"name": "Monaco", "country": "Monaco"}
    assert format_name(result) == "Monaco, Monaco"