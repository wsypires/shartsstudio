import { create } from "zustand";
import { binanceClient, BinanceApiError } from "./binanceClient.ts";
import type {
  Binance24hrTicker,
  BinanceAccountInfo,
  BinanceApiRestrictions,
  BinanceAssetBalance,
  BinanceDeliveryAccount,
  BinanceFuturesAccount,
  BinanceFuturesPosition,
  BinanceIsolatedMarginAccount,
  BinanceMarginAccount,
  BinanceOptionsAccount,
  BinanceOrder,
  BinanceSymbolInfo,
  BinanceTrade,
  BinanceTradingMode,
  BinanceUserAssetItem,
  BinanceWalletBalanceItem,
  PlaceBinanceOrderParams,
} from "./types.ts";
import { toast } from "../toast.ts";

export interface BinanceStoreState {
  mode: BinanceTradingMode;
  apiKey: string;
  apiSecret: string;
  useTestnet: boolean;
  isConfigured: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  serverIp: string;

  // Multi-Product Data
  accountInfo: BinanceAccountInfo | null;
  apiRestrictions: BinanceApiRestrictions | null;
  walletBalances: BinanceWalletBalanceItem[];
  userAssets: BinanceUserAssetItem[];
  balances: BinanceAssetBalance[];
  openOrders: BinanceOrder[];
  orderHistory: BinanceOrder[];
  trades: BinanceTrade[];
  symbols: BinanceSymbolInfo[];
  selectedSymbol: string;
  ticker: Binance24hrTicker | null;
  latencyMs: number;
  lastSyncTime: number | null;

  // Futures
  futuresAccount: BinanceFuturesAccount | null;
  futuresPositions: BinanceFuturesPosition[];
  deliveryAccount: BinanceDeliveryAccount | null;

  // Margin
  marginAccount: BinanceMarginAccount | null;
  isolatedMarginAccount: BinanceIsolatedMarginAccount | null;

  // Options
  optionsAccount: BinanceOptionsAccount | null;

  // Diagnostic State
  diagnosticReport: {
    testedAt?: number;
    spotOk?: boolean;
    restrictionsOk?: boolean;
    walletOk?: boolean;
    futuresOk?: boolean;
    marginOk?: boolean;
    errorMsg?: string;
  } | null;

  // Actions
  setMode: (mode: BinanceTradingMode) => void;
  setCredentials: (
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
  ) => Promise<{ ok: boolean; message: string }>;
  clearCredentials: () => void;
  loadStoredConfig: () => Promise<void>;
  testConnection: (overrideCreds?: {
    apiKey?: string;
    apiSecret?: string;
    useTestnet?: boolean;
  }) => Promise<{ ok: boolean; message: string }>;
  runFullDiagnostic: () => Promise<any>;
  fetchAllData: () => Promise<void>;
  fetchAccount: () => Promise<void>;
  fetchApiRestrictions: () => Promise<void>;
  fetchWalletBalances: () => Promise<void>;
  fetchFutures: () => Promise<void>;
  fetchDelivery: () => Promise<void>;
  fetchMargin: () => Promise<void>;
  fetchOptions: () => Promise<void>;
  fetchOpenOrders: (symbol?: string) => Promise<void>;
  fetchOrderHistory: (symbol?: string) => Promise<void>;
  fetchTrades: (symbol?: string) => Promise<void>;
  fetchSymbols: () => Promise<void>;
  setSelectedSymbol: (symbol: string) => void;
  placeOrder: (params: PlaceBinanceOrderParams) => Promise<BinanceOrder | null>;
  cancelOrder: (symbol: string, orderId: number | string) => Promise<boolean>;
  cancelAllOrders: (symbol: string) => Promise<boolean>;
}

function safeAscii(val?: any): string {
  if (!val) return "";
  return String(val).replace(/[^\x20-\x7E]/g, "").trim();
}

