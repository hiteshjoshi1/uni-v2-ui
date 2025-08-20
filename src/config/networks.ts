// Reads network settings from .env and exposes helpers.

export const DEFAULT_CHAIN_ID: number = Number(import.meta.env.VITE_DEFAULT_CHAIN_ID ?? 31337);

// Map of chainId -> RPC url (add more as needed)
const RPCS: Record<number, string | undefined> = {
  31337: import.meta.env.VITE_RPC_31337 ?? "http://127.0.0.1:8545",
  11155111: import.meta.env.VITE_RPC_11155111, // Sepolia (optional)
};

export function getRpcUrl(chainId: number): string {
  const url = RPCS[chainId];
  if (!url) throw new Error(`Missing RPC for chainId ${chainId}. Set VITE_RPC_${chainId} in .env`);
  return url;
}
