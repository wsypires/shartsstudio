import { useCallback, useEffect, useState } from "react";
import { useBinanceStore } from "../../services/binance/useBinanceStore.ts";
import { useSignalAlertStore } from "../../services/alerts/useSignalAlertStore.ts";
import {
  Bot,
  Send,
  Radio,
  Activity,
  Wallet,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  XCircle,
  CheckCircle2,
  Zap,
  MonitorPlay,
  CandlestickChart,
  Braces,
  Cable,
  Cpu,
  Server,
  FileBarChart,
  ArrowDown,
  ArrowRight,
  CircleDot,
  BellRing,
  Gauge,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { toast } from "../../services/toast.ts";
import { cn } from "../../lib/utils.ts";

interface EngineStatus {
  state: {
    openTrades: any[];
    closedTrades: any[];
    errors: any[];
    cooldowns: any[];
    balance: number;
    balanceCurrency: string;
  };
  report: {
    openTrades: any[];
    closedTrades: any[];
    summary: { totalTrades: number; wins: number; losses: number; winRate: number; realizedPnl: number; totalFees: number; netPnl: number };
    errors: any[];
    eventLog: { time: number; type: string; summary: string }[];
  };
  telegramConfigured: boolean;
  telegramConfig: { token: string; chatId: string } | null;
  mode: string;
}

type StageKey = "web" | "signal" | "webhook" | "trade" | "binance" | "report" | "telegram";

export function BinanceEnginePanel() {
  const { selectedSymbol, mode, latencyMs, isConnected } = useBinanceStore();
  const { rules, logs } = useSignalAlertStore();
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [testSignal, setTestSignal] = useState<"LONG" | "SHORT" | "EXIT">("LONG");
  const [qty, setQty] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [focusedStage, setFocusedStage] = useState<StageKey>("trade");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/engine/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.telegramConfig && !token && !chatId) {
          setToken(data.telegramConfig.token || "");
          setChatId(data.telegramConfig.chatId || "");
        }
      }
    } catch {}
    setLoading(false);
  }, [token, chatId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendTestSignal = async () => {
    const symbol = (selectedSymbol || "BTCUSDT").toUpperCase();
    const payload: Record<string, any> = { symbol, side: testSignal };
    if (testSignal !== "EXIT") {
      if (qty) payload.quantity = parseFloat(qty);
      if (sl) payload.stopLoss = parseFloat(sl);
      if (tp) payload.takeProfit = parseFloat(tp);
    }
    try {
      const res = await fetch("/api/engine/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Sinal enviado ao Trade Engine", `${testSignal} ${symbol} executado`);
      } else {
        toast.error("Trade Engine rejeitou o sinal", data.error || "Verifique cooldown/credenciais");
      }
    } catch (err: any) {
      toast.error("Falha ao enviar sinal", err?.message || String(err));
    }
    refresh();
  };

  const closeAll = async () => {
    const symbol = (selectedSymbol || "BTCUSDT").toUpperCase();
    try {
      const res = await fetch("/api/engine/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      toast.success("Trade Engine", `Fechado ${data.closed} posição(ões) de ${symbol}`);
    } catch (err: any) {
      toast.error("Falha ao fechar", err?.message || String(err));
    }
    refresh();
  };

  const saveTelegram = async () => {
    if (!token || !chatId) {
      toast.error("Telegram", "Informe token do bot e chatId");
      return;
    }
    try {
      const res = await fetch("/api/engine/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, chatId }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Telegram configurado", "Notificações de sinais/trades serão enviadas.");
      }
    } catch (err: any) {
      toast.error("Falha ao salvar Telegram", err?.message || String(err));
    }
    refresh();
  };

  const testTelegram = async () => {
    try {
      const res = await fetch("/api/engine/telegram/test", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Telegram OK", "Mensagem de teste enviada.");
      } else {
        toast.error("Telegram falhou", data.error || "Verifique token/chatId");
      }
    } catch (err: any) {
      toast.error("Telegram falhou", err?.message || String(err));
    }
  };

  const engineMode = mode === "binance_testnet" ? "Binance Testnet" : mode === "binance_live" ? "Binance Live" : "Demo";

  const activeRules = rules.filter((r) => r.enabled);
  const activeCooldowns = status?.state.cooldowns ?? [];

  const stages: {
    key: StageKey;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    state: "ok" | "warn" | "off";
    badge?: string;
  }[] = [
    {
      key: "web",
      icon: <MonitorPlay className="w-4 h-4" />,
      title: "Sistema Web",
      subtitle: "Gráficos, indicadores, estratégias, backtest",
      state: "ok",
      badge: "UI",
    },
    {
      key: "signal",
      icon: <CandlestickChart className="w-4 h-4" />,
      title: "Signal Engine",
      subtitle: `${activeRules.length} regra(s) ativa(s) · ${logs.length} sinal(is)`,
      state: activeRules.length > 0 ? "ok" : "warn",
      badge: `${activeRules.length} ativas`,
    },
    {
      key: "webhook",
      icon: <Braces className="w-4 h-4" />,
      title: "Webhook",
      subtitle: "POST /api/webhook/strategy",
      state: "ok",
      badge: "REST",
    },
    {
      key: "trade",
      icon: <Cpu className="w-4 h-4" />,
      title: "Trade Engine",
      subtitle: `${status?.state.openTrades.length ?? 0} posição(ões) abertas · cooldown 60s`,
      state: (status?.state.openTrades.length ?? 0) > 0 ? "ok" : "warn",
      badge: `${status?.state.openTrades.length ?? 0} abertas`,
    },
    {
      key: "binance",
      icon: <Server className="w-4 h-4" />,
      title: "Binance API",
      subtitle: `${engineMode}${latencyMs > 0 ? ` · ${latencyMs}ms` : ""}`,
      state: isConnected || mode !== "demo" ? "ok" : "warn",
      badge: engineMode,
    },
    {
      key: "report",
      icon: <FileBarChart className="w-4 h-4" />,
      title: "Report Engine",
      subtitle: `${status?.report.summary.totalTrades ?? 0} trades · PnL ${status?.report.summary.netPnl ?? 0}`,
      state: (status?.report.summary.totalTrades ?? 0) > 0 ? "ok" : "off",
      badge: `${status?.report.summary.netPnl ?? 0}`,
    },
    {
      key: "telegram",
      icon: <Bot className="w-4 h-4" />,
      title: "Telegram",
      subtitle: status?.telegramConfigured ? "Notificações ativas" : "Não configurado",
      state: status?.telegramConfigured ? "ok" : "off",
      badge: status?.telegramConfigured ? "ON" : "OFF",
    },
  ];

  const renderStage = (key: StageKey) => {
    switch (key) {
      case "web":
        return (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Análise gráfica, candles, indicadores e estratégias configurados na interface. Quando uma condição dispara, o
              <span className="text-[#F3BA2F] font-semibold"> Signal Engine</span> gera o sinal LONG/SHORT/EXIT e o envia pelo webhook.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["📊 Análise Gráfica", "🕯️ Candles", "📐 Indicadores", "🧪 Backtest/Replay"].map((f) => (
                <div key={f} className="px-2.5 py-2 bg-[#0d1117] border border-[#21262d] rounded-lg text-[11px] text-neutral-300 text-center">
                  {f}
                </div>
              ))}
            </div>
          </div>
        );

      case "signal":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Regras de sinal</div>
                <div className="text-xl font-bold text-white font-mono mt-1">
                  {activeRules.length}
                  <span className="text-xs font-normal text-neutral-500"> / {rules.length} ativas</span>
                </div>
              </div>
              <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Sinais disparados</div>
                <div className="text-xl font-bold text-[#F3BA2F] font-mono mt-1">{logs.length}</div>
              </div>
            </div>

            {activeRules.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Regras ativas</div>
                {activeRules.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-2.5 py-1.5 bg-[#0d1117] border border-[#21262d] rounded-lg text-[11px]">
                    <span className="text-neutral-200 truncate max-w-[200px]">{r.name}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-neutral-300 font-mono text-[10px]">
                        {r.symbol} · {r.timeframe}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold",
                          r.action.executionMode === "AUTO_EXECUTE"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : r.action.executionMode === "SEMI_AUTO"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-sky-500/20 text-sky-400",
                        )}
                      >
                        {r.action.executionMode}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {logs.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Últimos sinais</div>
                {logs.slice(0, 4).map((l) => (
                  <div key={l.id} className="flex items-center justify-between px-2.5 py-1.5 bg-[#0d1117] border border-[#21262d] rounded-lg text-[11px]">
                    <span className="text-neutral-300 truncate max-w-[220px]">{l.ruleName}</span>
                    <span className="shrink-0 flex items-center gap-1.5">
                      <span className="font-mono text-neutral-400">{l.symbol}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold",
                          l.executionStatus === "EXECUTED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : l.executionStatus === "FAILED"
                            ? "bg-rose-500/20 text-rose-400"
                            : l.executionStatus === "NOTIFIED"
                            ? "bg-sky-500/20 text-sky-400"
                            : "bg-amber-500/20 text-amber-400",
                        )}
                      >
                        {l.executionStatus}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "webhook":
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg font-mono text-[11px] text-sky-300 select-all">
                POST /api/webhook/strategy
              </code>
            </div>
            <code className="block px-3 py-2 bg-[#0d1117] border border-[#21262d] rounded-lg font-mono text-[10px] text-neutral-400">
              {"{ symbol, side: 'LONG'|'SHORT'|'EXIT', price?, quantity?, stopLoss?, takeProfit?, strategy? }"}
            </code>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              O Signal Engine (AUTO_EXECUTE/SEMI_AUTO) envia o sinal a este webhook quando o modo Binance está ativo. O
              endpoint valida o sinal e encaminha para o Trade Engine.
            </p>

            {/* Manual tester */}
            <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white mb-2">
                <Send className="w-3.5 h-3.5 text-[#F3BA2F]" />
                Teste manual ({selectedSymbol || "BTCUSDT"})
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-[#30363d]">
                  {(["LONG", "SHORT", "EXIT"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTestSignal(s)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold transition-all",
                        testSignal === s
                          ? s === "LONG"
                            ? "bg-emerald-500/25 text-emerald-400"
                            : s === "SHORT"
                            ? "bg-rose-500/25 text-rose-400"
                            : "bg-amber-500/25 text-amber-400"
                          : "bg-[#161b22] text-neutral-400 hover:text-white",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {testSignal !== "EXIT" && (
                  <>
                    <input
                      type="number"
                      placeholder="Qtd"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="w-24 px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#F3BA2F]"
                    />
                    <input
                      type="number"
                      placeholder="SL"
                      value={sl}
                      onChange={(e) => setSl(e.target.value)}
                      className="w-24 px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-rose-300 placeholder-neutral-500 focus:outline-none focus:border-[#F3BA2F]"
                    />
                    <input
                      type="number"
                      placeholder="TP"
                      value={tp}
                      onChange={(e) => setTp(e.target.value)}
                      className="w-24 px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-emerald-300 placeholder-neutral-500 focus:outline-none focus:border-[#F3BA2F]"
                    />
                  </>
                )}
                <Button onClick={sendTestSignal} className="bg-[#F3BA2F] hover:bg-[#d9a424] text-black font-semibold text-xs h-8">
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Enviar
                </Button>
              </div>
            </div>
          </div>
        );

      case "trade":
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Activity className="w-3.5 h-3.5 text-[#F3BA2F]" />
                Spot + Futuros · Leverage · Position sizing · SL/TP monitorado pelo servidor
              </div>
              <div className="flex items-center gap-2">
                {activeCooldowns.length > 0 && (
                  <span className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400 font-mono">
                    ⏳ {activeCooldowns.length} em cooldown
                  </span>
                )}
                <Button variant="outline" onClick={closeAll} className="h-7 text-[11px] border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20">
                  <XCircle className="w-3 h-3 mr-1" /> Fechar todas
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#30363d]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#161b22] text-neutral-400 border-b border-[#30363d]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Símbolo</th>
                    <th className="px-3 py-2 font-medium">Lado</th>
                    <th className="px-3 py-2 font-medium text-right">Qtd</th>
                    <th className="px-3 py-2 font-medium text-right">Entrada</th>
                    <th className="px-3 py-2 font-medium text-right">SL</th>
                    <th className="px-3 py-2 font-medium text-right">TP</th>
                    <th className="px-3 py-2 font-medium text-right">Alav.</th>
                    <th className="px-3 py-2 font-medium">Aberto em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]">
                  {!status?.state.openTrades.length && (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-neutral-500">
                        Nenhuma posição aberta no Trade Engine. Envie um sinal LONG/SHORT pelo Webhook acima.
                      </td>
                    </tr>
                  )}
                  {status?.state.openTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-[#1c2128]/50">
                      <td className="px-3 py-2 font-bold text-white">{t.symbol}</td>
                      <td className="px-3 py-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", t.side === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                          {t.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-neutral-200">{t.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-white">{t.entryPrice}</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-300">{t.stopLoss ?? "--"}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-300">{t.takeProfit ?? "--"}</td>
                      <td className="px-3 py-2 text-right font-mono text-neutral-300">{t.leverage}x</td>
                      <td className="px-3 py-2 text-neutral-400">{new Date(t.openedAt).toLocaleTimeString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "binance":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Modo</div>
              <div className="text-sm font-bold text-white font-mono mt-1">{engineMode}</div>
            </div>
            <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Latência</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-1">{latencyMs > 0 ? `${latencyMs}ms` : "--"}</div>
            </div>
            <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Conexão</div>
              <div className="text-sm font-bold mt-1 flex items-center gap-1.5">
                <CircleDot className={cn("w-4 h-4", isConnected ? "text-emerald-400" : "text-neutral-500")} />
                <span className={isConnected ? "text-emerald-400" : "text-neutral-400"}>{isConnected ? "Conectado" : "Ocioso"}</span>
              </div>
            </div>
            <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Saldo Spot</div>
              <div className="text-sm font-bold text-white font-mono mt-1">
                {status ? status.state.balance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "--"}
                <span className="text-[10px] font-normal text-neutral-500"> {status?.state.balanceCurrency ?? "USDT"}</span>
              </div>
            </div>
          </div>
        );

      case "report":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Trades fechados</div>
                <div className="text-xl font-bold text-white font-mono mt-1">{status?.report.summary.totalTrades ?? 0}</div>
              </div>
              <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Win rate</div>
                <div className="text-xl font-bold text-sky-400 font-mono mt-1">{status?.report.summary.winRate ?? 0}%</div>
              </div>
              <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">PnL realizado</div>
                <div className={cn("text-xl font-bold font-mono mt-1", (status?.report.summary.realizedPnl ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {status ? (status.report.summary.realizedPnl >= 0 ? "+" : "") + status.report.summary.realizedPnl.toFixed(2) : "--"}
                </div>
              </div>
              <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">PnL líquido (fees)</div>
                <div className={cn("text-xl font-bold font-mono mt-1", (status?.report.summary.netPnl ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {status ? (status.report.summary.netPnl >= 0 ? "+" : "") + status.report.summary.netPnl.toFixed(2) : "--"}
                </div>
              </div>
            </div>

            {status && status.report.closedTrades.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-[#30363d]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#161b22] text-neutral-400 border-b border-[#30363d]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Símbolo</th>
                      <th className="px-3 py-2 font-medium">Lado</th>
                      <th className="px-3 py-2 font-medium text-right">Entrada</th>
                      <th className="px-3 py-2 font-medium text-right">Saída</th>
                      <th className="px-3 py-2 font-medium">Motivo</th>
                      <th className="px-3 py-2 font-medium text-right">Fees</th>
                      <th className="px-3 py-2 font-medium text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]">
                    {status.report.closedTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-[#1c2128]/50">
                        <td className="px-3 py-2 font-bold text-white">{t.symbol}</td>
                        <td className="px-3 py-2">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", t.side === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                            {t.side}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-neutral-200">{t.entryPrice}</td>
                        <td className="px-3 py-2 text-right font-mono text-neutral-200">{t.exitPrice}</td>
                        <td className="px-3 py-2">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", t.reason === "STOP_LOSS" ? "bg-rose-500/15 text-rose-400" : t.reason === "TAKE_PROFIT" ? "bg-emerald-500/15 text-emerald-400" : "bg-sky-500/15 text-sky-400")}>
                            {t.reason}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-neutral-400">{t.fees}</td>
                        <td className={cn("px-3 py-2 text-right font-mono font-bold", t.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          {t.realizedPnl >= 0 ? "+" : ""}
                          {t.realizedPnl}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {status && status.state.errors.length > 0 && (
              <div className="rounded-lg border border-rose-500/30 overflow-hidden">
                <div className="px-3 py-2 border-b border-rose-500/20 bg-[#1c2128] font-semibold text-[11px] text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Erros ({status.state.errors.length})
                </div>
                <div className="divide-y divide-[#21262d]">
                  {status.state.errors.map((e, i) => (
                    <div key={i} className="px-3 py-1.5 text-[11px]">
                      <span className="text-neutral-500 font-mono text-[10px] mr-2">{new Date(e.time).toLocaleTimeString("pt-BR")}</span>
                      <span className="text-rose-300 font-semibold">[{e.context}]</span>{" "}
                      <span className="text-neutral-300">{e.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "telegram":
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {status?.telegramConfigured ? (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Configurado — notificações ativas
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/15 text-amber-400 text-[11px] font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" /> Não configurado
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              O Report Engine dispara eventos para o Telegram: sinal recebido, posição aberta/fechada, PnL, fees, erros e saldo.
              Crie um bot no @BotFather e informe o token + chatId.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] text-neutral-400 mb-1">Bot Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456:ABC-DEF..."
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#F3BA2F]"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] text-neutral-400 mb-1">Chat ID</label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="-100123456789"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#F3BA2F]"
                />
              </div>
              <Button onClick={saveTelegram} className="bg-sky-500 hover:bg-sky-600 text-white text-xs h-8">
                Salvar
              </Button>
              <Button variant="outline" onClick={testTelegram} disabled={!status?.telegramConfigured} className="h-8 text-xs border-[#30363d] bg-[#21262d] text-neutral-200 hover:bg-[#30363d]">
                <Send className="w-3.5 h-3.5 mr-1.5" /> Testar
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F3BA2F]/10 border border-[#F3BA2F]/25 flex items-center justify-center">
            <Cable className="w-5 h-5 text-[#F3BA2F]" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              Fluxo de Trading Automatizado
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#21262d] border border-[#30363d] text-neutral-400 font-mono">
                Signal → Trade → Report → Telegram
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">Cada estágio reflete o estado real do engine em execução no servidor.</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="h-7 text-xs border-[#30363d] bg-[#21262d] text-neutral-200 hover:bg-[#30363d]">
          <RefreshCw className={cn("w-3 h-3 mr-1.5", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Pipeline stages (horizontal flow) */}
      <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
        <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
          {stages.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-0 shrink-0">
              <button
                type="button"
                onClick={() => setFocusedStage(stage.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all w-[118px]",
                  focusedStage === stage.key
                    ? "bg-[#F3BA2F]/10 border-[#F3BA2F]/50"
                    : "bg-[#0d1117] border-[#21262d] hover:border-[#30363d]",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border",
                    stage.state === "ok"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : stage.state === "warn"
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                      : "bg-neutral-800/50 border-neutral-700 text-neutral-500",
                  )}
                >
                  {stage.icon}
                </div>
                <div className="text-[11px] font-semibold text-white leading-tight">{stage.title}</div>
                <div className="flex items-center gap-1">
                  <CircleDot
                    className={cn(
                      "w-2.5 h-2.5",
                      stage.state === "ok" ? "text-emerald-400" : stage.state === "warn" ? "text-amber-400" : "text-neutral-600",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                      stage.state === "ok"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : stage.state === "warn"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-neutral-800 text-neutral-500",
                    )}
                  >
                    {stage.badge}
                  </span>
                </div>
              </button>
              {i < stages.length - 1 && (
                <div className="flex flex-col items-center justify-center px-0.5">
                  <ArrowRight className="w-4 h-4 text-[#F3BA2F]/60" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Focused stage detail */}
      <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
        {renderStage(focusedStage)}
      </div>
    </div>
  );
}