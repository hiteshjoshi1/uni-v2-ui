import { createContext, useContext, useMemo } from "react";
import { useChainId } from "wagmi";
import { getAddressesFor, isSupportedChain, DEFAULT_CHAIN_ID } from "../config/addresses";

// schema of the value returned by this context provider
type AppNetworkValue = {
  chainId: number;
  addresses: ReturnType<typeof getAddressesFor> | null; // will return ContractsOnChain | null
  supported: boolean;
};
/*
React Context is a way to share state or data globally across a component tree 
without having to manually pass props down multiple levels
It’s useful when:
Multiple components at different nesting levels need the same data.
The data is relatively global (e.g., current user, theme, network connection, auth token).
Below, it returns AppNetworkValue or null if no AppNetworkValue if no Provider exists
Also default value set here is null
*/
const Ctx = createContext<AppNetworkValue | null>(null);

export function useAppNetwork() {
  /*
  useContext is a hook that allows you to consume the value from the 
  nearest <MyContext.Provider> above in the tree.
  */
  const value = useContext(Ctx);
  if (!value) throw new Error("useAppNetwork must be used within <AppNetworkProvider>");
  return value;
}
/**
 * Every React component is just a function that takes one argument: a props object.
  type Props = {
  children: React.ReactNode;
};
  Take the children property out of the props object.
  function AppNetworkProvider({ children }: Props) 
  if you inline the type
  Give it the type React.ReactNode
  export function AppNetworkProvider({ children }: { children: React.ReactNode })
};
 */
export function AppNetworkProvider({ children }: { children: React.ReactNode }) {
  const chainId = useChainId() ?? DEFAULT_CHAIN_ID;
  const addresses = useMemo(() => {
    try { return getAddressesFor(chainId); } catch { return null; }
  }, [chainId]);
  const supported = isSupportedChain(chainId) && !!addresses;
  // make the final value
  const value = useMemo(() => ({ chainId, addresses, supported }), [chainId, addresses, supported]);
  // provide the values to all the children
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
