import { useState } from "react";
import { useBinanceStore } from "../../services/binance/useBinanceStore.ts";
import {
  Wallet,
  TrendingUp,
  Globe,
  Zap,
  Key,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  Search,
  Sliders,
  DollarSign,
  Activity,
  Layers,
  ArrowDownRight,
  XCircle,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { toast } from "../../services/toast.ts";
import { cn } from "../../lib/utils.ts";

export function BinanceHub() {
  const {
    mode,
    isSyncing,
    serverIp,
    accountInfo,
    apiRestrictions,
    balances,
    userAssets,
    walletBalances,
    futuresAccount,
    futuresPositions,
    deliveryAccount,
    marginAccount,
    isolatedMarginAccount,
    openOrders,
    orderHistory,
    trades,
    latencyMs,
    setSelectedSymbol,
    cancelOrder,
    cancelAllOrders,
    fetchAllData,
    runFullDiagnostic,
  } = useBinanceStore();

  const [activeTab, setActiveTab] = useState<
    "wallet" | "spot" | "futures" | "delivery" | "margin" | "permissions"
  >("wallet");

  const [searchFilter, setSearchFilter] = useState("");
  const [hideZero, setHideZero] = useState(true);
  const [copiedIp, setCopiedIp] = useState(false);

  const handleCopyIp = () => {
    if (!serverIp) return;
    navigator.clipboard.writeText(serverIp);
    setCopiedIp(true);
    toast.success("IP Copiado", `${serverIp} copiado para a área de transferência.`);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  if (mode === "demo") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-400 p-6">
        <div className="w-12 h-12 rounded-2xl bg-[#F3BA2F]/10 border border-[#F3BA2F]/20 flex items-center justify-center mb-3">
          <Wallet className="w-6 h-6 text-[#F3BA2F]" />
        </div>
        <div className="text-base font-semibold text-white">Modo Demo / Simulação Ativo</div>
        <p className="text-xs text-neutral-400 max-w-md mt-1.5 leading-relaxed">
          Para visualizar e interagir com suas carteiras reais da Binance (Spot, Futuros USDⓈ-M, Futuros COIN-M, Margem e Permissões), conecte suas chaves de API clicando no botão Binance no topo.
        </p>
      </div>
    );
  }

  // Filtered Assets
  const filteredBalances = balances.filter((b) => {
    const free = parseFloat(b.free);
    const locked = parseFloat(b.locked);
    const hasBalance = free > 0 || locked > 0;
    if (hideZero && !hasBalance) return false;
    if (!searchFilter) return true;
    return b.asset.toLowerCase().includes(searchFilter.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-neutral-200">
      {/* Sub Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#21262d] bg-[#161b22]/70 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("wallet")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
              activeTab === "wallet"
                ? "bg-[#F3BA2F] text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-[#21262d]",
            )}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Visão Geral Carteira</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("spot")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
              activeTab === "spot"
                ? "bg-[#F3BA2F] text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-[#21262d]",
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Spot ({balances.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("futures")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
              activeTab === "futures"
                ? "bg-[#F3BA2F] text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-[#21262d]",
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Futuros USDⓈ-M {futuresPositions.length > 0 && `(${futuresPositions.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("delivery")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
              activeTab === "delivery"
                ? "bg-[#F3BA2F] text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-[#21262d]",
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Futuros COIN-M</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("margin")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
              activeTab === "margin"
                ? "bg-[#F3BA2F] text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-[#21262d]",
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Margem</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
              activeTab === "permissions"
                ? "bg-[#F3BA2F] text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-[#21262d]",
            )}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Diagnóstico & Permissões</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {latencyMs > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-400 bg-[#21262d]/60 px-2 py-1 rounded-md border border-[#30363d]">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>{latencyMs}ms</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAllData()}
            disabled={isSyncing}
            className="h-7 text-xs border-[#30363d] bg-[#21262d] text-neutral-200 hover:bg-[#30363d] hover:text-white"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isSyncing ? "animate-spin text-[#F3BA2F]" : ""}`} />
            Sincronizar Tudo
          </Button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── TAB 1: VISÃO GERAL DA CARTEIRA ── */}
        {activeTab === "wallet" && (
          <div className="space-y-4">
            {/* Multi-Wallet Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Carteira Spot</span>
                  <Layers className="w-3.5 h-3.5 text-[#F3BA2F]" />
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {balances.length} <span className="text-xs font-normal text-neutral-400">ativos com saldo</span>
                </div>
                <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Conta Spot Ativa
                </div>
              </div>

              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Futuros USDⓈ-M</span>
                  <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {futuresAccount?.totalWalletBalance
                    ? parseFloat(futuresAccount.totalWalletBalance).toFixed(2) + " USDT"
                    : "--"}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  PnL Não Realizado:{" "}
                  <span
                    className={
                      parseFloat(futuresAccount?.totalUnrealizedProfit || "0") >= 0
                        ? "text-emerald-400 font-semibold"
                        : "text-rose-400 font-semibold"
                    }
                  >
                    {parseFloat(futuresAccount?.totalUnrealizedProfit || "0").toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Margem Cruzada</span>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {marginAccount?.totalNetAssetOfBtc
                    ? parseFloat(marginAccount.totalNetAssetOfBtc).toFixed(6) + " BTC"
                    : "--"}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  Nível de Margem:{" "}
                  <span className="text-amber-300 font-semibold">
                    {marginAccount?.marginLevel || "--"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Status da API</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-sm font-semibold text-white">
                  {apiRestrictions?.enableSpotAndMarginTrading ? "Spot & Margem Liberados" : "Leitura Ativa"}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  IP Restrito:{" "}
                  <span className={apiRestrictions?.ipRestrict ? "text-amber-400" : "text-emerald-400"}>
                    {apiRestrictions?.ipRestrict ? "Sim (IPs confiáveis)" : "Irrestrito"}
                  </span>
                </div>
              </div>
            </div>

            {/* Asset Table with Search and Controls */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-[#30363d] bg-[#1c2128]">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Buscar ativo (ex: USDT, BTC, ETH)..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#F3BA2F] w-56"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideZero}
                      onChange={(e) => setHideZero(e.target.checked)}
                      className="rounded border-[#30363d] text-[#F3BA2F] focus:ring-0"
                    />
                    <span>Ocultar zerados</span>
                  </label>
                </div>
                <div className="text-xs text-neutral-400">
                  Mostrando <strong className="text-white">{filteredBalances.length}</strong> de {balances.length} ativos
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#161b22] text-neutral-400 border-b border-[#30363d]">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Ativo</th>
                      <th className="px-4 py-2.5 font-medium text-right">Disponível (Livre)</th>
                      <th className="px-4 py-2.5 font-medium text-right">Em Ordens (Bloqueado)</th>
                      <th className="px-4 py-2.5 font-medium text-right">Saldo Total</th>
                      <th className="px-4 py-2.5 font-medium text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]">
                    {filteredBalances.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-neutral-500">
                          Nenhum saldo encontrado para os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredBalances.map((b) => {
                        const free = parseFloat(b.free);
                        const locked = parseFloat(b.locked);
                        const total = free + locked;
                        const pairSymbol = b.asset === "USDT" ? "BTCUSDT" : `${b.asset}USDT`;

                        return (
                          <tr key={b.asset} className="hover:bg-[#1c2128]/50 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#F3BA2F]/10 border border-[#F3BA2F]/30 flex items-center justify-center font-bold text-[10px] text-[#F3BA2F]">
                                  {b.asset.slice(0, 3)}
                                </div>
                                <span className="font-bold text-white">{b.asset}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                              {free.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-amber-300">
                              {locked > 0 ? locked.toLocaleString(undefined, { maximumFractionDigits: 8 }) : "--"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-white">
                              {total.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedSymbol(pairSymbol)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#21262d] text-[#F3BA2F] hover:bg-[#30363d] hover:text-white transition-all text-[11px] font-medium"
                                title={`Abrir gráfico de ${pairSymbol}`}
                              >
                                Negociar <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: SPOT TRADING ── */}
        {activeTab === "spot" && (
          <div className="space-y-4">
            {/* Account Info Header */}
            {accountInfo && (
              <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-neutral-400">Tipo de Conta:</span>{" "}
                    <strong className="text-white uppercase">{accountInfo.accountType}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Taxa Maker / Taker:</span>{" "}
                    <strong className="text-white font-mono">
                      {(accountInfo.makerCommission / 100).toFixed(2)}% / {(accountInfo.takerCommission / 100).toFixed(2)}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Permissão de Trade:</span>{" "}
                    <span className={accountInfo.canTrade ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {accountInfo.canTrade ? "Habilitado" : "Bloqueado"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Open Orders Section */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-[#30363d] bg-[#1c2128]">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-[#F3BA2F]" />
                  <span className="font-semibold text-xs text-white">
                    Ordens Abertas na Binance ({openOrders.length})
                  </span>
                </div>
                {openOrders.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (openOrders[0]?.symbol) cancelAllOrders(openOrders[0].symbol);
                    }}
                    className="h-6 text-[11px] px-2"
                  >
                    Cancelar Todas ({openOrders[0]?.symbol || "Par"})
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#161b22] text-neutral-400 border-b border-[#30363d]">
                    <tr>
                      <th className="px-4 py-2 font-medium">Par</th>
                      <th className="px-4 py-2 font-medium">Tipo</th>
                      <th className="px-4 py-2 font-medium">Lado</th>
                      <th className="px-4 py-2 font-medium text-right">Preço</th>
                      <th className="px-4 py-2 font-medium text-right">Quantidade</th>
                      <th className="px-4 py-2 font-medium text-right">Executado</th>
                      <th className="px-4 py-2 font-medium text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]">
                    {openOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-neutral-500">
                          Nenhuma ordem aberta no momento na Binance.
                        </td>
                      </tr>
                    ) : (
                      openOrders.map((o) => (
                        <tr key={o.orderId} className="hover:bg-[#1c2128]/50">
                          <td className="px-4 py-2.5 font-bold text-white">{o.symbol}</td>
                          <td className="px-4 py-2.5 text-neutral-300">{o.type}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                o.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400",
                              )}
                            >
                              {o.side}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-white">
                            {parseFloat(o.price) > 0 ? o.price : "MERCADO"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-neutral-200">{o.origQty}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-neutral-400">{o.executedQty}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => cancelOrder(o.symbol, o.orderId)}
                              className="text-rose-400 hover:text-rose-300 text-xs font-semibold hover:underline"
                            >
                              Cancelar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order History Section */}
            {orderHistory.length > 0 && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
                <div className="p-3 border-b border-[#30363d] bg-[#1c2128] font-semibold text-xs text-white">
                  Histórico Recente de Ordens ({orderHistory.length})
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#161b22] text-neutral-400 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-medium">Par</th>
                        <th className="px-4 py-2 font-medium">Lado</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium text-right">Preço</th>
                        <th className="px-4 py-2 font-medium text-right">Qtd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d]">
                      {orderHistory.map((h) => (
                        <tr key={h.orderId} className="hover:bg-[#1c2128]/50">
                          <td className="px-4 py-2 font-medium text-white">{h.symbol}</td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                h.side === "BUY" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"
                              }
                            >
                              {h.side}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px]",
                                h.status === "FILLED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : h.status === "CANCELED"
                                  ? "bg-neutral-700/50 text-neutral-400"
                                  : "bg-amber-500/20 text-amber-300",
                              )}
                            >
                              {h.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-white">{h.price}</td>
                          <td className="px-4 py-2 text-right font-mono text-neutral-300">{h.origQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: FUTUROS USDⓈ-M ── */}
        {activeTab === "futures" && (
          <div className="space-y-4">
            {/* Futures Balance Highlights */}
            {futuresAccount && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                  <span className="text-xs text-neutral-400">Saldo Total de Margem</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {parseFloat(futuresAccount.totalMarginBalance).toFixed(2)} USDT
                  </div>
                </div>

                <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                  <span className="text-xs text-neutral-400">PnL Não Realizado</span>
                  <div
                    className={cn(
                      "text-lg font-bold font-mono mt-0.5",
                      parseFloat(futuresAccount.totalUnrealizedProfit) >= 0 ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {parseFloat(futuresAccount.totalUnrealizedProfit).toFixed(2)} USDT
                  </div>
                </div>

                <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                  <span className="text-xs text-neutral-400">Margem de Manutenção / Inicial</span>
                  <div className="text-sm font-semibold text-neutral-200 font-mono mt-1">
                    {parseFloat(futuresAccount.totalMaintMargin).toFixed(2)} / {parseFloat(futuresAccount.totalInitialMargin).toFixed(2)} USDT
                  </div>
                </div>
              </div>
            )}

            {/* Active Positions Table */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="p-3 border-b border-[#30363d] bg-[#1c2128] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-xs text-white">
                    Posições Abertas em Futuros USDⓈ-M ({futuresPositions.length})
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#161b22] text-neutral-400 border-b border-[#30363d]">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Contrato</th>
                      <th className="px-4 py-2.5 font-medium">Tamanho / Lado</th>
                      <th className="px-4 py-2.5 font-medium text-right">Preço de Entrada</th>
                      <th className="px-4 py-2.5 font-medium text-right">Preço de Marcação</th>
                      <th className="px-4 py-2.5 font-medium text-right">Preço de Liquidação</th>
                      <th className="px-4 py-2.5 font-medium text-right">Alavancagem / Margem</th>
                      <th className="px-4 py-2.5 font-medium text-right">PnL Não Realizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]">
                    {futuresPositions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-neutral-500">
                          Nenhuma posição aberta em Futuros USDⓈ-M.
                        </td>
                      </tr>
                    ) : (
                      futuresPositions.map((pos) => {
                        const amt = parseFloat(pos.positionAmt);
                        const isLong = amt > 0;
                        const pnl = parseFloat(pos.unRealizedProfit);

                        return (
                          <tr key={pos.symbol} className="hover:bg-[#1c2128]/50">
                            <td className="px-4 py-2.5 font-bold text-white">{pos.symbol}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded font-bold text-[10px]",
                                  isLong ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400",
                                )}
                              >
                                {isLong ? "LONG" : "SHORT"} {Math.abs(amt)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-white">{pos.entryPrice}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-sky-300">{pos.markPrice}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-amber-400">
                              {parseFloat(pos.liquidationPrice) > 0 ? pos.liquidationPrice : "--"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-neutral-300">
                              {pos.leverage}x ({pos.marginType})
                            </td>
                            <td
                              className={cn(
                                "px-4 py-2.5 text-right font-mono font-bold",
                                pnl >= 0 ? "text-emerald-400" : "text-rose-400",
                              )}
                            >
                              {pnl.toFixed(2)} USDT
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: FUTUROS COIN-M ── */}
        {activeTab === "delivery" && (
          <div className="space-y-4">
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-sm text-white">Contratos Perpétuos & Trimestrais COIN-M</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Futuros margiados em criptomoedas (BTC, ETH, BNB, etc.). Seus lucros e margens são liquidados diretamente na moeda base do ativo.
              </p>
            </div>

            {deliveryAccount && deliveryAccount.assets && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
                <div className="p-3 border-b border-[#30363d] bg-[#1c2128] font-semibold text-xs text-white">
                  Saldos de Ativos COIN-M
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#161b22] text-neutral-400 border-b border-[#30363d]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Moeda</th>
                        <th className="px-4 py-2 font-medium text-right">Saldo Carteira</th>
                        <th className="px-4 py-2 font-medium text-right">Saldo Margem</th>
                        <th className="px-4 py-2 font-medium text-right">PnL Não Realizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d]">
                      {deliveryAccount.assets
                        .filter((a) => parseFloat(a.walletBalance) > 0)
                        .map((a) => (
                          <tr key={a.asset} className="hover:bg-[#1c2128]/50">
                            <td className="px-4 py-2.5 font-bold text-white">{a.asset}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-white">{a.walletBalance}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{a.marginBalance}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-neutral-300">{a.unrealizedProfit}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: MARGEM (CROSS & ISOLATED) ── */}
        {activeTab === "margin" && (
          <div className="space-y-4">
            {marginAccount && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                  <span className="text-xs text-neutral-400">Total de Ativos Líquidos (BTC)</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {parseFloat(marginAccount.totalNetAssetOfBtc).toFixed(6)} BTC
                  </div>
                </div>

                <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                  <span className="text-xs text-neutral-400">Total de Dívidas / Empréstimos (BTC)</span>
                  <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                    {parseFloat(marginAccount.totalLiabilityOfBtc).toFixed(6)} BTC
                  </div>
                </div>

                <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
                  <span className="text-xs text-neutral-400">Nível de Margem (Risco)</span>
                  <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                    {marginAccount.marginLevel}x
                  </div>
                </div>
              </div>
            )}

            {marginAccount?.userAssets && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
                <div className="p-3 border-b border-[#30363d] bg-[#1c2128] font-semibold text-xs text-white">
                  Ativos em Margem Cruzada
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#161b22] text-neutral-400 border-b border-[#30363d]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Ativo</th>
                        <th className="px-4 py-2 font-medium text-right">Livre</th>
                        <th className="px-4 py-2 font-medium text-right">Empréstimo (Dívida)</th>
                        <th className="px-4 py-2 font-medium text-right">Juros Acumulados</th>
                        <th className="px-4 py-2 font-medium text-right">Saldo Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d]">
                      {marginAccount.userAssets
                        .filter((u) => parseFloat(u.free) > 0 || parseFloat(u.borrowed) > 0)
                        .map((u) => (
                          <tr key={u.asset} className="hover:bg-[#1c2128]/50">
                            <td className="px-4 py-2.5 font-bold text-white">{u.asset}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{u.free}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-rose-400">{u.borrowed}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-amber-300">{u.interest}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-white">{u.netAsset}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 6: DIAGNÓSTICO & PERMISSÕES ── */}
        {activeTab === "permissions" && (
          <div className="space-y-4">
            {/* IP Whitelist & Action Card */}
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">Autorização de IP do Servidor</div>
                    <div className="text-xs text-neutral-400">
                      Caso sua chave Binance esteja configurada com restrição de IP, libere este endereço.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg font-mono text-xs text-emerald-400 select-all">
                    {serverIp || "Carregando IP..."}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyIp}
                    className="h-8 text-xs border-[#30363d] bg-[#21262d] text-neutral-200 hover:bg-[#30363d]"
                  >
                    {copiedIp ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedIp ? "Copiado!" : "Copiar IP"}
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#30363d] flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  Teste todos os módulos (Spot, Futuros, Margem, Carteira) com 1 clique:
                </span>
                <Button
                  size="sm"
                  onClick={() => runFullDiagnostic()}
                  className="bg-[#F3BA2F] hover:bg-[#d9a424] text-black font-semibold text-xs h-7"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" /> Rodar Diagnóstico Geral
                </Button>
              </div>
            </div>

            {/* API Restrictions Checklist */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
              <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#F3BA2F]" />
                Permissões Ativas na Chave de API (Binance SAPI)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg flex items-center justify-between">
                  <span className="text-neutral-300">Trading Spot & Margem</span>
                  {apiRestrictions?.enableSpotAndMarginTrading ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Habilitado
                    </span>
                  ) : (
                    <span className="text-neutral-500">Desabilitado</span>
                  )}
                </div>

                <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg flex items-center justify-between">
                  <span className="text-neutral-300">Trading de Futuros</span>
                  {apiRestrictions?.enableFutures ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Habilitado
                    </span>
                  ) : (
                    <span className="text-neutral-500">Desabilitado</span>
                  )}
                </div>

                <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg flex items-center justify-between">
                  <span className="text-neutral-300">Empréstimos de Margem</span>
                  {apiRestrictions?.enableMargin ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Habilitado
                    </span>
                  ) : (
                    <span className="text-neutral-500">Desabilitado</span>
                  )}
                </div>

                <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg flex items-center justify-between">
                  <span className="text-neutral-300">Opções Vanilla</span>
                  {apiRestrictions?.enableVanillaOptions ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Habilitado
                    </span>
                  ) : (
                    <span className="text-neutral-500">Desabilitado</span>
                  )}
                </div>

                <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg flex items-center justify-between">
                  <span className="text-neutral-300">Transferência Universal</span>
                  {apiRestrictions?.permitsUniversalTransfer ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Habilitado
                    </span>
                  ) : (
                    <span className="text-neutral-500">Desabilitado</span>
                  )}
                </div>

                <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg flex items-center justify-between">
                  <span className="text-neutral-300">Restrição de IP Ativa</span>
                  {apiRestrictions?.ipRestrict ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Restrito por IP
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Irrestrito
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
