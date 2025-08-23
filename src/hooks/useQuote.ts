import { useMemo } from "react";
import { useChainId, useReadContract } from "wagmi";
import type { Abi } from "viem";
import RouterAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Router02.json";
import { getAddressesFor } from "../config/addresses";
import { NATIVE_ETH } from "../components/TokenSelect";

type Params = { amountIn?: bigint; tokenIn?: string; tokenOut?: string; };

export function useQuote({ amountIn, tokenIn, tokenOut }: Params) {
  const chainId = useChainId() ?? 31337;
  const addrs = useMemo(() => { try { return getAddressesFor(chainId); } catch { return null; } }, [chainId]);
  const WETH = addrs?.WETH9 as `0x${string}` | undefined;

  // Build path (map ETH -> WETH for quoting)
  const path = useMemo<`0x${string}`[] | undefined>(() => {
    if (!addrs?.UniswapV2Router02 || !WETH || !tokenIn || !tokenOut) return undefined;
    const a = (tokenIn === NATIVE_ETH ? WETH : tokenIn) as `0x${string}`;
    const b = (tokenOut === NATIVE_ETH ? WETH : tokenOut) as `0x${string}`;
    if (!a || !b) return undefined;
    return [a, b];
  }, [addrs?.UniswapV2Router02, WETH, tokenIn, tokenOut]);

  // ETH <-> WETH is a trivial 1:1 wrap/unwrap
  const isTrivialWrap =
    !!WETH && !!amountIn && amountIn > 0n &&
    ((tokenIn === NATIVE_ETH && tokenOut === WETH) ||
      (tokenIn === WETH && tokenOut === NATIVE_ETH));

  // IMPORTANT: don't call getAmountsOut when trivial to avoid IDENTICAL_ADDRESSES
  const enabled =
    !isTrivialWrap &&
    !!addrs?.UniswapV2Router02 &&
    !!path &&
    !!amountIn && amountIn > 0n;

  // Always call the hook, but gate the network read
  const res = useReadContract({
    abi: RouterAbi as Abi,
    address: addrs?.UniswapV2Router02 as `0x${string}` | undefined,
    functionName: "getAmountsOut",
    args: enabled ? [amountIn!, path!] : undefined,
    query: { enabled },
  });

  const arr = res.data as readonly bigint[] | undefined;
  const amountOut = isTrivialWrap
    ? (amountIn ?? 0n)
    : (arr && arr.length >= 2 ? arr[arr.length - 1] : 0n);

  return {
    amountOut,
    isLoading: enabled ? res.isLoading : false,
    error: isTrivialWrap ? null : (res.error as Error | null),
    enabled: enabled || isTrivialWrap,
  };
}
