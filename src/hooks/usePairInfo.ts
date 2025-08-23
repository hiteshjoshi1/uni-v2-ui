import { useMemo } from "react";
import { useChainId, useReadContract } from "wagmi";
import type { Abi } from "viem";
import FactoryAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Factory.json";
import PairAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Pair.json";
import { getAddressesFor } from "../config/addresses";
import { NATIVE_ETH } from "../components/TokenSelect";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export function usePairInfo(tokenA?: string, tokenB?: string) {
  const chainId = useChainId() ?? 31337;
  const addrs = useMemo(() => { try { return getAddressesFor(chainId); } catch { return null; } }, [chainId]);
  const WETH = addrs?.WETH9 as `0x${string}` | undefined;
  const factory = addrs?.UniswapV2Factory as `0x${string}` | undefined;

  // Map ETH -> WETH for core lookups
  const a = tokenA === NATIVE_ETH ? (WETH as string | undefined) : tokenA;
  const b = tokenB === NATIVE_ETH ? (WETH as string | undefined) : tokenB;

  const canQuery = !!factory && !!a && !!b && a !== b;

  // 1) getPair(a,b)
  const pairRes = useReadContract({
    abi: FactoryAbi as Abi,
    address: factory,
    functionName: "getPair",
    args: canQuery ? [a as `0x${string}`, b as `0x${string}`] : undefined,
    query: { enabled: canQuery },
  });
  const pair = (pairRes.data as `0x${string}` | undefined) ?? (ZERO_ADDR as `0x${string}`);

  const hasPair = pair !== (ZERO_ADDR as `0x${string}`);

  // 2) token0()
  const token0Res = useReadContract({
    abi: PairAbi as Abi,
    address: hasPair ? pair : undefined,
    functionName: "token0",
    args: hasPair ? [] : undefined,
    query: { enabled: hasPair },
  });
  const token0 = token0Res.data as `0x${string}` | undefined;

  // 3) getReserves()
  const reservesRes = useReadContract({
    abi: PairAbi as Abi,
    address: hasPair ? pair : undefined,
    functionName: "getReserves",
    args: hasPair ? [] : undefined,
    query: { enabled: hasPair },
  });
  const reserves = reservesRes.data as readonly [bigint, bigint, number] | undefined;

  // 4) totalSupply()
  const tsRes = useReadContract({
    abi: PairAbi as Abi,
    address: hasPair ? pair : undefined,
    functionName: "totalSupply",
    args: hasPair ? [] : undefined,
    query: { enabled: hasPair },
  });
  const totalSupply = (tsRes.data as bigint | undefined) ?? 0n;

  // Map reserves to user’s A/B order
  let reserveA: bigint | undefined;
  let reserveB: bigint | undefined;
  if (hasPair && token0 && reserves) {
    const [r0, r1] = reserves;
    if (token0.toLowerCase() === (a ?? "").toLowerCase()) {
      reserveA = r0; reserveB = r1;
    } else {
      reserveA = r1; reserveB = r0;
    }
  }

  const initial = hasPair ? (totalSupply === 0n) : true; // no pair or zero supply ⇒ initial

  return {
    pair: hasPair ? pair : undefined,
    exists: hasPair,
    initial,
    reserveA: reserveA ?? 0n,
    reserveB: reserveB ?? 0n,
    isLoading: pairRes.isLoading || token0Res.isLoading || reservesRes.isLoading || tsRes.isLoading,
    error: (pairRes.error || token0Res.error || reservesRes.error || tsRes.error) as Error | null,
  };
}
