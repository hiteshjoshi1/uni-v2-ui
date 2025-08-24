import { useSettings } from "../context/Settings";

export default function SettingsModal() {
  const s = useSettings();
  if (!s.open) return null;

  return (
    <div style={backdrop} onClick={() => s.setOpen(false)}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Settings</h3>

        <label>Slippage (bps)</label>
        <input type="number" min={0} step={10}
          value={s.slippageBps}
          onChange={e => s.setSlippageBps(Number(e.target.value))}
          style={{ padding: 8, marginBottom: 8 }} />

        <label>Deadline (seconds)</label>
        <input type="number" min={60} step={60}
          value={s.deadlineSec}
          onChange={e => s.setDeadlineSec(Number(e.target.value))}
          style={{ padding: 8, marginBottom: 8 }} />

        <label>Approval mode</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => s.setApprovalMode("exact")}
            style={s.approvalMode === "exact" ? btnOn : btnOff}>Exact</button>
          <button onClick={() => s.setApprovalMode("unlimited")}
            style={s.approvalMode === "unlimited" ? btnOn : btnOff}>Unlimited</button>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => s.setOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  );
}
const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "grid", placeItems: "center", zIndex: 1000 };
const modal: React.CSSProperties = { width: 320, background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 8px 30px rgba(0,0,0,.2)" };
const btnOn: React.CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff" };
const btnOff: React.CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#f7f7f7" };
