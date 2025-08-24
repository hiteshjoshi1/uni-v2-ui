import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
type ApprovalMode = "exact" | "unlimited";

type Settings = {
  slippageBps: number; setSlippageBps: (n: number) => void;
  deadlineSec: number; setDeadlineSec: (n: number) => void;
  approvalMode: ApprovalMode; setApprovalMode: (m: ApprovalMode) => void;
  open: boolean; setOpen: (b: boolean) => void;
};

const Ctx = createContext<Settings | null>(null);
const LS_KEY = "uni.settings.v1";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [slippageBps, setSlippageBps] = useState(50);   // 0.50%
  const [deadlineSec, setDeadlineSec] = useState(300);  // 5 min
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("unlimited");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.slippageBps === "number") setSlippageBps(s.slippageBps);
      if (typeof s.deadlineSec === "number") setDeadlineSec(s.deadlineSec);
      if (s.approvalMode === "exact" || s.approvalMode === "unlimited") setApprovalMode(s.approvalMode);
    } catch { }
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ slippageBps, deadlineSec, approvalMode }));
  }, [slippageBps, deadlineSec, approvalMode]);

  const v = useMemo(() => ({
    slippageBps, setSlippageBps,
    deadlineSec, setDeadlineSec,
    approvalMode, setApprovalMode,
    open, setOpen,
  }), [slippageBps, deadlineSec, approvalMode, open]);

  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("SettingsProvider missing");
  return v;
}
