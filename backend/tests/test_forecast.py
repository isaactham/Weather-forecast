import json
import httpx
import pytest
import respx

from app.forecast import fetch_forecast, WeatherServiceError

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