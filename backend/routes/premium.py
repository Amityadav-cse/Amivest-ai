from flask import Blueprint, request, jsonify

premium = Blueprint("premium", __name__)

@premium.route("/verify-premium", methods=["POST"])
def verify_premium():

    data = request.get_json()

    utr = data.get("utr")

    if not utr:
        return jsonify({"error": "UTR is required"}), 400

    # Later you can verify payment here

    return jsonify({
        "success": True,
        "message": "Payment submitted successfully."
    })