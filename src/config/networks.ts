export const DEFAULT_CHAIN_ID: number = Number(import.meta.env.VITE_DEFAULT_CHAIN_ID ?? 31337);

// TODO - Get this from a .env, not hardcoded
// List all networks your UI supports
export const SUPPORTED_CHAIN_IDS = [31337 /*, 11155111*/];

export function isSupportedChain(chainId?: number): chainId is number {
  return !!chainId && SUPPORTED_CHAIN_IDS.includes(chainId);
}

// Map chainId -> RPC URL (from .env)
const RPCS: Record<number, string | undefined> = {
  31337: import.meta.env.VITE_RPC_31337 ?? "http://127.0.0.1:8545",
  11155111: import.meta.env.VITE_RPC_11155111,
};

export function getRpcUrl(chainId: number): string {
  const url = RPCS[chainId];
  if (!url) throw new Error(`Missing RPC for chainId ${chainId}`);
  return url;
}
