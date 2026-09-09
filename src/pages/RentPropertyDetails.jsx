import React from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

export default function RentPropertyDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const property = location.state?.property || {
    id,
    title: "Property Details",
    type: "Rental Property",
    rent: 0,
    deposit: 0,
    distance: null,
    verified: false,
    wifi: false,
    food: false,
    furnished: false,
    parking: false,
    stay: "Information unavailable",
    rooms: 0,
    bathrooms: 0,
    description:
      "Open this property from the renter search page to see its information.",
  };

  const rent = Number(property.rent || 0);
  const deposit = Number(property.deposit || 0);

  const requestBooking = () => {
    alert(
      "Next step: renter OTP, availability check and secure booking."
    );
  };

  const enquire = () => {
    alert(
      "Next step: secure renter-to-owner enquiry."
    );
  };

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <header style={styles.header}>

        <button
          type="button"
          style={styles.back}
          onClick={() =>
            navigate("/rent/search")
          }
        >
          ← Back to search
        </button>

        <div style={styles.brand}>
          🏠 AmiVest Rent
        </div>

        <div
          style={{
            color: property.verified
              ? "#70d8bd"
              : "#d4b56b",
            fontSize: 10,
            fontWeight: 900,
          }}
        >
          {property.verified
            ? "✓ VERIFIED"
            : "NOT VERIFIED"}
        </div>

      </header>


      <main style={styles.container}>

        <div style={styles.breadcrumb}>
          Rent / Property / {id}
        </div>


        <div style={styles.grid}>

          {/* PROPERTY PHOTO */}

          <section style={styles.gallery}>

            <div style={styles.heroImage}>
              {property.type === "PG"
                ? "🎓"
                : property.type === "Room"
                ? "🛏️"
                : property.type === "Flat"
                ? "🏠"
                : property.type ===
                  "Night Stay"
                ? "🌙"
                : "🏠"}
            </div>

            <div style={styles.galleryText}>
              Property images uploaded by the owner
              will appear here when image storage is connected.
            </div>

          </section>


          {/* PROPERTY INFORMATION */}

          <section>

            <div style={styles.type}>
              {property.type}
            </div>

            <h1 style={styles.title}>
              {property.title}
            </h1>

            <div style={styles.location}>
              📍{" "}
              {property.distance !== null
                ? `${property.distance} km from selected location`
                : "Location information unavailable"}
            </div>


            {/* PRICE */}

            <div style={styles.priceCard}>

              <div style={styles.price}>
                ₹
                {rent.toLocaleString(
                  "en-IN"
                )}

                <span
                  style={styles.perMonth}
                >
                  {" "}
                  / month
                </span>
              </div>

              {deposit > 0 && (
                <div style={styles.deposit}>
                  Security deposit: ₹
                  {deposit.toLocaleString(
                    "en-IN"
                  )}
                </div>
              )}

            </div>


            {/* INFORMATION */}

            <section style={styles.section}>

              <h2 style={styles.heading}>
                Property information
              </h2>

              <div style={styles.infoGrid}>

                <Info
                  label="Stay"
                  value={
                    property.stay ||
                    "Not specified"
                  }
                />

                <Info
                  label="Rooms"
                  value={
                    property.rooms || "—"
                  }
                />

                <Info
                  label="Bathrooms"
                  value={
                    property.bathrooms ||
                    "—"
                  }
                />

                <Info
                  label="Distance"
                  value={
                    property.distance !==
                    null
                      ? `${property.distance} km`
                      : "—"
                  }
                />

              </div>

            </section>


            {/* FACILITIES */}

            <section style={styles.section}>

              <h2 style={styles.heading}>
                Facilities
              </h2>

              <div style={styles.tags}>

                {property.wifi && (
                  <Tag text="📶 Wi-Fi" />
                )}

                {property.food && (
                  <Tag text="🍱 Food" />
                )}

                {property.furnished && (
                  <Tag text="🪑 Furnished" />
                )}

                {property.parking && (
                  <Tag text="🚗 Parking" />
                )}

                {!property.wifi &&
                  !property.food &&
                  !property.furnished &&
                  !property.parking && (
                    <Tag text="No facilities listed" />
                  )}

              </div>

            </section>


            {/* DESCRIPTION */}

            <section style={styles.section}>

              <h2 style={styles.heading}>
                About this property
              </h2>

              <p style={styles.description}>
                {property.description}
              </p>

            </section>


            {/* SECURITY */}

            <div style={styles.security}>

              <div style={styles.securityIcon}>
                🔐
              </div>

              <div>

                <div style={styles.securityTitle}>
                  AmiVest Protection
                </div>

                <div style={styles.securityText}>
                  Owner contact information should remain
                  protected until the appropriate enquiry
                  or booking workflow is completed.
                </div>

              </div>

            </div>


            {/* ACTIONS */}

            <div style={styles.actions}>

              <button
                type="button"
                style={styles.primary}
                onClick={requestBooking}
              >
                Request Booking
              </button>

              <button
                type="button"
                style={styles.secondary}
                onClick={enquire}
              >
                Enquire
              </button>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}


