import re
from typing import List


class TransactionCategorizer:
    """
    Smart Transaction Categorizer
    """

    def __init__(self):

        self.category_keywords = {

            "Food": {
                "merchants": [
                    "swiggy",
                    "zomato",
                    "dominos",
                    "pizza hut",
                    "kfc",
                    "burger king",
                    "mcdonald",
                    "starbucks"
                ],
                "keywords": [
                    "food",
                    "restaurant",
                    "cafe",
                    "pizza",
                    "burger",
                    "biryani"
                ],
                "patterns": [
                    r".*food.*",
                    r".*restaurant.*"
                ]
            },

            "Shopping": {
                "merchants": [
                    "amazon",
                    "flipkart",
                    "myntra",
                    "ajio",
                    "meesho"
                ],
                "keywords": [
                    "shopping",
                    "clothes",
                    "shoes",
                    "purchase"
                ],
                "patterns": [
                    r".*shopping.*"
                ]
            },

            "Transport": {
                "merchants": [
                    "uber",
                    "ola",
                    "rapido"
                ],
                "keywords": [
                    "fuel",
                    "petrol",
                    "diesel",
                    "parking"
                ],
                "patterns": [
                    r".*ride.*"
                ]
            },

            "Bills": {
                "merchants": [],
                "keywords": [
                    "electricity",
                    "water",
                    "gas",
                    "bill",
                    "recharge"
                ],
                "patterns": [
                    r".*bill.*",
                    r".*charge.*"
                ]
            },

            "Entertainment": {
                "merchants": [
                    "netflix",
                    "hotstar",
                    "youtube",
                    "spotify"
                ],
                "keywords": [
                    "movie",
                    "music",
                    "subscription"
                ],
                "patterns": [
                    r".*subscription.*"
                ]
            },

            "Salary": {
                "merchants": [],
                "keywords": [
                    "salary",
                    "income",
                    "payroll",
                    "credit"
                ],
                "patterns": [
                    r".*salary.*"
                ]
            },

            "Investment": {
                "merchants": [
                    "groww",
                    "zerodha",
                    "upstox"
                ],
                "keywords": [
                    "sip",
                    "mutual fund",
                    "investment"
                ],
                "patterns": [
                    r".*sip.*"
                ]
            },

            "Others": {
                "merchants": [],
                "keywords": [],
                "patterns": []
            }

        }

    def categorize(self, description):

        description = description.lower().strip()

        # Merchant Matching
        for category, config in self.category_keywords.items():

            for merchant in config["merchants"]:

                if merchant in description:
                    return category

        # Keyword Matching
        for category, config in self.category_keywords.items():

            for keyword in config["keywords"]:

                if keyword in description:
                    return category

        # Regex Matching
        for category, config in self.category_keywords.items():

            for pattern in config["patterns"]:

                if re.search(pattern, description):
                    return category

        return "Others"

    def add_category(self, category, merchants=None, keywords=None):

        self.category_keywords[category] = {

            "merchants": merchants or [],

            "keywords": keywords or [],

            "patterns": []

        }

    def add_keyword(self, category, keyword):

        if category in self.category_keywords:

            self.category_keywords[category]["keywords"].append(keyword)


# Global Object
categorizer = TransactionCategorizer()


# This function is used by transaction_parser.py
def categorize(description):
    return categorizer.categorize(description)


# Test only when running this file directly
if __name__ == "__main__":

    print(categorize("Swiggy Biryani"))
    print(categorize("Netflix Monthly"))
    print(categorize("Amazon Shopping"))
    print(categorize("Uber Ride"))