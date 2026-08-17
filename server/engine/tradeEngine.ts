import { binanceRequest, resolveCredentials } from "../binance.ts";
import type {
  EngineClosedTrade,
  EngineError,
  EngineEvent,
  EngineEventListener,
  EngineOpenTrade,
  EngineSignal,
} from "./types.ts";

export interface TradeEngineConfig {
  cooldownMs?: number;
  defaultRiskPct?: number;
  defaultMode?: "spot" | "futures";
  monitorIntervalMs?: number;
}

interface CooldownEntry {
  until: number;
  side: "LONG" | "SHORT";
}

const round = (n: number, decimals = 8) => {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
};

function getEnvCreds() {
  const { apiKey, apiSecret, useTestnet } = resolveCredentials({});
  return { apiKey, apiSecret, useTestnet };
}

export class TradeEngine {
  openTrades: EngineOpenTrade[] = [];
  closedTrades: EngineClosedTrade[] = [];
  errors: EngineError[] = [];
  cooldowns = new Map<string, CooldownEntry>();
  private listeners: EngineEventListener[] = [];
  private monitorTimer: ReturnType<typeof setInterval> | null = null;
  private balance = 0;
  private balanceCurrency = "USDT";
  private config: Required<TradeEngineConfig>;

  constructor(config: TradeEngineConfig = {}) {
    this.config = {
      cooldownMs: config.cooldownMs ?? 60_000,
      defaultRiskPct: config.defaultRiskPct ?? 1,
      defaultMode: config.defaultMode ?? "spot",
      monitorIntervalMs: config.monitorIntervalMs ?? 5000,
    };
  }

  onEvent(listener: EngineEventListener) {
    this.listeners.push(listener);
  }

