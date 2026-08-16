import { useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Eraser,
  Play,
  Plus,
  Radio,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { formatConditionDescription } from "../../services/alerts/evaluator.ts";
import { useSignalAlertStore } from "../../services/alerts/useSignalAlertStore.ts";
import { Button } from "../ui/button.tsx";

interface SignalsPanelProps {
  symbol?: string;
  selectedSymbol?: string;
  currentPrice: number;
  accountId?: string | null;
  onOpenCreateDialog: (targetPrice?: number) => void;
  isFeedConnected?: boolean;
}

export function SignalsPanel({
  symbol,
  selectedSymbol,
  currentPrice,
  accountId = null,
  onOpenCreateDialog,
  isFeedConnected = true,
}: SignalsPanelProps) {
  const activeSymbol = symbol || selectedSymbol || "";
  const {
    rules,
    logs,
    toggleRule,
    deleteRule,
    triggerRuleManually,
    clearLogs,
    disableAllRules,
    clearAllRules,
    audioMuted,
    setAudioMuted,
  } = useSignalAlertStore();

  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules");

  const symbolRules = rules.filter((r) => r.symbol === activeSymbol || r.symbol === "ALL");
  const activeCount = symbolRules.filter((r) => r.enabled).length;

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden text-xs">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-card/80">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-primary/20 text-primary">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <div>
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <span>Sinais & Alertas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-primary/20 text-primary">
                {activeCount} ativos
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {activeSymbol} &bull; Preço: {currentPrice > 0 ? currentPrice.toFixed(2) : "--"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={audioMuted ? "Mutado" : "Som ativo"}
          >
            {audioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <Button
            size="sm"
            onClick={() => onOpenCreateDialog(currentPrice)}
            className="h-7 text-xs px-2 gap-1 font-bold"
          >
            <Plus className="h-3 w-3" />
            Criar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-secondary/30 px-3 pt-1 gap-2 text-[11px]">
        <button
          onClick={() => setActiveTab("rules")}
          className={cn(
            "px-2.5 py-1.5 border-b-2 font-medium transition-colors flex items-center gap-1.5",
            activeTab === "rules"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Bell className="h-3 w-3" />
          Regras ({symbolRules.length})
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={cn(
            "px-2.5 py-1.5 border-b-2 font-medium transition-colors flex items-center gap-1.5",
            activeTab === "logs"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock className="h-3 w-3" />
          Disparos ({logs.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {activeTab === "rules" && (
          <>
            {symbolRules.length > 0 && (
              <div className="flex items-center justify-between pb-1 border-b border-border/40 text-[10px] text-muted-foreground">
                <span>{symbolRules.length} regra(s) ({activeCount} ativas)</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => disableAllRules()}
                    disabled={activeCount === 0}
                    className={cn(
                      "hover:text-rose-400 flex items-center gap-1 transition-colors",
                      activeCount === 0 && "opacity-40 cursor-not-allowed",
                    )}
                    title="Desativar todos os sinais no gráfico"
                  >
                    <Eraser className="h-2.5 w-2.5" />
                    <span>Desativar Todos</span>
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => clearAllRules()}
                    className="hover:text-destructive flex items-center gap-1 transition-colors"
                    title="Excluir todas as regras"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    <span>Limpar Regras</span>
                  </button>
                </div>
              </div>
            )}

            {symbolRules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <Bell className="h-8 w-8 mx-auto opacity-30" />
                <p>Nenhuma regra de sinal para {symbol}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenCreateDialog(currentPrice)}
                  className="text-xs mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" /> Criar Regra
                </Button>
              </div>
            ) : (
              symbolRules.map((rule) => {
                const isAuto = rule.action.executionMode === "AUTO_EXECUTE";
                const isSemi = rule.action.executionMode === "SEMI_AUTO";

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "p-2.5 border rounded-xl bg-secondary/20 space-y-2 transition-all",
                      rule.enabled
                        ? "border-border hover:border-primary/50 shadow-sm"
                        : "border-border/40 opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{rule.name}</span>
                          <span className="text-[9px] px-1 rounded bg-secondary font-mono text-muted-foreground">
                            {rule.timeframe}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-[9px] px-1.5 py-0.2 rounded font-bold uppercase inline-block mt-0.5",
                            isAuto
                              ? "bg-amber-500/20 text-amber-400"
                              : isSemi
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {isAuto ? "⚡ Auto-Ordem" : isSemi ? "🎯 Semi-Auto" : "🔔 Alerta"}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={cn(
                          "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          rule.enabled ? "bg-primary" : "bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-background shadow-md transition duration-200 ease-in-out",
                            rule.enabled ? "translate-x-3" : "translate-x-0",
                          )}
                        />
                      </button>
                    </div>

                    <div className="bg-secondary/40 rounded p-1.5 text-[10px] font-mono text-muted-foreground space-y-0.5">
                      {rule.conditions.map((c) => (
                        <div key={c.id}>&bull; {formatConditionDescription(c.config)}</div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                      <span>Disparos: {rule.triggerCount || 0}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => triggerRuleManually(rule.id, currentPrice, accountId)}
                          className="p-1 rounded hover:bg-secondary text-primary"
                          title="Testar Disparo"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {activeTab === "logs" && (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Histórico ({logs.length})</span>
              {logs.length > 0 && (
                <button
                  onClick={clearLogs}
                  className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <Trash2 className="h-2.5 w-2.5" /> Limpar
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum sinal registrado</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 border border-border rounded-lg bg-secondary/20 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{log.symbol}</span>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {new Date(log.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-medium">{log.ruleName}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Preço: {log.triggerPrice.toFixed(2)}</span>
                    <span
                      className={cn(
                        "px-1 py-0.2 rounded font-bold uppercase",
                        log.executionStatus === "EXECUTED"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : log.executionStatus === "PENDING_CONFIRMATION"
                            ? "text-cyan-400 bg-cyan-500/10"
                            : "text-muted-foreground",
                      )}
                    >
                      {log.executionStatus}
                    </span>
                  </div>
                  {log.orderId && (
                    <div className="text-[9px] font-mono text-emerald-400">
                      Ordem #{log.orderId.slice(0, 8)} ({log.orderSide} {log.orderQuantity})
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
