import { useMemo } from "react";
import { useChainId } from "wagmi";
import { DEFAULT_CHAIN_ID } from "./config/networks";
import { getAddressesFor } from "./config/addresses";

export default function App() {
  const active = useChainId() || DEFAULT_CHAIN_ID;
  const addresses = useMemo(() => {
    try { return getAddressesFor(active); } catch { return null; }
  }, [active]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Uni V2 Playground</h1>
      <p><b>chainId:</b> {active}</p>
      {addresses ? (
        <p><b>Router:</b> {addresses.UniswapV2Router02}</p>
      ) : (
        <p style={{ color: "crimson" }}>No addresses for this chain.</p>
      )}
    </div>
  );
}
