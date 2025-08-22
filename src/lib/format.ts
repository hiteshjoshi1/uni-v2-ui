import { parseUnits, formatUnits } from "viem";

export function toUnits(amount: string, decimals: number): bigint {
  if (!amount || Number.isNaN(Number(amount))) return 0n;
  return parseUnits(amount as `${number}`, decimals);
}

export function fromUnits(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}
