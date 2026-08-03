import { useState } from "react";
import ChatBubble from "../components/ChatBubble";
import TypingIndicator from "../components/TypingIndicator";
import { sendMessage } from "../services/chatApi";
function Chat() {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      message:
        "👋 Hello Amit!\n\nI am **amivest AI**.\n\nI already analyzed your financial profile.\n\nAsk me anything about savings, goals, investments or expenses."
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;

    const userMessage = {
      sender: "user",
      message: input
    };

    setMessages((prev) => [...prev, userMessage]);

    const question = input;

    setInput("");
    setLoading(true);

    try {
      const data = await sendMessage(question);

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          message: data.reply
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          message: "❌ Unable to connect to amivest AI."
        }
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Header */}

      <div className="border-b border-slate-800 p-6">

        <h1 className="text-3xl font-bold">

          🤖 FinSaathi AI

        </h1>

        <p className="text-slate-400">

          Your Personal Financial Assistant

        </p>

      </div>

      {/* Chat */}

      <div className="flex-1 overflow-y-auto p-8">

        {messages.map((msg, index) => (

          <ChatBubble

            key={index}

            sender={msg.sender}

            message={msg.message}

          />

        ))}

        {loading && <TypingIndicator />}

      </div>

      {/* Input */}

      <div className="border-t border-slate-800 p-5">

        <div className="flex gap-3">

          <input
            className="flex-1 rounded-xl bg-slate-900 p-4 outline-none border border-slate-700"
            placeholder="Ask FinSaathi AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {

              if (e.key === "Enter") {

                handleSend();

              }

            }}
          />

          <button
            onClick={handleSend}
            className="bg-violet-600 hover:bg-violet-700 rounded-xl px-8"
          >
            Send
          </button>

        </div>

      </div>

    </div>
  );
}

export default Chat;