import { useMemo } from "react";
import { useChainId, useReadContract } from "wagmi";
import type { Abi } from "viem";
import FactoryAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Factory.json";
import PairAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Pair.json";
import { getAddressesFor } from "../config/addresses";

export function usePoolStatus(tokenA?: `0x${string}`, tokenB?: `0x${string}`) {
  const chainId = useChainId() ?? 31337;
  const addrs = useMemo(() => { try { return getAddressesFor(chainId); } catch { return null; } }, [chainId]);
  const enabled = !!addrs?.UniswapV2Factory && !!tokenA && !!tokenB && tokenA !== tokenB;

  // Look up pair
  const pairRes = useReadContract({
    abi: FactoryAbi as Abi,
    address: addrs?.UniswapV2Factory as `0x${string}` | undefined,
    functionName: "getPair",
    args: enabled ? [tokenA!, tokenB!] : undefined,
    query: { enabled },
  });

  const pair = (pairRes.data as `0x${string}` | undefined) ?? undefined;
  const hasPair = !!pair && pair !== "0x0000000000000000000000000000000000000000";

  // Read reserves if pair exists
  const reservesRes = useReadContract({
    abi: PairAbi as Abi,
    address: hasPair ? pair : undefined,
    functionName: "getReserves",
    args: hasPair ? [] : undefined,
    query: { enabled: hasPair },
  });

  const reserves = reservesRes.data as readonly [bigint, bigint, number] | undefined;
  const hasLiquidity = !!reserves && (reserves[0] > 0n || reserves[1] > 0n);

  return {
    pair,
    hasPair,
    hasLiquidity,
    isLoading: pairRes.isLoading || reservesRes.isLoading,
    error: (pairRes.error || reservesRes.error) as Error | null,
  };
}
