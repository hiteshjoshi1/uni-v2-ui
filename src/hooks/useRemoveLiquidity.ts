import { useAccount, useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Abi } from "viem";
import RouterAbi from "@0xheyjo/uni-v2-artifacts/abi/UniswapV2Router02.json";
import { getAddressesFor } from "../config/addresses";

export type RemoveParams = {
  tokenA: `0x${string}`;      // pair token0 or token1 (ERC20)
  tokenB: `0x${string}`;      // the other token
  liquidity: bigint;          // LP tokens to burn
  amountAMin: bigint;         // min tokenA out
  amountBMin: bigint;         // min tokenB out
  to?: `0x${string}`;
  deadline?: bigint;
  unwrapETH?: boolean;        // if either side is WETH, unwrap to native ETH
};

export function useRemoveLiquidity() {
  const { address } = useAccount();
  const chainId = useChainId() ?? 31337;

  const addrs = (() => {
    try { return getAddressesFor(chainId); } catch { return null; }
  })();
  const router = addrs?.UniswapV2Router02 as `0x${string}` | undefined;
  const WETH = addrs?.WETH9 as `0x${string}` | undefined;

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const wait = useWaitForTransactionReceipt({ hash, query: { enabled: !!hash } });

  function remove(p: RemoveParams) {
    if (!router) throw new Error("Router not configured");
    const to = p.to ?? (address as `0x${string}`);
    const deadline = p.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 10);

    const aIsWeth = WETH && p.tokenA.toLowerCase() === WETH.toLowerCase();
    const bIsWeth = WETH && p.tokenB.toLowerCase() === WETH.toLowerCase();

    if (p.unwrapETH && (aIsWeth || bIsWeth)) {
      // removeLiquidityETH(nonWeth, liquidity, minToken, minETH, to, deadline)
      const token = (aIsWeth ? p.tokenB : p.tokenA) as `0x${string}`;
      const tokenMin = aIsWeth ? p.amountBMin : p.amountAMin;
      const ethMin = aIsWeth ? p.amountAMin : p.amountBMin;

      return writeContract({
        abi: RouterAbi as Abi,
        address: router,
        functionName: "removeLiquidityETH",
        args: [token, p.liquidity, tokenMin, ethMin, to, deadline],
      });
    }

    // removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline)
    return writeContract({
      abi: RouterAbi as Abi,
      address: router,
      functionName: "removeLiquidity",
      args: [p.tokenA, p.tokenB, p.liquidity, p.amountAMin, p.amountBMin, to, deadline],
    });
  }

  return {
    remove,
    hash,
    isPending,                 // wallet prompt
    isMining: wait.isLoading,  // tx mining
    isSuccess: wait.isSuccess, // mined
    error: (writeError || (wait.error as Error | null)) ?? null,
  };
}
