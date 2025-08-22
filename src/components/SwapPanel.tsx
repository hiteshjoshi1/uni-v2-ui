import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import TokenSelect from "./TokenSelect";
import { useQuote } from "../hooks/useQuote";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useSwap } from "../hooks/useSwap";
import { getAddressesFor, type ContractsOnChain } from "../config/addresses";
import { toUnits, fromUnits } from "../lib/format";
import { amountOutMin } from "../lib/slippage";
import { maxUint256 } from "viem";

const DECIMALS_IN = 18;   // TODO: read decimals dynamically
const DECIMALS_OUT = 18;

const short = (a?: string) =>
  a && a.startsWith("0x") ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "";

export default function SwapPanel() {
  const [tokenIn, setTokenIn] = useState<string>("");
  const [tokenOut, setTokenOut] = useState<string>("");
  const [amountInStr, setAmountInStr] = useState<string>("");
  const [slippageBps, setSlippageBps] = useState<number>(50);
  const [unlimited, setUnlimited] = useState<boolean>(false);

  const { address: me } = useAccount();
  const chainId = useChainId() ?? 31337;

  const addresses = useMemo<ContractsOnChain | null>(() => {
    try { return getAddressesFor(chainId); } catch { return null; }
  }, [chainId]);

  const router = addresses?.UniswapV2Router02 as `0x${string}` | undefined;
  const spender = router;

  const amountIn = useMemo(() => toUnits(amountInStr, DECIMALS_IN), [amountInStr]);

  // Quote
  const { amountOut, isLoading: quoting, error: quoteError, enabled: quoteEnabled } = useQuote({
    amountIn,
    tokenIn: (tokenIn || undefined) as `0x${string}` | undefined,
    tokenOut: (tokenOut || undefined) as `0x${string}` | undefined,
  });
  const minOut = useMemo(() => amountOutMin(amountOut, slippageBps), [amountOut, slippageBps]);

  // Allowance / Approve
  const { allowance, isLoading: loadingAllow, refetch: refetchAllow } = useAllowance(
    (tokenIn || undefined) as `0x${string}` | undefined,
    spender
  );
  const { approve, isPending: approving, isMining: approvingMining, isSuccess: approved, writeError, waitError } =
    useApprove((tokenIn || undefined) as `0x${string}` | undefined);

  useEffect(() => { if (approved) refetchAllow(); }, [approved, refetchAllow]);
  const needsApproval = !!tokenIn && !!spender && amountIn > 0n && allowance < amountIn;
  const approveAmount = unlimited ? maxUint256 : amountIn;

  // Swap
  const { swapExactTokensForTokens, isPending: swapping, isMining: swapMining, isSuccess: swapOk, error: swapError } =
    useSwap();

  async function onSwap() {
    if (!router || !tokenIn || !tokenOut || amountIn === 0n) return;
    await swapExactTokensForTokens({
      amountIn,
      amountOutMin: minOut,
      tokenIn: tokenIn as `0x${string}`,
      tokenOut: tokenOut as `0x${string}`,
      to: me as `0x${string}`,
      // deadline defaulted inside hook
    });
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 560, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Swap</h3>

      <TokenSelect label="From" value={tokenIn} onChange={setTokenIn} />
      <input
        placeholder="Amount in"
        value={amountInStr}
        onChange={(e) => setAmountInStr(e.target.value)}
      />
      <TokenSelect label="To" value={tokenOut} onChange={setTokenOut} />

      <div>
        <div><b>Estimated Out:</b> {quoting ? "…" : fromUnits(amountOut, DECIMALS_OUT)}</div>
        <div><b>Min Out ({(slippageBps / 100).toFixed(2)}%):</b> {fromUnits(minOut, DECIMALS_OUT)}</div>
        {quoteError && <div style={{ color: "crimson" }}>{quoteError.message}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label>Slippage (bps):</label>
        <input
          type="number"
          min={0}
          step={10}
          value={slippageBps}
          onChange={(e) => setSlippageBps(Number(e.target.value))}
          style={{ width: 100 }}
        />
        <small>(50 = 0.50%)</small>
      </div>

      {/* Trustworthy approval prompt */}
      {(needsApproval || unlimited) && (
        <div style={{ background: "#f8f8f8", padding: 12, borderRadius: 8, fontSize: 13 }}>
          <b>Approval details</b>
          <div>Chain: <code>{chainId}</code></div>
          <div>Spender (Router): <code title={router}>{short(router)}</code></div>
          <div>Current allowance: {fromUnits(allowance, DECIMALS_IN)}</div>
          <div>
            This approval will set your spending cap to{" "}
            <b>{unlimited ? "Unlimited" : fromUnits(approveAmount, DECIMALS_IN)}</b>.
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
          Unlimited approval
        </label>

        {needsApproval ? (
          <button
            onClick={() => approve(spender!, approveAmount)}
            disabled={!spender || approving || approvingMining || loadingAllow || amountIn === 0n}
          >
            {approving ? "Confirm in wallet…" : approvingMining ? "Approving…" : `Approve${unlimited ? " (Unlimited)" : ""}`}
          </button>
        ) : (
          <button
            onClick={onSwap}
            disabled={
              !quoteEnabled ||
              swapping ||
              swapMining ||
              !router ||
              !tokenIn ||
              !tokenOut ||
              amountIn === 0n
            }
          >
            {swapping ? "Confirm in wallet…" : swapMining ? "Swapping…" : "Swap"}
          </button>
        )}
      </div>

      {(writeError || waitError || swapError) && (
        <div style={{ color: "crimson" }}>
          {(writeError || waitError || swapError)?.message}
        </div>
      )}

      {swapOk && <div style={{ color: "green" }}>Swap complete ✅</div>}
    </div>
  );
}
