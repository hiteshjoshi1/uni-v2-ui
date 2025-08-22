export function amountOutMin(amountOut: bigint, slippageBps: number): bigint {
    // slippageBps: 50 => 0.50%
    return amountOut - (amountOut * BigInt(slippageBps)) / 10000n;
  }