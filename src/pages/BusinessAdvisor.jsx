import React, { useEffect, useMemo, useState } from "react";
import {
  Circle,
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const BUSINESS_TYPES = [
  ["electronics", "📱 Electronics / Mobile"],
  ["electrical", "⚡ Electrical Shop"],
  ["services", "🛠️ Service Business"],
  ["retail", "🏪 General Retail"],
  ["food", "🍽️ Food & Cafe"],
  ["dairy", "🥛 Dairy"],
  ["poultry", "🍗 Poultry"],
  ["agriculture", "🌾 Agriculture"],
  ["manufacturing", "🏭 Manufacturing"],
  ["other", "💡 Other"],
];

const DEFAULT_CENTER = [23.3441, 85.3096];

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const GOOGLE_MAP_LIBRARIES = ["places"];

const GOOGLE_MAP_OPTIONS = {
  fullscreenControl: true,
  streetViewControl: true,
  zoomControl: true,
  clickableIcons: true,
  mapTypeControl: true,
  mapTypeControlOptions: {
    style: 1,
    position: 3,
    mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain"],
  },
};


const FEATURE_CARDS = [
  {
    icon: "🗺️",
    title: "Hyper-local map",
    text: "See your proposed business area and analysis radius.",
  },
  {
    icon: "🏪",
    title: "Competition",
    text: "Prepare the market layer for nearby business intelligence.",
  },
  {
    icon: "📈",
    title: "Demand signals",
    text: "Connect local evidence to an opportunity score.",
  },
  {
    icon: "💰",
    title: "Financial fit",
    text: "Connect business feasibility with available capital.",
  },
  {
    icon: "🏠",
    title: "Space intelligence",
    text: "Bring commercial rent and location suitability into the decision.",
  },
  {
    icon: "🤖",
    title: "AI next step",
    text: "Turn evidence into a simple action plan in Hindi or English.",
  },
];

function MapRecenter({ center, zoom = 13 }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.flyTo(center, zoom, { duration: 1.1 });
  }, [center, zoom, map]);

  return null;
}

