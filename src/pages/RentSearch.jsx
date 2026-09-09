import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const LISTINGS = [
  {
    id: 1,
    title: "Student PG near College Road",
    type: "PG",
    rent: 7500,
    deposit: 15000,
    distance: 1.2,
    verified: true,
    wifi: true,
    food: true,
    stay: "Twin Sharing",
    rooms: 2,
    bathrooms: 2,
    furnished: true,
    parking: false,
    description:
      "Student-friendly PG with Wi-Fi, food and easy access to local transport.",
  },

  {
    id: 2,
    title: "Private Room near Main Market",
    type: "Room",
    rent: 6500,
    deposit: 10000,
    distance: 1.8,
    verified: true,
    wifi: true,
    food: false,
    stay: "Private",
    rooms: 1,
    bathrooms: 1,
    furnished: true,
    parking: false,
    description:
      "Private room close to shops and daily essentials.",
  },

  {
    id: 3,
    title: "1 BHK near Bus Stand",
    type: "Flat",
    rent: 9000,
    deposit: 18000,
    distance: 2.4,
    verified: false,
    wifi: false,
    food: false,
    stay: "1 BHK",
    rooms: 1,
    bathrooms: 1,
    furnished: false,
    parking: true,
    description:
      "Compact 1 BHK suitable for long-term residential rental.",
  },
];

export default function RentSearch() {
  const navigate = useNavigate();

  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [radius, setRadius] = useState("5");
  const [type, setType] = useState("All");

  const results = useMemo(() => {
    return LISTINGS.filter((item) => {
      const typeMatch =
        type === "All" || item.type === type;

      const budgetMatch =
        !budget || item.rent <= Number(budget);

      const radiusMatch =
        item.distance <= Number(radius);

      const locationMatch =
        !location ||
        item.title
          .toLowerCase()
          .includes(location.toLowerCase());

      return (
        typeMatch &&
        budgetMatch &&
        radiusMatch &&
        locationMatch
      );
    });
  }, [location, budget, radius, type]);

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <header style={styles.header}>
        <button
          type="button"
          onClick={() => navigate("/rent")}
          style={styles.backButton}
        >
          ← Rent
        </button>

        <div>
          <div style={styles.brand}>
            🔎 Renter Interface
          </div>

          <div style={styles.caption}>
            Find PG • Room • Flat • Night Stay
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/rent/owner")}
          style={styles.ownerButton}
        >
          🏠 Owner
        </button>
      </header>


      <main style={styles.container}>

        <div style={styles.badge}>
          RENTER / TENANT
        </div>

        <h1 style={styles.title}>
          Find your next place.
        </h1>

        <p style={styles.subtitle}>
          Search by location, budget, property type and distance.
        </p>


        {/* FILTERS */}

        <section style={styles.filterBox}>

          <div>
            <label style={styles.label}>
              Location
            </label>

            <input
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
              placeholder="College / locality / city"
              style={styles.input}
            />
          </div>


          <div>
            <label style={styles.label}>
              Maximum rent
            </label>

            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) =>
                setBudget(e.target.value)
              }
              placeholder="₹8,000"
              style={styles.input}
            />
          </div>


          <div>
            <label style={styles.label}>
              Property type
            </label>

            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value)
              }
              style={styles.input}
            >
              <option>All</option>
              <option>PG</option>
              <option>Room</option>
              <option>Flat</option>
              <option>Night Stay</option>
            </select>
          </div>


          <div>
            <label style={styles.label}>
              Distance
            </label>

            <select
              value={radius}
              onChange={(e) =>
                setRadius(e.target.value)
              }
              style={styles.input}
            >
              <option value="1">1 km</option>
              <option value="3">3 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
            </select>
          </div>

        </section>


        <div style={styles.count}>
          {results.length} matching listing
          {results.length === 1 ? "" : "s"}
        </div>


        <section style={styles.content}>

          {/* LISTINGS */}

          <div style={styles.list}>

            {results.length === 0 ? (
              <div style={styles.empty}>
                No matching properties found.
              </div>
            ) : (

              results.map((item) => (

                <article
                  key={item.id}
                  style={styles.card}
                >

                  <div style={styles.photo}>
                    {item.type === "PG"
                      ? "🎓"
                      : item.type === "Room"
                      ? "🛏️"
                      : item.type === "Flat"
                      ? "🏠"
                      : "🌙"}
                  </div>


                  <div>

                    <div style={styles.cardHeader}>

                      <div>

                        <h2 style={styles.cardTitle}>
                          {item.title}
                        </h2>

                        <div style={styles.meta}>
                          {item.type} •{" "}
                          {item.distance} km away
                        </div>

                      </div>


                      {item.verified && (
                        <span style={styles.verified}>
                          ✓ Verified
                        </span>
                      )}

                    </div>


                    <div style={styles.price}>
                      ₹
                      {item.rent.toLocaleString("en-IN")}
                      /month
                    </div>


                    <div style={styles.tags}>

                      <span>
                        {item.stay}
                      </span>

                      {item.wifi && (
                        <span>📶 Wi-Fi</span>
                      )}

                      {item.food && (
                        <span>🍱 Food</span>
                      )}

                    </div>


                    <button
                      type="button"
                      style={styles.viewButton}
                      onClick={() =>
                        navigate(
                          `/rent/property/${item.id}`,
                          {
                            state: {
                              property: item,
                            },
                          }
                        )
                      }
                    >
                      View property →
                    </button>

                  </div>

                </article>

              ))
            )}

          </div>


          {/* MAP */}

          <aside style={styles.mapCard}>

            <div style={styles.mapTitle}>
              🗺️ Nearby Map
            </div>

            <div style={styles.mapSubtitle}>
              {radius} km search area
            </div>

            <div style={styles.map}>

              <span style={styles.you}>
                📍
              </span>

              <span
                style={{
                  ...styles.pin,
                  left: "20%",
                  top: "25%",
                }}
              >
                🏠
              </span>

              <span
                style={{
                  ...styles.pin,
                  left: "65%",
                  top: "34%",
                }}
              >
                🛏️
              </span>

              <span
                style={{
                  ...styles.pin,
                  left: "43%",
                  top: "70%",
                }}
              >
                🎓
              </span>

            </div>

            <p style={styles.mapNote}>
              Real map coordinates and 3D maps will be connected
              after the rental backend is ready.
            </p>

          </aside>

        </section>

      </main>

    </div>
  );
}


