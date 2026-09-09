import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const properties = [
  {
    id: 1,
    name: "Comfort Student PG",
    type: "PG",
    location: "Pipcho Main Road",
    distance: "0.8 km",
    rent: 4500,
    deposit: 4500,
    gender: "Male",
    vacant: 4,
    rating: 4.7,
    verified: true,
    amenities: [
      "WiFi",
      "AC",
      "Bed",
      "Table",
      "Chair",
      "CCTV",
    ],
  },
  {
    id: 2,
    name: "Modern Student Hostel",
    type: "Hostel",
    location: "Station Road",
    distance: "1.2 km",
    rent: 5500,
    deposit: 5500,
    gender: "Anyone",
    vacant: 7,
    rating: 4.5,
    verified: true,
    amenities: [
      "WiFi",
      "Food",
      "Laundry",
      "CCTV",
    ],
  },
  {
    id: 3,
    name: "City Center 1BHK",
    type: "Flat",
    location: "City Center",
    distance: "2.1 km",
    rent: 9000,
    deposit: 18000,
    gender: "Family",
    vacant: 1,
    rating: 4.8,
    verified: true,
    amenities: [
      "Parking",
      "Kitchen",
      "Balcony",
      "Water",
    ],
  },
];


export default function RentRenterDashboard() {

  const navigate = useNavigate();

  const [tab, setTab] =
    useState("search");

  const [search, setSearch] =
    useState("");

  const [selectedProperty, setSelectedProperty] =
    useState(null);


  const filtered =
    properties.filter(
      (property) =>
        property.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        property.location
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );


  return (

    <div className="renter-app">

      {/* HEADER */}

      <header className="renter-header">

        <div className="renter-brand">

          <button
            onClick={() =>
              navigate("/rent")
            }
          >
            ←
          </button>

          <div>

            <strong>
              AmiRent
            </strong>

            <small>
              Renter Dashboard
            </small>

          </div>

        </div>


        <div className="renter-user">

          <span>
            ✓
          </span>

          <div>
            <strong>
              Verified User
            </strong>

            <small>
              Secure account
            </small>
          </div>

        </div>

      </header>


      <div className="renter-layout">

        {/* SIDEBAR */}

        <aside className="renter-sidebar">

          <button
            className={
              tab === "search"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("search")
            }
          >
            🔎 Find Property
          </button>


          <button
            className={
              tab === "applications"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("applications")
            }
          >
            📋 Applications
          </button>


          <button
            className={
              tab === "home"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("home")
            }
          >
            🏠 My Stay
          </button>


          <button
            className={
              tab === "payments"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("payments")
            }
          >
            💰 Payments
          </button>


          <button
            className={
              tab === "electricity"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("electricity")
            }
          >
            ⚡ Electricity
          </button>


          <button
            className={
              tab === "messages"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("messages")
            }
          >
            💬 Messages
          </button>


          <button
            className={
              tab === "documents"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("documents")
            }
          >
            📄 My Documents
          </button>


          <button
            className={
              tab === "profile"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("profile")
            }
          >
            👤 Profile
          </button>

        </aside>


        {/* CONTENT */}

        <main className="renter-main">


          {/* SEARCH */}

          {tab === "search" && (

            <>

              <div className="renter-heading">

                <div>

                  <div className="renter-label">
                    AMIRENT SEARCH
                  </div>

                  <h1>
                    Find your next home.
                  </h1>

                  <p>
                    Search verified PGs,
                    rooms, flats and stays.
                  </p>

                </div>

              </div>


              <div className="renter-search">

                🔎

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search locality, PG, room or flat..."
                />

                <button>
                  Search
                </button>

              </div>


              <div className="renter-map">

                <div className="map-placeholder">

                  <div className="fake-road road1" />
                  <div className="fake-road road2" />
                  <div className="fake-road road3" />

                  <span className="map-pin pin1">
                    ₹4.5k
                  </span>

                  <span className="map-pin pin2">
                    ₹5.5k
                  </span>

                  <span className="map-pin pin3">
                    ₹9k
                  </span>

                  <strong>
                    📍 Explore properties around Pipcho
                  </strong>

                </div>

              </div>


              <div className="property-results">

                <div className="results-header">

                  <strong>
                    {filtered.length}
                    {" "}properties found
                  </strong>

                  <button>
                    ⚙ Filters
                  </button>

                </div>


                {filtered.map(
                  (property) => (

                    <article
                      className="renter-property"
                      key={property.id}
                    >

                      <div className="property-image-placeholder">
                        🏠
                      </div>


                      <div className="renter-property-info">

                        <div className="property-name-row">

                          <h2>
                            {property.name}
                          </h2>

                          {property.verified && (
                            <span className="verified">
                              ✓ Verified
                            </span>
                          )}

                        </div>


                        <p>
                          📍 {property.location}
                          {" • "}
                          {property.distance}
                        </p>


                        <div className="property-rating">
                          ★ {property.rating}
                        </div>


                        <div className="rent-price">
                          ₹{property.rent.toLocaleString()}
                          <small>
                            / month
                          </small>
                        </div>


                        <div className="property-info-tags">

                          <span>
                            🏠 {property.type}
                          </span>

                          <span>
                            👤 {property.gender}
                          </span>

                          <span className="vacant">
                            🚪 {property.vacant} vacant
                          </span>

                        </div>


                        <div className="property-amenities">

                          {property.amenities.map(
                            (amenity) => (
                              <span key={amenity}>
                                ✓ {amenity}
                              </span>
                            )
                          )}

                        </div>


                        <div className="renter-actions">

                          <button>
                            💬 Message
                          </button>

                          <button
                            className="apply-button"
                            onClick={() =>
                              setSelectedProperty(
                                property
                              )
                            }
                          >
                            Apply →
                          </button>

                        </div>

                      </div>

                    </article>

                  )
                )}

              </div>

            </>

          )}


          {/* APPLICATIONS */}

          {tab === "applications" && (

            <DashboardBox
              title="My Applications"
              subtitle="Track your rental applications"
            >

              <div className="application-item">

                <div>
                  <strong>
                    Comfort Student PG
                  </strong>

                  <span>
                    Room 101 • Application submitted
                  </span>
                </div>

                <b>
                  Under Review
                </b>

              </div>

            </DashboardBox>

          )}


          {/* MY STAY */}

          {tab === "home" && (

            <DashboardBox
              title="My Stay"
              subtitle="Current rental information"
            >

              <div className="stay-card">

                <div className="stay-icon">
                  🏠
                </div>

                <div>

                  <strong>
                    Comfort Student PG
                  </strong>

                  <span>
                    Room 101
                  </span>

                  <span>
                    ₹4,500 / month
                  </span>

                  <div className="stay-tags">

                    <span>
                      ✓ Agreement Active
                    </span>

                    <span>
                      ✓ Payment Active
                    </span>

                    <span>
                      ✓ Identity Verified
                    </span>

                  </div>

                </div>

              </div>

            </DashboardBox>

          )}


          {/* PAYMENTS */}

          {tab === "payments" && (

            <DashboardBox
              title="Payments"
              subtitle="Your monthly rental transactions"
            >

              <div className="transaction">

                <div>
                  <strong>
                    August Rent
                  </strong>

                  <small>
                    Room 101
                  </small>
                </div>

                <strong>
                  ₹4,500
                </strong>

                <b className="payment-paid">
                  ✓ Paid
                </b>

              </div>


              <div className="transaction">

                <div>
                  <strong>
                    Security Deposit
                  </strong>

                  <small>
                    Rental agreement
                  </small>
                </div>

                <strong>
                  ₹4,500
                </strong>

                <b className="payment-paid">
                  ✓ Paid
                </b>

              </div>

            </DashboardBox>

          )}


          {/* ELECTRICITY */}

          {tab === "electricity" && (

            <DashboardBox
              title="Electricity"
              subtitle="Your monthly electricity records"
            >

              <div className="electricity-user-card">

                <div>
                  <span>
                    August 2026
                  </span>

                  <strong>
                    ₹720
                  </strong>

                  <small>
                    Meter reading: 1250 → 1340
                  </small>

                </div>

                <b>
                  Proof Available
                </b>

              </div>

            </DashboardBox>

          )}


          {/* MESSAGES */}

          {tab === "messages" && (

            <DashboardBox
              title="Messages"
              subtitle="Communicate with property owners"
            >

              <div className="chat-box">

                <div className="chat-message received">
                  Hello, is Room 101 still available?
                </div>

                <div className="chat-message sent">
                  Yes, it is available.
                </div>

                <div className="chat-input">

                  <input
                    placeholder="Write a message..."
                  />

                  <button>
                    Send
                  </button>

                </div>

              </div>

            </DashboardBox>

          )}


          {/* DOCUMENTS */}

          {tab === "documents" && (

            <DashboardBox
              title="My Documents"
              subtitle="Securely submitted rental documents"
            >

              <DocumentRow
                title="Identity Verification"
                status="Verified"
              />

              <DocumentRow
                title="Rental Agreement"
                status="Active"
              />

              <DocumentRow
                title="Payment Verification"
                status="Complete"
              />

            </DashboardBox>

          )}


          {/* PROFILE */}

          {tab === "profile" && (

            <DashboardBox
              title="My Profile"
              subtitle="Account information"
            >

              <div className="profile-box">

                <div className="profile-avatar">
                  👤
                </div>

                <div>

                  <strong>
                    Verified AmiVest User
                  </strong>

                  <span>
                    Mobile verified ✓
                  </span>

                  <span>
                    AmiRent profile active ✓
                  </span>

                </div>

              </div>

            </DashboardBox>

          )}

        </main>

      </div>


      {/* APPLICATION MODAL */}

      {selectedProperty && (

        <div className="modal-background">

          <div className="application-modal">

            <button
              className="close-modal"
              onClick={() =>
                setSelectedProperty(null)
              }
            >
              ×
            </button>

            <div className="renter-label">
              RENTAL APPLICATION
            </div>

            <h2>
              Apply for
              {" "}
              {selectedProperty.name}
            </h2>

            <p>
              You are applying for a property
              with ₹
              {selectedProperty.rent}
              {" "}/ month rent.
            </p>


            <div className="application-step">

              <span>
                1
              </span>

              Identity Verification

              <b>
                Required
              </b>

            </div>


            <div className="application-step">

              <span>
                2
              </span>

              Owner Approval

              <b>
                Pending
              </b>

            </div>


            <div className="application-step">

              <span>
                3
              </span>

              Agreement & Payment

              <b>
                After approval
              </b>

            </div>


            <button
              className="submit-application"
              onClick={() => {

                alert(
                  "Application submitted. Owner approval is required before payment."
                );

                setSelectedProperty(null);

              }}
            >
              Submit Application →
            </button>

          </div>

        </div>

      )}


      <style>{`

        .renter-app {
          min-height: 100vh;
          background: #f5f8f7;
          color: #17262d;
          font-family: system-ui, sans-serif;
        }

        .renter-header {
          height: 68px;
          background: white;
          border-bottom: 1px solid #e1e7e6;
          padding: 0 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .renter-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .renter-brand button {
          width: 34px;
          height: 34px;
          border: 0;
          background: #f2f5f5;
          border-radius: 8px;
          cursor: pointer;
        }

        .renter-brand strong,
        .renter-user strong {
          display: block;
          font-size: 11px;
        }

        .renter-brand small,
        .renter-user small {
          display: block;
          margin-top: 2px;
          color: #89969b;
          font-size: 7px;
        }

        .renter-user {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .renter-user > span {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eaf8f3;
          color: #07855f;
        }

        .renter-layout {
          display: grid;
          grid-template-columns: 205px 1fr;
        }

        .renter-sidebar {
          min-height: calc(100vh - 68px);
          background: white;
          border-right: 1px solid #e1e7e6;
          padding: 15px 10px;
        }

        .renter-sidebar button {
          width: 100%;
          padding: 11px;
          border: 0;
          background: white;
          border-radius: 8px;
          text-align: left;
          color: #64737a;
          font-size: 8px;
          cursor: pointer;
          margin-bottom: 3px;
        }

        .renter-sidebar button.active,
        .renter-sidebar button:hover {
          background: #eaf8f3;
          color: #07855f;
          font-weight: 900;
        }

        .renter-main {
          max-width: 1200px;
          width: 100%;
          margin: auto;
          padding: 30px;
        }

        .renter-label {
          color: #07855f;
          font-size: 8px;
          letter-spacing: 1.5px;
          font-weight: 950;
        }

        .renter-heading h1 {
          margin: 5px 0;
          font-size: 30px;
          letter-spacing: -1.5px;
        }

        .renter-heading p {
          color: #89969b;
          font-size: 9px;
        }

        .renter-search {
          height: 48px;
          background: white;
          border: 1px solid #dce5e3;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 5px 7px 5px 13px;
          margin: 20px 0;
        }

        .renter-search input {
          flex: 1;
          border: 0;
          outline: 0;
          font-size: 9px;
        }

        .renter-search button {
          height: 37px;
          padding: 0 18px;
          border: 0;
          border-radius: 7px;
          background: #07855f;
          color: white;
          cursor: pointer;
          font-size: 8px;
          font-weight: 900;
        }

        .renter-map {
          height: 220px;
          background: white;
          border: 1px solid #e0e6e7;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 15px;
        }

        .map-placeholder {
          position: relative;
          height: 100%;
          background:
            repeating-linear-gradient(
              45deg,
              #edf2ed,
              #edf2ed 20px,
              #e6ece6 20px,
              #e6ece6 40px
            );
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 18px;
        }

        .fake-road {
          position: absolute;
          background: rgba(255,255,255,.9);
        }

        .road1 {
          width: 110%;
          height: 22px;
          top: 45%;
          transform: rotate(-12deg);
        }

        .road2 {
          width: 22px;
          height: 120%;
          left: 40%;
          transform: rotate(17deg);
        }

        .road3 {
          width: 90%;
          height: 14px;
          top: 65%;
          transform: rotate(9deg);
        }

        .map-pin {
          position: absolute;
          background: #07855f;
          color: white;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 7px;
          font-weight: 900;
          box-shadow: 0 3px 10px rgba(0,0,0,.18);
        }

        .pin1 {
          left: 25%;
          top: 30%;
        }

        .pin2 {
          left: 52%;
          top: 52%;
        }

        .pin3 {
          right: 15%;
          top: 25%;
        }

        .map-placeholder > strong {
          position: relative;
          background: white;
          padding: 7px 10px;
          border-radius: 7px;
          font-size: 8px;
          z-index: 5;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .results-header strong {
          font-size: 11px;
        }

        .results-header button {
          border: 1px solid #dce4e3;
          background: white;
          border-radius: 7px;
          padding: 8px;
          font-size: 8px;
          cursor: pointer;
        }

        .renter-property {
          display: grid;
          grid-template-columns: 200px 1fr;
          background: white;
          border: 1px solid #e0e6e7;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .property-image-placeholder {
          min-height: 230px;
          background: #e7eeeb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 45px;
        }

        .renter-property-info {
          padding: 15px;
        }

        .property-name-row {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .property-name-row h2 {
          margin: 0;
          font-size: 15px;
        }

        .verified {
          padding: 4px 6px;
          border-radius: 5px;
          background: #eaf8f3;
          color: #07855f;
          font-size: 7px;
          font-weight: 900;
        }

        .renter-property-info > p {
          color: #7d8b91;
          font-size: 8px;
        }

        .property-rating {
          color: #db951f;
          font-size: 9px;
        }

        .rent-price {
          margin-top: 10px;
          color: #07855f;
          font-size: 19px;
          font-weight: 950;
        }

        .rent-price small {
          color: #89969b;
          font-size: 8px;
          font-weight: 400;
        }

        .property-info-tags,
        .property-amenities {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
        }

        .property-info-tags span {
          background: #f3f6f6;
          border-radius: 5px;
          padding: 5px 7px;
          color: #65737a;
          font-size: 7px;
        }

        .property-info-tags .vacant {
          background: #eaf8f3;
          color: #07855f;
        }

        .property-amenities span {
          color: #738087;
          font-size: 7px;
        }

        .renter-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          margin-top: 12px;
        }

        .renter-actions button {
          border: 1px solid #dce4e3;
          background: white;
          border-radius: 7px;
          padding: 8px 11px;
          font-size: 8px;
          cursor: pointer;
        }

        .renter-actions .apply-button {
          background: #07855f;
          border-color: #07855f;
          color: white;
          font-weight: 900;
        }

        .application-item,
        .transaction,
        .electricity-user-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border: 1px solid #e0e6e7;
          border-radius: 9px;
          margin-bottom: 8px;
        }

        .application-item strong,
        .application-item span,
        .transaction strong,
        .transaction small,
        .electricity-user-card span,
        .electricity-user-card strong,
        .electricity-user-card small {
          display: block;
        }

        .application-item strong,
        .transaction strong {
          font-size: 10px;
        }

        .application-item span,
        .transaction small,
        .electricity-user-card small {
          color: #89969b;
          font-size: 7px;
          margin-top: 3px;
        }

        .application-item b {
          color: #b17622;
          background: #fff4e3;
          padding: 6px 8px;
          border-radius: 5px;
          font-size: 7px;
        }

        .stay-card,
        .profile-box {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 18px;
          background: #f5f8f7;
          border-radius: 10px;
        }

        .stay-icon {
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 10px;
          font-size: 25px;
        }

        .stay-card strong,
        .stay-card span,
        .profile-box strong,
        .profile-box span {
          display: block;
        }

        .stay-card strong,
        .profile-box strong {
          font-size: 11px;
        }

        .stay-card span,
        .profile-box span {
          margin-top: 3px;
          color: #89969b;
          font-size: 8px;
        }

        .stay-tags {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .stay-tags span {
          background: #eaf8f3;
          color: #07855f;
          padding: 4px 6px;
          border-radius: 5px;
          font-size: 7px;
        }

        .payment-paid {
          color: #07855f;
          background: #eaf8f3;
          padding: 6px 8px;
          border-radius: 5px;
          font-size: 7px;
        }

        .chat-box {
          min-height: 350px;
          background: #f4f7f6;
          padding: 15px;
          border-radius: 10px;
        }

        .chat-message {
          max-width: 70%;
          padding: 9px;
          border-radius: 8px;
          font-size: 8px;
          margin-bottom: 8px;
        }

        .chat-message.received {
          background: white;
        }

        .chat-message.sent {
          margin-left: auto;
          background: #dcf2e9;
        }

        .chat-input {
          display: flex;
          gap: 5px;
          margin-top: 215px;
        }

        .chat-input input {
          flex: 1;
          border: 1px solid #dce4e3;
          border-radius: 7px;
          padding: 9px;
        }

        .chat-input button {
          border: 0;
          background: #07855f;
          color: white;
          border-radius: 7px;
          padding: 0 15px;
        }

        .document-row {
          display: flex;
          justify-content: space-between;
          padding: 13px;
          border: 1px solid #e1e7e7;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .document-row strong {
          font-size: 9px;
        }

        .document-row span {
          color: #07855f;
          font-size: 8px;
          font-weight: 900;
        }

        .profile-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .modal-background {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 15px;
        }

        .application-modal {
          width: min(450px,100%);
          background: white;
          border-radius: 15px;
          padding: 25px;
          position: relative;
        }

        .close-modal {
          position: absolute;
          right: 13px;
          top: 13px;
          border: 0;
          background: #f2f5f5;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          cursor: pointer;
          font-size: 18px;
        }

        .application-modal h2 {
          margin: 8px 0;
          font-size: 19px;
        }

        .application-modal > p {
          color: #89969b;
          font-size: 8px;
          line-height: 1.5;
        }

        .application-step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px;
          background: #f5f8f7;
          border-radius: 8px;
          margin-top: 7px;
          font-size: 8px;
        }

        .application-step span {
          width: 22px;
          height: 22px;
          background: #eaf8f3;
          color: #07855f;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .application-step b {
          margin-left: auto;
          font-size: 7px;
          color: #89969b;
        }

        .submit-application {
          width: 100%;
          margin-top: 15px;
          border: 0;
          background: #07855f;
          color: white;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          font-weight: 900;
          font-size: 9px;
        }

        @media(max-width:800px) {

          .renter-layout {
            grid-template-columns: 1fr;
          }

          .renter-sidebar {
            min-height: auto;
            display: flex;
            overflow-x: auto;
            border-right: 0;
            border-bottom: 1px solid #e1e7e6;
          }

          .renter-sidebar button {
            min-width: 110px;
          }

          .renter-main {
            padding: 15px;
          }

          .renter-property {
            grid-template-columns: 1fr;
          }

          .property-image-placeholder {
            min-height: 180px;
          }

        }

      `}</style>

    </div>
  );
}


function DashboardBox({
  title,
  subtitle,
  children,
}) {

  return (
    <section className="dashboard-section">

      <div className="section-title">

        <strong>
          {title}
        </strong>

        <span>
          {subtitle}
        </span>

      </div>

      {children}

    </section>
  );
}


function DocumentRow({
  title,
  status,
}) {

  return (
    <div className="document-row">

      <strong>
        📄 {title}
      </strong>

      <span>
        ✓ {status}
      </span>

    </div>
  );
}