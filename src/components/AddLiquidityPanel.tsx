// src/components/AddLiquidityPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import TokenSelect, { NATIVE_ETH } from "./TokenSelect";
import { getAddressesFor, type ContractsOnChain } from "../config/addresses";
import { toUnits, fromUnits } from "../lib/format";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { usePairInfo } from "../hooks/usePairInfo";
import { useAddLiquidity } from "../hooks/useAddLiquidity";
import { useTokenBalance } from "../hooks/useTokenBalance";

function applySlippage(x: bigint, bps: number) {
  return (x * BigInt(10_000 - bps)) / 10_000n;
}

export default function AddLiquidityPanel() {
  const [tokenA, setTokenA] = useState<string>("");
  const [tokenB, setTokenB] = useState<string>("");
  const [amountAStr, setAmountAStr] = useState<string>("");
  const [amountBStr, setAmountBStr] = useState<string>("");
  const [slippageBps, setSlippageBps] = useState<number>(50);

  const { address: me } = useAccount();
  const chainId = useChainId() ?? 31337;

  const addresses = useMemo<ContractsOnChain | null>(() => {
    try { return getAddressesFor(chainId); } catch { return null; }
  }, [chainId]);
  const router = addresses?.UniswapV2Router02 as `0x${string}` | undefined;

  // Token metas & balances
  const aTok = useTokenBalance(tokenA || undefined);
  const bTok = useTokenBalance(tokenB || undefined);
  const decA = aTok.decimals ?? 18;
  const decB = bTok.decimals ?? 18;

  const amountADesired = useMemo(() => toUnits(amountAStr || "0", decA), [amountAStr, decA]);
  const amountBDesired = useMemo(() => toUnits(amountBStr || "0", decB), [amountBStr, decB]);

  // Pair info (reserves / initial)
  const { reserveA, reserveB, exists, initial, isLoading: loadingPair, error: pairError } =
    usePairInfo(tokenA, tokenB);

  // Optimal B suggestion (when pool already exists)
  const optimalB = useMemo(() => {
    if (!exists || initial || amountADesired === 0n || reserveA === 0n) return 0n;
    return (amountADesired * reserveB) / reserveA;
  }, [exists, initial, amountADesired, reserveA, reserveB]);

  // ETH/WETH guard
  const isAETH = tokenA === NATIVE_ETH;
  const isBETH = tokenB === NATIVE_ETH;
  const isEthWethPair =
    (!!addresses?.WETH9) &&
    ((isAETH && tokenB === addresses.WETH9) || (isBETH && tokenA === addresses.WETH9));

  // Allowances (skip for ETH sides)
  const { allowance: allowA, isLoading: loadAllowA, refetch: refetchA } =
    useAllowance(isAETH ? undefined : (tokenA || undefined) as `0x${string}` | undefined, router);
  const { allowance: allowB, isLoading: loadAllowB, refetch: refetchB } =
    useAllowance(isBETH ? undefined : (tokenB || undefined) as `0x${string}` | undefined, router);

  const { approve: approveA, isPending: apPendingA, isMining: apMiningA, isSuccess: apOkA } =
    useApprove(isAETH ? undefined : (tokenA || undefined) as `0x${string}` | undefined);
  const { approve: approveB, isPending: apPendingB, isMining: apMiningB, isSuccess: apOkB } =
    useApprove(isBETH ? undefined : (tokenB || undefined) as `0x${string}` | undefined);

  useEffect(() => { if (apOkA) refetchA(); }, [apOkA, refetchA]);
  useEffect(() => { if (apOkB) refetchB(); }, [apOkB, refetchB]);

  const needsApprA = !isAETH && amountADesired > 0n && allowA < amountADesired;
  const needsApprB = !isBETH && amountBDesired > 0n && allowB < amountBDesired;

  // Balance guards
  const insufficientA = amountADesired > (aTok.balance ?? 0n);
  const insufficientB = amountBDesired > (bTok.balance ?? 0n);

  // Submit
  const { addLiquidity, isPending, isMining, isSuccess, error } = useAddLiquidity();

  async function onSupply() {
    if (!tokenA || !tokenB) return;
    if (amountADesired === 0n || amountBDesired === 0n) return;
    if (insufficientA || insufficientB) return;
    if (isEthWethPair) return;

    const amountAMin = applySlippage(amountADesired, slippageBps);
    const amountBMin = applySlippage(amountBDesired, slippageBps);

    await addLiquidity({
      tokenA, tokenB,
      amountADesired, amountBDesired,
      amountAMin, amountBMin,
      to: me as `0x${string}`,
    });
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 680, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Add Liquidity</h3>

      {/* ETH/WETH block notice */}
      {isEthWethPair && (
        <div style={{ color: "#b45309", background: "#fff7ed", border: "1px solid #fde68a", padding: 10, borderRadius: 8 }}>
          Adding liquidity to <b>ETH/WETH</b> is not supported (internally becomes WETH/WETH). Use <i>Wrap / Unwrap</i> instead.
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        <TokenSelect label="Token A" value={tokenA} onChange={setTokenA} />
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Balance: {fromUnits(aTok.balance ?? 0n, decA)} {aTok.symbol}
        </div>
        <input
          placeholder="Amount A"
          value={amountAStr}
          onChange={(e) => setAmountAStr(e.target.value)}
          disabled={isEthWethPair}
        />
        {insufficientA && amountADesired > 0n && (
          <div style={{ color: "crimson", fontSize: 12 }}>Insufficient balance</div>
        )}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <TokenSelect label="Token B" value={tokenB} onChange={setTokenB} />
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Balance: {fromUnits(bTok.balance ?? 0n, decB)} {bTok.symbol}
        </div>
        <input
          placeholder="Amount B"
          value={amountBStr}
          onChange={(e) => setAmountBStr(e.target.value)}
          disabled={isEthWethPair}
        />
        {insufficientB && amountBDesired > 0n && (
          <div style={{ color: "crimson", fontSize: 12 }}>Insufficient balance</div>
        )}
      </div>

      {/* Pool helper */}
      <div style={{ fontSize: 13, background: "#f8f8f8", padding: 10, borderRadius: 8 }}>
        {loadingPair ? (
          <>Loading pool…</>
        ) : pairError ? (
          <span style={{ color: "crimson" }}>{pairError.message}</span>
        ) : initial ? (
          <>Initial liquidity: you set the starting price. Choose both amounts carefully.</>
        ) : (
          <>
            Pool ratio suggests: B ≈ <b>{fromUnits(optimalB, decB)}</b> for your A.
            {" "}
            <button
              style={{ marginLeft: 8 }}
              onClick={() => setAmountBStr(fromUnits(optimalB, decB))}
              disabled={optimalB === 0n || isEthWethPair}
            >
              Use optimal
            </button>
          </>
        )}
      </div>

      {/* Slippage */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label>Slippage (bps):</label>
        <input
          type="number"
          min={0}
          step={10}
          value={slippageBps}
          onChange={(e) => setSlippageBps(Number(e.target.value))}
          style={{ width: 120 }}
          disabled={isEthWethPair}
        />
        <small>(50 = 0.50%)</small>
      </div>

      {/* Approvals */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {needsApprA && (
          <button
            onClick={() => approveA(addresses!.UniswapV2Router02 as `0x${string}`, amountADesired)}
            disabled={isEthWethPair || apPendingA || apMiningA || loadAllowA || amountADesired === 0n || insufficientA}
          >
            {apPendingA ? "Confirm in wallet…" : apMiningA ? "Approving A…" : "Approve A"}
          </button>
        )}
        {needsApprB && (
          <button
            onClick={() => approveB(addresses!.UniswapV2Router02 as `0x${string}`, amountBDesired)}
            disabled={isEthWethPair || apPendingB || apMiningB || loadAllowB || amountBDesired === 0n || insufficientB}
          >
            {apPendingB ? "Confirm in wallet…" : apMiningB ? "Approving B…" : "Approve B"}
          </button>
        )}
      </div>

      {/* Supply */}
      <button
        onClick={onSupply}
        disabled={
          isEthWethPair ||
          !tokenA || !tokenB ||
          tokenA === tokenB ||
          amountADesired === 0n || amountBDesired === 0n ||
          insufficientA || insufficientB ||
          needsApprA || needsApprB ||
          isPending || isMining ||
          !!pairError
        }
      >
        {isPending ? "Confirm in wallet…" : isMining ? "Supplying…" : "Supply"}
      </button>

      {error && <div style={{ color: "crimson" }}>{error.message}</div>}
      {isSuccess && <div style={{ color: "green" }}>Liquidity added ✅</div>}
    </div>
  );
}