const styles = {

  page: {
    minHeight: "100vh",
    background: "#07131f",
    color: "#fff",
    fontFamily: "system-ui, sans-serif",
  },

  header: {
    minHeight: 74,
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "#081725",
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
  },

  backButton: {
    padding: "9px 12px",
    borderRadius: 10,
    border:
      "1px solid rgba(255,255,255,.09)",
    background:
      "rgba(255,255,255,.04)",
    color: "#fff",
    cursor: "pointer",
  },

  brand: {
    fontWeight: 900,
    fontSize: 16,
  },

  caption: {
    marginTop: 3,
    fontSize: 10,
    color: "#718997",
  },

  ownerButton: {
    padding: "9px 12px",
    borderRadius: 10,
    border:
      "1px solid rgba(24,168,112,.35)",
    background:
      "rgba(24,168,112,.08)",
    color: "#70d8bd",
    cursor: "pointer",
    fontWeight: 800,
  },

  container: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "30px 18px 90px",
  },

  badge: {
    color: "#66d6bb",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.4,
  },

  title: {
    margin: "10px 0 7px",
    fontSize:
      "clamp(34px, 5vw, 54px)",
  },

  subtitle: {
    color: "#879eac",
    fontSize: 13,
    lineHeight: 1.6,
  },

  filterBox: {
    marginTop: 22,
    padding: 15,
    display: "grid",
    gridTemplateColumns:
      "2fr 1fr 140px 110px",
    gap: 10,
    borderRadius: 17,
    background:
      "rgba(255,255,255,.04)",
    border:
      "1px solid rgba(255,255,255,.08)",
  },

  label: {
    display: "block",
    marginBottom: 5,
    color: "#718997",
    fontSize: 9,
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 11,
    borderRadius: 10,
    border:
      "1px solid rgba(255,255,255,.09)",
    background: "#0a1b29",
    color: "#fff",
    outline: 0,
  },

  count: {
    marginTop: 18,
    color: "#78909e",
    fontSize: 11,
  },

  content: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.5fr) minmax(280px,.8fr)",
    gap: 16,
    marginTop: 12,
  },

  list: {
    display: "grid",
    gap: 12,
  },

  card: {
    display: "grid",
    gridTemplateColumns:
      "145px minmax(0,1fr)",
    gap: 14,
    padding: 13,
    borderRadius: 16,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.08)",
  },

  photo: {
    minHeight: 140,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#122b3a,#0a1b28)",
    fontSize: 42,
  },

  cardHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 10,
  },

  cardTitle: {
    margin: 0,
    fontSize: 15,
  },

  meta: {
    marginTop: 5,
    color: "#718997",
    fontSize: 10,
  },

  verified: {
    color: "#70d8bd",
    fontSize: 9,
    fontWeight: 900,
  },

  price: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: 900,
  },

  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    color: "#a5bac4",
    fontSize: 10,
  },

  viewButton: {
    marginTop: 15,
    padding:
      "9px 12px",
    borderRadius: 10,
    border:
      "1px solid rgba(255,255,255,.09)",
    background:
      "rgba(255,255,255,.04)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },

  mapCard: {
    padding: 15,
    borderRadius: 16,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.08)",
  },

  mapTitle: {
    fontWeight: 900,
    fontSize: 14,
  },

  mapSubtitle: {
    marginTop: 4,
    color: "#718997",
    fontSize: 9,
  },

  map: {
    position: "relative",
    height: 410,
    marginTop: 10,
    borderRadius: 13,
    overflow: "hidden",
    background:
      "linear-gradient(135deg,#102a39,#0a1b29)",
  },

  you: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform:
      "translate(-50%,-50%)",
    fontSize: 23,
  },

  pin: {
    position: "absolute",
    fontSize: 22,
  },

  mapNote: {
    color: "#718997",
    fontSize: 9,
    lineHeight: 1.5,
  },

  empty: {
    padding: 30,
    textAlign: "center",
    color: "#718997",
    borderRadius: 14,
    background:
      "rgba(255,255,255,.03)",
  },
};