import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RentOwnerDashboard() {

  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState("overview");

  const [propertyAdded, setPropertyAdded] =
    useState(false);

  const [rooms, setRooms] = useState([
    {
      room: "101",
      type: "Single",
      rent: 4500,
      status: "Occupied",
      tenant: "Verified Tenant",
      payment: "Paid",
    },
    {
      room: "102",
      type: "Double",
      rent: 5000,
      status: "Vacant",
      tenant: "-",
      payment: "-",
    },
    {
      room: "103",
      type: "Single",
      rent: 4500,
      status: "Occupied",
      tenant: "Verified Tenant",
      payment: "Paid",
    },
    {
      room: "104",
      type: "Double",
      rent: 5000,
      status: "Vacant",
      tenant: "-",
      payment: "-",
    },
  ]);


  const occupied =
    rooms.filter(
      (room) =>
        room.status === "Occupied"
    ).length;


  const vacant =
    rooms.filter(
      (room) =>
        room.status === "Vacant"
    ).length;


  const totalRent =
    rooms
      .filter(
        (room) =>
          room.status === "Occupied"
      )
      .reduce(
        (sum, room) =>
          sum + room.rent,
        0
      );


  const addRoom = () => {

    const newNumber =
      100 + rooms.length + 1;

    setRooms([
      ...rooms,
      {
        room: String(newNumber),
        type: "Single",
        rent: 4500,
        status: "Vacant",
        tenant: "-",
        payment: "-",
      },
    ]);

  };


  return (

    <div className="owner-dashboard">

      {/* HEADER */}

      <header className="owner-header">

        <div className="owner-brand">

          <button
            onClick={() =>
              navigate("/rent")
            }
          >
            ←
          </button>

          <div>

            <strong>
              AmiRent Owner
            </strong>

            <small>
              Property Management Center
            </small>

          </div>

        </div>


        <div className="owner-account">

          <div className="verification-dot">
            ✓
          </div>

          <div>
            <strong>
              Verified Owner
            </strong>

            <small>
              Account secure
            </small>
          </div>

        </div>

      </header>


      {/* BODY */}

      <div className="owner-layout">


        {/* SIDEBAR */}

        <aside className="owner-sidebar">

          <button
            className={
              activeTab === "overview"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("overview")
            }
          >
            📊 Overview
          </button>


          <button
            className={
              activeTab === "property"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("property")
            }
          >
            🏠 Property
          </button>


          <button
            className={
              activeTab === "rooms"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("rooms")
            }
          >
            🚪 Rooms
          </button>


          <button
            className={
              activeTab === "tenants"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("tenants")
            }
          >
            👤 Tenants
          </button>


          <button
            className={
              activeTab === "payments"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("payments")
            }
          >
            💰 Payments
          </button>


          <button
            className={
              activeTab === "electricity"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("electricity")
            }
          >
            ⚡ Electricity
          </button>


          <button
            className={
              activeTab === "messages"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("messages")
            }
          >
            💬 Messages
          </button>


          <button
            className={
              activeTab === "documents"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("documents")
            }
          >
            📄 Documents
          </button>


          <button
            className={
              activeTab === "settings"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("settings")
            }
          >
            ⚙️ Settings
          </button>

        </aside>


        {/* MAIN */}

        <main className="owner-main">

          {/* OVERVIEW */}

          {activeTab === "overview" && (

            <>

              <div className="owner-welcome">

                <div>

                  <div className="owner-label">
                    OWNER DASHBOARD
                  </div>

                  <h1>
                    Good morning, Owner 👋
                  </h1>

                  <p>
                    Manage your property,
                    rooms, tenants and payments
                    from one place.
                  </p>

                </div>

                <button
                  onClick={() =>
                    setActiveTab("property")
                  }
                  className="add-property-button"
                >
                  + Add Property
                </button>

              </div>


              {/* STATS */}

              <div className="owner-stats">

                <div>
                  <span>
                    🏠 Properties
                  </span>

                  <strong>
                    1
                  </strong>

                  <small>
                    Active listing
                  </small>
                </div>


                <div>
                  <span>
                    🚪 Occupied
                  </span>

                  <strong>
                    {occupied}
                  </strong>

                  <small>
                    Active tenants
                  </small>
                </div>


                <div>
                  <span>
                    🟢 Vacant
                  </span>

                  <strong>
                    {vacant}
                  </strong>

                  <small>
                    Available rooms
                  </small>
                </div>


                <div>
                  <span>
                    💰 Monthly Revenue
                  </span>

                  <strong>
                    ₹{totalRent.toLocaleString()}
                  </strong>

                  <small>
                    Expected
                  </small>
                </div>

              </div>


              {/* PROPERTY */}

              <section className="owner-card">

                <div className="owner-card-header">

                  <div>

                    <strong>
                      My Property
                    </strong>

                    <small>
                      Current listing
                    </small>

                  </div>

                  <span className="verified-pill">
                    ✓ Verified
                  </span>

                </div>


                <div className="property-summary">

                  <div className="property-photo">
                    🏠
                  </div>

                  <div>

                    <h3>
                      Comfort Student PG
                    </h3>

                    <p>
                      📍 Pipcho Main Road
                    </p>

                    <div className="summary-tags">

                      <span>
                        PG
                      </span>

                      <span>
                        4 Rooms
                      </span>

                      <span>
                        Male
                      </span>

                      <span>
                        WiFi
                      </span>

                      <span>
                        AC
                      </span>

                    </div>

                  </div>

                </div>

              </section>


              {/* ROOMS */}

              <section className="owner-card">

                <div className="owner-card-header">

                  <div>

                    <strong>
                      Room Status
                    </strong>

                    <small>
                      Live occupancy
                    </small>

                  </div>

                  <button
                    onClick={() =>
                      setActiveTab("rooms")
                    }
                  >
                    View All →
                  </button>

                </div>


                <div className="room-grid">

                  {rooms.map(
                    (room) => (

                      <div
                        className={
                          room.status === "Occupied"
                            ? "room-mini occupied"
                            : "room-mini vacant"
                        }
                        key={room.room}
                      >

                        <strong>
                          Room {room.room}
                        </strong>

                        <span>
                          {room.type}
                        </span>

                        <b>
                          {room.status}
                        </b>

                      </div>

                    )
                  )}

                </div>

              </section>


              {/* PAYMENT */}

              <section className="owner-card">

                <div className="owner-card-header">

                  <div>

                    <strong>
                      Payment Overview
                    </strong>

                    <small>
                      Current month
                    </small>

                  </div>

                  <button
                    onClick={() =>
                      setActiveTab("payments")
                    }
                  >
                    Payments →
                  </button>

                </div>


                <div className="payment-overview">

                  <div>

                    <span>
                      Collected
                    </span>

                    <strong>
                      ₹{totalRent.toLocaleString()}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Pending
                    </span>

                    <strong>
                      ₹0
                    </strong>

                  </div>


                  <div>

                    <span>
                      Electricity
                    </span>

                    <strong>
                      ₹1,240
                    </strong>

                  </div>

                </div>

              </section>

            </>

          )}


          {/* PROPERTY */}

          {activeTab === "property" && (

            <section className="dashboard-section">

              <SectionTitle
                title="Property Management"
                subtitle="Manage your property listing"
              />


              <div className="property-management">

                <div className="property-big-photo">
                  🏠
                </div>

                <div>

                  <h2>
                    Comfort Student PG
                  </h2>

                  <p>
                    Pipcho Main Road
                  </p>

                  <div className="property-actions">

                    <button>
                      Edit Details
                    </button>

                    <button>
                      Manage Images
                    </button>

                    <button>
                      Location
                    </button>

                  </div>

                </div>

              </div>


              <div className="verification-panel">

                <strong>
                  Property Verification
                </strong>

                <div>
                  ✓ Owner Identity
                </div>

                <div>
                  ✓ Property Details
                </div>

                <div>
                  ✓ Contact Number
                </div>

                <div>
                  ✓ Bank/Payout Details
                </div>

                <span>
                  Verification status: Complete
                </span>

              </div>

            </section>

          )}


          {/* ROOMS */}

          {activeTab === "rooms" && (

            <section className="dashboard-section">

              <SectionTitle
                title="Room Management"
                subtitle="Manage every room individually"
              />


              <button
                className="green-button"
                onClick={addRoom}
              >
                + Add Room
              </button>


              <div className="room-table">

                <div className="room-row header">

                  <span>
                    Room
                  </span>

                  <span>
                    Type
                  </span>

                  <span>
                    Rent
                  </span>

                  <span>
                    Status
                  </span>

                  <span>
                    Tenant
                  </span>

                  <span>
                    Payment
                  </span>

                </div>


                {rooms.map(
                  (room) => (

                    <div
                      className="room-row"
                      key={room.room}
                    >

                      <strong>
                        #{room.room}
                      </strong>

                      <span>
                        {room.type}
                      </span>

                      <span>
                        ₹{room.rent}
                      </span>

                      <span>

                        <b
                          className={
                            room.status === "Occupied"
                              ? "status occupied-status"
                              : "status vacant-status"
                          }
                        >
                          {room.status}
                        </b>

                      </span>

                      <span>
                        {room.tenant}
                      </span>

                      <span>
                        {room.payment}
                      </span>

                    </div>

                  )
                )}

              </div>

            </section>

          )}


          {/* TENANTS */}

          {activeTab === "tenants" && (

            <section className="dashboard-section">

              <SectionTitle
                title="Tenant Management"
                subtitle="View verified tenant information"
              />


              <div className="tenant-card">

                <div className="tenant-avatar">
                  👤
                </div>

                <div className="tenant-main">

                  <h3>
                    Verified Tenant
                  </h3>

                  <span>
                    Room 101
                  </span>

                  <div className="tenant-tags">

                    <span>
                      ✓ Identity Verified
                    </span>

                    <span>
                      ✓ Agreement
                    </span>

                    <span>
                      ✓ Payment Active
                    </span>

                  </div>

                </div>

                <button>
                  View Details
                </button>

              </div>


              <div className="privacy-warning">

                🛡️

                <div>

                  <strong>
                    Privacy Protection
                  </strong>

                  <p>
                    Sensitive identity documents
                    should only be accessible to
                    authorized personnel. Display
                    verification status instead of
                    exposing complete government IDs.
                  </p>

                </div>

              </div>

            </section>

          )}


          {/* PAYMENTS */}

          {activeTab === "payments" && (

            <section className="dashboard-section">

              <SectionTitle
                title="Payments"
                subtitle="Track monthly tenant payments"
              />


              <div className="payment-card">

                <div>
                  <span>
                    Room 101
                  </span>

                  <strong>
                    ₹4,500
                  </strong>

                  <small>
                    August 2026
                  </small>
                </div>

                <b className="paid">
                  ✓ Paid
                </b>

              </div>


              <div className="payment-card">

                <div>
                  <span>
                    Room 103
                  </span>

                  <strong>
                    ₹4,500
                  </strong>

                  <small>
                    August 2026
                  </small>
                </div>

                <b className="paid">
                  ✓ Paid
                </b>

              </div>


              <div className="payment-note">

                Payment records are linked to
                the authenticated tenant and
                owner accounts in the backend.

              </div>

            </section>

          )}


          {/* ELECTRICITY */}

          {activeTab === "electricity" && (

            <section className="dashboard-section">

              <SectionTitle
                title="Electricity"
                subtitle="Monthly electricity records"
              />


              <div className="electricity-form">

                <label>
                  Room
                  <select>
                    <option>
                      Room 101
                    </option>

                    <option>
                      Room 103
                    </option>
                  </select>
                </label>


                <label>
                  Previous Reading
                  <input
                    placeholder="1250"
                  />
                </label>


                <label>
                  Current Reading
                  <input
                    placeholder="1340"
                  />
                </label>


                <label>
                  Amount
                  <input
                    placeholder="₹720"
                  />
                </label>


                <label>
                  Proof Image
                  <input
                    type="file"
                    accept="image/*"
                  />
                </label>


                <button>
                  Save Electricity Record
                </button>

              </div>

            </section>

          )}


          {/* MESSAGES */}

          {activeTab === "messages" && (

            <section className="dashboard-section">

              <SectionTitle
                title="Messages"
                subtitle="Communicate with renters"
              />


              <div className="message-window">

                <div className="message received">
                  Hello, I have a question about
                  the electricity bill.
                </div>

                <div className="message sent">
                  Sure. I will check the latest
                  meter reading.
                </div>

                <div className="message-input">

                  <input
                    placeholder="Write a message..."
                  />

                  <button>
                    Send
                  </button>

                </div>

              </div>

            </section>

          )}


          {/* DOCUMENTS */}

          {activeTab === "documents" && (

            <section className="dashboard-section">

              <SectionTitle
                title="Documents & Verification"
                subtitle="Owner verification status"
              />


              <div className="document-list">

                <Document
                  title="Owner Identity"
                  status="Verified"
                />

                <Document
                  title="Property Proof"
                  status="Verified"
                />

                <Document
                  title="Bank / Payout Account"
                  status="Verified"
                />

                <Document
                  title="Rental Agreement"
                  status="Available"
                />

              </div>

            </section>

          )}


          {/* SETTINGS */}

          {activeTab === "settings" && (

            <section className="dashboard-section">

              <SectionTitle
                title="Owner Settings"
                subtitle="Account and property preferences"
              />


              <div className="settings-list">

                <button>
                  👤 Owner Profile
                </button>

                <button>
                  🏦 Payout Account
                </button>

                <button>
                  🔐 Security & OTP
                </button>

                <button>
                  🔔 Notifications
                </button>

                <button>
                  📄 Agreements
                </button>

              </div>

            </section>

          )}

        </main>

      </div>


      <style>{`

        .owner-dashboard {
          min-height: 100vh;
          background: #f5f8f7;
          font-family: system-ui, sans-serif;
          color: #17262d;
        }

        .owner-header {
          height: 68px;
          background: white;
          border-bottom: 1px solid #e1e7e6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 25px;
        }

        .owner-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .owner-brand button {
          border: 0;
          background: #f2f5f5;
          border-radius: 8px;
          width: 35px;
          height: 35px;
          cursor: pointer;
        }

        .owner-brand strong,
        .owner-account strong {
          display: block;
          font-size: 11px;
        }

        .owner-brand small,
        .owner-account small {
          display: block;
          margin-top: 2px;
          color: #89969b;
          font-size: 7px;
        }

        .owner-account {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .verification-dot {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #eaf8f3;
          color: #07855f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .owner-layout {
          display: grid;
          grid-template-columns: 210px 1fr;
          min-height: calc(100vh - 68px);
        }

        .owner-sidebar {
          background: white;
          border-right: 1px solid #e1e7e6;
          padding: 15px 10px;
        }

        .owner-sidebar button {
          width: 100%;
          border: 0;
          background: white;
          text-align: left;
          padding: 11px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 9px;
          color: #64737a;
          margin-bottom: 3px;
        }

        .owner-sidebar button:hover,
        .owner-sidebar button.active {
          background: #eaf8f3;
          color: #07855f;
          font-weight: 900;
        }

        .owner-main {
          padding: 30px;
          max-width: 1250px;
          width: 100%;
          margin: auto;
        }

        .owner-welcome {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .owner-label {
          color: #07855f;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 1.5px;
        }

        .owner-welcome h1 {
          margin: 5px 0;
          font-size: 27px;
          letter-spacing: -1px;
        }

        .owner-welcome p {
          margin: 0;
          color: #89969b;
          font-size: 9px;
        }

        .add-property-button,
        .green-button {
          border: 0;
          background: #07855f;
          color: white;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .owner-stats {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 10px;
          margin-bottom: 12px;
        }

        .owner-stats > div {
          padding: 15px;
          background: white;
          border: 1px solid #e0e6e7;
          border-radius: 11px;
        }

        .owner-stats span {
          display: block;
          color: #7d8b91;
          font-size: 8px;
        }

        .owner-stats strong {
          display: block;
          margin-top: 6px;
          font-size: 19px;
        }

        .owner-stats small {
          display: block;
          margin-top: 3px;
          color: #a0aaae;
          font-size: 7px;
        }

        .owner-card,
        .dashboard-section {
          background: white;
          border: 1px solid #e0e6e7;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 12px;
        }

        .owner-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 13px;
        }

        .owner-card-header strong {
          display: block;
          font-size: 11px;
        }

        .owner-card-header small {
          display: block;
          margin-top: 3px;
          color: #8b979c;
          font-size: 7px;
        }

        .owner-card-header button {
          border: 0;
          background: transparent;
          color: #07855f;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .verified-pill {
          color: #07855f;
          background: #eaf8f3;
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 7px;
          font-weight: 900;
        }

        .property-summary {
          display: flex;
          gap: 13px;
        }

        .property-photo {
          width: 90px;
          height: 70px;
          border-radius: 9px;
          background: #e9efed;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
        }

        .property-summary h3 {
          margin: 3px 0;
          font-size: 13px;
        }

        .property-summary p {
          margin: 0;
          color: #89969b;
          font-size: 8px;
        }

        .summary-tags,
        .tenant-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
        }

        .summary-tags span,
        .tenant-tags span {
          padding: 4px 6px;
          border-radius: 5px;
          background: #f2f5f5;
          color: #68767d;
          font-size: 7px;
        }

        .room-grid {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 8px;
        }

        .room-mini {
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e2e7e7;
        }

        .room-mini.occupied {
          background: #edf8f4;
          border-color: #c9e7db;
        }

        .room-mini.vacant {
          background: #f8faf9;
        }

        .room-mini strong,
        .room-mini span,
        .room-mini b {
          display: block;
        }

        .room-mini strong {
          font-size: 9px;
        }

        .room-mini span {
          margin-top: 3px;
          font-size: 7px;
          color: #89969b;
        }

        .room-mini b {
          margin-top: 7px;
          font-size: 7px;
          color: #07855f;
        }

        .payment-overview {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 10px;
        }

        .payment-overview div {
          padding: 13px;
          background: #f7f9f9;
          border-radius: 8px;
        }

        .payment-overview span,
        .payment-overview strong {
          display: block;
        }

        .payment-overview span {
          color: #89969b;
          font-size: 7px;
        }

        .payment-overview strong {
          margin-top: 4px;
          font-size: 15px;
        }

        .dashboard-section > .section-title {
          margin-bottom: 20px;
        }

        .section-title strong {
          display: block;
          font-size: 15px;
        }

        .section-title span {
          display: block;
          margin-top: 4px;
          color: #89969b;
          font-size: 8px;
        }

        .room-table {
          margin-top: 15px;
          border: 1px solid #e2e7e7;
          border-radius: 9px;
          overflow: hidden;
        }

        .room-row {
          display: grid;
          grid-template-columns:
            .7fr
            1fr
            1fr
            1.2fr
            1.7fr
            1fr;
          gap: 8px;
          padding: 12px;
          border-bottom: 1px solid #edf0f0;
          align-items: center;
          font-size: 8px;
        }

        .room-row.header {
          background: #f5f8f7;
          color: #7f8d93;
          font-weight: 900;
        }

        .status {
          display: inline-block;
          padding: 4px 6px;
          border-radius: 5px;
          font-size: 7px;
        }

        .occupied-status {
          background: #eaf8f3;
          color: #07855f;
        }

        .vacant-status {
          background: #fff5e8;
          color: #a66a22;
        }

        .property-management {
          display: flex;
          gap: 20px;
          padding: 15px;
          background: #f7f9f9;
          border-radius: 10px;
        }

        .property-big-photo {
          width: 180px;
          height: 130px;
          background: #e5ece9;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 45px;
        }

        .property-management h2 {
          font-size: 18px;
          margin: 8px 0;
        }

        .property-management p {
          color: #89969b;
          font-size: 9px;
        }

        .property-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .property-actions button,
        .settings-list button {
          border: 1px solid #dfe5e5;
          background: white;
          border-radius: 7px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 8px;
        }

        .verification-panel {
          margin-top: 12px;
          padding: 15px;
          background: #edf8f4;
          border-radius: 10px;
        }

        .verification-panel strong {
          display: block;
          font-size: 10px;
          margin-bottom: 8px;
        }

        .verification-panel div {
          font-size: 8px;
          margin-top: 5px;
          color: #087b5d;
        }

        .verification-panel span {
          display: block;
          margin-top: 10px;
          font-size: 8px;
          font-weight: 900;
        }

        .tenant-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          border: 1px solid #e1e7e7;
          border-radius: 10px;
        }

        .tenant-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: #edf2f2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .tenant-main {
          flex: 1;
        }

        .tenant-main h3 {
          margin: 0;
          font-size: 11px;
        }

        .tenant-main > span {
          display: block;
          margin-top: 3px;
          color: #89969b;
          font-size: 7px;
        }

        .tenant-card > button {
          border: 1px solid #dce5e4;
          background: white;
          border-radius: 7px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 8px;
        }

        .privacy-warning {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          padding: 13px;
          border-radius: 9px;
          background: #fff8eb;
        }

        .privacy-warning strong {
          font-size: 8px;
        }

        .privacy-warning p {
          margin: 4px 0 0;
          font-size: 7px;
          color: #897a61;
          line-height: 1.5;
        }

        .payment-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px;
          border: 1px solid #e1e7e7;
          border-radius: 9px;
          margin-bottom: 8px;
        }

        .payment-card span,
        .payment-card strong,
        .payment-card small {
          display: block;
        }

        .payment-card span {
          font-size: 8px;
        }

        .payment-card strong {
          margin-top: 4px;
          font-size: 15px;
        }

        .payment-card small {
          margin-top: 2px;
          color: #89969b;
          font-size: 7px;
        }

        .paid {
          color: #07855f;
          background: #eaf8f3;
          padding: 6px 9px;
          border-radius: 6px;
          font-size: 7px;
        }

        .payment-note {
          margin-top: 10px;
          padding: 12px;
          background: #f5f8f7;
          color: #7d8b91;
          border-radius: 8px;
          font-size: 8px;
        }

        .electricity-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .electricity-form label {
          display: flex;
          flex-direction: column;
          gap: 5px;
          color: #65737a;
          font-size: 8px;
        }

        .electricity-form input,
        .electricity-form select {
          padding: 10px;
          border: 1px solid #dfe5e5;
          border-radius: 7px;
          outline: 0;
        }

        .electricity-form button {
          border: 0;
          background: #07855f;
          color: white;
          border-radius: 8px;
          padding: 10px;
          cursor: pointer;
          font-weight: 900;
        }

        .message-window {
          max-width: 650px;
          min-height: 330px;
          padding: 15px;
          background: #f3f7f6;
          border-radius: 10px;
        }

        .message {
          max-width: 70%;
          padding: 9px 11px;
          border-radius: 9px;
          margin-bottom: 9px;
          font-size: 8px;
        }

        .message.received {
          background: white;
        }

        .message.sent {
          margin-left: auto;
          background: #dff3eb;
        }

        .message-input {
          display: flex;
          gap: 5px;
          margin-top: 180px;
        }

        .message-input input {
          flex: 1;
          border: 1px solid #dce4e3;
          border-radius: 7px;
          padding: 9px;
        }

        .message-input button {
          border: 0;
          background: #07855f;
          color: white;
          border-radius: 7px;
          padding: 0 14px;
          cursor: pointer;
        }

        .document-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .document-list > div {
          padding: 15px;
          border: 1px solid #e1e7e7;
          border-radius: 9px;
          display: flex;
          justify-content: space-between;
        }

        .document-list strong {
          font-size: 9px;
        }

        .document-list span {
          color: #07855f;
          font-size: 8px;
          font-weight: 900;
        }

        .settings-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .settings-list button {
          text-align: left;
          padding: 13px;
        }

        @media(max-width:800px) {

          .owner-layout {
            grid-template-columns: 1fr;
          }

          .owner-sidebar {
            display: flex;
            overflow-x: auto;
            border-right: 0;
            border-bottom: 1px solid #e1e7e6;
          }

          .owner-sidebar button {
            min-width: 105px;
          }

          .owner-main {
            padding: 15px;
          }

          .owner-stats {
            grid-template-columns: 1fr 1fr;
          }

          .room-grid {
            grid-template-columns: 1fr 1fr;
          }

          .room-row {
            min-width: 700px;
          }

          .room-table {
            overflow-x: auto;
          }

          .property-management {
            flex-direction: column;
          }

          .property-big-photo {
            width: 100%;
          }

          .document-list {
            grid-template-columns: 1fr;
          }

        }

      `}</style>

    </div>
  );
}


function SectionTitle({ title, subtitle }) {

  return (
    <div className="section-title">
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </div>
  );

}


function Document({ title, status }) {

  return (
    <div>

      <strong>
        📄 {title}
      </strong>

      <span>
        ✓ {status}
      </span>

    </div>
  );

}