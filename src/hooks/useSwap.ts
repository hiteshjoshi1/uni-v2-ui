import { useMemo } from "react";
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Abi } from "viem";
import RouterAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Router02.json";
import WETH9Abi from "@0xheyjo/uni-v2-artifacts/abi/WETH9.json";
import { getAddressesFor } from "../config/addresses";
import { NATIVE_ETH } from "../components/TokenSelect";

export type SwapParams = {
  amountIn: bigint;
  amountOutMin: bigint;
  tokenIn: string;   // 'ETH' or 0x
  tokenOut: string;  // 'ETH' or 0x
  to?: `0x${string}`;
  deadline?: bigint; // unix seconds
};

export function useSwap() {
  const chainId = useChainId() ?? 31337;
  const addrs = useMemo(() => {
    try { return getAddressesFor(chainId); } catch { return null; }
  }, [chainId]);
  const { address } = useAccount();

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const wait = useWaitForTransactionReceipt({ hash, query: { enabled: !!hash } });

  function swap(p: SwapParams) {
    if (!addrs?.UniswapV2Router02 || !addrs?.WETH9) throw new Error("Router/WETH not configured");
    const to = p.to ?? (address as `0x${string}`);
    const deadline = p.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 5);
    const WETH = addrs.WETH9 as `0x${string}`;

    const isInETH = p.tokenIn === NATIVE_ETH;
    const isOutETH = p.tokenOut === NATIVE_ETH;
    const inAddr = (isInETH ? WETH : p.tokenIn) as `0x${string}`;
    const outAddr = (isOutETH ? WETH : p.tokenOut) as `0x${string}`;

    // ETH <-> WETH (wrap/unwrap directly via WETH9)
    if (isInETH && p.tokenOut === WETH) {
      // Wrap ETH -> WETH
      if (p.amountOutMin > p.amountIn) throw new Error("amountOutMin too high for wrap");
      return writeContract({
        abi: WETH9Abi as Abi,
        address: WETH,
        functionName: "deposit",
        args: [],
        value: p.amountIn,
      });
    }
    if (p.tokenIn === WETH && isOutETH) {
      // Unwrap WETH -> ETH
      if (p.amountOutMin > p.amountIn) throw new Error("amountOutMin too high for unwrap");
      return writeContract({
        abi: WETH9Abi as Abi,
        address: WETH,
        functionName: "withdraw",
        args: [p.amountIn],
      });
    }

    // ETH -> ERC20
    if (isInETH && !isOutETH) {
      return writeContract({
        abi: RouterAbi as Abi,
        address: addrs.UniswapV2Router02 as `0x${string}`,
        functionName: "swapExactETHForTokens",
        args: [p.amountOutMin, [WETH, outAddr], to, deadline],
        value: p.amountIn,
      });
    }

    // ERC20 -> ETH
    if (!isInETH && isOutETH) {
      return writeContract({
        abi: RouterAbi as Abi,
        address: addrs.UniswapV2Router02 as `0x${string}`,
        functionName: "swapExactTokensForETH",
        args: [p.amountIn, p.amountOutMin, [inAddr, WETH], to, deadline],
      });
    }

    // ERC20 -> ERC20 (includes WETH as ERC20)
    return writeContract({
      abi: RouterAbi as Abi,
      address: addrs.UniswapV2Router02 as `0x${string}`,
      functionName: "swapExactTokensForTokens",
      args: [p.amountIn, p.amountOutMin, [inAddr, outAddr], to, deadline],
    });
  }

  return {
    swap,
    hash,
    isPending,                 // waiting for wallet
    isMining: wait.isLoading,  // mining
    isSuccess: wait.isSuccess, // mined
    error: (writeError || (wait.error as Error | null)) ?? null,
  };
}
