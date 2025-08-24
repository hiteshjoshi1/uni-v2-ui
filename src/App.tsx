// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import TradePage from "./pages/Trade";
import PoolsPage from "./pages/Pools";
import PositionsPage from "./pages/Positions";
import TokensPage from "./pages/Tokens";
import RemoveLiquidityPage from "./pages/RemoveLiquidity";
import { AppNetworkProvider } from "./context/AppNetwork";
import { SettingsProvider } from "./context/Settings";
import { ToastsProvider } from "./context/Toasts";
import WrongNetworkBanner from "./components/WrongNetworkBanner";
import SettingsModal from "./components/SettingsModal";
import ToastsHost from "./components/ToastsHost";

export default function App() {
  return (
    <BrowserRouter>
      <AppNetworkProvider>
        <SettingsProvider>
          <ToastsProvider>
            <WrongNetworkBanner />
            <NavBar />
            <Routes>
              <Route path="/" element={<Navigate to="/trade" replace />} />
              <Route path="/trade" element={<TradePage />} />
              <Route path="/pools" element={<PoolsPage />} />
              <Route path="/positions" element={<PositionsPage />} />
              <Route path="/remove" element={<RemoveLiquidityPage />} />
              <Route path="/tokens" element={<TokensPage />} />
              <Route path="*" element={<div style={{ padding: 16 }}>Not found</div>} />
            </Routes>
            <SettingsModal />
            <ToastsHost />
          </ToastsProvider>
        </SettingsProvider>
      </AppNetworkProvider>
    </BrowserRouter>
  );
}
