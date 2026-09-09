import os
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv("/Users/amityadav/finsaathi-ai/backend/.env")

GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText"


BUSINESS_PLACE_QUERIES = {
    "electrical": [
        "electrical shops", "electronics shops", "hardware shops",
        "electrician services",
    ],
    "electronics": [
        "mobile phone shops", "electronics shops", "computer shops",
        "mobile repair shops",
    ],
    "retail": [
        "general stores", "supermarkets", "convenience stores",
        "retail shops",
    ],
    "food": [
        "restaurants", "cafes", "fast food restaurants", "bakeries",
    ],
    "dairy": [
        "dairy shops", "milk shops", "grocery stores",
    ],
    "poultry": [
        "poultry shops", "animal feed stores", "farm supply stores",
    ],
    "agriculture": [
        "agriculture shops", "agricultural supply stores",
        "animal feed stores", "garden stores",
    ],
    "manufacturing": [
        "factories", "industrial businesses", "workshops", "warehouses",
    ],
    "services": [
        "business services", "service businesses", "offices",
    ],
    "other": ["businesses", "shops"],
}


# These keywords are intentionally conservative.
# A place is only classified as a direct competitor when its
# name/type strongly matches the selected business category.
BUSINESS_CLASSIFICATION = {
    "electronics": {
        "direct": [
            "mobile", "phone", "electronics", "computer",
            "laptop", "mobile repair", "cell phone",
        ],
        "related": [
            "electrical", "hardware", "accessories",
            "appliance", "television", "tv",
        ],
    },
    "electrical": {
        "direct": [
            "electrical", "electrician", "electrical shop",
            "electrical store",
        ],
        "related": [
            "hardware", "electronics", "building material",
            "home improvement",
        ],
    },
    "retail": {
        "direct": [
            "general store", "supermarket", "convenience",
            "grocery", "retail", "department store",
        ],
        "related": [
            "shopping", "mart", "bakery", "pharmacy",
        ],
    },
    "food": {
        "direct": [
            "restaurant", "cafe", "fast food", "food",
            "bakery", "dhaba", "eatery",
        ],
        "related": [
            "sweet", "snack", "grocery", "catering",
        ],
    },
    "dairy": {
        "direct": [
            "dairy", "milk", "milk booth", "dairy farm",
        ],
        "related": [
            "grocery", "general store", "supermarket",
            "bakery", "ice cream",
        ],
    },
    "poultry": {
        "direct": [
            "poultry", "chicken", "egg", "broiler",
            "poultry farm",
        ],
        "related": [
            "animal feed", "farm supply", "agriculture",
            "veterinary", "seed",
        ],
    },
    "agriculture": {
        "direct": [
            "agriculture", "agri", "farm supply",
            "agricultural", "seed", "fertilizer",
            "pesticide",
        ],
        "related": [
            "animal feed", "garden", "nursery",
            "hardware", "tractor",
        ],
    },
    "manufacturing": {
        "direct": [
            "factory", "manufacturing", "manufacturer",
            "industrial", "production",
        ],
        "related": [
            "workshop", "warehouse", "hardware",
            "engineering", "fabrication",
        ],
    },
    "services": {
        "direct": [
            "business service", "consultant", "accountant",
            "chartered accountant", "office service",
        ],
        "related": [
            "bank", "post office", "insurance", "legal",
            "government", "office",
        ],
    },
    "other": {
        "direct": [],
        "related": [],
    },
}


def _get_api_key():
    return os.getenv("GOOGLE_MAPS_API_KEY")


def _search_places(query, latitude, longitude, radius_meters=5000):
    key = _get_api_key()

    if not key:
        raise RuntimeError("GOOGLE_MAPS_API_KEY is not configured.")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": (
            "places.id,"
            "places.displayName,"
            "places.formattedAddress,"
            "places.location,"
            "places.rating,"
            "places.userRatingCount,"
            "places.googleMapsUri,"
            "places.primaryType"
        ),
    }

    body = {
        "textQuery": query,
        "pageSize": 20,
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": float(latitude),
                    "longitude": float(longitude),
                },
                "radius": float(radius_meters),
            }
        },
    }

    response = requests.post(
        GOOGLE_PLACES_URL,
        headers=headers,
        json=body,
        timeout=20,
    )
    response.raise_for_status()
    return response.json().get("places", [])


def _distance_km(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, sqrt, atan2

    earth_radius = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1))
        * cos(radians(lat2))
        * sin(dlon / 2) ** 2
    )

    return earth_radius * 2 * atan2(sqrt(a), sqrt(1 - a))


def _text_for_classification(place):
    name = (
        (place.get("displayName") or {}).get("text")
        or ""
    )
    primary_type = place.get("primaryType") or ""
    address = place.get("formattedAddress") or ""

    return f"{name} {primary_type} {address}".lower()


