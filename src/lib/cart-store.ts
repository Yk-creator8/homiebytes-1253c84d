import { useSyncExternalStore } from "react";
import { trackEvent } from "./analytics";

export type CartItem = {
  foodId: string;
  cookId: string;
  name: string;
  price: number;
  image: string;
  qty: number;
};


const STORAGE_KEY = "deligo-cart-v2";
let items: CartItem[] = [];
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) items = JSON.parse(raw);
  } catch {}
}

function emit() {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export const cartStore = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  getSnapshot: () => items,
  getServerSnapshot: () => [] as CartItem[],
  add(item: Omit<CartItem, "qty">, qty = 1) {
    const existing = items.find((i) => i.foodId === item.foodId);
    if (existing) items = items.map((i) => i.foodId === item.foodId ? { ...i, qty: i.qty + qty } : i);
    else items = [...items, { ...item, qty }];
    emit();
  },
  setQty(id: string, qty: number) {
    items = qty <= 0 ? items.filter((i) => i.foodId !== id) : items.map((i) => i.foodId === id ? { ...i, qty } : i);
    emit();
  },
  remove(id: string) { items = items.filter((i) => i.foodId !== id); emit(); },
  clear() { items = []; emit(); },
};

export function useCart() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
}

export const DELIVERY_FEE = 25;
