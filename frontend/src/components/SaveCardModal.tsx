import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CreditCard, Shield } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

interface Props {
  onClose: () => void;
}

export default function SaveCardModal({ onClose }: Props) {
  const { setSavedCard } = useUserProfile();
  const [nickname, setNickname] = useState('Visa ending in 1234');
  const [isVirtual, setIsVirtual] = useState(false);

  const handleSave = () => {
    setSavedCard({ nickname, is_virtual: isVirtual });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">Add Payment Method</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Card icon */}
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CreditCard className="w-7 h-7 text-indigo-600" />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Card Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g., Visa ending in 1234"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <button
                type="button"
                onClick={() => setIsVirtual(!isVirtual)}
                className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                  isVirtual ? 'bg-indigo-500' : 'bg-slate-200'
                }`}
              >
                <motion.div
                  animate={{ x: isVirtual ? 24 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-5 h-5 bg-white rounded-full shadow absolute top-0.5"
                />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-800">Use a virtual card</p>
                <p className="text-xs text-slate-500">Generate a temporary card number for added security</p>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs mb-5 bg-emerald-50 px-3 py-2.5 rounded-lg border border-emerald-100">
            <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-emerald-700 font-medium">This is a simulation — no real card data is stored or transmitted</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={!nickname.trim()}
            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            Save Payment Method
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
