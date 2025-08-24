import React, { createContext, useContext, useState } from "react";

export type Toast = { id: number; kind?: "info" | "success" | "error"; text: string };
type ToastsCtx = { toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; remove: (id: number) => void; };

const Ctx = createContext<ToastsCtx | null>(null);

export function ToastsProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((xs) => [...xs, { id, ...t }]);
    setTimeout(() => setToasts(xs => xs.filter(x => x.id !== id)), 5000);
  };
  const remove = (id: number) => setToasts(xs => xs.filter(x => x.id !== id));
  return <Ctx.Provider value={{ toasts, push, remove }}>{children}</Ctx.Provider>;
}
export function useToasts() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastsProvider missing");
  return v;
}
