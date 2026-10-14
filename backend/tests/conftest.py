import pytest

from app.geocoding import _reverse_geocode_cached


@pytest.fixture(autouse=True)
def clear_reverse_geocode_cache():
    _reverse_geocode_cached.cache_clear()
