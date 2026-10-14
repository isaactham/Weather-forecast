from pydantic import BaseModel


class LocationOption(BaseModel):
    id: int
    name: str
    region: str | None = None
    country: str | None = None
    countryCode: str | None = None
    lat: float
    lng: float
    label: str