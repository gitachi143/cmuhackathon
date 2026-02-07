import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CreditCard, Check, Shield, ChevronRight } from 'lucide-react';
import type { Product } from '../types';
import { useUserProfile } from '../context/UserProfileContext';
import { purchaseProduct } from '../api';

interface Props {
  product: Product;
  onClose: () => void;
  onNeedCard: () => void;
}

export default function OneClickBuyModal({ product, onClose, onNeedCard }: Props) {
  const { savedCard, addPurchase } = useUserProfile();
  const [step, setStep] = useState<'confirm' | 'autofill' | 'success'>('confirm');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!savedCard) {
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
          className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
        >
          <div className="text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Set Up One-Click Buy</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Save a payment method to enable instant purchases. Your card details are stored securely
              and never shared.
            </p>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onNeedCard}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Add Payment Method
            </motion.button>
            <button onClick={onClose} className="w-full mt-3 text-slate-500 text-sm py-2 hover:text-slate-700 transition-colors">
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  const handleConfirm = async () => {
    setStep('autofill');
    setIsProcessing(true);

    // Simulate autofill review
    await new Promise((r) => setTimeout(r, 1800));

    try {
      const result = await purchaseProduct({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        brand: product.brand,
        category: product.category,
        card_nickname: savedCard.nickname,
      });
      addPurchase(result.record);
    } catch {
      // Still show success for demo
      addPurchase({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        brand: product.brand,
        category: product.category,
        card_nickname: savedCard.nickname,
        timestamp: new Date().toISOString(),
      });
    }

    setIsProcessing(false);
    setStep('success');
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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {step === 'confirm'
              ? 'Confirm Purchase'
              : step === 'autofill'
                ? 'Processing...'
                : 'Order Placed!'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {step === 'confirm' && (
            <>
              {/* Product Summary */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 mb-4">
                <h4 className="font-semibold text-slate-800">{product.name}</h4>
                <p className="text-sm text-slate-500 mt-0.5">{product.brand}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-2">${product.price.toFixed(2)}</p>
              </div>

              {/* Payment Method */}
              <div className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl mb-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{savedCard.nickname}</p>
                  <p className="text-xs text-slate-500">
                    {savedCard.is_virtual ? 'Virtual Card' : 'Saved Card'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Autofill Preview */}
              <div className="mb-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Fields to autofill
                </p>
                <div className="space-y-2">
                  {['Full Name', 'Email Address', 'Shipping Address', 'Payment Method'].map(
                    (field) => (
                      <div key={field} className="flex items-center gap-2.5 text-sm">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="text-slate-700 font-medium">{field}</span>
                        <span className="ml-auto text-xs text-slate-400 font-medium">Auto-filled</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Security Note */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-5 bg-emerald-50 px-3 py-2.5 rounded-lg border border-emerald-100">
                <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-emerald-700 font-medium">Secure simulated purchase — no real charges will be made</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleConfirm}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                Confirm Purchase — ${product.price.toFixed(2)}
              </motion.button>
            </>
          )}

          {step === 'autofill' && (
            <div className="py-10 text-center">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-5" />
              <p className="text-base font-semibold text-slate-700">Auto-filling checkout fields...</p>
              <p className="text-sm text-slate-400 mt-1">Reviewing and confirming your details</p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-18 h-18 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ width: 72, height: 72 }}
              >
                <Check className="w-9 h-9 text-emerald-600" />
              </motion.div>
              <h4 className="text-xl font-bold text-slate-800 mb-1">Order Placed!</h4>
              <p className="text-sm text-slate-500 mb-1">{product.name}</p>
              <p className="text-2xl font-extrabold text-slate-900">${product.price.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-2 bg-slate-50 inline-block px-3 py-1 rounded-full">{product.shipping_eta}</p>
              <div className="mt-6">
                <button
                  onClick={onClose}
                  className="px-8 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
