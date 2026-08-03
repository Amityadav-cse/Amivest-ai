import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Layout from "./components/Layout";
import RefundPolicy from "./pages/RefundPolicy";

import Dashboard from "./pages/Dashboard";
import ChatBot from "./pages/ChatBot";
import RBIRules from "./pages/RBIRules";
import TaxAlerts from "./pages/TaxAlerts";
import Investments from "./pages/Investments";
import Goals from "./pages/Goals";
import News from "./pages/News";
import NextStep from "./pages/NextStep";
import LoanAssistant from "./pages/LoanAssistant";
import AITalk from "./pages/aitalk";

import Register from "./pages/Register";
import Login from "./pages/Login";
import AddTransaction from "./pages/AddTransaction";
import ImportStatement from "./pages/ImportStatement";
import Chat from "./pages/Chat";
import Premium from "./pages/Premium";

function App() {
  const [globalTransactions, setGlobalTransactions] = useState([]);

  return (
    <BrowserRouter>
      <Routes>

        {/* Authentication */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Main Layout */}
        <Route path="/" element={<Layout />}>

          <Route
            index
            element={
              <Dashboard
                transactions={globalTransactions}
                setTransactions={setGlobalTransactions}
              />
            }
          />

          <Route
            path="chat"
            element={
              <ChatBot
                transactions={globalTransactions}
                setTransactions={setGlobalTransactions}
              />
            }
          />

          <Route
            path="aitalk"
            element={
              <AITalk
                transactions={globalTransactions}
                setTransactions={setGlobalTransactions}
              />
            }
          />

          <Route
            path="goals"
            element={
              <Goals
                transactions={globalTransactions}
              />
            }
          />

          <Route
            path="investments"
            element={
              <Investments
                transactions={globalTransactions}
              />
            }
          />

          <Route
            path="loan"
            element={
              <LoanAssistant
                transactions={globalTransactions}
              />
            }
          />

          <Route
            path="rbi"
            element={
              <RBIRules
                transactions={globalTransactions}
              />
            }
          />

          <Route
            path="tax"
            element={
              <TaxAlerts
                transactions={globalTransactions}
              />
            }
          />

          <Route path="news" element={<News />} />
          <Route path="nextstep" element={<NextStep />} />
          <Route path="premium" element={<Premium />} />
          <Route path="refund-policy" element={<RefundPolicy />} />

          <Route
            path="add-transaction"
            element={
              <AddTransaction
                transactions={globalTransactions}
                setTransactions={setGlobalTransactions}
              />
            }
          />

          <Route
            path="import"
            element={
              <ImportStatement
                setTransactions={setGlobalTransactions}
              />
            }
          />

          <Route path="legacy-chat" element={<Chat />} />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;