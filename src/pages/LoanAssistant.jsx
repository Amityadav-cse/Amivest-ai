import { useEffect, useMemo, useRef, useState } from "react";

/* =========================================================
   API CONFIG
   =========================================================
   Production:
     Vercel -> /api -> Render backend

   Local:
     Vite proxy -> /api -> localhost:5000

   If VITE_API_URL is set, it can also point directly to
   your backend.
========================================================= */

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() || "/api"
).replace(/\/$/, "");

async function apiCall(path, options = {}) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const method = (options.method || "GET").toUpperCase();
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    const response = await fetch(`${API_BASE}${cleanPath}`, {
      ...options,
      method,
      credentials: "include",
      signal: controller.signal,
      headers: {
        ...(!isFormData && method !== "GET"
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Request failed with HTTP ${response.status}`
      );
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupPincode(pincode) {
  const value = String(pincode || "").replace(/\D/g, "").slice(0, 6);
  if (value.length !== 6) {
    throw new Error("Enter a valid 6-digit PIN code.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    // Public postal lookup used only for location enrichment.
    // Confirm the address with India Post before a real application.
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${value}`,
      { signal: controller.signal }
    );
    const rows = await response.json();
    const first = rows?.[0];

    if (!first || String(first.Status || "").toLowerCase() !== "success" || !first.PostOffice?.length) {
      throw new Error("PIN code not found. Check the number or enter state and district manually.");
    }

    const offices = first.PostOffice;
    const anchor = offices[0] || {};
    return {
      pincode: value,
      state: anchor.State || "",
      district: anchor.District || "",
      region: anchor.Region || "",
      circle: anchor.Circle || "",
      post_offices: offices.map((office) => ({
        name: office.Name,
        branch_type: office.BranchType,
        delivery_status: office.DeliveryStatus,
      })),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("PIN lookup timed out. Enter the location manually.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   HELPERS
========================================================= */

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const numberValue = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, numberValue(value)));

const formatDate = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

/*
  Local EMI calculation is only used as a fallback when the
  backend does not return an EMI.
*/
function calculateEMI(principal, annualRate, months) {
  const P = numberValue(principal);
  const R = numberValue(annualRate) / 12 / 100;
  const N = numberValue(months);

  if (!P || !N) return 0;

  if (!R) {
    return P / N;
  }

  const factor = Math.pow(1 + R, N);

  return (P * R * factor) / (factor - 1);
}

/* =========================================================
   STYLES
========================================================= */

const COLORS = {
  bg: "#071019",
  card: "#101821",
  card2: "#0B1420",
  border: "#263241",
  text: "#FFFFFF",
  muted: "#94A3B8",
  soft: "#CBD5E1",
  teal: "#0D9488",
  green: "#10B981",
  yellow: "#F59E0B",
  red: "#EF4444",
  blue: "#3B82F6",
};

const cardStyle = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "16px",
  padding: "20px",
};

const inputStyle = {
  width: "100%",
  background: COLORS.card2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "10px",
  padding: "12px 13px",
  color: COLORS.text,
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  color: COLORS.muted,
  fontSize: "12px",
  fontWeight: "600",
  marginBottom: "7px",
};

const primaryButton = {
  background: COLORS.teal,
  border: "none",
  color: "#fff",
  padding: "11px 18px",
  borderRadius: "9px",
  fontWeight: "700",
  cursor: "pointer",
};

const secondaryButton = {
  background: "transparent",
  border: `1px solid ${COLORS.border}`,
  color: COLORS.soft,
  padding: "10px 16px",
  borderRadius: "9px",
  fontWeight: "600",
  cursor: "pointer",
};

const dangerButton = {
  background: "transparent",
  border: "1px solid #4B2424",
  color: "#FCA5A5",
  padding: "9px 14px",
  borderRadius: "9px",
  fontWeight: "600",
  cursor: "pointer",
};

/* =========================================================
   LOAN CONSTANTS
========================================================= */

const LOAN_TYPES = [
  "Personal Loan",
  "Home Loan",
  "Education Loan",
  "Car Loan",
  "Business Loan",
  "Gold Loan",
];

const AMOUNT_PRESETS = [
  50000,
  100000,
  200000,
  500000,
  1000000,
];

const PURPOSES = [
  "Education",
  "Medical",
  "House",
  "Business",
  "Vehicle",
  "Emergency",
  "Other",
];

const EMPLOYMENT_TYPES = [
  "Student",
  "Salaried",
  "Self-employed",
  "Business Owner",
];

const DURATIONS = [
  { label: "1 Year", value: 1 },
  { label: "2 Years", value: 2 },
  { label: "3 Years", value: 3 },
  { label: "5 Years", value: 5 },
  { label: "7 Years", value: 7 },
  { label: "10 Years", value: 10 },
];


/* =========================================================
   GOVERNMENT SCHEME ADVISOR — SIH 26091
   Frontend is API-first. If /scheme-recommendation is not
   available yet, a small verified demo catalogue is used so
   the page still works during development.
========================================================= */

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

const LOAN_CHANNELS = [
  { id: "both", label: "Government + Private", icon: "🔀", description: "See both supported schemes and lender options." },
  { id: "government", label: "Government schemes", icon: "🇮🇳", description: "Explore credit-linked government support." },
  { id: "private", label: "Private / Bank loans", icon: "🏦", description: "Compare lender products and application routes." },
];

const GOVERNMENT_SCHEMES = [
  {
    id: "pmmy",
    name: "Pradhan Mantri MUDRA Yojana (PMMY)",
    type: "government",
    tags: ["micro business", "working capital", "term loan", "rural"],
    officialUrl: "https://financialservices.gov.in/pradhan-mantri-mudra-yojana-pmmy",
    sourceLabel: "Department of Financial Services · Government of India",
    lastUpdated: "05 Feb 2026",
    summary: "Institutional credit for eligible micro-enterprises and allied activities. Both term loan and working-capital needs can be covered.",
    keyFacts: [
      "Shishu: up to ₹50,000",
      "Kishor: above ₹50,000 to ₹5 lakh",
      "Tarun: above ₹5 lakh to ₹10 lakh",
      "Tarun Plus: above ₹10 lakh to ₹20 lakh for entrepreneurs who previously availed and successfully repaid a Tarun loan",
      "Eligible lending institutions include public/private banks, RRBs, SFBs, NBFCs and MFIs",
      "Collateral is not required under the stated PMMY feature",
    ],
    match: (p) => {
      const amount = numberValue(p.requested_amount);
      const use = `${p.loan_purpose || ""} ${p.business_type || ""} ${p.employment_status || ""}`.toLowerCase();
      const businessLike = /business|self|owner|entrepreneur|retail|dairy|poultry|beekeep|service|manufactur|trading/.test(use);
      const reasons = [];
      const blockers = [];
      if (businessLike) reasons.push("Your use case looks like a micro-enterprise or allied business activity.");
      else blockers.push("PMMY is intended for eligible income-generating micro-enterprise and allied activities.");
      if (amount > 0 && amount <= 2000000) reasons.push("Your requested amount fits within the current ₹20 lakh PMMY product ceiling.");
      else if (amount > 2000000) blockers.push("The requested amount is above the current ₹20 lakh PMMY ceiling.");
      if (amount > 1000000) reasons.push("Above ₹10 lakh, Tarun Plus has additional previous-Tarun repayment conditions.");
      return {
        eligible: blockers.length === 0,
        confidence: blockers.length === 0 ? 92 : 45,
        reasons,
        blockers,
        documents: ["KYC / identity and address proof", "Business or activity details", "Bank statements / financial information requested by lender", "Project or working-capital details", "Lender-specific documents"],
        process: ["Select the appropriate MUDRA category.", "Choose an eligible lending institution.", "Submit KYC, activity and financial documents.", "Complete lender appraisal and verification.", "Track sanction and disbursement with the lender."],
        benefit: "Access to formal credit for eligible micro-enterprise activity; exact pricing and tenure are lender-specific.",
        note: "AmiVest is a preliminary guidance layer. Final eligibility, pricing, sanction and disbursement are decided by the lender under current PMMY rules.",
      };
    },
  },
  {
    id: "pmegp",
    name: "PMEGP — Prime Minister's Employment Generation Programme",
    type: "government",
    tags: ["new enterprise", "micro enterprise", "manufacturing", "services", "rural"],
    officialUrl: "https://www.pmegp.msme.gov.in/",
    sourceLabel: "KVIC / Ministry of MSME",
    lastUpdated: "Current official portal",
    summary: "Supports eligible new micro-enterprise projects through a bank-linked process with margin money subsidy provisions under the scheme.",
    keyFacts: [
      "For new enterprises, an individual applicant must be above 18 years of age",
      "There is no income ceiling for assistance for setting up projects under PMEGP",
      "At least VIII standard qualification is required for projects above ₹10 lakh in manufacturing or above ₹5 lakh in business/service",
      "New units must be registered on the Udyam portal before physical verification / margin-money adjustment",
      "Existing units already receiving government subsidy are subject to scheme restrictions",
    ],
    match: (p) => {
      const age = numberValue(p.age);
      const stage = String(p.business_stage || "new").toLowerCase();
      const type = String(p.business_type || "").toLowerCase();
      const amount = numberValue(p.requested_amount);
      const isNew = stage.includes("new") || stage === "";
      const manufacturing = /manufactur|production|processing|textile/.test(type);
      const service = /service|retail|repair|food|restaurant|trading/.test(type);
      const reasons = [];
      const blockers = [];
      if (age >= 18) reasons.push("Age is compatible with the PMEGP new-enterprise baseline.");
      else blockers.push("PMEGP new-enterprise applicants must be above 18.");
      if (isNew) reasons.push("Your business stage is set to new / greenfield.");
      else blockers.push("The new-enterprise PMEGP route does not apply to an already-running unit.");
      if (manufacturing && amount > 1000000) reasons.push("Your profile crosses the ₹10 lakh manufacturing education-check threshold; qualification should be verified.");
      if (service && amount > 500000) reasons.push("Your profile crosses the ₹5 lakh business/service education-check threshold; qualification should be verified.");
      return {
        eligible: blockers.length === 0,
        confidence: blockers.length === 0 ? 89 : 40,
        reasons,
        blockers,
        documents: ["Aadhaar / identity proof", "Photograph", "Project report / business details", "Education certificate where applicable", "Caste / special-category certificate where applicable", "Udyam registration as required", "Bank and project documents requested during appraisal"],
        process: ["Confirm the current PMEGP category and negative-list rules.", "Prepare project report and supporting documents.", "Apply through the official PMEGP portal.", "Implementing agency and bank perform appraisal / verification.", "Complete required training / verification steps and track the application."],
        benefit: "Bank-linked support with margin-money subsidy provisions for eligible new projects.",
        note: "PMEGP has detailed project, activity, family, education and subsidy conditions. AmiVest should not present a final eligibility decision.",
      };
    },
  },
  {
    id: "pmfme",
    name: "PMFME — PM Formalisation of Micro Food Processing Enterprises",
    type: "government",
    tags: ["food processing", "ODOP", "micro enterprise", "subsidy"],
    officialUrl: "https://pmfme.mofpi.gov.in/",
    sourceLabel: "Ministry of Food Processing Industries",
    lastUpdated: "Current official portal",
    summary: "Credit-linked capital subsidy and support for eligible micro food-processing units, including an ODOP-oriented approach.",
    keyFacts: [
      "Credit-linked capital subsidy of 35% of eligible project cost is stated for eligible units",
      "Individual units: maximum subsidy stated as ₹10 lakh per unit",
      "Common infrastructure for eligible groups can have a higher ceiling",
      "ODOP (One District One Product) is a key part of the programme",
    ],
    match: (p) => {
      const value = `${p.business_type || ""} ${p.loan_purpose || ""}`.toLowerCase();
      const food = /food|bakery|pickle|spice|flour|dairy|processing|snack|restaurant|mill/.test(value);
      return {
        eligible: food,
        confidence: food ? 88 : 24,
        reasons: food ? ["Your business/activity appears connected to food processing or food activity.", "PMFME is specifically focused on eligible micro food-processing enterprises."] : [],
        blockers: food ? [] : ["The selected activity does not currently look like a food-processing use case."],
        documents: ["KYC / address proof", "Business or unit details", "Project cost and activity details", "Food-processing / category documents where applicable", "Bank / loan documents", "ODOP-related proof where applicable"],
        process: ["Confirm the activity and current ODOP scope.", "Prepare project and financial details.", "Submit through the official PMFME process.", "Complete bank and implementing-agency checks.", "Track sanction / subsidy processing through official channels."],
        benefit: "Credit-linked capital subsidy and programme support for eligible food-processing units.",
        note: "Eligibility and subsidy calculation depend on the current programme rules and eligible project cost.",
      };
    },
  },
  {
    id: "pmvishwakarma",
    name: "PM Vishwakarma",
    type: "government",
    tags: ["artisan", "craftspeople", "toolkit", "micro enterprise"],
    officialUrl: "https://www.myscheme.gov.in/schemes/pmvishwakarma",
    sourceLabel: "Ministry of MSME / Government of India",
    lastUpdated: "Scheme information verified from MSME scheme booklet",
    summary: "Support package for eligible artisans and craftspeople in identified traditional trades, including training, toolkit support and concessional credit.",
    keyFacts: [
      "Covers 18 identified traditional trades",
      "Toolkit incentive up to ₹15,000",
      "Enterprise Development Loans up to ₹3 lakh in two tranches",
      "Concessional interest rate stated at 5%, with Government of India interest subvention",
      "Also provides skill training and digital / marketing support",
    ],
    match: (p) => {
      const value = `${p.business_type || ""} ${p.occupation || ""} ${p.employment_status || ""}`.toLowerCase();
      const artisan = /carpenter|suthar|boat|blacksmith|lohar|tool|locksmith|goldsmith|sonar|potter|kumhaar|sculpt|stone|cobbler|shoe|mason|rajmistri|basket|mat|broom|coir|toy|doll|barber|naa[iy]d|garland|malakar|washer|dhobi|tailor|darzi|fishing net/.test(value);
      return {
        eligible: artisan,
        confidence: artisan ? 93 : 20,
        reasons: artisan ? ["The occupation/business description appears consistent with a covered artisan or craft activity."] : [],
        blockers: artisan ? [] : ["PM Vishwakarma is limited to identified traditional artisan/craftspeople trades; select the exact trade before treating this as a match."],
        documents: ["Identity / address documents", "Trade / artisan details as required", "Bank account information", "Additional scheme-specific documents requested during verification"],
        process: ["Check that the trade is one of the covered 18 trades.", "Complete the official registration / verification route.", "Use training and toolkit support where applicable.", "Apply for the appropriate credit tranche.", "Track verification and lender processing."],
        benefit: "Training, toolkit support and concessional enterprise-development credit for eligible artisans.",
        note: "Occupation matching alone is not enough for final eligibility; the official verification process applies.",
      };
    },
  },
  {
    id: "kcc",
    name: "Kisan Credit Card (KCC)",
    type: "government",
    tags: ["farmer", "agriculture", "dairy", "fisheries", "working capital"],
    officialUrl: "https://financialservices.gov.in/agriculture-credit",
    sourceLabel: "Department of Financial Services / Government of India",
    lastUpdated: "Current DFS agriculture-credit information",
    summary: "Timely institutional credit for farmers and eligible allied agricultural activities, including dairy and fisheries.",
    keyFacts: [
      "Supports cultivation and allied agricultural working-capital needs",
      "KCC has been extended to animal husbandry and fisheries",
      "Eligible lenders include commercial banks, RRBs and cooperative institutions",
      "Interest support and prompt-repayment incentives depend on current applicable rules",
    ],
    match: (p) => {
      const value = `${p.business_type || ""} ${p.loan_purpose || ""} ${p.occupation || ""}`.toLowerCase();
      const agri = /farmer|agri|agriculture|crop|dairy|milk|fisher|fish|poultry|beekeep|livestock|animal husbandry/.test(value);
      return {
        eligible: agri,
        confidence: agri ? 86 : 22,
        reasons: agri ? ["Your profile appears connected to agriculture or an allied activity covered by KCC pathways."] : [],
        blockers: agri ? [] : ["The current profile does not look like an agricultural or allied-activity use case."],
        documents: ["KYC / address proof", "Farmer / land / cultivation or allied-activity records as applicable", "Bank account details", "Crop / livestock / fishery information where required", "Lender-specific documents"],
        process: ["Identify the correct KCC purpose.", "Approach an eligible KCC lender.", "Submit land / activity and KYC records.", "Complete appraisal and documentation.", "Use the card / facility according to lender and scheme conditions."],
        benefit: "Flexible institutional working-capital access for eligible agriculture and allied activities.",
        note: "The exact credit limit, collateral and interest support depend on current rules and lender assessment.",
      };
    },
  },
  {
    id: "aif",
    name: "Agriculture Infrastructure Fund (AIF)",
    type: "government",
    tags: ["post-harvest", "agri infrastructure", "warehouse", "cold chain"],
    officialUrl: "https://agriinfra.dac.gov.in/",
    sourceLabel: "Department of Agriculture & Farmers Welfare",
    lastUpdated: "Current AIF scheme material",
    summary: "Financing support for eligible post-harvest management infrastructure and community farming assets.",
    keyFacts: [
      "Provides 3% interest subvention p.a. on eligible loans up to ₹2 crore",
      "Credit guarantee support is available for eligible borrowers / projects under stated conditions",
      "Targets infrastructure such as post-harvest management and community farming assets",
      "Operational schedule and detailed project eligibility must be checked before application",
    ],
    match: (p) => {
      const value = `${p.business_type || ""} ${p.loan_purpose || ""}`.toLowerCase();
      const infra = /warehouse|storage|cold|pack|grading|sorting|aggregation|post.?harvest|farm asset|infrastructure|processing/.test(value);
      return {
        eligible: infra,
        confidence: infra ? 82 : 18,
        reasons: infra ? ["The project description appears related to eligible agriculture infrastructure or post-harvest activity."] : [],
        blockers: infra ? [] : ["AIF is designed for eligible agriculture infrastructure rather than a general-purpose personal/business loan."],
        documents: ["KYC", "Project report / DPR", "Land / lease / site documents as applicable", "Cost estimates and quotations", "Bank and financial documents", "Entity / project registration documents where applicable"],
        process: ["Check current eligible project categories.", "Prepare DPR and project cost evidence.", "Apply through an eligible lender / official workflow.", "Complete lender and scheme verification.", "Track the sanction and benefit adjustment."],
        benefit: "Interest subvention and credit-guarantee support under eligible AIF financing.",
        note: "AIF is project-specific; a generic business activity is not enough for final eligibility.",
      };
    },
  },
  {
    id: "pmsvanidhi",
    name: "PM SVANidhi",
    type: "government",
    tags: ["street vendor", "micro business", "working capital", "digital"],
    officialUrl: "https://pmsvanidhi.mohua.gov.in/",
    sourceLabel: "Ministry of Housing & Urban Affairs",
    lastUpdated: "2026 scheme update",
    summary: "Micro-credit and incentives for eligible street vendors, including vendors from surrounding peri-urban and rural areas as covered by the programme.",
    keyFacts: [
      "Restructured scheme increased first-tranche loan to ₹15,000",
      "Second tranche is ₹25,000; third tranche remains ₹50,000",
      "Interest subsidy remains 7%",
      "Digital transaction cashback incentives are part of the scheme",
      "The lending window was extended to 31 March 2030 in the latest government announcement",
    ],
    match: (p) => {
      const value = `${p.business_type || ""} ${p.loan_purpose || ""} ${p.occupation || ""}`.toLowerCase();
      const vendor = /street vendor|hawker|rehri|thela|cart|stall|street food|roadside vendor|vendor/.test(value);
      const amount = numberValue(p.requested_amount);
      const range = amount === 0 || amount <= 50000;
      return {
        eligible: vendor && range,
        confidence: vendor && range ? 90 : vendor ? 58 : 18,
        reasons: vendor ? ["Your description appears consistent with a street-vendor use case.", "The requested amount is within the programme's tranche range when entered."] : [],
        blockers: [
          ...(vendor ? [] : ["PM SVANidhi is intended for eligible street vendors." ]),
          ...(vendor && !range ? ["The requested amount is above the current third-tranche amount; a different credit route may be more appropriate."] : []),
        ],
        documents: ["KYC / identity documents", "Vendor / business activity proof as applicable", "Bank account details", "Digital / e-KYC information as required", "Lender-specific documents"],
        process: ["Confirm vendor eligibility and current tranche status.", "Complete the official PM SVANidhi application / verification.", "Submit KYC and vending-activity evidence.", "Complete lender processing.", "Repay on time to access subsequent tranche benefits where applicable."],
        benefit: "Collateral-free working-capital support with interest subsidy and digital-transaction incentives under current rules.",
        note: "AmiVest should show the current official tranche and status before treating this as an application-ready match.",
      };
    },
  },
];

const PRIVATE_LOAN_OPTIONS = [
  {
    id: "bank-business",
    name: "Bank Business Loan",
    kind: "Bank / private bank",
    icon: "🏦",
    fit: ["Established business", "Working capital", "Expansion"],
    summary: "General-purpose business finance from a bank; pricing and collateral depend on lender underwriting.",
  },
  {
    id: "working-capital",
    name: "Working Capital / Cash Credit",
    kind: "Bank product",
    icon: "💳",
    fit: ["Inventory", "Seasonal demand", "Receivables"],
    summary: "Useful when the business needs revolving liquidity rather than one large fixed purchase.",
  },
  {
    id: "secured-business",
    name: "Loan Against Property / Secured Business Loan",
    kind: "Bank / NBFC",
    icon: "🏠",
    fit: ["Larger amount", "Longer tenure", "Asset-backed"],
    summary: "May support larger business funding when eligible collateral is available.",
  },
  {
    id: "gold-loan",
    name: "Gold Loan",
    kind: "Bank / NBFC",
    icon: "🪙",
    fit: ["Fast liquidity", "Short-to-medium term"],
    summary: "Secured loan against eligible gold; pricing, LTV and auction rules vary by lender.",
  },
  {
    id: "nbfc-business",
    name: "NBFC / Digital Business Loan",
    kind: "NBFC",
    icon: "⚡",
    fit: ["Digital process", "Thin-file applicants", "Speed"],
    summary: "Can offer faster digital processing, but total cost and fees can be higher; compare APR and charges carefully.",
  },
  {
    id: "personal",
    name: "Personal Loan",
    kind: "Bank / NBFC",
    icon: "👤",
    fit: ["Personal expenses", "Emergency", "Non-business use"],
    summary: "Unsecured personal finance. Use with caution for a business because pricing may be higher than business-oriented products.",
  },
];

function normalizeSchemeProfile(profile = {}, analysis = {}) {
  return {
    age: profile.age ?? analysis.age ?? "",
    gender: profile.gender ?? analysis.gender ?? "",
    state: profile.state ?? analysis.state ?? "",
    district: profile.district ?? analysis.district ?? "",
    pincode: profile.pincode ?? analysis.pincode ?? "",
    annual_income: profile.annual_income ?? analysis.annual_income ?? "",
    social_category: profile.social_category ?? analysis.social_category ?? "",
    business_type: profile.business_type ?? analysis.business_type ?? analysis.loan_purpose ?? "",
    business_stage: profile.business_stage ?? analysis.business_stage ?? "new",
    loan_purpose: profile.loan_purpose ?? analysis.loan_purpose ?? "",
    employment_status: profile.employment_status ?? analysis.employment_status ?? "",
    requested_amount: profile.requested_amount ?? analysis.requested_amount ?? "",
    occupation: profile.occupation ?? analysis.occupation ?? "",
  };
}

function scoreSchemeResult(result) {
  const reasons = result?.reasons?.length || 0;
  const blockers = result?.blockers?.length || 0;
  const base = Number(result?.confidence || 0);
  return Math.max(0, Math.min(100, Math.round(base + reasons * 2 - blockers * 8)));
}

function SmallPill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { background: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.18)", color: COLORS.soft },
    good: { background: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.28)", color: "#34D399" },
    warn: { background: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)", color: "#FCD34D" },
    blue: { background: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.28)", color: "#93C5FD" },
  };
  const toneStyle = tones[tone] || tones.neutral;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", borderRadius: "999px", padding: "5px 9px", fontSize: "10px", fontWeight: 800, ...toneStyle }}>{children}</span>;
}

