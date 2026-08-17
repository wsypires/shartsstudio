import type { EngineClosedTrade, EngineError, EngineEvent, EngineOpenTrade } from "./types.ts";

export interface ReportSnapshot {
  openTrades: EngineOpenTrade[];
  closedTrades: EngineClosedTrade[];
  summary: {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    realizedPnl: number;
    totalFees: number;
    netPnl: number;
  };
  errors: EngineError[];
  eventLog: { time: number; type: string; summary: string }[];
}

export class ReportEngine {
  private closedTrades: EngineClosedTrade[] = [];
  private errors: EngineError[] = [];
  private eventLog: { time: number; type: string; summary: string }[] = [];

  subscribe() {
    return (event: EngineEvent) => {
      this.eventLog = [{ time: Date.now(), type: event.type, summary: this.summarize(event) }, ...this.eventLog].slice(0, 100);
      if (event.type === "order_closed") {
        this.closedTrades = [event.trade, ...this.closedTrades].slice(0, 500);
      }
      if (event.type === "error") {
        this.errors = [{ time: Date.now(), context: event.context, message: event.message }, ...this.errors].slice(0, 100);
      }
    };
  }

  private summarize(event: EngineEvent): string {
    switch (event.type) {
      case "signal_received":
        return `${event.signal.side} ${event.signal.symbol}${event.accepted ? "" : ` (${event.reason})`}`;
      case "order_opened":
        return `${event.trade.side} ${event.trade.symbol} @ ${event.trade.entryPrice}`;
      case "order_closed":
        return `${event.trade.symbol} → ${event.trade.reason} PnL ${event.trade.realizedPnl}`;
      case "error":
        return `${event.context}: ${event.message}`;
      case "balance":
        return `${event.balance.toFixed(2)} ${event.currency}`;
      case "cooldown":
        return `${event.symbol} até ${new Date(event.until).toLocaleTimeString("pt-BR")}`;
      default:
        return event.type;
    }
  }

  getSnapshot(openTrades: EngineOpenTrade[]): ReportSnapshot {
    const totalTrades = this.closedTrades.length;
    const wins = this.closedTrades.filter((t) => t.realizedPnl > 0).length;
    const losses = this.closedTrades.filter((t) => t.realizedPnl < 0).length;
    const realizedPnl = this.closedTrades.reduce((s, t) => s + t.realizedPnl, 0);
    const totalFees = this.closedTrades.reduce((s, t) => s + t.fees, 0);

    return {
      openTrades,
      closedTrades: this.closedTrades.slice(0, 50),
      summary: {
        totalTrades,
        wins,
        losses,
        winRate: totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0,
        realizedPnl: Math.round(realizedPnl * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        netPnl: Math.round((realizedPnl - totalFees) * 100) / 100,
      },
      errors: this.errors.slice(0, 20),
      eventLog: this.eventLog.slice(0, 50),
    };
  }
}