// src/components/WalletButton.tsx
import { useAccount, useConnect } from "wagmi";
import Button from "./ui/Button";

export default function WalletButton() {
  const { isConnected } = useAccount();
  const { connectors, connect, status, error } = useConnect();

  if (isConnected) return null;

  // Prefer the injected connector (MetaMask), fallback to first
  const injected =
    connectors.find((c) => c.id === "injected" || c.type === "injected") ??
    connectors[0];

  const pending = status === "pending";

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        onClick={() => injected && connect({ connector: injected })}
        disabled={pending || !injected}
      >
        {pending ? "Connecting…" : "Connect"}
      </Button>
      {error && (
        <span className="text-xs text-red-600">
          {(error as any).shortMessage || (error as Error).message}
        </span>
      )}
    </div>
  );
}

// import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
// import { foundry } from "viem/chains";
// import { isSupportedChain } from "../config/networks";

// function short(addr?: string) { return addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : ""; }

// export default function WalletButton() {
//     // wagmi hooks
//   const chainId = useChainId();
//   const { address, isConnected } = useAccount();
//   // Connectors for popular wallet providers and protocols
//   //https://wagmi.sh/react/api/connectors
//   const { connectors, connect, status: connectStatus } = useConnect();
//   const { disconnect } = useDisconnect();
//   const { switchChain, status: switchStatus } = useSwitchChain();
//   const injected = connectors.find(c => c.id === "injected");

//   return (
//     <div style={{
//       position: "fixed", top: 12, left: 12, display: "flex", gap: 8, alignItems: "center"
//     }}>
//       {!isConnected ? (
//         <button
//           onClick={() => injected && connect({ connector: injected })}
//           disabled={!injected || connectStatus === "pending"}
//         >
//           {connectStatus === "pending" ? "Connecting…" : "Connect Wallet"}
//         </button>
//       ) : (
//         <>
//           <span>{short(address)}{chainId ? ` · chain ${chainId}` : ""}</span>
//           <button onClick={() => disconnect()}>Disconnect</button>
//         </>
//       )}

//       {/* Wrong-network helper (for dev UX): offer Add/Switch to Anvil */}
//       {isConnected && !isSupportedChain(chainId) && (
//         <button
//           onClick={() => switchChain({ chainId: foundry.id })}
//           disabled={switchStatus === "pending"}
//           title="Add/Switch to Anvil (31337)"
//         >
//           Add/Switch Anvil
//         </button>
//       )}
//     </div>
//   );
// }
