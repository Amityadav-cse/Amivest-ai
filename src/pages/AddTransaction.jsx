import { useState } from "react";

function AddTransaction() {
  const [type, setType] = useState("Expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  const handleSave = async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      alert("Please login first.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          type,
          category,
          amount,
          description,
          transaction_date: transactionDate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);

        setCategory("");
        setAmount("");
        setDescription("");
        setTransactionDate("");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend.");
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Add Transaction</h2>

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option>Income</option>
        <option>Expense</option>
      </select>

      <br /><br />

      <input
        type="text"
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      <br /><br />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <br /><br />

      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <br /><br />

      <input
        type="date"
        value={transactionDate}
        onChange={(e) => setTransactionDate(e.target.value)}
      />

      <br /><br />

      <button onClick={handleSave}>
        Save Transaction
      </button>
    </div>
  );
}

export default AddTransaction;
