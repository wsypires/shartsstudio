import { demoApi } from "./demo/api.ts";
import type { Candle } from "./schemas.ts";
import { DEMO_SYMBOLS } from "./demo/instruments.ts";

export const API_BASE = "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// react-query rejects `undefined` query results, so resolve to null instead.
const benign = () => Promise.resolve(null);

export function normalizeBinanceInterval(tf: string): string {
  if (!tf) return "15m";
  const clean = tf.trim();
  const lower = clean.toLowerCase();

  switch (lower) {
    case "1":
    case "1m":
      return "1m";
    case "3":
    case "3m":
      return "3m";
    case "5":
    case "5m":
      return "5m";
    case "15":
    case "15m":
      return "15m";
    case "30":
    case "30m":
      return "30m";
    case "60":
    case "1h":
    case "h":
      return "1h";
    case "120":
    case "2h":
      return "2h";
    case "240":
    case "4h":
      return "4h";
    case "360":
    case "6h":
      return "6h";
    case "480":
    case "8h":
      return "8h";
    case "720":
    case "12h":
      return "12h";
    case "d":
    case "1d":
    case "day":
    case "1440":
      return "1d";
    case "3d":
      return "3d";
    case "w":
    case "1w":
    case "week":
    case "10080":
      return "1w";
    case "m":
    case "1month":
    case "month":
      return "1M";
    default:
      if (clean === "1M") return "1M";
      return lower.endsWith("m") || lower.endsWith("h") || lower.endsWith("d") || lower.endsWith("w")
        ? lower
        : `${lower}m`;
  }
}

async function fetchBinanceCandles(symbol: string, timeframe: string, limit = 500): Promise<Candle[]> {
  const normSymbol = symbol.toUpperCase().endsWith("USD") && !symbol.toUpperCase().endsWith("USDT")
    ? `${symbol.toUpperCase()}T`
    : symbol.toUpperCase();

  const binanceInterval = normalizeBinanceInterval(timeframe);

  try {
    const res = await fetch(
      `/api/binance/klines?symbol=${encodeURIComponent(normSymbol)}&interval=${encodeURIComponent(binanceInterval)}&limit=${limit}`,
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const raw = await res.json();
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((k: any[]) => ({
        time: Math.floor(Number(k[0]) / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    }
  } catch (err) {
    console.debug("Binance klines fetch fallback to local history:", err);
  }
  return demoApi.getCandles(symbol, timeframe, limit);
}

const customApiOverrides: Record<string, any> = {
  getCandles: async (symbol: string, timeframe: string, limit?: number) => {
    return fetchBinanceCandles(symbol, timeframe, limit);
  },
  getCandlesWithMeta: async (symbol: string, timeframe: string, limit?: number) => {
    const candles = await fetchBinanceCandles(symbol, timeframe, limit);
    return {
      candles,
      metadata: { isPartial: false, backfillQueued: false, historicalCoverageStart: null },
    };
  },
  getSymbols: async () => {
    try {
      const res = await fetch("/api/binance/exchangeInfo");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.symbols)) {
          const valid = data.symbols
            .filter((s: any) => s.status === "TRADING" && s.isSpotTradingAllowed && s.quoteAsset === "USDT")
            .slice(0, 100)
            .map((s: any) => {
              const priceFilter = s.filters?.find((f: any) => f.filterType === "PRICE_FILTER");
              const tickSize = priceFilter ? parseFloat(priceFilter.tickSize) : 0.01;
              return {
                id: s.symbol,
                name: s.symbol,
                displayName: `${s.baseAsset} / ${s.quoteAsset}`,
                category: "CRYPTO",
                contractSize: 1,
                tickSize,
                tickValue: tickSize,
                marginPercent: 1,
                maxLeverage: 100,
                commission: 0.001,
                swapLong: 0,
                swapShort: 0,
                tradingHoursStart: null,
                tradingHoursEnd: null,
                isActive: true,
              };
            });
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return DEMO_SYMBOLS;
  },
  getTick: async (symbol: string) => {
    const normSymbol = symbol.toUpperCase().endsWith("USD") && !symbol.toUpperCase().endsWith("USDT")
      ? `${symbol.toUpperCase()}T`
      : symbol.toUpperCase();

    try {
      const res = await fetch(`/api/binance/ticker/24hr?symbol=${encodeURIComponent(normSymbol)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.lastPrice) {
          const bid = parseFloat(data.bidPrice || data.lastPrice);
          const ask = parseFloat(data.askPrice || data.lastPrice);
          return {
            symbol,
            bid,
            ask,
            timestamp: data.closeTime || Date.now(),
          };
        }
      }
    } catch {}
    return demoApi.getTick(symbol);
  },
};

export const api: any = new Proxy(demoApi as Record<string, unknown>, {
  get(target, prop: string) {
    if (prop in customApiOverrides) {
      return customApiOverrides[prop];
    }
    if (prop in target) return target[prop];
    return benign;
  },
});