function Info({ label, value }) {
  return (
    <div style={styles.info}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


function Tag({ text }) {
  return (
    <span style={styles.tag}>
      {text}
    </span>
  );
}


const styles = {

  page: {
    minHeight: "100vh",
    background: "#07131f",
    color: "#fff",
    fontFamily:
      "system-ui, sans-serif",
  },

  header: {
    minHeight: 74,
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 14,
    background: "#081725",
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
  },

  back: {
    border:
      "1px solid rgba(255,255,255,.10)",
    background:
      "rgba(255,255,255,.04)",
    color: "#fff",
    borderRadius: 10,
    padding: "9px 12px",
    cursor: "pointer",
  },

  brand: {
    fontSize: 17,
    fontWeight: 900,
  },

  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding:
      "28px 18px 90px",
  },

  breadcrumb: {
    marginBottom: 15,
    color: "#607b89",
    fontSize: 10,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(300px,.9fr) minmax(0,1.1fr)",
    gap: 22,
  },

  gallery: {
    overflow: "hidden",
    borderRadius: 20,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.08)",
  },

  heroImage: {
    minHeight: 470,
    display: "grid",
    placeItems: "center",
    fontSize: 105,
    background:
      "linear-gradient(135deg,#122b3a,#0a1b28)",
  },

  galleryText: {
    padding: 12,
    color: "#718997",
    fontSize: 10,
    lineHeight: 1.5,
  },

  type: {
    color: "#66d6bb",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.4,
  },

  title: {
    margin: "10px 0 8px",
    fontSize:
      "clamp(30px,5vw,50px)",
    lineHeight: 1.05,
  },

  location: {
    color: "#718997",
    fontSize: 11,
  },

  priceCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 15,
    background:
      "rgba(24,168,112,.07)",
    border:
      "1px solid rgba(24,168,112,.15)",
  },

  price: {
    fontSize: 28,
    fontWeight: 900,
  },

  perMonth: {
    color: "#718997",
    fontSize: 12,
    fontWeight: 500,
  },

  deposit: {
    marginTop: 5,
    color: "#8ba2af",
    fontSize: 10,
  },

  section: {
    marginTop: 23,
  },

  heading: {
    margin: "0 0 10px",
    fontSize: 16,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 8,
  },

  info: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 10,
    padding: 11,
    borderRadius: 10,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.07)",
    color: "#718997",
    fontSize: 10,
  },

  tag: {
    padding: "8px 10px",
    borderRadius: 9,
    background:
      "rgba(255,255,255,.045)",
    border:
      "1px solid rgba(255,255,255,.07)",
    color: "#aec0ca",
    fontSize: 10,
  },

  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  description: {
    margin: 0,
    color: "#8aa1af",
    fontSize: 12,
    lineHeight: 1.7,
  },

  security: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 22,
    padding: 15,
    borderRadius: 14,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.07)",
  },

  securityIcon: {
    fontSize: 24,
  },

  securityTitle: {
    fontWeight: 900,
    fontSize: 12,
  },

  securityText: {
    marginTop: 5,
    color: "#718997",
    fontSize: 10,
    lineHeight: 1.5,
  },

  actions: {
    display: "flex",
    gap: 10,
    marginTop: 20,
  },

  primary: {
    flex: 1,
    padding: 13,
    border: 0,
    borderRadius: 11,
    background: "#18a870",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondary: {
    padding: "13px 17px",
    borderRadius: 11,
    border:
      "1px solid rgba(255,255,255,.10)",
    background:
      "rgba(255,255,255,.04)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
};