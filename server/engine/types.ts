export type EngineSignalSide = "LONG" | "SHORT" | "EXIT";
export type EngineMode = "spot" | "futures";

export interface EngineSignal {
  id?: string;
  symbol: string;
  side: EngineSignalSide;
  price?: number;
  timeframe?: string;
  strategy?: string;
  quantity?: number;
  riskPct?: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  mode?: EngineMode;
  source?: string;
}

export interface EngineOpenTrade {
  id: string;
  signalId?: string;
  symbol: string;
  side: "LONG" | "SHORT";
  mode: EngineMode;
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  openedAt: number;
  strategy?: string;
}

export interface EngineClosedTrade {
  id: string;
  signalId?: string;
  symbol: string;
  side: "LONG" | "SHORT";
  mode: EngineMode;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  openedAt: number;
  closedAt: number;
  reason: "SIGNAL" | "STOP_LOSS" | "TAKE_PROFIT" | "MANUAL";
  realizedPnl: number;
  fees: number;
  strategy?: string;
}

export interface EngineError {
  time: number;
  context: string;
  message: string;
}

export type EngineEvent =
  | { type: "signal_received"; signal: EngineSignal; accepted: boolean; reason?: string }
  | { type: "order_opened"; trade: EngineOpenTrade; orderResult?: any }
  | { type: "order_closed"; trade: EngineClosedTrade }
  | { type: "error"; context: string; message: string }
  | { type: "balance"; balance: number; currency: string }
  | { type: "cooldown"; symbol: string; until: number };

export type EngineEventListener = (event: EngineEvent) => void;