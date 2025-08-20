import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { foundry, sepolia } from "viem/chains"; 
import { QueryClient } from "@tanstack/react-query";
import { getRpcUrl } from "../config/networks";

const HAS_SEPOLIA = !!import.meta.env.VITE_RPC_11155111;

const CHAINS = HAS_SEPOLIA
  ? ([foundry, sepolia] as const)
  : ([foundry] as const);




export const config = createConfig({
  chains: CHAINS,
  connectors: [injected()],
  transports: Object.fromEntries(CHAINS.map(c => [c.id, http(getRpcUrl(c.id))])) as any,
  ssr: false,
});

export const queryClient = new QueryClient();
