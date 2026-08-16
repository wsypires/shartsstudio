import type { Symbol } from "../schemas.ts";

/**
 * Supported instruments for both Demo and Binance Official Trading.
 */
function crypto(
  name: string,
  displayName: string,
  tickSize: number,
  baseCurrency = "BTC",
  quoteCurrency = "USDT",
): Symbol {
  return {
    id: name,
    name,
    displayName,
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
}

export const DEMO_SYMBOLS: Symbol[] = [
  // Primary Binance Spot Pairs (USDT quoted)
  crypto("BTCUSDT", "Bitcoin / USDT", 0.01, "BTC", "USDT"),
  crypto("ETHUSDT", "Ethereum / USDT", 0.01, "ETH", "USDT"),
  crypto("SOLUSDT", "Solana / USDT", 0.01, "SOL", "USDT"),
  crypto("BNBUSDT", "BNB / USDT", 0.01, "BNB", "USDT"),
  crypto("XRPUSDT", "XRP / USDT", 0.0001, "XRP", "USDT"),
  crypto("ADAUSDT", "Cardano / USDT", 0.0001, "ADA", "USDT"),
  crypto("DOGEUSDT", "Dogecoin / USDT", 0.00001, "DOGE", "USDT"),
  crypto("AVAXUSDT", "Avalanche / USDT", 0.01, "AVAX", "USDT"),
  crypto("LINKUSDT", "Chainlink / USDT", 0.001, "LINK", "USDT"),
  crypto("NEARUSDT", "NEAR Protocol / USDT", 0.001, "NEAR", "USDT"),

  // USD Legacy Aliases for backwards compatibility
  crypto("BTCUSD", "Bitcoin / USD", 0.01, "BTC", "USD"),
  crypto("ETHUSD", "Ethereum / USD", 0.01, "ETH", "USD"),
  crypto("SOLUSD", "Solana / USD", 0.01, "SOL", "USD"),
  crypto("BNBUSD", "BNB / USD", 0.01, "BNB", "USD"),
  crypto("XRPUSD", "XRP / USD", 0.0001, "XRP", "USD"),
  crypto("ADAUSD", "Cardano / USD", 0.0001, "ADA", "USD"),
];

export const DEMO_SYMBOL_NAMES = DEMO_SYMBOLS.map((s) => s.name);

export function getDemoSymbol(name: string): Symbol | undefined {
  const upper = name.toUpperCase();
  return DEMO_SYMBOLS.find((s) => s.name === upper);
}
