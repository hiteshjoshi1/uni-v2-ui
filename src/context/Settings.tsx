import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
type ApprovalMode = "exact" | "unlimited";

// Value object type
type Settings = {
  slippageBps: number; setSlippageBps: (n: number) => void;
  deadlineSec: number; setDeadlineSec: (n: number) => void;
  approvalMode: ApprovalMode; setApprovalMode: (m: ApprovalMode) => void;
  open: boolean; setOpen: (b: boolean) => void;
};
// create the context, it returns Settings or null, initial value null
const Ctx = createContext<Settings | null>(null);
const LS_KEY = "uni.settings.v1";

// create the provider
// pass the children
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // create a state Variable Open with default value false
  const [open, setOpen] = useState(false);
  // create 3 more state variables slippageBps, deadlineSec, approvalMode
  const [slippageBps, setSlippageBps] = useState(50);   // 0.50%
  const [deadlineSec, setDeadlineSec] = useState(300);  // 5 min
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("unlimited");

  //useEffect for use cases where you want to do  “After React paints the UI, run this effect.”
  // useEffect also handles cleanup (unsubscribe, clear timers).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.slippageBps === "number") setSlippageBps(s.slippageBps);
      if (typeof s.deadlineSec === "number") setDeadlineSec(s.deadlineSec);
      if (s.approvalMode === "exact" || s.approvalMode === "unlimited") setApprovalMode(s.approvalMode);
    } catch { }
  }, []);// [] run once after mount (never again)

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ slippageBps, deadlineSec, approvalMode }));
  }, [slippageBps, deadlineSec, approvalMode]);

  // useMemo tells React: “only recompute this value if the dependencies change; 
  // otherwise, reuse the previous one.
  const v = useMemo(() => ({
    slippageBps, setSlippageBps,
    deadlineSec, setDeadlineSec,
    approvalMode, setApprovalMode,
    open, setOpen,
  }), [slippageBps, deadlineSec, approvalMode, open]); // run after mount and whenever any of these values change.

  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("SettingsProvider missing");
  return v;
}
