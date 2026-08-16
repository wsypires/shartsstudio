import { useState } from "react";
import { useBinanceStore } from "../../services/binance/useBinanceStore.ts";
import { BinanceConnectionModal } from "./BinanceConnectionModal.tsx";
import { Zap, ShieldCheck, RefreshCw, ChevronDown, Radio } from "lucide-react";

export function BinanceModeSelector() {
  const { mode, isConnected, latencyMs, balances } = useBinanceStore();
  const [modalOpen, setModalOpen] = useState(false);

  const usdtBalance = balances.find((b) => b.asset === "USDT");
  const freeUsdt = usdtBalance ? parseFloat(usdtBalance.free) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[#272d3b] bg-[#141820] hover:bg-[#1a202c] hover:border-[#384154] transition-all text-xs"
        title="Click to configure Binance official trading system"
      >
        {/* Binance Logo / Icon */}
        <div className="w-4 h-4 flex items-center justify-center text-[#F3BA2F]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 2.5L7.2 7.3l2.4 2.4L12 7.3l2.4 2.4 2.4-2.4L12 2.5zm-6.5 6.5L3 11.5l2.5 2.5 2.5-2.5-2.5-2.5zm13 0l-2.5 2.5 2.5 2.5L21 11.5l-2.5-2.5zm-6.5 1.5l-2.4 2.4 2.4 2.4 2.4-2.4-2.4-2.4zM3 16.5l2.5 2.5 2.4-2.4-2.4-2.4L3 16.5zm13 0l2.4 2.4 2.5-2.5-2.5-2.5-2.4 2.4zM12 18.5l-2.4 2.4 2.4 2.4 2.4-2.4L12 18.5z" />
          </svg>
        </div>

        {/* Badge & Mode Name */}
        <div className="flex items-center gap-1.5">
          {mode === "binance_testnet" && (
            <span className="font-semibold text-[#F3BA2F]">Binance Testnet</span>
          )}
          {mode === "binance_live" && (
            <span className="font-semibold text-emerald-400">Binance Live</span>
          )}
          {mode === "demo" && (
            <span className="font-medium text-neutral-300">Demo Paper</span>
          )}

          {/* Connection Status Dot */}
          {mode !== "demo" && (
            <div className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-500"
                }`}
              />
              {isConnected && latencyMs > 0 && (
                <span className="text-[10px] text-neutral-500 font-mono">
                  {latencyMs}ms
                </span>
              )}
            </div>
          )}
        </div>

        {/* Balance preview if in Binance mode */}
        {mode !== "demo" && isConnected && (
          <div className="border-l border-[#272d3b] pl-2 text-[11px] text-neutral-300 font-mono hidden sm:inline-block">
            {freeUsdt > 0 ? `${freeUsdt.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT` : "Connected"}
          </div>
        )}

        <ChevronDown className="w-3 h-3 text-neutral-500" />
      </button>

      <BinanceConnectionModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
