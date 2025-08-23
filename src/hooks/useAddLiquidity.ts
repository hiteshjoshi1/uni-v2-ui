import { useMemo } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi } from "viem";
import RouterAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Router02.json";
import { getAddressesFor } from "../config/addresses";
import { NATIVE_ETH } from "../components/TokenSelect";

export type AddLiquidityParams = {
  tokenA: string;  // 'ETH' or 0x
  tokenB: string;  // 'ETH' or 0x
  amountADesired: bigint;
  amountBDesired: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  to?: `0x${string}`;
  deadline?: bigint;
};

export function useAddLiquidity() {
  const chainId = useChainId() ?? 31337;
  const addrs = useMemo(() => { try { return getAddressesFor(chainId); } catch { return null; } }, [chainId]);
  const { address } = useAccount();

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const wait = useWaitForTransactionReceipt({ hash, query: { enabled: !!hash } });

  function addLiquidity(p: AddLiquidityParams) {
    if (!addrs?.UniswapV2Router02) throw new Error("Router not configured");
    const to = p.to ?? (address as `0x${string}`);
    const deadline = p.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 10);

    const isAETH = p.tokenA === NATIVE_ETH;
    const isBETH = p.tokenB === NATIVE_ETH;
    if (isAETH && isBETH) throw new Error("Both sides cannot be ETH");

    if (isAETH || isBETH) {
      // ERC20 + ETH path
      const token = (isAETH ? p.tokenB : p.tokenA) as `0x${string}`;
      const amountTokenDesired = isAETH ? p.amountBDesired : p.amountADesired;
      const amountETHDesired = isAETH ? p.amountADesired : p.amountBDesired;
      const amountTokenMin = isAETH ? p.amountBMin : p.amountAMin;
      const amountETHMin = isAETH ? p.amountAMin : p.amountBMin;

      return writeContract({
        abi: RouterAbi as Abi,
        address: addrs.UniswapV2Router02 as `0x${string}`,
        functionName: "addLiquidityETH",
        args: [token, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline],
        value: amountETHDesired,
      });
    }

    // ERC20 + ERC20
    return writeContract({
      abi: RouterAbi as Abi,
      address: addrs.UniswapV2Router02 as `0x${string}`,
      functionName: "addLiquidity",
      args: [
        p.tokenA as `0x${string}`,
        p.tokenB as `0x${string}`,
        p.amountADesired,
        p.amountBDesired,
        p.amountAMin,
        p.amountBMin,
        to,
        deadline,
      ],
    });
  }

  return {
    addLiquidity,
    hash,
    isPending,                 // waiting wallet
    isMining: wait.isLoading,  // tx mining
    isSuccess: wait.isSuccess, // mined OK
    error: (writeError || (wait.error as Error | null)) ?? null,
  };
}
