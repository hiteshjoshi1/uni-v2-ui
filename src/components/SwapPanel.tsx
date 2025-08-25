// src/components/SwapPanel.tsx
import { useRef, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import TokenSelect, { NATIVE_ETH } from "./TokenSelect";
import { useQuote } from "../hooks/useQuote";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useSwap } from "../hooks/useSwap";
import { getAddressesFor, type ContractsOnChain } from "../config/addresses";
import { toUnits, fromUnits } from "../lib/format";
import { maxUint256 } from "viem";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useSettings } from "../context/Settings";
import { useToasts } from "../context/Toasts";
import { humanError } from "../lib/errors";
import Button from "./ui/Button";
import Input from "./ui/Input";

const shortenAddress = (adr?: string) =>
  adr && adr.startsWith("0x") ? `${adr.slice(0, 6)}…${adr.slice(-4)}` : adr ?? "";

// slippage helper (bps = basis points)
function applySlippage(amount: bigint, bps: number) {
  // x−x⋅0.005 = x(1−0.005) = 0.995x
  // 1% = 100 bps, 100% = 10,000 bps 
  // x (1- 5/100) =  x (1- 50/ 10, 000)
  return (amount * BigInt(10_000 - bps)) / 10_000n;
}

export default function SwapPanel() {
  const [tokenIn, setTokenIn] = useState<string>("");
  const [tokenOut, setTokenOut] = useState<string>("");
  const [amountInStr, setAmountInStr] = useState<string>("");

  const { address } = useAccount();


  const chainId = useChainId() ?? 31337;

  // global settings (slippage, approval mode) + toasts
  const settings = useSettings();
  const { push } = useToasts();
  const swapNotifiedRef = useRef(false);
  const approveNotifiedRef = useRef(false);


  // resolve addresses for active chain
  // only get once and memoize
  // if chain Id changes , then refetch
  const addresses = useMemo<ContractsOnChain | null>(() => {
    try {
      return getAddressesFor(chainId);
    } catch {
      return null;
    }
  }, [chainId]);

  const router = addresses?.UniswapV2Router02 as `0x${string}` | undefined;
  const WETH = addresses?.WETH9 as `0x${string}` | undefined;

  // balances & decimals
  const inTok = useTokenBalance(tokenIn || undefined);
  const outTok = useTokenBalance(tokenOut || undefined);
  const decIn = inTok.decimals ?? 18;
  const decOut = outTok.decimals ?? 18;

  // amount parsing
  const amountIn = useMemo(() => toUnits(amountInStr || "0", decIn), [amountInStr, decIn]);

  // quote (handles ETH/WETH wraps inside hook)
  const { amountOut, isLoading: quoting, error: quoteError } = useQuote({
    amountIn,
    tokenIn,
    tokenOut,
  });
  const minOut = useMemo(() => applySlippage(amountOut, settings.slippageBps), [amountOut, settings.slippageBps]);

  // approval needs
  const isInETH = tokenIn === NATIVE_ETH;
  const isOutETH = tokenOut === NATIVE_ETH;

  // If we implement native wrap/unwrap (WETH<->ETH) directly, no approval is needed for that path.
  const skipApproval = isInETH || (tokenIn && WETH && tokenIn === WETH && isOutETH);

  const { allowance, isLoading: loadingAllow } = useAllowance(
    skipApproval ? undefined : (tokenIn || undefined) as `0x${string}` | undefined,
    router
  );

  const { approve, isPending: approving, isMining: approvingMining, isSuccess: approved, writeError, waitError } =
    useApprove(skipApproval ? undefined : (tokenIn || undefined) as `0x${string}` | undefined);

  // after approval success: toast once
  useEffect(() => {
    if (approved && !approveNotifiedRef.current) {
      approveNotifiedRef.current = true;
      push({ kind: "success", text: "Approval confirmed" }, "approve:in"); // ← key
    }
    if (!approving && !approvingMining && !approved) approveNotifiedRef.current = false;
  }, [approved, approving, approvingMining, push]);



  const needsApproval = !skipApproval && !!tokenIn && !!router && amountIn > 0n && allowance < amountIn;
  const approveAmount = settings.approvalMode === "unlimited" ? maxUint256 : amountIn;

  // balance guard
  const insufficient = amountIn > (inTok.balance ?? 0n);

  // swap
  const { swap, isPending: swapping, isMining: swapMining, isSuccess: swapOk, error: swapError } = useSwap();

  // after swap success: toast once, clear input, refresh balances
  // after swap success
  useEffect(() => {
    if (swapOk && !swapping && !swapMining && !swapNotifiedRef.current) {
      swapNotifiedRef.current = true;
      push({ kind: "success", text: "Swap complete" }, "swap:ok"); // ← key
      setAmountInStr("");
      inTok.refetch?.();
      outTok.refetch?.();
    }
    if (!swapping && !swapMining && !swapOk) swapNotifiedRef.current = false;
  }, [swapOk, swapping, swapMining, push]);

  async function onSwap() {
    if (!tokenIn || !tokenOut || amountIn === 0n || insufficient) return;
    await swap({
      amountIn,
      amountOutMin: minOut,
      tokenIn,
      tokenOut,
      to: address as `0x${string}`,
    });
  }

  return (
    <div className="grid w-full max-w-xl gap-3 rounded-lg border bg-white p-4">
      <h3 className="text-lg font-semibold">Swap</h3>

      {/* FROM */}
      <TokenSelect label="From" value={tokenIn} onChange={setTokenIn} />
      <div className="text-xs text-gray-500">
        Balance: {fromUnits(inTok.balance ?? 0n, decIn)} {inTok.symbol}
      </div>
      <Input
        placeholder="Amount in"
        value={amountInStr}
        onChange={(e) => setAmountInStr(e.target.value)}
      />
      {insufficient && amountIn > 0n && (
        <div className="text-xs text-red-600">Insufficient balance</div>
      )}

      {/* TO */}
      <TokenSelect label="To" value={tokenOut} onChange={setTokenOut} />
      <div className="text-xs text-gray-500">
        Balance: {fromUnits(outTok.balance ?? 0n, decOut)} {outTok.symbol}
      </div>

      {/* Quote */}
      <div className="grid gap-1 text-sm">
        <div>
          <b>Estimated Out:</b> {quoting ? "…" : fromUnits(amountOut, decOut)}
        </div>
        <div className="flex items-center gap-2">
          <div>
            <b>Min Out ({(settings.slippageBps / 100).toFixed(2)}%):</b>{" "}
            {fromUnits(minOut, decOut)}
          </div>
          <span className="text-xs text-gray-500">
            Slippage ·{" "}
            <button onClick={() => settings.setOpen(true)} className="text-xs text-blue-600">
              Change
            </button>
          </span>
        </div>
        {quoteError && <div className="text-sm text-red-600">{humanError(quoteError)}</div>}
      </div>

      {/* Approval details */}
      {!skipApproval && needsApproval && (
        <div className="rounded-md border bg-gray-50 p-3 text-sm">
          <b>Approval required</b>
          <div>
            Spender (Router): <code title={router}>{shortenAddress(router)}</code>
          </div>
          <div>Current allowance: {fromUnits(allowance, decIn)}</div>
          <div>
            This will set your spending cap to{" "}
            <b>{settings.approvalMode === "unlimited" ? "Unlimited" : fromUnits(approveAmount, decIn)}</b>.
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Mode: <code>{settings.approvalMode}</code> (change in Settings)
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!skipApproval && needsApproval ? (
          <Button
            onClick={() => approve(router!, approveAmount)}
            disabled={
              !router ||
              approving ||
              approvingMining ||
              loadingAllow ||
              amountIn === 0n ||
              insufficient
            }
          >
            {approving ? "Confirm in wallet…" : approvingMining ? "Approving…" : "Approve"}
          </Button>
        ) : (
          <Button
            onClick={onSwap}
            disabled={
              swapping ||
              swapMining ||
              !tokenIn ||
              !tokenOut ||
              amountIn === 0n ||
              !!quoteError ||
              insufficient
            }
          >
            {swapping ? "Confirm in wallet…" : swapMining ? "Swapping…" : "Swap"}
          </Button>
        )}
      </div>

      {(writeError || waitError || swapError) && (
        <div className="text-sm text-red-600">{humanError(writeError || waitError || swapError)}</div>
      )}

      {swapOk && <div className="text-green-600">Swap complete ✅</div>}
    </div>
  );
}
