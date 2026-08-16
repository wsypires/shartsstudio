import { useEffect, useRef, useState } from "react";
import {
  Eraser,
  Trash2,
  BarChart3,
  Zap,
  Clock,
  Pencil,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";
import type { IndicatorType } from "../../lib/indicators.ts";
import { useSignalAlertStore } from "../../services/alerts/useSignalAlertStore.ts";
import { toast } from "../../services/toast.ts";

interface ChartCleanerMenuProps {
  activeIndicators: IndicatorType[];
  onSetIndicators?: (indicators: IndicatorType[]) => void;
  onClearDrawings?: () => void;
  drawingsCount?: number;
  onSetPlugins?: (plugins: string[]) => void;
}

export function ChartCleanerMenu({
  activeIndicators,
  onSetIndicators,
  onClearDrawings,
  drawingsCount = 0,
  onSetPlugins,
}: ChartCleanerMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rules = useSignalAlertStore((state) => state.rules);
  const logs = useSignalAlertStore((state) => state.logs);
  const clearLogs = useSignalAlertStore((state) => state.clearLogs);
  const disableAllRules = useSignalAlertStore((state) => state.disableAllRules);
  const clearAllRules = useSignalAlertStore((state) => state.clearAllRules);
  const clearAllSignalsAndLogs = useSignalAlertStore(
    (state) => state.clearAllSignalsAndLogs,
  );

  const activeRulesCount = rules.filter((r) => r.enabled).length;
  const totalItemsCount =
    activeIndicators.length + activeRulesCount + logs.length + drawingsCount;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClearAll = () => {
    // 1. Clear indicators
    onSetIndicators?.([]);
    // 2. Clear drawings
    onClearDrawings?.();
    // 3. Clear plugins
    onSetPlugins?.([]);
    // 4. Disable signals / clear logs
    clearLogs();
    disableAllRules();

    toast.success(
      "Gráfico 100% Limpo",
      "Indicadores, sinais, logs e desenhos foram removidos do gráfico.",
    );
    setOpen(false);
  };

  const handleClearIndicators = () => {
    onSetIndicators?.([]);
    toast.info("Indicadores Limpos", "Todos os indicadores foram removidos do gráfico.");
    setOpen(false);
  };

  const handleClearSignals = () => {
    disableAllRules();
    setOpen(false);
  };

  const handleClearLogs = () => {
    clearLogs();
    setOpen(false);
  };

  const handleClearDrawingsOnly = () => {
    onClearDrawings?.();
    toast.info("Desenhos Limpos", "Todas as marcações e desenhos foram removidos.");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <button
        id="btn-chart-cleaner"
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Limpar Gráfico (Indicadores, Sinais, Logs e Desenhos)"
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
          open
            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            : "hover:bg-secondary text-muted-foreground hover:text-foreground",
        )}
      >
        <Eraser className="h-3 w-3 text-rose-400" />
        <span>Limpar</span>
        {totalItemsCount > 0 && (
          <span className="bg-rose-500/20 text-rose-300 font-mono text-[9px] px-1 rounded-full">
            {totalItemsCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="menu-chart-cleaner-dropdown"
          className="absolute top-full left-0 z-50 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-2xl p-1.5 space-y-1 text-xs backdrop-blur-md"
        >
          <div className="px-2.5 py-1.5 border-b border-border/50 flex items-center justify-between">
            <span className="font-bold text-foreground text-[11px] flex items-center gap-1.5">
              <Eraser className="h-3.5 w-3.5 text-rose-400" />
              Limpar Elementos do Gráfico
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {totalItemsCount} ativo(s)
            </span>
          </div>

          {/* Master One-Click Reset */}
          <button
            type="button"
            id="btn-clean-everything"
            onClick={handleClearAll}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold transition-colors text-left"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-rose-400" />
            <div className="flex-1 min-w-0">
              <div>Limpar Tudo (Master Reset)</div>
              <div className="text-[10px] font-normal text-rose-300/80">
                Remove indicadores, sinais, logs e desenhos
              </div>
            </div>
          </button>

          <div className="h-px bg-border/40 my-1" />

          {/* Individual Options */}
          <button
            type="button"
            onClick={handleClearIndicators}
            disabled={activeIndicators.length === 0}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
              activeIndicators.length > 0
                ? "hover:bg-secondary text-foreground"
                : "opacity-40 cursor-not-allowed text-muted-foreground",
            )}
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="flex-1">Limpar Indicadores</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              ({activeIndicators.length})
            </span>
          </button>

          <button
            type="button"
            onClick={handleClearSignals}
            disabled={activeRulesCount === 0}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
              activeRulesCount > 0
                ? "hover:bg-secondary text-foreground"
                : "opacity-40 cursor-not-allowed text-muted-foreground",
            )}
          >
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="flex-1">Desativar Sinais no Gráfico</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              ({activeRulesCount})
            </span>
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
              logs.length > 0
                ? "hover:bg-secondary text-foreground"
                : "opacity-40 cursor-not-allowed text-muted-foreground",
            )}
          >
            <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="flex-1">Limpar Marcadores & Logs</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              ({logs.length})
            </span>
          </button>

          <button
            type="button"
            onClick={handleClearDrawingsOnly}
            disabled={drawingsCount === 0}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
              drawingsCount > 0
                ? "hover:bg-secondary text-foreground"
                : "opacity-40 cursor-not-allowed text-muted-foreground",
            )}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1">Limpar Desenhos</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              ({drawingsCount})
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
