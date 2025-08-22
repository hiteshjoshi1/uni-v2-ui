import { useMemo } from "react";
import { useChainId, useReadContract } from "wagmi";
import type { Abi } from "viem";
import RouterAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Router02.json";
import { getAddressesFor } from "../config/addresses";
import { usePoolStatus } from "./usePoolStatus";

type Params = { amountIn?: bigint; tokenIn?: `0x${string}`; tokenOut?: `0x${string}`; };

export function useQuote({ amountIn, tokenIn, tokenOut }: Params) {
  const chainId = useChainId() ?? 31337;
  const addr = useMemo(() => { try { return getAddressesFor(chainId); } catch { return null; } }, [chainId]);

  const { hasPair, hasLiquidity } = usePoolStatus(tokenIn, tokenOut);

  const enabled =
    !!addr?.UniswapV2Router02 &&
    !!tokenIn && !!tokenOut &&
    !!amountIn && amountIn > 0n &&
    hasPair && hasLiquidity;  // <- guard

  const res = useReadContract({
    abi: RouterAbi as Abi,
    address: addr?.UniswapV2Router02 as `0x${string}` | undefined,
    functionName: "getAmountsOut",
    args: enabled ? [amountIn!, [tokenIn!, tokenOut!]] : undefined,
    query: { enabled },
  });

  const amountOut = useMemo(() => {
    const arr = res.data as readonly bigint[] | undefined;
    return arr && arr.length >= 2 ? arr[arr.length - 1] : 0n;
  }, [res.data]);

  return { amountOut, isLoading: res.isLoading, error: res.error as Error | null, enabled };
}
