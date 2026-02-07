import { useState, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    'warm jacket for Pittsburgh winter',
    'cheap reliable headphones for studying',
    'carry-on suitcase under $150',
    'best monitor for home office',
  ];

  return (
    <div className="p-4 border-t border-slate-200 bg-white">
      <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-4 py-2.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
        <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you're looking for..."
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400 disabled:opacity-50"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-sm"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => {
              setInput(s);
            }}
            className="text-xs text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors"
          >
            "{s}"
          </button>
        ))}
      </div>
    </div>
  );
}