function GovernmentSchemeCard({ scheme, open, onToggle }) {
  const applyUrl =
    scheme.applyUrl ||
    (scheme.id === "pmmy"
      ? "https://www.jansamarth.in/home"
      : scheme.officialUrl);

  return (
    <div
      style={{
        background: COLORS.card2,
        border: `1px solid ${open ? COLORS.teal : COLORS.border}`,
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          color: COLORS.text,
          cursor: "pointer",
          padding: "16px",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 850, fontSize: "15px" }}>
              {scheme.name}
            </div>
            <div
              style={{
                color: COLORS.muted,
                fontSize: "11px",
                marginTop: "4px",
              }}
            >
              {scheme.sourceLabel}
            </div>
          </div>

          <SmallPill tone={scheme.eligible ? "good" : "warn"}>
            {scheme.eligible ? "✓ Good match" : "⚠ Check eligibility"}
          </SmallPill>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 16px 18px" }}>
          {/* 1. Why this scheme */}
          <div
            style={{
              padding: "13px",
              borderRadius: "11px",
              background: "rgba(13,148,136,0.07)",
              border: "1px solid rgba(13,148,136,0.18)",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                color: COLORS.muted,
                fontSize: "9px",
                fontWeight: 850,
                marginBottom: "5px",
              }}
            >
              WHY THIS SCHEME MAY HELP YOU
            </div>
            <div
              style={{
                color: COLORS.soft,
                fontSize: "12px",
                lineHeight: 1.55,
              }}
            >
              {scheme.summary || scheme.benefit}
            </div>

            {(scheme.reasons || []).map((reason, i) => (
              <div
                key={`reason-${i}`}
                style={{
                  color: COLORS.green,
                  fontSize: "11px",
                  marginTop: "6px",
                }}
              >
                ✓ {reason}
              </div>
            ))}
          </div>

          {/* 2. Benefits */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: "10px",
            }}
          >
            <div style={cardStyle}>
              <div
                style={{
                  color: COLORS.muted,
                  fontSize: "9px",
                  fontWeight: 850,
                  marginBottom: "7px",
                }}
              >
                BENEFIT FOR YOU
              </div>
              <div
                style={{
                  color: COLORS.soft,
                  fontSize: "12px",
                  lineHeight: 1.55,
                }}
              >
                {scheme.benefit || "See the official scheme terms."}
              </div>
            </div>

            <div style={cardStyle}>
              <div
                style={{
                  color: COLORS.muted,
                  fontSize: "9px",
                  fontWeight: 850,
                  marginBottom: "7px",
                }}
              >
                IMPORTANT SCHEME DETAILS
              </div>
              {(scheme.keyFacts || []).map((fact, i) => (
                <div
                  key={`fact-${i}`}
                  style={{
                    color: COLORS.soft,
                    fontSize: "11px",
                    lineHeight: 1.5,
                    marginBottom: "5px",
                  }}
                >
                  • {fact}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Documents */}
          <div
            style={{
              marginTop: "10px",
              padding: "13px",
              borderRadius: "11px",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                color: COLORS.muted,
                fontSize: "9px",
                fontWeight: 850,
                marginBottom: "8px",
              }}
            >
              📄 DOCUMENTS YOU SHOULD PREPARE
            </div>

            {(scheme.documents || []).map((doc, i) => (
              <div
                key={`doc-${i}`}
                style={{
                  color: COLORS.soft,
                  fontSize: "11px",
                  lineHeight: 1.5,
                  marginBottom: "5px",
                }}
              >
                □ {doc}
              </div>
            ))}
          </div>

          {/* 4. What to do */}
          <div
            style={{
              marginTop: "10px",
              padding: "13px",
              borderRadius: "11px",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                color: COLORS.muted,
                fontSize: "9px",
                fontWeight: 850,
                marginBottom: "8px",
              }}
            >
              🚀 WHAT YOU SHOULD DO NEXT
            </div>

            {(scheme.process || []).map((step, i) => (
              <div
                key={`step-${i}`}
                style={{
                  color: COLORS.soft,
                  fontSize: "11px",
                  lineHeight: 1.5,
                  marginBottom: "6px",
                }}
              >
                <b>{i + 1}.</b> {step}
              </div>
            ))}
          </div>

          {/* 5. Apply */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "12px",
            }}
          >
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...primaryButton,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              🌐 Apply / Open official portal ↗
            </a>

            <a
              href={scheme.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...secondaryButton,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              📖 Read scheme details ↗
            </a>

            <a
              href="https://www.myscheme.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...secondaryButton,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              🔎 Verify on myScheme ↗
            </a>
          </div>

          {/* 6. Warnings */}
          {(scheme.blockers || []).length > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "11px",
                borderRadius: "10px",
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.20)",
                color: "#FCD34D",
                fontSize: "11px",
                lineHeight: 1.5,
              }}
            >
              <b>⚠ Check before applying:</b>
              {(scheme.blockers || []).map((item, i) => (
                <div key={`block-${i}`} style={{ marginTop: "4px" }}>
                  • {item}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              color: COLORS.muted,
              fontSize: "10px",
              lineHeight: 1.5,
              marginTop: "10px",
            }}
          >
            {scheme.note}
          </div>
        </div>
      )}
    </div>
  );
}

