import React, { createContext, useContext, useState } from "react";

// schema for value
export type Toast = { id: number; kind?: "info" | "success" | "error"; text: string };

type ToastsCtx = { toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; remove: (id: number) => void; };

const Ctx = createContext<ToastsCtx | null>(null);

export function ToastsProvider({ children }: { children: React.ReactNode }) {
  // creates toasts state, which is an array of Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  // push: add a new toast with unique id, auto-remove after 5s
  const push = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((xs) => [...xs, { id, ...t }]);
    // remove after 5 seconds
    setTimeout(() => setToasts(xs => xs.filter(x => x.id !== id)), 5000);
  };
  // remove: delete a toast by id
  const remove = (id: number) => setToasts(xs => xs.filter(x => x.id !== id));
  // provide toasts + methods to all children
  return <Ctx.Provider value={{ toasts, push, remove }}>{children}</Ctx.Provider>;
}
export function useToasts() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastsProvider missing");
  return v;
}
