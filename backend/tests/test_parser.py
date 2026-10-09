import pytest
from app.parser import parse_query

@pytest.mark.parametrize("text, lat, lng", [
    ("-37.78, 175.28", -37.78, 175.28),
    ("-37.78,175.28", -37.78, 175.28),     # no space
    ("-37.78 175.28", -37.78, 175.28),     # space only
    ("  -37.78 , 175.28  ", -37.78, 175.28),  # extra whitespace
    ("0, 0", 0.0, 0.0),
])
def test_valid_coordinates(text, lat, lng):
    result = parse_query(text)
    assert result == {"type": "coords", "lat": lat, "lng": lng}

@pytest.mark.parametrize("text", [
    "Hamilton",
    "Hamilton, New Zealand",
    "218 Anglesea Street, Hamilton",
    "3204",                                # postcode, not coordinates
])
def test_place_names(text):
    result = parse_query(text)
    assert result["type"] == "place"

@pytest.mark.parametrize("text", [
    "91, 0",       # latitude too high
    "-91, 0",
    "0, 181",      # longitude too high
    "0, -181",
])
def test_out_of_range_coordinates_raise(text):
    with pytest.raises(ValueError):
        parse_query(text)

@pytest.mark.parametrize("text", ["", "   "])
def test_empty_input_raises(text):
    with pytest.raises(ValueError):
        parse_query(text)