  private emit(event: EngineEvent) {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
        /* listener errors must not break the engine */
      }
    }
  }

  private recordError(context: string, message: string) {
    this.errors = [{ time: Date.now(), context, message }, ...this.errors].slice(0, 100);
    this.emit({ type: "error", context, message });
  }

  start() {
    if (this.monitorTimer) return;
    this.monitorTimer = setInterval(() => {
      this.monitorStops().catch(() => {});
    }, this.config.monitorIntervalMs);
  }

  stop() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  isInCooldown(symbol: string, side: "LONG" | "SHORT") {
    const entry = this.cooldowns.get(symbol);
    if (!entry) return false;
    if (Date.now() >= entry.until) {
      this.cooldowns.delete(symbol);
      return false;
    }
    return entry.side === side;
  }

  async getBalance(creds = getEnvCreds()): Promise<number> {
    try {
      const result = await binanceRequest("/api/v3/account", {
        signed: true,
        apiKey: creds.apiKey,
        apiSecret: creds.apiSecret,
        useTestnet: creds.useTestnet,
        params: { omitZeroBalances: "true" },
      });
      if (result.ok && Array.isArray(result.data?.balances)) {
        const usdt = result.data.balances.find((b: any) => b.asset === "USDT");
        this.balance = parseFloat(usdt?.free || "0");
        this.balanceCurrency = "USDT";
      }
    } catch (err: any) {
      this.recordError("balance", err?.message || String(err));
    }
    return this.balance;
  }

  async getPrice(symbol: string, creds = getEnvCreds()): Promise<number | null> {
    const result = await binanceRequest("/api/v3/ticker/price", {
      params: { symbol },
      useTestnet: creds.useTestnet,
    });
    if (result.ok && result.data?.price) return parseFloat(result.data.price);
    return null;
  }

  private computeQuantity(signal: EngineSignal, entryPrice: number, balance: number): number {
    if (signal.quantity && signal.quantity > 0) return signal.quantity;
    const riskPct = signal.riskPct ?? this.config.defaultRiskPct;
    const riskAmount = balance * (riskPct / 100);
    const stopDistance = signal.stopLoss ? Math.abs(entryPrice - signal.stopLoss) : 0;
    const qty = stopDistance > 0 ? riskAmount / stopDistance : riskAmount / entryPrice;
    return round(qty, 6);
  }

  async processSignal(signal: EngineSignal): Promise<{ ok: boolean; trade?: EngineOpenTrade; error?: string }> {
    const symbol = String(signal.symbol || "").toUpperCase();
    const side = signal.side;
    const mode = signal.mode ?? this.config.defaultMode;

    if (!symbol) {
      return { ok: false, error: "Símbolo ausente no sinal." };
    }

    if (side === "EXIT") {
      const closed = await this.closeAllForSymbol(symbol, "SIGNAL");
      this.emit({ type: "signal_received", signal, accepted: true, reason: `EXIT → fechou ${closed} posição(ões)` });
      return { ok: true };
    }

    if (side !== "LONG" && side !== "SHORT") {
      return { ok: false, error: `Lado de sinal inválido: ${side}` };
    }

    if (this.isInCooldown(symbol, side)) {
      const until = this.cooldowns.get(symbol)!.until;
      this.emit({ type: "signal_received", signal, accepted: false, reason: "COOLDOWN" });
      this.emit({ type: "cooldown", symbol, until });
      return { ok: false, error: `Cooldown ativo para ${symbol} (${side}). Aguarde até ${new Date(until).toLocaleTimeString("pt-BR")}.` };
    }

    const creds = getEnvCreds();
    if (!creds.apiKey || !creds.apiSecret) {
      return { ok: false, error: "Credenciais Binance não configuradas no servidor (.env)." };
    }

    const entryPrice = signal.price ?? (await this.getPrice(symbol, creds)) ?? 0;
    if (!entryPrice || entryPrice <= 0) {
      this.recordError("signal", `Não foi possível obter preço de ${symbol}`);
      return { ok: false, error: `Sem preço válido para ${symbol}.` };
    }

    const balance = await this.getBalance(creds);
    const quantity = this.computeQuantity(signal, entryPrice, balance);

    let orderResult: any;
    try {
      if (mode === "futures") {
        orderResult = await this.placeFuturesOrder(symbol, side, quantity, signal.leverage ?? 1, creds);
      } else {
        orderResult = await this.placeSpotOrder(symbol, side, quantity, creds);
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.recordError("order", `Falha ao executar ${side} ${quantity} ${symbol}: ${msg}`);
      return { ok: false, error: msg };
    }

    if (!orderResult || orderResult.status !== "FILLED") {
      const status = orderResult?.status || "REJECTED";
      const msg = orderResult?.userFriendlyMessage || orderResult?.msg || `Ordem ${status} para ${symbol}`;
      this.recordError("order", msg);
      return { ok: false, error: msg };
    }

    const fillPrice = parseFloat(orderResult.fills?.[0]?.price || orderResult.price || String(entryPrice));
    const trade: EngineOpenTrade = {
      id: `trade_${Date.now()}`,
      signalId: signal.id,
      symbol,
      side,
      mode,
      quantity,
      entryPrice: round(fillPrice),
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      leverage: mode === "futures" ? (signal.leverage ?? 1) : 1,
      openedAt: Date.now(),
      strategy: signal.strategy || signal.source,
    };

    this.openTrades.push(trade);
    this.cooldowns.set(symbol, { until: Date.now() + this.config.cooldownMs, side });
    this.emit({ type: "order_opened", trade, orderResult });
    return { ok: true, trade };
  }

  private async placeSpotOrder(
    symbol: string,
    side: "LONG" | "SHORT",
    quantity: number,
    creds: { apiKey: string; apiSecret: string; useTestnet: boolean },
  ): Promise<any> {
    const binanceSide = side === "LONG" ? "BUY" : "SELL";
    const result = await binanceRequest("/api/v3/order", {
      method: "POST",
      signed: true,
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      useTestnet: creds.useTestnet,
      params: { symbol, side: binanceSide, type: "MARKET", quantity },
    });
    if (!result.ok) {
      throw new Error(result.data?.userFriendlyMessage || result.data?.msg || `Binance erro ${result.status}`);
    }
    return result.data;
  }

  private async placeFuturesOrder(
    symbol: string,
    side: "LONG" | "SHORT",
    quantity: number,
    leverage: number,
    creds: { apiKey: string; apiSecret: string; useTestnet: boolean },
  ): Promise<any> {
    const lev = Math.max(1, Math.min(125, Math.round(leverage)));
    await binanceRequest("/fapi/v1/leverage", {
      method: "POST",
      signed: true,
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      useTestnet: creds.useTestnet,
      params: { symbol, leverage: lev },
    });
    const binanceSide = side === "LONG" ? "BUY" : "SELL";
    const result = await binanceRequest("/fapi/v1/order", {
      method: "POST",
      signed: true,
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      useTestnet: creds.useTestnet,
      params: { symbol, side: binanceSide, type: "MARKET", quantity },
    });
    if (!result.ok) {
      throw new Error(result.data?.userFriendlyMessage || result.data?.msg || `Binance futuros erro ${result.status}`);
    }
    return result.data;
  }

  private async closeTrade(trade: EngineOpenTrade, reason: EngineClosedTrade["reason"]): Promise<void> {
    const creds = getEnvCreds();
    const exitPrice = (await this.getPrice(trade.symbol, creds)) ?? trade.entryPrice;
    let fees = 0;

    try {
      if (trade.mode === "futures") {
        const binanceSide = trade.side === "LONG" ? "SELL" : "BUY";
        const result = await binanceRequest("/fapi/v1/order", {
          method: "POST",
          signed: true,
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          useTestnet: creds.useTestnet,
          params: { symbol: trade.symbol, side: binanceSide, type: "MARKET", quantity: trade.quantity },
        });
        if (result.ok) {
          const fill = result.data?.fills?.[0];
          if (fill) fees = parseFloat(fill.commission || "0");
        }
      } else {
        const binanceSide = trade.side === "LONG" ? "SELL" : "BUY";
        const result = await binanceRequest("/api/v3/order", {
          method: "POST",
          signed: true,
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          useTestnet: creds.useTestnet,
          params: { symbol: trade.symbol, side: binanceSide, type: "MARKET", quantity: trade.quantity },
        });
        if (result.ok) {
          const fill = result.data?.fills?.[0];
          if (fill) fees = parseFloat(fill.commission || "0");
        }
      }
    } catch (err: any) {
      this.recordError("close", `Falha ao fechar ${trade.symbol}: ${err?.message || String(err)}`);
    }

    const pnl =
      trade.side === "LONG"
        ? (exitPrice - trade.entryPrice) * trade.quantity
        : (trade.entryPrice - exitPrice) * trade.quantity;

    const closed: EngineClosedTrade = {
      id: `closed_${trade.id}`,
      signalId: trade.signalId,
      symbol: trade.symbol,
      side: trade.side,
      mode: trade.mode,
      quantity: trade.quantity,
      entryPrice: trade.entryPrice,
      exitPrice: round(exitPrice),
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      leverage: trade.leverage,
      openedAt: trade.openedAt,
      closedAt: Date.now(),
      reason,
      realizedPnl: round(pnl),
      fees: round(fees),
      strategy: trade.strategy,
    };

    this.openTrades = this.openTrades.filter((t) => t.id !== trade.id);
    this.closedTrades = [closed, ...this.closedTrades].slice(0, 500);
    this.emit({ type: "order_closed", trade: closed });
  }

  async closeAllForSymbol(symbol: string, reason: EngineClosedTrade["reason"] = "MANUAL"): Promise<number> {
    const targets = this.openTrades.filter((t) => t.symbol === symbol);
    for (const t of targets) {
      await this.closeTrade(t, reason);
    }
    return targets.length;
  }

  async closeById(id: string, reason: EngineClosedTrade["reason"] = "MANUAL"): Promise<boolean> {
    const trade = this.openTrades.find((t) => t.id === id);
    if (!trade) return false;
    await this.closeTrade(trade, reason);
    return true;
  }

  private async monitorStops() {
    const open = [...this.openTrades];
    for (const trade of open) {
      const price = await this.getPrice(trade.symbol);
      if (price == null) continue;
      if (trade.side === "LONG") {
        if (trade.stopLoss && price <= trade.stopLoss) {
          await this.closeTrade(trade, "STOP_LOSS");
        } else if (trade.takeProfit && price >= trade.takeProfit) {
          await this.closeTrade(trade, "TAKE_PROFIT");
        }
      } else {
        if (trade.stopLoss && price >= trade.stopLoss) {
          await this.closeTrade(trade, "STOP_LOSS");
        } else if (trade.takeProfit && price <= trade.takeProfit) {
          await this.closeTrade(trade, "TAKE_PROFIT");
        }
      }
    }
  }

  getSnapshot() {
    return {
      openTrades: [...this.openTrades],
      closedTrades: this.closedTrades.slice(0, 50),
      errors: this.errors.slice(0, 20),
      cooldowns: Array.from(this.cooldowns.entries()).map(([symbol, entry]) => ({ symbol, side: entry.side, until: entry.until })),
      balance: this.balance,
      balanceCurrency: this.balanceCurrency,
    };
  }
}