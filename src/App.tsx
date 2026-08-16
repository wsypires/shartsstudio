import { useEffect, useState } from "react";
import { TradingPage } from "./pages/TradingPage.tsx";
import { useAuthStore, useTradingStore } from "./services/store.tsx";
import { useBinanceStore } from "./services/binance/useBinanceStore.ts";

/**
 * OpenCharts entry point with Official Binance Trading Connector support.
 */
export function App() {
  const [ready, setReady] = useState(false);
  const demoLogin = useAuthStore((s) => s.demoLogin);
  const loadSymbols = useTradingStore((s) => s.loadSymbols);
  const loadAccounts = useTradingStore((s) => s.loadAccounts);
  const loadStoredConfig = useBinanceStore((s) => s.loadStoredConfig);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      await demoLogin();
      localStorage.setItem("is_demo", "false");
      useAuthStore.setState({ isDemo: false });
      await Promise.all([loadSymbols(), loadAccounts(), loadStoredConfig()]);
      if (!cancelled) setReady(true);
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [demoLogin, loadSymbols, loadAccounts, loadStoredConfig]);

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a] text-neutral-400">
        Loading OpenCharts…
      </div>
    );
  }

  return <TradingPage />;
}
