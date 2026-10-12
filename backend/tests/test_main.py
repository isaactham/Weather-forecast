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
def test_coordinates_skip_geocoding():
    mock_forecast(httpx.Response(200, json=load("daily_hamilton.json")))
    # no geocoding mock: if the route tried to geocode, respx would fail the test

    response = client.get("/api/forecast", params={"q": "-37.78, 175.28"})

    assert response.status_code == 200
    assert response.json()["location"]["lat"] == -37.78


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