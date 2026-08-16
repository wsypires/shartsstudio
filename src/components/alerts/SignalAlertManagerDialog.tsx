import { useState, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Eraser,
  Flame,
  Layers,
  ListFilter,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  Radio,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils.ts";
import { formatConditionDescription } from "../../services/alerts/evaluator.ts";
import { STRATEGY_PRESETS, type StrategyPreset } from "../../services/alerts/presets.ts";
import { playAlertSound } from "../../services/alerts/sounds.ts";
import type {
  ConditionParams,
  ConditionType,
  ExecutionMode,
  MaType,
  OrderSideChoice,
  OrderTypeChoice,
  PriceLevelOperator,
  PriceMaOperator,
  RuleCondition,
  SignalRule,
  SoundType,
} from "../../services/alerts/types.ts";
import { useSignalAlertStore } from "../../services/alerts/useSignalAlertStore.ts";
import { TIMEFRAMES, type Timeframe } from "../../pages/trading/constants.ts";
import { Button } from "../ui/button.tsx";

interface SignalAlertManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  currentPrice: number;
  accountId: string | null;
  initialPrice?: number | null;
}

export function SignalAlertManagerDialog({
  isOpen,
  onClose,
  selectedSymbol,
  currentPrice,
  accountId,
  initialPrice,
}: SignalAlertManagerDialogProps) {
  const {
    rules,
    logs,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    duplicateRule,
    disableAllRules,
    clearAllRules,
    clearLogs,
    triggerRuleManually,
    audioMuted,
    setAudioMuted,
    soundVolume,
    setSoundVolume,
  } = useSignalAlertStore();

  const [activeTab, setActiveTab] = useState<"rules" | "create" | "logs">("rules");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSymbol, setFilterSymbol] = useState<string>("ALL");

  // Form state for creating/editing rule
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleSymbol, setRuleSymbol] = useState(selectedSymbol);
  const [ruleTimeframe, setRuleTimeframe] = useState<Timeframe>("15m");
  const [ruleLogic, setRuleLogic] = useState<"AND" | "OR">("AND");
  const [ruleIsOneTime, setRuleIsOneTime] = useState(false);
  const [ruleCooldown, setRuleCooldown] = useState(15);
  const [ruleSoundType, setRuleSoundType] = useState<SoundType>("chime");
  const [ruleNotifyToast, setRuleNotifyToast] = useState(true);
  const [ruleNotifyAudio, setRuleNotifyAudio] = useState(true);

  // Action / Order Executor Settings
  const [ruleExecutionMode, setRuleExecutionMode] = useState<ExecutionMode>("SEMI_AUTO");
  const [orderSide, setOrderSide] = useState<OrderSideChoice>("AUTO");
  const [orderType, setOrderType] = useState<OrderTypeChoice>("MARKET");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderTakeProfitPips, setOrderTakeProfitPips] = useState(100);
  const [orderStopLossPips, setOrderStopLossPips] = useState(50);
  const [orderComment, setOrderComment] = useState("");

  // Conditions list
  const [conditions, setConditions] = useState<RuleCondition[]>([
    {
      id: "cond-1",
      config: {
        type: "price_level",
        params: {
          operator: "greater_than",
          targetPrice: initialPrice || currentPrice || 50000,
        },
      },
    },
  ]);

  // Load preset helper
  const applyPreset = (preset: StrategyPreset) => {
    const t = preset.ruleTemplate;
    setRuleName(preset.name);
    setRuleSymbol(selectedSymbol);
    setRuleTimeframe(preset.recommendedTimeframe);
    setRuleLogic(t.logic);
    setRuleIsOneTime(t.isOneTime);
    setRuleCooldown(t.cooldownMinutes);
    setRuleSoundType(t.action.soundType);
    setRuleNotifyToast(t.action.notifyToast);
    setRuleNotifyAudio(t.action.notifyAudio);
    setRuleExecutionMode(t.action.executionMode);
    setOrderSide(t.action.orderConfig.side);
    setOrderType(t.action.orderConfig.type);
    setOrderQuantity(t.action.orderConfig.quantity || 1);
    setOrderTakeProfitPips(t.action.orderConfig.takeProfitPips || 100);
    setOrderStopLossPips(t.action.orderConfig.stopLossPips || 50);
    setOrderComment(t.action.orderConfig.comment || `[Preset] ${preset.name}`);
    setConditions(
      t.conditions.map((c) => ({
        ...c,
        id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      })),
    );
    setActiveTab("create");
  };

  // Open edit
  const handleEditRule = (rule: SignalRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleSymbol(rule.symbol);
    setRuleTimeframe(rule.timeframe);
    setRuleLogic(rule.logic);
    setRuleIsOneTime(rule.isOneTime);
    setRuleCooldown(rule.cooldownMinutes);
    setRuleSoundType(rule.action.soundType);
    setRuleNotifyToast(rule.action.notifyToast);
    setRuleNotifyAudio(rule.action.notifyAudio);
    setRuleExecutionMode(rule.action.executionMode);
    setOrderSide(rule.action.orderConfig.side);
    setOrderType(rule.action.orderConfig.type);
    setOrderQuantity(rule.action.orderConfig.quantity || 1);
    setOrderTakeProfitPips(rule.action.orderConfig.takeProfitPips || 0);
    setOrderStopLossPips(rule.action.orderConfig.stopLossPips || 0);
    setOrderComment(rule.action.orderConfig.comment || "");
    setConditions(rule.conditions);
    setActiveTab("create");
  };

  const handleSaveRule = () => {
    if (!ruleName.trim()) {
      alert("Por favor, informe um nome para a regra.");
      return;
    }
    if (conditions.length === 0) {
      alert("Adicione pelo menos uma condição para a regra.");
      return;
    }

    const ruleData = {
      name: ruleName.trim(),
      symbol: ruleSymbol,
      timeframe: ruleTimeframe,
      enabled: true,
      isOneTime: ruleIsOneTime,
      cooldownMinutes: ruleCooldown,
      logic: ruleLogic,
      conditions,
      action: {
        notifyToast: ruleNotifyToast,
        notifyAudio: ruleNotifyAudio,
        soundType: ruleSoundType,
        executionMode: ruleExecutionMode,
        orderConfig: {
          side: orderSide,
          type: orderType,
          quantity: Number(orderQuantity) || 1,
          takeProfitPips: Number(orderTakeProfitPips) || undefined,
          stopLossPips: Number(orderStopLossPips) || undefined,
          comment: orderComment.trim() || undefined,
        },
      },
    };

    if (editingRuleId) {
      updateRule(editingRuleId, ruleData);
      setEditingRuleId(null);
    } else {
      addRule(ruleData);
    }

    setActiveTab("rules");
  };

  const addCondition = (type: ConditionType) => {
    const newId = `cond-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    let newConfig: ConditionParams;

    switch (type) {
      case "price_level":
        newConfig = {
          type: "price_level",
          params: { operator: "greater_than", targetPrice: currentPrice || 50000 },
        };
        break;
      case "rsi":
        newConfig = {
          type: "rsi",
          params: { period: 14, operator: "<", threshold: 30 },
        };
        break;
      case "ma_cross":
        newConfig = {
          type: "ma_cross",
          params: { fastPeriod: 20, fastType: "EMA", slowPeriod: 50, slowType: "EMA", direction: "golden_cross" },
        };
        break;
      case "price_ma":
        newConfig = {
          type: "price_ma",
          params: { period: 50, maType: "EMA", operator: "cross_above" },
        };
        break;
      case "macd":
        newConfig = {
          type: "macd",
          params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, event: "macd_cross_signal_bullish" },
        };
        break;
      case "bollinger":
        newConfig = {
          type: "bollinger",
          params: { period: 20, stdDev: 2, event: "touch_lower" },
        };
        break;
      case "atr_volatility":
        newConfig = {
          type: "atr_volatility",
          params: { period: 14, operator: ">", threshold: 250 },
        };
        break;
      case "volume_surge":
        newConfig = {
          type: "volume_surge",
          params: { period: 20, multiplier: 1.5 },
        };
        break;
    }

    setConditions([...conditions, { id: newId, config: newConfig }]);
  };

  const updateConditionConfig = (id: string, newConfig: ConditionParams) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, config: newConfig } : c)));
  };

  const updateConditionParam = (id: string, partial: Record<string, any>) => {
    setConditions(
      conditions.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          config: {
            ...c.config,
            params: {
              ...(c.config.params as any),
              ...partial,
            },
          } as ConditionParams,
        };
      }),
    );
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSymbol = filterSymbol === "ALL" || r.symbol === filterSymbol || r.symbol === "ALL";
      return matchSearch && matchSymbol;
    });
  }, [rules, searchQuery, filterSymbol]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Sistema Avançado de Sinais & Alertas
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/20 text-primary uppercase">
                  Executor de Ordens
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Regras personalizadas com disparo inteligente e automação de ordens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setAudioMuted(!audioMuted)}
              className={cn(
                "p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-medium",
                audioMuted
                  ? "bg-secondary text-muted-foreground border-border"
                  : "bg-primary/20 text-primary border-primary/30",
              )}
              title={audioMuted ? "Desmutar Áudio" : "Mutar Áudio"}
            >
              {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{audioMuted ? "Mudo" : "Som Ativo"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-secondary/30 px-4 pt-2 gap-2 text-xs font-medium">
          <button
            onClick={() => {
              setEditingRuleId(null);
              setActiveTab("rules");
            }}
            className={cn(
              "px-4 py-2 rounded-t-lg border-b-2 transition-colors flex items-center gap-2",
              activeTab === "rules"
                ? "border-primary text-primary font-bold bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Bell className="h-3.5 w-3.5" />
            Regras Ativas
            <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-mono">
              {rules.length}
            </span>
          </button>

          <button
            onClick={() => {
              if (activeTab !== "create") {
                setEditingRuleId(null);
                setRuleName("");
                setRuleSymbol(selectedSymbol);
              }
              setActiveTab("create");
            }}
            className={cn(
              "px-4 py-2 rounded-t-lg border-b-2 transition-colors flex items-center gap-2",
              activeTab === "create"
                ? "border-primary text-primary font-bold bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            {editingRuleId ? "Editar Regra" : "Nova Regra / Estratégias"}
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={cn(
              "px-4 py-2 rounded-t-lg border-b-2 transition-colors flex items-center gap-2",
              activeTab === "logs"
                ? "border-primary text-primary font-bold bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Histórico & Execuções
            {logs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-secondary text-foreground text-[10px] font-mono">
                {logs.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: RULES LIST */}
          {activeTab === "rules" && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nome ou par..."
                      className="w-full bg-secondary/50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {rules.length > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={disableAllRules}
                        className="h-8 text-xs gap-1 text-muted-foreground hover:text-rose-400"
                        title="Desativar todas as regras de sinais no gráfico"
                      >
                        <Eraser className="h-3.5 w-3.5" />
                        Desativar Todas
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearAllRules}
                        className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
                        title="Excluir todas as regras cadastradas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Limpar Regras
                      </Button>
                    </>
                  )}

                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingRuleId(null);
                      setRuleName("");
                      setRuleSymbol(selectedSymbol);
                      setActiveTab("create");
                    }}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Criar Regra
                  </Button>
                </div>
              </div>

              {/* Rules Cards */}
              {filteredRules.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl p-6">
                  <BellOff className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="text-sm font-semibold text-foreground">Nenhuma regra encontrada</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Crie sua primeira regra personalizada ou selecione um dos modelos prontos com vinculação a ordens.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("create")}
                    className="mt-4 text-xs"
                  >
                    Ver Modelos de Estratégia
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRules.map((rule) => {
                    const isAuto = rule.action.executionMode === "AUTO_EXECUTE";
                    const isSemi = rule.action.executionMode === "SEMI_AUTO";

                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          "border rounded-xl p-3.5 bg-card/60 transition-all flex flex-col justify-between relative overflow-hidden",
                          rule.enabled
                            ? "border-border hover:border-primary/50 shadow-sm"
                            : "border-border/40 opacity-60 bg-secondary/10",
                        )}
                      >
                        <div>
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-foreground">
                                {rule.symbol}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary font-mono font-semibold">
                                {rule.timeframe}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                  isAuto
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : isSemi
                                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                      : "bg-secondary text-muted-foreground",
                                )}
                              >
                                {isAuto
                                  ? "⚡ Auto-Executor"
                                  : isSemi
                                    ? "🎯 Semi-Auto (1-Clique)"
                                    : "🔔 Apenas Alerta"}
                              </span>
                            </div>

                            {/* Enable switch */}
                            <button
                              onClick={() => toggleRule(rule.id)}
                              className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                rule.enabled ? "bg-primary" : "bg-muted",
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                                  rule.enabled ? "translate-x-4" : "translate-x-0",
                                )}
                              />
                            </button>
                          </div>

                          <h4 className="text-sm font-bold text-foreground mb-1.5">
                            {rule.name}
                          </h4>

                          {/* Conditions summary */}
                          <div className="bg-secondary/40 rounded-lg p-2 text-[11px] font-mono space-y-1 mb-3 border border-border/40">
                            {rule.conditions.map((cond, idx) => (
                              <div key={cond.id} className="flex items-center gap-1.5 text-muted-foreground">
                                {idx > 0 && (
                                  <span className="text-primary font-bold text-[9px] uppercase">
                                    {rule.logic}
                                  </span>
                                )}
                                <span className="text-foreground">
                                  {formatConditionDescription(cond.config)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Order Details Preview */}
                          {(isAuto || isSemi) && (
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3 px-1">
                              <span>
                                Lado:{" "}
                                <strong
                                  className={
                                    rule.action.orderConfig.side === "BUY"
                                      ? "text-emerald-400"
                                      : rule.action.orderConfig.side === "SELL"
                                        ? "text-rose-400"
                                        : "text-primary"
                                  }
                                >
                                  {rule.action.orderConfig.side}
                                </strong>
                              </span>
                              <span>
                                Qtd:{" "}
                                <strong className="text-foreground font-mono">
                                  {rule.action.orderConfig.quantity || 1}
                                </strong>
                              </span>
                              {rule.action.orderConfig.takeProfitPips ? (
                                <span>
                                  TP:{" "}
                                  <strong className="text-emerald-400 font-mono">
                                    {rule.action.orderConfig.takeProfitPips}p
                                  </strong>
                                </span>
                              ) : null}
                              {rule.action.orderConfig.stopLossPips ? (
                                <span>
                                  SL:{" "}
                                  <strong className="text-rose-400 font-mono">
                                    {rule.action.orderConfig.stopLossPips}p
                                  </strong>
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* Bottom Bar Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                          <span className="text-[10px] text-muted-foreground">
                            Disparos:{" "}
                            <strong className="text-foreground font-mono">
                              {rule.triggerCount || 0}
                            </strong>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                triggerRuleManually(
                                  rule.id,
                                  currentPrice || 50000,
                                  accountId,
                                )
                              }
                              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                              title="Testar Disparo Agora"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => duplicateRule(rule.id)}
                              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                              title="Duplicar Regra"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleEditRule(rule)}
                              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                              title="Editar Regra"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE / EDIT RULE */}
          {activeTab === "create" && (
            <div className="space-y-6">
              {/* Presets Gallery */}
              {!editingRuleId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Modelos de Estratégias & Sinais Rápidos:
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Clique para preencher a regra instantaneamente
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {STRATEGY_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="text-left p-2.5 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/60 hover:border-primary/50 transition-all text-xs group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary uppercase">
                            {preset.category}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground">
                            {preset.recommendedTimeframe}
                          </span>
                        </div>
                        <h5 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {preset.name}
                        </h5>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Details */}
              <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {editingRuleId ? "Configurações da Regra" : "Configuração da Nova Regra"}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Nome da Regra / Sinal
                    </label>
                    <input
                      type="text"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      placeholder="Ex: RSI Sobrevendido + Auto Compra BTC"
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Par / Símbolo
                    </label>
                    <input
                      type="text"
                      value={ruleSymbol}
                      onChange={(e) => setRuleSymbol(e.target.value.toUpperCase())}
                      placeholder="BTCUSD ou ALL"
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Tempo Gráfico
                    </label>
                    <select
                      value={ruleTimeframe}
                      onChange={(e) => setRuleTimeframe(e.target.value as Timeframe)}
                      className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                    >
                      {TIMEFRAMES.map((tf) => (
                        <option key={tf} value={tf}>
                          {tf}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Lógica das Condições
                    </label>
                    <select
                      value={ruleLogic}
                      onChange={(e) => setRuleLogic(e.target.value as "AND" | "OR")}
                      className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                    >
                      <option value="AND">E (Todas devem ocorrer)</option>
                      <option value="OR">OU (Qualquer uma)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Frequência / Cooldown
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="1440"
                        value={ruleCooldown}
                        onChange={(e) => setRuleCooldown(Number(e.target.value))}
                        className="w-20 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-mono"
                      />
                      <span className="text-[10px] text-muted-foreground">minutos</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Som do Alerta
                    </label>
                    <div className="flex items-center gap-1">
                      <select
                        value={ruleSoundType}
                        onChange={(e) => setRuleSoundType(e.target.value as SoundType)}
                        className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground"
                      >
                        <option value="chime">Chime Duplo</option>
                        <option value="ping">Radar Ping</option>
                        <option value="sonar">Sonar Profundo</option>
                        <option value="alarm">Alarme Triplo</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => playAlertSound(ruleSoundType, soundVolume)}
                        className="p-1.5 bg-secondary hover:bg-primary/20 rounded-lg text-primary transition-colors"
                        title="Ouvir som"
                      >
                        <Play className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditions Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span>Gatilhos & Condições ({conditions.length})</span>
                  </h4>

                  {/* Add Condition Dropdown */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">Adicionar Indicador:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCondition("price_ma")}
                      className="h-6 text-[10px] px-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 font-bold"
                    >
                      + EMA vs Preço
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCondition("price_level")}
                      className="h-6 text-[10px] px-2"
                    >
                      Nível de Preço
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCondition("rsi")}
                      className="h-6 text-[10px] px-2"
                    >
                      RSI
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCondition("ma_cross")}
                      className="h-6 text-[10px] px-2"
                    >
                      Cruzamento Médias
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCondition("macd")}
                      className="h-6 text-[10px] px-2"
                    >
                      MACD
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCondition("bollinger")}
                      className="h-6 text-[10px] px-2"
                    >
                      Bollinger
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCondition("volume_surge")}
                      className="h-6 text-[10px] px-2"
                    >
                      Volume
                    </Button>
                  </div>
                </div>

                {conditions.map((cond, idx) => (
                  <div
                    key={cond.id}
                    className="p-3 bg-secondary/40 border border-border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-foreground">
                        {cond.config.type === "price_level" && "Nível de Preço"}
                        {cond.config.type === "rsi" && "RSI (Relative Strength)"}
                        {cond.config.type === "ma_cross" && "Cruzamento de Médias"}
                        {cond.config.type === "price_ma" && "EMA / Média vs Preço"}
                        {cond.config.type === "macd" && "MACD Momentum"}
                        {cond.config.type === "bollinger" && "Bandas de Bollinger"}
                        {cond.config.type === "atr_volatility" && "ATR Volatilidade"}
                        {cond.config.type === "volume_surge" && "Volume Spike"}
                      </span>
                    </div>

                    {/* Condition specific controls */}
                    <div className="flex-1 flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {cond.config.type === "price_ma" && (
                        <>
                          <select
                            value={cond.config.params.maType}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                maType: e.target.value as MaType,
                              })
                            }
                            className="bg-secondary border border-border rounded px-2 py-1 text-xs font-bold text-primary"
                          >
                            <option value="EMA">EMA (Exponencial)</option>
                            <option value="SMA">SMA (Simples)</option>
                          </select>
                          <span className="text-muted-foreground">Período:</span>
                          <input
                            type="number"
                            value={cond.config.params.period}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                period: Number(e.target.value),
                              })
                            }
                            className="w-16 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
                          />
                          <select
                            value={cond.config.params.operator}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                operator: e.target.value as PriceMaOperator,
                              })
                            }
                            className="bg-secondary border border-border rounded px-2 py-1 text-xs font-medium"
                          >
                            <option value="ema_below_price">
                              EMA Abaixo do Preço (Sinal de COMPRA)
                            </option>
                            <option value="ema_above_price">
                              EMA Acima do Preço (Sinal de VENDA)
                            </option>
                            <option value="cross_above">
                              Preço Cruza Acima da EMA (Breakout Compra)
                            </option>
                            <option value="cross_below">
                              Preço Cruza Abaixo da EMA (Breakdown Venda)
                            </option>
                          </select>
                        </>
                      )}

                      {cond.config.type === "price_level" && (
                        <>
                          <select
                            value={cond.config.params.operator}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                operator: e.target.value as PriceLevelOperator,
                              })
                            }
                            className="bg-secondary border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="greater_than">Preço &gt;=</option>
                            <option value="less_than">Preço &lt;=</option>
                            <option value="cross_above">Cruza Acima de</option>
                            <option value="cross_below">Cruza Abaixo de</option>
                          </select>
                          <input
                            type="number"
                            step="any"
                            value={cond.config.params.targetPrice}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                targetPrice: Number(e.target.value),
                              })
                            }
                            className="w-28 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
                          />
                        </>
                      )}

                      {cond.config.type === "rsi" && (
                        <>
                          <span className="text-muted-foreground">Período:</span>
                          <input
                            type="number"
                            value={cond.config.params.period}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                period: Number(e.target.value),
                              })
                            }
                            className="w-14 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
                          />
                          <select
                            value={cond.config.params.operator}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                operator: e.target.value,
                              })
                            }
                            className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
                          >
                            <option value="<">&lt; (Menor que)</option>
                            <option value=">">&gt; (Maior que)</option>
                            <option value="cross_above">Cruza Acima</option>
                            <option value="cross_below">Cruza Abaixo</option>
                          </select>
                          <input
                            type="number"
                            value={cond.config.params.threshold}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                threshold: Number(e.target.value),
                              })
                            }
                            className="w-16 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
                          />
                        </>
                      )}

                      {cond.config.type === "ma_cross" && (
                        <>
                          <select
                            value={cond.config.params.fastType}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                fastType: e.target.value as MaType,
                              })
                            }
                            className="bg-secondary border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="EMA">EMA</option>
                            <option value="SMA">SMA</option>
                          </select>
                          <input
                            type="number"
                            value={cond.config.params.fastPeriod}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                fastPeriod: Number(e.target.value),
                              })
                            }
                            className="w-14 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
                          />
                          <select
                            value={cond.config.params.direction}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                direction: e.target.value,
                              })
                            }
                            className="bg-secondary border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="golden_cross">Cruza Acima (Golden)</option>
                            <option value="death_cross">Cruza Abaixo (Death)</option>
                          </select>
                          <select
                            value={cond.config.params.slowType}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                slowType: e.target.value as MaType,
                              })
                            }
                            className="bg-secondary border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="EMA">EMA</option>
                            <option value="SMA">SMA</option>
                          </select>
                          <input
                            type="number"
                            value={cond.config.params.slowPeriod}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                slowPeriod: Number(e.target.value),
                              })
                            }
                            className="w-14 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
                          />
                        </>
                      )}

                      {cond.config.type === "macd" && (
                        <select
                          value={cond.config.params.event}
                          onChange={(e) =>
                            updateConditionParam(cond.id, {
                              event: e.target.value,
                            })
                          }
                          className="bg-secondary border border-border rounded px-2 py-1 text-xs"
                        >
                          <option value="macd_cross_signal_bullish">
                            MACD Cruza Acima do Sinal (Bullish)
                          </option>
                          <option value="macd_cross_signal_bearish">
                            MACD Cruza Abaixo do Sinal (Bearish)
                          </option>
                          <option value="hist_turn_positive">
                            Histograma Vira Positivo (&gt;0)
                          </option>
                          <option value="hist_turn_negative">
                            Histograma Vira Negativo (&lt;0)
                          </option>
                        </select>
                      )}

                      {cond.config.type === "bollinger" && (
                        <select
                          value={cond.config.params.event}
                          onChange={(e) =>
                            updateConditionParam(cond.id, {
                              event: e.target.value,
                            })
                          }
                          className="bg-secondary border border-border rounded px-2 py-1 text-xs"
                        >
                          <option value="touch_lower">Toca Banda Inferior (Lower)</option>
                          <option value="touch_upper">Toca Banda Superior (Upper)</option>
                          <option value="breakout_upper">Rompimento Superior</option>
                          <option value="breakout_lower">Rompimento Inferior</option>
                        </select>
                      )}

                      {cond.config.type === "volume_surge" && (
                        <>
                          <span className="text-muted-foreground">&gt;= Multiplicador:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={cond.config.params.multiplier}
                            onChange={(e) =>
                              updateConditionParam(cond.id, {
                                multiplier: Number(e.target.value),
                              })
                            }
                            className="w-16 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
                          />
                          <span className="text-muted-foreground">x da Média</span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCondition(cond.id)}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover Condição"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Order Executor Linkage Section */}
              <div className="bg-gradient-to-br from-primary/10 via-secondary/20 to-transparent border-2 border-primary/40 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary fill-current" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Vinculação com Executor de Ordens
                    </h4>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Ação executada no disparo do sinal
                  </span>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleExecutionMode("ALERT_ONLY")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      ruleExecutionMode === "ALERT_ONLY"
                        ? "bg-primary/20 border-primary text-foreground font-bold shadow-sm"
                        : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/80",
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                      <Bell className="h-3.5 w-3.5" /> Apenas Alerta
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Dispara áudio e notificação na tela sem abrir ordens.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRuleExecutionMode("SEMI_AUTO")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      ruleExecutionMode === "SEMI_AUTO"
                        ? "bg-primary/20 border-primary text-foreground font-bold shadow-sm"
                        : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/80",
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-cyan-400">
                      <Sparkles className="h-3.5 w-3.5" /> Semi-Auto (1-Clique)
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Exibe banner flutuante para executar a ordem com 1 clique.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRuleExecutionMode("AUTO_EXECUTE")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      ruleExecutionMode === "AUTO_EXECUTE"
                        ? "bg-amber-500/20 border-amber-500 text-foreground font-bold shadow-sm"
                        : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/80",
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-amber-400">
                      <Zap className="h-3.5 w-3.5 fill-current" /> Auto-Executor
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Envia ordem instantaneamente para a conta ao detectar o sinal.
                    </p>
                  </button>
                </div>

                {/* Linked Order Parameters */}
                {ruleExecutionMode !== "ALERT_ONLY" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Direção / Lado
                      </label>
                      <select
                        value={orderSide}
                        onChange={(e) => setOrderSide(e.target.value as OrderSideChoice)}
                        className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-bold"
                      >
                        <option value="AUTO">AUTO (Detectar Sinal)</option>
                        <option value="BUY">BUY (Comprar)</option>
                        <option value="SELL">SELL (Vender)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Tipo de Ordem
                      </label>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as OrderTypeChoice)}
                        className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono"
                      >
                        <option value="MARKET">A Mercado (Market)</option>
                        <option value="LIMIT">Limite (Limit)</option>
                        <option value="STOP">Stop</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Lotes / Quantidade
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(Number(e.target.value))}
                        className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Take Profit (Pips)
                      </label>
                      <input
                        type="number"
                        value={orderTakeProfitPips}
                        onChange={(e) => setOrderTakeProfitPips(Number(e.target.value))}
                        className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-emerald-400"
                        placeholder="Ex: 100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Stop Loss (Pips)
                      </label>
                      <input
                        type="number"
                        value={orderStopLossPips}
                        onChange={(e) => setOrderStopLossPips(Number(e.target.value))}
                        className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-rose-400"
                        placeholder="Ex: 50"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Comentário da Ordem (Opcional)
                      </label>
                      <input
                        type="text"
                        value={orderComment}
                        onChange={(e) => setOrderComment(e.target.value)}
                        placeholder="Ex: [Sinal] RSI 15m Reversal"
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingRuleId(null);
                    setActiveTab("rules");
                  }}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveRule}
                  className="text-xs font-bold gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  {editingRuleId ? "Salvar Alterações" : "Salvar e Ativar Regra"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: SIGNAL & EXECUTION LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Últimos sinais e execuções registradas ({logs.length})
                </span>
                {logs.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearLogs}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Limpar Histórico
                  </Button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                  Nenhum sinal disparado até o momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => {
                    const isSuccess = log.executionStatus === "EXECUTED";
                    const isPending = log.executionStatus === "PENDING_CONFIRMATION";
                    const isFailed = log.executionStatus === "FAILED";

                    return (
                      <div
                        key={log.id}
                        className="p-3 bg-secondary/30 border border-border rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{log.symbol}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {new Date(log.triggeredAt).toLocaleTimeString()}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded font-bold uppercase",
                                isSuccess
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : isPending
                                    ? "bg-cyan-500/20 text-cyan-400"
                                    : isFailed
                                      ? "bg-rose-500/20 text-rose-400"
                                      : "bg-secondary text-muted-foreground",
                              )}
                            >
                              {log.executionStatus}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-foreground">{log.ruleName}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {log.conditionSummary}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-foreground">
                            Preço: {log.triggerPrice.toFixed(2)}
                          </div>
                          {log.orderId && (
                            <div className="text-[10px] font-mono text-emerald-400">
                              Ordem #{log.orderId.slice(0, 8)} ({log.orderSide} {log.orderQuantity})
                            </div>
                          )}
                          {log.errorMessage && (
                            <div className="text-[10px] text-rose-400 max-w-[200px] truncate">
                              {log.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
