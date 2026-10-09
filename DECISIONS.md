Parser
- Parser only classifies input; checking if a place is real is the geocoder's job
- Catch ValueError only (not bare except) so real bugs aren't hidden as "place"
- Range check written as not (-90 <= lat <= 90) so "nan" is rejected
- Range check kept outside try/except so the out-of-range error isn't swallowed

Weather codes:
- “Open-Meteo returns WMO weather codes as numbers, so I map them to readable labels with a dictionary. I used .get() with a default so an unexpected code shows ‘Unknown’ instead of crashing the whole forecast.”