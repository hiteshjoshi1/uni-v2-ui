import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import TradePage from "./pages/Trade";
import PoolsPage from "./pages/Pools";
import PositionsPage from "./pages/Positions";
import TokensPage from "./pages/Tokens";
import { AppNetworkProvider } from "./context/AppNetwork";

export default function App() {
  return (
    <BrowserRouter>
      <AppNetworkProvider>
        <NavBar />
        <Routes>
          <Route path="/" element={<Navigate to="/trade" replace />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/pools" element={<PoolsPage />} />
          <Route path="/positions" element={<PositionsPage />} />
          <Route path="/tokens" element={<TokensPage />} />
          <Route path="*" element={<div style={{ padding: 16 }}>Not found</div>} />
        </Routes>
      </AppNetworkProvider>
    </BrowserRouter>
  );
}
