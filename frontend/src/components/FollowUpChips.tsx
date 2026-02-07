import { motion } from 'framer-motion';
import type { FollowUpQuestion } from '../types';
import { MessageCircleQuestion } from 'lucide-react';

interface Props {
  question: FollowUpQuestion;
  onSelect: (option: string) => void;
}

export default function FollowUpChips({ question, onSelect }: Props) {
  return (
    <div className="px-4 py-3 border-t border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
      <div className="flex items-center gap-1.5 mb-2">
        <MessageCircleQuestion className="w-3.5 h-3.5 text-indigo-500" />
        <p className="text-xs font-semibold text-indigo-700">{question.question}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {question.options.map((option, i) => (
          <motion.button
            key={option}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(option)}
            className="px-3.5 py-1.5 bg-white border border-indigo-200 text-indigo-600 text-sm font-medium rounded-full hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-sm"
          >
            {option}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
