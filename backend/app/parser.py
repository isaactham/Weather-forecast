#coordinate vs address detection

def parse_query(text: str) -> dict:
    """
    Parse the input text to determine if it is a coordinate or an address.
    Returns a dictionary with the type and value.
    """
    #Eg. -37.78, 175.28 or 
    text = text.strip()

    if not text:
        raise ValueError("Input text cannot be empty.")

    parts = text.replace(",", " ").split()
    if len(parts) != 2:
        return {"type": "place", "query": text}

    try:
        lat = float(parts[0])
        lng = float(parts[1])
    except ValueError:
        return {"type": "place", "query": text}

    #Range check
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise ValueError("Coordinates out of range")

    return {"type": "coords", "lat": lat, "lng": lng}


