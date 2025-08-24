import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import type { Abi } from "viem";
import { isAddress } from "viem";

const ERC20_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

export function useTokenInfo(addr?: string) {
  const valid = !!addr && isAddress(addr);

  const contracts = useMemo(() => {
    if (!valid) return [];
    const a = addr as `0x${string}`;
    return [
      { address: a, abi: ERC20_ABI as unknown as Abi, functionName: "name" },
      { address: a, abi: ERC20_ABI as unknown as Abi, functionName: "symbol" },
      { address: a, abi: ERC20_ABI as unknown as Abi, functionName: "decimals" },
    ];
  }, [addr, valid]);

  const res = useReadContracts({
    contracts: contracts as any,
    query: { enabled: valid },
  });

  const name = (res.data?.[0]?.result as string) ?? "";
  const symbol = (res.data?.[1]?.result as string) ?? "";
  const decimals = Number((res.data?.[2]?.result as number) ?? NaN);

  return {
    valid,
    name,
    symbol,
    decimals,
    isLoading: res.isLoading,
    error: res.error as Error | null,
  };
}
