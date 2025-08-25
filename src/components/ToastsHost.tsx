import { useToasts } from "../context/Toasts";
import { cn } from "../lib/utils";

export default function ToastsHost() {
  const { toasts, remove } = useToasts();
  return (
    <div className="fixed right-4 bottom-4 z-[2000] grid gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={cn(
            "pointer-events-auto min-w-[260px] rounded-md border px-3 py-2 shadow",
            t.kind === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : t.kind === "success"
              ? "bg-teal-50 border-teal-200 text-teal-800"
              : "bg-slate-50 border-slate-200"
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