function BusinessGoogleMap({
  center,
  radius,
  location,
  onSelectLocation,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [mapType, setMapType] = useState("roadmap");

  if (loadError) {
    return (
      <div style={styles.mapError}>
        Google Maps could not be loaded. Check your API key configuration.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={styles.mapLoading}>
        Loading Google Maps…
      </div>
    );
  }

  const mapCenter = {
    lat: Number(center?.[0] ?? DEFAULT_CENTER[0]),
    lng: Number(center?.[1] ?? DEFAULT_CENTER[1]),
  };

  const markerPosition = center
    ? {
        lat: Number(center[0]),
        lng: Number(center[1]),
      }
    : null;

  const selectPoint = (lat, lng) => {
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      onSelectLocation([lat, lng]);

      if (map) {
        map.panTo({
          lat,
          lng,
        });
        map.setZoom(15);
      }
    }
  };

  const handleMapClick = (event) => {
    const lat = event.latLng?.lat();
    const lng = event.latLng?.lng();

    selectPoint(lat, lng);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectPoint(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      (error) => {
        console.error("Map geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const refreshMap = () => {
    if (!map) return;

    const target = markerPosition || mapCenter;

    map.panTo(target);
    map.setZoom(markerPosition ? 15 : 5);

    google.maps.event.trigger(map, "resize");
  };

  const resetMap = () => {
    if (!map) return;

    setMapType("roadmap");
    map.setMapTypeId("roadmap");
    map.panTo({
      lat: DEFAULT_CENTER[0],
      lng: DEFAULT_CENTER[1],
    });
    map.setZoom(5);
  };

  const fitRadius = () => {
    if (!map || !markerPosition) return;

    const radiusMeters = Number(radius) * 1000;

    const latOffset =
      radiusMeters / 111320;

    const lngOffset =
      radiusMeters /
      (111320 *
        Math.cos(
          (markerPosition.lat * Math.PI) / 180
        ));

    const bounds = new window.google.maps.LatLngBounds(
      {
        lat: markerPosition.lat - latOffset,
        lng: markerPosition.lng - lngOffset,
      },
      {
        lat: markerPosition.lat + latOffset,
        lng: markerPosition.lng + lngOffset,
      }
    );

    map.fitBounds(bounds);
  };

  const changeMapType = (event) => {
    const nextType = event.target.value;

    setMapType(nextType);

    if (map) {
      map.setMapTypeId(nextType);
    }
  };

  return (
    <div style={styles.advancedMapContainer}>
      <GoogleMap
        center={mapCenter}
        zoom={center ? 14 : 5}
        mapContainerStyle={styles.map}
        options={{
          ...GOOGLE_MAP_OPTIONS,
          mapTypeControl: false,
        }}
        onLoad={(mapInstance) => {
          setMap(mapInstance);
          mapInstance.setMapTypeId(mapType);
        }}
        onClick={handleMapClick}
      >
        {markerPosition && (
          <>
            <MarkerF
              position={markerPosition}
              draggable
              title={
                location ||
                "Selected business location"
              }
              onDragEnd={(event) => {
                const lat = event.latLng?.lat();
                const lng = event.latLng?.lng();

                selectPoint(lat, lng);
              }}
            />

            <Circle
              center={markerPosition}
              radius={Number(radius) * 1000}
              options={{
                strokeColor: "#10b981",
                strokeOpacity: 0.9,
                strokeWeight: 2,
                fillColor: "#10b981",
                fillOpacity: 0.10,
                clickable: false,
              }}
            />
          </>
        )}
      </GoogleMap>

      <div style={styles.advancedMapToolbar}>
        <div style={styles.mapToolGroup}>
          <span style={styles.mapToolLabel}>
            LAYERS
          </span>

          <select
            value={mapType}
            onChange={changeMapType}
            style={styles.mapTypeSelect}
          >
            <option value="roadmap">
              Roadmap
            </option>
            <option value="satellite">
              Satellite
            </option>
            <option value="hybrid">
              Hybrid
            </option>
            <option value="terrain">
              Terrain
            </option>
          </select>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          style={styles.mapToolButton}
          title="Use my current location"
        >
          ◎
          <span>My location</span>
        </button>

        <button
          type="button"
          onClick={refreshMap}
          style={styles.mapToolButton}
          title="Refresh map"
        >
          ↻
          <span>Refresh</span>
        </button>

        <button
          type="button"
          onClick={fitRadius}
          disabled={!markerPosition}
          style={{
            ...styles.mapToolButton,
            opacity: markerPosition ? 1 : 0.45,
          }}
          title="Fit analysis radius"
        >
          ◌
          <span>Fit area</span>
        </button>

        <button
          type="button"
          onClick={resetMap}
          style={styles.mapToolButton}
          title="Reset map"
        >
          ⌂
          <span>Reset</span>
        </button>
      </div>

      <div style={styles.mapInstruction}>
        <span>📍</span>
        Click anywhere to select a business location · Drag the pin to fine-tune
      </div>
    </div>
  );
}


function AnimatedCounter({ value, suffix = "" }) {
  const numeric = Number(value) || 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 700;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(numeric * eased));

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numeric]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}

export default function BusinessAdvisor() {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [capital, setCapital] = useState("");
  const [experience, setExperience] = useState("beginner");
  const [radius, setRadius] = useState("5");

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);

  const selectedBusinessLabel = useMemo(
    () =>
      BUSINESS_TYPES.find(([value]) => value === businessType)?.[1] ||
      "Business",
    [businessType]
  );

  const resolvedCoordinates =
    coordinates ||
    (result?.coordinates
      ? [
          Number(result.coordinates.latitude),
          Number(result.coordinates.longitude),
        ]
      : null);

  const geocodeLocation = async () => {
    setLocationError("");

    if (!location.trim()) {
      setLocationError(
        "Enter a village, town, block, district or full address."
      );
      return null;
    }

    setLocationLoading(true);

    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        q: location.trim(),
        limit: "1",
        addressdetails: "1",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "en",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !Array.isArray(data) || data.length === 0) {
        throw new Error(
          "Location not found. Try a more specific place name."
        );
      }

      const place = data[0];
      const lat = Number(place.lat);
      const lon = Number(place.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("The location returned invalid coordinates.");
      }

      const nextCoordinates = [lat, lon];

      setCoordinates(nextCoordinates);
      setLocationDetails({
        displayName: place.display_name,
        type: place.type,
        address: place.address || {},
      });

      return nextCoordinates;
    } catch (err) {
      console.error("Location lookup error:", err);
      setCoordinates(null);
      setLocationDetails(null);
      setLocationError(err.message || "Could not resolve this location.");
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const useMyLocation = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("This browser does not support location access.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        setCoordinates(nextCoordinates);
        setLocationDetails({
          displayName: "Your current location",
          type: "current-location",
          address: {},
        });
        setLocation("Current location");
        setLocationLoading(false);
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);
        setLocationLoading(false);
        setLocationError(
          "Location permission was not available. You can search manually."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const analyzeBusiness = async () => {
    setError("");
    setResult(null);

    if (!businessType) {
      setError("Please select your business type.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter your location.");
      return;
    }

    if (!capital || Number(capital) <= 0) {
      setError("Please enter your available capital.");
      return;
    }

    setLoading(true);

    try {
      let currentCoordinates = coordinates;

      if (!currentCoordinates) {
        currentCoordinates = await geocodeLocation();
      }

      const intakeResponse = await fetch(
        `${API_BASE}/business/analyze-intake`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            business_type: businessType,
            location_text: location.trim(),
            available_capital: capital,
            experience_level: experience,
            radius_km: Number(radius),
            latitude: currentCoordinates?.[0] ?? null,
            longitude: currentCoordinates?.[1] ?? null,
          }),
        }
      );

      const intakeText = await intakeResponse.text();

      let intakeData = {};
      try {
        intakeData = intakeText ? JSON.parse(intakeText) : {};
      } catch {
        intakeData = {
          error: intakeText || "Invalid server response.",
        };
      }

      if (!intakeResponse.ok || !intakeData.success) {
        throw new Error(
          intakeData.error ||
            intakeData.message ||
            `Server returned HTTP ${intakeResponse.status}`
        );
      }

      const financeResponse = await fetch(
        `${API_BASE}/business/financial-structure`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            available_capital: capital,
          }),
        }
      );

      const financeText = await financeResponse.text();

      let financeData = {};
      try {
        financeData = financeText ? JSON.parse(financeText) : {};
      } catch {
        financeData = {
          error: financeText || "Invalid financial server response.",
        };
      }

      if (!financeResponse.ok || !financeData.success) {
        throw new Error(
          financeData.error ||
            financeData.message ||
            `Financial server returned HTTP ${financeResponse.status}`
        );
      }

      const localEvidenceResponse = await fetch(
        `${API_BASE}/business/local-evidence`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            latitude: currentCoordinates?.[0] ?? null,
            longitude: currentCoordinates?.[1] ?? null,
            radius_km: Number(radius),
          }),
        }
      );

      const localEvidenceText =
        await localEvidenceResponse.text();

      let localEvidenceData = {};

      try {
        localEvidenceData = localEvidenceText
          ? JSON.parse(localEvidenceText)
          : {};
      } catch {
        localEvidenceData = {
          error:
            localEvidenceText ||
            "Invalid local evidence response.",
        };
      }

      if (
  !localEvidenceResponse.ok ||
  !localEvidenceData.success
) {
  console.warn(
    "Local evidence unavailable:",
    localEvidenceData.error ||
      localEvidenceData.message ||
      `HTTP ${localEvidenceResponse.status}`
  );

  localEvidenceData = {
    success: false,
    local_evidence: null,
    error:
      localEvidenceData.error ||
      localEvidenceData.message ||
      `Local evidence unavailable (HTTP ${localEvidenceResponse.status})`,
  };
}

      const businessEvidenceResponse = await fetch(
        `${API_BASE}/business/business-evidence`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            business_type: businessType,
            latitude: currentCoordinates?.[0] ?? null,
            longitude: currentCoordinates?.[1] ?? null,
            radius_km: Number(radius),
          }),
        }
      );

      const businessEvidenceText =
        await businessEvidenceResponse.text();

      let businessEvidenceData = {};

      try {
        businessEvidenceData = businessEvidenceText
          ? JSON.parse(businessEvidenceText)
          : {};
      } catch {
        businessEvidenceData = {
          error:
            businessEvidenceText ||
            "Invalid business evidence response.",
        };
      }

      if (
        !businessEvidenceResponse.ok ||
        !businessEvidenceData.success
      ) {
        throw new Error(
          businessEvidenceData.error ||
            businessEvidenceData.message ||
            `Business evidence server returned HTTP ${businessEvidenceResponse.status}`
        );
      }

      setResult({
        ...intakeData,
        financial_structure:
          financeData.financial_structure,
        local_evidence:
          localEvidenceData.local_evidence,
        business_evidence:
          businessEvidenceData.business_evidence,
      });

      if (!currentCoordinates && intakeData.coordinates) {
        const lat = Number(intakeData.coordinates.latitude);
        const lon = Number(intakeData.coordinates.longitude);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setCoordinates([lat, lon]);
        }
      }

      setTimeout(() => {
        document
          .getElementById("business-insight")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      console.error("Business Advisor error:", err);
      setError(
        err.message || "Could not connect to AmiVest Business Advisor."
      );
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = resolvedCoordinates || DEFAULT_CENTER;
  const radiusMeters = Number(radius) * 1000;

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowOne}></div>
      <div style={styles.backgroundGlowTwo}></div>
      <div style={styles.gridOverlay}></div>

      <main style={styles.container}>
        <header style={styles.topbar}>
          <div style={styles.brand}>
            <div style={styles.brandMark}>A</div>
            <div>
              <div style={styles.brandName}>AmiVest</div>
              <div style={styles.brandSub}>Business Intelligence</div>
            </div>
          </div>

          <div style={styles.topPill}>
            <span style={styles.liveDot}></span>
            AI decision workspace
          </div>
        </header>

        <section style={styles.hero}>
          <div style={styles.heroKicker}>
            <span style={styles.kickerLine}></span>
            AMIBUSINESS AI
          </div>

          <h1 style={styles.heroTitle}>
            Should you open this
            <br />
            <span style={styles.heroAccent}>business here?</span>
          </h1>

          <p style={styles.heroText}>
            Turn a business idea into a location-aware decision using
            market context, competition, rent signals and financial fit.
          </p>

          <div style={styles.heroChips}>
            <span style={styles.heroChip}>📍 Hyper-local</span>
            <span style={styles.heroChip}>📊 Evidence-led</span>
            <span style={styles.heroChip}>💰 Finance-ready</span>
            <span style={styles.heroChip}>🗣️ Hindi + English</span>
          </div>
        </section>

        <section style={styles.commandCard}>
          <div style={styles.commandGlow}></div>

          <div style={styles.formGrid}>
            <Field label="BUSINESS TYPE">
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                style={styles.input}
              >
                <option value="">Select your business</option>
                {BUSINESS_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="LOCATION">
              <div style={styles.inputWithAction}>
                <input
                  value={location}
                  onFocus={() => setShowLocationMap(true)}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setLocationError("");
                    setShowLocationMap(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") geocodeLocation();
                  }}
                  placeholder="Village / town / district"
                  style={{ ...styles.input, marginTop: 0, paddingRight: 48 }}
                />
                <button
                  type="button"
                  title="Locate"
                  onClick={geocodeLocation}
                  disabled={locationLoading}
                  style={styles.inputAction}
                >
                  {locationLoading ? "…" : "⌖"}
                </button>
              </div>

              {showLocationMap && (
                <div style={styles.locationMapPicker}>
                  <div style={styles.locationMapHeader}>
                    <div>
                      <strong style={styles.locationMapTitle}>
                        Select business location
                      </strong>
                      <span style={styles.locationMapHint}>
                        Click the map, drag the pin, or choose Satellite.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowLocationMap(false)}
                      style={styles.locationMapClose}
                    >
                      ×
                    </button>
                  </div>

                  <div style={styles.locationMap}>
                    <BusinessGoogleMap
                      center={resolvedCoordinates}
                      radius={radius}
                      location={location}
                      onSelectLocation={(coords) => {
                        setCoordinates(coords);
                        setLocationError("");
                      }}
                    />
                  </div>

                  <div style={styles.locationMapFooter}>
                    <button
                      type="button"
                      onClick={useMyLocation}
                      disabled={locationLoading}
                      style={styles.mapLocationButton}
                    >
                      ◎ Use my current location
                    </button>

                    {resolvedCoordinates && (
                      <span style={styles.coordinatesText}>
                        {resolvedCoordinates[0].toFixed(5)},{" "}
                        {resolvedCoordinates[1].toFixed(5)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Field>

            <Field label="AVAILABLE CAPITAL">
              <div style={styles.currencyInput}>
                <span style={styles.currency}>₹</span>
                <input
                  type="number"
                  min="1"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  placeholder="2,00,000"
                  style={{
                    ...styles.input,
                    marginTop: 0,
                    paddingLeft: 32,
                  }}
                />
              </div>
            </Field>

            <Field label="RADIUS">
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                style={styles.input}
              >
                <option value="1">1 km</option>
                <option value="3">3 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
              </select>
            </Field>

            <button
              type="button"
              onClick={analyzeBusiness}
              disabled={loading}
              style={{
                ...styles.analyzeButton,
                opacity: loading ? 0.72 : 1,
              }}
            >
              <span>{loading ? "Analyzing…" : "Analyze Opportunity"}</span>
              <span style={styles.arrowCircle}>→</span>
            </button>
          </div>

          <div style={styles.commandBottom}>
            <div style={styles.quickLocate}>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locationLoading}
                style={styles.textButton}
              >
                ◎ Use my current location
              </button>

              {locationError && (
                <span style={styles.inlineError}>⚠ {locationError}</span>
              )}
            </div>

            <div style={styles.commandHint}>
              Start with your location. AmiVest builds the decision from
              there.
            </div>
          </div>
        </section>

        <section style={styles.featureStrip}>
          {FEATURE_CARDS.slice(0, 4).map((feature) => (
            <div key={feature.title} style={styles.miniFeature}>
              <div style={styles.miniIcon}>{feature.icon}</div>
              <div>
                <strong style={{ fontSize: 10 }}>{feature.title}</strong>
                <span style={{ color: "#82979d", fontSize: 8, lineHeight: 1.35, marginTop: 2 }}>{feature.text}</span>
              </div>
            </div>
          ))}
        </section>

        <section style={styles.workspace}>
          <div style={styles.mapPanel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.eyebrow}>01 · LOCATION INTELLIGENCE</div>
                <h2 style={styles.panelTitle}>Your business area</h2>
                <p style={styles.panelSub}>
                  Locate the area first. The market intelligence layer comes
                  next.
                </p>
              </div>

              <div style={styles.radiusPill}>
                <span>◌</span> {radius} km
              </div>
            </div>

            <div style={styles.mapWrap}>
              <BusinessGoogleMap
                center={resolvedCoordinates}
                radius={radius}
                location={location}
                onSelectLocation={(coords) => {
                  setCoordinates(coords);
                  setLocationError("");
                }}
              />

              {!resolvedCoordinates && (
                <div style={styles.mapEmptyOverlay}>
                  <div style={styles.mapPulse}>
                    <span>📍</span>
                  </div>
                  <strong>Click the map to select your location</strong>
                  <span>
                    You can also search above or use your current location.
                  </span>
                </div>
              )}

              <div style={styles.mapBadge}>
                <span style={styles.liveDot}></span>
                Google Maps
              </div>
            </div>

            <div style={styles.mapFooter}>
              <div style={styles.mapFooterItem}>
                <span style={styles.greenDot}></span>
                Proposed location
              </div>

              <div style={styles.mapFooterItem}>
                <span style={styles.ringDot}></span>
                Analysis radius
              </div>

              <div style={styles.mapSource}>Google Maps</div>
            </div>

            {locationDetails && (
              <div style={styles.resolvedCard}>
                <div>
                  <div style={styles.resolvedLabel}>RESOLVED LOCATION</div>
                  <div style={styles.resolvedName}>
                    {locationDetails.displayName}
                  </div>
                </div>

                {resolvedCoordinates && (
                  <div style={styles.coords}>
                    {resolvedCoordinates[0].toFixed(5)},{" "}
                    {resolvedCoordinates[1].toFixed(5)}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside style={styles.sidePanel}>
            <div style={styles.eyebrow}>02 · DECISION LAYERS</div>
            <h2 style={styles.sideTitle}>Everything that matters</h2>
            <p style={styles.sideText}>
              AmiVest is designed to connect the business idea, local market
              and money decision instead of giving you a generic score.
            </p>

            <div style={styles.layerList}>
              {FEATURE_CARDS.map((feature, index) => (
                <div key={feature.title} style={styles.layerItem}>
                  <div style={styles.layerNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div style={styles.layerIcon}>{feature.icon}</div>
                  <div style={styles.layerContent}>
                    <strong>{feature.title}</strong>
                    <span>{feature.text}</span>
                  </div>
                  <div style={styles.layerArrow}>↗</div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section id="business-insight" style={styles.insightPanel}>
          {!result ? (
            <>
              <div style={styles.insightIntro}>
                <div style={styles.insightOrb}>✦</div>
                <div>
                  <div style={styles.eyebrow}>03 · AMIVEST INTELLIGENCE</div>
                  <h2 style={styles.insightTitle}>
                    Your business decision workspace
                  </h2>
                  <p style={styles.insightText}>
                    Run an analysis above. The result area will become the
                    bridge between local evidence, business feasibility and
                    the financial modules already present in AmiVest.
                  </p>
                </div>
              </div>

              <div style={styles.waitingGrid}>
                {[
                  ["📍", "Market reach", "Understand the local catchment"],
                  ["🏪", "Competition", "Measure nearby business pressure"],
                  ["💹", "Opportunity", "Find underserved signals"],
                  ["💰", "Financial fit", "Connect capital to project needs"],
                ].map(([icon, title, text]) => (
                  <div key={title} style={styles.waitingCard}>
                    <span>{icon}</span>
                    <strong style={{ fontSize: 10 }}>{title}</strong>
                    <small style={{ color: "#80979d", fontSize: 8, lineHeight: 1.4 }}>{text}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <AnalysisResult
              result={result}
              selectedBusinessLabel={selectedBusinessLabel}
              location={location}
              capital={capital}
              radius={radius}
            />
          )}
        </section>

        <footer style={styles.footer}>
          <div>
            <strong>AmiVest</strong> · Business decision intelligence
          </div>
          <div>
            Evidence first · calculations separate from AI · uncertainty
            disclosed
          </div>
        </footer>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function AnalysisResult({
  result,
  selectedBusinessLabel,
  location,
  capital,
  radius,
}) {
  const apiScore =
    Number(
      result.score ??
        result.opportunity_score ??
        result.business_score ??
        0
    ) || 0;

  const score =
    apiScore > 0
      ? Math.max(0, Math.min(100, apiScore))
      : null;

  const scoreLabel =
    score === null
      ? "Awaiting intelligence"
      : score >= 75
      ? "Strong potential"
      : score >= 55
      ? "Needs validation"
      : "High caution";

  const finance = result.financial_structure || null;
  const scheme = finance?.scheme || null;
  const repayment = finance?.repayment || null;

  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });

  const moneyDecimal = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div>
      <div style={styles.resultTop}>
        <div>
          <div style={styles.eyebrow}>03 · PRELIMINARY DECISION</div>
          <h2 style={styles.insightTitle}>Business opportunity</h2>
          <p style={styles.insightText}>
            This is a preliminary intelligence layer. It should not be
            treated as a guarantee of business success.
          </p>
        </div>

        <div style={styles.scoreBox}>
          <div style={styles.scoreRing}>
            <div style={styles.scoreValue}>
              {score === null ? "—" : <AnimatedCounter value={score} />}
            </div>
            <div style={styles.scoreSmall}>/100</div>
          </div>
          <div>
            <div style={styles.scoreLabel}>{scoreLabel}</div>
            <div style={styles.scoreCaption}>
              {score === null
                ? "More local evidence required"
                : "Preliminary opportunity signal"}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.resultStats}>
        <Stat
          label="Business"
          value={result.intake?.business_type || selectedBusinessLabel}
          icon="🏪"
        />

        <Stat
          label="Location"
          value={result.intake?.location || location}
          icon="📍"
        />

        <Stat
          label="Capital"
          value={`₹${money(
            result.intake?.available_capital || capital
          )}`}
          icon="₹"
        />

        <Stat
          label="Radius"
          value={`${result.intake?.radius_km || radius} km`}
          icon="⌁"
        />
      </div>

      {finance && (
        <div style={styles.financeSection}>
          <div style={styles.financeHeader}>
            <div>
              <div style={styles.eyebrow}>
                04 · FINANCIAL STRUCTURE
              </div>

              <h2 style={styles.insightTitle}>
                Funding plan
              </h2>

              <p style={styles.insightText}>
                A deterministic estimate based on the capital entered
                in your business request.
              </p>
            </div>

            <div style={styles.financeBadge}>
              STRUCTURED
            </div>
          </div>

          <div style={styles.financeGrid}>
            <div style={styles.financeCard}>
              <div style={styles.financeLabel}>
                Available margin capital
              </div>

              <div style={styles.financeValue}>
                ₹{money(finance.margin_capital)}
              </div>

              <div style={styles.financeCaption}>
                Your available contribution
              </div>
            </div>

            <div style={styles.financeCard}>
              <div style={styles.financeLabel}>
                Estimated project cost
              </div>

              <div style={styles.financeValue}>
                ₹{money(finance.project_cost)}
              </div>

              <div style={styles.financeCaption}>
                Based on 10% contribution parameter
              </div>
            </div>

            <div style={styles.financeCard}>
              <div style={styles.financeLabel}>
                Maximum financing
              </div>

              <div style={styles.financeValue}>
                ₹{money(finance.maximum_financing)}
              </div>

              <div style={styles.financeCaption}>
                Up to 90% of project cost
              </div>
            </div>

            <div style={styles.financeCardHighlight}>
              <div style={styles.financeLabel}>
                Estimated monthly EMI
              </div>

              <div style={styles.financeValueLarge}>
                ₹{moneyDecimal(repayment?.estimated_emi)}
              </div>

              <div style={styles.financeCaption}>
                Indicative reducing-balance EMI
              </div>
            </div>
          </div>

          {scheme && (
            <div style={styles.schemeCard}>
              <div>
                <div style={styles.financeLabel}>
                  ROUTED FINANCING OPTION
                </div>

                <div style={styles.schemeName}>
                  {scheme.name}
                </div>
              </div>

              <div style={styles.schemeMeta}>
                <div>
                  <span>Interest</span>
                  <strong>
                    {scheme.interest_rate_percent}% p.a.
                  </strong>
                </div>

                <div>
                  <span>Tenure</span>
                  <strong>
                    {scheme.tenure_years} years
                  </strong>
                </div>

                <div>
                  <span>Moratorium</span>
                  <strong>
                    {scheme.moratorium_months} months
                  </strong>
                </div>

                <div>
                  <span>Total repayment</span>
                  <strong>
                    ₹{money(repayment?.estimated_total_repayment)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div style={styles.validationNote}>
            <span>ⓘ</span>

            <div>
              <strong>Important:</strong>{" "}
              {finance.validation?.message ||
                "Financial scheme parameters require official validation before any borrowing decision."}
            </div>
          </div>
        </div>
      )}

      <LocalEvidencePanel
        evidence={result.business_evidence}
      />

      <div style={styles.resultColumns}>
        <div style={styles.resultBox}>
          <div style={styles.resultBoxTitle}>
            WHAT WE HAVE NOW
          </div>

          <div style={styles.resultBullet}>
            <span>✓</span>
            Business request captured
          </div>

          <div style={styles.resultBullet}>
            <span>✓</span>
            Location context attached
          </div>

          <div style={styles.resultBullet}>
            <span>✓</span>
            Analysis radius selected
          </div>

          {finance && (
            <>
              <div style={styles.resultBullet}>
                <span>✓</span>
                Financial structure calculated
              </div>

              <div style={styles.resultBullet}>
                <span>✓</span>
                Financing route identified
              </div>
            </>
          )}
        </div>

        <div style={styles.resultBox}>
          <div style={styles.resultBoxTitle}>
            NEXT INTELLIGENCE
          </div>

          {(result.next_modules || [
            "Market reach",
            "Competitor mapping",
            "Pricing intelligence",
            "Break-even analysis",
            "AI next-step guidance",
          ]).map((item) => (
            <div key={item} style={styles.resultBullet}>
              <span>→</span>
              {item}
            </div>
          ))}
        </div>

        <div style={styles.resultBoxHighlight}>
          <div style={styles.resultBoxTitle}>
            AMIVEST PRINCIPLE
          </div>

          <p>
            Local data should be traceable. Unknown information should
            be clearly marked as unknown instead of being presented as fact.
          </p>
        </div>
      </div>
    </div>
  );
}

function LocalEvidencePanel({ evidence }) {
  if (!evidence) return null;

  const summary = evidence.summary || {};
  const places = Array.isArray(evidence.places) ? evidence.places : [];
  const direct = Array.isArray(evidence.direct_competitors)
    ? evidence.direct_competitors
    : [];
  const related = Array.isArray(evidence.related_competitors)
    ? evidence.related_competitors
    : [];

  // Google Places and the backend may use slightly different field names.
  // Keep the UI tolerant so a backend schema change does not break the page.
  const businessCount = Number(
    summary.business_count ??
      summary.place_count ??
      summary.total_businesses ??
      summary.count ??
      places.length ??
      0
  );

  const directCount = Number(
    summary.direct_competitor_count ?? direct.length ?? 0
  );

  const relatedCount = Number(
    summary.related_competitor_count ?? related.length ?? 0
  );

  const averageRatingRaw =
    summary.average_rating ?? summary.avg_rating ?? null;
  const averageRating = Number.isFinite(Number(averageRatingRaw))
    ? Number(averageRatingRaw)
    : null;

  const totalReviews = Number(
    summary.total_reviews ?? summary.review_count ?? 0
  );

  const pressure =
    summary.competition_pressure ||
    summary.pressure ||
    (businessCount > 8
      ? "High"
      : businessCount > 3
        ? "Medium"
        : businessCount > 0
          ? "Low"
          : "Unknown");

  const sourceProvider =
    evidence.source?.provider ||
    evidence.data_quality?.provider ||
    "Local business data";

  const radius =
    evidence.radius_km ?? evidence.query?.radius_km ?? 5;

  const hasData =
    evidence.data_available !== false &&
    (businessCount > 0 || places.length > 0 || direct.length > 0);

  const ratingValues = places
    .map((place) => Number(place.rating))
    .filter((value) => Number.isFinite(value) && value > 0);

  const excellentRatings = ratingValues.filter((value) => value >= 4.5).length;
  const lowRatings = ratingValues.filter((value) => value < 4).length;

  const sortedPlaces = [...places].sort((a, b) => {
    const da = Number(a.distance_km);
    const db = Number(b.distance_km);
    if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
    if (Number.isFinite(da)) return -1;
    if (Number.isFinite(db)) return 1;
    return 0;
  });

  const displayedPlaces = sortedPlaces.slice(0, 10);

  const getPlaceName = (place) =>
    place.name ||
    place.displayName?.text ||
    place.displayName ||
    "Unnamed business";

  const getPlaceType = (place) => {
    if (place.primaryTypeDisplayName?.text) {
      return place.primaryTypeDisplayName.text;
    }

    if (place.primaryType) {
      return String(place.primaryType)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    if (place.category && typeof place.category === "string") {
      return place.category
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return "Nearby business";
  };

  const getMapsUrl = (place) =>
    place.googleMapsUri ||
    place.google_maps_uri ||
    (place.latitude != null && place.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${place.latitude},${place.longitude}`
        )}`
      : null);

  const pressureText =
    pressure === "High"
      ? "Many nearby businesses are visible. Differentiation will be important."
      : pressure === "Medium"
        ? "There is visible competition, but the market may still have room for a differentiated offer."
        : pressure === "Low"
          ? "Few nearby businesses were found in the selected search area. Validate demand before concluding that competition is low."
          : "Competition cannot be reliably classified from the available local data.";

  return (
    <div
      style={{
        marginTop: 20,
        padding: 22,
        borderRadius: 22,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fcfa 100%)",
        border: "1px solid rgba(21,67,61,.09)",
        boxShadow: "0 16px 45px rgba(24,73,65,.07)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 15,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={styles.eyebrow}>05 · LOCAL MARKET INTELLIGENCE</div>
          <h2 style={styles.insightTitle}>Business competition & market signals</h2>
          <p style={styles.insightText}>
            Business-specific local evidence for the selected location and search radius.
          </p>
        </div>

        <div
          style={{
            padding: "7px 11px",
            borderRadius: 999,
            background: hasData ? "#eef9f4" : "#fff7ed",
            color: hasData ? "#07865f" : "#b45309",
            fontSize: 8,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          ● {sourceProvider}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 9,
          color: "#72898f",
          fontSize: 9,
        }}
      >
        <span style={marketPillStyle}>📍 {radius} km radius</span>
        <span style={marketPillStyle}>🏪 Business-specific search</span>
        <span style={marketPillStyle}>🧭 Location evidence</span>
      </div>

      {!hasData ? (
        <div
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 15,
            background: "#fffaf3",
            border: "1px solid #f3dfc2",
          }}
        >
          <strong style={{ display: "block", color: "#8a5a13", fontSize: 12 }}>
            Local business data is currently unavailable
          </strong>
          <p style={{ margin: "7px 0 0", color: "#8b7353", fontSize: 9, lineHeight: 1.55 }}>
            AmiVest will not invent competitor counts. Try again later or validate the
            location manually before making a business decision.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 10,
              marginTop: 18,
            }}
          >
            <MarketMetric icon="🏪" label="Businesses found" value={businessCount} />
            <MarketMetric
              icon="⭐"
              label="Average rating"
              value={averageRating !== null ? averageRating.toFixed(1) : "—"}
            />
            <MarketMetric icon="💬" label="Review count" value={totalReviews} />
            <MarketMetric
              icon="🔥"
              label="Competition"
              value={pressure}
              valueStyle={{
                color:
                  pressure === "High"
                    ? "#c2410c"
                    : pressure === "Medium"
                      ? "#a16207"
                      : pressure === "Low"
                        ? "#07865f"
                        : "#64748b",
                fontSize: 14,
              }}
            />
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <SignalCard
              icon="🎯"
              title="Direct competition"
              value={directCount}
              text="Businesses most relevant to your selected category."
            />
            <SignalCard
              icon="↔️"
              title="Related businesses"
              value={relatedCount}
              text="Substitutes or adjacent businesses that may affect demand."
            />
            <SignalCard
              icon="📊"
              title="Market signal"
              value={ratingValues.length > 0 ? `${ratingValues.length} rated` : "Limited"}
              text={
                ratingValues.length > 0
                  ? `${excellentRatings} highly rated · ${lowRatings} below 4.0`
                  : "Ratings are not available for enough nearby places."
              }
            />
          </div>

          <div
            style={{
              marginTop: 15,
              padding: 15,
              borderRadius: 15,
              background: "#f6fbf8",
              border: "1px solid #dfeee7",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ fontSize: 18 }}>🧠</div>
              <div>
                <strong style={{ fontSize: 11, color: "#17343a" }}>
                  Competition interpretation
                </strong>
                <div style={{ marginTop: 4, fontSize: 9, lineHeight: 1.55, color: "#61777e" }}>
                  {pressureText}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={styles.resultBoxTitle}>NEARBY BUSINESSES</div>
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {displayedPlaces.length > 0 ? (
                displayedPlaces.map((place, index) => {
                  const mapsUrl = getMapsUrl(place);
                  const rating = Number(place.rating);
                  const reviewCount = Number(
                    place.userRatingCount ?? place.user_rating_count ?? 0
                  );
                  const distance = Number(place.distance_km);

                  return (
                    <div
                      key={place.id || place.place_id || `${getPlaceName(place)}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 13px",
                        borderRadius: 13,
                        background: "#ffffff",
                        border: "1px solid #e4eeea",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            fontSize: 10,
                            color: "#29454b",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getPlaceName(place)}
                        </strong>
                        <span style={{ display: "block", marginTop: 3, fontSize: 8, color: "#7b9096" }}>
                          {getPlaceType(place)}
                          {Number.isFinite(rating) && rating > 0
                            ? ` · ${rating.toFixed(1)} ⭐`
                            : " · Rating unavailable"}
                          {reviewCount > 0 ? ` · ${reviewCount} reviews` : ""}
                        </span>
                      </div>

                      <span
                        style={{
                          flex: "0 0 auto",
                          fontSize: 8,
                          fontWeight: 800,
                          color: "#0d8d68",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {Number.isFinite(distance) ? `${distance.toFixed(2)} km` : "Distance —"}
                      </span>

                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "7px 9px",
                            borderRadius: 9,
                            background: "#eef9f4",
                            color: "#087a5a",
                            fontSize: 8,
                            fontWeight: 900,
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Maps ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: 8, color: "#9aa9ad" }}>Map —</span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "#f8fbfa",
                    color: "#71878d",
                    fontSize: 9,
                  }}
                >
                  A business count is available, but individual place records were not returned.
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 11,
              background: "#f7faf9",
              color: "#71878d",
              fontSize: 8,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "#536b72" }}>Customer feedback signal:</strong>{" "}
            this version uses available rating and review-count signals. It does not claim
            to read individual review text. Small rural businesses may be missing or
            mislabeled, so local evidence should be validated before a final decision.
          </div>
        </>
      )}
    </div>
  );
}

function MarketMetric({ icon, label, value, valueStyle = {} }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 15,
        background: "#f8fcfa",
        border: "1px solid #e3eeea",
      }}
    >
      <div style={{ fontSize: 17 }}>{icon}</div>
      <div
        style={{
          marginTop: 8,
          fontSize: 20,
          lineHeight: 1,
          fontWeight: 900,
          color: "#17343a",
          ...valueStyle,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 5, fontSize: 8, fontWeight: 800, color: "#7b9096" }}>
        {label}
      </div>
    </div>
  );
}

function SignalCard({ icon, title, value, text }) {
  return (
    <div
      style={{
        padding: 13,
        borderRadius: 14,
        background: "#ffffff",
        border: "1px solid #e3eeea",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <strong style={{ fontSize: 14, color: "#17343a" }}>{value}</strong>
      </div>
      <div style={{ marginTop: 7, fontSize: 9, fontWeight: 900, color: "#29454b" }}>
        {title}
      </div>
      <div style={{ marginTop: 4, fontSize: 8, lineHeight: 1.45, color: "#7b9096" }}>
        {text}
      </div>
    </div>
  );
}

const marketPillStyle = {
  padding: "6px 9px",
  borderRadius: 999,
  background: "#f1f7f4",
  border: "1px solid #e0ece7",
  color: "#648078",
  fontWeight: 800,
};

function Stat({ label, value, icon }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    background:
      "linear-gradient(180deg, #f7fcfa 0%, #f1f8f5 45%, #eef5f2 100%)",
    color: "#10252b",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  backgroundGlowOne: {
    position: "fixed",
    width: 520,
    height: 520,
    borderRadius: "50%",
    top: -230,
    right: -160,
    background:
      "radial-gradient(circle, rgba(20,184,166,.18) 0%, rgba(20,184,166,0) 70%)",
    filter: "blur(18px)",
    animation: "amivestFloat 10s ease-in-out infinite",
    pointerEvents: "none",
  },

  backgroundGlowTwo: {
    position: "fixed",
    width: 430,
    height: 430,
    borderRadius: "50%",
    left: -200,
    bottom: 50,
    background:
      "radial-gradient(circle, rgba(16,185,129,.12) 0%, rgba(16,185,129,0) 72%)",
    filter: "blur(10px)",
    animation: "amivestFloatReverse 12s ease-in-out infinite",
    pointerEvents: "none",
  },

  gridOverlay: {
    position: "fixed",
    inset: 0,
    opacity: 0.12,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(rgba(31,74,69,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(31,74,69,.08) 1px, transparent 1px)",
    backgroundSize: "52px 52px",
    maskImage:
      "linear-gradient(to bottom, black 0%, rgba(0,0,0,.6) 45%, transparent 100%)",
  },

  container: {
    position: "relative",
    zIndex: 1,
    width: "min(1280px, calc(100% - 42px))",
    margin: "0 auto",
    paddingBottom: 70,
  },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 0",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 11,
  },

  brandMark: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background:
      "linear-gradient(135deg, #0f9f78, #1ec79a)",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: 19,
    boxShadow: "0 12px 25px rgba(16,185,129,.18)",
  },

  brandName: {
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: "-.02em",
  },

  brandSub: {
    color: "#789098",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginTop: 2,
    fontWeight: 800,
  },

  topPill: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 13px",
    borderRadius: 999,
    background: "rgba(255,255,255,.78)",
    border: "1px solid rgba(21,67,61,.09)",
    color: "#506a72",
    fontSize: 10,
    fontWeight: 800,
    boxShadow: "0 8px 28px rgba(21,70,62,.06)",
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#19ae7f",
    boxShadow: "0 0 0 4px rgba(25,174,127,.12)",
    display: "inline-block",
  },

  hero: {
    padding: "48px 0 28px",
    maxWidth: 920,
    animation: "amivestRise .7s ease both",
  },

  heroKicker: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "#138765",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 2.3,
  },

  kickerLine: {
    width: 30,
    height: 2,
    borderRadius: 999,
    background: "#1dbf8a",
  },

  heroTitle: {
    margin: "16px 0 16px",
    fontSize: "clamp(38px, 5vw, 62px)",
    lineHeight: .98,
    letterSpacing: "-.065em",
    fontWeight: 900,
    maxWidth: 980,
  },

  heroAccent: {
    background:
      "linear-gradient(100deg, #0e9f77 10%, #0a6f8a 65%, #0c8b67 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },

  heroText: {
    maxWidth: 735,
    margin: 0,
    color: "#6f858d",
    fontSize: 12,
    lineHeight: 1.65,
  },

  heroChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 22,
  },

  heroChip: {
    padding: "8px 11px",
    borderRadius: 999,
    background: "#ffffff",
    border: "1px solid rgba(21,67,61,.08)",
    color: "#567078",
    fontSize: 10,
    fontWeight: 800,
  },

  commandCard: {
    position: "relative",
    padding: 14,
    borderRadius: 25,
    background: "rgba(255,255,255,.85)",
    border: "1px solid rgba(20,74,65,.10)",
    boxShadow:
      "0 22px 65px rgba(22,72,63,.10), inset 0 1px 0 rgba(255,255,255,.9)",
    backdropFilter: "blur(16px)",
    animation: "amivestRise .8s .08s ease both",
    overflow: "hidden",
  },

  commandGlow: {
    position: "absolute",
    width: 380,
    height: 180,
    right: -180,
    top: -90,
    background:
      "radial-gradient(circle, rgba(16,185,129,.13), transparent 70%)",
    pointerEvents: "none",
  },

  formGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "1.1fr 1.35fr .95fr .65fr 1fr",
    gap: 10,
    alignItems: "end",
  },

  field: {
    display: "block",
    minWidth: 0,
  },

  fieldLabel: {
    display: "block",
    color: "#789097",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.2,
    margin: "2px 0 7px 3px",
  },

  input: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    borderRadius: 13,
    border: "1px solid #dbe7e3",
    background: "#fbfefd",
    color: "#183139",
    outline: "none",
    padding: "13px 13px",
    fontSize: 12,
    fontWeight: 650,
    transition: "all .22s ease",
  },

  inputWithAction: {
    position: "relative",
  },

  inputAction: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 34,
    height: 34,
    border: 0,
    borderRadius: 10,
    background: "#eaf8f2",
    color: "#0e946b",
    fontSize: 18,
    cursor: "pointer",
  },

  currencyInput: {
    position: "relative",
  },

  currency: {
    position: "absolute",
    left: 12,
    top: 12,
    zIndex: 2,
    color: "#0e946b",
    fontWeight: 900,
    fontSize: 13,
  },

  analyzeButton: {
    minHeight: 45,
    border: 0,
    borderRadius: 14,
    padding: "0 12px 0 16px",
    background:
      "linear-gradient(135deg, #0b8f69 0%, #14aa7e 60%, #12b98d 100%)",
    color: "#ffffff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(11,143,105,.24)",
    transition: "transform .2s ease, box-shadow .2s ease",
  },

  arrowCircle: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "rgba(255,255,255,.16)",
    fontSize: 16,
  },

  commandBottom: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    alignItems: "center",
    padding: "10px 5px 2px",
  },

  quickLocate: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },

  textButton: {
    border: 0,
    background: "transparent",
    color: "#0e8e69",
    fontSize: 10,
    fontWeight: 900,
    padding: 0,
    cursor: "pointer",
  },

  inlineError: {
    color: "#b65a4e",
    fontSize: 9,
    overflowWrap: "anywhere",
  },

  commandHint: {
    color: "#8aa0a5",
    fontSize: 9,
    textAlign: "right",
  },

  featureStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginTop: 14,
    animation: "amivestRise .9s .14s ease both",
  },

  miniFeature: {
    display: "flex",
    gap: 9,
    alignItems: "flex-start",
    minWidth: 0,
    padding: "13px 14px",
    borderRadius: 15,
    background: "rgba(255,255,255,.66)",
    border: "1px solid rgba(21,67,61,.075)",
    transition: "transform .25s ease, box-shadow .25s ease",
  },

  miniIcon: {
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "#eff9f5",
    fontSize: 15,
    flex: "0 0 auto",
  },

  workspace: {
    display: "grid",
    gridTemplateColumns: "1.45fr .85fr",
    gap: 16,
    marginTop: 22,
    scrollMarginTop: 25,
  },

  mapPanel: {
    padding: 16,
    borderRadius: 22,
    background: "rgba(255,255,255,.80)",
    border: "1px solid rgba(21,67,61,.09)",
    boxShadow: "0 18px 55px rgba(24,73,65,.07)",
    animation: "amivestRise 1s .2s ease both",
  },

  sidePanel: {
    padding: 20,
    borderRadius: 22,
    background:
      "linear-gradient(145deg, rgba(16,44,50,.98), rgba(11,72,61,.98))",
    color: "#ffffff",
    boxShadow: "0 22px 65px rgba(12,47,42,.16)",
    animation: "amivestRise 1s .28s ease both",
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 13,
  },

  eyebrow: {
    color: "#14a779",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.7,
  },

  panelTitle: {
    margin: "5px 0 4px",
    fontSize: 22,
    letterSpacing: "-.03em",
  },

  panelSub: {
    margin: 0,
    color: "#7c9298",
    fontSize: 10,
    lineHeight: 1.5,
  },

  radiusPill: {
    padding: "8px 10px",
    borderRadius: 10,
    background: "#edf8f4",
    color: "#0d8d68",
    fontWeight: 900,
    fontSize: 10,
    whiteSpace: "nowrap",
  },

  locationMapPicker: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(16,185,129,0.22)",
    background: "#ffffff",
    boxShadow: "0 14px 35px rgba(20,55,45,0.12)",
  },

  locationMapHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "11px 13px",
    borderBottom: "1px solid #e7eeee",
  },

  locationMapTitle: {
    display: "block",
    fontSize: 11,
    color: "#17343a",
  },

  locationMapHint: {
    display: "block",
    marginTop: 2,
    fontSize: 9,
    color: "#7d9298",
  },

  locationMapClose: {
    width: 28,
    height: 28,
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    background: "#f1f5f4",
    color: "#29454b",
    fontSize: 17,
  },

  locationMap: {
    height: 300,
  },

  locationMapPicker: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid rgba(16,185,129,0.25)",
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(20,55,45,0.10)",
  },

  locationMapHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 12px",
    borderBottom: "1px solid #e6eeee",
  },

  locationMapTitle: {
    display: "block",
    fontSize: 11,
    fontWeight: 800,
    color: "#17343a",
  },

  locationMapHint: {
    display: "block",
    marginTop: 3,
    fontSize: 8,
    color: "#7d9298",
  },

  locationMapClose: {
    width: 27,
    height: 27,
    border: "none",
    borderRadius: 7,
    background: "#f1f5f4",
    color: "#29454b",
    fontSize: 17,
    cursor: "pointer",
  },

  locationMap: {
    height: 300,
    width: "100%",
  },

  locationMapFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "9px 12px",
    borderTop: "1px solid #e6eeee",
  },

  mapLocationButton: {
    border: "none",
    background: "transparent",
    color: "#07865f",
    fontSize: 9,
    fontWeight: 800,
    cursor: "pointer",
  },

  coordinatesText: {
    fontSize: 8,
    color: "#7d9298",
  },

  mapLoading: {
    height: "100%",
    minHeight: 420,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#8ff0b0",
    background: "#10191b",
  },

  mapError: {
    height: "100%",
    minHeight: 420,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 1.5,
    color: "#ff9b9b",
    background: "#10191b",
  },

  advancedMapContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
  },

  advancedMapToolbar: {
    position: "absolute",
    zIndex: 20,
    top: 12,
    right: 12,
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    maxWidth: "calc(100% - 24px)",
    padding: 6,
    borderRadius: 12,
    background: "rgba(255,255,255,.94)",
    border: "1px solid rgba(21,67,61,.10)",
    boxShadow: "0 8px 24px rgba(20,60,53,.13)",
    backdropFilter: "blur(12px)",
  },

  mapToolGroup: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    paddingRight: 4,
  },

  mapToolLabel: {
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: 1,
    color: "#829196",
  },

  mapTypeSelect: {
    height: 30,
    borderRadius: 8,
    border: "1px solid #dce7e3",
    background: "#ffffff",
    color: "#26454b",
    fontSize: 9,
    fontWeight: 800,
    padding: "0 7px",
    outline: "none",
    cursor: "pointer",
  },

  mapToolButton: {
    minHeight: 30,
    border: "1px solid #dce7e3",
    borderRadius: 8,
    background: "#ffffff",
    color: "#245058",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "0 8px",
    fontSize: 9,
    fontWeight: 800,
    cursor: "pointer",
    transition: "all .2s ease",
  },

  mapInstruction: {
    position: "absolute",
    zIndex: 19,
    left: 12,
    bottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 9px",
    borderRadius: 9,
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(21,67,61,.09)",
    color: "#60787e",
    fontSize: 8,
    fontWeight: 700,
    boxShadow: "0 7px 20px rgba(20,60,53,.10)",
  },

  mapWrap: {
    position: "relative",
    height: 405,
    borderRadius: 17,
    overflow: "hidden",
    background: "#dfe9e6",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  mapEmptyOverlay: {
    position: "absolute",
    zIndex: 600,
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(320px, 78%)",
    display: "grid",
    gap: 6,
    placeItems: "center",
    padding: 20,
    borderRadius: 17,
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(21,67,61,.10)",
    boxShadow: "0 20px 50px rgba(20,60,53,.13)",
    textAlign: "center",
  },

  mapPulse: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#eaf8f2",
    fontSize: 29,
    animation: "amivestPulse 2s ease-in-out infinite",
  },

  mapBadge: {
    position: "absolute",
    zIndex: 700,
    top: 12,
    left: 12,
    padding: "7px 9px",
    borderRadius: 999,
    background: "rgba(255,255,255,.9)",
    border: "1px solid rgba(21,67,61,.08)",
    fontSize: 9,
    fontWeight: 900,
    color: "#557078",
    display: "flex",
    alignItems: "center",
    gap: 7,
  },

  mapFooter: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    padding: "11px 3px 1px",
  },

  mapFooterItem: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 9,
    color: "#687f86",
    fontWeight: 800,
  },

  greenDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#11ae7e",
    boxShadow: "0 0 0 3px rgba(17,174,126,.12)",
  },

  ringDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    border: "1px solid #15a97d",
    background: "rgba(21,169,125,.10)",
  },

  mapSource: {
    marginLeft: "auto",
    color: "#9aabb0",
    fontSize: 8,
    fontWeight: 800,
  },

  resolvedCard: {
    marginTop: 11,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "11px 12px",
    borderRadius: 13,
    background: "#f2faf7",
    border: "1px solid #dfeee8",
  },

  resolvedLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.2,
    color: "#77a092",
  },

  resolvedName: {
    marginTop: 4,
    color: "#35535b",
    fontSize: 10,
    lineHeight: 1.45,
  },

  coords: {
    color: "#6a868d",
    fontSize: 9,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  sideTitle: {
    margin: "5px 0 7px",
    fontSize: 26,
    letterSpacing: "-.04em",
  },

  sideText: {
    color: "#a5c0bb",
    fontSize: 11,
    lineHeight: 1.65,
    margin: "0 0 16px",
  },

  layerList: {
    display: "grid",
    gap: 7,
  },

  layerItem: {
    display: "grid",
    gridTemplateColumns: "25px 32px 1fr 20px",
    gap: 8,
    alignItems: "center",
    padding: "10px 9px",
    borderRadius: 13,
    background: "rgba(255,255,255,.055)",
    border: "1px solid rgba(255,255,255,.05)",
    transition: "transform .2s ease, background .2s ease",
  },

  layerNumber: {
    color: "#5d8d81",
    fontSize: 8,
    fontWeight: 900,
  },

  layerIcon: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "rgba(255,255,255,.08)",
    fontSize: 15,
  },

  layerContent: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },

  layerArrow: {
    color: "#74ab9e",
    fontSize: 14,
  },

  insightPanel: {
    marginTop: 17,
    padding: 22,
    borderRadius: 23,
    background: "rgba(255,255,255,.88)",
    border: "1px solid rgba(21,67,61,.09)",
    boxShadow: "0 18px 55px rgba(24,73,65,.06)",
    animation: "amivestRise 1s .34s ease both",
  },

  insightIntro: {
    display: "grid",
    gridTemplateColumns: "58px 1fr",
    gap: 14,
    alignItems: "start",
  },

  insightOrb: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "linear-gradient(145deg, #e7f7f0, #f6fcfa)",
    color: "#0e986e",
    fontSize: 25,
    boxShadow: "inset 0 0 0 1px #dcefe7",
  },

  insightTitle: {
    margin: "5px 0 5px",
    fontSize: 26,
    letterSpacing: "-.04em",
  },

  insightText: {
    margin: 0,
    color: "#758b92",
    fontSize: 11,
    lineHeight: 1.7,
    maxWidth: 860,
  },

  waitingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 9,
    marginTop: 18,
  },

  waitingCard: {
    display: "grid",
    gridTemplateColumns: "26px 1fr",
    columnGap: 8,
    padding: 12,
    borderRadius: 14,
    background: "#f7fbfa",
    border: "1px solid #e4efeb",
  },

  resultTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
  },

  scoreBox: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: 9,
    borderRadius: 16,
    background: "#f2faf7",
    border: "1px solid #dceee7",
  },

  scoreRing: {
    width: 74,
    height: 74,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    background:
      "radial-gradient(circle at center, #ffffff 50%, transparent 51%), conic-gradient(#11ad7d 0 72%, #dff1eb 72% 100%)",
  },

  scoreValue: {
    marginTop: 4,
    color: "#0e956c",
    fontSize: 23,
    lineHeight: 1,
    fontWeight: 900,
  },

  scoreSmall: {
    color: "#8aa39d",
    fontSize: 8,
    fontWeight: 800,
    marginTop: 1,
  },

  scoreLabel: {
    fontWeight: 900,
    fontSize: 12,
  },

  scoreCaption: {
    marginTop: 3,
    color: "#7f9690",
    fontSize: 8,
    maxWidth: 130,
    lineHeight: 1.45,
  },

  resultStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    marginTop: 17,
  },

  stat: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "12px 11px",
    borderRadius: 13,
    background: "#f8fcfb",
    border: "1px solid #e4efeb",
    minWidth: 0,
  },

  statIcon: {
    width: 29,
    height: 29,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "#edf8f4",
    color: "#0e936a",
    fontSize: 13,
    flex: "0 0 auto",
  },

  statLabel: {
    fontSize: 8,
    color: "#81979d",
    fontWeight: 900,
    letterSpacing: .7,
    textTransform: "uppercase",
  },

  statValue: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: 850,
    overflowWrap: "anywhere",
  },

  localEvidenceSection: {
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    background: "#ffffff",
    border: "1px solid rgba(21,67,61,.09)",
    boxShadow: "0 14px 40px rgba(24,73,65,.06)",
  },

  localEvidenceHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

  evidenceSource: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "7px 9px",
    borderRadius: 999,
    background: "#eef9f4",
    color: "#0b8b67",
    fontSize: 8,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  evidenceRadius: {
    marginTop: 10,
    color: "#72898f",
    fontSize: 9,
  },

  evidenceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
    marginTop: 15,
  },

  evidenceCard: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: 13,
    borderRadius: 14,
    background: "#f8fcfa",
    border: "1px solid #e3eeea",
  },

  evidenceIcon: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "#eaf8f2",
    fontSize: 15,
    flex: "0 0 auto",
  },

  evidenceValue: {
    fontSize: 18,
    lineHeight: 1,
    fontWeight: 900,
    color: "#17343a",
  },

  evidenceLabel: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: 800,
    color: "#7b9096",
  },

  nearbyPlaces: {
    marginTop: 16,
  },

  nearbyList: {
    display: "grid",
    gap: 6,
    marginTop: 9,
  },

  nearbyItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "9px 10px",
    borderRadius: 10,
    background: "#fbfefd",
    border: "1px solid #e8f0ed",
  },

  nearbyItemMain: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },

  nearbyItemMainStrong: {
    fontSize: 10,
  },

  nearbyDistance: {
    flex: "0 0 auto",
    fontSize: 8,
    fontWeight: 800,
    color: "#0d8d68",
  },

  evidenceDisclosure: {
    display: "flex",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    background: "#f7faf9",
    color: "#71878d",
    fontSize: 8,
    lineHeight: 1.45,
  },

  resultColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 9,
    marginTop: 10,
  },

  resultBox: {
    padding: 14,
    borderRadius: 14,
    background: "#fbfefd",
    border: "1px solid #e4efeb",
  },

  resultBoxHighlight: {
    padding: 14,
    borderRadius: 14,
    background:
      "linear-gradient(135deg, rgba(231,248,242,.88), rgba(247,252,250,.95))",
    border: "1px solid #d9eee6",
  },

  resultBoxTitle: {
    color: "#708a82",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.2,
    marginBottom: 9,
  },

  resultBullet: {
    display: "flex",
    gap: 7,
    alignItems: "flex-start",
    padding: "6px 0",
    borderBottom: "1px solid #edf3f0",
    color: "#587078",
    fontSize: 10,
  },

  heroChip: {},
  miniFeatureStrong: {},
  miniFeatureSpan: {},
  waitingCardStrong: {},
  waitingCardSmall: {},

  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    padding: "22px 2px 0",
    color: "#869a9f",
    fontSize: 8,
    lineHeight: 1.5,
  },

  financeSection: {
    marginTop: 22,
    padding: 20,
    borderRadius: 20,
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.08)",
  },

  financeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },

  financeBadge: {
    padding: "7px 11px",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#8ff0b0",
    border: "1px solid rgba(143,240,176,0.24)",
    background: "rgba(143,240,176,0.08)",
  },

  financeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },

  financeCard: {
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.025)",
  },

  financeCardHighlight: {
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(143,240,176,0.22)",
    background: "rgba(143,240,176,0.055)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  },

  financeLabel: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.52)",
    marginBottom: 8,
  },

  financeValue: {
    fontSize: 21,
    fontWeight: 800,
    lineHeight: 1.1,
    color: "#ffffff",
  },

  financeValueLarge: {
    fontSize: 26,
    fontWeight: 900,
    lineHeight: 1.1,
    color: "#8ff0b0",
  },

  financeCaption: {
    marginTop: 7,
    fontSize: 10,
    lineHeight: 1.4,
    color: "rgba(255,255,255,0.42)",
  },

  schemeCard: {
    marginTop: 12,
    padding: 17,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.16)",
  },

  schemeName: {
    marginTop: 5,
    fontSize: 17,
    fontWeight: 800,
    color: "#ffffff",
  },

  schemeMeta: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(90px, 1fr))",
    gap: 18,
    flex: 1,
  },

  schemeMetaItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  validationNote: {
    marginTop: 12,
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    padding: 12,
    borderRadius: 12,
    fontSize: 10,
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.58)",
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.06)",
  },

};

const globalStyle = `
@keyframes amivestRise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes amivestFloat {
  0%, 100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-30px, 18px) scale(1.05); }
}

@keyframes amivestFloatReverse {
  0%, 100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(24px, -18px) scale(1.04); }
}

@keyframes amivestPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(17,174,126,.12); }
  50% { transform: scale(1.05); box-shadow: 0 0 0 13px rgba(17,174,126,0); }
}

.amivest-hover:hover {
  transform: translateY(-3px);
}

select:focus, input:focus {
  border-color: #9cd8c3 !important;
  box-shadow: 0 0 0 4px rgba(21,169,125,.08) !important;
}

.leaflet-container {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.leaflet-control-zoom a {
  color: #19584a !important;
}

@media (max-width: 1000px) {
  .amivest-responsive-grid {
    grid-template-columns: 1fr !important;
  }
}
`;

if (typeof document !== "undefined") {
  const styleId = "amivest-business-global-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = globalStyle;
    document.head.appendChild(style);
  }
}

export { styles };
