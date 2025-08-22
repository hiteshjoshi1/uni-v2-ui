import { useAccount, useReadContract } from "wagmi";
import type { Abi } from "viem";
import ERC20Abi from "@0xheyjo/uni-v2-artifacts/abi/MockERC20.json";

export function useAllowance(token?: `0x${string}`, spender?: `0x${string}`) {
  const { address: owner } = useAccount();
  const enabled = !!token && !!spender && !!owner;

  const res = useReadContract({
    abi: ERC20Abi as Abi,
    address: token,
    functionName: "allowance",
    args: enabled ? [owner!, spender!] : undefined,
    query: { enabled, refetchInterval: 10_000 }, // poll every 10s
  });

  return {
    allowance: (res.data as bigint) ?? 0n,
    isLoading: res.isLoading,
    refetch: res.refetch,
    error: res.error as Error | null,
  };
}
