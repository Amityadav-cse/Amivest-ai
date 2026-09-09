import React from "react";
import { useNavigate } from "react-router-dom";

export default function RentEntry() {

  const navigate = useNavigate();

  return (

    <div className="rent-entry">

      <div className="rent-entry-top">

        <div className="rent-brand">
          🏠
          <div>
            <strong>AmiRent</strong>
            <small>by AmiVest</small>
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
        >
          ← AmiVest
        </button>

      </div>


      <div className="rent-entry-content">

        <div className="rent-entry-label">
          WELCOME TO AMIRENT
        </div>

        <h1>
          What are you
          <span> looking for?</span>
        </h1>

        <p>
          Choose your role to continue.
          Your AmiRent experience will be
          customized for you.
        </p>


        <div className="role-cards">


          {/* RENTER */}

          <button
            className="role-card renter"
            onClick={() =>
              navigate("/rent/renter")
            }
          >

            <div className="role-icon">
              🔎
            </div>

            <div>

              <h2>
                I am a Renter
              </h2>

              <p>
                Find PGs, rooms, flats and
                daily stays near you.
              </p>

              <div className="role-features">

                <span>📍 Location</span>
                <span>🛏 Rooms</span>
                <span>💬 Message Owner</span>
                <span>🛡 Secure Process</span>

              </div>

            </div>

            <strong className="role-arrow">
              →
            </strong>

          </button>


          {/* OWNER */}

          <button
            className="role-card owner"
            onClick={() =>
              navigate("/rent/owner")
            }
          >

            <div className="role-icon">
              🏠
            </div>

            <div>

              <h2>
                I am an Owner
              </h2>

              <p>
                List your PG, room, flat or
                daily stay and manage tenants.
              </p>

              <div className="role-features">

                <span>📸 Property Images</span>
                <span>🚪 Room Management</span>
                <span>💰 Payments</span>
                <span>👤 Tenant Management</span>

              </div>

            </div>

            <strong className="role-arrow">
              →
            </strong>

          </button>

        </div>


        <div className="security-note">

          <span>🛡️</span>

          <div>

            <strong>
              AmiRent Secure
            </strong>

            <p>
              Your identity and sensitive
              information are protected.
              Only necessary verified information
              is shared with the relevant party.
            </p>

          </div>

        </div>

      </div>


      <style>{`

        .rent-entry {
          min-height: 100vh;
          background:
            linear-gradient(
              135deg,
              #eef9f5,
              #f8fbfa
            );
          font-family:
            system-ui,
            -apple-system,
            sans-serif;
          color: #17262d;
        }

        .rent-entry-top {
          height: 70px;
          padding: 0 28px;
          background: white;
          border-bottom: 1px solid #e2e8e6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .rent-brand {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .rent-brand > div {
          display: flex;
          flex-direction: column;
        }

        .rent-brand strong {
          font-size: 17px;
        }

        .rent-brand small {
          font-size: 7px;
          color: #87949a;
        }

        .rent-entry-top button {
          border: 1px solid #dce5e3;
          background: white;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
        }

        .rent-entry-content {
          width: min(900px, calc(100% - 30px));
          margin: auto;
          padding: 75px 0;
        }

        .rent-entry-label {
          color: #07855f;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 2px;
        }

        .rent-entry-content h1 {
          margin: 7px 0;
          font-size: clamp(38px, 6vw, 65px);
          line-height: 1;
          letter-spacing: -3px;
        }

        .rent-entry-content h1 span {
          color: #07855f;
        }

        .rent-entry-content > p {
          color: #7c8b91;
          font-size: 12px;
          line-height: 1.6;
          max-width: 550px;
        }

        .role-cards {
          margin-top: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .role-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 15px;
          padding: 24px;
          min-height: 250px;
          border: 1px solid #dce5e3;
          border-radius: 17px;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: .2s;
        }

        .role-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 15px 40px rgba(20,60,50,.11);
        }

        .role-card.renter:hover {
          border-color: #4b9dcb;
        }

        .role-card.owner:hover {
          border-color: #16a77f;
        }

        .role-icon {
          width: 54px;
          height: 54px;
          flex-shrink: 0;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          background: #edf8f4;
        }

        .role-card h2 {
          margin: 2px 0 7px;
          font-size: 18px;
        }

        .role-card p {
          margin: 0;
          color: #7c8a90;
          font-size: 9px;
          line-height: 1.6;
        }

        .role-features {
          margin-top: 15px;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .role-features span {
          padding: 5px 7px;
          background: #f4f7f7;
          border-radius: 6px;
          font-size: 7px;
          color: #627179;
        }

        .role-arrow {
          position: absolute;
          right: 18px;
          bottom: 17px;
          color: #07855f;
          font-size: 20px;
        }

        .security-note {
          margin-top: 20px;
          padding: 14px;
          background: rgba(255,255,255,.8);
          border: 1px solid #dce8e4;
          border-radius: 12px;
          display: flex;
          gap: 10px;
        }

        .security-note > span {
          font-size: 21px;
        }

        .security-note strong {
          font-size: 9px;
        }

        .security-note p {
          margin: 3px 0 0;
          color: #8a969b;
          font-size: 7px;
          line-height: 1.5;
        }

        @media(max-width:700px) {

          .rent-entry-top {
            padding: 0 12px;
          }

          .rent-entry-content {
            padding: 45px 0 90px;
          }

          .role-cards {
            grid-template-columns: 1fr;
          }

        }

      `}</style>

    </div>
  );
}