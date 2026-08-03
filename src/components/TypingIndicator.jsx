function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 p-3">
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100"></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200"></div>
    </div>
  );
}

export default TypingIndicator;