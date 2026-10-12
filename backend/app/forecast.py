# Open-Meteo forecast call + reshaping

from app.weather_codes import describe

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



