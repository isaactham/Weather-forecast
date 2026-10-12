# Open-Meteo forecast call + reshaping
import httpx
from app.weather_codes import describe

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

DAILY_FIELDS = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_probability_max",
    "wind_speed_10m_max",
]

def build_days(raw : dict) -> list[dict]:
    """
    Turn Open-Meteo's parallel daily lists into one dict per day
    """
    daily = raw["daily"]
    days = []

    for i in range(len(daily["time"])):
        day = {
            "date": daily["time"][i],
            "tempMax": daily["temperature_2m_max"][i],
            "tempMin": daily["temperature_2m_min"][i],
            "code": daily["weather_code"][i],
            "summary": describe(daily["weather_code"][i]),
        }
        days.append(day)

    return days

class WeatherServiceError(Exception):
    """Raised when Open-meteo can't be reached or returns an error."""

def fetch_forecast(lat: float, lng: float) -> dict:
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": ".".join(DAILY_FIELDS),
        "timezone": "auto",
        "forecast_days": 7,
    }

    try:
        response = httpx.get(FORECAST_URL, params=params, timeout=10)
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise WeatherServiceError("Weather service is unavailable") from error

    return response.json()

