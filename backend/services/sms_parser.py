import re
from datetime import datetime


BANK_KEYWORDS = {
    "sbi": "SBI", "state bank": "SBI",
    "hdfc": "HDFC", "icici": "ICICI", "axis": "Axis Bank",
    "kotak": "Kotak", "pnb": "PNB", "bob": "Bank of Baroda",
    "canara": "Canara Bank", "union bank": "Union Bank",
    "idfc": "IDFC First", "yes bank": "Yes Bank",
}

MODE_KEYWORDS = {
    "upi": "UPI", "neft": "NEFT", "imps": "IMPS",
    "rtgs": "RTGS", "atm": "ATM", "card": "Card",
}


def parse_bank_sms(sms_text: str, received_at: str = None):
    """
    Parses a raw bank/UPI SMS and extracts structured transaction data.
    Returns None if the text doesn't look like a transaction alert at all
    (so non-bank SMS doesn't get saved as junk transactions).
    """
    if not sms_text:
        return None

    text = sms_text.strip()
    lower = text.lower()

    # Must contain an amount to even be considered a transaction SMS
    amount_match = re.search(r'(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)', lower)
    if not amount_match:
        return None

    amount = float(amount_match.group(1).replace(",", ""))

    # Determine credit vs debit
    is_credit = bool(re.search(r'\b(credited|received|deposit)\b', lower))
    is_debit = bool(re.search(r'\b(debited|spent|withdrawn|paid|purchase)\b', lower))

    if is_credit and not is_debit:
        txn_type = "credit"
    elif is_debit and not is_credit:
        txn_type = "debit"
    else:
        # Ambiguous SMS (e.g. promotional) — don't guess, discard it
        return None

    # Identify bank
    bank = "Unknown Bank"
    for keyword, name in BANK_KEYWORDS.items():
        if keyword in lower:
            bank = name
            break

    # Identify payment mode
    mode = "Bank Transfer"
    for keyword, name in MODE_KEYWORDS.items():
        if keyword in lower:
            mode = name
            break

    # Extract reference / transaction ID if present (common formats)
    ref_match = re.search(r'(?:ref(?:erence)?\.?\s*(?:no\.?)?|txn\s*id|utr)\s*[:\-]?\s*([A-Za-z0-9]+)', lower)
    reference_id = ref_match.group(1).upper() if ref_match else None

    # Try to pull a merchant/description if it's a debit ("to XXXX" or "at XXXX")
    desc_match = re.search(r'\b(?:to|at)\s+([A-Za-z0-9 &._-]{3,40})', text)
    description = desc_match.group(1).strip() if desc_match else (
        "Money Received" if txn_type == "credit" else "Card/UPI Payment"
    )

    timestamp = received_at or datetime.now().isoformat()

    return {
        "amount": amount,
        "type": txn_type,
        "bank": bank,
        "mode": mode,
        "reference_id": reference_id,
        "description": description,
        "received_at": timestamp,
        "raw_sms": text,
    }