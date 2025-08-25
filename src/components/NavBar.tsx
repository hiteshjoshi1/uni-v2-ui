import { NavLink, Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import WalletButton from "./WalletButton";
import { useAppNetwork } from "../context/AppNetwork";
import { useSettings } from "../context/Settings";
import Button from "./ui/Button";
import { cn } from "../lib/utils";

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
  const settings = useSettings();

  return (
    <header className="flex items-center gap-4 p-4 border-b border-gray-200">
      <Link to="/" className="font-bold text-gray-900">
        uni-v2 demo
      </Link>

      <nav className="flex gap-3 text-sm">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                "px-3 py-1 rounded-md",
                isActive ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      {/* Right corner */}
      <div className="ml-auto flex items-center gap-2">
        {/* Chain first */}
        <span className="text-xs px-2 py-1 border border-gray-300 rounded-full bg-gray-50">
          {chainName(chainId)} · <code>{chainId}</code>
        </span>

        {/* Address next (only when connected) */}
        {isConnected && (
          <span className="text-xs px-2 py-1 border border-gray-300 rounded-full bg-gray-50">
            {short(address)}
          </span>
        )}
        <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={() => settings.setOpen(true)}>
          Settings
        </Button>

        {/* Then Connect / Disconnect */}
        {isConnected ? (
          <Button onClick={() => disconnect()}>Disconnect</Button>
        ) : (
          <WalletButton />
        )}
      </div>
    </header>
  );
}
