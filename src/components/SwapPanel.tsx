import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import TokenSelect, { NATIVE_ETH } from "./TokenSelect";
import { useQuote } from "../hooks/useQuote";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useSwap } from "../hooks/useSwap";
import { getAddressesFor, type ContractsOnChain } from "../config/addresses";
import { toUnits, fromUnits } from "../lib/format";
import { amountOutMin } from "../lib/slippage";
import { maxUint256 } from "viem";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useSettings } from "../context/Settings";
import { useToasts } from "../context/Toasts";
import { humanError } from "../lib/errors";

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
  const WETH = addresses?.WETH9 as `0x${string}` | undefined;

  // Balances & decimals (safe: always called, gated internally)
  const inTok = useTokenBalance(tokenIn || undefined);
  const outTok = useTokenBalance(tokenOut || undefined);

  const decIn = inTok.decimals ?? 18;
  const decOut = outTok.decimals ?? 18;

  const amountIn = useMemo(() => toUnits(amountInStr || "0", decIn), [amountInStr, decIn]);

  // Quote (handles ETH <-> WETH)
  const { amountOut, isLoading: quoting, error: quoteError } = useQuote({
    amountIn, tokenIn, tokenOut
  });
  const minOut = useMemo(() => amountOutMin(amountOut, slippageBps), [amountOut, slippageBps]);

  // Approval needs (skip for spending ETH or WETH->ETH unwrap)
  const isInETH = tokenIn === NATIVE_ETH;
  const isOutETH = tokenOut === NATIVE_ETH;
  const skipApproval = isInETH || (tokenIn === WETH && isOutETH);

  const { allowance, isLoading: loadingAllow, refetch: refetchAllow } =
    useAllowance(skipApproval ? undefined : (tokenIn || undefined) as `0x${string}` | undefined, router);

  const { approve, isPending: approving, isMining: approvingMining, isSuccess: approved, writeError, waitError } =
    useApprove(skipApproval ? undefined : (tokenIn || undefined) as `0x${string}` | undefined);

  useEffect(() => { if (approved) refetchAllow(); }, [approved, refetchAllow]);

  const needsApproval =
    !skipApproval && !!tokenIn && !!router && amountIn > 0n && allowance < amountIn;

  const approveAmount = unlimited ? maxUint256 : amountIn;

  // Balance guard
  const insufficient = amountIn > (inTok.balance ?? 0n);

  // Swap
  const { swap, isPending: swapping, isMining: swapMining, isSuccess: swapOk, error: swapError } = useSwap();

  async function onSwap() {
    if (!tokenIn || !tokenOut || amountIn === 0n || insufficient) return;
    await swap({
      amountIn,
      amountOutMin: minOut,
      tokenIn,
      tokenOut,
      to: me as `0x${string}`,
    });
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 600, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Swap</h3>

      <TokenSelect label="From" value={tokenIn} onChange={setTokenIn} />
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Balance: {fromUnits(inTok.balance ?? 0n, decIn)} {inTok.symbol}
      </div>
      <input
        placeholder="Amount in"
        value={amountInStr}
        onChange={(e) => setAmountInStr(e.target.value)}
      />
      {insufficient && amountIn > 0n && (
        <div style={{ color: "crimson", fontSize: 12 }}>Insufficient balance</div>
      )}

      <TokenSelect label="To" value={tokenOut} onChange={setTokenOut} />
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Balance: {fromUnits(outTok.balance ?? 0n, decOut)} {outTok.symbol}
      </div>

      <div>
        <div><b>Estimated Out:</b> {quoting ? "…" : fromUnits(amountOut, decOut)}</div>
        <div><b>Min Out ({(slippageBps / 100).toFixed(2)}%):</b> {fromUnits(minOut, decOut)}</div>
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
          style={{ width: 120 }}
        />
        <small>(50 = 0.50%)</small>
      </div>

      {/* Approvals */}
      {(!skipApproval && (needsApproval || unlimited)) && (
        <div style={{ background: "#f8f8f8", padding: 12, borderRadius: 8, fontSize: 13 }}>
          <b>Approval details</b>
          <div>Spender (Router): <code title={router}>{short(router)}</code></div>
          <div>Current allowance: {fromUnits(allowance, decIn)}</div>
          <div>
            This approval will set your spending cap to{" "}
            <b>{unlimited ? "Unlimited" : fromUnits(approveAmount, decIn)}</b>.
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {!skipApproval && (
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
            Unlimited approval
          </label>
        )}

        {needsApproval ? (
          <button
            onClick={() => approve(router!, approveAmount)}
            disabled={!router || approving || approvingMining || loadingAllow || amountIn === 0n || insufficient}
          >
            {approving ? "Confirm in wallet…" : approvingMining ? "Approving…" : `Approve${unlimited ? " (Unlimited)" : ""}`}
          </button>
        ) : (
          <button
            onClick={onSwap}
            disabled={
              swapping || swapMining || !tokenIn || !tokenOut || amountIn === 0n || !!quoteError || insufficient
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
