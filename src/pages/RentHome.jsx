import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const properties = [
  {
    id: 1,
    title: "Comfort PG for Students",
    type: "PG",
    location: "Pipcho Main Road",
    area: "Near College Road",
    distance: "0.8 km",
    price: 4500,
    deposit: 4500,
    rating: 4.7,
    reviews: 128,
    gender: "Male",
    rooms: 12,
    vacant: 4,
    verified: true,
    popular: true,
    amenities: [
      "WiFi",
      "AC",
      "Bed",
      "Table",
      "Chair",
      "Cooler",
    ],
    images: [
      "https://images.unsplash.com/photo-1560185008-b033106af5c3?w=900",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900",
    ],
  },

  {
    id: 2,
    title: "Modern Student Hostel",
    type: "Hostel",
    location: "Station Road",
    area: "Near Market",
    distance: "1.2 km",
    price: 5500,
    deposit: 5500,
    rating: 4.5,
    reviews: 86,
    gender: "Anyone",
    rooms: 20,
    vacant: 7,
    verified: true,
    popular: false,
    amenities: [
      "WiFi",
      "Food",
      "Bed",
      "Laundry",
      "CCTV",
    ],
    images: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900",
    ],
  },

  {
    id: 3,
    title: "1 BHK Family Flat",
    type: "Flat",
    location: "City Center",
    area: "Main Market",
    distance: "2.1 km",
    price: 9000,
    deposit: 18000,
    rating: 4.8,
    reviews: 54,
    gender: "Family",
    rooms: 1,
    vacant: 1,
    verified: true,
    popular: true,
    amenities: [
      "Parking",
      "Balcony",
      "Kitchen",
      "Water",
      "Security",
    ],
    images: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900",
    ],
  },

  {
    id: 4,
    title: "Budget Single Room",
    type: "Room",
    location: "College Area",
    area: "Near University",
    distance: "0.5 km",
    price: 3000,
    deposit: 3000,
    rating: 4.3,
    reviews: 41,
    gender: "Male",
    rooms: 8,
    vacant: 2,
    verified: false,
    popular: false,
    amenities: [
      "Bed",
      "Table",
      "Chair",
      "Water",
    ],
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900",
    ],
  },
];


