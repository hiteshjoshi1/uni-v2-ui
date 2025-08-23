// src/config/addresses.ts
// Make sure tsconfig has:  "resolveJsonModule": true

import addrs31337 from "@0xheyjo/uni-v2-artifacts/addresses/addresses.31337.json";
// If you don't have Sepolia addresses yet, comment the next line out:
// import addrs11155111 from "@0xheyjo/uni-v2-artifacts/addresses/addresses.11155111.json";

export type ContractsOnChain = {
  UniswapV2Factory: `0x${string}`;
  UniswapV2Router02: `0x${string}`;
  WETH9: `0x${string}`;
  DAI: `0x${string}`;
  USDC: `0x${string}`;
  WETH_USDC_Pair?: `0x${string}`;
  WETH_DAI_Pair?: `0x${string}`;
  DAI_USDC_Pair?: `0x${string}`;
};

const MAP: Record<number, ContractsOnChain> = {
  31337: (addrs31337 as any)["31337"],
  // 11155111: (addrs11155111 as any)["11155111"], // remove if you commented out the import
};

export const DEFAULT_CHAIN_ID: number =
  Number(import.meta.env.VITE_DEFAULT_CHAIN_ID ?? 31337);

export function isSupportedChain(chainId: number): boolean {
  return MAP[chainId] !== undefined;
}

export function getAddressesFor(chainId: number): ContractsOnChain {
  const entry = MAP[chainId];
  if (!entry) throw new Error(`No addresses for chainId ${chainId}`);
  return entry;
}

export function supportedChains(): number[] {
  return Object.keys(MAP).map(Number);
}
