import ReactMarkdown from "react-markdown";

function ChatBubble({ sender, message }) {
  const isAI = sender === "ai";

  return (
    <div
      className={`flex ${
        isAI ? "justify-start" : "justify-end"
      } mb-4`}
    >
      <div
        className={`max-w-xl rounded-2xl px-4 py-3 ${
          isAI
            ? "bg-slate-800 text-white"
            : "bg-violet-600 text-white"
        }`}
      >
        <ReactMarkdown>{message}</ReactMarkdown>
      </div>
    </div>
  );
}

export default ChatBubble;