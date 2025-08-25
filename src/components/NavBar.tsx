import { NavLink, Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import WalletButton from "./WalletButton";
import { useAppNetwork } from "../context/AppNetwork";
import { useSettings } from "../context/Settings";
import Button from "./ui/Button";
import { clsx } from "clsx";

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
    <header className="flex items-center gap-4 p-4 border-b">
      <Link to="/" className="font-bold text-gray-900 no-underline">
        uni-v2 demo
      </Link>

      <nav className="flex gap-3">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              clsx(
                "px-3 py-1 rounded-md no-underline",
                isActive
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      {/* Right corner */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs px-2 py-1 border rounded-full bg-gray-50">
          {chainName(chainId)} · <code>{chainId}</code>
        </span>

        {isConnected && (
          <span className="text-xs px-2 py-1 border rounded-full bg-gray-50">
            {short(address)}
          </span>
        )}
        <Button variant="secondary" size="sm" onClick={() => settings.setOpen(true)}>
          Settings
        </Button>

        {isConnected ? (
          <Button variant="secondary" size="sm" onClick={() => disconnect()}>
            Disconnect
          </Button>
        ) : (
          <WalletButton />
        )}
      </div>
    </header>
  );
}
