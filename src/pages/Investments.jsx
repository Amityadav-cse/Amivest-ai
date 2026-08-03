import React, { useState, useMemo, useCallback } from "react";

// ============================================================================
// SYSTEM ARCHITECTURE PARAMETERS & REGISTRY (REAL-WORLD SPECIFICATIONS)
// ============================================================================
const CAPITAL_ASSET_REGISTRY = {
  DOMESTIC_EQUITY: {
    ticker: "NIFTY_LM_250",
    label: "Indian Equities (Nifty LargeMidcap 250 Index)",
    baseCagr: 14.2,
    volatilityRisk: "High",
    expenseRatio: "0.58%",
    exitLoad: "1.00% if redeemed < 365 days",
    description: "Primary wealth compounding engine tracking blue-chip and high-velocity midcap Indian enterprises.",
    educationalInsights: "Equities act as your core inflation-beating engine. Over rolling 7+ year horizons, Indian equities have historically outpaced domestic consumer price index (CPI) drag by over 700 basis points. However, they are prone to cyclical drawdowns of 15-30%.",
    fundDetailsLink: "https://www.amfiindia.com/investor-corner/educational-material/mf-basics.html"
  },
  INTERNATIONAL_EQUITY: {
    ticker: "NASDAQ_100_ETF",
    label: "Global Technology (Nasdaq-100 Factor exposure)",
    baseCagr: 11.4,
    volatilityRisk: "High",
    expenseRatio: "0.54%",
    exitLoad: "Nil",
    description: "Geographic diversification hedge providing active exposure to global innovation hubs.",
    educationalInsights: "Provides structural protection against Indian Rupee (INR) depreciation against the USD while allowing cross-border capital exposure to global hyperscalers.",
    fundDetailsLink: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes&cid=1"
  },
  FIXED_INCOME: {
    ticker: "ARBITRAGE_LIQUID",
    label: "Defensive Reserves (Arbitrage & Liquid Debt Funds)",
    baseCagr: 6.9,
    volatilityRisk: "Low",
    expenseRatio: "0.25%",
    exitLoad: "0.0070% dynamic tiered within 7 days, Nil after",
    description: "Low-volatility, tax-efficient market neutrality protecting tactical liquidity.",
    educationalInsights: "Debt and arbitrage reserves do not aim for aggressive capital compounding. Instead, they defend capital from systemic market shocks, satisfying your short-term cash needs and keeping your emergency buffer independent of market volatility.",
    fundDetailsLink: "https://www.amfiindia.com/investor-corner/educational-material/index-funds.html"
  },
  COMMODITIES: {
    ticker: "GOLD_SGB_ETF",
    label: "Sovereign Gold & Physical Precious Metals",
    baseCagr: 8.5,
    volatilityRisk: "Medium",
    expenseRatio: "0.41%",
    exitLoad: "Nil",
    description: "Systemic inflation shield acting as an asset-correlation shock absorber.",
    educationalInsights: "Gold serves as systemic insurance. During heavy global equity sell-offs or geopolitical uncertainty, precious metals act as stores of value, providing balance to a volatile portfolio.",
    fundDetailsLink: "https://www.rbi.org.in/commonman/English/Scripts/FAQs.aspx?Id=1646"
  }
};

const RISK_STRATEGY_MATRIX = {
  Low: {
    label: "Capital Preservation Matrix",
    icon: "🟢",
    allocation: { DOMESTIC_EQUITY: 15, INTERNATIONAL_EQUITY: 5, FIXED_INCOME: 65, COMMODITIES: 15 },
    desc: "Mostly stable investments. Lower growth, lower stress.",
    suitability: "Target horizons < 3 years. Primary mandate is safety of capital with minimal volatility."
  },
  Medium: {
    label: "Dynamic Growth Strategy",
    icon: "🟡",
    allocation: { DOMESTIC_EQUITY: 40, INTERNATIONAL_EQUITY: 15, FIXED_INCOME: 30, COMMODITIES: 15 },
    desc: "A mix of growth and stability. Good default for most people.",
    suitability: "Target horizons 3 to 7 years. Balanced compounding capturing growth while dampening drawdowns."
  },
  High: {
    label: "Alpha Maximization Portfolio",
    icon: "🔴",
    allocation: { DOMESTIC_EQUITY: 55, INTERNATIONAL_EQUITY: 25, FIXED_INCOME: 10, COMMODITIES: 10 },
    desc: "Mostly stocks. Higher long-term potential, bigger short-term swings.",
    suitability: "Target horizons 7+ years. Full exposure to market-cap compounding. High short-term volatility."
  }
};

