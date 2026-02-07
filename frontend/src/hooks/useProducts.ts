import { useState, useEffect } from "react";
import type { UIProduct } from "../types";

const PRODUCTS_KEY = "cliq_products";

export function useProducts() {
  const [products, setProducts] = useState<UIProduct[]>(() => {
    try {
      const saved = localStorage.getItem(PRODUCTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  const clearProducts = () => {
    setProducts([]);
    localStorage.removeItem(PRODUCTS_KEY);
  };

  return { products, setProducts, clearProducts };
}
