import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const CATEGORY_ICONS = {
  food: "🍽️",
  shopping: "🛍️",
  travel: "🚕",
  transport: "🚌",
  health: "❤️",
  education: "📚",
  rent: "🏠",
  bills: "🧾",
  salary: "💼",
  business: "🏪",
  investment: "📈",
  savings: "🎯",
  other: "◈",
};

function Dashboard({ transactions, setTransactions }) {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const sessionResponse = await fetch(`${API_URL}/session`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok || !sessionData.authenticated) {
          if (mounted) {
            setCurrentUser(null);
            setTransactions([]);
          }
          return;
        }

        const user = sessionData.user;

        if (mounted) {
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
        }

        const transactionResponse = await fetch(`${API_URL}/transactions`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const transactionData = await transactionResponse.json();

        if (!transactionResponse.ok) {
          throw new Error(
            transactionData.error ||
              transactionData.message ||
              `Server returned ${transactionResponse.status}`
          );
        }

        if (mounted) {
          setTransactions(
            Array.isArray(transactionData.transactions)
              ? transactionData.transactions
              : []
          );
        }
      } catch (err) {
        console.error("DASHBOARD ERROR:", err);

        if (mounted) {
          setError(
            err.message || "Unable to load your financial dashboard."
          );
          setTransactions([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          requestAnimationFrame(() => setAnimateIn(true));
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [setTransactions]);

  const normalizedTransactions = useMemo(() => {
    return (Array.isArray(transactions) ? transactions : []).map((t) => {
      const amount = Number(t.amount || 0);
      const type = String(t.type || "").toLowerCase();

      const isCredit =
        amount > 0 ||
        type === "credit" ||
        type === "cr" ||
        type === "income";

      return {
        ...t,
        numericAmount: Math.abs(amount),
        isCredit,
        date:
          t.transaction_date ||
          t.date ||
          t.created_at ||
          "N/A",
        description: t.description || "Bank Transaction",
        category: t.category || "General",
      };
    });
  }, [transactions]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!currentUser) {
    return (
      <div className="av-auth-shell">
        <style>{globalStyles}</style>
        <div className="av-auth-card">
          <div className="av-auth-icon">🔐</div>
          <div className="av-eyebrow">AMIVEST SECURITY</div>
          <h2>Sign in to continue</h2>
          <p>Your private financial dashboard is protected by your account session.</p>
          <button
            className="av-primary-button"
            onClick={() => navigate("/login")}
          >
            Go to Login
            <span>→</span>
          </button>
        </div>
      </div>
    );
  }

  const totalIncome = normalizedTransactions
    .filter((t) => t.isCredit)
    .reduce((sum, t) => sum + t.numericAmount, 0);

  const totalExpenses = normalizedTransactions
    .filter((t) => !t.isCredit)
    .reduce((sum, t) => sum + t.numericAmount, 0);

  const netSavings = totalIncome - totalExpenses;

  const savingsRate =
    totalIncome > 0
      ? Math.max(0, Math.min(100, (netSavings / totalIncome) * 100))
      : 0;

  const incomeCount = normalizedTransactions.filter((t) => t.isCredit).length;
  const expenseCount = normalizedTransactions.filter((t) => !t.isCredit).length;

  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const monthlyIncome = normalizedTransactions
    .filter((t) => {
      const dateText = String(t.date);
      return t.isCredit && dateText.slice(0, 7) === currentMonthKey;
    })
    .reduce((sum, t) => sum + t.numericAmount, 0);

  const monthlyExpenses = normalizedTransactions
    .filter((t) => {
      const dateText = String(t.date);
      return !t.isCredit && dateText.slice(0, 7) === currentMonthKey;
    })
    .reduce((sum, t) => sum + t.numericAmount, 0);

  const monthlyNet = monthlyIncome - monthlyExpenses;

  const financialHealth = calculateHealthScore({
    savingsRate,
    expenseCount,
    incomeCount,
    netSavings,
  });

  const categoryBreakdown = buildCategoryBreakdown(normalizedTransactions);
  const topCategories = categoryBreakdown.slice(0, 5);

  const maxCategoryAmount =
    topCategories.length > 0
      ? Math.max(...topCategories.map((item) => item.amount))
      : 1;

  const recentTransactions = [...normalizedTransactions]
    .reverse()
    .slice(0, 7);

  const userName =
    currentUser.name ||
    currentUser.full_name ||
    currentUser.email?.split("@")[0] ||
    "there";

  const firstName =
    String(userName).trim().split(/\s+/)[0] || "there";

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
      ? "Good afternoon"
      : "Good evening";

  const attentionMessage =
    netSavings < 0
      ? "Your outflows are currently higher than your recorded inflows."
      : savingsRate >= 30
      ? "Your current saving pace looks strong. Keep protecting that surplus."
      : "You are building a positive financial buffer. A little more consistency can strengthen it.";

  const handleQuickAction = (path) => {
    navigate(path);
  };

  return (
    <div className={`av-dashboard ${animateIn ? "av-entered" : ""}`}>
      <style>{globalStyles}</style>

      <div className="av-orb av-orb-one"></div>
      <div className="av-orb av-orb-two"></div>
      <div className="av-grid"></div>

      <div className="av-content">
        <header className="av-header">
          <div className="av-brand-block">
            <div className="av-brand-mark">
              <span>A</span>
            </div>
            <div>
              <div className="av-brand-name">AmiVest</div>
              <div className="av-brand-caption">AI financial guardian</div>
            </div>
          </div>

          <div className="av-header-actions">
            <button
              className="av-icon-button"
              title="AI Talk"
              onClick={() => handleQuickAction("/chat")}
            >
              ✦
            </button>

            <button
              className="av-icon-button"
              title="Notifications"
              onClick={() => handleQuickAction("/notifications")}
            >
              ♧
            </button>

            <div className="av-user-chip">
              <div className="av-user-avatar">
                {String(firstName).charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{firstName}</strong>
                <span>Active account</span>
              </div>
            </div>
          </div>
        </header>

        <section className="av-hero">
          <div className="av-hero-copy">
            <div className="av-eyebrow av-eyebrow-light">
              PERSONAL FINANCE COMMAND CENTER
            </div>

            <h1>
              {greeting}, <span>{firstName}.</span>
            </h1>

            <p>
              Here's your financial picture today — money in, money out,
              progress, and what deserves your attention next.
            </p>

            <div className="av-hero-actions">
              <button
                className="av-hero-button"
                onClick={() => handleQuickAction("/chat")}
              >
                Ask AmiVest
                <span>✦</span>
              </button>

              <button
                className="av-ghost-button"
                onClick={() => handleQuickAction("/import")}
              >
                Import statement
                <span>↗</span>
              </button>
            </div>
          </div>

          <div className="av-ai-card">
            <div className="av-ai-top">
              <div className="av-ai-orb">
                <span>✦</span>
              </div>

              <div>
                <div className="av-ai-label">AMIVEST AI</div>
                <strong>Today's insight</strong>
              </div>

              <span className="av-ai-live">LIVE</span>
            </div>

            <div className="av-ai-message">
              {attentionMessage}
            </div>

            <button
              className="av-ai-link"
              onClick={() => handleQuickAction("/chat")}
            >
              Ask what to do next
              <span>→</span>
            </button>
          </div>
        </section>

        {error && (
          <div className="av-error">
            <span>!</span>
            <div>
              <strong>Dashboard warning</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        <section className="av-metrics">
          <MetricCard
            eyebrow="RECORDED INFLOWS"
            title="Total income"
            value={`₹${money(totalIncome)}`}
            meta={`${incomeCount} incoming records`}
            icon="↗"
            tone="income"
            delay="0ms"
          />

          <MetricCard
            eyebrow="RECORDED OUTFLOWS"
            title="Total expenses"
            value={`₹${money(totalExpenses)}`}
            meta={`${expenseCount} outgoing records`}
            icon="↘"
            tone="expense"
            delay="70ms"
          />

          <MetricCard
            eyebrow="NET POSITION"
            title="Net savings"
            value={`₹${money(netSavings)}`}
            meta={
              netSavings >= 0
                ? `${savingsRate.toFixed(1)}% of income retained`
                : "Current position needs attention"
            }
            icon="✦"
            tone={netSavings >= 0 ? "savings" : "risk"}
            delay="140ms"
          />

          <MetricCard
            eyebrow="THIS MONTH"
            title="Monthly surplus"
            value={`₹${money(monthlyNet)}`}
            meta={`₹${money(monthlyIncome)} in · ₹${money(
              monthlyExpenses
            )} out`}
            icon="◫"
            tone="monthly"
            delay="210ms"
          />
        </section>

        <section className="av-main-grid">
          <div className="av-panel av-health-panel">
            <PanelHeading
              eyebrow="FINANCIAL HEALTH"
              title="Your money pulse"
              subtitle="A simple signal built from the activity currently recorded in your account."
            />

            <div className="av-health-layout">
              <div className="av-health-ring">
                <div
                  className="av-health-ring-progress"
                  style={{
                    background: `conic-gradient(#0fa879 0 ${financialHealth}%, #dfeee9 ${financialHealth}% 100%)`,
                  }}
                >
                  <div className="av-health-ring-inner">
                    <strong>{financialHealth}</strong>
                    <span>/ 100</span>
                  </div>
                </div>
              </div>

              <div className="av-health-copy">
                <div className="av-health-state">
                  {financialHealth >= 75
                    ? "Healthy position"
                    : financialHealth >= 55
                    ? "Building stability"
                    : "Needs attention"}
                </div>

                <p>
                  Your dashboard shows a{" "}
                  <strong>{savingsRate.toFixed(1)}%</strong> recorded savings
                  rate across the loaded transactions.
                </p>

                <div className="av-health-bars">
                  <HealthBar
                    label="Saving discipline"
                    value={Math.round(savingsRate)}
                  />
                  <HealthBar
                    label="Positive cash position"
                    value={netSavings >= 0 ? 82 : 28}
                  />
                  <HealthBar
                    label="Activity consistency"
                    value={
                      normalizedTransactions.length > 12
                        ? 88
                        : normalizedTransactions.length > 5
                        ? 68
                        : 42
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="av-panel av-action-panel">
            <PanelHeading
              eyebrow="NEXT ACTIONS"
              title="What should you do?"
              subtitle="Jump directly into the part of AmiVest you need."
            />

            <div className="av-actions-list">
              <ActionCard
                icon="✦"
                title="Ask AmiVest AI"
                text="Understand your spending or decide your next move."
                onClick={() => handleQuickAction("/chat")}
              />

              <ActionCard
                icon="🎯"
                title="Review your goals"
                text="Check progress and stay aligned with what matters."
                onClick={() => handleQuickAction("/goals")}
              />

              <ActionCard
                icon="🏦"
                title="Check loans"
                text="Review active borrowing and repayment information."
                onClick={() => handleQuickAction("/loans")}
              />

              <ActionCard
                icon="🏪"
                title="Explore AmiBusiness"
                text="Evaluate a business idea and location."
                onClick={() => handleQuickAction("/business")}
              />
            </div>
          </div>
        </section>

        <section className="av-lower-grid">
          <div className="av-panel av-chart-panel">
            <div className="av-panel-heading-row">
              <PanelHeading
                eyebrow="SPENDING PROFILE"
                title="Where your money is moving"
                subtitle="Your highest recorded expense categories."
              />

              <button
                className="av-small-link"
                onClick={() => setActiveView(activeView === "overview" ? "details" : "overview")}
              >
                {activeView === "overview" ? "View details" : "Collapse"}
                <span>→</span>
              </button>
            </div>

            {topCategories.length === 0 ? (
              <EmptyState
                icon="◌"
                title="No spending data yet"
                text="Your category breakdown will appear after transactions are available."
              />
            ) : (
              <div className="av-category-list">
                {topCategories.map((item, index) => {
                  const percent =
                    maxCategoryAmount > 0
                      ? (item.amount / maxCategoryAmount) * 100
                      : 0;

                  return (
                    <div className="av-category-row" key={item.category}>
                      <div className="av-category-icon">
                        {CATEGORY_ICONS[String(item.category).toLowerCase()] ||
                          "◈"}
                      </div>

                      <div className="av-category-main">
                        <div className="av-category-top">
                          <strong>{item.category}</strong>
                          <span>₹{money(item.amount)}</span>
                        </div>

                        <div className="av-bar">
                          <div
                            className="av-bar-fill"
                            style={{
                              width: `${Math.max(
                                5,
                                Math.min(100, percent)
                              )}%`,
                              animationDelay: `${index * 80}ms`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeView === "details" && (
              <div className="av-breakdown-note">
                <strong>Reading this view</strong>
                <p>
                  These values are calculated from the transactions currently
                  loaded for your authenticated account. AmiVest does not
                  invent missing categories or balances.
                </p>
              </div>
            )}
          </div>

          <div className="av-panel av-journey-panel">
            <div className="av-eyebrow">AMIVEST JOURNEY</div>
            <h2>Your financial world</h2>
            <p>
              One platform for money management, borrowing, goals, business,
              space and AI guidance.
            </p>

            <div className="av-journey-grid">
              <JourneyCard
                icon="💰"
                label="Finance"
                text="Track money"
                onClick={() => handleQuickAction("/dashboard")}
              />
              <JourneyCard
                icon="🏦"
                label="Loans"
                text="Borrow smarter"
                onClick={() => handleQuickAction("/loans")}
              />
              <JourneyCard
                icon="🎯"
                label="Goals"
                text="Stay on track"
                onClick={() => handleQuickAction("/goals")}
              />
              <JourneyCard
                icon="🏪"
                label="AmiBusiness"
                text="Test an idea"
                onClick={() => handleQuickAction("/business")}
              />
              <JourneyCard
                icon="🏠"
                label="AmiSpace"
                text="Find a place"
                onClick={() => handleQuickAction("/rent")}
              />
              <JourneyCard
                icon="🗣️"
                label="AI Talk"
                text="Talk to AmiVest"
                onClick={() => handleQuickAction("/chat")}
              />
            </div>
          </div>
        </section>

        <section className="av-panel av-transactions-panel">
          <div className="av-panel-heading-row">
            <PanelHeading
              eyebrow="RECENT ACTIVITY"
              title="Your latest transactions"
              subtitle="A clean view of the most recent money movement."
            />

            <button
              className="av-small-link"
              onClick={() => handleQuickAction("/transactions")}
            >
              View all
              <span>→</span>
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState
              icon="📊"
              title="Your transaction history is empty"
              text="Import a statement or add activity to start building your financial picture."
              buttonText="Import statement"
              onClick={() => handleQuickAction("/import")}
            />
          ) : (
            <div className="av-table">
              <div className="av-table-head">
                <span>TRANSACTION</span>
                <span>CATEGORY</span>
                <span>DATE</span>
                <span className="right">AMOUNT</span>
              </div>

              {recentTransactions.map((transaction, index) => (
                <div className="av-table-row" key={transaction.id || index}>
                  <div className="av-transaction-cell">
                    <div
                      className={`av-transaction-icon ${
                        transaction.isCredit ? "credit" : "debit"
                      }`}
                    >
                      {transaction.isCredit ? "↗" : "↘"}
                    </div>

                    <div>
                      <strong>{transaction.description}</strong>
                      <span>
                        {transaction.isCredit ? "Money received" : "Money spent"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="av-category-pill">
                      {transaction.category}
                    </span>
                  </div>

                  <div className="av-date">
                    {formatDate(transaction.date)}
                  </div>

                  <div
                    className={`av-amount ${
                      transaction.isCredit ? "credit" : "debit"
                    }`}
                  >
                    {transaction.isCredit ? "+" : "-"}₹
                    {money(transaction.numericAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="av-footer">
          <div>
            <strong>AmiVest</strong> · Your financial command center
          </div>
          <div>
            Data shown here comes from your authenticated account session.
          </div>
        </footer>
      </div>
    </div>
  );
}

function MetricCard({ eyebrow, title, value, meta, icon, tone, delay }) {
  return (
    <div
      className={`av-metric-card ${tone}`}
      style={{ animationDelay: delay }}
    >
      <div className="av-metric-top">
        <div>
          <div className="av-metric-eyebrow">{eyebrow}</div>
          <div className="av-metric-title">{title}</div>
        </div>

        <div className="av-metric-icon">{icon}</div>
      </div>

      <div className="av-metric-value">{value}</div>
      <div className="av-metric-meta">{meta}</div>
    </div>
  );
}

function PanelHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="av-panel-heading">
      <div className="av-eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function HealthBar({ label, value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="av-health-row">
      <div className="av-health-row-top">
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="av-health-track">
        <div
          className="av-health-fill"
          style={{ width: `${safeValue}%` }}
        ></div>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, text, onClick }) {
  return (
    <button className="av-action-card" onClick={onClick}>
      <div className="av-action-icon">{icon}</div>
      <div className="av-action-copy">
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <div className="av-action-arrow">→</div>
    </button>
  );
}

function JourneyCard({ icon, label, text, onClick }) {
  return (
    <button className="av-journey-card" onClick={onClick}>
      <div className="av-journey-icon">{icon}</div>
      <strong>{label}</strong>
      <span>{text}</span>
    </button>
  );
}

function EmptyState({ icon, title, text, buttonText, onClick }) {
  return (
    <div className="av-empty">
      <div className="av-empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {buttonText && onClick && (
        <button className="av-secondary-button" onClick={onClick}>
          {buttonText} →
        </button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="av-dashboard">
      <style>{globalStyles}</style>
      <div className="av-content av-skeleton-shell">
        <div className="av-skeleton skeleton-wide"></div>
        <div className="av-skeleton skeleton-hero"></div>
        <div className="av-skeleton-row">
          <div className="av-skeleton"></div>
          <div className="av-skeleton"></div>
          <div className="av-skeleton"></div>
          <div className="av-skeleton"></div>
        </div>
        <div className="av-skeleton-row large">
          <div className="av-skeleton"></div>
          <div className="av-skeleton"></div>
        </div>
      </div>
    </div>
  );
}

function buildCategoryBreakdown(items) {
  const totals = {};

  items
    .filter((item) => !item.isCredit)
    .forEach((item) => {
      const key = item.category || "General";
      totals[key] = (totals[key] || 0) + item.numericAmount;
    });

  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function calculateHealthScore({
  savingsRate,
  expenseCount,
  incomeCount,
  netSavings,
}) {
  const savingsComponent = Math.max(0, Math.min(60, savingsRate * 1.4));
  const activityComponent =
    incomeCount + expenseCount >= 10
      ? 20
      : incomeCount + expenseCount >= 5
      ? 14
      : incomeCount + expenseCount > 0
      ? 8
      : 0;

  const positionComponent = netSavings >= 0 ? 20 : 5;

  return Math.round(
    Math.max(15, Math.min(100, savingsComponent + activityComponent + positionComponent))
  );
}

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value || value === "N/A") return "N/A";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 16);
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const globalStyles = `
* {
  box-sizing: border-box;
}

@keyframes avFadeUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes avSoftFloat {
  0%, 100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(-18px, 14px, 0) scale(1.04);
  }
}

@keyframes avSoftFloat2 {
  0%, 100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(20px, -12px, 0);
  }
}

@keyframes avPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(15, 168, 121, .12);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(15, 168, 121, 0);
  }
}

@keyframes avBarGrow {
  from {
    transform: scaleX(0);
    transform-origin: left;
  }
  to {
    transform: scaleX(1);
    transform-origin: left;
  }
}

@keyframes avSkeleton {
  0% {
    background-position: -600px 0;
  }
  100% {
    background-position: 600px 0;
  }
}

.av-dashboard {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  padding: 24px 0 60px;
  background:
    radial-gradient(circle at 86% 2%, rgba(22, 176, 132, .10), transparent 24%),
    linear-gradient(180deg, #f8fcfa 0%, #f1f7f5 100%);
  color: #10272e;
}

.av-orb {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(12px);
  z-index: 0;
}

.av-orb-one {
  width: 430px;
  height: 430px;
  top: -230px;
  right: -180px;
  background: radial-gradient(circle, rgba(15, 168, 121, .15), transparent 69%);
  animation: avSoftFloat 11s ease-in-out infinite;
}

.av-orb-two {
  width: 370px;
  height: 370px;
  bottom: -190px;
  left: -150px;
  background: radial-gradient(circle, rgba(25, 138, 168, .09), transparent 70%);
  animation: avSoftFloat2 13s ease-in-out infinite;
}

.av-grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: .18;
  background-image:
    linear-gradient(rgba(27, 93, 80, .055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(27, 93, 80, .055) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.55) 45%, transparent 100%);
}

.av-content {
  position: relative;
  z-index: 1;
  width: min(1320px, calc(100% - 42px));
  margin: 0 auto;
}

.av-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 20px;
}

.av-brand-block {
  display: flex;
  align-items: center;
  gap: 11px;
}

.av-brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(135deg, #0b916c, #19bc8d);
  color: #fff;
  font-weight: 950;
  font-size: 20px;
  box-shadow: 0 14px 30px rgba(13, 140, 103, .20);
}

.av-brand-name {
  font-size: 17px;
  font-weight: 950;
  letter-spacing: -.03em;
}

.av-brand-caption {
  color: #83989e;
  font-size: 9px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-top: 2px;
}

.av-header-actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.av-icon-button {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border: 1px solid #dce9e5;
  border-radius: 12px;
  background: rgba(255,255,255,.78);
  color: #1a6756;
  font-size: 15px;
  cursor: pointer;
  transition: .22s ease;
}

.av-icon-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 25px rgba(23,75,66,.08);
  border-color: #b8d9ce;
}

.av-user-chip {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 8px 5px 5px;
  border: 1px solid #dce9e5;
  border-radius: 14px;
  background: rgba(255,255,255,.82);
}

.av-user-avatar {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #e6f7f1;
  color: #0c956c;
  font-weight: 900;
}

.av-user-chip strong,
.av-user-chip span {
  display: block;
}

.av-user-chip strong {
  font-size: 10px;
}

.av-user-chip span {
  color: #84979c;
  font-size: 8px;
  margin-top: 2px;
}

.av-hero {
  display: grid;
  grid-template-columns: 1.35fr .65fr;
  gap: 16px;
  padding: 34px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 100% 0%, rgba(39,214,161,.17), transparent 26%),
    linear-gradient(135deg, #0d3033 0%, #113e3f 50%, #0d5750 100%);
  color: #fff;
  box-shadow: 0 28px 75px rgba(15, 65, 59, .18);
  animation: avFadeUp .65s ease both;
}

.av-eyebrow {
  color: #5c8b80;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1.7px;
}

.av-eyebrow-light {
  color: #76cbb1;
}

.av-hero h1 {
  margin: 12px 0 10px;
  font-size: clamp(38px, 5.2vw, 66px);
  line-height: .98;
  letter-spacing: -.065em;
}

.av-hero h1 span {
  background: linear-gradient(90deg, #7be4c0, #d2fff0);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.av-hero p {
  max-width: 670px;
  margin: 0;
  color: #b6d1ca;
  font-size: 13px;
  line-height: 1.72;
}

.av-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 22px;
}

.av-hero-button,
.av-ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 10px;
  font-weight: 900;
  cursor: pointer;
  transition: .22s ease;
}

.av-hero-button {
  border: 1px solid rgba(255,255,255,.10);
  background: #18b487;
  color: #fff;
  box-shadow: 0 12px 25px rgba(10, 153, 112, .20);
}

.av-ghost-button {
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.055);
  color: #d7efea;
}

.av-hero-button:hover,
.av-ghost-button:hover {
  transform: translateY(-2px);
}

.av-ai-card {
  align-self: stretch;
  padding: 18px;
  border-radius: 20px;
  background: rgba(255,255,255,.075);
  border: 1px solid rgba(255,255,255,.10);
  backdrop-filter: blur(15px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.av-ai-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.av-ai-orb {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(33,211,163,.15);
  color: #85ead0;
  animation: avPulse 2.5s ease-in-out infinite;
}

.av-ai-label {
  color: #72c9b2;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1.5px;
}

.av-ai-top strong {
  display: block;
  margin-top: 2px;
  font-size: 12px;
}

.av-ai-live {
  margin-left: auto;
  padding: 5px 7px;
  border-radius: 999px;
  background: rgba(90,226,184,.09);
  border: 1px solid rgba(90,226,184,.17);
  color: #91e8cf;
  font-size: 7px;
  font-weight: 950;
  letter-spacing: 1px;
}

.av-ai-message {
  margin: 17px 0;
  color: #e1f2ee;
  font-size: 12px;
  line-height: 1.6;
}

.av-ai-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 0;
  background: transparent;
  color: #8ce4ca;
  padding: 0;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
}

.av-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 15px;
  background: #fff4f2;
  border: 1px solid #f1d4cf;
  color: #89534d;
  animation: avFadeUp .4s ease both;
}

.av-error > span {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f8ddd8;
  font-weight: 950;
}

.av-error strong,
.av-error p {
  display: block;
}

.av-error strong {
  font-size: 10px;
}

.av-error p {
  margin: 3px 0 0;
  color: #a1726b;
  font-size: 9px;
}

.av-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 15px;
}

.av-metric-card {
  position: relative;
  overflow: hidden;
  padding: 17px;
  border-radius: 19px;
  background: rgba(255,255,255,.88);
  border: 1px solid #e0ece8;
  box-shadow: 0 14px 38px rgba(31,79,70,.05);
  opacity: 0;
  animation: avFadeUp .65s ease forwards;
}

.av-metric-card::before {
  content: "";
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  right: -60px;
  top: -60px;
  background: rgba(18,171,125,.065);
}

.av-metric-top {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.av-metric-eyebrow {
  color: #82969b;
  font-size: 7px;
  letter-spacing: 1.2px;
  font-weight: 950;
}

.av-metric-title {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 850;
}

.av-metric-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #eff8f5;
  color: #0c9a70;
  font-size: 13px;
}

.av-metric-card.expense .av-metric-icon {
  background: #fff3f1;
  color: #cd6255;
}

.av-metric-card.risk .av-metric-icon {
  background: #fff7e8;
  color: #b7771c;
}

.av-metric-value {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  font-size: 24px;
  font-weight: 950;
  letter-spacing: -.045em;
}

.av-metric-card.income .av-metric-value,
.av-metric-card.savings .av-metric-value {
  color: #0d9b70;
}

.av-metric-card.expense .av-metric-value {
  color: #d65f52;
}

.av-metric-card.risk .av-metric-value {
  color: #b97b27;
}

.av-metric-card.monthly .av-metric-value {
  color: #167a91;
}

.av-metric-meta {
  margin-top: 6px;
  color: #809397;
  font-size: 8px;
  line-height: 1.4;
}

.av-main-grid,
.av-lower-grid {
  display: grid;
  gap: 15px;
  margin-top: 15px;
}

.av-main-grid {
  grid-template-columns: 1.18fr .82fr;
}

.av-lower-grid {
  grid-template-columns: 1.05fr .95fr;
}

.av-panel {
  min-width: 0;
  padding: 20px;
  border-radius: 22px;
  background: rgba(255,255,255,.84);
  border: 1px solid #e0ece8;
  box-shadow: 0 15px 45px rgba(31,79,70,.055);
  animation: avFadeUp .7s .18s ease both;
}

.av-panel-heading h2,
.av-journey-panel h2 {
  margin: 5px 0 5px;
  font-size: 23px;
  letter-spacing: -.045em;
}

.av-panel-heading p,
.av-journey-panel > p {
  max-width: 640px;
  margin: 0;
  color: #7b9095;
  font-size: 9px;
  line-height: 1.6;
}

.av-health-layout {
  display: grid;
  grid-template-columns: 155px 1fr;
  align-items: center;
  gap: 24px;
  margin-top: 22px;
}

.av-health-ring {
  display: grid;
  place-items: center;
}

.av-health-ring-progress {
  width: 145px;
  height: 145px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.av-health-ring-inner {
  width: 109px;
  height: 109px;
  display: grid;
  place-items: center;
  align-content: center;
  border-radius: 50%;
  background: #fff;
  box-shadow: inset 0 0 0 1px #ebf2ef;
}

.av-health-ring-inner strong {
  font-size: 35px;
  line-height: 1;
  font-weight: 950;
  color: #0c936a;
}

.av-health-ring-inner span {
  margin-top: 2px;
  color: #92a5a8;
  font-size: 8px;
}

.av-health-state {
  display: inline-flex;
  padding: 6px 9px;
  border-radius: 999px;
  background: #eaf8f2;
  color: #0f926a;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: .5px;
}

.av-health-copy > p {
  margin: 12px 0 16px;
  color: #687f84;
  font-size: 10px;
  line-height: 1.65;
}

.av-health-bars {
  display: grid;
  gap: 11px;
}

.av-health-row-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #7d9095;
  font-size: 8px;
  font-weight: 800;
  margin-bottom: 5px;
}

.av-health-row-top strong {
  color: #3d6560;
}

.av-health-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #eaf2ef;
}

.av-health-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0e9e72, #29c39d);
  animation: avBarGrow .85s ease both;
}

.av-actions-list {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.av-action-card {
  display: grid;
  grid-template-columns: 33px 1fr 20px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  text-align: left;
  border: 1px solid #e7efec;
  border-radius: 13px;
  background: #fbfefd;
  cursor: pointer;
  transition: .22s ease;
}

.av-action-card:hover {
  transform: translateX(4px);
  border-color: #cfe4dc;
  box-shadow: 0 10px 24px rgba(31,79,70,.06);
}

.av-action-icon {
  width: 33px;
  height: 33px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #eaf8f2;
  color: #0e976e;
  font-size: 14px;
}

.av-action-copy strong,
.av-action-copy span {
  display: block;
}

.av-action-copy strong {
  color: #1e3a40;
  font-size: 10px;
}

.av-action-copy span {
  margin-top: 2px;
  color: #84979b;
  font-size: 8px;
  line-height: 1.4;
}

.av-action-arrow {
  color: #6aa598;
  font-size: 14px;
}

.av-panel-heading-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.av-small-link {
  border: 0;
  background: transparent;
  color: #108f68;
  font-size: 8px;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;
}

.av-category-list {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.av-category-row {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
  align-items: center;
}

.av-category-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #f0f8f5;
  font-size: 15px;
}

.av-category-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.av-category-top strong {
  font-size: 10px;
}

.av-category-top span {
  color: #608078;
  font-size: 9px;
  font-weight: 900;
}

.av-bar {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #eaf1ef;
}

.av-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #13a579, #39c49f);
  animation: avBarGrow .75s ease both;
}

.av-breakdown-note {
  margin-top: 17px;
  padding: 11px 12px;
  border-radius: 12px;
  background: #f2faf7;
  border: 1px solid #dceee7;
}

.av-breakdown-note strong {
  color: #366258;
  font-size: 8px;
  font-weight: 950;
}

.av-breakdown-note p {
  margin: 4px 0 0;
  color: #7e9590;
  font-size: 8px;
  line-height: 1.6;
}

.av-journey-panel {
  background:
    radial-gradient(circle at 90% 0%, rgba(44,209,165,.16), transparent 28%),
    linear-gradient(145deg, #0e3034, #0c4b45);
  color: #fff;
  border-color: rgba(255,255,255,.06);
}

.av-journey-panel .av-eyebrow {
  color: #75cbb0;
}

.av-journey-panel h2 {
  color: #fff;
}

.av-journey-panel > p {
  color: #a9c7c0;
}

.av-journey-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 17px;
}

.av-journey-card {
  min-height: 95px;
  padding: 11px;
  text-align: left;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 13px;
  background: rgba(255,255,255,.055);
  color: #fff;
  cursor: pointer;
  transition: .22s ease;
}

.av-journey-card:hover {
  transform: translateY(-3px);
  background: rgba(255,255,255,.09);
}

.av-journey-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: rgba(255,255,255,.08);
  font-size: 13px;
  margin-bottom: 9px;
}

.av-journey-card strong,
.av-journey-card span {
  display: block;
}

.av-journey-card strong {
  font-size: 9px;
}

.av-journey-card span {
  margin-top: 3px;
  color: #9fbbb5;
  font-size: 7px;
}

.av-transactions-panel {
  margin-top: 15px;
  animation-delay: .28s;
}

.av-table {
  margin-top: 18px;
}

.av-table-head,
.av-table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  align-items: center;
  gap: 10px;
}

.av-table-head {
  padding: 0 5px 9px;
  border-bottom: 1px solid #e4eeeb;
  color: #8ca0a4;
  font-size: 7px;
  letter-spacing: 1px;
  font-weight: 950;
}

.av-table-head .right {
  text-align: right;
}

.av-table-row {
  padding: 12px 5px;
  border-bottom: 1px solid #edf2f0;
}

.av-transaction-cell {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.av-transaction-icon {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 900;
}

.av-transaction-icon.credit {
  background: #eaf8f2;
  color: #0b976c;
}

.av-transaction-icon.debit {
  background: #fff1ee;
  color: #d06152;
}

.av-transaction-cell strong,
.av-transaction-cell span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.av-transaction-cell strong {
  font-size: 9px;
}

.av-transaction-cell span {
  margin-top: 2px;
  color: #8a9ca1;
  font-size: 7px;
}

.av-category-pill {
  display: inline-flex;
  padding: 5px 7px;
  border-radius: 999px;
  background: #f1f6f4;
  color: #647c81;
  font-size: 7px;
  font-weight: 850;
}

.av-date {
  color: #819499;
  font-size: 8px;
}

.av-amount {
  text-align: right;
  font-size: 9px;
  font-weight: 950;
}

.av-amount.credit {
  color: #0b986d;
}

.av-amount.debit {
  color: #d15d4f;
}

.av-empty {
  padding: 36px 10px 16px;
  text-align: center;
}

.av-empty-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 11px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: #eff8f5;
  color: #0c956c;
  font-size: 22px;
  animation: avPulse 2.5s ease-in-out infinite;
}

.av-empty h3 {
  margin: 0;
  font-size: 15px;
}

.av-empty p {
  max-width: 500px;
  margin: 6px auto 0;
  color: #7f9397;
  font-size: 9px;
  line-height: 1.6;
}

.av-secondary-button {
  margin-top: 14px;
  border: 0;
  border-radius: 11px;
  padding: 10px 13px;
  background: #0f9770;
  color: #fff;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
}

.av-footer {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 19px 2px 0;
  color: #879a9e;
  font-size: 7px;
  line-height: 1.5;
}

.av-auth-shell {
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 40px 20px;
}

.av-auth-card {
  width: min(500px, 100%);
  padding: 35px;
  border-radius: 24px;
  background: rgba(255,255,255,.92);
  border: 1px solid #e0ece8;
  box-shadow: 0 25px 60px rgba(22,73,64,.10);
  text-align: center;
}

.av-auth-icon {
  width: 62px;
  height: 62px;
  margin: 0 auto 14px;
  display: grid;
  place-items: center;
  border-radius: 19px;
  background: #edf8f4;
  font-size: 25px;
}

.av-auth-card h2 {
  margin: 7px 0;
  font-size: 26px;
}

.av-auth-card p {
  margin: 0;
  color: #83969a;
  font-size: 11px;
  line-height: 1.6;
}

.av-primary-button {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-top: 20px;
  border: 0;
  border-radius: 12px;
  padding: 12px 16px;
  background: #109a72;
  color: #fff;
  font-weight: 900;
  cursor: pointer;
}

.av-skeleton-shell {
  animation: avFadeUp .4s ease both;
}

.av-skeleton {
  min-height: 75px;
  border-radius: 18px;
  background:
    linear-gradient(
      90deg,
      #edf3f1 0px,
      #f7fbfa 180px,
      #edf3f1 360px
    );
  background-size: 600px 100%;
  animation: avSkeleton 1.5s linear infinite;
}

.skeleton-wide {
  height: 42px;
  width: 180px;
  min-height: 0;
  margin-bottom: 20px;
}

.skeleton-hero {
  min-height: 250px;
  margin-bottom: 15px;
}

.av-skeleton-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.av-skeleton-row.large {
  grid-template-columns: 1.2fr .8fr;
}

@media (max-width: 1100px) {
  .av-hero {
    grid-template-columns: 1fr;
  }

  .av-main-grid,
  .av-lower-grid {
    grid-template-columns: 1fr;
  }

  .av-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .av-hero {
    padding: 28px;
  }
}

@media (max-width: 760px) {
  .av-content {
    width: min(100% - 24px, 1320px);
  }

  .av-dashboard {
    padding-top: 12px;
  }

  .av-header {
    align-items: flex-start;
  }

  .av-user-chip {
    display: none;
  }

  .av-header-actions {
    margin-left: auto;
  }

  .av-hero {
    padding: 22px;
    border-radius: 21px;
  }

  .av-hero h1 {
    font-size: 44px;
  }

  .av-metrics {
    grid-template-columns: 1fr;
  }

  .av-health-layout {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .av-health-copy {
    width: 100%;
  }

  .av-journey-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .av-table {
    overflow-x: auto;
  }

  .av-table-head,
  .av-table-row {
    min-width: 720px;
  }

  .av-footer {
    flex-direction: column;
  }
}
`;

export default Dashboard;
