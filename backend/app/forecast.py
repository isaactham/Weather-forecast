# Open-Meteo forecast call + reshaping
import httpx
from app.weather_codes import describe

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

CURRENT_FIELDS = [
    "temperature_2m",
    "weather_code",
]

DAILY_FIELDS = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "uv_index_max",
]


def build_current(raw: dict) -> dict:
    """Return the current weather in the shape the frontend expects."""
    current = raw.get("current", {})
    code = current.get("weather_code")
    temperature = current.get("temperature_2m")

    if code is None:
        daily = raw.get("daily", {})
        weather_codes = daily.get("weather_code", [])
        if weather_codes:
            code = weather_codes[0]

    return {
        "temperature": temperature,
        "code": code,
        "summary": describe(code) if code is not None else None,
    }


def build_days(raw: dict) -> list[dict]:
    """Turn Open-Meteo's parallel daily lists into one dict per day."""
    daily = raw.get("daily", {})
    times = daily.get("time", [])
    days = []

    for i in range(len(times)):
        code = daily["weather_code"][i]
        day = {
            "date": times[i],
            "tempMax": daily["temperature_2m_max"][i],
            "tempMin": daily["temperature_2m_min"][i],
            "precipMm": daily.get("precipitation_sum", [None] * len(times))[i],
            "precipChance": daily.get("precipitation_probability_max", [None] * len(times))[i],
            "windMax": daily.get("wind_speed_10m_max", [None] * len(times))[i],
            "uvMax": daily.get("uv_index_max", [None] * len(times))[i],
            "code": code,
            "summary": describe(code),
        }
        days.append(day)

    return days


class WeatherServiceError(Exception):
    """Raised when Open-meteo can't be reached or returns an error."""


def fetch_forecast(lat: float, lng: float) -> dict:
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": ",".join(CURRENT_FIELDS),
        "daily": ",".join(DAILY_FIELDS),
        "timezone": "auto",
        "forecast_days": 7,
    }

    try:
        response = httpx.get(FORECAST_URL, params=params, timeout=10)
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise WeatherServiceError("Weather service is unavailable") from error

    return response.json()

