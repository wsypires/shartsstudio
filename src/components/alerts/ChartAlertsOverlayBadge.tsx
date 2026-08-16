import { useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Eraser,
  Play,
  Settings2,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { useSignalAlertStore } from "../../services/alerts/useSignalAlertStore.ts";
import type { Timeframe } from "../../pages/trading/constants.ts";

interface ChartAlertsOverlayBadgeProps {
  selectedSymbol: string;
  timeframe: Timeframe;
  currentPrice: number;
  accountId: string | null;
  onOpenManager: (targetPrice?: number) => void;
}

export function ChartAlertsOverlayBadge({
  selectedSymbol,
  timeframe,
  currentPrice,
  accountId,
  onOpenManager,
}: ChartAlertsOverlayBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rules = useSignalAlertStore((state) => state.rules);
  const logs = useSignalAlertStore((state) => state.logs);
  const toggleRule = useSignalAlertStore((state) => state.toggleRule);
  const triggerRuleManually = useSignalAlertStore((state) => state.triggerRuleManually);
  const clearLogs = useSignalAlertStore((state) => state.clearLogs);
  const disableAllRules = useSignalAlertStore((state) => state.disableAllRules);

  const activeRules = rules.filter(
    (r) => r.symbol === "ALL" || r.symbol === selectedSymbol,
  );

  const enabledRules = activeRules.filter((r) => r.enabled);

  if (activeRules.length === 0) return null;

  return (
    <div className="absolute top-12 left-4 z-20 pointer-events-auto">
      <div
        className={cn(
          "bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-lg transition-all duration-200 overflow-hidden text-xs",
          isExpanded ? "w-80" : "w-auto",
        )}
      >
        {/* Header pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none hover:bg-secondary/40 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="relative">
            <Bell
              className={cn(
                "h-3.5 w-3.5",
                enabledRules.length > 0
                  ? "text-primary animate-pulse"
                  : "text-muted-foreground",
              )}
            />
            {enabledRules.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground text-[11px]">
              Alertas Ativos
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-mono font-bold text-[10px]">
              {enabledRules.length}/{activeRules.length}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenManager(currentPrice);
              }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Gerenciar Alertas"
            >
              <Settings2 className="h-3 w-3" />
            </button>

            {isExpanded ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded body */}
        {isExpanded && (
          <div className="p-3 border-t border-border/50 space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
              <span>Regras para {selectedSymbol} ({timeframe}):</span>
              <button
                type="button"
                onClick={() => onOpenManager(currentPrice)}
                className="text-primary hover:underline font-medium"
              >
                + Nova Regra
              </button>
            </div>

            <div className="space-y-1.5">
              {activeRules.map((rule) => {
                const isAuto = rule.action.executionMode === "AUTO_EXECUTE";
                const isSemi = rule.action.executionMode === "SEMI_AUTO";

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "p-2 rounded-lg border text-[11px] transition-all flex items-center justify-between gap-2",
                      rule.enabled
                        ? "bg-secondary/40 border-border"
                        : "bg-secondary/10 border-border/30 opacity-60",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: rule.color || "#10b981" }}
                        />
                        <span className="font-bold text-foreground truncate block">
                          {rule.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <span
                          className={cn(
                            "px-1 rounded font-bold uppercase",
                            isAuto
                              ? "bg-amber-500/20 text-amber-400"
                              : isSemi
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {isAuto ? "Auto" : isSemi ? "Semi-Auto" : "Alerta"}
                        </span>
                        <span>•</span>
                        <span>{rule.action.orderConfig.side}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          triggerRuleManually(rule.id, currentPrice, accountId)
                        }
                        className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                        title="Testar Disparo"
                      >
                        <Play className="h-3 w-3" />
                      </button>

                      {/* Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleRule(rule.id)}
                        className={cn(
                          "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                          rule.enabled ? "bg-primary" : "bg-muted",
                        )}
                        title={rule.enabled ? "Desativar Regra" : "Ativar Regra"}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                            rule.enabled ? "translate-x-3" : "translate-x-0",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Chart Actions Footer */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => clearLogs()}
                disabled={logs.length === 0}
                className={cn(
                  "px-2 py-1 rounded hover:bg-secondary flex items-center gap-1 transition-colors",
                  logs.length > 0
                    ? "text-muted-foreground hover:text-foreground"
                    : "opacity-40 cursor-not-allowed text-muted-foreground",
                )}
                title="Remover marcadores de disparos e histórico de sinais do gráfico"
              >
                <Trash2 className="h-2.5 w-2.5 text-cyan-400" />
                <span>Limpar Logs ({logs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => disableAllRules()}
                disabled={enabledRules.length === 0}
                className={cn(
                  "px-2 py-1 rounded hover:bg-secondary flex items-center gap-1 transition-colors",
                  enabledRules.length > 0
                    ? "text-muted-foreground hover:text-rose-400"
                    : "opacity-40 cursor-not-allowed text-muted-foreground",
                )}
                title="Desativar todos os alertas e linhas de médias do gráfico"
              >
                <Eraser className="h-2.5 w-2.5 text-rose-400" />
                <span>Desativar Todos</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
