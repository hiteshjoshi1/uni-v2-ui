import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useAppNetwork } from "../context/AppNetwork";
import { useUserPositions } from "../hooks/useUserPositions";
import { useFactoryPairs } from "../hooks/useFactoryPairs";
import { fromUnits } from "../lib/format";

export default function PositionsPage() {
  const { addresses, supported, chainId } = useAppNetwork();
  const { isConnected } = useAccount();

  // prelisted (if any)
  const prelisted = useMemo(() => {
    if (!addresses) return [] as `0x${string}`[];
    const maybe = [addresses.WETH_USDC_Pair, addresses.WETH_DAI_Pair, addresses.DAI_USDC_Pair];
    return maybe.filter((p): p is `0x${string}` => !!p);
  }, [addresses]);

  // discover from factory
  const { pairs: fromFactory, isLoading: loadingPairs, error: pairsError } = useFactoryPairs();

  // union without duplicates (normalize by lowercasing key)
  const allPairs = useMemo(() => {
    const m = new Map<string, `0x${string}`>();
    for (const p of prelisted) if (p) m.set(p.toLowerCase(), p);
    for (const p of fromFactory) if (p) m.set(p.toLowerCase(), p);
    return Array.from(m.values());
  }, [prelisted, fromFactory]);

  // read positions
  const { positions, isLoading, error } = useUserPositions(allPairs);

  // only pools where user holds LP > 0
  const mine = useMemo(() => positions.filter(p => p.lpBalance > 0n), [positions]);

  if (!supported) return <main style={{ padding: 16 }}><b>Wrong network</b> (chain {chainId})</main>;
  if (!isConnected) return <main style={{ padding: 16 }}>Connect your wallet to view your liquidity.</main>;

  async function addLpToMetaMask(pair: `0x${string}`) {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum?.request) return alert("No wallet found.");
      // LP tokens are ERC20 with 18 decimals; symbol often “UNI-V2”
      const wasAdded = await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: pair,
            symbol: "UNI-V2", // keep ≤11 chars; generic but accurate
            decimals: 18,
          },
        },
      });
      if (!wasAdded) alert("Token not added.");
    } catch (e: any) {
      alert(e?.message ?? "Failed to add token");
    }
  }

  return (
    <main style={{ padding: 16 }}>
      <h3>My Liquidity</h3>

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
                      <button onClick={() => addLpToMetaMask(p.pair)}>Add LP to MetaMask</button>
                      <button disabled>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px" };
const td: React.CSSProperties = { borderBottom: "1px solid #f2f2f2", padding: "10px 6px", verticalAlign: "top" };
