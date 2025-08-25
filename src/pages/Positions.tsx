import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useAppNetwork } from "../context/AppNetwork";
import { useUserPositions, type UserPosition } from "../hooks/useUserPositions";
import { useFactoryPairs } from "../hooks/useFactoryPairs";
import { fromUnits } from "../lib/format";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";

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

  if (!supported) return <main className="p-4 text-center"><b>Wrong network</b> (chain {chainId})</main>;
  if (!isConnected) return <main className="p-4 text-center">Connect your wallet to view your liquidity.</main>;



  return (
    <main className="p-4">
      <div className="max-w-5xl mx-auto">
        <h3 className="text-xl font-semibold mb-4">My Liquidity</h3>

        {(loadingPairs || isLoading) && <div>Loading…</div>}
        {(pairsError || error) && <div className="text-red-600">{(pairsError || error)!.message}</div>}

        {mine.length === 0 && !(loadingPairs || isLoading) && <div>No LP positions on this network.</div>}

        {mine.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left border-b p-2">Pool</th>
                  <th className="text-left border-b p-2">LP balance</th>
                  <th className="text-left border-b p-2">Share</th>
                  <th className="text-left border-b p-2">Your {mine[0].symbol0}</th>
                  <th className="text-left border-b p-2">Your {mine[0].symbol1}</th>
                  <th className="text-left border-b p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((p) => (
                  <tr key={p.pair}>
                    <td className="border-b p-2 align-top">
                      {p.symbol0}-{p.symbol1}
                      <div className="text-xs opacity-70">
                        <code>{p.pair}</code>
                      </div>
                    </td>
                    <td className="border-b p-2 align-top">{fromUnits(p.lpBalance, 18)}</td>
                    <td className="border-b p-2 align-top">{(p.shareBps / 100).toFixed(2)}%</td>
                    <td className="border-b p-2 align-top">{fromUnits(p.amount0, p.decimals0)} {p.symbol0}</td>
                    <td className="border-b p-2 align-top">{fromUnits(p.amount1, p.decimals1)} {p.symbol1}</td>
                    <td className="border-b p-2 align-top">
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="secondary" size="sm" onClick={() => addLpToMetaMask(p)}>
                          Add LP to MetaMask
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => navigate("/remove", { state: { pair: p.pair } })}>
                          Remove
                        </Button>
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
