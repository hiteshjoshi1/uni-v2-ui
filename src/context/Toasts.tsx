import React, { createContext, useRef, useContext, useState } from "react";

// schema for value
export type Toast = { id: number; kind?: "info" | "success" | "error"; text: string };
type ToastsCtx = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">, key?: string) => void;  // optional dedupe key
  remove: (id: number) => void;
};


const Ctx = createContext<ToastsCtx | null>(null);

export function ToastsProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const recent = useRef<Map<string, number>>(new Map()); // key -> timestamp

  const push: ToastsCtx["push"] = (t, key) => {
    // dedupe same-key toasts within 2s
    if (key) {
      const now = Date.now();
      const last = recent.current.get(key) ?? 0;
      if (now - last < 2000) return;
      recent.current.set(key, now);
    }
    const id = nextId.current++;
    setToasts((xs) => [...xs, { id, ...t }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 5000);
  };

  const remove = (id: number) => setToasts((xs) => xs.filter((x) => x.id !== id));

  return <Ctx.Provider value={{ toasts, push, remove }}>{children}</Ctx.Provider>;
}
export function useToasts() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastsProvider missing");
  return v;
}