function getInitialConfig() {
  try {
    const saved = localStorage.getItem("binance_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      const apiKey = safeAscii(parsed.apiKey);
      const apiSecret = safeAscii(parsed.apiSecret);
      const hasKeys = Boolean(apiKey && apiSecret);
      return {
        apiKey,
        apiSecret,
        useTestnet: parsed.useTestnet ?? false,
        mode: (parsed.mode || (hasKeys ? "binance_live" : "demo")) as BinanceTradingMode,
      };
    }
  } catch {
    // ignore
  }
  return {
    apiKey: "",
    apiSecret: "",
    useTestnet: false,
    mode: "demo" as BinanceTradingMode,
  };
}

const initial = getInitialConfig();

export const useBinanceStore = create<BinanceStoreState>((set, get) => ({
  mode: initial.mode,
  apiKey: initial.apiKey,
  apiSecret: initial.apiSecret,
  useTestnet: initial.useTestnet,
  isConfigured: Boolean(initial.apiKey && initial.apiSecret),
  isConnected: false,
  isSyncing: false,
  serverIp: "",

  accountInfo: null,
  apiRestrictions: null,
  walletBalances: [],
  userAssets: [],
  balances: [],
  openOrders: [],
  orderHistory: [],
  trades: [],
  symbols: [],
  selectedSymbol: "BTCUSDT",
  ticker: null,
  latencyMs: 0,
  lastSyncTime: null,

  futuresAccount: null,
  futuresPositions: [],
  deliveryAccount: null,

  marginAccount: null,
  isolatedMarginAccount: null,
  optionsAccount: null,

  diagnosticReport: null,

  setMode: (mode: BinanceTradingMode) => {
    const useTestnet = mode === "binance_testnet";
    set({ mode, useTestnet });
    try {
      const current = getInitialConfig();
      localStorage.setItem(
        "binance_config",
        JSON.stringify({ ...current, mode, useTestnet }),
      );
    } catch {}

    if (mode !== "demo" && get().isConfigured) {
      get().fetchAllData();
      get().fetchSymbols();
    }
  },

  setCredentials: async (rawApiKey: string, rawApiSecret: string, useTestnet: boolean) => {
    const apiKey = safeAscii(rawApiKey);
    const apiSecret = safeAscii(rawApiSecret);
    const mode: BinanceTradingMode = useTestnet ? "binance_testnet" : "binance_live";
    const config = { apiKey, apiSecret, useTestnet, mode };
    localStorage.setItem("binance_config", JSON.stringify(config));

    set({
      apiKey,
      apiSecret,
      useTestnet,
      mode,
      isConfigured: Boolean(apiKey && apiSecret),
    });

    const test = await get().testConnection({ apiKey, apiSecret, useTestnet });
    if (test.ok) {
      await get().fetchAllData();
      get().fetchSymbols();
      return { ok: true, message: test.message };
    }
    return { ok: false, message: test.message };
  },

  clearCredentials: () => {
    try {
      localStorage.removeItem("binance_config");
    } catch {}

    set({
      apiKey: "",
      apiSecret: "",
      useTestnet: false,
      mode: "demo",
      isConfigured: false,
      isConnected: false,
      latencyMs: 0,
      accountInfo: null,
      apiRestrictions: null,
      walletBalances: [],
      userAssets: [],
      balances: [],
      openOrders: [],
      orderHistory: [],
      trades: [],
      diagnosticReport: null,
    });

    toast.info("Chaves Removidas", "As credenciais foram completamente limpas da memória e do navegador. Modo Demo ativado.");
  },

  loadStoredConfig: async () => {
    let serverHasEnvKeys = false;
    try {
      const serverConfig = await binanceClient.config().catch(() => null);
      if (serverConfig) {
        serverHasEnvKeys = Boolean(serverConfig.isConfigured);
        if (serverConfig.serverIp) {
          set({ serverIp: serverConfig.serverIp });
        }
        if (serverConfig.isConfigured && !get().apiKey) {
          set({
            isConfigured: true,
            useTestnet: serverConfig.envTestnet,
            mode: serverConfig.envTestnet ? "binance_testnet" : "binance_live",
          });
        }
      }
    } catch {}

    if (get().mode !== "demo" && get().isConfigured) {
      if (!get().apiKey && serverHasEnvKeys) {
        // No keys stored in the browser: authenticate with the server-side
        // env credentials so the app starts already validated.
        await get().testConnection({
          apiKey: "",
          apiSecret: "",
          useTestnet: get().useTestnet,
        });
      } else {
        get().testConnection();
      }
      get().fetchAllData();
      get().fetchSymbols();
    }
  },

  testConnection: async (overrideCreds?: { apiKey?: string; apiSecret?: string; useTestnet?: boolean }) => {
    const apiKey = (overrideCreds?.apiKey ?? get().apiKey ?? "").trim();
    const apiSecret = (overrideCreds?.apiSecret ?? get().apiSecret ?? "").trim();
    const useTestnet = overrideCreds?.useTestnet ?? get().useTestnet;
    const t0 = Date.now();

    try {
      if (apiKey && apiSecret) {
        const res = await binanceClient.testKeys({ apiKey, apiSecret, useTestnet });
        const latency = Date.now() - t0;
        set({ isConnected: true, latencyMs: latency });
        return { ok: true, message: res.message || "Conectado com sucesso à Binance!" };
      } else {
        // No explicit keys: fall back to the server-side env credentials if configured
        const res = await binanceClient.testKeys({ apiKey: "", apiSecret: "", useTestnet });
        const latency = Date.now() - t0;
        set({ isConnected: true, latencyMs: latency });
        return {
          ok: true,
          message: res.message || "Conectado com sucesso à Binance (credenciais do servidor)!",
        };
      }
    } catch (err: any) {
      // If the server has no env credentials, fall back to a public ping
      if (!get().apiKey) {
        try {
          await binanceClient.ping();
          const latency = Date.now() - t0;
          set({ isConnected: true, latencyMs: latency });
          return { ok: true, message: "Conexão com a API pública da Binance ativa" };
        } catch {}
      }
      set({ isConnected: false, latencyMs: 0 });
      return {
        ok: false,
        message: err.message || "Falha na autenticação das chaves Binance.",
      };
    }
  },

  runFullDiagnostic: async () => {
    const { apiKey, apiSecret, useTestnet } = get();
    if (!apiKey || !apiSecret) {
      toast.error("Credenciais Ausentes", "Informe API Key e Secret para rodar o diagnóstico completo.");
      return null;
    }

    try {
      const res = await binanceClient.testConnectionAll({ apiKey, apiSecret, useTestnet });
      const report = {
        testedAt: Date.now(),
        spotOk: res.modules.spot.ok,
        restrictionsOk: res.modules.restrictions.ok,
        walletOk: res.modules.wallet.ok,
        futuresOk: res.modules.futures.ok,
        marginOk: res.modules.margin.ok,
        errorMsg: res.modules.spot.error || res.modules.futures.error || undefined,
      };

      set({
        diagnosticReport: report,
        isConnected: res.ok,
        apiRestrictions: res.modules.restrictions.data || get().apiRestrictions,
      });

      if (res.ok) {
        toast.success(
          "Diagnóstico Binance Concluído",
          `Spot: ${report.spotOk ? "✅ Ativo" : "❌"} | Futuros: ${report.futuresOk ? "✅ Ativo" : "⚠️ Inativo"} | Margem: ${report.marginOk ? "✅ Ativo" : "⚠️ Inativo"}`,
        );
      } else {
        toast.error("Atenção na Autenticação", report.errorMsg || "Alguns módulos retornaram restrição.");
      }

      return res;
    } catch (err: any) {
      toast.error("Erro no Diagnóstico", err.message || "Falha ao executar diagnóstico.");
      return null;
    }
  },

  fetchAllData: async () => {
    const { apiKey, apiSecret, mode } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    set({ isSyncing: true });
    await Promise.allSettled([
      get().fetchAccount(),
      get().fetchApiRestrictions(),
      get().fetchWalletBalances(),
      get().fetchFutures(),
      get().fetchDelivery(),
      get().fetchMargin(),
      get().fetchOptions(),
      get().fetchOpenOrders(),
      get().fetchOrderHistory(),
      get().fetchTrades(),
    ]);
    set({ isSyncing: false, lastSyncTime: Date.now() });
  },

  fetchAccount: async () => {
    const { apiKey, apiSecret, useTestnet, mode } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    try {
      const data = await binanceClient.account({ apiKey, apiSecret, useTestnet });
      const activeBalances = (data.balances || []).filter((b) => {
        const free = parseFloat(b.free);
        const locked = parseFloat(b.locked);
        return free > 0 || locked > 0;
      });

      set({
        accountInfo: data,
        balances: activeBalances,
        isConnected: true,
      });
    } catch (err: any) {
      console.warn("Binance spot account sync note:", err?.message || String(err));
    }
  },

  fetchApiRestrictions: async () => {
    const { apiKey, apiSecret, useTestnet, mode } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    try {
      const data = await binanceClient.apiRestrictions({ apiKey, apiSecret, useTestnet });
      if (data) {
        set({ apiRestrictions: data });
      }
    } catch (err: any) {
      console.warn("Binance API restrictions note:", err?.message || String(err));
    }
  },

  fetchWalletBalances: async () => {
    const { apiKey, apiSecret, useTestnet, mode } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    try {
      const [walletRes, userAssetsRes] = await Promise.allSettled([
        binanceClient.walletBalance({ apiKey, apiSecret, useTestnet }),
        binanceClient.userAssets(undefined, { apiKey, apiSecret, useTestnet }),
      ]);

      if (walletRes.status === "fulfilled" && Array.isArray(walletRes.value)) {
        set({ walletBalances: walletRes.value });
      }
      if (userAssetsRes.status === "fulfilled" && Array.isArray(userAssetsRes.value)) {
        set({ userAssets: userAssetsRes.value });
      }
    } catch (err: any) {
      console.warn("Binance wallet sync note:", err?.message || String(err));
    }
  },

  fetchFutures: async () => {
    const { apiKey, apiSecret, useTestnet, mode } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    try {
      const [accountRes, posRes] = await Promise.allSettled([
        binanceClient.futuresAccount({ apiKey, apiSecret, useTestnet }),
        binanceClient.futuresPositions(undefined, { apiKey, apiSecret, useTestnet }),
      ]);

      if (accountRes.status === "fulfilled" && accountRes.value) {
        set({ futuresAccount: accountRes.value });
      }
      if (posRes.status === "fulfilled" && Array.isArray(posRes.value)) {
        // Filter active positions with amount > 0
        const activePositions = posRes.value.filter((p) => parseFloat(p.positionAmt) !== 0);
        set({ futuresPositions: activePositions });
      }
    } catch (err: any) {
      console.warn("Binance Futures sync note:", err?.message || String(err));
    }
  },

  fetchDelivery: async () => {
    const { apiKey, apiSecret, useTestnet, mode } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    try {
      const data = await binanceClient.deliveryAccount({ apiKey, apiSecret, useTestnet });
      if (data) {
        set({ deliveryAccount: data });
      }
    } catch (err: any) {
      console.warn("Binance COIN-M sync note:", err?.message || String(err));
    }
  },

  fetchMargin: async () => {
    const { apiKey, apiSecret, useTestnet, mode } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    try {
      const [marginRes, isoRes] = await Promise.allSettled([
        binanceClient.marginAccount({ apiKey, apiSecret, useTestnet }),
        binanceClient.marginIsolatedAccount(undefined, { apiKey, apiSecret, useTestnet }),
      ]);

      if (marginRes.status === "fulfilled" && marginRes.value) {
        set({ marginAccount: marginRes.value });
      }
      if (isoRes.status === "fulfilled" && isoRes.value) {
        set({ isolatedMarginAccount: isoRes.value });
      }
    } catch (err: any) {
      console.warn("Binance Margin sync note:", err?.message || String(err));
    }
  },

  fetchOptions: async () => {
    const { apiKey, apiSecret, useTestnet, mode } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    try {
      const data = await binanceClient.optionsAccount({ apiKey, apiSecret, useTestnet });
      if (data) {
        set({ optionsAccount: data });
      }
    } catch (err: any) {
      console.warn("Binance Options sync note:", err?.message || String(err));
    }
  },

  fetchOpenOrders: async (symbol?: string) => {
    const { apiKey, apiSecret, useTestnet, mode } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    try {
      const data = await binanceClient.openOrders(symbol, { apiKey, apiSecret, useTestnet });
      set({ openOrders: data || [] });
    } catch (err: any) {
      console.warn("Binance open orders sync note:", err?.message || String(err));
    }
  },

  fetchOrderHistory: async (symbol?: string) => {
    const { apiKey, apiSecret, useTestnet, mode, selectedSymbol } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    const sym = symbol || selectedSymbol;
    try {
      const data = await binanceClient.allOrders(sym, 50, { apiKey, apiSecret, useTestnet });
      set({ orderHistory: data || [] });
    } catch (err: any) {
      console.warn("Binance order history sync note:", err?.message || String(err));
    }
  },

  fetchTrades: async (symbol?: string) => {
    const { apiKey, apiSecret, useTestnet, mode, selectedSymbol } = get();
    if (mode === "demo" || !apiKey || !apiSecret) return;

    const sym = symbol || selectedSymbol;
    try {
      const data = await binanceClient.myTrades(sym, 50, { apiKey, apiSecret, useTestnet });
      set({ trades: data || [] });
    } catch (err: any) {
      console.warn("Binance trades sync note:", err?.message || String(err));
    }
  },

  fetchSymbols: async () => {
    try {
      const data = await binanceClient.exchangeInfo();
      if (data && data.symbols) {
        const spotSymbols = data.symbols.filter(
          (s) => s.status === "TRADING" && s.isSpotTradingAllowed,
        );
        set({ symbols: spotSymbols });
      }
    } catch (err: any) {
      console.warn("Binance symbols sync note:", err?.message || String(err));
    }
  },

  setSelectedSymbol: (symbol: string) => {
    set({ selectedSymbol: symbol.toUpperCase() });
    if (get().mode !== "demo") {
      get().fetchOpenOrders(symbol);
      get().fetchOrderHistory(symbol);
      get().fetchTrades(symbol);
    }
  },

  placeOrder: async (params: PlaceBinanceOrderParams) => {
    const { apiKey, apiSecret, useTestnet, mode } = get();
    if (mode === "demo") {
      toast.warning("Modo Demo", "Alterne para Binance Testnet ou Live para executar ordens reais.");
      return null;
    }
    if (!apiKey || !apiSecret) {
      toast.error("Autenticação Necessária", "Configure sua API Key e API Secret da Binance.");
      return null;
    }

    try {
      const order = await binanceClient.newOrder(params, { apiKey, apiSecret, useTestnet });
      toast.success(
        `Ordem ${order.status}`,
        `${params.side} ${order.origQty} ${params.symbol} @ ${order.price || "MERCADO"} (ID: ${order.orderId})`,
      );

      setTimeout(() => {
        get().fetchAllData();
      }, 600);

      return order;
    } catch (err: any) {
      const msg = err instanceof BinanceApiError ? err.message : String(err.message || err);
      toast.error("Ordem Recusada pela Binance", msg);
      return null;
    }
  },

  cancelOrder: async (symbol: string, orderId: number | string) => {
    const { apiKey, apiSecret, useTestnet } = get();
    try {
      await binanceClient.cancelOrder(symbol, orderId, undefined, { apiKey, apiSecret, useTestnet });
      toast.success("Ordem Cancelada", `Ordem #${orderId} cancelada na Binance.`);
      get().fetchOpenOrders();
      return true;
    } catch (err: any) {
      toast.error("Falha ao Cancelar", err.message || "Falha ao cancelar ordem na Binance.");
      return false;
    }
  },

  cancelAllOrders: async (symbol: string) => {
    const { apiKey, apiSecret, useTestnet } = get();
    try {
      await binanceClient.cancelAllOpenOrders(symbol, { apiKey, apiSecret, useTestnet });
      toast.success("Todas as Ordens Canceladas", `Todas as ordens de ${symbol} foram canceladas.`);
      get().fetchOpenOrders();
      return true;
    } catch (err: any) {
      toast.error("Falha ao Cancelar Ordens", err.message || "Falha ao cancelar ordens abertas.");
      return false;
    }
  },
}));
