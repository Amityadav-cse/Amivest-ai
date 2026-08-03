function NextStep() {
  return (
    <div
      style={{
        padding: "30px",
        color: "white",
      }}
    >
      <h1>🛡️ Next Step Advisor</h1>

      <div
        style={{
          background: "#1E293B",
          padding: "20px",
          borderRadius: "20px",
          marginBottom: "20px",
        }}
      >
        <h2>⚠️ EMI Alert</h2>

        <p>
          EMI Amount: ₹12,500
        </p>

        <p>
          Due Date: 5 July
        </p>

        <p>
          Days Remaining: 3
        </p>
      </div>

      <div
        style={{
          background: "#1E293B",
          padding: "20px",
          borderRadius: "20px",
          marginBottom: "20px",
        }}
      >
        <h2>🤖 AI Recommendation</h2>

        <ul>
          <li>Keep ₹12,500 ready in your bank account.</li>
          <li>Avoid unnecessary spending this week.</li>
          <li>Enable auto-debit for EMI payment.</li>
          <li>Maintain emergency funds.</li>
        </ul>
      </div>

      <div
        style={{
          background: "#1E293B",
          padding: "20px",
          borderRadius: "20px",
        }}
      >
        <h2>🎯 Financial Goals</h2>

        <p>Monthly Savings Goal: ₹10,000</p>
        <p>Current Progress: ₹8,200</p>
        <p>Completion: 82%</p>

        <h3>Next Best Action</h3>

        <p>
          Save ₹1,800 more this month to achieve your goal.
        </p>
      </div>
    </div>
  );
}

export default NextStep;