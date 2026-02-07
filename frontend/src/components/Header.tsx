import { motion } from 'framer-motion';
import { ShoppingBag, History, BarChart3 } from 'lucide-react';

interface Props {
  onHistoryClick: () => void;
  onSpendingClick: () => void;
}

export default function Header({ onHistoryClick, onSpendingClick }: Props) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Cliq
          </h1>
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">AI Shopping Agent</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSpendingClick}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          title="Spending Overview"
        >
          <BarChart3 className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onHistoryClick}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          title="Purchase History"
        >
          <History className="w-5 h-5" />
        </motion.button>
      </div>
    </header>
  );
}
