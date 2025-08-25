import { useAppNetwork } from "../context/AppNetwork";

export default function WrongNetworkBanner() {
  const { supported, chainId } = useAppNetwork();
  if (supported) return null;

  async function switchOrAdd(target: number) {
    const ethereum = (window as any).ethereum;
    if (!ethereum?.request) return alert("No wallet found");
    const hex = "0x" + target.toString(16);
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e: any) {
      if (e?.code === 4902) {
        // add chain (Anvil/Sepolia examples)
        if (target === 31337) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: hex,
              chainName: "Anvil",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: [import.meta.env.VITE_RPC_31337],
              blockExplorerUrls: [],
            }]
          });
        } else if (target === 11155111) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: hex,
              chainName: "Sepolia",
              nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: [import.meta.env.VITE_RPC_11155111],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }]
          });
        }
      }
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex gap-3 items-center">
      <b>Wrong network:</b> connected to {chainId}. Switch to Anvil or Sepolia.
      <button onClick={() => switchOrAdd(31337)}>Switch to Anvil</button>
      <button onClick={() => switchOrAdd(11155111)}>Switch to Sepolia</button>
    </div>
  );
}
