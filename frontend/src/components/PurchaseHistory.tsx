import { motion } from 'framer-motion';
import { X, ShoppingBag, Receipt } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

interface Props {
  onClose: () => void;
}

export default function PurchaseHistory({ onClose }: Props) {
  const { purchases } = useUserProfile();

  const totalSpent = purchases.reduce((sum, p) => sum + p.price, 0);

  // Group by category
  const byCategory: Record<string, number> = {};
  for (const p of purchases) {
    byCategory[p.category] = (byCategory[p.category] || 0) + p.price;
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
            <Receipt className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-lg">Purchase History</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Spending Summary */}
        <div className="p-5 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-sm font-medium opacity-80">Total Spent</p>
              <p className="text-3xl font-extrabold">${totalSpent.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium opacity-80">Purchases</p>
              <p className="text-3xl font-extrabold">{purchases.length}</p>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(byCategory).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(byCategory).map(([cat, amount]) => (
                <span
                  key={cat}
                  className="text-xs bg-white/20 text-white px-2 py-1 rounded-full font-medium"
                >
                  {cat.replace('_', ' ')}: ${amount.toFixed(2)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Purchase list */}
        <div className="overflow-y-auto max-h-[50vh] p-5">
          {purchases.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-500">No purchases yet</p>
              <p className="text-sm text-slate-400 mt-1">Your purchase history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase, i) => (
                <motion.div
                  key={`${purchase.product_id}-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {purchase.product_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {purchase.brand} · {purchase.card_nickname}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">${purchase.price.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(purchase.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
