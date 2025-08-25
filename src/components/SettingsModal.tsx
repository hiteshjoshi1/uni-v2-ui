import { useSettings } from "../context/Settings";

export default function SettingsModal() {
  const s = useSettings();
  if (!s.open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/35 grid place-items-center z-50"
      onClick={() => s.setOpen(false)}
    >
      <div
        className="w-80 bg-white rounded-xl p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mt-0">Settings</h3>

        <label>Slippage (bps)</label>
        <input
          type="number" min={0} step={10}
          value={s.slippageBps}
          onChange={e => s.setSlippageBps(Number(e.target.value))}
          className="p-2 mb-2 border rounded w-full"
        />

        <label>Deadline (seconds)</label>
        <input
          type="number" min={60} step={60}
          value={s.deadlineSec}
          onChange={e => s.setDeadlineSec(Number(e.target.value))}
          className="p-2 mb-2 border rounded w-full"
        />

        <label>Approval mode</label>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => s.setApprovalMode("exact")}
            className={
              s.approvalMode === "exact"
                ? "px-2 py-1 rounded border bg-gray-900 text-white"
                : "px-2 py-1 rounded border"
            }
          >
            Exact
          </button>
          <button
            onClick={() => s.setApprovalMode("unlimited")}
            className={
              s.approvalMode === "unlimited"
                ? "px-2 py-1 rounded border bg-gray-900 text-white"
                : "px-2 py-1 rounded border"
            }
          >
            Unlimited
          </button>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={() => s.setOpen(false)} className="px-2 py-1 border rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
