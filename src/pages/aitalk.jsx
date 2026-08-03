import ChatBot from "./ChatBot";

export default function AITalk({ transactions, setTransactions }) {
  return (
    <div className="w-full h-full">
      <ChatBot transactions={transactions} setTransactions={setTransactions} />
    </div>
  );
}
