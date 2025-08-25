// src/components/AddLiquidityPanel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import TokenSelect, { NATIVE_ETH } from "./TokenSelect";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { toUnits, fromUnits } from "../lib/format";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useAddLiquidity } from "../hooks/useAddLiquidity";
import { usePairInfo } from "../hooks/usePairInfo";
import { useSettings } from "../context/Settings";
import { useToasts } from "../context/Toasts";
import { useAccount, useChainId } from "wagmi";
import { getAddressesFor, type ContractsOnChain } from "../config/addresses";
import { humanError } from "../lib/errors";
import { maxUint256 } from "viem";

const mulDiv = (a: bigint, b: bigint, d: bigint) => (a * b) / d;

export default function AddLiquidityPanel() {
  // selections & inputs
  const [tokenA, setTokenA] = useState<string>("");
  const [tokenB, setTokenB] = useState<string>("");
  const [aStr, setAStr] = useState<string>("");
  const [bStr, setBStr] = useState<string>("");

  const chainId = useChainId() ?? 31337;
  const { address: me } = useAccount();
  const settings = useSettings();
  const { push } = useToasts();

  // addresses (router/WETH)
  const addresses = useMemo<ContractsOnChain | null>(() => {
    try { return getAddressesFor(chainId); } catch { return null; }
  }, [chainId]);
  const router = addresses?.UniswapV2Router02 as `0x${string}` | undefined;
  const WETH = addresses?.WETH9;

  // normalize for pair lookups: ETH → WETH
  const normA = tokenA === NATIVE_ETH ? (WETH ?? undefined) : (tokenA || undefined);
  const normB = tokenB === NATIVE_ETH ? (WETH ?? undefined) : (tokenB || undefined);

  // balances/decimals
  const aTok = useTokenBalance(tokenA || undefined);
  const bTok = useTokenBalance(tokenB || undefined);
  const decA = aTok.decimals ?? 18;
  const decB = bTok.decimals ?? 18;

  // parsed
  const amtA = useMemo(() => toUnits(aStr || "0", decA), [aStr, decA]);
  const amtB = useMemo(() => toUnits(bStr || "0", decB), [bStr, decB]);

  const isETHA = tokenA === NATIVE_ETH;
  const isETHB = tokenB === NATIVE_ETH;
  const isEthPair = (isETHA ? 1 : 0) + (isETHB ? 1 : 0) === 1; // exactly one side is ETH
  const isEthEth = isETHA && isETHB;

  // pair info (reserves map to tokenA/tokenB order you pass)
  const {
    reserveA, reserveB, exists,
    isLoading: loadingPair, error: pairError
  } = usePairInfo(normA, normB);

  // optimal B only when pool exists AND amount A > 0
  const optimalB = useMemo(() => {
    if (!exists || amtA === 0n || reserveA === 0n) return 0n;
    return mulDiv(amtA, reserveB, reserveA);
  }, [exists, amtA, reserveA, reserveB]);

  // allowances (only for the ERC-20 side(s))
  const { allowance: allowA, isLoading: loadingAllowA, refetch: refetchAllowA } =
    useAllowance(isETHA ? undefined : (tokenA || undefined) as `0x${string}` | undefined, router);
  const { allowance: allowB, isLoading: loadingAllowB, refetch: refetchAllowB } =
    useAllowance(isETHB ? undefined : (tokenB || undefined) as `0x${string}` | undefined, router);

  const {
    approve: approveA,
    isPending: approvingA, isMining: approvingAMining, isSuccess: approvedA,
    writeError: approveAWriteErr, waitError: approveAWaitErr,
  } = useApprove(isETHA ? undefined : (tokenA || undefined) as `0x${string}` | undefined);

  const {
    approve: approveB,
    isPending: approvingB, isMining: approvingBMining, isSuccess: approvedB,
    writeError: approveBWriteErr, waitError: approveBWaitErr,
  } = useApprove(isETHB ? undefined : (tokenB || undefined) as `0x${string}` | undefined);

  const needsApproveA = !!router && !!tokenA && !isETHA && amtA > 0n && (allowA < amtA);
  const needsApproveB = !!router && !!tokenB && !isETHB && amtB > 0n && (allowB < amtB);

  const approveAmtA = settings.approvalMode === "unlimited" ? maxUint256 : amtA;
  const approveAmtB = settings.approvalMode === "unlimited" ? maxUint256 : amtB;

  // supply (both ERC20/ERC20 and ERC20/ETH paths handled by the hook)
  const slippage = settings.slippageBps;
  const amountAMin = (amtA * BigInt(10_000 - slippage)) / 10_000n;
  const amountBMin = (amtB * BigInt(10_000 - slippage)) / 10_000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + settings.deadlineSec);

  const {
    addLiquidity,
    isPending: supplying, isMining: supplyMining, isSuccess: supplyOk,
    error: supplyErr,
  } = useAddLiquidity();

  // --------- toasts (strict-mode proof) ----------
  const approvedANote = useRef(false);
  const approvedBNote = useRef(false);
  const suppliedNote = useRef(false);

  useEffect(() => {
    if (approvedA && !approvedANote.current) {
      approvedANote.current = true;
      push({ kind: "success", text: "Approved token A" }, "approve:A");
      refetchAllowA?.();
    }
    if (!approvingA && !approvingAMining && !approvedA) approvedANote.current = false;
  }, [approvedA, approvingA, approvingAMining, refetchAllowA, push]);

  useEffect(() => {
    if (approvedB && !approvedBNote.current) {
      approvedBNote.current = true;
      push({ kind: "success", text: "Approved token B" }, "approve:B");
      refetchAllowB?.();
    }
    if (!approvingB && !approvingBMining && !approvedB) approvedBNote.current = false;
  }, [approvedB, approvingB, approvingBMining, refetchAllowB, push]);

  useEffect(() => {
    if (supplyOk && !supplying && !supplyMining && !suppliedNote.current) {
      suppliedNote.current = true;
      push({ kind: "success", text: "Liquidity supplied" }, "supply:ok");
      setAStr("");
      setBStr("");
      aTok.refetch?.();
      bTok.refetch?.();
    }
    if (!supplying && !supplyMining && !supplyOk) suppliedNote.current = false;
  }, [supplyOk, supplying, supplyMining, aTok, bTok, push]);
  // ------------------------------------------------

  // guards
  const tokensChosen = !!tokenA && !!tokenB && tokenA !== tokenB;
  const insufficientA = amtA > (aTok.balance ?? 0n);
  const insufficientB = amtB > (bTok.balance ?? 0n);

  const canSupply =
    !!router && !!me && tokensChosen && !isEthEth &&
    amtA > 0n && amtB > 0n &&
    !insufficientA && !insufficientB &&
    !needsApproveA && !needsApproveB;

  const showNewPoolBanner =
    tokensChosen && !loadingPair && !pairError && exists === false;

  const showOptimal =
    tokensChosen && exists && amtA > 0n && optimalB > 0n;

  async function onUseOptimalB() {
    if (showOptimal) setBStr(fromUnits(optimalB, decB));
  }

  async function onSupply() {
    if (!canSupply || !me) return;
    // Hook handles ETH vs ERC20 paths based on NATIVE_ETH sentinel
    await addLiquidity({
      tokenA,
      tokenB,
      amountADesired: amtA,
      amountBDesired: amtB,
      amountAMin,
      amountBMin,
      to: me as `0x${string}`,
      deadline,
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        maxWidth: 720,
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Add Liquidity</h3>
        <div style={{ fontSize: 12 }}>
          Slippage: {(settings.slippageBps / 100).toFixed(2)}% ·{" "}
          <button style={{ fontSize: 12 }} onClick={() => settings.setOpen(true)}>
            Change
          </button>
        </div>
      </div>

      {/* Token A */}
      <div>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Token A</div>
        <TokenSelect value={tokenA} onChange={setTokenA} />
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
          Balance: {fromUnits(aTok.balance ?? 0n, decA)} {aTok.symbol}
        </div>
        <input
          placeholder="Amount A"
          value={aStr}
          onChange={(e) => setAStr(e.target.value)}
          style={{ padding: 10, width: "100%", marginTop: 8 }}
        />
        {insufficientA && amtA > 0n && (
          <div style={{ color: "crimson", fontSize: 12 }}>Insufficient A balance</div>
        )}
      </div>

      {/* Token B */}
      <div>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Token B</div>
        <TokenSelect value={tokenB} onChange={setTokenB} />
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
          Balance: {fromUnits(bTok.balance ?? 0n, decB)} {bTok.symbol}
        </div>
        <input
          placeholder="Amount B"
          value={bStr}
          onChange={(e) => setBStr(e.target.value)}
          style={{ padding: 10, width: "100%", marginTop: 8 }}
        />
        {insufficientB && amtB > 0n && (
          <div style={{ color: "crimson", fontSize: 12 }}>Insufficient B balance</div>
        )}
      </div>

      {/* Hints */}
      {tokensChosen && (
        <div
          style={{
            background: "#f5f7f9",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #e8edf2",
            fontSize: 13,
          }}
        >
          {loadingPair ? (
            <span>Loading pool…</span>
          ) : pairError ? (
            <span style={{ color: "crimson" }}>{humanError(pairError)}</span>
          ) : showNewPoolBanner ? (
            <span>New pool: first liquidity sets the initial price.</span>
          ) : showOptimal ? (
            <span>
              Pool ratio suggests: <b>B ≈ {fromUnits(optimalB, decB)}</b> for your A.
              {" "}
              <button onClick={onUseOptimalB} style={{ marginLeft: 8, fontSize: 12 }}>
                Use optimal
              </button>
            </span>
          ) : null}
        </div>
      )}

      {/* Approvals (only for the ERC-20 side(s)) */}
      {!isEthEth && (
        <div style={{ display: "grid", gap: 8 }}>
          {!isETHA && needsApproveA && (
            <button
              onClick={() => approveA(router!, approveAmtA)}
              disabled={!router || approvingA || approvingAMining || loadingAllowA || amtA === 0n}
            >
              {approvingA ? "Confirm A in wallet…" : approvingAMining ? "Approving A…" : "Approve A"}
            </button>
          )}
          {!isETHB && needsApproveB && (
            <button
              onClick={() => approveB(router!, approveAmtB)}
              disabled={!router || approvingB || approvingBMining || loadingAllowB || amtB === 0n}
            >
              {approvingB ? "Confirm B in wallet…" : approvingBMining ? "Approving B…" : "Approve B"}
            </button>
          )}
        </div>
      )}

      {/* Supply */}
      <button onClick={onSupply} disabled={!canSupply || supplying || supplyMining}>
        {supplying ? "Confirm in wallet…" : supplyMining ? "Supplying…" : "Supply"}
      </button>

      {/* Errors */}
      {(approveAWriteErr || approveAWaitErr) && (
        <div style={{ color: "crimson" }}>{humanError(approveAWriteErr || approveAWaitErr)}</div>
      )}
      {(approveBWriteErr || approveBWaitErr) && (
        <div style={{ color: "crimson" }}>{humanError(approveBWriteErr || approveBWaitErr)}</div>
      )}
      {supplyErr && <div style={{ color: "crimson" }}>{humanError(supplyErr)}</div>}
    </div>
  );
}
