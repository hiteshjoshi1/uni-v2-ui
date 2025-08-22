import { useMemo } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi } from "viem";
import RouterAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Router02.json";
import { getAddressesFor } from "../config/addresses";

type SwapParams = {
  amountIn: bigint;
  amountOutMin: bigint;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  to?: `0x${string}`;
  deadline?: bigint; // unix seconds
};

export function useSwap() {
  const chainId = useChainId() ?? 31337;
  const addrs = useMemo(() => { try { return getAddressesFor(chainId); } catch { return null; } }, [chainId]);
  const { address } = useAccount();

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const wait = useWaitForTransactionReceipt({ hash, query: { enabled: !!hash } });

  function swapExactTokensForTokens(p: SwapParams) {
    if (!addrs?.UniswapV2Router02) throw new Error("Router not configured");
    if (p.tokenIn === p.tokenOut) throw new Error("Tokens must differ");
    const to = p.to ?? (address as `0x${string}`);
    const deadline = p.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 5);
    return writeContract({
      abi: RouterAbi as Abi,
      address: addrs.UniswapV2Router02 as `0x${string}`,
      functionName: "swapExactTokensForTokens",
      args: [p.amountIn, p.amountOutMin, [p.tokenIn, p.tokenOut], to, deadline],
    });
  }

  return {
    swapExactTokensForTokens,
    hash,
    isPending,                 // awaiting user / wallet
    isMining: wait.isLoading,  // tx mined?
    isSuccess: wait.isSuccess,
    error: (writeError || (wait.error as Error | null)) ?? null,
  };
}
