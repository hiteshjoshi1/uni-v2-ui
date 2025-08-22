import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { config, queryClient } from "./lib/wagmi";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Viem based, with hooks */}
    <WagmiProvider config={config}>
    {/* fetching, caching, synchronizing and updating server state in your web applications */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);