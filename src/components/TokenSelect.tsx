import { useMemo } from "react";
import tokens from "../config/tokens.local.json";
import { getAddressesFor } from "../config/addresses";
import { useChainId } from "wagmi";

type Props = { value?: string; onChange: (addr: string) => void; label?: string };

// Sentinel for native ETH
export const NATIVE_ETH = "ETH";

export default function TokenSelect({ value, onChange, label }: Props) {
  const chainId = useChainId() ?? 31337;
  const addrMap = useMemo(() => {
    try { return getAddressesFor(chainId); } catch { return null; }
  }, [chainId]);

  // hydrate known addresses from artifacts + prepend ETH
  const list = useMemo(() => {
    const hydrated = tokens.map(t => ({
      ...t,
      address:
        t.symbol === "WETH" ? addrMap?.WETH9 ?? t.address :
          t.symbol === "DAI" ? addrMap?.DAI ?? t.address :
            t.symbol === "USDC" ? addrMap?.USDC ?? t.address : t.address
    }));
    // Put native ETH as first option
    return [{ symbol: "ETH", name: "Ether (native)", address: NATIVE_ETH, decimals: 18 }, ...hydrated];
  }, [addrMap]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {label && <label>{label}</label>}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Select token…</option>
        {list.map((t) => (
          <option key={`${t.symbol}-${t.address}`} value={t.address}>
            {t.symbol} {t.address && t.address.startsWith("0x") ? `(${t.address.slice(0, 6)}…${t.address.slice(-4)})` : ""}
          </option>
        ))}
      </select>
      <input
        placeholder="Or paste token address 0x… (not for ETH)"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
