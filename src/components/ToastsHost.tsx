import { useToasts } from "../context/Toasts";

export default function ToastsHost() {
  const { toasts, remove } = useToasts();
  return (
    <div style={{ position: "fixed", right: 12, bottom: 12, display: "grid", gap: 8, zIndex: 2000 }}>
      {toasts.map(t => (
        <div key={t.id}
          onClick={() => remove(t.id)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #eee",
            background: t.kind === "error" ? "#fee2e2" : t.kind === "success" ? "#ecfeff" : "#f8fafc",
            minWidth: 260
          }}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