function PrivateLoanCard({ option, analysis, onSelect }) {
  const matchingLender = (analysis?.lenders || []).find((lender) => String(lender.name || "").toLowerCase().includes(option.id.includes("bank") ? "" : option.id));
  const emi = option.id === "personal" || option.id === "bank-business" ? analysis?.suggested_emi : null;
  return (
    <div style={{ background: COLORS.card2, border: `1px solid ${COLORS.border}`, borderRadius: "14px", padding: "16px", height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "21px", marginBottom: "7px" }}>{option.icon}</div>
          <div style={{ fontWeight: 850, fontSize: "14px" }}>{option.name}</div>
          <div style={{ color: COLORS.muted, fontSize: "10px", marginTop: "4px" }}>{option.kind}</div>
        </div>
        <SmallPill tone="blue">Private</SmallPill>
      </div>
      <div style={{ color: COLORS.soft, fontSize: "12px", lineHeight: 1.55, marginTop: "10px", minHeight: "58px" }}>{option.summary}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
        {option.fit.map((item) => <SmallPill key={item}>{item}</SmallPill>)}
      </div>
      {emi ? <div style={{ marginTop: "12px", color: COLORS.green, fontSize: "11px", fontWeight: 800 }}>Indicative EMI from your current profile: {currency(emi)}/month</div> : null}
      {matchingLender ? <div style={{ marginTop: "6px", color: COLORS.muted, fontSize: "10px" }}>Lender comparison available in the Lenders tab.</div> : null}
      <button type="button" onClick={() => onSelect(option)} style={{ ...secondaryButton, width: "100%", marginTop: "13px" }}>Use this route →</button>
    </div>
  );
}