def classify_business(place, business_type):
    """
    Return direct / related / other.

    Important: Google Places search results are evidence signals.
    We do not assume every returned place is a competitor.
    """
    business_type = str(
        business_type or "other"
    ).strip().lower()

    rules = BUSINESS_CLASSIFICATION.get(
        business_type,
        BUSINESS_CLASSIFICATION["other"],
    )

    text = _text_for_classification(place)

    # Exact/strong category matches first.
    for keyword in rules["direct"]:
        if keyword in text:
            return "direct"

    for keyword in rules["related"]:
        if keyword in text:
            return "related"

    return "other"


def search_business_places(
    latitude,
    longitude,
    business_type,
    radius_km=5,
):
    business_type = str(
        business_type or "other"
    ).strip().lower()

    queries = BUSINESS_PLACE_QUERIES.get(
        business_type,
        BUSINESS_PLACE_QUERIES["other"],
    )

    radius_km = max(1, min(float(radius_km), 10))
    all_places = {}

    for query in queries:
        places = _search_places(
            query=query,
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_km * 1000,
        )

        for place in places:
            place_id = place.get("id")
            if place_id:
                all_places[place_id] = place

    results = []

    for place in all_places.values():
        location = place.get("location") or {}
        place_lat = location.get("latitude")
        place_lon = location.get("longitude")

        distance = None

        if place_lat is not None and place_lon is not None:
            distance = round(
                _distance_km(
                    float(latitude),
                    float(longitude),
                    float(place_lat),
                    float(place_lon),
                ),
                2,
            )

        display_name = place.get("displayName") or {}

        classification = classify_business(
            place,
            business_type,
        )

        results.append({
            "place_id": place.get("id"),
            "name": display_name.get(
                "text",
                "Unknown business",
            ),
            "address": place.get("formattedAddress"),
            "latitude": place_lat,
            "longitude": place_lon,
            "distance_km": distance,
            "rating": place.get("rating"),
            "review_count": place.get(
                "userRatingCount",
                0,
            ),
            "primary_type": place.get("primaryType"),
            "google_maps_uri": place.get(
                "googleMapsUri"
            ),
            "classification": classification,
            "evidence_status": "Verified listing",
        })

    results.sort(
        key=lambda x: (
            x["distance_km"]
            if x["distance_km"] is not None
            else 999
        )
    )

    return results


def _summary_for_places(places):
    count = len(places)

    ratings = [
        float(p["rating"])
        for p in places
        if p.get("rating") is not None
    ]

    total_reviews = sum(
        int(p.get("review_count") or 0)
        for p in places
    )

    average_rating = (
        round(sum(ratings) / len(ratings), 2)
        if ratings else None
    )

    return {
        "business_count": count,
        "average_rating": average_rating,
        "total_reviews": total_reviews,
    }


def calculate_competition_summary(places):
    direct = [
        p for p in places
        if p.get("classification") == "direct"
    ]

    related = [
        p for p in places
        if p.get("classification") == "related"
    ]

    other = [
        p for p in places
        if p.get("classification") == "other"
    ]

    direct_summary = _summary_for_places(direct)

    direct_count = len(direct)

    if direct_count == 0:
        pressure = "Unknown"
    elif direct_count <= 3:
        pressure = "Low"
    elif direct_count <= 8:
        pressure = "Medium"
    else:
        pressure = "High"

    return {
        "business_count": len(places),
        "direct_competitor_count": direct_count,
        "related_business_count": len(related),
        "other_business_count": len(other),
        "average_rating": direct_summary["average_rating"],
        "total_reviews": direct_summary["total_reviews"],
        "competition_pressure": pressure,
        "pressure_basis": (
            "Direct competitor count only"
        ),
    }


def get_business_intelligence(
    latitude,
    longitude,
    business_type,
    radius_km=5,
):
    places = search_business_places(
        latitude=latitude,
        longitude=longitude,
        business_type=business_type,
        radius_km=radius_km,
    )

    summary = calculate_competition_summary(places)

    direct = [
        p for p in places
        if p.get("classification") == "direct"
    ]

    related = [
        p for p in places
        if p.get("classification") == "related"
    ]

    other = [
        p for p in places
        if p.get("classification") == "other"
    ]

    return {
        "success": True,
        "source": {
            "provider": "Google Places API (New)",
            "method": "Text Search",
        },
        "business_type": business_type,
        "radius_km": radius_km,
        "places": places,
        "direct_competitors": direct,
        "related_businesses": related,
        "other_nearby_businesses": other,
        "summary": summary,
        "data_quality": {
            "provider_available": True,
            "coverage": "Partial",
            "evidence_status": "Verified listing",
            "retrieved_at": datetime.now(
                timezone.utc
            ).isoformat(),
            "note": (
                "Google Places listings are evidence "
                "signals and may not include every local "
                "business. Classification is based on "
                "business name, primary type and address. "
                "Competition pressure uses direct "
                "competitors only."
            ),
        },
    }
