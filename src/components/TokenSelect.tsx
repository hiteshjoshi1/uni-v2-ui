import { useMemo } from "react";
import tokens from "../config/tokens.local.json";
import { getAddressesFor } from "../config/addresses";
import { useChainId } from "wagmi";

type Props = { value?: string; onChange: (addr: string) => void; label?: string };

export const NATIVE_ETH = "ETH" as const; // sentinel used across the app

export default function TokenSelect({ value, onChange, label }: Props) {
  const chainId = useChainId();
  const addrMap = useMemo(() => {
    try { return getAddressesFor(chainId ?? 31337); } catch { return null; }
  }, [chainId]);

  // hydrate known addresses from artifacts if present
  const list = useMemo(() => {
    return tokens.map(t => ({
      ...t,
      address:
        t.symbol === "WETH" ? addrMap?.WETH9 ?? t.address :
          t.symbol === "DAI" ? addrMap?.DAI ?? t.address :
            t.symbol === "USDC" ? addrMap?.USDC ?? t.address : t.address
    }));
  }, [addrMap]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {label && <label>{label}</label>}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Select token…</option>
        <option value={NATIVE_ETH}>ETH (native)</option>
        {list.map((t) => (
          <option key={t.symbol} value={t.address}>{t.symbol} {t.address ? `(${t.address.slice(0, 6)}…${t.address.slice(-4)})` : ""}</option>
        ))}
      </select>
      <input
        placeholder="Or paste token address 0x…"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
