import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RentOwner() {
  const navigate = useNavigate();

  const [propertyType, setPropertyType] = useState("PG");
  const [propertyTitle, setPropertyTitle] = useState("");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [photos, setPhotos] = useState([]);

  const submitForm = (e) => {
    e.preventDefault();

    if (
      !propertyTitle ||
      !city ||
      !locality ||
      !rent ||
      !ownerName ||
      !phone
    ) {
      alert("Please fill all required fields.");
      return;
    }

    alert("Property submitted for verification.");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07131f",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          height: 74,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#081725",
          borderBottom:
            "1px solid rgba(255,255,255,.08)",
        }}
      >
        <button
          onClick={() => navigate("/rent")}
          style={buttonSecondary}
        >
          ← Rent
        </button>

        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
          }}
        >
          🏠 AmiVest Rent — Owner
        </div>

        <div
          style={{
            color: "#6ed8bd",
            fontSize: 10,
            fontWeight: 900,
          }}
        >
          🔐 OWNER
        </div>
      </header>

      <main
        style={{
          maxWidth: 850,
          margin: "0 auto",
          padding: "35px 20px 80px",
        }}
      >
        <div
          style={{
            color: "#66d7bc",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 1.5,
          }}
        >
          OWNER CENTER
        </div>

        <h1
          style={{
            fontSize: "clamp(34px,5vw,52px)",
            margin: "12px 0 8px",
          }}
        >
          List your property
        </h1>

        <p
          style={{
            color: "#8ca3b2",
            lineHeight: 1.7,
            fontSize: 13,
          }}
        >
          This interface is only for property owners.
          Renters use a separate interface.
        </p>

        <form
          onSubmit={submitForm}
          style={{
            marginTop: 25,
            padding: 24,
            borderRadius: 20,
            background: "rgba(255,255,255,.04)",
            border:
              "1px solid rgba(255,255,255,.08)",
          }}
        >
          <h2 style={sectionTitle}>
            Property information
          </h2>

          <label style={label}>
            Property title *

            <input
              value={propertyTitle}
              onChange={(e) =>
                setPropertyTitle(e.target.value)
              }
              placeholder="Student PG near college"
              style={input}
            />
          </label>

          <label style={label}>
            Property type

            <select
              value={propertyType}
              onChange={(e) =>
                setPropertyType(e.target.value)
              }
              style={input}
            >
              <option>PG</option>
              <option>Room</option>
              <option>Flat</option>
              <option>Night Stay</option>
            </select>
          </label>

          <div style={twoColumns}>
            <label style={label}>
              City *

              <input
                value={city}
                onChange={(e) =>
                  setCity(e.target.value)
                }
                placeholder="Hazaribagh"
                style={input}
              />
            </label>

            <label style={label}>
              Locality *

              <input
                value={locality}
                onChange={(e) =>
                  setLocality(e.target.value)
                }
                placeholder="Pipcho"
                style={input}
              />
            </label>
          </div>

          <div style={twoColumns}>
            <label style={label}>
              Monthly rent *

              <input
                type="number"
                value={rent}
                onChange={(e) =>
                  setRent(e.target.value)
                }
                placeholder="8000"
                style={input}
              />
            </label>

            <label style={label}>
              Security deposit

              <input
                type="number"
                value={deposit}
                onChange={(e) =>
                  setDeposit(e.target.value)
                }
                placeholder="16000"
                style={input}
              />
            </label>
          </div>

          <label style={label}>
            Property photos

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) =>
                setPhotos(
                  Array.from(e.target.files || [])
                )
              }
              style={{
                display: "block",
                marginTop: 8,
              }}
            />

            <div
              style={{
                marginTop: 7,
                color: "#718997",
                fontSize: 10,
              }}
            >
              {photos.length > 0
                ? `${photos.length} photo(s) selected`
                : "No photos selected"}
            </div>
          </label>

          <h2
            style={{
              ...sectionTitle,
              marginTop: 25,
            }}
          >
            Owner information
          </h2>

          <label style={label}>
            Owner name *

            <input
              value={ownerName}
              onChange={(e) =>
                setOwnerName(e.target.value)
              }
              placeholder="Full name"
              style={input}
            />
          </label>

          <label style={label}>
            Phone *

            <input
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              placeholder="10-digit phone number"
              style={input}
            />
          </label>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background:
                "rgba(24,168,112,.07)",
              border:
                "1px solid rgba(24,168,112,.18)",
              color: "#8ca3b2",
              fontSize: 11,
              lineHeight: 1.6,
            }}
          >
            🔐 Owner verification
            <br />
            Phone OTP, identity verification and property
            verification will be connected to the backend.
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              marginTop: 20,
              padding: 14,
              border: 0,
              borderRadius: 12,
              background: "#18a870",
              color: "#ffffff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Submit Property →
          </button>
        </form>
      </main>
    </div>
  );
}

const label = {
  display: "block",
  marginBottom: 16,
  color: "#b9c9d1",
  fontSize: 11,
  fontWeight: 700,
};

const input = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 7,
  padding: 12,
  borderRadius: 10,
  border:
    "1px solid rgba(255,255,255,.10)",
  background: "#0a1b29",
  color: "#ffffff",
  outline: "none",
};

const twoColumns = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  gap: 12,
};

const sectionTitle = {
  margin: "0 0 18px",
  fontSize: 17,
};

const buttonSecondary = {
  padding: "9px 13px",
  borderRadius: 10,
  border:
    "1px solid rgba(255,255,255,.10)",
  background: "rgba(255,255,255,.04)",
  color: "#ffffff",
  cursor: "pointer",
};