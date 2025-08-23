import { useMemo } from "react";
import { useChainId, useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "viem";
import FactoryAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Factory.json";
import { getAddressesFor } from "../config/addresses";

export function useFactoryPairs() {
  const chainId = useChainId() ?? 31337;
  const addrs = useMemo(() => { try { return getAddressesFor(chainId); } catch { return null; } }, [chainId]);
  const factory = addrs?.UniswapV2Factory as `0x${string}` | undefined;

  const lenRes = useReadContract({
    abi: FactoryAbi as Abi,
    address: factory,
    functionName: "allPairsLength",
    args: factory ? [] : undefined,
    query: { enabled: !!factory },
  });
  const len = Number((lenRes.data as bigint | undefined) ?? 0);

  const contracts = useMemo(() => {
    if (!factory || !len) return [];
    return Array.from({ length: len }, (_, i) => ({
      address: factory,
      abi: FactoryAbi as Abi,
      functionName: "allPairs" as const,
      args: [BigInt(i)],
    }));
  }, [factory, len]);

  const listRes = useReadContracts({
    contracts: contracts as any,
    query: { enabled: !!factory && len > 0 },
  });

  const pairs = useMemo(
    () => (listRes.data ?? [])
      .map(r => r?.result as `0x${string}` | undefined)
      .filter((x): x is `0x${string}` => !!x),
    [listRes.data]
  );

  return { pairs, isLoading: lenRes.isLoading || listRes.isLoading, error: (lenRes.error || listRes.error) as Error | null };
}
