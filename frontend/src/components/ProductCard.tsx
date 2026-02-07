import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Truck, Tag, ExternalLink, ShoppingCart, Bookmark, Gift, ImageOff } from 'lucide-react';
import type { Product } from '../types';
import { useUserProfile } from '../context/UserProfileContext';

interface ProductCardProps {
  product: Product;
  onBuy: () => void;
  onView: () => void;
}

const VALUE_TAG_COLORS: Record<string, string> = {
  'Best overall': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Best value': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Fastest shipping': 'bg-amber-100 text-amber-700 border-amber-200',
  'Budget pick': 'bg-sky-100 text-sky-700 border-sky-200',
  'Premium pick': 'bg-purple-100 text-purple-700 border-purple-200',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-200 fill-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function ProductCard({ product, onBuy, onView }: ProductCardProps) {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useUserProfile();
  const isWatched = watchlist.includes(product.id);
  const [imgError, setImgError] = useState(false);

  const tagColor = VALUE_TAG_COLORS[product.value_tag] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:shadow-slate-100 transition-all duration-200"
    >
      {/* Product Image */}
      {product.image_url && !imgError ? (
        <div className="w-full h-48 overflow-hidden bg-slate-100">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <ImageOff className="w-8 h-8 text-slate-300" />
        </div>
      )}

      <div className="p-5">
        {/* Header: Tag + Source */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${tagColor}`}
          >
            <Tag className="w-3 h-3" />
            {product.value_tag}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <ExternalLink className="w-3 h-3" />
            {product.source_name}
          </span>
        </div>

        {/* Product Info */}
        <div className="mb-2">
          <h3 className="font-semibold text-slate-800 text-base leading-tight">{product.name}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{product.brand}</p>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-3 leading-relaxed">{product.description}</p>

        {/* Why Recommended */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg px-3 py-2.5 mb-3 border border-indigo-100">
          <p className="text-xs text-indigo-700 leading-relaxed">
            <span className="font-bold">Why this? </span>
            {product.why_recommended}
          </p>
        </div>

        {/* Key Features */}
        {product.key_features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.key_features.map((feature, i) => (
              <span
                key={i}
                className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-100 font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-extrabold text-slate-900">
            ${product.price.toFixed(2)}
          </span>
          {product.original_price && (
            <span className="text-sm text-slate-400 line-through">
              ${product.original_price.toFixed(2)}
            </span>
          )}
          {product.original_price && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Save ${(product.original_price - product.price).toFixed(2)}
            </span>
          )}
        </div>

        {/* Rating + Shipping + Coupons */}
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
          <div className="flex items-center gap-1.5">
            <StarRating rating={product.rating} />
            <span className="font-semibold text-slate-700">{product.rating}</span>
            <span className="text-xs">({product.review_count.toLocaleString()})</span>
          </div>
          <div className="flex items-center gap-1">
            <Truck className="w-4 h-4 text-slate-400" />
            <span className="text-xs">{product.shipping_eta}</span>
          </div>
          {product.available_coupons > 0 && (
            <div className="flex items-center gap-1 text-emerald-600">
              <Gift className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">
                {product.available_coupons} coupon{product.available_coupons > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBuy}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-200"
          >
            <ShoppingCart className="w-4 h-4" />
            One-Click Buy
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onView}
            className="flex items-center justify-center gap-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-medium py-2.5 px-3.5 rounded-xl transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            View
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() =>
              isWatched ? removeFromWatchlist(product.id) : addToWatchlist(product.id)
            }
            className={`p-2.5 rounded-xl border transition-all ${
              isWatched
                ? 'border-amber-200 bg-amber-50 text-amber-500'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-400'
            }`}
            title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Bookmark className={`w-4 h-4 ${isWatched ? 'fill-amber-400' : ''}`} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
