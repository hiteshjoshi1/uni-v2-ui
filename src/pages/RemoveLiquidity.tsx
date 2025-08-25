import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useAppNetwork } from "../context/AppNetwork";
import { useFactoryPairs } from "../hooks/useFactoryPairs";
import { useUserPositions, type UserPosition } from "../hooks/useUserPositions";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useRemoveLiquidity } from "../hooks/useRemoveLiquidity";
import { fromUnits } from "../lib/format";
import { useLocation } from "react-router-dom";

function pctOf(n: bigint, bps: number) {
  return (n * BigInt(bps)) / 10_000n;
}
function minusSlippage(n: bigint, bps: number) {
  return (n * BigInt(10_000 - bps)) / 10_000n;
}
const short = (a?: string) => (a && a.startsWith("0x") ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "");

export default function RemoveLiquidityPage() {
  const { supported, chainId, addresses } = useAppNetwork();
  const { isConnected } = useAccount();
  const router = addresses?.UniswapV2Router02 as `0x${string}` | undefined;
  const WETH = addresses?.WETH9 as `0x${string}` | undefined;
  const loc = useLocation() as { state?: { pair?: string; tokenA?: string; tokenB?: string } };
  const wantedPair = loc.state?.pair?.toLowerCase();

  // 1) discover all pairs from factory + (optionally) prelisted
  const { pairs: fromFactory, isLoading: loadingPairs, error: pairsError } = useFactoryPairs();
  const prelisted = useMemo(() => {
    if (!addresses) return [] as `0x${string}`[];
    const maybe = [addresses.WETH_USDC_Pair, addresses.WETH_DAI_Pair, addresses.DAI_USDC_Pair];
    return maybe.filter((p): p is `0x${string}` => !!p);
  }, [addresses]);
  const allPairs = useMemo(() => {
    const m = new Map<string, `0x${string}`>();
    for (const p of prelisted) m.set(p.toLowerCase(), p);
    for (const p of fromFactory) m.set(p.toLowerCase(), p);
    return Array.from(m.values());
  }, [prelisted, fromFactory]);

  // 2) user positions on those pairs, then keep only where LP > 0
  const { positions, isLoading: loadingPos, error: posError } = useUserPositions(allPairs);
  const mine = useMemo(() => positions.filter(p => p.lpBalance > 0n), [positions]);

  // 3) selected position
  const [sel, setSel] = useState<string>("");

  useEffect(() => {
    if (!mine.length) return;
    // prefer exact pair from state
    if (!sel && wantedPair) {
      const f = mine.find(x => x.pair.toLowerCase() === wantedPair);
      if (f) { setSel(f.pair); return; }
    }
    // (keep your existing tokenA/tokenB preselect or default to first)
    if (!sel) setSel(mine[0].pair);
  }, [mine, sel, wantedPair]);

  const p: UserPosition | undefined = useMemo(
    () => mine.find(x => x.pair.toLowerCase() === sel.toLowerCase()),
    [mine, sel]
  );

  // 4) remove settings
  const [pct, setPct] = useState<number>(10000); // 100%
  const [slipBps] = useState<number>(50);
  const [unwrap, setUnwrap] = useState<boolean>(true);
  useEffect(() => {
    if (!p || !WETH) return;
    const hasWeth = p.token0.toLowerCase() === WETH.toLowerCase() || p.token1.toLowerCase() === WETH.toLowerCase();
    setUnwrap(hasWeth); // default unwrap when WETH is present
  }, [p, WETH]);

  const liq = p ? pctOf(p.lpBalance, pct) : 0n;
  const exp0 = p ? (p.totalSupply === 0n ? 0n : (p.reserve0 * liq) / p.totalSupply) : 0n;
  const exp1 = p ? (p.totalSupply === 0n ? 0n : (p.reserve1 * liq) / p.totalSupply) : 0n;
  const min0 = minusSlippage(exp0, slipBps);
  const min1 = minusSlippage(exp1, slipBps);

  // 5) LP approval (spender = router, token = pair address)
  const { allowance, isLoading: loadAllow, refetch } = useAllowance(p?.pair as `0x${string}` | undefined, router);
  const { approve, isPending: apPending, isMining: apMining, isSuccess: apOk } = useApprove(p?.pair as `0x${string}` | undefined);
  useEffect(() => { if (apOk) refetch(); }, [apOk, refetch]);
  const needsApprove = !!p && liq > 0n && allowance < liq;

  // 6) remove
  const { remove, isPending, isMining, isSuccess, error } = useRemoveLiquidity();
  async function onRemove() {
    if (!p || !router || liq === 0n) return;
    await remove({
      tokenA: p.token0 as `0x${string}`,
      tokenB: p.token1 as `0x${string}`,
      liquidity: liq,
      amountAMin: min0,
      amountBMin: min1,
      unwrapETH: unwrap,
    });
  }

  if (!supported) return <main className="p-4"><b>Wrong network</b> (chain {chainId})</main>;
  if (!isConnected) return <main className="p-4">Connect your wallet to remove liquidity.</main>;

  return (
    <main className="p-4 flex justify-center">
      <div className="grid w-full max-w-3xl gap-4">
      <h3 className="text-lg font-semibold">Remove Liquidity</h3>

      {(loadingPairs || loadingPos) && <div>Loading pools…</div>}
      {(pairsError || posError) && <div style={{ color: "crimson" }}>{(pairsError || posError)!.message}</div>}
      {mine.length === 0 && !(loadingPairs || loadingPos) && <div>You don’t have any LP tokens on this network.</div>}

      {mine.length > 0 && (
        <>
          {/* Pair selector */}
          <div style={{ display: "grid", gap: 6 }}>
            <label>Choose a pool</label>
            <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ padding: 8 }}>
              {mine.map(x => (
                <option key={x.pair} value={x.pair}>
                  {x.symbol0}-{x.symbol1} • {short(x.pair)}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          {p && (
            <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, display: "grid", gap: 8 }}>
              <div>
                <b>LP balance:</b> {fromUnits(p.lpBalance, 18)} UNI-V2
                {"  "}· <b>Share:</b> {(p.shareBps / 100).toFixed(2)}%
              </div>
              <div>
                <b>Reserves:</b> {fromUnits(p.reserve0, p.decimals0)} {p.symbol0} /
                {" "}{fromUnits(p.reserve1, p.decimals1)} {p.symbol1}
              </div>
            </div>
          )}

          {/* Controls */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label>Percentage:</label>
              <input
                type="range" min={1} max={10000} step={1}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                style={{ width: 260 }}
              />
              <span>{(pct / 100).toFixed(2)}%</span>
              {[2500, 5000, 7500, 10000].map(v => (
                <button key={v} onClick={() => setPct(v)}>{v / 100}%</button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>LP to burn: <b>{fromUnits(liq, 18)} UNI-V2</b></div>
              <div>Min out: <b>{fromUnits(min0, p?.decimals0 ?? 18)} {p?.symbol0}</b> + <b>{fromUnits(min1, p?.decimals1 ?? 18)} {p?.symbol1}</b></div>
            </div>

            {p && WETH && (
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={unwrap}
                  onChange={(e) => setUnwrap(e.target.checked)}
                  disabled={
                    !(p.token0.toLowerCase() === WETH.toLowerCase() || p.token1.toLowerCase() === WETH.toLowerCase())
                  }
                />
                Unwrap WETH to ETH (if pool contains WETH)
              </label>
            )}

            {/* Approve LP if needed */}
            {needsApprove && (
              <button
                onClick={() => approve(router!, liq)}
                disabled={apPending || apMining || loadAllow || liq === 0n || !router}
              >
                {apPending ? "Confirm in wallet…" : apMining ? "Approving LP…" : "Approve LP"}
              </button>
            )}

            {/* Remove */}
            <button
              onClick={onRemove}
              disabled={needsApprove || !p || liq === 0n || isPending || isMining}
            >
              {isPending ? "Confirm in wallet…" : isMining ? "Removing…" : "Remove"}
            </button>

            {error && <div style={{ color: "crimson" }}>{error.message}</div>}
            {isSuccess && <div style={{ color: "green" }}>Removed ✅</div>}
          </div>
        </>
      )}
      </div>
    </main>
  );
}
