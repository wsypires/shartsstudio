import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { formatCurrency, cn } from "../../lib/utils.ts";
import { useSignalAlertStore } from "../../services/alerts/useSignalAlertStore.ts";
import { Button } from "../ui/button.tsx";

interface SignalExecutionBannerProps {
  accountId: string | null;
  onOrderSuccess?: () => void;
}

export function SignalExecutionBanner({
  accountId,
  onOrderSuccess,
}: SignalExecutionBannerProps) {
  const pending = useSignalAlertStore((s) => s.pendingConfirmations);
  const dismissPending = useSignalAlertStore((s) => s.dismissPending);
  const executePending = useSignalAlertStore((s) => s.executePending);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Auto-dismiss expired
  useEffect(() => {
    if (pending.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      pending.forEach((p) => {
        if (now >= p.expiresAt) {
          dismissPending(p.id);
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pending, dismissPending]);

  if (pending.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-auto animate-in slide-in-from-top-3 fade-in duration-200">
      {pending.slice(0, 3).map((item) => {
        const isLong = item.suggestedSide === "BUY";
        const progress = Math.max(
          0,
          Math.min(
            100,
            ((item.expiresAt - Date.now()) / (item.expiresAt - item.triggeredAt)) * 100,
          ),
        );

        return (
          <div
            key={item.id}
            className="bg-card/95 backdrop-blur border-2 border-primary/40 rounded-xl p-3.5 shadow-2xl shadow-black/50 overflow-hidden relative"
          >
            {/* Progress countdown line */}
            <div
              className={cn(
                "absolute top-0 left-0 h-1 transition-all duration-300",
                isLong ? "bg-emerald-500" : "bg-rose-500",
              )}
              style={{ width: `${progress}%` }}
            />

            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "p-1.5 rounded-lg flex items-center justify-center font-bold text-xs",
                    isLong
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                  )}
                >
                  {isLong ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {item.symbol}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-primary/20 text-primary uppercase">
                      {item.timeframe}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                        isLong
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/20 text-rose-400",
                      )}
                    >
                      Sinal {item.suggestedSide}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium truncate max-w-[240px]">
                    {item.ruleName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => dismissPending(item.id)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary transition-colors"
                title="Descartar Sinal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Condition summary */}
            <div className="bg-secondary/60 rounded-lg p-2 mb-3 text-xs border border-border/40 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>Gatilho Detectado:</span>
                <span className="font-mono text-foreground font-semibold">
                  Preço: {item.currentPrice.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-foreground/90 font-mono leading-relaxed">
                {item.conditionSummary}
              </p>
            </div>

            {/* Order params details */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 px-1">
              <span>
                Qtd:{" "}
                <strong className="text-foreground font-mono">
                  {item.orderConfig.quantity || 1}
                </strong>
              </span>
              {item.orderConfig.stopLossPips ? (
                <span>
                  SL:{" "}
                  <strong className="text-rose-400 font-mono">
                    {item.orderConfig.stopLossPips} pips
                  </strong>
                </span>
              ) : null}
              {item.orderConfig.takeProfitPips ? (
                <span>
                  TP:{" "}
                  <strong className="text-emerald-400 font-mono">
                    {item.orderConfig.takeProfitPips} pips
                  </strong>
                </span>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => dismissPending(item.id)}
                className="flex-1 text-xs h-8"
              >
                Ignorar
              </Button>
              <Button
                size="sm"
                disabled={!accountId || executingId === item.id}
                onClick={async () => {
                  if (!accountId) return;
                  setExecutingId(item.id);
                  try {
                    await executePending(item.id, accountId, onOrderSuccess);
                  } finally {
                    setExecutingId(null);
                  }
                }}
                className={cn(
                  "flex-1 text-xs font-bold h-8 text-white shadow-md flex items-center justify-center gap-1.5",
                  isLong
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500",
                )}
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                {executingId === item.id
                  ? "Executando..."
                  : `Executar ${item.suggestedSide}`}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
