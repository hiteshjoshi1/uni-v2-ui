import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useAppNetwork } from "../context/AppNetwork";
import { useUserPositions, type UserPosition } from "../hooks/useUserPositions";
import { useFactoryPairs } from "../hooks/useFactoryPairs";
import { fromUnits } from "../lib/format";
import { useNavigate } from "react-router-dom";

export default function PositionsPage() {
  const { addresses, supported, chainId } = useAppNetwork();
  const { isConnected } = useAccount();

  // prelisted (if any)
  const prelisted = useMemo(() => {
    if (!addresses) return [] as `0x${string}`[];
    const maybe = [addresses.WETH_USDC_Pair, addresses.WETH_DAI_Pair, addresses.DAI_USDC_Pair];
    return maybe.filter((p): p is `0x${string}` => !!p);
  }, [addresses]);

  const navigate = useNavigate();

  // discover from factory
  const { pairs: fromFactory, isLoading: loadingPairs, error: pairsError } = useFactoryPairs();

  // union without duplicates (normalize by lowercasing key)
  const allPairs = useMemo(() => {
    const m = new Map<string, `0x${string}`>();
    for (const p of prelisted) if (p) m.set(p.toLowerCase(), p);
    for (const p of fromFactory) if (p) m.set(p.toLowerCase(), p);
    return Array.from(m.values());
  }, [prelisted, fromFactory]);


  // in Positions page
  async function addLpToMetaMask(p: UserPosition) {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum?.request) return alert("No wallet found.");

      await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: p.pair,     // LP token (pair) address
            symbol: "UNI-V2",    // must match on-chain symbol
            decimals: 18,
            // Optional: unique icon per pool to help distinguish:
            // image: `https://yourcdn.example/lp/${p.symbol0}-${p.symbol1}.png`,
          },
        },
      });
    } catch (e: any) {
      alert(e?.message ?? "Failed to add token");
    }
  }


  // read positions
  const { positions, isLoading, error } = useUserPositions(allPairs);

  // only pools where user holds LP > 0
  const mine = useMemo(() => positions.filter(p => p.lpBalance > 0n), [positions]);

  if (!supported) return <main className="p-4"><b>Wrong network</b> (chain {chainId})</main>;
  if (!isConnected) return <main className="p-4">Connect your wallet to view your liquidity.</main>;



  return (
    <main className="flex justify-center p-4">
      <div className="w-full max-w-5xl">
        <h3 className="text-lg font-semibold">My Liquidity</h3>

      {(loadingPairs || isLoading) && <div>Loading…</div>}
      {(pairsError || error) && <div style={{ color: "crimson" }}>{(pairsError || error)!.message}</div>}

      {mine.length === 0 && !(loadingPairs || isLoading) && <div>No LP positions on this network.</div>}

      {mine.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={th}>Pool</th>
                <th style={th}>LP balance</th>
                <th style={th}>Share</th>
                <th style={th}>Your {mine[0].symbol0}</th>
                <th style={th}>Your {mine[0].symbol1}</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((p) => (
                <tr key={p.pair}>
                  <td style={td}>
                    {p.symbol0}-{p.symbol1}
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      <code>{p.pair}</code>
                    </div>
                  </td>
                  <td style={td}>{fromUnits(p.lpBalance, 18)}</td>
                  <td style={td}>{(p.shareBps / 100).toFixed(2)}%</td>
                  <td style={td}>{fromUnits(p.amount0, p.decimals0)} {p.symbol0}</td>
                  <td style={td}>{fromUnits(p.amount1, p.decimals1)} {p.symbol1}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => addLpToMetaMask(p)}>Add LP to MetaMask</button>
                      <button onClick={() => navigate("/remove", { state: { pair: p.pair } })}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </main>
  );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px" };
const td: React.CSSProperties = { borderBottom: "1px solid #f2f2f2", padding: "10px 6px", verticalAlign: "top" };