const DISCOVERY_BROKERS = [
  { provider: "Groww", portalUrl: "https://groww.in/mutual-funds", type: "Direct Mutual Funds & Equity", badge: "Most Popular for SIPs", clearingFee: "An elegant UI optimized for tracking mutual funds with automated auto-pay setup.", rating: "4.6" },
  { provider: "Zerodha Coin", portalUrl: "https://coin.zerodha.com", type: "Direct Mutual Funds (Demat Format)", badge: "Best for Active Traders", clearingFee: "Perfect if you already use Kite. Holds mutual funds cleanly inside your Demat account.", rating: "4.7" },
  { provider: "INDmoney", portalUrl: "https://www.indmoney.com", type: "Unified Neo-Banking & Wealth Suite", badge: "Best for Global Tracking", clearingFee: "Consolidates all your investment accounts and tracks external portfolio holdings smoothly.", rating: "4.5" }
];

// System Theme Design Tokens (Cyber-Grid Dark Mode Archetype)
const THEME = {
  canvas: "#080c14",
  surfaceCard: "#111823",
  surfaceInput: "#05070c",
  borderLight: "#1f2a3a",
  accentTeal: "#00f5d4",
  accentOrange: "#ff4500",
  accentOrangeSoft: "rgba(255, 69, 0, 0.1)",
  textActive: "#ffffff",
  textMuted: "#7a8d9f",
  statusRed: "#ff527b",
  statusGold: "#ffb43a",
  statusGreen: "#00d09c"
};

const inlineStyles = {
  cardLayout: { background: THEME.surfaceCard, border: `1px solid ${THEME.borderLight}`, borderRadius: "16px", padding: "24px" },
  formInput: { width: "100%", background: THEME.surfaceInput, border: `1px solid ${THEME.borderLight}`, borderRadius: "8px", padding: "12px 14px", color: THEME.textActive, fontSize: "14px", outline: "none", boxSizing: "border-box" },
  labelStyle: { color: THEME.textMuted, fontSize: "11px", display: "block", marginBottom: "6px", fontWeight: "700" },
  externalActionAnchor: { display: "inline-flex", alignItems: "center", justifyContent: "center", background: THEME.statusGreen, color: "#000", padding: "12px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", textDecoration: "none", transition: "opacity 0.2s", cursor: "pointer" }
};

