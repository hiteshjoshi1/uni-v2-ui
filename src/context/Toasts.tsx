import React, { createContext, useContext, useRef, useState } from "react";

export type Toast = { id: number; kind?: "info" | "success" | "error"; text: string };
type ToastsCtx = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">, key?: string) => void;
  remove: (id: number) => void;
};

const Ctx = createContext<ToastsCtx | null>(null);

export function ToastsProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const recent = useRef<Map<string, number>>(new Map()); // sig -> ts

  const push: ToastsCtx["push"] = (t, key) => {
    // ✅ dedupe bursts caused by StrictMode/double effects
    const sig = (key ?? `${t.kind ?? "info"}|${t.text}`).toLowerCase();
    const now = Date.now();
    const last = recent.current.get(sig) ?? 0;
    if (now - last < 1500) return; // drop duplicates within 1.5s
    recent.current.set(sig, now);

    const id = nextId.current++;
    setToasts((xs) => [...xs, { id, ...t }]);
    setTimeout(() => {
      setToasts((xs) => xs.filter((x) => x.id !== id));
    }, 5000);
  };

  const remove = (id: number) => setToasts((xs) => xs.filter((x) => x.id !== id));

  return <Ctx.Provider value={{ toasts, push, remove }}>{children}</Ctx.Provider>;
}

export function useToasts() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastsProvider missing");
  return v;
}