export default function RentHome() {

  const navigate = useNavigate();

  const [location, setLocation] =
    useState("Pipcho");

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [sort, setSort] =
    useState("Recommended");

  const [showFilters, setShowFilters] =
    useState(false);

  const [maxRent, setMaxRent] =
    useState(15000);

  const [gender, setGender] =
    useState("All");

  const [propertyImages, setPropertyImages] =
    useState({});


  const categories = [
    {
      icon: "🏠",
      title: "PG",
      value: "PG",
    },
    {
      icon: "🛏️",
      title: "Rooms",
      value: "Room",
    },
    {
      icon: "🏢",
      title: "Flats",
      value: "Flat",
    },
    {
      icon: "🏨",
      title: "Hostels",
      value: "Hostel",
    },
    {
      icon: "🌙",
      title: "Daily Stay",
      value: "Daily",
    },
    {
      icon: "👨‍👩‍👧",
      title: "Family",
      value: "Family",
    },
  ];


  let filteredProperties =
    properties.filter((property) => {

      const matchesCategory =
        category === "All" ||
        property.type === category;

      const matchesGender =
        gender === "All" ||
        property.gender === gender ||
        property.gender === "Anyone";

      const matchesRent =
        property.price <= maxRent;

      const text =
        `${property.title} ${property.location} ${property.area}`
          .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(
          search.toLowerCase()
        );

      return (
        matchesCategory &&
        matchesGender &&
        matchesRent &&
        matchesSearch
      );
    });


  if (sort === "Low Rent") {
    filteredProperties =
      [...filteredProperties].sort(
        (a, b) => a.price - b.price
      );
  }

  if (sort === "High Rating") {
    filteredProperties =
      [...filteredProperties].sort(
        (a, b) => b.rating - a.rating
      );
  }


  const changeImage = (
    propertyId,
    direction,
    imageCount
  ) => {

    setPropertyImages((current) => {

      const currentIndex =
        current[propertyId] || 0;

      let nextIndex =
        currentIndex + direction;

      if (nextIndex < 0) {
        nextIndex =
          imageCount - 1;
      }

      if (nextIndex >= imageCount) {
        nextIndex = 0;
      }

      return {
        ...current,
        [propertyId]: nextIndex,
      };
    });
  };


  return (

    <div className="amiren-app">

      {/* =================================================
          TOP HEADER
      ================================================= */}

      <header className="rent-header">

        <div className="rent-header-inner">

          <button
            className="rent-logo"
            onClick={() =>
              navigate("/rent")
            }
          >

            <div className="rent-logo-icon">
              🏠
            </div>

            <div>
              <strong>
                AmiRent
              </strong>

              <span>
                by AmiVest
              </span>
            </div>

          </button>


          <div className="header-actions">

            <button className="header-button">
              ❤️ Saved
            </button>

            <button className="header-button">
              💬 Messages
            </button>

            <button
              className="owner-list-button"
              onClick={() =>
                navigate(
                  "/rent/owner"
                )
              }
            >
              + List Property
            </button>

            <div className="profile-circle">
              👤
            </div>

          </div>

        </div>

      </header>


      {/* =================================================
          SEARCH SECTION
      ================================================= */}

      <section className="rent-search-section">

        <div className="search-container">

          <div className="search-heading">

            <div>

              <div className="small-label">
                AMIRENT • VERIFIED RENTAL NETWORK
              </div>

              <h1>
                Find a place
                <span> you'll love.</span>
              </h1>

              <p>
                PGs, rooms, flats and stays
                around {location}.
              </p>

            </div>

            <div className="trust-box">

              <span>
                🛡️
              </span>

              <div>
                <strong>
                  AmiRent Secure
                </strong>

                <small>
                  Verified listings
                </small>
              </div>

            </div>

          </div>


          {/* SEARCH BAR */}

          <div className="main-search">

            <button className="location-selector">

              <span className="search-icon">
                📍
              </span>

              <div>
                <small>
                  LOCATION
                </small>

                <strong>
                  {location}
                </strong>
              </div>

              <span>
                ▾
              </span>

            </button>


            <div className="search-input-wrapper">

              <span>
                🔎
              </span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search PG, room, flat or locality"
              />

              {search && (
                <button
                  className="clear-search"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  ×
                </button>
              )}

            </div>


            <button
              className="search-button"
              onClick={() => {}}
            >
              Search
            </button>

          </div>


          {/* QUICK SEARCH */}

          <div className="quick-search">

            <span>
              Popular:
            </span>

            {[
              "Near College",
              "PG for Students",
              "1 BHK",
              "Girls PG",
              "Boys PG",
              "Under ₹5,000",
            ].map((item) => (

              <button
                key={item}
                onClick={() =>
                  setSearch(item)
                }
              >
                {item}
              </button>

            ))}

          </div>

        </div>

      </section>


      {/* =================================================
          CATEGORY BAR
      ================================================= */}

      <section className="category-section">

        <div className="category-container">

          <button
            className={
              category === "All"
                ? "category-card active"
                : "category-card"
            }
            onClick={() =>
              setCategory("All")
            }
          >

            <div>
              🔎
            </div>

            <span>
              All
            </span>

          </button>


          {categories.map(
            (item) => (

              <button
                key={item.value}
                className={
                  category === item.value
                    ? "category-card active"
                    : "category-card"
                }
                onClick={() =>
                  setCategory(
                    item.value
                  )
                }
              >

                <div>
                  {item.icon}
                </div>

                <span>
                  {item.title}
                </span>

              </button>

            )
          )}

        </div>

      </section>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="rent-main">


        {/* =================================================
            LEFT CONTENT
        ================================================= */}

        <section className="property-section">

          <div className="result-heading">

            <div>

              <div className="breadcrumb">
                Home › Rent › {location}
              </div>

              <h2>
                Properties for rent
                in {location}
              </h2>

              <p>
                {filteredProperties.length}
                {" "}verified properties
                found
              </p>

            </div>


            <div className="heading-actions">

              <button
                className="filter-mobile-button"
                onClick={() =>
                  setShowFilters(
                    !showFilters
                  )
                }
              >
                ⚙ Filters
              </button>

              <select
                value={sort}
                onChange={(e) =>
                  setSort(
                    e.target.value
                  )
                }
                className="sort-select"
              >

                <option>
                  Recommended
                </option>

                <option>
                  Low Rent
                </option>

                <option>
                  High Rating
                </option>

              </select>

            </div>

          </div>


          {/* =================================================
              FILTER BAR
          ================================================= */}

          <div
            className={
              showFilters
                ? "filter-bar show"
                : "filter-bar"
            }
          >

            <div className="filter-title">
              Filters
            </div>


            <select
              value={gender}
              onChange={(e) =>
                setGender(
                  e.target.value
                )
              }
            >

              <option value="All">
                👤 Anyone
              </option>

              <option value="Male">
                👨 Male
              </option>

              <option value="Female">
                👩 Female
              </option>

              <option value="Family">
                👨‍👩‍👧 Family
              </option>

            </select>


            <label className="rent-slider">

              <span>
                Max ₹{maxRent}
              </span>

              <input
                type="range"
                min="2000"
                max="30000"
                step="500"
                value={maxRent}
                onChange={(e) =>
                  setMaxRent(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

            </label>


            <button
              onClick={() => {
                setCategory("All");
                setGender("All");
                setMaxRent(15000);
                setSearch("");
              }}
            >
              Reset
            </button>

          </div>


          {/* =================================================
              PROPERTY CARDS
          ================================================= */}

          <div className="property-list">

            {filteredProperties.map(
              (property) => {

                const imageIndex =
                  propertyImages[
                    property.id
                  ] || 0;

                return (

                  <article
                    className="property-card"
                    key={property.id}
                  >

                    {/* IMAGE */}

                    <div className="property-image">

                      <img
                        src={
                          property.images[
                            imageIndex
                          ]
                        }
                        alt={
                          property.title
                        }
                      />


                      <button
                        className="image-left"
                        onClick={() =>
                          changeImage(
                            property.id,
                            -1,
                            property.images.length
                          )
                        }
                      >
                        ‹
                      </button>


                      <button
                        className="image-right"
                        onClick={() =>
                          changeImage(
                            property.id,
                            1,
                            property.images.length
                          )
                        }
                      >
                        ›
                      </button>


                      <button className="save-property">
                        ♡
                      </button>


                      {property.popular && (
                        <span className="popular-badge">
                          Popular
                        </span>
                      )}


                      <div className="image-count">

                        📷{" "}
                        {imageIndex + 1}/
                        {property.images.length}

                      </div>


                      <div className="image-dots">

                        {property.images.map(
                          (_, index) => (

                            <span
                              key={index}
                              className={
                                index ===
                                imageIndex
                                  ? "dot active"
                                  : "dot"
                              }
                            />

                          )
                        )}

                      </div>

                    </div>


                    {/* INFORMATION */}

                    <div className="property-information">

                      <div className="property-top">

                        <div>

                          <div className="property-title-row">

                            <h3>
                              {property.title}
                            </h3>

                            {property.verified && (
                              <span className="verified-badge">
                                ✓ Verified
                              </span>
                            )}

                          </div>

                          <div className="property-location">

                            📍{" "}
                            {property.location}
                            {" • "}
                            {property.distance}

                          </div>

                          <div className="property-area">
                            {property.area}
                          </div>

                        </div>


                        <div className="rating">

                          <strong>
                            {property.rating}
                          </strong>

                          ★

                          <span>
                            {property.reviews}
                            {" "}reviews
                          </span>

                        </div>

                      </div>


                      {/* PRICE */}

                      <div className="price-row">

                        <div>

                          <strong>
                            ₹
                            {property.price.toLocaleString()}
                          </strong>

                          <span>
                            / month
                          </span>

                        </div>

                        <small>
                          Deposit ₹
                          {property.deposit.toLocaleString()}
                        </small>

                      </div>


                      {/* TAGS */}

                      <div className="property-tags">

                        <span>
                          🏠 {property.type}
                        </span>

                        <span>
                          👤 {property.gender}
                        </span>

                        <span
                          className={
                            property.vacant > 0
                              ? "vacant"
                              : "full"
                          }
                        >
                          🚪{" "}
                          {property.vacant}
                          {" "}vacant
                        </span>

                      </div>


                      {/* AMENITIES */}

                      <div className="amenities">

                        {property.amenities
                          .slice(0, 5)
                          .map(
                            (amenity) => (

                              <span
                                key={amenity}
                              >
                                ✓ {amenity}
                              </span>

                            )
                          )}

                        {property.amenities.length >
                          5 && (
                          <span>
                            +
                            {property.amenities.length -
                              5}
                            {" "}more
                          </span>
                        )}

                      </div>


                      {/* OWNER */}

                      <div className="owner-row">

                        <div className="owner-info">

                          <div className="owner-avatar">
                            👨
                          </div>

                          <div>

                            <strong>
                              Verified Owner
                            </strong>

                            <small>
                              Usually responds
                              quickly
                            </small>

                          </div>

                        </div>


                        <div className="secure-tag">
                          🛡️ Secure
                        </div>

                      </div>


                      {/* ACTIONS */}

                      <div className="property-actions">

                        <button
                          className="call-button"
                          onClick={() =>
                            alert(
                              "Owner contact will be connected through AmiRent."
                            )
                          }
                        >
                          📞 Call
                        </button>

                        <button
                          className="message-button"
                          onClick={() =>
                            alert(
                              "AmiRent secure messaging will open here."
                            )
                          }
                        >
                          💬 Message
                        </button>

                        <button
                          className="details-button"
                          onClick={() =>
                            alert(
                              `Opening ${property.title}`
                            )
                          }
                        >
                          View Details →
                        </button>

                      </div>

                    </div>

                  </article>

                );
              }
            )}


            {filteredProperties.length === 0 && (

              <div className="empty-state">

                <div>
                  🔎
                </div>

                <h3>
                  No properties found
                </h3>

                <p>
                  Try changing your
                  filters or search
                  location.
                </p>

              </div>

            )}

          </div>

        </section>


        {/* =================================================
            RIGHT MAP
        ================================================= */}

        <aside className="map-section">

          <div className="map-card">

            <div className="map-header">

              <div>

                <strong>
                  Explore on map
                </strong>

                <small>
                  Properties near {location}
                </small>

              </div>

              <button>
                ⛶
              </button>

            </div>


            {/* MAP */}

            <div className="map-area">

              <div className="map-grid" />

              <div className="map-road road-one" />
              <div className="map-road road-two" />
              <div className="map-road road-three" />


              <div className="map-water">
                Lake
              </div>


              {properties.map(
                (property, index) => (

                  <button
                    key={property.id}
                    className={
                      index === 0
                        ? "map-pin selected"
                        : "map-pin"
                    }
                    style={{
                      left:
                        `${20 + index * 17}%`,
                      top:
                        `${30 + (index % 3) * 18}%`,
                    }}
                  >
                    ₹
                    {property.price / 1000}k
                  </button>

                )
              )}


              <div className="map-location">

                <span />

                Your search area

              </div>


              <button className="map-3d-button">
                3D
              </button>


              <button className="current-location">
                ◎
              </button>

            </div>


            <div className="map-footer">

              <span>
                📍 {location}
              </span>

              <button>
                Change location
              </button>

            </div>

          </div>


          {/* OWNER CTA */}

          <div className="owner-card">

            <div className="owner-card-icon">
              🏠
            </div>

            <div>

              <strong>
                Have a property?
              </strong>

              <p>
                List your PG, room or
                flat and reach verified
                tenants.
              </p>

              <button
                onClick={() =>
                  navigate(
                    "/rent/owner"
                  )
                }
              >
                List Property →
              </button>

            </div>

          </div>


          {/* SECURITY */}

          <div className="security-card">

            <div className="security-icon">
              🛡️
            </div>

            <div>

              <strong>
                AmiRent Security
              </strong>

              <p>
                Owner verification,
                OTP security and
                protected rental
                communication.
              </p>

            </div>

          </div>

        </aside>

      </main>


      {/* =================================================
          MOBILE BOTTOM NAV
      ================================================= */}

      <nav className="mobile-nav">

        <button>
          🔎
          <span>
            Search
          </span>
        </button>

        <button>
          🗺️
          <span>
            Map
          </span>
        </button>

        <button
          onClick={() =>
            navigate(
              "/rent/owner"
            )
          }
        >
          🏠
          <span>
            List
          </span>
        </button>

        <button>
          ❤️
          <span>
            Saved
          </span>
        </button>

      </nav>


      <style>{`

        * {
          box-sizing: border-box;
        }


        .amiren-app {

          min-height: 100vh;

          background:
            #f7f8fa;

          color:
            #17212b;

          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          padding-bottom:
            30px;
        }


        /* ==========================================
           HEADER
        ========================================== */

        .rent-header {

          height: 68px;

          background:
            white;

          border-bottom:
            1px solid #e6e9ed;

          position:
            sticky;

          top: 0;

          z-index: 100;
        }


        .rent-header-inner {

          width:
            min(1450px, 100%);

          height: 100%;

          margin:
            auto;

          padding:
            0 24px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;
        }


        .rent-logo {

          border: 0;

          background:
            transparent;

          display:
            flex;

          align-items:
            center;

          gap: 10px;

          cursor:
            pointer;

          color:
            #15232d;
        }


        .rent-logo-icon {

          width: 39px;
          height: 39px;

          border-radius:
            11px;

          background:
            linear-gradient(
              135deg,
              #19b88c,
              #087b69
            );

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          font-size:
            21px;
        }


        .rent-logo strong {

          display:
            block;

          font-size:
            19px;

          font-weight:
            950;

          letter-spacing:
            -.7px;
        }


        .rent-logo span {

          display:
            block;

          font-size:
            8px;

          color:
            #82909a;

          margin-top:
            1px;

          text-align:
            left;
        }


        .header-actions {

          display:
            flex;

          align-items:
            center;

          gap: 8px;
        }


        .header-button {

          background:
            transparent;

          border:
            0;

          padding:
            9px 12px;

          color:
            #55636c;

          cursor:
            pointer;

          font-weight:
            700;

          font-size:
            12px;
        }


        .owner-list-button {

          background:
            #07855f;

          color:
            white;

          border:
            0;

          border-radius:
            9px;

          padding:
            10px 14px;

          font-weight:
            900;

          cursor:
            pointer;
        }


        .profile-circle {

          width:
            35px;

          height:
            35px;

          border-radius:
            50%;

          background:
            #edf2f3;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;
        }


        /* ==========================================
           SEARCH
        ========================================== */

        .rent-search-section {

          background:
            linear-gradient(
              135deg,
              #eaf8f4,
              #f7fbfa
            );

          border-bottom:
            1px solid #e0ebe8;
        }


        .search-container {

          width:
            min(1400px, 100%);

          margin:
            auto;

          padding:
            30px 24px 24px;
        }


        .search-heading {

          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;

          margin-bottom:
            20px;
        }


        .small-label {

          font-size:
            9px;

          font-weight:
            950;

          letter-spacing:
            1.7px;

          color:
            #07855f;

          margin-bottom:
            5px;
        }


        .search-heading h1 {

          margin:
            0;

          font-size:
            clamp(30px, 4vw, 45px);

          letter-spacing:
            -1.7px;

          line-height:
            1.05;
        }


        .search-heading h1 span {

          color:
            #07855f;
        }


        .search-heading p {

          margin:
            7px 0 0;

          color:
            #70808a;

          font-size:
            12px;
        }


        .trust-box {

          display:
            flex;

          align-items:
            center;

          gap:
            10px;

          padding:
            12px 15px;

          background:
            white;

          border:
            1px solid #dce9e5;

          border-radius:
            12px;
        }


        .trust-box > span {

          font-size:
            23px;
        }


        .trust-box strong {

          display:
            block;

          font-size:
            11px;
        }


        .trust-box small {

          display:
            block;

          color:
            #82909a;

          font-size:
            9px;

          margin-top:
            2px;
        }


        /* SEARCH BAR */

        .main-search {

          display:
            flex;

          background:
            white;

          border:
            1px solid #d4dedb;

          border-radius:
            13px;

          padding:
            5px;

          box-shadow:
            0 8px 30px
            rgba(25,75,65,.08);
        }


        .location-selector {

          width:
            220px;

          border:
            0;

          border-right:
            1px solid #e3e7e9;

          background:
            transparent;

          display:
            flex;

          align-items:
            center;

          gap:
            9px;

          padding:
            8px 13px;

          cursor:
            pointer;

          text-align:
            left;
        }


        .search-icon {

          font-size:
            18px;
        }


        .location-selector small {

          display:
            block;

          font-size:
            7px;

          color:
            #89969e;

          font-weight:
            800;
        }


        .location-selector strong {

          display:
            block;

          font-size:
            12px;

          margin-top:
            2px;
        }


        .search-input-wrapper {

          flex:
            1;

          display:
            flex;

          align-items:
            center;

          gap:
            9px;

          padding:
            0 14px;

          min-width:
            0;
        }


        .search-input-wrapper > span {

          color:
            #87959c;
        }


        .search-input-wrapper input {

          flex:
            1;

          min-width:
            0;

          border:
            0;

          outline:
            0;

          font-size:
            13px;

          background:
            transparent;
        }


        .clear-search {

          border:
            0;

          background:
            transparent;

          font-size:
            20px;

          color:
            #84929a;

          cursor:
            pointer;
        }


        .search-button {

          border:
            0;

          border-radius:
            9px;

          padding:
            0 28px;

          background:
            #07855f;

          color:
            white;

          font-weight:
            900;

          cursor:
            pointer;
        }


        .quick-search {

          display:
            flex;

          align-items:
            center;

          gap:
            7px;

          margin-top:
            11px;

          overflow-x:
            auto;

          scrollbar-width:
            none;
        }


        .quick-search span {

          font-size:
            10px;

          color:
            #7c8990;
        }


        .quick-search button {

          white-space:
            nowrap;

          border:
            1px solid #d8e3e0;

          background:
            rgba(255,255,255,.7);

          border-radius:
            999px;

          padding:
            6px 10px;

          font-size:
            9px;

          color:
            #51616a;

          cursor:
            pointer;
        }


        /* ==========================================
           CATEGORY
        ========================================== */

        .category-section {

          background:
            white;

          border-bottom:
            1px solid #e6e9ed;
        }


        .category-container {

          width:
            min(1400px,100%);

          margin:
            auto;

          padding:
            14px 24px;

          display:
            flex;

          gap:
            11px;

          overflow-x:
            auto;

          scrollbar-width:
            none;
        }


        .category-card {

          min-width:
            105px;

          height:
            75px;

          background:
            white;

          border:
            1px solid #e2e6e8;

          border-radius:
            12px;

          cursor:
            pointer;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          gap:
            5px;

          color:
            #526069;

          transition:
            .2s;
        }


        .category-card div {

          font-size:
            22px;
        }


        .category-card span {

          font-size:
            9px;

          font-weight:
            800;
        }


        .category-card:hover,
        .category-card.active {

          border-color:
            #19a77f;

          background:
            #effaf6;

          color:
            #087c62;
        }


        /* ==========================================
           MAIN
        ========================================== */

        .rent-main {

          width:
            min(1400px,100%);

          margin:
            auto;

          padding:
            20px 24px;

          display:
            grid;

          grid-template-columns:
            minmax(0, 1fr)
            390px;

          gap:
            20px;
        }


        .result-heading {

          display:
            flex;

          justify-content:
            space-between;

          align-items:
            end;

          margin-bottom:
            12px;
        }


        .breadcrumb {

          color:
            #89949b;

          font-size:
            9px;

          margin-bottom:
            5px;
        }


        .result-heading h2 {

          margin:
            0;

          font-size:
            22px;

          letter-spacing:
            -.6px;
        }


        .result-heading p {

          margin:
            5px 0 0;

          color:
            #89949b;

          font-size:
            10px;
        }


        .heading-actions {

          display:
            flex;

          gap:
            7px;
        }


        .sort-select,
        .filter-mobile-button {

          border:
            1px solid #dce2e5;

          background:
            white;

          border-radius:
            8px;

          padding:
            9px 11px;

          font-size:
            10px;

          cursor:
            pointer;
        }


        .filter-mobile-button {

          display:
            none;
        }


        /* FILTER */

        .filter-bar {

          display:
            flex;

          align-items:
            center;

          gap:
            8px;

          padding:
            9px;

          background:
            white;

          border:
            1px solid #e4e8ea;

          border-radius:
            10px;

          margin-bottom:
            12px;
        }


        .filter-title {

          font-size:
            10px;

          font-weight:
            900;

          padding:
            0 5px;
        }


        .filter-bar select,
        .filter-bar > button {

          border:
            1px solid #e0e5e7;

          background:
            #fafbfb;

          padding:
            7px 10px;

          border-radius:
            7px;

          font-size:
            9px;
        }


        .filter-bar > button {

          cursor:
            pointer;

          color:
            #65747c;
        }


        .rent-slider {

          display:
            flex;

          align-items:
            center;

          gap:
            8px;

          margin-left:
            auto;

          font-size:
            9px;

          color:
            #66757d;
        }


        .rent-slider input {

          width:
            100px;
        }


        /* ==========================================
           PROPERTY CARD
        ========================================== */

        .property-list {

          display:
            flex;

          flex-direction:
            column;

          gap:
            12px;
        }


        .property-card {

          display:
            grid;

          grid-template-columns:
            235px minmax(0,1fr);

          min-height:
            260px;

          background:
            white;

          border:
            1px solid #e1e5e7;

          border-radius:
            13px;

          overflow:
            hidden;

          transition:
            .2s;
        }


        .property-card:hover {

          border-color:
            #c5d7d2;

          box-shadow:
            0 9px 30px
            rgba(22,55,49,.08);

          transform:
            translateY(-1px);
        }


        .property-image {

          position:
            relative;

          height:
            100%;

          min-height:
            260px;

          overflow:
            hidden;

          background:
            #dce4e2;
        }


        .property-image img {

          width:
            100%;

          height:
            100%;

          object-fit:
            cover;

          display:
            block;

          transition:
            .3s;
        }


        .property-card:hover
        .property-image img {

          transform:
            scale(1.025);
        }


        .image-left,
        .image-right {

          position:
            absolute;

          top:
            50%;

          transform:
            translateY(-50%);

          width:
            31px;

          height:
            31px;

          border:
            0;

          border-radius:
            50%;

          background:
            rgba(0,0,0,.52);

          color:
            white;

          font-size:
            22px;

          cursor:
            pointer;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;
        }


        .image-left {
          left: 9px;
        }


        .image-right {
          right: 9px;
        }


        .save-property {

          position:
            absolute;

          top:
            10px;

          right:
            10px;

          width:
            33px;

          height:
            33px;

          border:
            0;

          border-radius:
            50%;

          background:
            rgba(255,255,255,.92);

          color:
            #47535a;

          font-size:
            19px;

          cursor:
            pointer;
        }


        .popular-badge {

          position:
            absolute;

          top:
            11px;

          left:
            11px;

          background:
            #f2a438;

          color:
            white;

          padding:
            4px 7px;

          border-radius:
            5px;

          font-size:
            8px;

          font-weight:
            900;
        }


        .image-count {

          position:
            absolute;

          bottom:
            9px;

          right:
            9px;

          background:
            rgba(0,0,0,.55);

          color:
            white;

          padding:
            5px 7px;

          border-radius:
            5px;

          font-size:
            8px;
        }


        .image-dots {

          position:
            absolute;

          bottom:
            10px;

          left:
            50%;

          transform:
            translateX(-50%);

          display:
            flex;

          gap:
            4px;
        }


        .dot {

          width:
            5px;

          height:
            5px;

          border-radius:
            50%;

          background:
            rgba(255,255,255,.55);
        }


        .dot.active {

          background:
            white;

          width:
            14px;

          border-radius:
            5px;
        }


        /* ==========================================
           PROPERTY INFORMATION
        ========================================== */

        .property-information {

          padding:
            15px 17px;

          min-width:
            0;
        }


        .property-top {

          display:
            flex;

          justify-content:
            space-between;

          gap:
            12px;
        }


        .property-title-row {

          display:
            flex;

          align-items:
            center;

          gap:
            7px;

          flex-wrap:
            wrap;
        }


        .property-title-row h3 {

          margin:
            0;

          font-size:
            17px;

          letter-spacing:
            -.4px;
        }


        .verified-badge {

          background:
            #edf9f4;

          color:
            #087c60;

          border:
            1px solid #ccebdd;

          border-radius:
            5px;

          padding:
            3px 6px;

          font-size:
            7px;

          font-weight:
            900;
        }


        .property-location {

          margin-top:
            8px;

          font-size:
            10px;

          color:
            #596970;
        }


        .property-area {

          margin-top:
            3px;

          font-size:
            9px;

          color:
            #8a969c;
        }


        .rating {

          flex-shrink:
            0;

          color:
            #e39a25;

          font-size:
            11px;

          text-align:
            right;
        }


        .rating strong {

          color:
            #1b252b;

          font-size:
            12px;
        }


        .rating span {

          display:
            block;

          color:
            #89959b;

          font-size:
            7px;

          margin-top:
            3px;
        }


        .price-row {

          display:
            flex;

          align-items:
            baseline;

          justify-content:
            space-between;

          margin-top:
            14px;

          padding:
            10px 0;

          border-top:
            1px dashed #e3e7e8;

          border-bottom:
            1px dashed #e3e7e8;
        }


        .price-row strong {

          color:
            #087c60;

          font-size:
            20px;
        }


        .price-row span {

          color:
            #7e8a90;

          font-size:
            9px;

          margin-left:
            3px;
        }


        .price-row small {

          color:
            #89959b;

          font-size:
            8px;
        }


        .property-tags {

          display:
            flex;

          gap:
            6px;

          flex-wrap:
            wrap;

          margin-top:
            9px;
        }


        .property-tags span {

          background:
            #f4f6f7;

          border:
            1px solid #e4e8ea;

          border-radius:
            5px;

          padding:
            5px 7px;

          font-size:
            8px;

          color:
            #5f6e76;
        }


        .property-tags span.vacant {

          background:
            #edf9f3;

          color:
            #087c60;

          border-color:
            #cceadd;
        }


        .property-tags span.full {

          background:
            #fff0f0;

          color:
            #b34d4d;
        }


        .amenities {

          display:
            flex;

          flex-wrap:
            wrap;

          gap:
            5px;

          margin-top:
            10px;
        }


        .amenities span {

          color:
            #64737b;

          font-size:
            8px;
        }


        .owner-row {

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          margin-top:
            12px;
        }


        .owner-info {

          display:
            flex;

          align-items:
            center;

          gap:
            7px;
        }


        .owner-avatar {

          width:
            27px;

          height:
            27px;

          border-radius:
            50%;

          background:
            #eef2f3;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          font-size:
            15px;
        }


        .owner-info strong {

          display:
            block;

          font-size:
            8px;
        }


        .owner-info small {

          display:
            block;

          color:
            #8a969c;

          font-size:
            7px;

          margin-top:
            2px;
        }


        .secure-tag {

          color:
            #087c60;

          font-size:
            8px;

          font-weight:
            900;
        }


        .property-actions {

          display:
            flex;

          gap:
            7px;

          margin-top:
            12px;
        }


        .property-actions button {

          border:
            1px solid #dce2e4;

          background:
            white;

          border-radius:
            7px;

          padding:
            8px 10px;

          font-size:
            8px;

          font-weight:
            900;

          cursor:
            pointer;
        }


        .call-button {

          color:
            #087c60;

          border-color:
            #bde2d5 !important;

          background:
            #f1fbf7 !important;
        }


        .message-button {

          color:
            #3e687f;
        }


        .details-button {

          margin-left:
            auto;

          color:
            #fff;

          background:
            #087c60 !important;

          border-color:
            #087c60 !important;

        }


        /* ==========================================
           MAP
        ========================================== */

        .map-section {

          position:
            sticky;

          top:
            88px;

          align-self:
            start;
        }


        .map-card {

          background:
            white;

          border:
            1px solid #e0e5e7;

          border-radius:
            13px;

          overflow:
            hidden;

          box-shadow:
            0 5px 20px
            rgba(22,45,42,.05);
        }


        .map-header {

          height:
            58px;

          padding:
            10px 13px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;
        }


        .map-header strong {

          display:
            block;

          font-size:
            12px;
        }


        .map-header small {

          display:
            block;

          margin-top:
            3px;

          color:
            #8b979d;

          font-size:
            8px;
        }


        .map-header button {

          border:
            0;

          background:
            #f2f4f5;

          border-radius:
            7px;

          width:
            30px;

          height:
            30px;

          cursor:
            pointer;
        }


        .map-area {

          position:
            relative;

          height:
            475px;

          overflow:
            hidden;

          background:
            #edf1eb;
        }


        .map-grid {

          position:
            absolute;

          inset:
            0;

          background-image:
            linear-gradient(
              90deg,
              rgba(130,145,130,.15) 1px,
              transparent 1px
            ),
            linear-gradient(
              rgba(130,145,130,.15) 1px,
              transparent 1px
            );

          background-size:
            50px 50px;

          transform:
            rotate(-8deg)
            scale(1.3);
        }


        .map-road {

          position:
            absolute;

          background:
            rgba(255,255,255,.95);

          box-shadow:
            0 0 0 1px
            rgba(120,130,120,.08);
        }


        .road-one {

          width:
            120%;

          height:
            25px;

          top:
            40%;

          left:
            -10%;

          transform:
            rotate(-15deg);
        }


        .road-two {

          width:
            30px;

          height:
            120%;

          top:
            -10%;

          left:
            52%;

          transform:
            rotate(16deg);
        }


        .road-three {

          width:
            100%;

          height:
            16px;

          top:
            66%;

          left:
            0;

          transform:
            rotate(8deg);
        }


        .map-water {

          position:
            absolute;

          width:
            170px;

          height:
            100px;

          right:
            -30px;

          top:
            40px;

          background:
            #b9dbe1;

          border-radius:
            55% 45% 60% 40%;

          color:
            #6a9da6;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          font-size:
            9px;
        }


        .map-pin {

          position:
            absolute;

          transform:
            translate(-50%,-50%);

          border:
            2px solid white;

          background:
            #087c60;

          color:
            white;

          border-radius:
            7px;

          padding:
            6px 8px;

          font-size:
            8px;

          font-weight:
            900;

          box-shadow:
            0 3px 10px
            rgba(0,0,0,.22);

          cursor:
            pointer;

          z-index:
            5;
        }


        .map-pin.selected {

          background:
            #e89029;

          transform:
            translate(-50%,-50%)
            scale(1.15);
        }


        .map-location {

          position:
            absolute;

          left:
            50%;

          bottom:
            15px;

          transform:
            translateX(-50%);

          padding:
            7px 10px;

          border-radius:
            7px;

          background:
            rgba(255,255,255,.92);

          font-size:
            8px;

          color:
            #65737a;

          box-shadow:
            0 3px 15px
            rgba(0,0,0,.12);
        }


        .map-location span {

          display:
            inline-block;

          width:
            7px;

          height:
            7px;

          border-radius:
            50%;

          background:
            #07855f;

          margin-right:
            4px;
        }


        .map-3d-button {

          position:
            absolute;

          right:
            10px;

          bottom:
            12px;

          background:
            white;

          border:
            1px solid #d6dcde;

          border-radius:
            6px;

          padding:
            7px 10px;

          font-weight:
            900;

          font-size:
            9px;

          cursor:
            pointer;
        }


        .current-location {

          position:
            absolute;

          right:
            10px;

          bottom:
            55px;

          width:
            32px;

          height:
            32px;

          border:
            1px solid #d6dcde;

          background:
            white;

          border-radius:
            7px;

          cursor:
            pointer;

          font-size:
            17px;
        }


        .map-footer {

          padding:
            10px 13px;

          display:
            flex;

          justify-content:
            space-between;

          font-size:
            8px;

          color:
            #6e7c83;
        }


        .map-footer button {

          border:
            0;

          background:
            transparent;

          color:
            #087c60;

          font-weight:
            900;

          cursor:
            pointer;

          font-size:
            8px;
        }


        /* ==========================================
           OWNER CARD
        ========================================== */

        .owner-card {

          display:
            flex;

          gap:
            11px;

          margin-top:
            12px;

          padding:
            14px;

          background:
            linear-gradient(
              135deg,
              #eaf8f4,
              #f8fbfa
            );

          border:
            1px solid #cfe8df;

          border-radius:
            12px;
        }


        .owner-card-icon {

          width:
            37px;

          height:
            37px;

          border-radius:
            10px;

          background:
            #07855f;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          flex-shrink:
            0;

          font-size:
            19px;
        }


        .owner-card strong {

          font-size:
            11px;
        }


        .owner-card p {

          margin:
            4px 0 7px;

          color:
            #73838a;

          font-size:
            8px;

          line-height:
            1.5;
        }


        .owner-card button {

          border:
            0;

          background:
            transparent;

          color:
            #07855f;

          font-size:
            8px;

          font-weight:
            900;

          padding:
            0;

          cursor:
            pointer;
        }


        /* ==========================================
           SECURITY CARD
        ========================================== */

        .security-card {

          display:
            flex;

          gap:
            10px;

          padding:
            14px;

          margin-top:
            10px;

          border:
            1px solid #e0e5e7;

          border-radius:
            12px;

          background:
            white;
        }


        .security-icon {

          font-size:
            22px;
        }


        .security-card strong {

          font-size:
            10px;
        }


        .security-card p {

          margin:
            4px 0 0;

          color:
            #839098;

          font-size:
            8px;

          line-height:
            1.5;
        }


        /* ==========================================
           EMPTY
        ========================================== */

        .empty-state {

          padding:
            60px 20px;

          text-align:
            center;

          background:
            white;

          border:
            1px solid #e1e5e7;

          border-radius:
            13px;
        }


        .empty-state div {

          font-size:
            38px;
        }


        .empty-state h3 {

          margin:
            10px 0 5px;
        }


        .empty-state p {

          color:
            #839098;

          font-size:
            11px;
        }


        /* ==========================================
           MOBILE NAV
        ========================================== */

        .mobile-nav {

          display:
            none;
        }


        /* ==========================================
           RESPONSIVE
        ========================================== */

        @media(max-width: 1100px) {

          .rent-main {

            grid-template-columns:
              1fr;
          }


          .map-section {

            display:
              none;
          }

        }


        @media(max-width: 700px) {

          .rent-header-inner {

            padding:
              0 12px;
          }


          .header-button {

            display:
              none;
          }


          .owner-list-button {

            padding:
              8px 10px;

            font-size:
              9px;
          }


          .search-container {

            padding:
              22px 13px 18px;
          }


          .search-heading {

            align-items:
              flex-start;
          }


          .trust-box {

            display:
              none;
          }


          .search-heading h1 {

            font-size:
              32px;
          }


          .main-search {

            flex-wrap:
              wrap;

            gap:
              4px;
          }


          .location-selector {

            width:
              100%;

            border-right:
              0;

            border-bottom:
              1px solid #e5e9ea;
          }


          .search-input-wrapper {

            height:
              46px;
          }


          .search-button {

            height:
              42px;

            flex:
              1;
          }


          .category-container {

            padding:
              10px 13px;
          }


          .category-card {

            min-width:
              80px;

            height:
              65px;
          }


          .rent-main {

            padding:
              14px 10px 80px;
          }


          .result-heading h2 {

            font-size:
              17px;
          }


          .filter-mobile-button {

            display:
              block;
          }


          .filter-bar {

            display:
              none;

            flex-wrap:
              wrap;
          }


          .filter-bar.show {

            display:
              flex;
          }


          .rent-slider {

            margin-left:
              0;
          }


          .property-card {

            grid-template-columns:
              1fr;

          }


          .property-image {

            min-height:
              230px;

            height:
              230px;
          }


          .property-information {

            padding:
              13px;
          }


          .property-title-row h3 {

            font-size:
              15px;
          }


          .mobile-nav {

            position:
              fixed;

            display:
              flex;

            left:
              10px;

            right:
              10px;

            bottom:
              10px;

            height:
              60px;

            background:
              rgba(255,255,255,.96);

            border:
              1px solid #dfe5e7;

            border-radius:
              16px;

            box-shadow:
              0 10px 35px
              rgba(0,0,0,.15);

            z-index:
              999;

            align-items:
              center;

            justify-content:
              space-around;
          }


          .mobile-nav button {

            border:
              0;

            background:
              transparent;

            display:
              flex;

            flex-direction:
              column;

            gap:
              3px;

            align-items:
              center;

            font-size:
              17px;

            color:
              #607078;

            cursor:
              pointer;
          }


          .mobile-nav span {

            font-size:
              7px;

            font-weight:
              800;
          }

        }

      `}</style>

    </div>
  );
}