// ============================================================================
// COMPUTATIONAL ENGINE CORE (INDIAN MARKET FISCAL MATHEMATICS)
// ============================================================================
function runActuarialForecastEngine(monthlySip, horizonYears, riskProfile, expectedInflation) {
  const allocationProfile = RISK_STRATEGY_MATRIX[riskProfile].allocation;
  
  let compositePortfolioCagr = 0;
  Object.entries(allocationProfile).forEach(([assetKey, percentage]) => {
    compositePortfolioCagr += (percentage / 100) * CAPITAL_ASSET_REGISTRY[assetKey].baseCagr;
  });

  const monthlyReturnRate = compositePortfolioCagr / 12 / 100;
  const monthlyInflationRate = expectedInflation / 12 / 100;
  const investmentDurationMonths = horizonYears * 12;

  let principalDeployed = 0;
  let grossMaturityNominal = 0;
  let purchasingPowerReal = 0;

  for (let month = 1; month <= investmentDurationMonths; month++) {
    principalDeployed += monthlySip;
    grossMaturityNominal = (grossMaturityNominal + monthlySip) * (1 + monthlyReturnRate);
    purchasingPowerReal = (purchasingPowerReal + monthlySip) * (1 + (monthlyReturnRate - monthlyInflationRate));
  }

  const capitalGainsAccrued = Math.max(0, grossMaturityNominal - principalDeployed);
  const statutoryExemptionLimit = 200000;
  const netTaxableGainsBasis = Math.max(0, capitalGainsAccrued - statutoryExemptionLimit);
  
  const calculatedTaxLiability = netTaxableGainsBasis * 0.125;
  const netPostTaxMaturity = grossMaturityNominal - calculatedTaxLiability;

  return {
    allocationProfile,
    blendedPortfolioCagr: compositePortfolioCagr.toFixed(1),
    principalDeployed: Math.round(principalDeployed),
    grossMaturityNominal: Math.round(grossMaturityNominal),
    purchasingPowerReal: Math.round(purchasingPowerReal),
    calculatedTaxLiability: Math.round(calculatedTaxLiability),
    netPostTaxMaturity: Math.round(netPostTaxMaturity)
  };
}

function analyzeFinances(transactions) {
  const income = transactions
    .filter(t => t.amount > 0 || String(t.type).toLowerCase() === "credit")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  const expenses = transactions
    .filter(t => t.amount < 0 || String(t.type).toLowerCase() === "debit")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  const netSavings = income - expenses;
  const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

  const dates = transactions
    .map(t => new Date(t.transaction_date || t.date))
    .filter(d => !isNaN(d));
    
  let monthsSpanned = 1;
  if (dates.length >= 2) {
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    monthsSpanned = Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24 * 30)));
  }

  const avgMonthlyIncome = income / monthsSpanned;
  const avgMonthlyExpenses = expenses / monthsSpanned;
  const avgMonthlySavings = netSavings / monthsSpanned;

  const suggestedMonthlySip = Math.max(0, Math.round((avgMonthlySavings * 0.7) / 500) * 500);

  let suggestedRisk = "Medium";
  let riskReason = "";
  if (savingsRate < 10 || avgMonthlySavings <= 0) {
    suggestedRisk = "Low";
    riskReason = "Your savings margin is thin right now, so we're suggesting a safer capital preservation mix while you build an emergency buffer.";
  } else if (savingsRate >= 30) {
    suggestedRisk = "High";
    riskReason = "You're saving a strong share of your income, which gives your portfolio structural stability to take on aggressive growth investments.";
  } else {
    suggestedRisk = "Medium";
    riskReason = "Your current savings rate perfectly supports a balanced approach — optimization potential without overexposure.";
  }

  return {
    hasData: transactions.length > 0,
    income: Math.round(income),
    expenses: Math.round(expenses),
    netSavings: Math.round(netSavings),
    savingsRate: savingsRate.toFixed(1),
    avgMonthlyIncome: Math.round(avgMonthlyIncome),
    avgMonthlyExpenses: Math.round(avgMonthlyExpenses),
    avgMonthlySavings: Math.round(avgMonthlySavings),
    suggestedMonthlySip,
    suggestedRisk,
    riskReason,
    monthsSpanned,
  };
}

