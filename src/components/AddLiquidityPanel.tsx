// src/components/AddLiquidityPanel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import TokenSelect, { NATIVE_ETH } from "./TokenSelect";
import { getAddressesFor, type ContractsOnChain } from "../config/addresses";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { toUnits, fromUnits } from "../lib/format";
import { usePairInfo } from "../hooks/usePairInfo";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useAddLiquidity } from "../hooks/useAddLiquidity";
import { maxUint256 } from "viem";
import { useSettings } from "../context/Settings";
import { useToasts } from "../context/Toasts";
import { humanError } from "../lib/errors";
import Button from "./ui/Button";

function applySlippage(x: bigint, bps: number) {
  return (x * BigInt(10_000 - bps)) / 10_000n;
}

export default function AddLiquidityPanel() {
  // selections & inputs
  const [tokenA, setTokenA] = useState<string>("");
  const [tokenB, setTokenB] = useState<string>("");
  const [amountAStr, setAmountAStr] = useState<string>("");
  const [amountBStr, setAmountBStr] = useState<string>("");

  const { address: me } = useAccount();
  const chainId = useChainId() ?? 31337;

  // global settings (slippage, approval mode) + toasts
  const settings = useSettings();
  const { push } = useToasts();

  // chain-specific addresses
  const addresses = useMemo<ContractsOnChain | null>(() => {
    try { return getAddressesFor(chainId); } catch { return null; }
  }, [chainId]);
  const router = addresses?.UniswapV2Router02 as `0x${string}` | undefined;

  // token metadata & balances
  const aTok = useTokenBalance(tokenA || undefined);
  const bTok = useTokenBalance(tokenB || undefined);
  const decA = aTok.decimals ?? 18;
  const decB = bTok.decimals ?? 18;

  // parsed amounts
  const amountADesired = useMemo(() => toUnits(amountAStr || "0", decA), [amountAStr, decA]);
  const amountBDesired = useMemo(() => toUnits(amountBStr || "0", decB), [amountBStr, decB]);

  // pair info (reserves / whether initial liquidity)
  const { reserveA, reserveB, exists, initial, isLoading: loadingPair, error: pairError } =
    usePairInfo(tokenA, tokenB);

  // optimal B suggestion when pool exists
  const optimalB = useMemo(() => {
    if (!exists || initial || amountADesired === 0n || reserveA === 0n) return 0n;
    return (amountADesired * reserveB) / reserveA;
  }, [exists, initial, amountADesired, reserveA, reserveB]);

  // ETH/WETH pair guard (block ETH+WETH liquidity which degenerates to WETH/WETH)
  const isAETH = tokenA === NATIVE_ETH;
  const isBETH = tokenB === NATIVE_ETH;
  const isEthWethPair =
    (!!addresses?.WETH9) &&
    ((isAETH && tokenB === addresses.WETH9) || (isBETH && tokenA === addresses.WETH9));

  // allowances (skip for ETH)
  const { allowance: allowA, isLoading: loadAllowA, refetch: refetchA } =
    useAllowance(isAETH ? undefined : (tokenA || undefined) as `0x${string}` | undefined, router);
  const { allowance: allowB, isLoading: loadAllowB, refetch: refetchB } =
    useAllowance(isBETH ? undefined : (tokenB || undefined) as `0x${string}` | undefined, router);

  // approvals (respect global approval mode: unlimited vs exact)
  const { approve: approveA, isPending: apPendingA, isMining: apMiningA, isSuccess: apOkA, writeError: apErrA, waitError: apWaitErrA } =
    useApprove(isAETH ? undefined : (tokenA || undefined) as `0x${string}` | undefined);
  const { approve: approveB, isPending: apPendingB, isMining: apMiningB, isSuccess: apOkB, writeError: apErrB, waitError: apWaitErrB } =
    useApprove(isBETH ? undefined : (tokenB || undefined) as `0x${string}` | undefined);

  // add liquidity (hook handles ETH/Token vs Token/Token internally)
  const { addLiquidity, isPending, isMining, isSuccess, error } = useAddLiquidity();

  // --------- toasts (strict-mode proof) ----------
  const approvedANote = useRef(false);
  const approvedBNote = useRef(false);
  const suppliedNote = useRef(false);

  useEffect(() => {
    if (apOkA && !approvedANote.current) {
      approvedANote.current = true;
      push({ kind: "success", text: "Approved token A" }, "approve:A");
      refetchA?.();
    }
    if (!apPendingA && !apMiningA && !apOkA) approvedANote.current = false;
  }, [apOkA, apPendingA, apMiningA, refetchA, push]);

  useEffect(() => {
    if (apOkB && !approvedBNote.current) {
      approvedBNote.current = true;
      push({ kind: "success", text: "Approved token B" }, "approve:B");
      refetchB?.();
    }
    if (!apPendingB && !apMiningB && !apOkB) approvedBNote.current = false;
  }, [apOkB, apPendingB, apMiningB, refetchB, push]);

  useEffect(() => {
    if (isSuccess && !isPending && !isMining && !suppliedNote.current) {
      suppliedNote.current = true;
      push({ kind: "success", text: "Liquidity supplied" }, "supply:ok");
      setAmountAStr("");
      setAmountBStr("");
      aTok.refetch?.();
      bTok.refetch?.();
    }
    if (!isPending && !isMining && !isSuccess) suppliedNote.current = false;
  }, [isSuccess, isPending, isMining, aTok, bTok, push]);
  // ------------------------------------------------

  const approveAmountA = settings.approvalMode === "unlimited" ? maxUint256 : amountADesired;
  const approveAmountB = settings.approvalMode === "unlimited" ? maxUint256 : amountBDesired;

  const needsApprA = !isAETH && amountADesired > 0n && allowA < amountADesired;
  const needsApprB = !isBETH && amountBDesired > 0n && allowB < amountBDesired;

  // balance guards
  const insufficientA = amountADesired > (aTok.balance ?? 0n);
  const insufficientB = amountBDesired > (bTok.balance ?? 0n);

  async function onSupply() {
    if (!tokenA || !tokenB) return;
    if (amountADesired === 0n || amountBDesired === 0n) return;
    if (insufficientA || insufficientB) return;
    if (isEthWethPair) return;

    const amountAMin = applySlippage(amountADesired, settings.slippageBps);
    const amountBMin = applySlippage(amountBDesired, settings.slippageBps);

    await addLiquidity({
      tokenA, tokenB,
      amountADesired, amountBDesired,
      amountAMin, amountBMin,
      to: me as `0x${string}`,
      // deadline is applied inside the hook from global settings (if you wired it there);
      // if your hook expects it here, pass: deadline: BigInt(Math.floor(Date.now()/1000) + settings.deadlineSec)
    });
  }

  return (
    <div className="grid gap-3 max-w-xl w-full p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-xl font-semibold">Add Liquidity</h3>
        <div className="text-xs opacity-80">
          Slippage: {(settings.slippageBps / 100).toFixed(2)}% ·{" "}
          <Button variant="ghost" size="sm" onClick={() => settings.setOpen(true)} className="px-1">
            Change
          </Button>
        </div>
      </div>

      {/* ETH/WETH block */}
      {isEthWethPair && (
        <div className="text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
          Adding liquidity to <b>ETH/WETH</b> is not supported (internally becomes WETH/WETH). Use <i>Wrap / Unwrap</i> instead.
        </div>
      )}

      {/* Token A */}
      <div className="grid gap-2">
        <TokenSelect label="Token A" value={tokenA} onChange={setTokenA} />
        <div className="text-xs opacity-80">
          Balance: {fromUnits(aTok.balance ?? 0n, decA)} {aTok.symbol}
        </div>
        <input
          placeholder="Amount A"
          value={amountAStr}
          onChange={(e) => setAmountAStr(e.target.value)}
          disabled={isEthWethPair}
          className="p-2 border rounded"
        />
        {insufficientA && amountADesired > 0n && (
          <div className="text-xs text-red-600">Insufficient balance</div>
        )}
      </div>

      {/* Token B */}
      <div className="grid gap-2">
        <TokenSelect label="Token B" value={tokenB} onChange={setTokenB} />
        <div className="text-xs opacity-80">
          Balance: {fromUnits(bTok.balance ?? 0n, decB)} {bTok.symbol}
        </div>
        <input
          placeholder="Amount B"
          value={amountBStr}
          onChange={(e) => setAmountBStr(e.target.value)}
          disabled={isEthWethPair}
          className="p-2 border rounded"
        />
        {insufficientB && amountBDesired > 0n && (
          <div className="text-xs text-red-600">Insufficient balance</div>
        )}
      </div>

      {/* Pool helper / ratio */}
      <div className="text-sm bg-gray-50 p-2 rounded border">
        {loadingPair ? (
          <>Loading pool…</>
        ) : pairError ? (
          <span className="text-red-600">{humanError(pairError)}</span>
        ) : initial ? (
          <>Initial liquidity: you set the starting price. Choose both amounts carefully.</>
        ) : (
          <>
            Pool ratio suggests: B ≈ <b>{fromUnits(optimalB, decB)}</b> for your A.
            {" "}
            <Button
              className="ml-2"
              variant="secondary"
              size="sm"
              onClick={() => setAmountBStr(fromUnits(optimalB, decB))}
              disabled={optimalB === 0n || isEthWethPair}
            >
              Use optimal
            </Button>
          </>
        )}
      </div>

      {/* Approvals */}
      <div className="flex gap-2 flex-wrap">
        {needsApprA && (
          <Button
            onClick={() => approveA(router!, approveAmountA)}
            disabled={isEthWethPair || apPendingA || apMiningA || loadAllowA || amountADesired === 0n || insufficientA || !router}
          >
            {apPendingA ? "Confirm in wallet…" : apMiningA ? "Approving A…" : "Approve A"}
          </Button>
        )}
        {needsApprB && (
          <Button
            onClick={() => approveB(router!, approveAmountB)}
            disabled={isEthWethPair || apPendingB || apMiningB || loadAllowB || amountBDesired === 0n || insufficientB || !router}
          >
            {apPendingB ? "Confirm in wallet…" : apMiningB ? "Approving B…" : "Approve B"}
          </Button>
        )}
      </div>

      {/* Supply */}
      <Button
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
      </Button>

      {/* Status */}
      {(apErrA || apWaitErrA || apErrB || apWaitErrB || error) && (
        <div className="text-red-600">{humanError(apErrA || apWaitErrA || apErrB || apWaitErrB || error)}</div>
      )}
      {isSuccess && <div className="text-green-600">Liquidity added ✅</div>}
    </div>
  );
}
