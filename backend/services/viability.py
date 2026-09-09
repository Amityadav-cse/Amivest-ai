def _clamp(value, minimum=0, maximum=100):
    return max(minimum, min(maximum, float(value)))


def score_demand(evidence):
    counts = evidence.get("counts", {})

    markets = counts.get("marketplaces", 0)
    schools = counts.get("schools", 0)
    colleges = counts.get("colleges", 0)
    bus_stops = counts.get("bus_stops", 0)

    score = (
        min(markets, 5) * 8
        + min(schools, 10) * 2
        + min(colleges, 5) * 2
        + min(bus_stops, 10) * 1.5
    )

    return _clamp(score)


def score_competition_gap(evidence):
    counts = evidence.get("counts", {})

    markets = counts.get("marketplaces", 0)
    banks = counts.get("banks", 0)

    commercial_pressure = min(
        markets * 8 + banks * 2,
        100
    )

    return _clamp(100 - commercial_pressure)


def score_accessibility(evidence):
    counts = evidence.get("counts", {})

    bus_stops = counts.get("bus_stops", 0)
    railway_stations = counts.get("railway_stations", 0)
    railway_halts = counts.get("railway_halts", 0)

    score = (
        min(bus_stops, 10) * 6
        + min(railway_stations, 3) * 15
        + min(railway_halts, 3) * 10
    )

    return _clamp(score)


def score_infrastructure(evidence):
    counts = evidence.get("counts", {})

    banks = counts.get("banks", 0)
    post_offices = counts.get("post_offices", 0)
    schools = counts.get("schools", 0)
    hospitals = counts.get("hospitals", 0)

    score = (
        min(banks, 5) * 8
        + min(post_offices, 3) * 8
        + min(schools, 10) * 3
        + min(hospitals, 5) * 4
    )

    return _clamp(score)


def score_financial_fit(financial_structure):
    if not financial_structure:
        return None

    capital = float(
        financial_structure.get("margin_capital", 0) or 0
    )

    project_cost = float(
        financial_structure.get("project_cost", 0) or 0
    )

    financing = float(
        financial_structure.get("maximum_financing", 0) or 0
    )

    if capital <= 0 or project_cost <= 0:
        return None

    contribution_ratio = capital / project_cost

    score = contribution_ratio * 100

    if financing >= project_cost * 0.90:
        score += 5

    return _clamp(score)


def calculate_evidence_quality(evidence):
    if not evidence:
        return 0

    source = evidence.get("source", {})
    provider = source.get("provider")

    if provider == "OpenStreetMap":
        return 70

    return 50


def calculate_viability_score(
    evidence,
    financial_structure=None,
):
    scores = {
        "demand": score_demand(evidence),
        "competition_gap": score_competition_gap(evidence),
        "accessibility": score_accessibility(evidence),
        "infrastructure": score_infrastructure(evidence),
        "financial_fit": score_financial_fit(
            financial_structure
        ),
        "evidence_quality": calculate_evidence_quality(
            evidence
        ),
    }

    weights = {
        "demand": 0.25,
        "competition_gap": 0.20,
        "accessibility": 0.15,
        "infrastructure": 0.10,
        "financial_fit": 0.20,
        "evidence_quality": 0.10,
    }

    weighted_total = 0
    total_weight = 0

    for key, score in scores.items():
        if score is None:
            continue

        weighted_total += score * weights[key]
        total_weight += weights[key]

    if total_weight == 0:
        final_score = 0
    else:
        final_score = weighted_total / total_weight

    final_score = round(_clamp(final_score), 1)

    if final_score >= 75:
        decision = "promising"
        label = "Promising"
    elif final_score >= 55:
        decision = "validate"
        label = "Promising but validate"
    else:
        decision = "caution"
        label = "High caution"

    return {
        "score": final_score,
        "decision": decision,
        "label": label,
        "components": scores,
        "weights": weights,
        "method": {
            "type": "deterministic",
            "version": "v1",
            "note": (
                "Spatial counts are signals, not direct measurements "
                "of local demand or business success."
            ),
        },
    }
