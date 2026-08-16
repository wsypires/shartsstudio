import type { Timeframe } from "../../pages/trading/constants.ts";

export type ConditionType =
  | "price_level"
  | "rsi"
  | "ma_cross"
  | "price_ma"
  | "macd"
  | "bollinger"
  | "atr_volatility"
  | "volume_surge";

export type PriceLevelOperator = "cross_above" | "cross_below" | "greater_than" | "less_than";
export type RsiOperator = ">" | "<" | "cross_above" | "cross_below";
export type MaType = "EMA" | "SMA";
export type MaCrossDirection = "golden_cross" | "death_cross";
export type PriceMaOperator =
  | "cross_above"
  | "cross_below"
  | "price_above"
  | "price_below"
  | "ema_below_price"
  | "ema_above_price";
export type MacdEvent =
  | "macd_cross_signal_bullish"
  | "macd_cross_signal_bearish"
  | "hist_turn_positive"
  | "hist_turn_negative";
export type BollingerEvent = "touch_upper" | "touch_lower" | "breakout_upper" | "breakout_lower";

export interface PriceLevelParams {
  operator: PriceLevelOperator;
  targetPrice: number;
}

export interface RsiParams {
  period: number;
  operator: RsiOperator;
  threshold: number;
}

export interface MaCrossParams {
  fastPeriod: number;
  fastType: MaType;
  slowPeriod: number;
  slowType: MaType;
  direction: MaCrossDirection;
}

export interface PriceMaParams {
  period: number;
  maType: MaType;
  operator: PriceMaOperator;
}

export interface MacdParams {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  event: MacdEvent;
}

export interface BollingerParams {
  period: number;
  stdDev: number;
  event: BollingerEvent;
}

export interface AtrParams {
  period: number;
  operator: ">" | "<";
  threshold: number;
}

export interface VolumeSurgeParams {
  period: number;
  multiplier: number;
}

export type ConditionParams =
  | { type: "price_level"; params: PriceLevelParams }
  | { type: "rsi"; params: RsiParams }
  | { type: "ma_cross"; params: MaCrossParams }
  | { type: "price_ma"; params: PriceMaParams }
  | { type: "macd"; params: MacdParams }
  | { type: "bollinger"; params: BollingerParams }
  | { type: "atr_volatility"; params: AtrParams }
  | { type: "volume_surge"; params: VolumeSurgeParams };

export interface RuleCondition {
  id: string;
  config: ConditionParams;
}

export type ExecutionMode = "ALERT_ONLY" | "SEMI_AUTO" | "AUTO_EXECUTE";
export type OrderSideChoice = "BUY" | "SELL" | "AUTO";
export type OrderTypeChoice = "MARKET" | "LIMIT" | "STOP";
export type SoundType = "chime" | "ping" | "sonar" | "alarm";

export interface LinkedOrderConfig {
  side: OrderSideChoice;
  type: OrderTypeChoice;
  quantity: number;
  priceOffsetPips?: number;
  takeProfitPips?: number;
  stopLossPips?: number;
  comment?: string;
}

export interface RuleAction {
  notifyToast: boolean;
  notifyAudio: boolean;
  soundType: SoundType;
  executionMode: ExecutionMode;
  orderConfig: LinkedOrderConfig;
}

export interface SignalRule {
  id: string;
  name: string;
  symbol: string; // Specific symbol like "BTCUSD" or "ALL"
  timeframe: Timeframe;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  lastTriggeredAt?: number;
  triggerCount: number;
  isOneTime: boolean; // if true, disables after first trigger
  cooldownMinutes: number; // minimum wait time before re-triggering (0 = every matching event)
  logic: "AND" | "OR";
  conditions: RuleCondition[];
  action: RuleAction;
  color?: string;
}

export type ExecutionStatus =
  | "NOTIFIED"
  | "PENDING_CONFIRMATION"
  | "EXECUTED"
  | "DISMISSED"
  | "FAILED";

export interface SignalAlertLog {
  id: string;
  ruleId: string;
  ruleName: string;
  symbol: string;
  timeframe: string;
  triggeredAt: number;
  triggerPrice: number;
  conditionSummary: string;
  executionMode: ExecutionMode;
  executionStatus: ExecutionStatus;
  orderId?: string;
  orderSide?: string;
  orderQuantity?: number;
  orderPrice?: number;
  errorMessage?: string;
}

export interface PendingSignalConfirmation {
  id: string;
  ruleId: string;
  ruleName: string;
  symbol: string;
  timeframe: string;
  currentPrice: number;
  conditionSummary: string;
  suggestedSide: "BUY" | "SELL";
  orderConfig: LinkedOrderConfig;
  triggeredAt: number;
  expiresAt: number;
}
