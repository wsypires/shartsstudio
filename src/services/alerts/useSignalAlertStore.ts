import { create } from "zustand";
import type { CandleData } from "../../lib/indicators.ts";
import { api } from "../api.ts";
import type { PlaceOrderInput } from "../schemas.ts";
import { toast } from "../toast.ts";
import { evaluateSignalRule, formatConditionDescription } from "./evaluator.ts";
import { STRATEGY_PRESETS } from "./presets.ts";
import { playAlertSound } from "./sounds.ts";
import type {
  PendingSignalConfirmation,
  SignalAlertLog,
  SignalRule,
} from "./types.ts";

const RULES_STORAGE_KEY = "opencharts_signal_rules";
const LOGS_STORAGE_KEY = "opencharts_signal_logs";

function loadInitialRules(): SignalRule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }

  // Seed with default indicator rules including EMA Abaixo/Acima do Preço
  const emaBuyPreset = STRATEGY_PRESETS[0]!;
  const emaSellPreset = STRATEGY_PRESETS[1]!;
  const rsiPreset = STRATEGY_PRESETS[4]!;

  return [
    {
      ...emaBuyPreset.ruleTemplate,
      id: "rule-default-ema-buy",
      name: "EMA 21 Abaixo do Preço (Sinal de Compra)",
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
      triggerCount: 0,
      enabled: true,
    },
    {
      ...emaSellPreset.ruleTemplate,
      id: "rule-default-ema-sell",
      name: "EMA 21 Acima do Preço (Sinal de Venda)",
      createdAt: Date.now() - 7200000,
      updatedAt: Date.now() - 7200000,
      triggerCount: 0,
      enabled: false,
    },
    {
      ...rsiPreset.ruleTemplate,
      id: "rule-default-rsi",
      name: "RSI Sobrevendido Reversão (Compra)",
      createdAt: Date.now() - 10800000,
      updatedAt: Date.now() - 10800000,
      triggerCount: 0,
      enabled: false,
    },
  ];
}

function loadInitialLogs(): SignalAlertLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

interface SignalAlertState {
  rules: SignalRule[];
  logs: SignalAlertLog[];
  pendingConfirmations: PendingSignalConfirmation[];
  soundVolume: number;
  audioMuted: boolean;

  // Actions
  addRule: (rule: Omit<SignalRule, "id" | "createdAt" | "updatedAt" | "triggerCount">) => SignalRule;
  updateRule: (id: string, updates: Partial<SignalRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string, enabled?: boolean) => void;
  duplicateRule: (id: string) => void;
  disableAllRules: () => void;
  clearAllRules: () => void;
  clearAllSignalsAndLogs: () => void;
  clearLogs: () => void;
  setAudioMuted: (muted: boolean) => void;
  setSoundVolume: (vol: number) => void;

  dismissPending: (id: string) => void;
  executePending: (
    pendingId: string,
    accountId: string,
    onSuccess?: () => void,
  ) => Promise<boolean>;

  triggerRuleManually: (
    ruleId: string,
    currentPrice: number,
    accountId: string | null,
    onSuccess?: () => void,
  ) => Promise<void>;

  processMarketTick: (params: {
    symbol: string;
    candles: CandleData[];
    currentPrice: number;
    prevPrice: number;
    accountId: string | null;
    isFeedConnected: boolean;
    onOrderSuccess?: () => void;
  }) => Promise<void>;
}

