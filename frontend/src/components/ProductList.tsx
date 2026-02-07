import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '../types';
import ProductCard from './ProductCard';
import { Package, Sparkles } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  onBuy: (product: Product) => void;
  onViewProduct: (product: Product) => void;
}

export default function ProductList({ products, onBuy, onViewProduct }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No products yet</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
            Tell the AI assistant what you're looking for in your own words, and product
            recommendations will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-800">Recommendations</h2>
        </div>
        <span className="text-sm font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {products.length} found
        </span>
      </div>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
              layout
            >
              <ProductCard
                product={product}
                onBuy={() => onBuy(product)}
                onView={() => onViewProduct(product)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
