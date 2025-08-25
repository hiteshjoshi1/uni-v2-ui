import { useToasts } from "../context/Toasts";
import { clsx } from "clsx";

export default function ToastsHost() {
  const { toasts, remove } = useToasts();
  return (
    <div className="fixed right-3 bottom-3 grid gap-2 z-[2000] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={clsx(
            "pointer-events-auto min-w-[260px] rounded-md border p-3 text-sm shadow",
            t.kind === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : t.kind === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-slate-50 border-slate-200 text-slate-700"
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
