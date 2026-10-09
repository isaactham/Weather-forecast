from app.weather_codes import describe

def test_known_code():
    assert describe(61) == "Slight rain"

def test_clear_sky():
    assert describe(0) == "Clear sky"

def test_unknown_code_does_not_crash():
    assert describe(42) == "Unknown"