// ============================================================================
// MICRO-COMPONENTS LAYOUT FOR AWARENESS SEGMENT
// ============================================================================
function AllocationBar({ allocation }) {
  const assetColors = [THEME.accentTeal, "#3b82f6", THEME.statusGold, "#a855f7"];
  const items = Object.entries(allocation);
  return (
    <div>
      <div style={{ display: "flex", height: "14px", borderRadius: "99px", overflow: "hidden", marginBottom: "20px", background: THEME.surfaceInput }}>
        {items.map(([key, weight], index) => (
          <div key={key} style={{ width: `${weight}%`, background: assetColors[index % assetColors.length] }} title={`${CAPITAL_ASSET_REGISTRY[key].label}: ${weight}%`} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {items.map(([key, weight], index) => (
          <div key={key} style={{ padding: "16px", background: THEME.surfaceInput, border: `1px solid ${THEME.borderLight}`, borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", color: THEME.textActive, fontWeight: "700" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: assetColors[index % assetColors.length] }} />
                {CAPITAL_ASSET_REGISTRY[key].ticker}
              </span>
              <span style={{ color: THEME.accentTeal, fontWeight: "800", fontSize: "14px" }}>{weight}%</span>
            </div>
            <div style={{ fontSize: "12px", color: THEME.textActive, fontWeight: "600", marginBottom: "4px" }}>{CAPITAL_ASSET_REGISTRY[key].label.split(" (")[0]}</div>
            <p style={{ margin: 0, fontSize: "11.5px", color: THEME.textMuted, lineHeight: 1.5 }}>{CAPITAL_ASSET_REGISTRY[key].description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function YourPlanSection({ transactions, onUsePlan, localizeCurrency }) {
  const analysis = useMemo(() => analyzeFinances(transactions), [transactions]);

  if (!analysis.hasData) {
    return (
      <div style={{ ...inlineStyles.cardLayout, textAlign: "center", padding: "60px 20px" }}>
        <h3 style={{ marginTop: 0, fontSize: "20px" }}>Transactional Ledger Scan Deficit</h3>
        <p style={{ color: THEME.textMuted, maxWidth: "520px", margin: "12px auto 0 auto", fontSize: "14px", lineHeight: "1.6" }}>
          Import your structural bank accounts statement from the core Dashboard. FinSaathi parses your real ledger cashflow metrics to compute exactly how much you can allocate without exhausting daily capital safety.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={inlineStyles.cardLayout}>
        <h3 style={{ marginTop: 0, marginBottom: "4px", fontSize: "16px" }}>Dynamic Cashflow Diagnostics</h3>
        <p style={{ margin: "0 0 20px 0", color: THEME.textMuted, fontSize: "12px" }}>
          Calculated performance metrics over {analysis.monthsSpanned} month{analysis.monthsSpanned > 1 ? "s" : ""} statement logs.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div style={{ background: THEME.surfaceInput, border: `1px solid ${THEME.borderLight}`, borderRadius: "10px", padding: "16px" }}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "700" }}>AVG. MONTHLY INFLOW</div>
            <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "6px" }}>{localizeCurrency(analysis.avgMonthlyIncome)}</div>
          </div>
          <div style={{ background: THEME.surfaceInput, border: `1px solid ${THEME.borderLight}`, borderRadius: "10px", padding: "16px" }}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "700" }}>AVG. MONTHLY EXPENSES</div>
            <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "6px" }}>{localizeCurrency(analysis.avgMonthlyExpenses)}</div>
          </div>
          <div style={{ background: "rgba(0, 208, 156, 0.05)", border: `1px solid ${THEME.statusGreen}`, borderRadius: "10px", padding: "16px" }}>
            <div style={{ color: THEME.statusGreen, fontSize: "11px", fontWeight: "700" }}>SURPLUS CASH FLOW AVAILABLE</div>
            <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "6px", color: THEME.statusGreen }}>{localizeCurrency(analysis.avgMonthlySavings)}</div>
          </div>
          <div style={{ background: THEME.surfaceInput, border: `1px solid ${THEME.borderLight}`, borderRadius: "10px", padding: "16px" }}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "700" }}>NET ACCOUNT EFFICIENCY SAVINGS RATE</div>
            <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "6px", color: THEME.accentTeal }}>{analysis.savingsRate}%</div>
          </div>
        </div>
      </div>

      <div style={{ ...inlineStyles.cardLayout, borderColor: THEME.accentOrange }}>
        <h3 style={{ marginTop: 0, marginBottom: "8px", fontSize: "16px", color: THEME.accentOrange }}>Engine Optimization Matrix Suggestion</h3>
        {analysis.suggestedMonthlySip <= 0 ? (
          <p style={{ color: THEME.textMuted, lineHeight: 1.6, margin: 0, fontSize: "13.5px" }}>
            Diagnostics indicate that your current operational expenditure matches or outpaces incoming cashflow channels. Prioritize establishing a fixed emergency shield (targeting ₹1,000 - ₹2,000 monthly) before unlocking high-volatility capital deployments.
          </p>
        ) : (
          <>
            <p style={{ color: THEME.textMuted, lineHeight: 1.6, margin: "0 0 12px 0", fontSize: "14px" }}>
              Your verified monthly capital surplus sits at <strong style={{ color: THEME.textActive }}>{localizeCurrency(analysis.avgMonthlySavings)}</strong>. The optimization engine recommends configuring a recurring monthly allocation routing of <strong style={{ color: THEME.accentTeal }}>{localizeCurrency(analysis.suggestedMonthlySip)}</strong>, leaving remaining cash reserves highly liquid. The calculated risk profile recommended for your position is the <strong style={{ color: THEME.statusGold }}>{RISK_STRATEGY_MATRIX[analysis.suggestedRisk].label}</strong>.
            </p>
            <p style={{ color: THEME.textMuted, fontSize: "12.5px", lineHeight: 1.6, margin: "0 0 20px 0", paddingLeft: "12px", borderLeft: `2px solid ${THEME.accentTeal}` }}>
              {analysis.riskReason}
            </p>
            <button
              onClick={() => onUsePlan(analysis.suggestedMonthlySip, analysis.suggestedRisk)}
              style={{ background: THEME.accentOrange, color: "#fff", border: "none", padding: "12px 22px", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
            >
              Sync Profile Parameters into Portfolio Simulator →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function BasicsSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        {Object.entries(CAPITAL_ASSET_REGISTRY).map(([key, asset]) => (
          <div key={key} style={inlineStyles.cardLayout}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: "800", color: THEME.accentTeal, letterSpacing: "0.05em" }}>{asset.ticker} CLASS INDEX</span>
              <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.03)", padding: "4px 8px", borderRadius: "4px", fontWeight: "600" }}>Expected CAGR: {asset.baseCagr}%</span>
            </div>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: THEME.textActive }}>{asset.label}</h3>
            <p style={{ margin: "0 0 16px 0", color: THEME.textMuted, fontSize: "13px", lineHeight: "1.6" }}>{asset.educationalInsights}</p>
            <a href={asset.fundDetailsLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: THEME.statusGreen, textDecoration: "none", fontWeight: "700", display: "inline-block", borderTop: `1px solid ${THEME.borderLight}`, paddingTop: "12px", width: "100%" }}>
              Read Official AMFI Compliance Directives →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN INTEGRATED CONTAINER ROUTER
// ============================================================================
export default function IntegratedWealthDashboard({ transactions = [] }) {
  const [navigationTab, setNavigationTab] = useState("plan");
  
  // Simulator State Machine parameters
  const [calculatorSip, setCalculatorSip] = useState(10000);
  const [calculatorHorizon, setCalculatorHorizon] = useState(10);
  const [calculatorRisk, setCalculatorRisk] = useState("Medium");
  const [calculatorInflation, setCalculatorInflation] = useState(5.5);

  const forecastResults = useMemo(() => {
    const safeSip = Math.max(500, calculatorSip);
    const safeHorizon = Math.max(1, Math.min(40, calculatorHorizon));
    return runActuarialForecastEngine(safeSip, safeHorizon, calculatorRisk, calculatorInflation);
  }, [calculatorSip, calculatorHorizon, calculatorRisk, calculatorInflation]);

  const currencyIndianFormatter = useCallback((val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  }, []);

  const triggerPlanSyncPipeline = (sip, risk) => {
    setCalculatorSip(sip);
    setCalculatorRisk(risk);
    setNavigationTab("calculate");
  };

  const menuTabs = [
    { id: "plan", label: "📋 Your Strategic Plan" },
    { id: "learn", label: "📚 Asset Class Awareness" },
    { id: "calculate", label: "📊 Actuarial Calculator" },
    { id: "start", label: "🚀 Groww Execution Nodes" },
  ];

  return (
    <div style={{ background: THEME.canvas, color: THEME.textActive, fontFamily: "system-ui, sans-serif", minHeight: "100vh", padding: "40px 16px" }}>
      <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
        
        {/* Module Master Banner Branding */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `1px solid ${THEME.borderLight}`, paddingBottom: "24px", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ color: THEME.statusGreen, fontSize: "11px", fontWeight: "800", letterSpacing: "0.15em", marginBottom: "6px" }}>FINSAATHI COMPREHENSIVE SUITE</div>
            <h1 style={{ margin: 0, fontSize: "30px", fontWeight: "900", letterSpacing: "-0.03em" }}>Unified Wealth Management Architecture</h1>
          </div>
          
          {/* Main Context Navigation Pipeline */}
          <div style={{ display: "flex", background: THEME.surfaceCard, padding: "4px", borderRadius: "10px", border: `1px solid ${THEME.borderLight}`, flexWrap: "wrap" }}>
            {menuTabs.map((tabItem) => (
              <button
                key={tabItem.id}
                onClick={() => setNavigationTab(tabItem.id)}
                style={{
                  border: "none",
                  background: navigationTab === tabItem.id ? "rgba(0, 208, 156, 0.12)" : "transparent",
                  color: navigationTab === tabItem.id ? THEME.statusGreen : THEME.textMuted,
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {tabItem.label}
              </button>
            ))}
          </div>
        </div>

        {/* ACTIVE CONDITIONAL INTERFACE LAYOUT ROUTER */}
        {navigationTab === "plan" && (
          <YourPlanSection transactions={transactions} onUsePlan={triggerPlanSyncPipeline} localizeCurrency={currencyIndianFormatter} />
        )}

        {navigationTab === "learn" && <BasicsSection />}

        {navigationTab === "calculate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Actuarial Calculator Form Dashboard */}
            <div style={inlineStyles.cardLayout}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>Plan Dynamic Monthly Capital Distribution</h3>
              <p style={{ margin: "0 0 20px 0", color: THEME.textMuted, fontSize: "13px" }}>
                Adjust system constants to update target allocation structures across risk horizons instantly.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                <div>
                  <label style={inlineStyles.labelStyle}>MONTHLY ALLOCATION VALUE (₹)</label>
                  <input type="number" step="1000" min="500" value={calculatorSip} onChange={(e) => setCalculatorSip(Number(e.target.value) || 0)} style={inlineStyles.formInput} />
                </div>
                <div>
                  <label style={inlineStyles.labelStyle}>COMPOUNDING RUN PERIOD (YEARS)</label>
                  <input type="number" min="1" max="40" value={calculatorHorizon} onChange={(e) => setCalculatorHorizon(Number(e.target.value) || 0)} style={inlineStyles.formInput} />
                </div>
                <div>
                  <label style={inlineStyles.labelStyle}>SYSTEMIC VARIANCE COMFORT LAYER</label>
                  <select value={calculatorRisk} onChange={(e) => setCalculatorRisk(e.target.value)} style={inlineStyles.formInput}>
                    <option value="Low">Conservative Matrix</option>
                    <option value="Medium">Balanced Risk Allocations</option>
                    <option value="High">Aggressive Alpha Growth Engine</option>
                  </select>
                </div>
                <div>
                  <label style={inlineStyles.labelStyle}>INFLATION EROSION EXPECTATION (%)</label>
                  <input type="number" step="0.1" value={calculatorInflation} onChange={(e) => setCalculatorInflation(Number(e.target.value) || 0)} style={inlineStyles.formInput} />
                </div>
              </div>
              <div style={{ marginTop: "16px", fontSize: "12.5px", color: THEME.accentTeal, background: "rgba(0, 245, 212, 0.03)", padding: "12px", borderRadius: "6px" }}>
                <strong>Dynamic Suite Mode Vector:</strong> {RISK_STRATEGY_MATRIX[calculatorRisk].suitability}
              </div>
            </div>

            {/* Visual Dynamic Asset Allocation Engine Mapping output */}
            <div style={inlineStyles.cardLayout}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "16px" }}>Target Asset Split Breakdown</h3>
                <span style={{ fontSize: "12px", color: THEME.accentTeal, fontWeight: "700", padding: "4px 10px", background: "rgba(0, 245, 212, 0.05)", borderRadius: "6px" }}>
                  ~{forecastResults.blendedPortfolioCagr}% Blended Annual Portfolio Yield Matrix
                </span>
              </div>
              <AllocationBar allocation={forecastResults.allocationProfile} />
            </div>

            {/* Data Math Output Grid Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "20px" }}>
              <div style={inlineStyles.cardLayout}>
                <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "700" }}>TOTAL SCHEDULER DEPLOYMENT</div>
                <div style={{ fontSize: "24px", fontWeight: "800", marginTop: "6px" }}>{currencyIndianFormatter(forecastResults.principalDeployed)}</div>
              </div>
              <div style={inlineStyles.cardLayout}>
                <div style={{ color: THEME.statusGreen, fontSize: "11px", fontWeight: "700" }}>ESTIMATED ASSET FUTURE NOMINAL VALUE</div>
                <div style={{ fontSize: "24px", fontWeight: "800", marginTop: "6px", color: THEME.statusGreen }}>{currencyIndianFormatter(forecastResults.grossMaturityNominal)}</div>
              </div>
              <div style={inlineStyles.cardLayout}>
                <div style={{ color: THEME.statusGold, fontSize: "11px", fontWeight: "700" }}>INFLATION DEFLATED PURCHASING POWER</div>
                <div style={{ fontSize: "24px", fontWeight: "800", marginTop: "6px", color: THEME.statusGold }}>{currencyIndianFormatter(forecastResults.purchasingPowerReal)}</div>
                <div style={{ fontSize: "11px", color: THEME.textMuted, marginTop: "4px" }}>Equates to absolute purchasing capacity today</div>
              </div>
              <div style={inlineStyles.cardLayout}>
                <div style={{ color: THEME.statusRed, fontSize: "11px", fontWeight: "700" }}>ESTIMATED REGULATORY FISCAL TAX SLIPPAGE (LTCG)</div>
                <div style={{ fontSize: "24px", fontWeight: "800", marginTop: "6px", color: THEME.statusRed }}>{currencyIndianFormatter(forecastResults.calculatedTaxLiability)}</div>
                <div style={{ fontSize: "11px", color: THEME.textMuted, marginTop: "4px" }}>Computed applying the standard 12.5% taxation layout parameters</div>
              </div>
            </div>
          </div>
        )}

        {navigationTab === "start" && (
          /* HIGH FIDELITY BROKER MUTUAL FUNDS ACTIVE CHANNEL ROUTER */
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <div style={inlineStyles.cardLayout}>
              <h3 style={{ marginTop: 0, fontSize: "18px" }}>SEBI Regulated Execution Endpoints</h3>
              <p style={{ color: THEME.textMuted, fontSize: "13.5px", marginBottom: "24px" }}>
                Deploy your system-calculated targets by routing orders directly through verified clearing systems or Asset Management Company (AMC) platforms.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "32px" }}>
                {Object.entries(forecastResults.allocationProfile).map(([key, pct]) => {
                  if (pct === 0) return null;
                  const currentAsset = CAPITAL_ASSET_REGISTRY[key];
                  const operationalCashSplit = Math.round((pct / 100) * calculatorSip);

                  return (
                    <div key={key} style={{ background: THEME.surfaceInput, border: `1px solid ${THEME.borderLight}`, borderRadius: "12px", padding: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: `1px solid ${THEME.borderLight}`, paddingBottom: "14px", marginBottom: "16px" }}>
                        <div>
                          <span style={{ fontSize: "10px", fontWeight: "800", color: THEME.statusGreen, background: "rgba(0, 208, 156, 0.06)", padding: "3px 8px", borderRadius: "4px" }}>DIRECT PORTFOLIO DEPLOYMENT TIER</span>
                          <h4 style={{ margin: "6px 0 2px 0", fontSize: "16px", color: THEME.textActive }}>{currentAsset.label}</h4>
                          <span style={{ fontSize: "12px", color: THEME.textMuted }}>Allocation Target Core: <strong>{currentAsset.ticker}</strong></span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "11px", color: THEME.textMuted, display: "block" }}>MONTHLY ALLOCATED FLOW VALUE</span>
                          <span style={{ fontSize: "22px", fontWeight: "900", color: THEME.statusGreen }}>{currencyIndianFormatter(operationalCashSplit)}<span style={{ fontSize: "13px", fontWeight: "400", color: THEME.textMuted }}> / mo</span></span>
                        </div>
                      </div>

                      {/* Technical specifications dashboard layout matching active platforms */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                        <div>
                          <span style={{ color: THEME.textMuted, fontSize: "11px", display: "block" }}>EXPENSE RATIO TIER</span>
                          <span style={{ color: THEME.textActive, fontSize: "13px", fontWeight: "700" }}>{currentAsset.expenseRatio}</span>
                        </div>
                        <div>
                          <span style={{ color: THEME.textMuted, fontSize: "11px", display: "block" }}>EXIT LOAD CONDITIONS</span>
                          <span style={{ color: THEME.textActive, fontSize: "13px", fontWeight: "700" }}>{currentAsset.exitLoad}</span>
                        </div>
                        <div>
                          <span style={{ color: THEME.textMuted, fontSize: "11px", display: "block" }}>VOLATILITY DYNAMICS TIER</span>
                          <span style={{ color: currentAsset.volatilityRisk === "High" ? THEME.statusRed : THEME.statusGreen, fontSize: "13px", fontWeight: "700" }}>{currentAsset.volatilityRisk} Risk Vector</span>
                        </div>
                        <div>
                          <span style={{ color: THEME.textMuted, fontSize: "11px", display: "block" }}>HISTORICAL MODEL SPEED</span>
                          <span style={{ color: THEME.textActive, fontSize: "13px", fontWeight: "700" }}>{currentAsset.baseCagr}% CAGR Benchmark</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "rgba(255,255,255,0.01)", padding: "12px 16px", borderRadius: "8px" }}>
                        <span style={{ fontSize: "12px", color: THEME.textMuted }}>Initiate programmatic investment structures across direct discount clearing portals:</span>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {DISCOVERY_BROKERS.map(broker => (
                            <a 
                              key={broker.provider} 
                              href={broker.portalUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ ...inlineStyles.externalActionAnchor, background: "transparent", border: `1px solid ${THEME.borderLight}`, color: THEME.textActive, padding: "8px 14px", fontSize: "12px" }}
                            >
                              Route Order via {broker.provider}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Main General Hub Broker Directory Card Panels */}
              <div style={{ borderTop: `1px solid ${THEME.borderLight}`, paddingTop: "24px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", color: THEME.textActive }}>Primary Direct Broker Ecosystem Clearing Connections</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                  {DISCOVERY_BROKERS.map((broker) => (
                    <div key={broker.provider} style={{ background: THEME.surfaceInput, border: `1px solid ${THEME.borderLight}`, borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "16px", fontWeight: "800", color: THEME.textActive }}>{broker.provider} Application</span>
                          <span style={{ background: "rgba(0, 208, 156, 0.08)", color: THEME.statusGreen, padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "700" }}>★ {broker.rating}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: THEME.textMuted, marginBottom: "4px" }}>Framework Classification: <strong>{broker.badge}</strong></div>
                        <p style={{ fontSize: "12.5px", color: THEME.textMuted, margin: "0 0 20px 0", lineHeight: "1.5" }}>{broker.clearingFee}</p>
                      </div>
                      <a href={broker.portalUrl} target="_blank" rel="noopener noreferrer" style={inlineStyles.externalActionAnchor}>
                        Initialize Allocation Connection Engine →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}