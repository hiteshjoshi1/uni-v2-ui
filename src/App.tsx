// React Hook that optimizes performance by memoizing (caching) the result of a calculation between re-renders. It prevents expensive computations from being re-executed unnecessarily when a component re-renders, as long as the dependencies of the calculation have not changed. 
import { useMemo } from "react";
import { useChainId } from "wagmi";
import { DEFAULT_CHAIN_ID, isSupportedChain } from "./config/networks";
import { getAddressesFor } from "./config/addresses";
import WalletButton from "./components/WalletButton";
import SwapPanel from "./components/SwapPanel";


export default function App() {
  // Hook for getting current chain ID from wagmi
  const active = useChainId() || DEFAULT_CHAIN_ID;
  // memoize addresses for contract, until active network has changed
  const addresses = useMemo(() => { try { return getAddressesFor(active); } catch { return null; } }, [active]);

  const supported = isSupportedChain(active) && !!addresses;


  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <WalletButton />
      <h1>Uni V2 Playground</h1>

      <p><b>chainId:</b> {active}</p>
      {supported ? <p><b>Router:</b> {addresses!.UniswapV2Router02}</p> : (
        <p style={{ color: "crimson" }}>Wrong / unsupported network.</p>
      )}
      <SwapPanel />
    </div>
  );
}
