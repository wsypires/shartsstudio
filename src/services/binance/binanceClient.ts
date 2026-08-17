import type {
  Binance24hrTicker,
  BinanceAccountInfo,
  BinanceApiRestrictions,
  BinanceDeliveryAccount,
  BinanceDepth,
  BinanceFuturesAccount,
  BinanceFuturesPosition,
  BinanceIsolatedMarginAccount,
  BinanceMarginAccount,
  BinanceOptionsAccount,
  BinanceOrder,
  BinanceSymbolInfo,
  BinanceTrade,
  BinanceUserAssetItem,
  BinanceWalletBalanceItem,
  PlaceBinanceOrderParams,
} from "./types.ts";

export class BinanceApiError extends Error {
  code?: number;
  status?: number;
  details?: any;

  constructor(message: string, code?: number, status?: number, details?: any) {
    super(message);
    this.name = "BinanceApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface RequestCredentials {
  apiKey?: string;
  apiSecret?: string;
  useTestnet?: boolean;
}

export function safeHeaderValue(val?: any): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  // Strip non-ASCII/control characters to strictly satisfy ISO-8859-1 header constraints
  return str.replace(/[^\x20-\x7E]/g, "").trim();
}

export function clearStoredCredentials(): void {
  try {
    localStorage.removeItem("binance_config");
  } catch {
    // ignore
  }
}

function getStoredCredentials(): RequestCredentials {
  try {
    const saved = localStorage.getItem("binance_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        apiKey: safeHeaderValue(parsed.apiKey),
        apiSecret: safeHeaderValue(parsed.apiSecret),
        useTestnet: Boolean(parsed.useTestnet),
      };
    }
  } catch {
    // ignore
  }
  return {
    apiKey: "",
    apiSecret: "",
    useTestnet: false,
  };
}

async function request<T>(
  endpoint: string,
  options: {
    method?: string;
    params?: Record<string, any>;
    body?: Record<string, any>;
    creds?: RequestCredentials;
  } = {},
): Promise<T> {
  const { method = "GET", params = {}, body, creds } = options;
  const activeCreds = creds || getStoredCredentials();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const safeKey = safeHeaderValue(activeCreds.apiKey);
  const safeSecret = safeHeaderValue(activeCreds.apiSecret);

  if (safeKey) {
    headers["x-binance-api-key"] = safeKey;
  }
  if (safeSecret) {
    headers["x-binance-api-secret"] = safeSecret;
  }
  if (activeCreds.useTestnet !== undefined) {
    headers["x-binance-testnet"] = activeCreds.useTestnet ? "true" : "false";
  }

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      query.append(k, String(v));
    }
  }
  const queryString = query.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      json?.userFriendlyMessage ||
      json?.error ||
      json?.msg ||
      (typeof json === "string" ? json : `Binance API error (HTTP ${res.status})`);
    throw new BinanceApiError(msg, json?.code, res.status, json);
  }

  return json as T;
}

