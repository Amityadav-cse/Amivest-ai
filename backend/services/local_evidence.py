import math
import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


BUSINESS_OSM_RULES = {
    "electrical": {
        "direct": [
            ("shop", "electrical"),
            ("shop", "electronics"),
            ("shop", "hardware"),
        ],
        "related": [
            ("craft", "electrician"),
            ("shop", "building_materials"),
            ("shop", "doityourself"),
        ],
    },

    "electronics": {
        "direct": [
            ("shop", "mobile_phone"),
            ("shop", "electronics"),
            ("shop", "computer"),
        ],
        "related": [
            ("shop", "computer"),
            ("amenity", "repair"),
        ],
    },

    "retail": {
        "direct": [
            ("shop", "convenience"),
            ("shop", "general"),
            ("shop", "supermarket"),
        ],
        "related": [
            ("shop", "department_store"),
            ("shop", "variety_store"),
        ],
    },

    "food": {
        "direct": [
            ("amenity", "restaurant"),
            ("amenity", "cafe"),
            ("amenity", "fast_food"),
        ],
        "related": [
            ("shop", "bakery"),
            ("amenity", "food_court"),
        ],
    },

    "dairy": {
        "direct": [
            ("shop", "dairy"),
        ],
        "related": [
            ("shop", "convenience"),
            ("shop", "supermarket"),
        ],
    },

    "poultry": {
        "direct": [
            ("shop", "poultry"),
        ],
        "related": [
            ("shop", "animal_feed"),
            ("shop", "farm"),
        ],
    },

    "agriculture": {
        "direct": [
            ("shop", "agrarian"),
            ("shop", "farm"),
        ],
        "related": [
            ("shop", "animal_feed"),
            ("shop", "garden_centre"),
        ],
    },

    "manufacturing": {
        "direct": [
            ("industrial", "factory"),
            ("industrial", "warehouse"),
        ],
        "related": [
            ("craft", "workshop"),
            ("shop", "hardware"),
        ],
    },

    "services": {
        "direct": [
            ("office", "company"),
        ],
        "related": [
            ("amenity", "bank"),
            ("amenity", "post_office"),
        ],
    },

    "other": {
        "direct": [],
        "related": [],
    },
}


def _distance_km(lat1, lon1, lat2, lon2):
    radius = 6371.0

    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)

    a = (
        math.sin(dp / 2) ** 2
        + math.cos(p1)
        * math.cos(p2)
        * math.sin(dl / 2) ** 2
    )

    return 2 * radius * math.asin(math.sqrt(a))


def _coords(element):
    if "lat" in element and "lon" in element:
        return element["lat"], element["lon"]

    center = element.get("center") or {}

    if "lat" in center and "lon" in center:
        return center["lat"], center["lon"]

    return None, None


def _query(
    latitude,
    longitude,
    radius_meters,
    rules,
):
    clauses = []

    for group in ("direct", "related"):
        for key, value in rules[group]:
            clauses.append(
                f'nwr(around:{radius_meters},{latitude},{longitude})["{key}"="{value}"];'
            )

    return f"""
[out:json][timeout:30];

(
  {' '.join(clauses)}
);

out center tags;
"""


def query_business_evidence(
    latitude,
    longitude,
    business_type,
    radius_km=5,
):
    latitude = float(latitude)
    longitude = float(longitude)
    radius_km = max(1, min(float(radius_km), 10))
    radius_meters = int(radius_km * 1000)

    rules = BUSINESS_OSM_RULES.get(
        business_type,
        BUSINESS_OSM_RULES["other"],
    )

    response = requests.post(
        OVERPASS_URL,
        data=_query(
            latitude,
            longitude,
            radius_meters,
            rules,
        ),
        timeout=30,
        headers={
            "User-Agent": "AmiVest-AmiBusiness/1.0",
        },
    )

    response.raise_for_status()

    payload = response.json()

    direct_lookup = set(rules["direct"])
    related_lookup = set(rules["related"])

    direct = []
    related = []

    for element in payload.get("elements", []):
        tags = element.get("tags", {})

        matched_group = None

        for key, value in direct_lookup:
            if tags.get(key) == value:
                matched_group = "direct"
                break

        if matched_group is None:
            for key, value in related_lookup:
                if tags.get(key) == value:
                    matched_group = "related"
                    break

        if matched_group is None:
            continue

        lat, lon = _coords(element)

        distance = None

        if lat is not None and lon is not None:
            distance = round(
                _distance_km(
                    latitude,
                    longitude,
                    float(lat),
                    float(lon),
                ),
                3,
            )

        item = {
            "osm_type": element.get("type"),
            "osm_id": element.get("id"),
            "name": tags.get("name"),
            "category": {
                key: value
                for key, value in tags.items()
                if key in ("shop", "amenity", "craft", "office", "industrial")
            },
            "latitude": lat,
            "longitude": lon,
            "distance_km": distance,
        }

        if matched_group == "direct":
            direct.append(item)
        else:
            related.append(item)

    direct.sort(
        key=lambda x: (
            x["distance_km"]
            if x["distance_km"] is not None
            else 999999
        )
    )

    related.sort(
        key=lambda x: (
            x["distance_km"]
            if x["distance_km"] is not None
            else 999999
        )
    )

    return {
        "source": {
            "provider": "OpenStreetMap",
            "method": "Overpass API",
        },
        "business_type": business_type,
        "radius_km": radius_km,
        "direct_competitors": direct,
        "related_competitors": related,
        "summary": {
            "direct_competitor_count": len(direct),
            "related_competitor_count": len(related),
        },
    }


def query_osm_local_evidence(
    latitude,
    longitude,
    radius_km=5,
):
    return query_business_evidence(
        latitude=latitude,
        longitude=longitude,
        business_type="other",
        radius_km=radius_km,
    )
