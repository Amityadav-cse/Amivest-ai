# ============================================================
# BUSINESS EVIDENCE RULES
# ============================================================
# These rules define what types of OpenStreetMap features are
# useful for analysing each business category.
#
# IMPORTANT:
# These are SEARCH/MAPPING rules only.
# They do NOT claim that a location is profitable.
# Actual evidence must come from external data sources.
# ============================================================

BUSINESS_EVIDENCE_RULES = {

    # --------------------------------------------------------
    # ELECTRICAL SHOP
    # --------------------------------------------------------
    "electrical": {
        "name": "Electrical Shop",

        "direct_competitors": [
            ("shop", "electrical"),
            ("shop", "electronics"),
            ("shop", "hardware"),
            ("shop", "building_materials"),
        ],

        "related_competitors": [
            ("craft", "electrician"),
            ("shop", "doityourself"),
            ("shop", "home_improvement"),
        ],

        "demand_signals": [
            ("amenity", "marketplace"),
            ("shop", "hardware"),
            ("shop", "building_materials"),
            ("shop", "home_improvement"),
            ("shop", "doityourself"),
        ],

        "customer_activity_signals": [
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "hospital"),
            ("amenity", "clinic"),
            ("amenity", "marketplace"),
        ],

        "supply_signals": [
            ("shop", "hardware"),
            ("shop", "building_materials"),
            ("shop", "wholesale"),
        ],

        "keywords": [
            "electrical",
            "electric",
            "electric shop",
            "electrical shop",
            "electrical store",
        ],
    },


    # --------------------------------------------------------
    # ELECTRONICS / MOBILE
    # --------------------------------------------------------
    "electronics": {
        "name": "Mobile & Electronics",

        "direct_competitors": [
            ("shop", "mobile_phone"),
            ("shop", "electronics"),
            ("shop", "computer"),
            ("shop", "computer_parts"),
        ],

        "related_competitors": [
            ("shop", "household_electrical_appliance"),
            ("craft", "electronics_repair"),
            ("amenity", "repair"),
        ],

        "demand_signals": [
            ("amenity", "marketplace"),
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "bank"),
            ("amenity", "office"),
        ],

        "customer_activity_signals": [
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "university"),
            ("amenity", "bank"),
            ("amenity", "bus_station"),
        ],

        "supply_signals": [
            ("shop", "computer"),
            ("shop", "computer_parts"),
            ("shop", "electronics"),
            ("shop", "mobile_phone"),
        ],

        "keywords": [
            "electronics",
            "electronic",
            "mobile",
            "mobile shop",
            "mobile store",
            "electronics shop",
            "electronics store",
            "computer shop",
        ],
    },


    # --------------------------------------------------------
    # GENERAL RETAIL
    # --------------------------------------------------------
    "retail": {
        "name": "General Retail",

        "direct_competitors": [
            ("shop", "convenience"),
            ("shop", "supermarket"),
            ("shop", "general"),
            ("shop", "department_store"),
            ("shop", "variety_store"),
        ],

        "related_competitors": [
            ("shop", "wholesale"),
            ("shop", "mall"),
            ("amenity", "marketplace"),
        ],

        "demand_signals": [
            ("amenity", "marketplace"),
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "bus_station"),
            ("amenity", "bank"),
        ],

        "customer_activity_signals": [
            ("amenity", "marketplace"),
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "bus_station"),
            ("amenity", "hospital"),
        ],

        "supply_signals": [
            ("shop", "wholesale"),
            ("shop", "supermarket"),
            ("shop", "department_store"),
        ],

        "keywords": [
            "retail",
            "general retail",
            "general store",
            "general shop",
            "kirana",
            "kirana store",
            "grocery",
            "grocery store",
        ],
    },


    # --------------------------------------------------------
    # FOOD / CAFE
    # --------------------------------------------------------
    "food": {
        "name": "Food & Cafe",

        "direct_competitors": [
            ("amenity", "restaurant"),
            ("amenity", "cafe"),
            ("amenity", "fast_food"),
            ("amenity", "food_court"),
        ],

        "related_competitors": [
            ("shop", "bakery"),
            ("shop", "confectionery"),
            ("shop", "beverages"),
        ],

        "demand_signals": [
            ("amenity", "marketplace"),
            ("amenity", "bus_station"),
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "hospital"),
        ],

        "customer_activity_signals": [
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "university"),
            ("amenity", "hospital"),
            ("amenity", "bus_station"),
            ("amenity", "marketplace"),
        ],

        "supply_signals": [
            ("shop", "bakery"),
            ("shop", "beverages"),
            ("shop", "confectionery"),
        ],

        "keywords": [
            "food",
            "food shop",
            "food business",
            "restaurant",
            "cafe",
            "tea shop",
            "fast food",
            "fast-food",
        ],
    },


    # --------------------------------------------------------
    # DAIRY
    # --------------------------------------------------------
    "dairy": {
        "name": "Dairy Business",

        "direct_competitors": [
            ("shop", "dairy"),
            ("amenity", "ice_cream"),
        ],

        "related_competitors": [
            ("shop", "convenience"),
            ("shop", "supermarket"),
            ("shop", "beverages"),
        ],

        "demand_signals": [
            ("amenity", "marketplace"),
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "restaurant"),
        ],

        "customer_activity_signals": [
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "hospital"),
            ("amenity", "marketplace"),
        ],

        "supply_signals": [
            ("shop", "supermarket"),
            ("shop", "convenience"),
            ("shop", "dairy"),
        ],

        "keywords": [
            "dairy",
            "dairy shop",
            "dairy store",
            "milk shop",
            "milk store",
        ],
    },


    # --------------------------------------------------------
    # POULTRY
    # --------------------------------------------------------
    "poultry": {
        "name": "Poultry Business",

        "direct_competitors": [
            ("shop", "poultry"),
            ("shop", "farm"),
        ],

        "related_competitors": [
            ("shop", "animal_feed"),
            ("shop", "agrarian"),
            ("shop", "agricultural"),
        ],

        "demand_signals": [
            ("amenity", "marketplace"),
            ("shop", "animal_feed"),
            ("shop", "farm"),
            ("shop", "agrarian"),
        ],

        "customer_activity_signals": [
            ("amenity", "marketplace"),
            ("amenity", "restaurant"),
            ("amenity", "hotel"),
        ],

        "supply_signals": [
            ("shop", "animal_feed"),
            ("shop", "farm"),
            ("shop", "agrarian"),
        ],

        "keywords": [
            "poultry",
            "poultry farm",
            "poultry shop",
            "chicken farm",
            "chicken shop",
        ],
    },


    # --------------------------------------------------------
    # AGRICULTURE
    # --------------------------------------------------------
    "agriculture": {
        "name": "Agriculture Business",

        "direct_competitors": [
            ("shop", "agrarian"),
            ("shop", "farm"),
            ("shop", "agricultural"),
            ("shop", "garden_centre"),
        ],

        "related_competitors": [
            ("shop", "animal_feed"),
            ("shop", "hardware"),
            ("shop", "building_materials"),
        ],

        "demand_signals": [
            ("amenity", "marketplace"),
            ("shop", "animal_feed"),
            ("shop", "farm"),
            ("shop", "hardware"),
            ("shop", "garden_centre"),
        ],

        "customer_activity_signals": [
            ("amenity", "marketplace"),
            ("amenity", "bank"),
            ("amenity", "cooperative"),
        ],

        "supply_signals": [
            ("shop", "animal_feed"),
            ("shop", "hardware"),
            ("shop", "agrarian"),
            ("shop", "garden_centre"),
        ],

        "keywords": [
            "agriculture",
            "agricultural",
            "agriculture shop",
            "agri shop",
            "farm",
            "farm shop",
            "seed shop",
            "fertilizer shop",
        ],
    },


    # --------------------------------------------------------
    # MANUFACTURING
    # --------------------------------------------------------
    "manufacturing": {
        "name": "Manufacturing Business",

        "direct_competitors": [
            ("industrial", "factory"),
            ("industrial", "warehouse"),
            ("craft", "workshop"),
        ],

        "related_competitors": [
            ("shop", "hardware"),
            ("shop", "building_materials"),
            ("industrial", "industrial"),
        ],

        "demand_signals": [
            ("industrial", "factory"),
            ("industrial", "warehouse"),
            ("amenity", "marketplace"),
            ("shop", "hardware"),
            ("shop", "building_materials"),
        ],

        "customer_activity_signals": [
            ("industrial", "factory"),
            ("industrial", "warehouse"),
            ("amenity", "marketplace"),
            ("amenity", "transportation"),
        ],

        "supply_signals": [
            ("industrial", "warehouse"),
            ("shop", "hardware"),
            ("shop", "building_materials"),
        ],

        "keywords": [
            "manufacturing",
            "manufacture",
            "factory",
            "workshop",
            "production",
            "small manufacturing",
        ],
    },


    # --------------------------------------------------------
    # SERVICES
    # --------------------------------------------------------
    "services": {
        "name": "Service Business",

        "direct_competitors": [
            ("craft", "service"),
            ("office", "company"),
            ("office", "consulting"),
        ],

        "related_competitors": [
            ("amenity", "bank"),
            ("amenity", "post_office"),
            ("office", "insurance"),
        ],

        "demand_signals": [
            ("amenity", "marketplace"),
            ("amenity", "bank"),
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "hospital"),
        ],

        "customer_activity_signals": [
            ("amenity", "bank"),
            ("amenity", "post_office"),
            ("amenity", "school"),
            ("amenity", "college"),
            ("amenity", "hospital"),
        ],

        "supply_signals": [
            ("office", "company"),
            ("office", "consulting"),
            ("office", "insurance"),
        ],

        "keywords": [
            "service",
            "services",
            "service business",
            "repair",
            "consulting",
            "agency",
            "professional service",
        ],
    },


    # --------------------------------------------------------
    # OTHER
    # --------------------------------------------------------
    "other": {
        "name": "Other Business",

        "direct_competitors": [],

        "related_competitors": [],

        "demand_signals": [
            ("amenity", "marketplace"),
            ("amenity", "school"),
            ("amenity", "bank"),
        ],

        "customer_activity_signals": [
            ("amenity", "marketplace"),
            ("amenity", "school"),
            ("amenity", "bank"),
        ],

        "supply_signals": [],

        "keywords": [],
    },
}


# ============================================================
# BUSINESS EVIDENCE RULE HELPER
# ============================================================

def get_business_evidence_rule(business_type):
    """
    Return the evidence rules for a business category.

    Unknown or missing business types safely fall back to
    the 'other' category.
    """

    if not business_type:
        return BUSINESS_EVIDENCE_RULES["other"]

    normalized_type = str(business_type).strip().lower()

    return BUSINESS_EVIDENCE_RULES.get(
        normalized_type,
        BUSINESS_EVIDENCE_RULES["other"],
    )