import { useAccount, useBlockNumber, useChainId, useReadContract, useBalance } from "wagmi";
import type { Abi } from "viem";

const ERC20_ABI = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export function useTokenBalance(addr?: string) {
  const { address: me } = useAccount();
  const chainId = useChainId() ?? 31337;

  const isNative = addr === "ETH";
  const token = addr as `0x${string}` | undefined;

  // watch blocks so we refresh after txs
  const { data: _block } = useBlockNumber({ chainId, watch: true });

  // native ETH
  const native = useBalance({
    address: me,
    chainId,
    query: { enabled: isNative && !!me },
  });

  // ERC20 reads
  const symbol = useReadContract({
    address: token,
    abi: ERC20_ABI as unknown as Abi,
    functionName: "symbol",
    query: { enabled: !isNative && !!token },
  });
  const decimals = useReadContract({
    address: token,
    abi: ERC20_ABI as unknown as Abi,
    functionName: "decimals",
    query: { enabled: !isNative && !!token },
  });
  const ercBal = useReadContract({
    address: token,
    abi: ERC20_ABI as unknown as Abi,
    functionName: "balanceOf",
    args: me ? [me] : undefined,
    query: { enabled: !isNative && !!token && !!me },
  });

  // refetch on every new block
  const refetch = () => {
    native.refetch?.();
    symbol.refetch?.();
    decimals.refetch?.();
    ercBal.refetch?.();
  };

  return {
    symbol: isNative ? "ETH" : (symbol.data as string) ?? "",
    decimals: isNative ? 18 : Number(decimals.data ?? 18),
    balance: isNative ? (native.data?.value ?? 0n) : ((ercBal.data as bigint) ?? 0n),
    refetch,
  };
}
