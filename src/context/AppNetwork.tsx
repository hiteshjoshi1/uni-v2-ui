import { createContext, useContext, useMemo } from "react";
import { useChainId } from "wagmi";
import { getAddressesFor, isSupportedChain, DEFAULT_CHAIN_ID } from "../config/addresses";

type AppNetworkValue = {
  chainId: number;
  addresses: ReturnType<typeof getAddressesFor> | null;
  supported: boolean;
};

const Ctx = createContext<AppNetworkValue | null>(null);

export function useAppNetwork() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppNetwork must be used within <AppNetworkProvider>");
  return v;
}

export function AppNetworkProvider({ children }: { children: React.ReactNode }) {
  const chainId = useChainId() ?? DEFAULT_CHAIN_ID;
  const addresses = useMemo(() => {
    try { return getAddressesFor(chainId); } catch { return null; }
  }, [chainId]);
  const supported = isSupportedChain(chainId) && !!addresses;

  const value = useMemo(() => ({ chainId, addresses, supported }), [chainId, addresses, supported]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
