import { NavLink, Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import WalletButton from "./WalletButton";
import { useAppNetwork } from "../context/AppNetwork";

function short(a?: string) {
  return a && a.startsWith("0x") ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "";
}

function chainName(id: number) {
  switch (id) {
    case 31337: return "Anvil";
    case 11155111: return "Sepolia";
    default: return `Chain ${id}`;
  }
}

const tabs = [
  { to: "/trade", label: "Trade" },
  { to: "/pools", label: "Pools" },
  { to: "/positions", label: "My Liquidity" },
  { to: "/tokens", label: "Tokens" },
];

export default function NavBar() {
  const { chainId } = useAppNetwork();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "10px 16px", borderBottom: "1px solid #eee"
    }}>
      <Link to="/" style={{ fontWeight: 700, textDecoration: "none", color: "#111" }}>
        uni-v2 demo
      </Link>

      <nav style={{ display: "flex", gap: 12 }}>
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            style={({ isActive }) => ({
              padding: "6px 10px",
              borderRadius: 8,
              textDecoration: "none",
              color: isActive ? "#111" : "#555",
              background: isActive ? "#f2f2f2" : "transparent",
            })}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      {/* Right corner */}
      <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
        {/* Chain first */}
        <span style={{
          fontSize: 12, padding: "4px 8px", border: "1px solid #ddd",
          borderRadius: 20, background: "#fafafa"
        }}>
          {chainName(chainId)} · <code>{chainId}</code>
        </span>

        {/* Address next (only when connected) */}
        {isConnected && (
          <span style={{
            fontSize: 12, padding: "4px 8px", border: "1px solid #ddd",
            borderRadius: 20, background: "#fafafa"
          }}>
            {short(address)}
          </span>
        )}

        {/* Then Connect / Disconnect */}
        {isConnected ? (
          <button onClick={() => disconnect()}>Disconnect</button>
        ) : (
          <WalletButton />
        )}
      </div>
    </header>
  );
}
