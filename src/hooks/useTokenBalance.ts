import { useMemo } from "react";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import type { Abi } from "viem";
import { NATIVE_ETH } from "../components/TokenSelect";

const ERC20_ABI = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export function useTokenBalance(addrOrEth?: string) {
  const { address } = useAccount();
  const isEth = addrOrEth === NATIVE_ETH;

  // Native ETH
  const native = useBalance({
    address,
    query: { enabled: isEth && !!address },
  });

  // ERC20 (symbol, decimals, balanceOf)
  const enabledErc = !!address && !!addrOrEth && !isEth && addrOrEth.startsWith("0x");
  const contracts = useMemo(() => {
    if (!enabledErc) return [];
    const t = addrOrEth as `0x${string}`;
    return [
      { address: t, abi: ERC20_ABI as unknown as Abi, functionName: "symbol" },
      { address: t, abi: ERC20_ABI as unknown as Abi, functionName: "decimals" },
      { address: t, abi: ERC20_ABI as unknown as Abi, functionName: "balanceOf", args: [address!] },
    ];
  }, [enabledErc, addrOrEth, address]);

  const erc = useReadContracts({
    contracts: contracts as any,
    query: { enabled: enabledErc },
  });

  const symbol = isEth ? "ETH" : ((erc.data?.[0]?.result as string) ?? "TOKEN");
  const decimals = isEth ? 18 : Number((erc.data?.[1]?.result as number) ?? 18);
  const balance = isEth ? (native.data?.value ?? 0n) : ((erc.data?.[2]?.result as bigint) ?? 0n);

  const isLoading = isEth ? native.isLoading : erc.isLoading;
  const error = (isEth ? native.error : erc.error) as Error | null;

  return { symbol, decimals, balance, isLoading, error };
}