export const binanceClient = {
  // ── Public Market Data ──
  ping: () => request<{}>("/api/binance/ping"),
  time: () => request<{ serverTime: number }>("/api/binance/time"),
  serverIp: () => request<{ ip: string; description: string }>("/api/binance/server-ip"),
  config: () =>
    request<{
      hasEnvKey: boolean;
      hasEnvSecret: boolean;
      envTestnet: boolean;
      activeMode: string;
      isConfigured: boolean;
      serverIp: string;
    }>("/api/binance/config"),

  exchangeInfo: (symbol?: string) =>
    request<{ symbols: BinanceSymbolInfo[]; serverTime: number }>("/api/binance/exchangeInfo", {
      params: symbol ? { symbol } : {},
    }),

  klines: (params: {
    symbol: string;
    interval: string;
    limit?: number;
    startTime?: number;
    endTime?: number;
  }) =>
    request<any[][]>("/api/binance/klines", {
      params,
    }),

  depth: (symbol: string, limit = 20) =>
    request<BinanceDepth>("/api/binance/depth", {
      params: { symbol, limit },
    }),

  ticker24hr: (symbol?: string) =>
    request<Binance24hrTicker | Binance24hrTicker[]>("/api/binance/ticker/24hr", {
      params: symbol ? { symbol } : {},
    }),

  tickerPrice: (symbol?: string) =>
    request<{ symbol: string; price: string } | { symbol: string; price: string }[]>(
      "/api/binance/ticker/price",
      {
        params: symbol ? { symbol } : {},
      },
    ),

  // ── Diagnostics & Key Restrictions ──
  apiRestrictions: (creds?: RequestCredentials) =>
    request<BinanceApiRestrictions>("/api/binance/api-restrictions", { creds }),

  testKeys: (creds: RequestCredentials) =>
    request<{
      ok: boolean;
      message: string;
      accountType: string;
      canTrade: boolean;
      balances: BinanceAccountInfo["balances"];
    }>("/api/binance/test-keys", {
      method: "POST",
      body: creds,
    }),

  testConnectionAll: (creds: RequestCredentials) =>
    request<{
      ok: boolean;
      hint?: "testnet" | "live";
      modules: {
        spot: { ok: boolean; status: number; data?: any; error?: string };
        restrictions: { ok: boolean; status: number; data?: BinanceApiRestrictions };
        wallet: { ok: boolean; status: number; data?: BinanceWalletBalanceItem[] };
        futures: { ok: boolean; status: number; data?: any; error?: string };
        margin: { ok: boolean; status: number; data?: any; error?: string };
      };
    }>("/api/binance/test-connection-all", {
      method: "POST",
      body: creds,
    }),

  // ── Spot Account & Trading ──
  account: (creds?: RequestCredentials) =>
    request<BinanceAccountInfo>("/api/binance/account", {
      creds,
      params: { omitZeroBalances: "true" },
    }),

  newOrder: (order: PlaceBinanceOrderParams, creds?: RequestCredentials) =>
    request<BinanceOrder>("/api/binance/order", {
      method: "POST",
      body: order,
      creds,
    }),

  cancelOrder: (symbol: string, orderId?: number | string, origClientOrderId?: string, creds?: RequestCredentials) =>
    request<BinanceOrder>("/api/binance/order", {
      method: "DELETE",
      params: {
        symbol,
        orderId,
        origClientOrderId,
      },
      creds,
    }),

  cancelAllOpenOrders: (symbol: string, creds?: RequestCredentials) =>
    request<BinanceOrder[]>("/api/binance/openOrders", {
      method: "DELETE",
      params: { symbol },
      creds,
    }),

  openOrders: (symbol?: string, creds?: RequestCredentials) =>
    request<BinanceOrder[]>("/api/binance/openOrders", {
      params: symbol ? { symbol } : {},
      creds,
    }),

  allOrders: (symbol: string, limit = 50, creds?: RequestCredentials) =>
    request<BinanceOrder[]>("/api/binance/allOrders", {
      params: { symbol, limit },
      creds,
    }),

  myTrades: (symbol: string, limit = 50, creds?: RequestCredentials) =>
    request<BinanceTrade[]>("/api/binance/myTrades", {
      params: { symbol, limit },
      creds,
    }),

  // ── Wallet & SAPI ──
  walletBalance: (creds?: RequestCredentials) =>
    request<BinanceWalletBalanceItem[]>("/api/binance/wallet/balance", { creds }),

  userAssets: (asset?: string, creds?: RequestCredentials) =>
    request<BinanceUserAssetItem[]>("/api/binance/wallet/user-assets", {
      method: "POST",
      body: { asset, needBtcValuation: true },
      creds,
    }),

  fundingAssets: (asset?: string, creds?: RequestCredentials) =>
    request<any[]>("/api/binance/wallet/funding", {
      method: "POST",
      body: { asset, needBtcValuation: true },
      creds,
    }),

  // ── USDS-M Futures ──
  futuresAccount: (creds?: RequestCredentials) =>
    request<BinanceFuturesAccount>("/api/binance/futures/account", { creds }),

  futuresPositions: (symbol?: string, creds?: RequestCredentials) =>
    request<BinanceFuturesPosition[]>("/api/binance/futures/positions", {
      params: symbol ? { symbol } : {},
      creds,
    }),

  futuresOpenOrders: (symbol?: string, creds?: RequestCredentials) =>
    request<any[]>("/api/binance/futures/open-orders", {
      params: symbol ? { symbol } : {},
      creds,
    }),

  // ── COIN-M Delivery Futures ──
  deliveryAccount: (creds?: RequestCredentials) =>
    request<BinanceDeliveryAccount>("/api/binance/delivery/account", { creds }),

  deliveryPositions: (symbol?: string, creds?: RequestCredentials) =>
    request<any[]>("/api/binance/delivery/positions", {
      params: symbol ? { symbol } : {},
      creds,
    }),

  // ── Margin (Cross & Isolated) ──
  marginAccount: (creds?: RequestCredentials) =>
    request<BinanceMarginAccount>("/api/binance/margin/account", { creds }),

  marginIsolatedAccount: (symbols?: string, creds?: RequestCredentials) =>
    request<BinanceIsolatedMarginAccount>("/api/binance/margin/isolated", {
      params: symbols ? { symbols } : {},
      creds,
    }),

  marginOpenOrders: (symbol?: string, isIsolated = false, creds?: RequestCredentials) =>
    request<any[]>("/api/binance/margin/open-orders", {
      params: { symbol, isIsolated: isIsolated ? "TRUE" : "FALSE" },
      creds,
    }),

  // ── Options ──
  optionsAccount: (creds?: RequestCredentials) =>
    request<BinanceOptionsAccount>("/api/binance/options/account", { creds }),

  // ── User Data Stream ──
  createUserDataStream: (creds?: RequestCredentials) =>
    request<{ listenKey: string }>("/api/binance/userDataStream", {
      method: "POST",
      creds,
    }),

  keepAliveUserDataStream: (listenKey: string, creds?: RequestCredentials) =>
    request<{}>("/api/binance/userDataStream", {
      method: "PUT",
      body: { listenKey },
      creds,
    }),

  closeUserDataStream: (listenKey: string, creds?: RequestCredentials) =>
    request<{}>("/api/binance/userDataStream", {
      method: "DELETE",
      params: { listenKey },
      creds,
    }),
};