export const useSignalAlertStore = create<SignalAlertState>((set, get) => ({
  rules: loadInitialRules(),
  logs: loadInitialLogs(),
  pendingConfirmations: [],
  soundVolume: 0.3,
  audioMuted: false,

  addRule: (ruleInput) => {
    const now = Date.now();
    const newRule: SignalRule = {
      ...ruleInput,
      id: `rule-${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      triggerCount: 0,
    };
    const updated = [newRule, ...get().rules];
    set({ rules: updated });
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated));
    toast.success("Regra de Sinal Criada", `"${newRule.name}" configurada com sucesso.`);
    return newRule;
  },

  updateRule: (id, updates) => {
    const updated = get().rules.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r,
    );
    set({ rules: updated });
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated));
  },

  deleteRule: (id) => {
    const updated = get().rules.filter((r) => r.id !== id);
    set({ rules: updated });
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated));
    toast.info("Regra Removida", "A regra de sinal foi excluída.");
  },

  toggleRule: (id, enabled) => {
    const rule = get().rules.find((r) => r.id === id);
    if (!rule) return;
    const nextState = enabled !== undefined ? enabled : !rule.enabled;
    get().updateRule(id, { enabled: nextState });
    toast.info(
      nextState ? "Alerta Ativado" : "Alerta Desativado",
      `A regra "${rule.name}" está ${nextState ? "ativa" : "em pausa"}.`,
    );
  },

  duplicateRule: (id) => {
    const rule = get().rules.find((r) => r.id === id);
    if (!rule) return;
    const copy: Omit<SignalRule, "id" | "createdAt" | "updatedAt" | "triggerCount"> = {
      ...rule,
      name: `${rule.name} (Cópia)`,
      enabled: true,
      conditions: rule.conditions.map((c) => ({ ...c, id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })),
    };
    get().addRule(copy);
  },

  disableAllRules: () => {
    const updated = get().rules.map((r) => ({ ...r, enabled: false, updatedAt: Date.now() }));
    set({ rules: updated });
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated));
    toast.info("Sinais Desativados", "Todos os alertas e sinais no gráfico foram desativados.");
  },

  clearAllRules: () => {
    set({ rules: [] });
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify([]));
    toast.info("Regras Removidas", "Todas as regras de sinais e alertas foram excluídas.");
  },

  clearAllSignalsAndLogs: () => {
    set({ rules: [], logs: [], pendingConfirmations: [] });
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem(LOGS_STORAGE_KEY);
    toast.success("Gráfico e Sinais Limpos", "Todos os logs de sinais, alertas e regras foram limpos.");
  },

  clearLogs: () => {
    set({ logs: [], pendingConfirmations: [] });
    localStorage.removeItem(LOGS_STORAGE_KEY);
    toast.info("Histórico Limpo", "Todos os registros de sinais foram removidos do gráfico.");
  },

  setAudioMuted: (muted) => set({ audioMuted: muted }),
  setSoundVolume: (vol) => set({ soundVolume: vol }),

  dismissPending: (id) => {
    set((state) => ({
      pendingConfirmations: state.pendingConfirmations.filter((p) => p.id !== id),
      logs: state.logs.map((log) =>
        log.id === id ? { ...log, executionStatus: "DISMISSED" } : log,
      ),
    }));
  },

  executePending: async (pendingId, accountId, onSuccess) => {
    const pending = get().pendingConfirmations.find((p) => p.id === pendingId);
    if (!pending) return false;

    const { symbol, suggestedSide, orderConfig, currentPrice } = pending;
    const side = orderConfig.side === "AUTO" ? suggestedSide : orderConfig.side;
    const qty = orderConfig.quantity || 1;

    // Calculate TP / SL
    let sl: number | undefined;
    let tp: number | undefined;
    if (orderConfig.stopLossPips && orderConfig.stopLossPips > 0) {
      sl = side === "BUY"
        ? currentPrice - orderConfig.stopLossPips
        : currentPrice + orderConfig.stopLossPips;
    }
    if (orderConfig.takeProfitPips && orderConfig.takeProfitPips > 0) {
      tp = side === "BUY"
        ? currentPrice + orderConfig.takeProfitPips
        : currentPrice - orderConfig.takeProfitPips;
    }

    try {
      const orderPayload: PlaceOrderInput = {
        accountId,
        symbol,
        side,
        type: orderConfig.type || "MARKET",
        quantity: qty,
        price: orderConfig.type !== "MARKET" ? currentPrice : undefined,
        stopLoss: sl,
        takeProfit: tp,
        comment: orderConfig.comment || `[Signal Exec] ${pending.ruleName}`,
      };

      const result = await api.placeOrder(orderPayload);

      // Update logs
      const updatedLogs = get().logs.map((log) =>
        log.id === pendingId
          ? {
              ...log,
              executionStatus: "EXECUTED" as const,
              orderId: result.id,
              orderSide: side,
              orderQuantity: qty,
              orderPrice: currentPrice,
            }
          : log,
      );

      set((state) => ({
        pendingConfirmations: state.pendingConfirmations.filter((p) => p.id !== pendingId),
        logs: updatedLogs,
      }));
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));

      toast.success(
        "Ordem Executada via Sinal",
        `${side} ${qty} ${symbol} @ ${currentPrice.toFixed(2)}`,
      );
      onSuccess?.();
      return true;
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string })?.message || "Falha ao enviar ordem";
      const updatedLogs = get().logs.map((log) =>
        log.id === pendingId
          ? {
              ...log,
              executionStatus: "FAILED" as const,
              errorMessage: errorMsg,
            }
          : log,
      );
      set({ logs: updatedLogs });
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));
      toast.error("Erro na Execução da Ordem", errorMsg);
      return false;
    }
  },

  triggerRuleManually: async (ruleId, currentPrice, accountId, onSuccess) => {
    const rule = get().rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const condSummary = rule.conditions
      .map((c) => formatConditionDescription(c.config))
      .join(rule.logic === "AND" ? " E " : " OU ");

    const side =
      rule.action.orderConfig.side === "AUTO" ? "BUY" : rule.action.orderConfig.side;

    if (!get().audioMuted && rule.action.notifyAudio) {
      playAlertSound(rule.action.soundType, get().soundVolume);
    }

    const logId = `log-${Date.now()}`;
    const newLog: SignalAlertLog = {
      id: logId,
      ruleId: rule.id,
      ruleName: rule.name,
      symbol: rule.symbol,
      timeframe: rule.timeframe,
      triggeredAt: Date.now(),
      triggerPrice: currentPrice,
      conditionSummary: `[Teste Manual] ${condSummary}`,
      executionMode: rule.action.executionMode,
      executionStatus: "NOTIFIED",
    };

    if (rule.action.executionMode === "AUTO_EXECUTE" && accountId) {
      try {
        const orderPayload: PlaceOrderInput = {
          accountId,
          symbol: rule.symbol === "ALL" ? "BTCUSD" : rule.symbol,
          side,
          type: rule.action.orderConfig.type,
          quantity: rule.action.orderConfig.quantity || 1,
          comment: `[Teste Auto] ${rule.name}`,
        };
        const order = await api.placeOrder(orderPayload);
        newLog.executionStatus = "EXECUTED";
        newLog.orderId = order.id;
        newLog.orderSide = side;
        newLog.orderQuantity = orderPayload.quantity;
        newLog.orderPrice = currentPrice;
        toast.success("Ordem Automática Testada", `${side} ${rule.symbol} executado!`);
        onSuccess?.();
      } catch (err: unknown) {
        newLog.executionStatus = "FAILED";
        newLog.errorMessage = (err as { message?: string })?.message || "Falha na ordem";
        toast.error("Erro no teste automático", newLog.errorMessage);
      }
    } else if (rule.action.executionMode === "SEMI_AUTO") {
      newLog.executionStatus = "PENDING_CONFIRMATION";
      const pending: PendingSignalConfirmation = {
        id: logId,
        ruleId: rule.id,
        ruleName: rule.name,
        symbol: rule.symbol === "ALL" ? "BTCUSD" : rule.symbol,
        timeframe: rule.timeframe,
        currentPrice,
        conditionSummary: condSummary,
        suggestedSide: side,
        orderConfig: rule.action.orderConfig,
        triggeredAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };
      set((s) => ({ pendingConfirmations: [pending, ...s.pendingConfirmations] }));
    }

    const updatedLogs = [newLog, ...get().logs].slice(0, 100);
    set({ logs: updatedLogs });
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));
    toast.info("Disparo de Sinal Simulado", `"${rule.name}" ativado com sucesso.`);
  },

  processMarketTick: async ({
    symbol,
    candles,
    currentPrice,
    prevPrice,
    accountId,
    isFeedConnected,
    onOrderSuccess,
  }) => {
    if (!isFeedConnected || candles.length < 5 || currentPrice <= 0) return;

    const { rules, audioMuted, soundVolume } = get();
    const activeRules = rules.filter(
      (r) => r.enabled && (r.symbol === symbol || r.symbol === "ALL"),
    );

    if (activeRules.length === 0) return;

    for (const rule of activeRules) {
      const evalResult = evaluateSignalRule(rule, candles, currentPrice, prevPrice);
      if (!evalResult.triggered) continue;

      // Mark rule triggered
      const now = Date.now();
      const updatedRule: Partial<SignalRule> = {
        lastTriggeredAt: now,
        triggerCount: (rule.triggerCount || 0) + 1,
        ...(rule.isOneTime ? { enabled: false } : {}),
      };
      get().updateRule(rule.id, updatedRule);

      // Play Sound
      if (!audioMuted && rule.action.notifyAudio) {
        playAlertSound(rule.action.soundType, soundVolume);
      }

      const summary = evalResult.conditionSummaries.join(" | ") || rule.name;
      const logId = `log-${now}-${Math.random().toString(36).slice(2, 6)}`;

      const newLog: SignalAlertLog = {
        id: logId,
        ruleId: rule.id,
        ruleName: rule.name,
        symbol,
        timeframe: rule.timeframe,
        triggeredAt: now,
        triggerPrice: currentPrice,
        conditionSummary: summary,
        executionMode: rule.action.executionMode,
        executionStatus: "NOTIFIED",
      };

      // Toast Notification
      if (rule.action.notifyToast) {
        toast.info(
          `🔔 Sinal: ${rule.name}`,
          `${symbol} @ ${currentPrice.toFixed(2)} - ${summary}`,
        );
      }

      // Handle Auto Execute
      if (rule.action.executionMode === "AUTO_EXECUTE") {
        if (!accountId) {
          newLog.executionStatus = "FAILED";
          newLog.errorMessage = "Nenhuma conta ativa selecionada para auto-execução.";
          toast.warning("Auto-Executor", "Selecione uma conta para disparar ordens automáticas.");
        } else {
          const side =
            rule.action.orderConfig.side === "AUTO"
              ? evalResult.suggestedSide
              : rule.action.orderConfig.side;
          const qty = rule.action.orderConfig.quantity || 1;

          let sl: number | undefined;
          let tp: number | undefined;
          if (rule.action.orderConfig.stopLossPips && rule.action.orderConfig.stopLossPips > 0) {
            sl = side === "BUY"
              ? currentPrice - rule.action.orderConfig.stopLossPips
              : currentPrice + rule.action.orderConfig.stopLossPips;
          }
          if (rule.action.orderConfig.takeProfitPips && rule.action.orderConfig.takeProfitPips > 0) {
            tp = side === "BUY"
              ? currentPrice + rule.action.orderConfig.takeProfitPips
              : currentPrice - rule.action.orderConfig.takeProfitPips;
          }

          try {
            const orderPayload: PlaceOrderInput = {
              accountId,
              symbol,
              side,
              type: rule.action.orderConfig.type,
              quantity: qty,
              price: rule.action.orderConfig.type !== "MARKET" ? currentPrice : undefined,
              stopLoss: sl,
              takeProfit: tp,
              comment: rule.action.orderConfig.comment || `[AutoSignal] ${rule.name}`,
            };

            const placed = await api.placeOrder(orderPayload);
            newLog.executionStatus = "EXECUTED";
            newLog.orderId = placed.id;
            newLog.orderSide = side;
            newLog.orderQuantity = qty;
            newLog.orderPrice = currentPrice;

            toast.success(
              `⚡ Ordem Auto-Executada: ${side} ${qty} ${symbol}`,
              `Disparada pela regra "${rule.name}" @ ${currentPrice.toFixed(2)}`,
            );
            onOrderSuccess?.();
          } catch (err: unknown) {
            newLog.executionStatus = "FAILED";
            newLog.errorMessage = (err as { message?: string })?.message || "Falha na auto-execução";
            toast.error("Falha na Auto-Execução de Sinal", newLog.errorMessage);
          }
        }
      } else if (rule.action.executionMode === "SEMI_AUTO") {
        newLog.executionStatus = "PENDING_CONFIRMATION";
        const side =
          rule.action.orderConfig.side === "AUTO"
            ? evalResult.suggestedSide
            : rule.action.orderConfig.side;

        const pending: PendingSignalConfirmation = {
          id: logId,
          ruleId: rule.id,
          ruleName: rule.name,
          symbol,
          timeframe: rule.timeframe,
          currentPrice,
          conditionSummary: summary,
          suggestedSide: side,
          orderConfig: rule.action.orderConfig,
          triggeredAt: now,
          expiresAt: now + 45000, // 45 seconds countdown
        };

        set((s) => ({
          pendingConfirmations: [pending, ...s.pendingConfirmations.filter((p) => p.ruleId !== rule.id)],
        }));
      }

      // Prepend to logs
      const updatedLogs = [newLog, ...get().logs].slice(0, 100);
      set({ logs: updatedLogs });
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));
    }
  },
}));