function GovernmentSchemes({ analysis }) {
  const [profile, setProfile] = useState(() => ({
    age: analysis?.age || "",
    gender: "",
    loan_purpose: "",
    state: "",
    social_category: "",
    course_details: "",
  }));

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  const update = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const findSchemes = async () => {
    setLoading(true);
    setError("");
    setSearched(true);

    // Map the simple form into the existing scheme rules.
    // Course details are also passed as the activity/business context so
    // the existing catalogue can use them without adding a second form.
    const schemeProfile = {
      ...profile,
      business_type: profile.course_details,
      occupation: profile.course_details,
      employment_status: profile.course_details,
      business_stage: "new",
      requested_amount: 0,
    };

    try {
      const data = await apiCall("/scheme-recommendation", {
        method: "POST",
        body: JSON.stringify(schemeProfile),
      });

      if (!data?.success) {
        throw new Error(data?.error || data?.message || "Scheme service returned no results.");
      }

      const serverSchemes = Array.isArray(data?.schemes) ? data.schemes : [];

      const normalized = serverSchemes.map((item, index) => ({
        id: item.id || item.scheme_id || `server-${index}`,
        name: item.name || item.scheme_name || "Government scheme",
        type: "government",
        eligible: Boolean(item.eligible),
        confidence: Number(item.match_score ?? item.confidence ?? 0),
        reasons: Array.isArray(item.reasons) ? item.reasons : [],
        blockers: Array.isArray(item.blockers) ? item.blockers : [],
        documents: Array.isArray(item.documents) ? item.documents : [],
        process: Array.isArray(item.process) ? item.process : [],
        officialUrl: item.official_url || item.url || "https://www.myscheme.gov.in/",
        sourceLabel: item.source || "Government source",
        lastUpdated: item.last_updated || item.updated_at || "Verify current official source",
        benefit: item.benefit || item.benefits || "See official scheme terms.",
        keyFacts: Array.isArray(item.key_facts) ? item.key_facts : [],
        note: item.note || "Verify current terms on the official government source.",
        tags: Array.isArray(item.tags) ? item.tags : ["Government scheme"],
      }));

      if (normalized.length > 0) {
        const sorted = normalized.sort(
          (a, b) => Number(b.eligible) - Number(a.eligible) || b.confidence - a.confidence
        );
        setResults(sorted);
        setOpenId(sorted[0]?.id || null);
      } else {
        const fallback = GOVERNMENT_SCHEMES
          .map((scheme) => {
            const result = scheme.match(schemeProfile);
            return {
              ...scheme,
              ...result,
              confidence: scoreSchemeResult(result),
            };
          })
          .sort(
            (a, b) =>
              Number(b.eligible) - Number(a.eligible) || b.confidence - a.confidence
          );

        setResults(fallback);
        setOpenId(fallback[0]?.id || null);
        setError("Showing AmiVest's local scheme catalogue. Please verify the final rules on the official scheme website.");
      }
    } catch (err) {
      const fallback = GOVERNMENT_SCHEMES
        .map((scheme) => {
          const result = scheme.match(schemeProfile);
          return {
            ...scheme,
            ...result,
            confidence: scoreSchemeResult(result),
          };
        })
        .sort(
          (a, b) =>
            Number(b.eligible) - Number(a.eligible) || b.confidence - a.confidence
        );

      setResults(fallback);
      setOpenId(fallback[0]?.id || null);
      setError("Live scheme matching is unavailable. Showing the local scheme information for the demo.");
    } finally {
      setLoading(false);
    }
  };

  const eligible = results.filter((scheme) => scheme.eligible);
  const review = results.filter((scheme) => !scheme.eligible);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      <div
        style={{
          ...cardStyle,
          padding: "22px",
          background:
            "linear-gradient(145deg, rgba(13,148,136,0.15), rgba(30,41,59,0.20))",
          boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
        }}
      >
        <SectionTitle
          icon="🇮🇳"
          title="Government Scheme Finder"
          subtitle="Answer 6 simple questions. AmiVest will show the schemes that may suit you, their benefits, documents and official application website."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
            gap: "10px",
          }}
        >
          <div>
            <label style={labelStyle}>Age</label>
            <input
              type="number"
              min="1"
              max="100"
              value={profile.age}
              onChange={(e) => update("age", e.target.value)}
              style={inputStyle}
              placeholder="e.g. 24"
            />
          </div>

          <div>
            <label style={labelStyle}>Gender</label>
            <select
              value={profile.gender}
              onChange={(e) => update("gender", e.target.value)}
              style={inputStyle}
            >
              <option value="">Select gender</option>
              <option value="Woman">Woman</option>
              <option value="Man">Man</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Purpose</label>
            <select
              value={profile.loan_purpose}
              onChange={(e) => update("loan_purpose", e.target.value)}
              style={inputStyle}
            >
              <option value="">Select purpose</option>
              {PURPOSES.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purpose}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>State</label>
            <select
              value={profile.state}
              onChange={(e) => update("state", e.target.value)}
              style={inputStyle}
            >
              <option value="">Select state / UT</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Caste / Category</label>
            <select
              value={profile.social_category}
              onChange={(e) => update("social_category", e.target.value)}
              style={inputStyle}
            >
              <option value="">Select category</option>
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Course / Business Details</label>
            <input
              value={profile.course_details}
              onChange={(e) => update("course_details", e.target.value)}
              style={inputStyle}
              placeholder="e.g. B.Tech / dairy business"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={findSchemes}
          disabled={loading}
          style={{
            ...primaryButton,
            marginTop: "15px",
            opacity: loading ? 0.55 : 1,
          }}
        >
          {loading ? "Finding schemes..." : "🔎 Show Schemes For Me"}
        </button>

        {error && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.22)",
              color: "#FCD34D",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>

      {searched && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: "9px",
            }}
          >
            <StatBox
              label="POSSIBLE MATCHES"
              value={eligible.length}
              color={COLORS.green}
            />
            <StatBox
              label="CHECK THESE TOO"
              value={review.length}
              color={COLORS.yellow}
            />
            <StatBox
              label="STATE"
              value={profile.state || "Not selected"}
            />
            <StatBox
              label="CATEGORY"
              value={profile.social_category || "Not selected"}
            />
          </div>

          <div style={cardStyle}>
            <SectionTitle
              icon="💰"
              title="Schemes You May Benefit From"
              subtitle="Open any scheme to see benefits, important details, documents and where to apply."
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {results.map((scheme) => (
                <GovernmentSchemeCard
                  key={scheme.id}
                  scheme={scheme}
                  open={openId === scheme.id}
                  onToggle={() =>
                    setOpenId(openId === scheme.id ? null : scheme.id)
                  }
                />
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <SectionTitle
              icon="🌐"
              title="Official Websites"
              subtitle="Use official government websites for the final eligibility check and application."
            />

            <div
              style={{
                display: "flex",
                gap: "9px",
                flexWrap: "wrap",
              }}
            >
              <a
                href="https://www.myscheme.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...primaryButton,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                🔎 myScheme ↗
              </a>

              <a
                href="https://www.jansamarth.in/home"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...secondaryButton,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                🏦 JanSamarth ↗
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "16px",
        marginBottom: "18px",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
          }}
        >
          {icon && <span style={{ fontSize: "20px" }}>{icon}</span>}

          <h2
            style={{
              margin: 0,
              color: COLORS.text,
              fontSize: "18px",
              fontWeight: "750",
            }}
          >
            {title}
          </h2>
        </div>

        {subtitle && (
          <p
            style={{
              margin: "5px 0 0",
              color: COLORS.muted,
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {right}
    </div>
  );
}

function StatBox({ label, value, sub, color = COLORS.text }) {
  return (
    <div
      style={{
        background: COLORS.card2,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        padding: "15px",
      }}
    >
      <div
        style={{
          color: COLORS.muted,
          fontSize: "10px",
          letterSpacing: "0.05em",
          fontWeight: "700",
          marginBottom: "7px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color,
          fontSize: "20px",
          fontWeight: "800",
        }}
      >
        {value}
      </div>

      {sub && (
        <div
          style={{
            color: "#64748B",
            fontSize: "11px",
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ eligible }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: "999px",
        background: eligible
          ? "rgba(16,185,129,0.12)"
          : "rgba(239,68,68,0.12)",
        border: `1px solid ${
          eligible ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"
        }`,
        color: eligible ? "#34D399" : "#FCA5A5",
        fontSize: "12px",
        fontWeight: "700",
      }}
    >
      {eligible ? "✓ Eligible" : "Not Eligible Yet"}
    </span>
  );
}

function ErrorBox({ message, onRetry }) {
  if (!message) return null;

  return (
    <div
      style={{
        ...cardStyle,
        borderColor: "#7F1D1D",
        background: "rgba(127,29,29,0.12)",
        marginBottom: "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "15px",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              color: "#FCA5A5",
              fontWeight: "750",
              fontSize: "14px",
            }}
          >
            ⚠️ Something went wrong
          </div>

          <div
            style={{
              color: "#F87171",
              fontSize: "12px",
              marginTop: "7px",
              lineHeight: "1.5",
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              ...secondaryButton,
              borderColor: "#7F1D1D",
              color: "#FCA5A5",
              flexShrink: 0,
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingBox({ text = "Loading..." }) {
  return (
    <div
      style={{
        ...cardStyle,
        textAlign: "center",
        padding: "45px 20px",
      }}
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          border: "3px solid #263241",
          borderTopColor: COLORS.teal,
          margin: "0 auto 15px",
          animation: "spin 0.8s linear infinite",
        }}
      />

      <div
        style={{
          color: COLORS.soft,
          fontSize: "14px",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/* =========================================================
   INTERVIEW WIZARD
========================================================= */

function InterviewWizard({ onComplete }) {
  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState({
    loan_type: "",
    requested_amount: "",
    loan_purpose: "",
    employment_status: "",
    existing_emi: "",
    duration_years: null,
    credit_score: "",
  });

  const [customAmount, setCustomAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalSteps = 6;

  const update = (field, value) => {
    setAnswers((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(answers.loan_type);

      case 1:
        return numberValue(answers.requested_amount) > 0;

      case 2:
        return Boolean(answers.loan_purpose);

      case 3:
        return Boolean(answers.employment_status);

      case 4:
        return answers.existing_emi !== "";

      case 5:
        return Boolean(answers.duration_years);

      default:
        return false;
    }
  }, [answers, step]);

  const next = () => {
    if (!canProceed) return;

    setError("");

    setStep((current) =>
      Math.min(totalSteps - 1, current + 1)
    );
  };

  const back = () => {
    setError("");

    setStep((current) => Math.max(0, current - 1));
  };

  const submit = async () => {
    if (!canProceed) return;

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...answers,
        requested_amount: Number(answers.requested_amount),
        existing_emi: Number(answers.existing_emi || 0),
        duration_years: Number(answers.duration_years),
        credit_score:
          answers.credit_score === ""
            ? ""
            : Number(answers.credit_score),
      };

      if (
        payload.credit_score &&
        (payload.credit_score < 300 ||
          payload.credit_score > 900)
      ) {
        throw new Error(
          "Credit score should normally be between 300 and 900."
        );
      }

      const data = await apiCall("/loans/profile", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not save your loan profile."
        );
      }

      await onComplete();
    } catch (err) {
      setError(err.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const stepTitles = [
    "Loan type",
    "Loan amount",
    "Purpose",
    "Employment",
    "Current debt",
    "Duration",
  ];

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            color: COLORS.teal,
            fontSize: "12px",
            fontWeight: "800",
            letterSpacing: "0.06em",
            marginBottom: "6px",
          }}
        >
          LOAN PROFILE
        </div>

        <h2
          style={{
            margin: 0,
            color: COLORS.text,
            fontSize: "23px",
          }}
        >
          Let&apos;s understand your loan need
        </h2>

        <p
          style={{
            color: COLORS.muted,
            fontSize: "13px",
            lineHeight: "1.5",
            margin: "7px 0 0",
          }}
        >
          Answer a few questions and FinSaathi will prepare
          an indicative loan analysis.
        </p>
      </div>

      {/* Progress */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${totalSteps}, 1fr)`,
          gap: "5px",
          marginBottom: "9px",
        }}
      >
        {stepTitles.map((title, index) => (
          <button
            key={title}
            type="button"
            onClick={() => {
              if (index <= step) setStep(index);
            }}
            style={{
              height: "5px",
              border: "none",
              borderRadius: "999px",
              background:
                index <= step ? COLORS.teal : "#263241",
              cursor: index <= step ? "pointer" : "default",
              padding: 0,
            }}
          />
        ))}
      </div>

      <div
        style={{
          color: COLORS.muted,
          fontSize: "11px",
          marginBottom: "24px",
        }}
      >
        Step {step + 1} of {totalSteps} · {stepTitles[step]}
      </div>

      {/* STEP 1 */}
      {step === 0 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            What type of loan do you need?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(145px,1fr))",
              gap: "10px",
            }}
          >
            {LOAN_TYPES.map((type) => {
              const active = answers.loan_type === type;
              const hint = {
                "Personal Loan": "Personal needs / emergency",
                "Home Loan": "Property purchase / construction",
                "Education Loan": "Fees / education expenses",
                "Car Loan": "Vehicle purchase",
                "Business Loan": "Working capital / expansion",
                "Gold Loan": "Secured short-term liquidity",
              }[type] || "Loan route";

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => update("loan_type", type)}
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "14px 12px",
                    borderRadius: "11px",
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: active ? "0 8px 22px rgba(13,148,136,0.12)" : "none",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: active ? "800" : "650" }}>{type}</div>
                  <div style={{ color: COLORS.muted, fontSize: "10px", marginTop: "5px", lineHeight: 1.4 }}>{hint}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 1 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            How much do you need?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(120px,1fr))",
              gap: "9px",
              marginBottom: "14px",
            }}
          >
            {AMOUNT_PRESETS.map((amount) => {
              const active =
                numberValue(answers.requested_amount) === amount;

              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    update("requested_amount", amount);
                    setCustomAmount("");
                  }}
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "13px 8px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {currency(amount)}
                </button>
              );
            })}
          </div>

          <label style={labelStyle}>Or enter a custom amount</label>

          <input
            type="number"
            min="1"
            value={customAmount}
            placeholder="Example: 350000"
            onChange={(event) => {
              const value = event.target.value;

              setCustomAmount(value);
              update(
                "requested_amount",
                Number(value) || ""
              );
            }}
            style={inputStyle}
          />

          {numberValue(answers.requested_amount) > 0 && (
            <div
              style={{
                marginTop: "12px",
                color: COLORS.teal,
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              Requested amount:{" "}
              {currency(answers.requested_amount)}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 */}
      {step === 2 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            What is the main purpose?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(145px,1fr))",
              gap: "10px",
            }}
          >
            {PURPOSES.map((purpose) => {
              const active =
                answers.loan_purpose === purpose;

              return (
                <button
                  key={purpose}
                  type="button"
                  onClick={() =>
                    update("loan_purpose", purpose)
                  }
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "15px 12px",
                    borderRadius: "11px",
                    cursor: "pointer",
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {purpose}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 3 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            What is your employment status?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
              gap: "10px",
            }}
          >
            {EMPLOYMENT_TYPES.map((employment) => {
              const active =
                answers.employment_status === employment;

              return (
                <button
                  key={employment}
                  type="button"
                  onClick={() =>
                    update(
                      "employment_status",
                      employment
                    )
                  }
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "16px 12px",
                    borderRadius: "11px",
                    cursor: "pointer",
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {employment}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 4 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            Tell us about your current debt
          </h3>

          <label style={labelStyle}>
            Existing EMI per month
          </label>

          <input
            type="number"
            min="0"
            value={answers.existing_emi}
            placeholder="Enter 0 if you have no EMI"
            onChange={(event) =>
              update("existing_emi", event.target.value)
            }
            style={inputStyle}
          />

          <p
            style={{
              color: "#64748B",
              fontSize: "11px",
              marginTop: "6px",
            }}
          >
            This helps estimate your existing debt burden.
          </p>

          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>
              Credit score
              <span
                style={{
                  color: "#64748B",
                  fontWeight: "400",
                  marginLeft: "5px",
                }}
              >
                optional
              </span>
            </label>

            <input
              type="number"
              min="300"
              max="900"
              value={answers.credit_score}
              placeholder="Example: 750"
              onChange={(event) =>
                update("credit_score", event.target.value)
              }
              style={inputStyle}
            />

            <p
              style={{
                color: "#64748B",
                fontSize: "11px",
                marginTop: "6px",
              }}
            >
              Leave empty if you do not know your score.
            </p>
          </div>
        </div>
      )}

      {/* STEP 6 */}
      {step === 5 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            How long would you like to repay?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(130px,1fr))",
              gap: "10px",
            }}
          >
            {DURATIONS.map((duration) => {
              const active =
                answers.duration_years === duration.value;

              return (
                <button
                  key={duration.value}
                  type="button"
                  onClick={() =>
                    update(
                      "duration_years",
                      duration.value
                    )
                  }
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "15px 10px",
                    borderRadius: "11px",
                    cursor: "pointer",
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {duration.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === totalSteps - 1 && (
        <div style={{ marginTop: "16px", padding: "13px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: "10px" }}>
          <div style={{ color: COLORS.text, fontWeight: "800", fontSize: "12px" }}>🇮🇳 Want AmiVest to check government schemes too?</div>
          <div style={{ color: COLORS.muted, fontSize: "10px", marginTop: "4px", lineHeight: 1.5 }}>You can compare government and private loan routes later in the Govt Schemes tab. This choice does not approve or submit a loan.</div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "18px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid #7F1D1D",
            borderRadius: "9px",
            padding: "11px 13px",
            color: "#FCA5A5",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          marginTop: "28px",
        }}
      >
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || saving}
          style={{
            ...secondaryButton,
            opacity: step === 0 ? 0.4 : 1,
          }}
        >
          ← Back
        </button>

        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canProceed || saving}
            style={{
              ...primaryButton,
              opacity: !canProceed || saving ? 0.45 : 1,
            }}
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canProceed || saving}
            style={{
              ...primaryButton,
              opacity: !canProceed || saving ? 0.45 : 1,
            }}
          >
            {saving
              ? "Analyzing..."
              : "Check My Eligibility"}
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   OVERVIEW
========================================================= */

function Overview({ analysis }) {
  const a = analysis || {};

  const riskScore = clamp(a.risk_score, 0, 100);

  const riskColor =
    riskScore >= 70
      ? COLORS.green
      : riskScore >= 40
      ? COLORS.yellow
      : COLORS.red;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(190px,1fr))",
          gap: "12px",
        }}
      >
        <StatBox
          label="ELIGIBILITY"
          value={
            a.eligible
              ? "Eligible"
              : "Needs Improvement"
          }
          color={a.eligible ? COLORS.green : COLORS.yellow}
          sub="Indicative assessment"
        />

        <StatBox
          label="REQUESTED AMOUNT"
          value={currency(a.requested_amount)}
          color={COLORS.text}
        />

        <StatBox
          label="RECOMMENDED AMOUNT"
          value={currency(a.recommended_amount)}
          color={COLORS.teal}
        />

        <StatBox
          label="SUGGESTED EMI"
          value={currency(a.suggested_emi)}
          color={COLORS.green}
          sub="per month"
        />
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "15px",
          }}
        >
          <div>
            <div
              style={{
                color: COLORS.muted,
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.05em",
                marginBottom: "7px",
              }}
            >
              FINSAATHI ASSESSMENT
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <h3
                style={{
                  color: COLORS.text,
                  margin: 0,
                  fontSize: "19px",
                }}
              >
                Loan eligibility
              </h3>

              <StatusBadge eligible={Boolean(a.eligible)} />
            </div>
          </div>

          <div
            style={{
              width: "45px",
              height: "45px",
              borderRadius: "50%",
              background: "rgba(13,148,136,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            🤖
          </div>
        </div>

        <p
          style={{
            color: COLORS.soft,
            fontSize: "14px",
            lineHeight: "1.7",
            marginBottom: 0,
          }}
        >
          {a.ai_explanation ||
            "Your loan analysis is ready."}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",
          gap: "16px",
        }}
      >
        <div style={cardStyle}>
          <SectionTitle
            icon="📊"
            title="Risk score"
            subtitle="Higher is generally better in this FinSaathi indicator."
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                color: COLORS.muted,
                fontSize: "12px",
              }}
            >
              Score
            </span>

            <strong
              style={{
                color: riskColor,
                fontSize: "26px",
              }}
            >
              {riskScore}/100
            </strong>
          </div>

          <div
            style={{
              height: "10px",
              background: "#071019",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${riskScore}%`,
                height: "100%",
                background: riskColor,
                borderRadius: "999px",
                transition: "width .4s ease",
              }}
            />
          </div>

          <div
            style={{
              color: COLORS.muted,
              fontSize: "11px",
              marginTop: "9px",
            }}
          >
            This is an indicative product score, not a
            lender&apos;s credit decision.
          </div>
        </div>

        <div style={cardStyle}>
          <SectionTitle
            icon="💳"
            title="Loan snapshot"
            subtitle="Key numbers from your profile."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <StatBox
              label="RATE RANGE"
              value={a.assumed_rate_range || "—"}
            />

            <StatBox
              label="CURRENT DTI"
              value={
                a.existing_dti !== undefined
                  ? `${a.existing_dti}%`
                  : "—"
              }
            />

            <StatBox
              label="TENURE"
              value={
                a.duration_years
                  ? `${a.duration_years} yrs`
                  : "—"
              }
            />

            <StatBox
              label="PURPOSE"
              value={a.loan_purpose || "—"}
            />
          </div>
        </div>
      </div>

      {Array.isArray(a.warnings) &&
        a.warnings.length > 0 && (
          <div style={cardStyle}>
            <SectionTitle
              icon="⚠️"
              title="Things to check"
              subtitle="Review these before applying."
            />

            {a.warnings.map((warning, index) => (
              <div
                key={`${warning}-${index}`}
                style={{
                  background:
                    "rgba(245,158,11,0.08)",
                  border:
                    "1px solid rgba(245,158,11,0.35)",
                  borderRadius: "9px",
                  padding: "11px 13px",
                  color: "#FCD34D",
                  fontSize: "13px",
                  marginBottom:
                    index === a.warnings.length - 1
                      ? 0
                      : "8px",
                  lineHeight: "1.5",
                }}
              >
                ⚠ {warning}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* =========================================================
   RECOMMENDATION
========================================================= */

function Recommendation({ analysis }) {
  const a = analysis || {};

  const reasons = Array.isArray(a.reasons)
    ? a.reasons
    : [];

  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="💡"
        title="Loan recommendation"
        subtitle="An indicative recommendation based on your submitted profile."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(200px,1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <StatBox
          label="RECOMMENDED AMOUNT"
          value={currency(a.recommended_amount)}
          color={COLORS.green}
        />

        <StatBox
          label="SUGGESTED EMI"
          value={currency(a.suggested_emi)}
          color={COLORS.teal}
          sub="/ month"
        />

        <StatBox
          label="REQUESTED"
          value={currency(a.requested_amount)}
        />

        <StatBox
          label="DTI"
          value={
            a.existing_dti !== undefined
              ? `${a.existing_dti}%`
              : "—"
          }
        />
      </div>

      <div
        style={{
          background: COLORS.card2,
          border: `1px solid ${COLORS.border}`,
          borderRadius: "11px",
          padding: "14px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            color: COLORS.muted,
            fontSize: "11px",
            fontWeight: "700",
            marginBottom: "7px",
          }}
        >
          ASSUMED RATE
        </div>

        <div
          style={{
            color: COLORS.text,
            fontWeight: "700",
            fontSize: "15px",
          }}
        >
          {a.assumed_rate_range || "Indicative rate range unavailable"}
        </div>

        <div
          style={{
            color: "#64748B",
            fontSize: "11px",
            marginTop: "6px",
          }}
        >
          Actual rate, approval and final EMI are decided by
          the lender after its own checks.
        </div>
      </div>

      <div>
        <div
          style={{
            color: COLORS.muted,
            fontSize: "11px",
            fontWeight: "700",
            marginBottom: "10px",
          }}
        >
          WHY THIS RECOMMENDATION?
        </div>

        {reasons.length === 0 ? (
          <div
            style={{
              color: COLORS.muted,
              fontSize: "13px",
            }}
          >
            No detailed reasons were returned by the backend.
          </div>
        ) : (
          reasons.map((reason, index) => (
            <div
              key={`${reason}-${index}`}
              style={{
                display: "flex",
                gap: "9px",
                color: COLORS.soft,
                fontSize: "13px",
                lineHeight: "1.5",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: COLORS.green }}>
                ✓
              </span>
              <span>{reason}</span>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "13px",
          background: "rgba(13,148,136,0.08)",
          border: "1px solid rgba(13,148,136,0.25)",
          borderRadius: "10px",
          color: COLORS.muted,
          fontSize: "12px",
          lineHeight: "1.6",
        }}
      >
        ℹ️ FinSaathi is providing educational and
        indicative financial information. It does not guarantee
        loan approval or act as a lender.
      </div>
    </div>
  );
}

/* =========================================================
   LENDER COMPARISON
========================================================= */

function LenderComparison({ analysis }) {
  const a = analysis || {};

  const lenders = Array.isArray(a.lenders)
    ? a.lenders
    : [];

  if (!lenders.length) {
    return (
      <div style={cardStyle}>
        <SectionTitle
          icon="🏦"
          title="Lender comparison"
          subtitle="No lender comparison was returned by the backend."
        />

        <div
          style={{
            color: COLORS.muted,
            fontSize: "13px",
          }}
        >
          Try refreshing your analysis.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="🏦"
        title="Compare lenders"
        subtitle="Use these figures for comparison only. Verify current rates and terms directly with each lender."
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {lenders.map((lender, index) => {
          const isBest =
            lender.name === a.best_lender;

          return (
            <div
              key={`${lender.name || "lender"}-${index}`}
              style={{
                background: isBest
                  ? "rgba(13,148,136,0.08)"
                  : COLORS.card2,
                border: `1px solid ${
                  isBest
                    ? COLORS.teal
                    : COLORS.border
                }`,
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <span
                    style={{
                      color: COLORS.text,
                      fontSize: "15px",
                      fontWeight: "750",
                    }}
                  >
                    {lender.name || "Lender"}
                  </span>

                  {isBest && (
                    <span
                      style={{
                        marginLeft: "8px",
                        color: COLORS.teal,
                        fontSize: "11px",
                        fontWeight: "800",
                      }}
                    >
                      ★ BEST MATCH
                    </span>
                  )}
                </div>

                <span
                  style={{
                    color: COLORS.muted,
                    fontSize: "11px",
                  }}
                >
                  {lender.kind || "Lender"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(130px,1fr))",
                  gap: "9px",
                  marginBottom: "10px",
                }}
              >
                <StatBox
                  label="RATE"
                  value={lender.rate_range || "—"}
                />

                <StatBox
                  label="EST. EMI"
                  value={currency(
                    lender.estimated_emi
                  )}
                  color={COLORS.green}
                />
              </div>

              {lender.pros && (
                <div
                  style={{
                    color: COLORS.soft,
                    fontSize: "12px",
                    lineHeight: "1.5",
                    marginBottom: "5px",
                  }}
                >
                  ✓ {lender.pros}
                </div>
              )}

              {lender.cons && (
                <div
                  style={{
                    color: COLORS.muted,
                    fontSize: "12px",
                    lineHeight: "1.5",
                  }}
                >
                  − {lender.cons}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   DOCUMENTS
========================================================= */

function Documents({ analysis }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [selectedPhase, setSelectedPhase] = useState("identity");
  const [selectedType, setSelectedType] = useState("Aadhaar / Identity proof");
  const [documents, setDocuments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const requested = Array.isArray(analysis?.documents) ? analysis.documents : [];

  const phases = [
    { id: "identity", label: "1. Identity", icon: "🪪", types: ["Aadhaar / Identity proof", "PAN Card", "Photograph", "Address proof"] },
    { id: "business", label: "2. Business", icon: "🏪", types: ["Udyam / Business registration", "GST / tax registration", "Trade licence", "Rent / lease agreement"] },
    { id: "financial", label: "3. Financial", icon: "💹", types: ["Bank statement", "ITR / tax return", "Salary slip / income proof", "Existing loan statement", "Credit report"] },
    { id: "project", label: "4. Project / DPR", icon: "📑", types: ["Project report / DPR", "Quotation / proforma invoice", "Asset / machinery quotation", "Land / site document"] },
    { id: "scheme", label: "5. Scheme-specific", icon: "🇮🇳", types: ["Caste / category certificate", "Vendor / artisan proof", "Agriculture / land record", "Food / activity proof", "Other scheme document"] },
  ];

  const activePhase = phases.find((phase) => phase.id === selectedPhase) || phases[0];

  useEffect(() => {
    if (!activePhase.types.includes(selectedType)) setSelectedType(activePhase.types[0]);
  }, [selectedPhase, activePhase.types, selectedType]);

  const expectedDocuments = requested.length ? requested : activePhase.types;

  const localPrecheck = (file, type, phase) => {
    const lowerName = file.name.toLowerCase();
    const hints = {
      "Aadhaar / Identity proof": ["aadhaar", "aadhar", "identity"],
      "PAN Card": ["pan"],
      "Bank statement": ["bank", "statement"],
      "ITR / tax return": ["itr", "tax", "return"],
      "Project report / DPR": ["dpr", "project", "report"],
      "Quotation / proforma invoice": ["quotation", "quote", "invoice"],
      "Caste / category certificate": ["caste", "sc", "st", "obc", "certificate"],
    };
    const words = hints[type] || [];
    const nameHint = words.length === 0 || words.some((word) => lowerName.includes(word));
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type);
    const sizeOkay = file.size <= 10 * 1024 * 1024;
    return {
      file_name: file.name,
      type,
      phase,
      format_ok: allowed,
      size_ok: sizeOkay,
      filename_hint: nameHint,
      captured_at: new Date().toISOString(),
      status: allowed && sizeOkay ? "Needs AI / human verification" : "Fix file before upload",
      verdict: allowed && sizeOkay && nameHint ? "Likely relevant" : allowed && sizeOkay ? "Needs review" : "Invalid file",
    };
  };

  const verifyFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    setMessage("");

    for (const file of files) {
      const precheck = localPrecheck(file, selectedType, selectedPhase);
      const localEntry = {
        id: `${Date.now()}-${Math.random()}`,
        ...precheck,
        size: file.size,
        last_modified: file.lastModified,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
        ai: { status: "not_connected", message: "AI verification endpoint is not connected yet." },
      };

      try {
        const formData = new FormData();
        formData.append("document", file);
        formData.append("document_type", selectedType);
        formData.append("phase", selectedPhase);
        formData.append("loan_type", analysis?.loan_type || "");
        formData.append("requested_amount", String(analysis?.requested_amount || ""));
        formData.append("state", String(analysis?.state || ""));
        formData.append("district", String(analysis?.district || ""));

        const result = await apiCall("/loans/documents/verify", {
          method: "POST",
          body: formData,
        });

        localEntry.ai = {
          status: result?.verified ? "verified" : "review",
          verified: Boolean(result?.verified),
          detected_document: result?.detected_document || result?.document_type || selectedType,
          extracted_date: result?.document_date || result?.issue_date || result?.expiry_date || null,
          expiry_date: result?.expiry_date || null,
          confidence: Number(result?.confidence || result?.match_score || 0),
          message: result?.message || "AI document verification completed.",
          fields: result?.fields || result?.extracted_fields || {},
        };
      } catch (error) {
        localEntry.ai = {
          status: "not_connected",
          message: "AI verification is not available from the current backend. The file has only passed local format / size pre-checks.",
        };
      }

      setDocuments((current) => [localEntry, ...current].slice(0, 30));
    }

    setMessage(`${files.length} document${files.length > 1 ? "s" : ""} added to your document checklist.`);
    setBusy(false);
  };

  const removeDocument = (id) => {
    setDocuments((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.id !== id);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={cardStyle}>
        <SectionTitle icon="📄" title="Smart document readiness" subtitle="Upload documents phase-by-phase. AmiVest records the document type, upload date, file checks and — when the backend supports it — AI verification results, extracted dates and detected fields." />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: "8px", marginBottom: "15px" }}>
          {phases.map((phase) => <button key={phase.id} type="button" onClick={() => setSelectedPhase(phase.id)} style={{ ...secondaryButton, textAlign: "left", background: selectedPhase === phase.id ? "rgba(13,148,136,0.14)" : COLORS.card2, borderColor: selectedPhase === phase.id ? COLORS.teal : COLORS.border }}><div style={{ fontSize: "17px" }}>{phase.icon}</div><div style={{ color: COLORS.text, fontWeight: 800, fontSize: "11px", marginTop: "4px" }}>{phase.label}</div><div style={{ color: COLORS.muted, fontSize: "9px", marginTop: "3px" }}>{phase.types.length} document types</div></button>)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "10px", alignItems: "end" }}>
          <div><label style={labelStyle}>Document type</label><select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={inputStyle}>{activePhase.types.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={primaryButton}>{busy ? "Checking..." : "📁 Add file"}</button>
          <button type="button" onClick={() => cameraInputRef.current?.click()} style={secondaryButton}>📷 Take photo</button>
          <button type="button" onClick={() => setDocuments([])} style={dangerButton}>Clear all</button>
        </div>

        <input ref={fileInputRef} type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { verifyFiles(e.target.files); e.target.value = ""; }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { verifyFiles(e.target.files); e.target.value = ""; }} />

        <div style={{ marginTop: "14px", padding: "13px", borderRadius: "10px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)" }}>
          <div style={{ color: COLORS.text, fontWeight: 850, fontSize: "11px" }}>🤖 What the AI verifier is designed to check</div>
          <div style={{ color: COLORS.muted, fontSize: "11px", lineHeight: 1.55, marginTop: "5px" }}>Document type → readable / supported file → extracted name/date/expiry fields → consistency with the selected loan phase → possible mismatch flags → confidence → human review when uncertain.</div>
        </div>

        {requested.length > 0 && <div style={{ marginTop: "12px" }}><div style={{ color: COLORS.muted, fontSize: "10px", fontWeight: 850, marginBottom: "7px" }}>CURRENT LOAN PROFILE REQUESTED DOCUMENTS</div><div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>{requested.map((item, index) => <SmallPill key={`${item}-${index}`} tone="blue">{item}</SmallPill>)}</div></div>}

        {message && <div style={{ marginTop: "10px", color: COLORS.green, fontSize: "11px" }}>{message}</div>}
      </div>

      <div style={cardStyle}>
        <SectionTitle icon="🗂️" title="Your document locker" subtitle="This front end keeps the local file preview and verification result in memory. For production, upload encrypted files to the backend and store only user-scoped metadata." />
        {documents.length === 0 ? <div style={{ color: COLORS.muted, fontSize: "12px", padding: "20px 0", textAlign: "center" }}>No documents added yet. Start with Identity or the phase required by your selected loan route.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {documents.map((item) => {
              const verified = item.ai?.status === "verified" && item.ai?.verified;
              const review = item.ai?.status === "review";
              return <div key={item.id} style={{ background: COLORS.card2, border: `1px solid ${verified ? "rgba(16,185,129,0.35)" : review ? "rgba(245,158,11,0.30)" : COLORS.border}`, borderRadius: "12px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: COLORS.text, fontWeight: 850, fontSize: "12px", wordBreak: "break-word" }}>{item.file_name}</div>
                    <div style={{ color: COLORS.muted, fontSize: "9px", marginTop: "3px" }}>{item.phase} · {item.type} · Added {formatDate(item.captured_at)}</div>
                  </div>
                  <SmallPill tone={verified ? "good" : review ? "warn" : "neutral"}>{verified ? "✓ AI verified" : review ? "⚠ AI review" : "⌁ Local pre-check"}</SmallPill>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "7px", marginTop: "9px" }}>
                  <StatBox label="FILE FORMAT" value={item.format_ok ? "Supported" : "Fix"} color={item.format_ok ? COLORS.green : COLORS.red} />
                  <StatBox label="SIZE" value={`${(item.size / (1024 * 1024)).toFixed(2)} MB`} />
                  <StatBox label="NAME SIGNAL" value={item.filename_hint ? "Relevant" : "Review"} color={item.filename_hint ? COLORS.green : COLORS.yellow} />
                  <StatBox label="DATE DETECTED" value={item.ai?.extracted_date ? formatDate(item.ai.extracted_date) : "Not detected"} />
                </div>

                {item.ai?.message && <div style={{ color: COLORS.muted, fontSize: "10px", lineHeight: 1.5, marginTop: "8px" }}>{item.ai.message}</div>}
                {item.ai?.detected_document && <div style={{ color: COLORS.soft, fontSize: "10px", marginTop: "5px" }}>Detected document: <strong>{item.ai.detected_document}</strong>{item.ai?.confidence ? ` · ${item.ai.confidence}% confidence` : ""}</div>}

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "9px" }}><button type="button" onClick={() => removeDocument(item.id)} style={{ ...dangerButton, padding: "7px 10px", fontSize: "10px" }}>Remove</button>{item.preview && <a href={item.preview} target="_blank" rel="noopener noreferrer" style={{ ...secondaryButton, textDecoration: "none", padding: "7px 10px", fontSize: "10px" }}>Preview ↗</a>}</div>
              </div>;
            })}
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, background: "rgba(245,158,11,0.04)" }}>
        <div style={{ color: "#FCD34D", fontWeight: 850, fontSize: "11px" }}>🔐 Privacy & authenticity</div>
        <div style={{ color: COLORS.muted, fontSize: "10px", lineHeight: 1.6, marginTop: "5px" }}>Use this feature as a document-readiness assistant, not as an official KYC decision. Never edit or fabricate a document. When a value, date, identity or document type cannot be confidently verified, AmiVest should mark it for human / lender review.</div>
      </div>
    </div>
  );
}

/* =========================================================
   OFFICIAL APPLY LINKS
========================================================= */

const APPLY_PARTNERS = [
  {
    name: "SBI",
    url: "https://sbi.co.in",
  },
  {
    name: "HDFC Bank",
    url: "https://www.hdfcbank.com",
  },
  {
    name: "ICICI Bank",
    url: "https://www.icicibank.com",
  },
  {
    name: "Axis Bank",
    url: "https://www.axisbank.com",
  },
  {
    name: "Bajaj Finance",
    url: "https://www.bajajfinserv.in",
  },
  {
    name: "Tata Capital",
    url: "https://www.tatacapital.com",
  },
];

function ApplyLoan() {
  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="🚀"
        title="Apply safely"
        subtitle="Open the official lender website and complete the application there."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: "10px",
        }}
      >
        {APPLY_PARTNERS.map((partner) => (
          <a
            key={partner.name}
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: COLORS.card2,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "11px",
              padding: "16px",
              color: COLORS.text,
              textDecoration: "none",
              fontWeight: "700",
              fontSize: "13px",
              textAlign: "center",
              transition: "border-color .2s ease",
            }}
          >
            {partner.name}
            <span
              style={{
                color: COLORS.teal,
                marginLeft: "6px",
              }}
            >
              ↗
            </span>
          </a>
        ))}
      </div>

      <div
        style={{
          marginTop: "18px",
          padding: "14px",
          borderRadius: "10px",
          background: "rgba(13,148,136,0.08)",
          border: "1px solid rgba(13,148,136,0.25)",
          color: COLORS.muted,
          fontSize: "12px",
          lineHeight: "1.6",
        }}
      >
        🔐 Safety tip: FinSaathi will never ask you to pay
        an upfront fee to unlock a loan. Check the lender&apos;s
        official terms before submitting personal documents.
      </div>
    </div>
  );
}

/* =========================================================
   LOAN TRACKER
========================================================= */

function LoanTracker() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    lender: "",
    principal: "",
    annual_rate: "",
    tenure_months: "",
    start_date: "",
  });

  const loadLoans = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiCall("/loans/track");

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not load tracked loans."
        );
      }

      setLoans(
        Array.isArray(data.loans)
          ? data.loans
          : []
      );
    } catch (err) {
      setError(
        err.message || "Could not load loan tracker."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const update = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const addLoan = async () => {
    setError("");

    const principal = numberValue(form.principal);
    const annualRate = numberValue(form.annual_rate);
    const tenure = numberValue(form.tenure_months);

    if (!form.lender.trim()) {
      setError("Enter the lender name.");
      return;
    }

    if (principal <= 0) {
      setError("Enter a valid principal amount.");
      return;
    }

    if (annualRate < 0 || annualRate > 100) {
      setError("Enter a valid annual interest rate.");
      return;
    }

    if (tenure <= 0) {
      setError("Enter a valid tenure in months.");
      return;
    }

    setSaving(true);

    try {
      const data = await apiCall("/loans/track", {
        method: "POST",
        body: JSON.stringify({
          lender: form.lender.trim(),
          principal,
          annual_rate: annualRate,
          tenure_months: tenure,
          start_date: form.start_date,
        }),
      });

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not save this loan."
        );
      }

      setForm({
        lender: "",
        principal: "",
        annual_rate: "",
        tenure_months: "",
        start_date: "",
      });

      setShowAdd(false);

      await loadLoans();
    } catch (err) {
      setError(
        err.message || "Could not save this loan."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeLoan = async (id) => {
    if (!window.confirm("Remove this tracked loan?")) {
      return;
    }

    setDeleting(id);
    setError("");

    try {
      const data = await apiCall(
        `/loans/track/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not remove the loan."
        );
      }

      await loadLoans();
    } catch (err) {
      setError(
        err.message || "Could not remove the loan."
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="📊"
        title="Loan tracker"
        subtitle="Keep your existing loans in one place."
        right={
          <button
            onClick={() => {
              setShowAdd((value) => !value);
              setError("");
            }}
            style={primaryButton}
          >
            {showAdd ? "Cancel" : "+ Track Loan"}
          </button>
        }
      />

      {error && (
        <div
          style={{
            marginBottom: "15px",
            color: "#FCA5A5",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid #7F1D1D",
            padding: "10px 12px",
            borderRadius: "9px",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {showAdd && (
        <div
          style={{
            background: COLORS.card2,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(190px,1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Lender name
              </label>

              <input
                value={form.lender}
                onChange={(event) =>
                  update("lender", event.target.value)
                }
                placeholder="Example: SBI"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Principal (₹)
              </label>

              <input
                type="number"
                min="1"
                value={form.principal}
                onChange={(event) =>
                  update(
                    "principal",
                    event.target.value
                  )
                }
                placeholder="500000"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Annual interest (%)
              </label>

              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.annual_rate}
                onChange={(event) =>
                  update(
                    "annual_rate",
                    event.target.value
                  )
                }
                placeholder="10.5"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Tenure (months)
              </label>

              <input
                type="number"
                min="1"
                value={form.tenure_months}
                onChange={(event) =>
                  update(
                    "tenure_months",
                    event.target.value
                  )
                }
                placeholder="60"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Start date
              </label>

              <input
                type="date"
                value={form.start_date}
                onChange={(event) =>
                  update(
                    "start_date",
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <button
                onClick={addLoan}
                disabled={saving}
                style={{
                  ...primaryButton,
                  width: "100%",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Loan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div
          style={{
            color: COLORS.muted,
            fontSize: "13px",
            padding: "15px 0",
          }}
        >
          Loading loans...
        </div>
      ) : loans.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "30px 10px",
            color: COLORS.muted,
          }}
        >
          <div style={{ fontSize: "34px" }}>💳</div>

          <div
            style={{
              color: COLORS.soft,
              fontWeight: "700",
              marginTop: "8px",
            }}
          >
            No loans tracked yet
          </div>

          <div
            style={{
              fontSize: "12px",
              marginTop: "5px",
            }}
          >
            Add your existing loan to track EMI and
            repayment progress.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {loans.map((loan) => {
            const progress = clamp(
              loan.progress_pct,
              0,
              100
            );

            return (
              <div
                key={loan.id}
                style={{
                  background: COLORS.card2,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "12px",
                  padding: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: COLORS.text,
                        fontWeight: "750",
                        fontSize: "14px",
                      }}
                    >
                      {loan.lender}
                    </div>

                    <div
                      style={{
                        color: COLORS.muted,
                        fontSize: "11px",
                        marginTop: "3px",
                      }}
                    >
                      {loan.start_date
                        ? `Started ${formatDate(
                            loan.start_date
                          )}`
                        : "Loan details"}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      removeLoan(loan.id)
                    }
                    disabled={deleting === loan.id}
                    style={{
                      ...dangerButton,
                      opacity:
                        deleting === loan.id
                          ? 0.5
                          : 1,
                    }}
                  >
                    {deleting === loan.id
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </div>

                <div
                  style={{
                    height: "8px",
                    background: "#071019",
                    borderRadius: "999px",
                    overflow: "hidden",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: COLORS.teal,
                      borderRadius: "999px",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(130px,1fr))",
                    gap: "9px",
                  }}
                >
                  <StatBox
                    label="EMI"
                    value={currency(loan.emi)}
                    color={COLORS.green}
                  />

                  <StatBox
                    label="REMAINING"
                    value={currency(
                      loan.remaining_balance
                    )}
                  />

                  <StatBox
                    label="NEXT DUE"
                    value={
                      loan.next_due_date
                        ? formatDate(
                            loan.next_due_date
                          )
                        : "—"
                    }
                  />

                  <StatBox
                    label="PROGRESS"
                    value={`${progress.toFixed(0)}%`}
                    color={COLORS.teal}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "rgba(13,148,136,0.07)",
          border: "1px solid rgba(13,148,136,0.2)",
          borderRadius: "9px",
          color: COLORS.muted,
          fontSize: "11px",
          lineHeight: "1.6",
        }}
      >
        💡 Before making an extra payment or prepayment,
        check your lender&apos;s current prepayment rules and
        charges.
      </div>
    </div>
  );
}

/* =========================================================
   EMI CALCULATOR
========================================================= */

function EMICalculator() {
  const [amount, setAmount] = useState("500000");
  const [rate, setRate] = useState("10");
  const [months, setMonths] = useState("60");

  const emi = useMemo(
    () =>
      calculateEMI(
        amount,
        rate,
        months
      ),
    [amount, rate, months]
  );

  const totalPayment =
    emi * numberValue(months);

  const totalInterest =
    totalPayment - numberValue(amount);

  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="🧮"
        title="EMI calculator"
        subtitle="Quick estimate. Actual EMI depends on the lender's final rate and terms."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: "12px",
        }}
      >
        <div>
          <label style={labelStyle}>
            Loan amount (₹)
          </label>

          <input
            type="number"
            min="0"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Annual rate (%)
          </label>

          <input
            type="number"
            min="0"
            step="0.1"
            value={rate}
            onChange={(event) =>
              setRate(event.target.value)
            }
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Tenure (months)
          </label>

          <input
            type="number"
            min="1"
            value={months}
            onChange={(event) =>
              setMonths(event.target.value)
            }
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: "10px",
          marginTop: "16px",
        }}
      >
        <StatBox
          label="MONTHLY EMI"
          value={currency(emi)}
          color={COLORS.green}
        />

        <StatBox
          label="TOTAL INTEREST"
          value={currency(
            Math.max(0, totalInterest)
          )}
          color={COLORS.yellow}
        />

        <StatBox
          label="TOTAL PAYMENT"
          value={currency(totalPayment)}
          color={COLORS.teal}
        />
      </div>
    </div>
  );
}

/* =========================================================
   AI CHAT
========================================================= */

function FloatingLoanChat() {
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      who: "ai",
      text:
        "👋 Hi! Ask me about loan eligibility, EMI, documents, repayment, or lender comparison.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = [
    "What documents do I need?",
    "How can I reduce my EMI?",
    "Explain my loan eligibility",
  ];

  const sendMessage = async (preset = null) => {
    const question = String(
      preset ?? input
    ).trim();

    if (!question || loading) return;

    setMessages((previous) => [
      ...previous,
      {
        who: "user",
        text: question,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const data = await apiCall("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: question,
        }),
      });

      const reply =
        data?.reply ||
        data?.response ||
        data?.message ||
        "I couldn't generate a response.";

      setMessages((previous) => [
        ...previous,
        {
          who: "ai",
          text: reply,
        },
      ]);
    } catch (err) {
      setMessages((previous) => [
        ...previous,
        {
          who: "ai",
          text:
            "❌ I couldn't reach the AI right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            right: "22px",
            bottom: "88px",
            width: "360px",
            maxWidth: "calc(100vw - 30px)",
            height: "470px",
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "17px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 2000,
            boxShadow:
              "0 18px 50px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              padding: "15px",
              background: COLORS.card2,
              borderBottom: `1px solid ${COLORS.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: COLORS.text,
                  fontWeight: "800",
                  fontSize: "14px",
                }}
              >
                🤖 Loan Assistant
              </div>

              <div
                style={{
                  color: COLORS.muted,
                  fontSize: "10px",
                  marginTop: "3px",
                }}
              >
                FinSaathi AI
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: COLORS.muted,
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "13px",
              display: "flex",
              flexDirection: "column",
              gap: "9px",
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent:
                    message.who === "user"
                      ? "flex-end"
                      : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "86%",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    background:
                      message.who === "user"
                        ? COLORS.teal
                        : COLORS.card2,
                    border:
                      message.who === "user"
                        ? "none"
                        : `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    fontSize: "12px",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "4px",
                }}
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() =>
                      sendMessage(suggestion)
                    }
                    style={{
                      background: "transparent",
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.soft,
                      borderRadius: "999px",
                      padding: "7px 9px",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div
                style={{
                  color: COLORS.muted,
                  fontSize: "11px",
                }}
              >
                Thinking...
              </div>
            )}
          </div>

          <div
            style={{
              padding: "10px",
              borderTop: `1px solid ${COLORS.border}`,
              display: "flex",
              gap: "7px",
            }}
          >
            <input
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Ask about your loan..."
              style={{
                ...inputStyle,
                flex: 1,
                padding: "10px",
              }}
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                ...primaryButton,
                padding: "10px 13px",
                opacity:
                  loading || !input.trim()
                    ? 0.45
                    : 1,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        title="Ask Loan Assistant"
        style={{
          position: "fixed",
          right: "22px",
          bottom: "20px",
          width: "58px",
          height: "58px",
          borderRadius: "50%",
          background: COLORS.teal,
          border: "none",
          color: "#fff",
          fontSize: "23px",
          cursor: "pointer",
          zIndex: 2000,
          boxShadow:
            "0 7px 25px rgba(13,148,136,0.4)",
        }}
      >
        {open ? "✕" : "🤖"}
      </button>
    </>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function LoanAssistant({
  transactions = [],
} = {}) {
  const [analysisData, setAnalysisData] =
    useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showInterview, setShowInterview] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("overview");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const loadAnalysis = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const data = await apiCall("/loans/analysis");

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not load your loan analysis."
        );
      }

      if (!data.profile_complete) {
        setAnalysisData(null);
        setShowInterview(true);
        return;
      }

      setAnalysisData(data);
      setShowInterview(false);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the loan service."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  /*
    If transactions change, refresh the loan analysis.
    This keeps the page connected to the user's latest
    financial data.
  */
  const transactionSignature = useMemo(() => {
    if (!Array.isArray(transactions)) return "";

    return `${transactions.length}:${transactions.reduce(
      (sum, transaction) =>
        sum + numberValue(transaction?.amount),
      0
    )}`;
  }, [transactions]);

  useEffect(() => {
    if (!transactionSignature || showInterview) {
      return;
    }

    loadAnalysis(true);

    // We intentionally only react to transaction changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionSignature]);

  const handleInterviewComplete = async () => {
    await loadAnalysis();
  };

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: "📊",
    },
    {
      id: "recommendation",
      label: "Recommendation",
      icon: "💡",
    },
    {
      id: "lenders",
      label: "Lenders",
      icon: "🏦",
    },
    {
      id: "documents",
      label: "Documents",
      icon: "📄",
    },
    {
      id: "schemes",
      label: "Govt Schemes",
      icon: "🇮🇳",
    },
    {
      id: "apply",
      label: "Apply",
      icon: "🚀",
    },
    {
      id: "tracker",
      label: "Tracker",
      icon: "📈",
    },
    {
      id: "calculator",
      label: "EMI",
      icon: "🧮",
    },
  ];

  return (
    <div
      style={{
        color: COLORS.text,
        maxWidth: "1200px",
        margin: "0 auto",
        paddingBottom: "100px",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "15px",
          marginBottom: "22px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: COLORS.teal,
              fontSize: "11px",
              fontWeight: "800",
              letterSpacing: "0.08em",
              marginBottom: "5px",
            }}
          >
            FINSAATHI AI
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "29px",
              fontWeight: "800",
              letterSpacing: "-0.02em",
            }}
          >
            Loan Advisor
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              color: COLORS.muted,
              fontSize: "13px",
              lineHeight: "1.5",
              maxWidth: "650px",
            }}
          >
            Compare government schemes and private loans, understand eligibility, prepare the right documents, and follow a safe application path in one place.
          </p>
        </div>

        {!showInterview && analysisData && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {lastUpdated && (
              <span
                style={{
                  color: "#64748B",
                  fontSize: "10px",
                }}
              >
                Updated{" "}
                {lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}

            <button
              onClick={() => loadAnalysis()}
              disabled={loading}
              style={{
                ...secondaryButton,
                opacity: loading ? 0.5 : 1,
              }}
            >
              🔄 Refresh
            </button>
          </div>
        )}
      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && !analysisData && (
        <LoadingBox text="Analyzing your loan profile..." />
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {!loading && error && (
        <ErrorBox
          message={error}
          onRetry={() => loadAnalysis()}
        />
      )}

      {/* =================================================
          INTERVIEW
      ================================================= */}

      {!loading && !error && showInterview && (
        <>
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(13,148,136,0.12), rgba(59,130,246,0.05))",
              border: "1px solid rgba(13,148,136,0.25)",
              borderRadius: "14px",
              padding: "15px 17px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                color: COLORS.text,
                fontWeight: "700",
                fontSize: "13px",
              }}
            >
              🔐 Your information stays connected to your
              account
            </div>

            <div
              style={{
                color: COLORS.muted,
                fontSize: "11px",
                marginTop: "4px",
                lineHeight: "1.5",
              }}
            >
              Complete the profile below to generate your
              personalized loan analysis.
            </div>
          </div>

          <InterviewWizard
            onComplete={handleInterviewComplete}
          />
        </>
      )}

      {/* =================================================
          RESULTS
      ================================================= */}

      {!loading &&
        !error &&
        !showInterview &&
        analysisData && (
          <>
            {/* Quick summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(170px,1fr))",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <StatBox
                label="STATUS"
                value={
                  analysisData.eligible
                    ? "Eligible"
                    : "Review"
                }
                color={
                  analysisData.eligible
                    ? COLORS.green
                    : COLORS.yellow
                }
              />

              <StatBox
                label="RECOMMENDED"
                value={currency(
                  analysisData.recommended_amount
                )}
                color={COLORS.teal}
              />

              <StatBox
                label="EMI"
                value={currency(
                  analysisData.suggested_emi
                )}
                color={COLORS.green}
              />

              <StatBox
                label="RISK"
                value={`${clamp(
                  analysisData.risk_score,
                  0,
                  100
                )}/100`}
                color={
                  clamp(
                    analysisData.risk_score,
                    0,
                    100
                  ) >= 70
                    ? COLORS.green
                    : COLORS.yellow
                }
              />
            </div>

            {/* Tabs */}
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "13px",
                padding: "6px",
                marginBottom: "16px",
                display: "flex",
                gap: "5px",
                overflowX: "auto",
              }}
            >
              {tabs.map((tab) => {
                const active =
                  activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    style={{
                      flex: "0 0 auto",
                      background: active
                        ? COLORS.teal
                        : "transparent",
                      border: "none",
                      color: active
                        ? "#fff"
                        : COLORS.muted,
                      padding: "10px 13px",
                      borderRadius: "9px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: active
                        ? "750"
                        : "600",
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {activeTab === "overview" && (
              <Overview analysis={analysisData} />
            )}

            {activeTab === "recommendation" && (
              <Recommendation
                analysis={analysisData}
              />
            )}

            {activeTab === "lenders" && (
              <LenderComparison
                analysis={analysisData}
              />
            )}

            {activeTab === "documents" && (
              <Documents analysis={analysisData} />
            )}

            {activeTab === "schemes" && (
              <GovernmentSchemes analysis={analysisData} />
            )}

            {activeTab === "apply" && (
              <ApplyLoan />
            )}

            {activeTab === "tracker" && (
              <LoanTracker />
            )}

            {activeTab === "calculator" && (
              <EMICalculator />
            )}

            {/* Redo profile */}
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: COLORS.soft,
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  Want to update your loan profile?
                </div>

                <div
                  style={{
                    color: COLORS.muted,
                    fontSize: "11px",
                    marginTop: "3px",
                  }}
                >
                  You can redo the questionnaire whenever
                  your situation changes.
                </div>
              </div>

              <button
                onClick={() => {
                  setShowInterview(true);
                  setError("");
                }}
                style={secondaryButton}
              >
                Redo Loan Profile
              </button>
            </div>

            <div
              style={{
                marginTop: "15px",
                color: "#64748B",
                fontSize: "10px",
                lineHeight: "1.6",
              }}
            >
              Disclaimer: Loan and government-scheme eligibility, interest rates, approval, tenure, subsidy, charges and documentation are determined by the applicable authority/lender under current rules. FinSaathi provides indicative guidance and does not guarantee approval.
            </div>
          </>
        )}

      <FloatingLoanChat />

      {/* Global animation */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 600px) {
          h1 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}