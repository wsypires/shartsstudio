import { useState, useEffect } from "react";
import { useBinanceStore } from "../../services/binance/useBinanceStore.ts";
import { Button } from "../ui/button.tsx";
import { RefreshCw, Trash2, X, Clock, CheckCircle2, History } from "lucide-react";
import { formatNumber } from "../../lib/utils.ts";

export function BinanceOrdersTab() {
  const {
    openOrders,
    trades,
    orderHistory,
    fetchOpenOrders,
    fetchTrades,
    fetchOrderHistory,
    cancelOrder,
    cancelAllOrders,
    selectedSymbol,
    mode,
  } = useBinanceStore();

  const [subTab, setSubTab] = useState<"open" | "trades" | "history">("open");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [isCancellingAll, setIsCancellingAll] = useState(false);

  useEffect(() => {
    if (mode !== "demo") {
      fetchOpenOrders();
      if (subTab === "trades") fetchTrades();
      if (subTab === "history") fetchOrderHistory();
    }
  }, [mode, subTab, fetchOpenOrders, fetchTrades, fetchOrderHistory]);

  const handleCancelOrder = async (symbol: string, orderId: number) => {
    setCancellingId(orderId);
    await cancelOrder(symbol, orderId);
    setCancellingId(null);
  };

  const handleCancelAll = async () => {
    setIsCancellingAll(true);
    await cancelAllOrders(selectedSymbol);
    setIsCancellingAll(false);
  };

  if (mode === "demo") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500">
        <Clock className="w-8 h-8 mb-2 opacity-40" />
        <div className="text-sm font-medium text-neutral-400">In Demo Mode</div>
        <div className="text-xs text-neutral-500 max-w-xs mt-1">
          Switch to Binance Testnet or Binance Live to view live Binance exchange orders.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Sub Tabs & Action Bar */}
      <div className="flex items-center justify-between border-b border-[#222734] pb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("open")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              subTab === "open"
                ? "bg-[#F3BA2F]/15 text-[#F3BA2F] border border-[#F3BA2F]/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Open Orders ({openOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("trades")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              subTab === "trades"
                ? "bg-[#F3BA2F]/15 text-[#F3BA2F] border border-[#F3BA2F]/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Trade Fills ({trades.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("history")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              subTab === "history"
                ? "bg-[#F3BA2F]/15 text-[#F3BA2F] border border-[#F3BA2F]/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Order History ({orderHistory.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === "open" && openOrders.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelAll}
              disabled={isCancellingAll}
              className="h-7 text-xs border-rose-900/50 text-rose-400 hover:bg-rose-950/40"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Cancel All ({selectedSymbol})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (subTab === "open") fetchOpenOrders();
              if (subTab === "trades") fetchTrades();
              if (subTab === "history") fetchOrderHistory();
            }}
            className="h-7 text-xs border-[#2b3240] text-neutral-300 hover:bg-[#1a202c]"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sub Tab Contents */}
      {subTab === "open" && (
        <>
          {openOrders.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              No open orders found on Binance.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[#222734] text-neutral-400 text-[11px] uppercase">
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Side</th>
                    <th className="py-2 px-3">Price</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Filled</th>
                    <th className="py-2 px-3">Order ID</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e232d]">
                  {openOrders.map((o) => (
                    <tr key={o.orderId} className="hover:bg-[#161a22]">
                      <td className="py-2.5 px-3 font-bold text-white">{o.symbol}</td>
                      <td className="py-2.5 px-3 text-neutral-300">{o.type}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                            o.side === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {o.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white font-medium">
                        {parseFloat(o.price) > 0 ? parseFloat(o.price).toLocaleString() : "MARKET"}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        {parseFloat(o.origQty).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">
                        {parseFloat(o.executedQty).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 text-[11px]">{o.orderId}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelOrder(o.symbol, o.orderId)}
                          disabled={cancellingId === o.orderId}
                          className="h-6 px-2 text-[11px] text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                        >
                          {cancellingId === o.orderId ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3 mr-1" />
                          )}
                          Cancel
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {subTab === "trades" && (
        <>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              No recent trade fills found for {selectedSymbol}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[#222734] text-neutral-400 text-[11px] uppercase">
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3">Side</th>
                    <th className="py-2 px-3">Price</th>
                    <th className="py-2 px-3">Quantity</th>
                    <th className="py-2 px-3">Total Quote</th>
                    <th className="py-2 px-3">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e232d]">
                  {trades.map((t) => (
                    <tr key={t.id} className="hover:bg-[#161a22]">
                      <td className="py-2 px-3 text-neutral-400 text-[11px]">
                        {new Date(t.time).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 font-bold text-white">{t.symbol}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                            t.isBuyer
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {t.isBuyer ? "BUY" : "SELL"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-white">
                        {parseFloat(t.price).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-neutral-300">
                        {parseFloat(t.qty).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-neutral-300">
                        {parseFloat(t.quoteQty).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-neutral-400 text-[11px]">
                        {t.commission} {t.commissionAsset}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {subTab === "history" && (
        <>
          {orderHistory.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              No historic orders found for {selectedSymbol}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[#222734] text-neutral-400 text-[11px] uppercase">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Side</th>
                    <th className="py-2 px-3">Price</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e232d]">
                  {orderHistory.map((o) => (
                    <tr key={o.orderId} className="hover:bg-[#161a22]">
                      <td className="py-2 px-3 text-neutral-400 text-[11px]">
                        {o.time ? new Date(o.time).toLocaleString() : "-"}
                      </td>
                      <td className="py-2 px-3 font-bold text-white">{o.symbol}</td>
                      <td className="py-2 px-3 text-neutral-300">{o.type}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                            o.side === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {o.side}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-white font-medium">
                        {parseFloat(o.price) > 0 ? parseFloat(o.price).toLocaleString() : "MARKET"}
                      </td>
                      <td className="py-2 px-3 text-neutral-300">
                        {parseFloat(o.origQty).toLocaleString()}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            o.status === "FILLED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : o.status === "CANCELED"
                              ? "bg-neutral-800 text-neutral-400"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
