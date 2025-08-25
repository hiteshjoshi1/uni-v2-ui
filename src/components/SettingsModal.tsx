import { useSettings } from "../context/Settings";
import Button from "./ui/Button";
import Input from "./ui/Input";

export default function SettingsModal() {
  const s = useSettings();
  if (!s.open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/40"
      onClick={() => s.setOpen(false)}
    >
      <div
        className="w-80 rounded-xl bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mt-0 text-lg font-semibold">Settings</h3>

        <label className="text-sm font-medium">Slippage (bps)</label>
        <Input
          type="number"
          min={0}
          step={10}
          value={s.slippageBps}
          onChange={(e) => s.setSlippageBps(Number(e.target.value))}
          className="mb-2"
        />

        <label className="text-sm font-medium">Deadline (seconds)</label>
        <Input
          type="number"
          min={60}
          step={60}
          value={s.deadlineSec}
          onChange={(e) => s.setDeadlineSec(Number(e.target.value))}
          className="mb-2"
        />

        <label className="text-sm font-medium">Approval mode</label>
        <div className="mb-3 flex gap-2">
          <Button
            onClick={() => s.setApprovalMode("exact")}
            className={s.approvalMode === "exact" ? undefined : "bg-gray-200 text-gray-800 hover:bg-gray-300"}
          >
            Exact
          </Button>
          <Button
            onClick={() => s.setApprovalMode("unlimited")}
            className={s.approvalMode === "unlimited" ? undefined : "bg-gray-200 text-gray-800 hover:bg-gray-300"}
          >
            Unlimited
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={() => s.setOpen(false)}
            className="bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
