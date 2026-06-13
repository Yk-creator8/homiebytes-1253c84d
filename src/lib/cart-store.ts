import { useSyncExternalStore } from "react";
import type { Food } from "./mock-data";

export type CartItem = { food: Food; qty: number };

const STORAGE_KEY = "deligo-cart-v1";
let items: CartItem[] = [];
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) items = JSON.parse(raw);
  } catch {}
}

function emit() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
  listeners.forEach((l) => l());
}

export const cartStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => items,
  getServerSnapshot: () => [] as CartItem[],
  add(food: Food, qty = 1) {
    const existing = items.find((i) => i.food.id === food.id);
    if (existing) items = items.map((i) => i.food.id === food.id ? { ...i, qty: i.qty + qty } : i);
    else items = [...items, { food, qty }];
    emit();
  },
  setQty(id: string, qty: number) {
    items = qty <= 0 ? items.filter((i) => i.food.id !== id) : items.map((i) => i.food.id === id ? { ...i, qty } : i);
    emit();
  },
  remove(id: string) {
    items = items.filter((i) => i.food.id !== id);
    emit();
  },
  clear() {
    items = [];
    emit();
  },
};

export function useCart() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
}

export const DELIVERY_FEE = 25;
