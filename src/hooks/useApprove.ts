import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi } from "viem";
import ERC20Abi from "@0xheyjo/uni-v2-artifacts/abi/MockERC20.json";

export function useApprove(token?: `0x${string}`) {
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();

  const wait = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  async function approve(spender: `0x${string}`, amount: bigint) {
    if (!token) throw new Error("Token not set");
    return writeContract({
      abi: ERC20Abi as Abi,
      address: token,
      functionName: "approve",
      args: [spender, amount],
    });
  }

  return {
    approve,
    hash,
    isPending,                 // submitting wallet / waiting for user
    isMining: wait.isLoading,  // tx in mempool/mining
    isSuccess: wait.isSuccess, // mined OK
    writeError,
    waitError: wait.error as Error | null,
  };
}
