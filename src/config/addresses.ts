import addrs31337 from "@0xheyjo/uni-v2-artifacts/addresses/addresses.31337.json";
// Import others only if they exist:
// import addrs11155111 from "@0xheyjo/uni-v2-artifacts/addresses/addresses.11155111.json";

export type ContractsOnChain = {
  UniswapV2Factory: `0x${string}`;
  UniswapV2Router02: `0x${string}`;
  WETH9: `0x${string}`;
  [k: string]: `0x${string}` | undefined;
};

const ADDRESS_BOOK: Record<number, ContractsOnChain> = {
  31337: (addrs31337 as any)["31337"],
  // 11155111: (addrs11155111 as any)["11155111"],
};

export function getAddressesFor(chainId: number): ContractsOnChain {
  const found = ADDRESS_BOOK[chainId];
  if (!found) throw new Error(`No addresses for chainId ${chainId}`);
  return found;
}
