import json
from pathlib import Path

import httpx
import respx
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
FIXTURES = Path(__file__).parent / "fixtures"


def load(name):
    return json.loads((FIXTURES / name).read_text())


def mock_geocoding(response):
    return respx.get(host="geocoding-api.open-meteo.com", path="/v1/search").mock(return_value=response)


def mock_reverse_geocoding(response):
    return respx.get(host="nominatim.openstreetmap.org", path="/reverse").mock(return_value=response)


def mock_forecast(response):
    return respx.get(host="api.open-meteo.com", path="/v1/forecast").mock(return_value=response)


@respx.mock
def test_place_name_returns_location_and_seven_days():
    mock_geocoding(httpx.Response(200, json=load("geocode_hamilton.json")))
    mock_forecast(httpx.Response(200, json=load("daily_hamilton.json")))

    response = client.get("/api/forecast", params={"q": "Hamilton"})

    assert response.status_code == 200
    body = response.json()
    assert "Hamilton" in body["location"]["name"]
    assert len(body["days"]) == 7


@respx.mock
def test_coordinates_skip_forward_geocoding():
    forward_geocoding = respx.get(
        host="geocoding-api.open-meteo.com", path="/v1/search"
    ).mock(return_value=httpx.Response(200, json={}))
    mock_reverse_geocoding(httpx.Response(200, json={"error": "Unable to geocode"}))
    mock_forecast(httpx.Response(200, json=load("daily_hamilton.json")))

    response = client.get("/api/forecast", params={"q": "-37.78, 175.28"})

    assert response.status_code == 200
    assert response.json()["location"]["lat"] == -37.78
    assert forward_geocoding.call_count == 0


@respx.mock
def test_coordinates_use_reverse_geocoded_place_name():
    mock_reverse_geocoding(httpx.Response(200, json={
        "address": {"city": "Hamilton", "state": "Waikato", "country": "New Zealand"}
    }))
    mock_forecast(httpx.Response(200, json=load("daily_hamilton.json")))

    response = client.get("/api/forecast", params={"q": "-37.787, 175.279"})

    assert response.status_code == 200
    assert response.json()["location"]["name"] == "Hamilton, Waikato, New Zealand"


@respx.mock
def test_coordinates_fall_back_to_coordinates_when_reverse_geocode_finds_nothing():
    mock_reverse_geocoding(httpx.Response(200, json={"error": "Unable to geocode"}))
    mock_forecast(httpx.Response(200, json=load("daily_hamilton.json")))

    response = client.get("/api/forecast", params={"q": "20, 90"})

    assert response.status_code == 200
    assert response.json()["location"]["name"] == "20.0, 90.0"


@respx.mock
def test_coordinates_still_return_forecast_when_reverse_geocoding_fails():
    mock_reverse_geocoding(httpx.Response(500))
    mock_forecast(httpx.Response(200, json=load("daily_hamilton.json")))

    response = client.get("/api/forecast", params={"q": "-37.78, 175.28"})

    assert response.status_code == 200
    assert response.json()["location"]["name"] == "-37.78, 175.28"


def test_empty_query_returns_400():
    response = client.get("/api/forecast", params={"q": "   "})
    assert response.status_code == 400


def test_out_of_range_coordinates_return_400():
    response = client.get("/api/forecast", params={"q": "91, 0"})
    assert response.status_code == 400


@respx.mock
def test_unknown_place_returns_404():
    mock_geocoding(httpx.Response(200, json={}))

    response = client.get("/api/forecast", params={"q": "asdfghjkl"})

    assert response.status_code == 404


@respx.mock
def test_forecast_service_down_returns_502():
    mock_geocoding(httpx.Response(200, json=load("geocode_hamilton.json")))
    mock_forecast(httpx.Response(500))

    response = client.get("/api/forecast", params={"q": "Hamilton"})

    assert response.status_code == 502


@respx.mock
def test_locations_returns_matches():
    fixture = load("geocode_hamilton_multi.json")
    mock_geocoding(httpx.Response(200, json=fixture))

    response = client.get("/api/locations", params={"q": "Hamilton"})

    assert response.status_code == 200
    assert len(response.json()) == 8
    assert response.json()[0]["label"] == "Hamilton, Ontario, Canada"


@respx.mock
def test_locations_returns_empty_list_for_no_matches():
    mock_geocoding(httpx.Response(200, json={}))

    response = client.get("/api/locations", params={"q": "asdfghjkl"})

    assert response.status_code == 200
    assert response.json() == []


def test_locations_rejects_whitespace_query():
    response = client.get("/api/locations", params={"q": "   "})

    assert response.status_code == 400
    assert response.json()["detail"] == "Please enter a place to search."


@respx.mock
def test_locations_returns_502_when_geocoding_fails():
    mock_geocoding(httpx.Response(500))

    response = client.get("/api/locations", params={"q": "Hamilton"})

    assert response.status_code == 502