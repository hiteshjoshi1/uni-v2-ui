import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { foundry, sepolia } from "viem/chains";
import type { Transport } from "viem";
import { QueryClient } from "@tanstack/react-query";   // <-- add
import { getRpcUrl } from "../config/networks";

const HAS_SEPOLIA = !!import.meta.env.VITE_RPC_11155111;
export const CHAINS = HAS_SEPOLIA ? ([foundry, sepolia] as const) : ([foundry] as const);

const transports: Record<number, Transport> = {
  [foundry.id]: http(getRpcUrl(foundry.id)),
  // [sepolia.id]: http(import.meta.env.VITE_RPC_11155111),
};
if (HAS_SEPOLIA) transports[sepolia.id] = http(getRpcUrl(sepolia.id));

export const config = createConfig({
  chains: CHAINS,
  connectors: [injected({ shimDisconnect: true })],
  transports,
  ssr: false,
});

export const queryClient = new QueryClient();          // <-- export this
