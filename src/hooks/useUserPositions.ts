import { useAccount, useChainId, useReadContracts } from "wagmi";
import { useMemo } from "react";
import type { Abi } from "viem";
import PairAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Pair.json";

const ERC20_ABI = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export type UserPosition = {
  pair: `0x${string}`;
  token0: `0x${string}`; token1: `0x${string}`;
  symbol0: string; symbol1: string;
  decimals0: number; decimals1: number;
  reserve0: bigint; reserve1: bigint;
  totalSupply: bigint;
  lpBalance: bigint;
  shareBps: number;            // 10000 = 100%
  amount0: bigint; amount1: bigint; // user’s underlying
};

export function useUserPositions(pairAddrs?: (`0x${string}` | undefined)[]) {
  const { address } = useAccount();
  const chainId = useChainId() ?? 31337;

  const pairs: `0x${string}`[] = useMemo(
    () => (pairAddrs ?? []).filter((p): p is `0x${string}` => !!p) as `0x${string}`[],
    [pairAddrs]
  );

  const enabledA = !!address && pairs.length > 0;

  // Phase A: read core pair data
  const contractsA = useMemo(() => {
    if (!enabledA) return [];
    const cs: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[] }[] = [];
    for (const p of pairs) {
      cs.push({ address: p, abi: PairAbi as Abi, functionName: "token0" });
      cs.push({ address: p, abi: PairAbi as Abi, functionName: "token1" });
      cs.push({ address: p, abi: PairAbi as Abi, functionName: "getReserves" });
      cs.push({ address: p, abi: PairAbi as Abi, functionName: "totalSupply" });
      cs.push({ address: p, abi: PairAbi as Abi, functionName: "balanceOf", args: [address] });
    }
    return cs;
  }, [enabledA, pairs, address]);

  const resA = useReadContracts({
    contracts: contractsA as any,
    query: { enabled: enabledA },
  });

  // Parse phase A
  const core = useMemo(() => {
    if (!enabledA || !resA.data) return null;
    const out: {
      [pair: `0x${string}`]: {
        token0: `0x${string}`; token1: `0x${string}`;
        reserve0: bigint; reserve1: bigint;
        totalSupply: bigint; lpBalance: bigint;
      }
    } = {};
    for (let i = 0, j = 0; i < pairs.length; i++) {
      const p = pairs[i];
      const rToken0 = resA.data[j++]?.result as `0x${string}`;
      const rToken1 = resA.data[j++]?.result as `0x${string}`;
      const rRes = resA.data[j++]?.result as readonly [bigint, bigint, number] | undefined;
      const rTs = resA.data[j++]?.result as bigint | undefined;
      const rLp = resA.data[j++]?.result as bigint | undefined;
      if (!rToken0 || !rToken1 || !rRes || rTs == null || rLp == null) continue;
      out[p] = {
        token0: rToken0,
        token1: rToken1,
        reserve0: rRes[0],
        reserve1: rRes[1],
        totalSupply: rTs,
        lpBalance: rLp,
      };
    }
    return out;
  }, [enabledA, resA.data, pairs]);

  // Phase B: fetch token metadata (symbol, decimals)
  const enabledB = !!core && Object.keys(core).length > 0;
  const contractsB = useMemo(() => {
    if (!enabledB) return [];
    const cs: { address: `0x${string}`; abi: Abi; functionName: string }[] = [];
    for (const p of Object.keys(core!) as `0x${string}`[]) {
      const { token0, token1 } = core![p];
      cs.push({ address: token0, abi: ERC20_ABI as unknown as Abi, functionName: "symbol" });
      cs.push({ address: token0, abi: ERC20_ABI as unknown as Abi, functionName: "decimals" });
      cs.push({ address: token1, abi: ERC20_ABI as unknown as Abi, functionName: "symbol" });
      cs.push({ address: token1, abi: ERC20_ABI as unknown as Abi, functionName: "decimals" });
    }
    return cs;
  }, [core, enabledB]);

  const resB = useReadContracts({
    contracts: contractsB as any,
    query: { enabled: enabledB },
  });

  // Combine
  const positions = useMemo<UserPosition[] | null>(() => {
    if (!core) return null;
    const result: UserPosition[] = [];
    let k = 0;
    for (const p of Object.keys(core) as `0x${string}`[]) {
      const c = core[p];
      const symbol0 = (resB.data?.[k++]?.result as string) ?? "T0";
      const decimals0 = Number((resB.data?.[k++]?.result as number) ?? 18);
      const symbol1 = (resB.data?.[k++]?.result as string) ?? "T1";
      const decimals1 = Number((resB.data?.[k++]?.result as number) ?? 18);

      const share = c.totalSupply === 0n ? 0 : Number((c.lpBalance * 10_000n) / c.totalSupply);
      const amount0 = c.totalSupply === 0n ? 0n : (c.reserve0 * c.lpBalance) / c.totalSupply;
      const amount1 = c.totalSupply === 0n ? 0n : (c.reserve1 * c.lpBalance) / c.totalSupply;

      result.push({
        pair: p,
        token0: c.token0, token1: c.token1,
        symbol0, symbol1,
        decimals0, decimals1,
        reserve0: c.reserve0, reserve1: c.reserve1,
        totalSupply: c.totalSupply,
        lpBalance: c.lpBalance,
        shareBps: share,
        amount0, amount1,
      });
    }
    return result;
  }, [core, resB.data]);

  return {
    chainId,
    positions: positions ?? [],
    isLoading: resA.isLoading || resB.isLoading,
    error: (resA.error || resB.error) as Error | null,
  };
}
