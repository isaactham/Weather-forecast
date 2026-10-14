import json
import httpx
import pytest
import respx

from app.forecast import fetch_current_many, fetch_forecast, WeatherServiceError

from pathlib import Path
# Checks
###Checks
# 7 days come out. No days lost or added
# Day 1 has the right values. It's compared against the raw lists
# A summary is filled in. This proves describe() can being used


from app.forecast import build_days

FIXTURE = Path(__file__).parent / "fixtures" / "daily_hamilton.json"


def load_fixture():
    return json.loads(FIXTURE.read_text())


def test_returns_seven_days():
    days = build_days(load_fixture())
    assert len(days) == 7


def test_first_day_matches_raw_data():
    raw = load_fixture()
    daily = raw["daily"]
    first = build_days(raw)[0]

    assert first["date"] == daily["time"][0]
    assert first["tempMax"] == daily["temperature_2m_max"][0]
    assert first["tempMin"] == daily["temperature_2m_min"][0]
    assert first["code"] == daily["weather_code"][0]


def test_summary_uses_weather_description():
    first = build_days(load_fixture())[0]
    assert isinstance(first["summary"], str)
    assert first["summary"] != ""

@respx.mock
def test_fetch_forecast_returns_json():
    respx.get(host="api.open-meteo.com", path="/v1/forecast").mock(
        return_value=httpx.Response(200, json=load_fixture())
    )
    raw = fetch_forecast(-37.78, 175.28)
    assert "daily" in raw


@respx.mock
def test_server_error_raises_weather_service_error():
    respx.get(host="api.open-meteo.com", path="/v1/forecast").mock(
        return_value=httpx.Response(500)
    )
    with pytest.raises(WeatherServiceError):
        fetch_forecast(-37.78, 175.28)


@respx.mock
def test_timeout_raises_weather_service_error():
    respx.get(host="api.open-meteo.com", path="/v1/forecast").mock(
        side_effect=httpx.ConnectTimeout
    )
    with pytest.raises(WeatherServiceError):
        fetch_forecast(-37.78, 175.28)


def current_result(temperature, code, temp_max, temp_min):
    return {
        "current": {"temperature_2m": temperature, "weather_code": code},
        "daily": {"temperature_2m_max": [temp_max], "temperature_2m_min": [temp_min]},
    }


@respx.mock
def test_fetch_current_many_returns_results_in_input_order():
    route = respx.get(host="api.open-meteo.com", path="/v1/forecast").mock(
        return_value=httpx.Response(200, json=[
            current_result(18.4, 2, 20.1, 11.2),
            current_result(14.3, 3, 17.5, 9.8),
        ])
    )

    coords = [(-37.78, 175.28), (-41.29, 174.78)]
    results = fetch_current_many(coords)

    assert results == [
        {
            "lat": -37.78,
            "lng": 175.28,
            "temperature": 18.4,
            "code": 2,
            "summary": "Partly cloudy",
            "tempMax": 20.1,
            "tempMin": 11.2,
        },
        {
            "lat": -41.29,
            "lng": 174.78,
            "temperature": 14.3,
            "code": 3,
            "summary": "Overcast",
            "tempMax": 17.5,
            "tempMin": 9.8,
        },
    ]
    assert route.call_count == 1


@respx.mock
def test_fetch_current_many_normalizes_single_object_response():
    respx.get(host="api.open-meteo.com", path="/v1/forecast").mock(
        return_value=httpx.Response(200, json=current_result(18.4, 2, 20.1, 11.2))
    )

    results = fetch_current_many([(-37.78, 175.28)])

    assert len(results) == 1
    assert results[0]["lat"] == -37.78
    assert results[0]["lng"] == 175.28
    assert results[0]["summary"] == "Partly cloudy"


@respx.mock
def test_fetch_current_many_sends_combined_coordinates_and_params():
    route = respx.get(host="api.open-meteo.com", path="/v1/forecast").mock(
        return_value=httpx.Response(200, json=[
            current_result(18.4, 2, 20.1, 11.2),
            current_result(14.3, 3, 17.5, 9.8),
        ])
    )

    fetch_current_many([(-37.78, 175.28), (-41.29, 174.78)])

    assert route.call_count == 1
    assert dict(route.calls[0].request.url.params) == {
        "latitude": "-37.78,-41.29",
        "longitude": "175.28,174.78",
        "current": "temperature_2m,weather_code",
        "daily": "temperature_2m_max,temperature_2m_min",
        "timezone": "auto",
        "forecast_days": "1",
    }


@respx.mock
def test_fetch_current_many_server_error_raises_weather_service_error():
    respx.get(host="api.open-meteo.com", path="/v1/forecast").mock(
        return_value=httpx.Response(500)
    )

    with pytest.raises(WeatherServiceError):
        fetch_current_many([(-37.78, 175.28), (-41.29, 174.78)])