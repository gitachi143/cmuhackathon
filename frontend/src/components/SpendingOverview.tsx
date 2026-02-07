import { motion } from 'framer-motion';
import { X, TrendingUp, ShoppingBag, Bookmark, PieChart } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

interface Props {
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  winter_jackets: 'bg-blue-400',
  monitors: 'bg-purple-400',
  headphones: 'bg-amber-400',
  laptops: 'bg-emerald-400',
  running_shoes: 'bg-red-400',
  luggage: 'bg-cyan-400',
};

export default function SpendingOverview({ onClose }: Props) {
  const { purchases, watchlist } = useUserProfile();

  const totalSpent = purchases.reduce((sum, p) => sum + p.price, 0);
  const byCategory: Record<string, { amount: number; count: number }> = {};
  for (const p of purchases) {
    if (!byCategory[p.category]) byCategory[p.category] = { amount: 0, count: 0 };
    byCategory[p.category].amount += p.price;
    byCategory[p.category].count += 1;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-lg">Spending Overview</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
              <TrendingUp className="w-5 h-5 mb-2 opacity-80" />
              <p className="text-2xl font-extrabold">${totalSpent.toFixed(2)}</p>
              <p className="text-xs font-medium opacity-80 mt-0.5">Total Spent</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
              <ShoppingBag className="w-5 h-5 mb-2 opacity-80" />
              <p className="text-2xl font-extrabold">{purchases.length}</p>
              <p className="text-xs font-medium opacity-80 mt-0.5">Purchases</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
              <Bookmark className="w-5 h-5 mb-2 opacity-80" />
              <p className="text-2xl font-extrabold">{watchlist.length}</p>
              <p className="text-xs font-medium opacity-80 mt-0.5">Watchlist</p>
            </div>
          </div>

          {/* Spend by Category */}
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
            Spend by Category
          </h4>
          {Object.keys(byCategory).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Make some purchases to see your spending breakdown
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byCategory)
                .sort((a, b) => b[1].amount - a[1].amount)
                .map(([cat, data]) => {
                  const percentage = totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0;
                  const barColor = CATEGORY_COLORS[cat] || 'bg-slate-400';
                  return (
                    <motion.div
                      key={cat}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700 capitalize">
                          {cat.replaceAll('_', ' ')}
                        </span>
                        <span className="text-slate-500 font-medium">
                          ${data.amount.toFixed(2)} ({data.count})
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className={`h-2 rounded-full ${barColor}`}
                        />
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
