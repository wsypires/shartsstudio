import "./tracing";
import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  binanceRequest,
  resolveCredentials,
  getServerEgressIp,
  detectServiceType,
} from "./server/binance.ts";
import {
  getEngine,
  getEngineSnapshot,
  processEngineSignal,
} from "./server/engine/index.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Health & System ──
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "opencharts-binance-engine", time: Date.now() });
  });

  // ── Server Egress IP (for Binance IP Whitelisting) ──
  app.get("/api/binance/server-ip", async (_req, res) => {
    const ip = await getServerEgressIp();
    res.json({
      ip,
      description: "Endereço IP de saída do servidor para autorização de IP na Binance",
      timestamp: Date.now(),
    });
  });

  // ── Binance API Status & Config ──
  app.get("/api/binance/config", async (req, res) => {
    const creds = resolveCredentials(req.headers as Record<string, any>);
    const serverIp = await getServerEgressIp();
    res.json({
      hasEnvKey: Boolean(process.env.BINANCE_API_KEY),
      hasEnvSecret: Boolean(process.env.BINANCE_API_SECRET),
      envTestnet: process.env.BINANCE_USE_TESTNET === "true",
      activeMode: creds.useTestnet ? "binance_testnet" : "binance_live",
      isConfigured: Boolean(creds.apiKey && creds.apiSecret),
      serverIp,
    });
  });

  // ── Binance Ping & Time ──
  app.get("/api/binance/ping", async (req, res) => {
    const { useTestnet } = resolveCredentials(req.headers as Record<string, any>);
    const result = await binanceRequest("/api/v3/ping", { useTestnet });
    res.status(result.status).json(result.data);
  });

  app.get("/api/binance/time", async (req, res) => {
    const { useTestnet } = resolveCredentials(req.headers as Record<string, any>);
    const result = await binanceRequest("/api/v3/time", { useTestnet });
    res.status(result.status).json(result.data);
  });

  // ── API Restrictions & Key Permissions (SAPI /sapi/v1/account/apiRestrictions) ──
  app.get("/api/binance/api-restrictions", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/sapi/v1/account/apiRestrictions", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Account Status (SAPI /sapi/v1/account/status) ──
  app.get("/api/binance/account-status", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/sapi/v1/account/status", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Wallet Balance Across ALL Wallets (SAPI /sapi/v1/asset/wallet/balance) ──
  app.get("/api/binance/wallet/balance", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/sapi/v1/asset/wallet/balance", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── User Asset Valuation in USD/BTC (POST /sapi/v1/asset/getUserAsset) ──
  app.post("/api/binance/wallet/user-assets", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.body,
    );

    const params: Record<string, any> = {};
    if (req.body?.asset) params.asset = req.body.asset;
    if (req.body?.needBtcValuation !== undefined) params.needBtcValuation = req.body.needBtcValuation;

    const result = await binanceRequest("/sapi/v1/asset/getUserAsset", {
      method: "POST",
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Funding Wallet Assets (POST /sapi/v1/asset/get-funding-asset) ──
  app.post("/api/binance/wallet/funding", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.body,
    );

    const params: Record<string, any> = {};
    if (req.body?.asset) params.asset = req.body.asset;
    if (req.body?.needBtcValuation !== undefined) params.needBtcValuation = req.body.needBtcValuation;

    const result = await binanceRequest("/sapi/v1/asset/get-funding-asset", {
      method: "POST",
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Capital Coin Config (Deposit/Withdraw Networks) (GET /sapi/v1/capital/config/getall) ──
  app.get("/api/binance/wallet/coins", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/sapi/v1/capital/config/getall", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── USDS-M FUTURES (FAPI /fapi/v2/account & /fapi/v2/balance & /fapi/v2/positionRisk) ──
  app.get("/api/binance/futures/account", async (req, res) => {
    const { apiKey, apiSecret, useTestnet } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/fapi/v2/account", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
    });

    res.status(result.status).json(result.data);
  });

  app.get("/api/binance/futures/balance", async (req, res) => {
    const { apiKey, apiSecret, useTestnet } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/fapi/v2/balance", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
    });

    res.status(result.status).json(result.data);
  });

  app.get("/api/binance/futures/positions", async (req, res) => {
    const { apiKey, apiSecret, useTestnet } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const params: Record<string, any> = {};
    if (req.query.symbol) params.symbol = String(req.query.symbol).toUpperCase();

    const result = await binanceRequest("/fapi/v2/positionRisk", {
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
    });

    res.status(result.status).json(result.data);
  });

  app.get("/api/binance/futures/open-orders", async (req, res) => {
    const { apiKey, apiSecret, useTestnet } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const params: Record<string, any> = {};
    if (req.query.symbol) params.symbol = String(req.query.symbol).toUpperCase();

    const result = await binanceRequest("/fapi/v1/openOrders", {
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
    });

    res.status(result.status).json(result.data);
  });

  // ── COIN-M DELIVERY FUTURES (DAPI /dapi/v1/account & /dapi/v1/positionRisk) ──
  app.get("/api/binance/delivery/account", async (req, res) => {
    const { apiKey, apiSecret, useTestnet } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/dapi/v1/account", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
    });

    res.status(result.status).json(result.data);
  });

  app.get("/api/binance/delivery/positions", async (req, res) => {
    const { apiKey, apiSecret, useTestnet } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const params: Record<string, any> = {};
    if (req.query.symbol) params.symbol = String(req.query.symbol).toUpperCase();

    const result = await binanceRequest("/dapi/v1/positionRisk", {
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
    });

    res.status(result.status).json(result.data);
  });

  // ── MARGIN ACCOUNT (SAPI /sapi/v1/margin/account & /sapi/v1/margin/isolated/account) ──
  app.get("/api/binance/margin/account", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/sapi/v1/margin/account", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  app.get("/api/binance/margin/isolated", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const params: Record<string, any> = {};
    if (req.query.symbols) params.symbols = req.query.symbols;

    const result = await binanceRequest("/sapi/v1/margin/isolated/account", {
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  app.get("/api/binance/margin/open-orders", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const params: Record<string, any> = {};
    if (req.query.symbol) params.symbol = String(req.query.symbol).toUpperCase();
    if (req.query.isIsolated) params.isIsolated = req.query.isIsolated;

    const result = await binanceRequest("/sapi/v1/margin/openOrders", {
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── OPTIONS ACCOUNT (EAPI /eapi/v1/account & /eapi/v1/position) ──
  app.get("/api/binance/options/account", async (req, res) => {
    const { apiKey, apiSecret, useTestnet } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/eapi/v1/account", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
    });

    res.status(result.status).json(result.data);
  });

  app.get("/api/binance/options/positions", async (req, res) => {
    const { apiKey, apiSecret, useTestnet } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const params: Record<string, any> = {};
    if (req.query.symbol) params.symbol = req.query.symbol;

    const result = await binanceRequest("/eapi/v1/position", {
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
    });

    res.status(result.status).json(result.data);
  });

  // ── Multi-Module Diagnostic Test Endpoint ──
  app.post("/api/binance/test-connection-all", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.body,
    );

    if (!apiKey || !apiSecret) {
      return res.status(400).json({
        ok: false,
        error: "API Key e API Secret são obrigatórios para realizar o teste.",
      });
    }

    const isAuthError = (result: { ok: boolean; status: number; data?: any }): boolean => {
      if (!result.ok) {
        const code = result.data?.code;
        return result.status === 401 || code === -2014 || code === -2015 || code === -1002;
      }
      return false;
    };

    if (useTestnet) {
      // Binance Spot Testnet (https://testnet.binance.vision)
      const spotRes = await binanceRequest("/api/v3/account", {
        signed: true,
        apiKey,
        apiSecret,
        useTestnet: true,
        params: { omitZeroBalances: "true" },
      });

      const spotOk = spotRes.ok;

      // If the keys are rejected on Testnet, probe Live to detect a mode mismatch
      let hint: "testnet" | "live" | undefined;
      if (!spotOk && isAuthError(spotRes)) {
        const liveProbe = await binanceRequest("/api/v3/account", {
          signed: true,
          apiKey,
          apiSecret,
          useTestnet: false,
          params: { omitZeroBalances: "true" },
        });
        if (liveProbe.ok) hint = "live";
      }

      return res.json({
        ok: spotOk,
        isTestnet: true,
        hint,
        modules: {
          spot: {
            ok: spotOk,
            status: spotRes.status,
            data: spotOk ? spotRes.data : undefined,
            error: !spotOk ? spotRes.data?.userFriendlyMessage || spotRes.data?.msg : undefined,
          },
          restrictions: {
            ok: spotOk,
            status: spotOk ? 200 : 0,
            data: { enableSpotAndMarginTrading: true, enableReading: true },
          },
          wallet: {
            ok: spotOk,
            status: spotOk ? 200 : 0,
            data: spotOk && Array.isArray(spotRes.data?.balances)
              ? spotRes.data.balances
                  .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
                  .map((b: any) => ({
                    activate: true,
                    balance: (parseFloat(b.free) + parseFloat(b.locked)).toString(),
                    walletName: `Spot (${b.asset})`,
                  }))
              : [],
          },
          futures: {
            ok: false,
            status: 0,
            error: "Spot Testnet (Binance Vision) exclusivo para negociação Spot.",
          },
          margin: {
            ok: false,
            status: 0,
            error: "Módulo Margem não aplicável no Spot Testnet.",
          },
        },
      });
    }

    const [spotRes, restrictionsRes, walletRes, futuresRes, marginRes] = await Promise.all([
      binanceRequest("/api/v3/account", {
        signed: true,
        apiKey,
        apiSecret,
        useTestnet,
        useBinanceUs,
        params: { omitZeroBalances: "true" },
      }),
      binanceRequest("/sapi/v1/account/apiRestrictions", {
        signed: true,
        apiKey,
        apiSecret,
        useTestnet,
        useBinanceUs,
      }),
      binanceRequest("/sapi/v1/asset/wallet/balance", {
        signed: true,
        apiKey,
        apiSecret,
        useTestnet,
        useBinanceUs,
      }),
      binanceRequest("/fapi/v2/account", {
        signed: true,
        apiKey,
        apiSecret,
        useTestnet,
      }),
      binanceRequest("/sapi/v1/margin/account", {
        signed: true,
        apiKey,
        apiSecret,
        useTestnet,
        useBinanceUs,
      }),
    ]);

    const spotOk = spotRes.ok;
    const restrictionsOk = restrictionsRes.ok;
    const futuresOk = futuresRes.ok;
    const marginOk = marginRes.ok;
    const walletOk = walletRes.ok;

    const overallOk = spotOk || restrictionsOk || futuresOk;

    // If the keys are rejected on Live, probe Testnet to detect a mode mismatch
    let hint: "testnet" | "live" | undefined;
    if (!spotOk && isAuthError(spotRes)) {
      const testnetProbe = await binanceRequest("/api/v3/account", {
        signed: true,
        apiKey,
        apiSecret,
        useTestnet: true,
        params: { omitZeroBalances: "true" },
      });
      if (testnetProbe.ok) hint = "testnet";
    }

    res.json({
      ok: overallOk,
      hint,
      modules: {
        spot: {
          ok: spotOk,
          status: spotRes.status,
          data: spotOk ? spotRes.data : undefined,
          error: !spotOk ? spotRes.data?.userFriendlyMessage || spotRes.data?.msg : undefined,
        },
        restrictions: {
          ok: restrictionsOk,
          status: restrictionsRes.status,
          data: restrictionsOk ? restrictionsRes.data : undefined,
        },
        wallet: {
          ok: walletOk,
          status: walletRes.status,
          data: walletOk ? walletRes.data : undefined,
        },
        futures: {
          ok: futuresOk,
          status: futuresRes.status,
          data: futuresOk ? futuresRes.data : undefined,
          error: !futuresOk ? futuresRes.data?.userFriendlyMessage || futuresRes.data?.msg : undefined,
        },
        margin: {
          ok: marginOk,
          status: marginRes.status,
          data: marginOk ? marginRes.data : undefined,
          error: !marginOk ? marginRes.data?.userFriendlyMessage || marginRes.data?.msg : undefined,
        },
      },
    });
  });

  // ── Universal Binance Proxy (Pass any endpoint and query) ──
  app.all("/api/binance/proxy", async (req, res) => {
    const endpoint = String(req.query.endpoint || req.body?.endpoint || "/api/v3/ping");
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.method === "POST" ? req.body : req.query,
    );

    const signed = req.query.signed === "true" || req.body?.signed === true;
    const method = req.method;
    const params = { ...(req.method === "GET" ? req.query : req.body) };
    delete params.endpoint;
    delete params.signed;

    const result = await binanceRequest(endpoint, {
      method,
      params,
      signed,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Binance Exchange Info & Symbols ──
  app.get("/api/binance/exchangeInfo", async (req, res) => {
    const { useTestnet } = resolveCredentials(req.headers as Record<string, any>);
    const params: Record<string, any> = {};
    if (req.query.symbol) params.symbol = req.query.symbol;
    if (req.query.symbols) params.symbols = req.query.symbols;

    const result = await binanceRequest("/api/v3/exchangeInfo", {
      params,
      useTestnet,
    });
    res.status(result.status).json(result.data);
  });

  function cleanBinanceSymbol(sym?: any): string {
    if (!sym) return "BTCUSDT";
    const str = String(sym).toUpperCase().trim();
    if (str.endsWith("USD") && !str.endsWith("USDT")) {
      return `${str}T`;
    }
    return str;
  }

  function cleanBinanceInterval(tf?: any): string {
    if (!tf) return "15m";
    const clean = String(tf).trim();
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

  // ── Binance Candlesticks (Klines) ──
  app.get("/api/binance/klines", async (req, res) => {
    const { useTestnet } = resolveCredentials(req.headers as Record<string, any>);
    const { symbol, interval, limit, startTime, endTime } = req.query;

    const result = await binanceRequest("/api/v3/klines", {
      params: {
        symbol: cleanBinanceSymbol(symbol),
        interval: cleanBinanceInterval(interval),
        limit: limit || "500",
        startTime,
        endTime,
      },
      useTestnet,
    });
    res.status(result.status).json(result.data);
  });

  // ── Binance Depth / Order Book ──
  app.get("/api/binance/depth", async (req, res) => {
    const { useTestnet } = resolveCredentials(req.headers as Record<string, any>);
    const { symbol, limit } = req.query;

    const result = await binanceRequest("/api/v3/depth", {
      params: {
        symbol: cleanBinanceSymbol(symbol),
        limit: limit || "20",
      },
      useTestnet,
    });
    res.status(result.status).json(result.data);
  });

  // ── Binance 24hr Ticker ──
  app.get("/api/binance/ticker/24hr", async (req, res) => {
    const { useTestnet } = resolveCredentials(req.headers as Record<string, any>);
    const { symbol } = req.query;

    const result = await binanceRequest("/api/v3/ticker/24hr", {
      params: symbol ? { symbol: cleanBinanceSymbol(symbol) } : {},
      useTestnet,
    });
    res.status(result.status).json(result.data);
  });

  // ── Binance Ticker Price ──
  app.get("/api/binance/ticker/price", async (req, res) => {
    const { useTestnet } = resolveCredentials(req.headers as Record<string, any>);
    const { symbol } = req.query;

    const result = await binanceRequest("/api/v3/ticker/price", {
      params: symbol ? { symbol: cleanBinanceSymbol(symbol) } : {},
      useTestnet,
    });
    res.status(result.status).json(result.data);
  });

  // ── Spot Account Info ──
  app.get("/api/binance/account", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const result = await binanceRequest("/api/v3/account", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
      params: req.query.omitZeroBalances ? { omitZeroBalances: "true" } : {},
    });

    res.status(result.status).json(result.data);
  });

  // ── Test Binance API Credentials (Single module) ──
  app.post("/api/binance/test-keys", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.body,
    );

    if (!apiKey || !apiSecret) {
      return res.status(400).json({
        ok: false,
        error: "Both API Key and API Secret are required to connect to Binance.",
      });
    }

    const result = await binanceRequest("/api/v3/account", {
      signed: true,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
      params: { omitZeroBalances: "true" },
    });

    if (result.ok) {
      res.json({
        ok: true,
        message: `Conectado com sucesso à Binance (${useTestnet ? "Spot Testnet" : "Spot Oficial"})!`,
        accountType: result.data.accountType,
        canTrade: result.data.canTrade,
        canWithdraw: result.data.canWithdraw,
        canDeposit: result.data.canDeposit,
        balancesCount: result.data.balances?.length || 0,
        balances: result.data.balances || [],
      });
    } else {
      res.status(result.status).json({
        ok: false,
        error: result.data?.userFriendlyMessage || result.data?.msg || "Falha ao autenticar com a Binance",
        code: result.data?.code,
        details: result.data,
      });
    }
  });

  // ── Place Order (Official Binance POST /api/v3/order) ──
  app.post("/api/binance/order", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.body,
    );

    const {
      symbol,
      side,
      type,
      timeInForce,
      quantity,
      quoteOrderQty,
      price,
      stopPrice,
      newClientOrderId,
    } = req.body;

    if (!symbol || !side || !type) {
      return res.status(400).json({
        error: "Missing required order parameters: symbol, side, type are mandatory",
      });
    }

    const params: Record<string, any> = {
      symbol: String(symbol).toUpperCase(),
      side: String(side).toUpperCase(),
      type: String(type).toUpperCase(),
    };

    if (quantity !== undefined && quantity !== null && quantity !== "") params.quantity = quantity;
    if (quoteOrderQty !== undefined && quoteOrderQty !== null && quoteOrderQty !== "")
      params.quoteOrderQty = quoteOrderQty;
    if (price !== undefined && price !== null && price !== "") params.price = price;
    if (stopPrice !== undefined && stopPrice !== null && stopPrice !== "") params.stopPrice = stopPrice;
    if (timeInForce) params.timeInForce = timeInForce;
    if (newClientOrderId) params.newClientOrderId = newClientOrderId;

    if (params.type === "LIMIT" && !params.timeInForce) {
      params.timeInForce = "GTC";
    }

    const result = await binanceRequest("/api/v3/order", {
      method: "POST",
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Cancel Order (Official Binance DELETE /api/v3/order) ──
  app.delete("/api/binance/order", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const { symbol, orderId, origClientOrderId } = req.query;

    if (!symbol || (!orderId && !origClientOrderId)) {
      return res.status(400).json({
        error: "Missing required parameter: symbol and either orderId or origClientOrderId are required",
      });
    }

    const params: Record<string, any> = {
      symbol: String(symbol).toUpperCase(),
    };
    if (orderId) params.orderId = orderId;
    if (origClientOrderId) params.origClientOrderId = origClientOrderId;

    const result = await binanceRequest("/api/v3/order", {
      method: "DELETE",
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Cancel All Open Orders on Symbol ──
  app.delete("/api/binance/openOrders", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: "Missing symbol parameter" });
    }

    const result = await binanceRequest("/api/v3/openOrders", {
      method: "DELETE",
      signed: true,
      params: { symbol: String(symbol).toUpperCase() },
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Query Open Orders ──
  app.get("/api/binance/openOrders", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const params: Record<string, any> = {};
    if (req.query.symbol) params.symbol = String(req.query.symbol).toUpperCase();

    const result = await binanceRequest("/api/v3/openOrders", {
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Query All Orders History ──
  app.get("/api/binance/allOrders", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const { symbol, limit, orderId, startTime, endTime } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: "Missing symbol parameter" });
    }

    const params: Record<string, any> = {
      symbol: String(symbol).toUpperCase(),
      limit: limit || "50",
    };
    if (orderId) params.orderId = orderId;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    const result = await binanceRequest("/api/v3/allOrders", {
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Query Trade History (My Trades) ──
  app.get("/api/binance/myTrades", async (req, res) => {
    const { apiKey, apiSecret, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );

    const { symbol, limit, fromId, startTime, endTime } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: "Missing symbol parameter" });
    }

    const params: Record<string, any> = {
      symbol: String(symbol).toUpperCase(),
      limit: limit || "50",
    };
    if (fromId) params.fromId = fromId;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    const result = await binanceRequest("/api/v3/myTrades", {
      signed: true,
      params,
      apiKey,
      apiSecret,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── User Data Stream (ListenKey) ──
  app.post("/api/binance/userDataStream", async (req, res) => {
    const { apiKey, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.body,
    );

    const result = await binanceRequest("/api/v3/userDataStream", {
      method: "POST",
      apiKey,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  app.put("/api/binance/userDataStream", async (req, res) => {
    const { apiKey, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.body,
    );
    const { listenKey } = req.body;

    const result = await binanceRequest("/api/v3/userDataStream", {
      method: "PUT",
      params: { listenKey },
      apiKey,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  app.delete("/api/binance/userDataStream", async (req, res) => {
    const { apiKey, useTestnet, useBinanceUs } = resolveCredentials(
      req.headers as Record<string, any>,
      req.query,
    );
    const { listenKey } = req.query;

    const result = await binanceRequest("/api/v3/userDataStream", {
      method: "DELETE",
      params: { listenKey },
      apiKey,
      useTestnet,
      useBinanceUs,
    });

    res.status(result.status).json(result.data);
  });

  // ── Trade Engine (Signal Engine → Trade Engine → Report Engine → Telegram) ──

  // Webhook de estratégia: recebe sinais LONG/SHORT/EXIT do Signal Engine (UI ou externo)
  app.post("/api/webhook/strategy", async (req, res) => {
    const signal = req.body;
    if (!signal || !signal.symbol || !signal.side) {
      return res.status(400).json({
        ok: false,
        error: "Sinal inválido. Necessário: { symbol, side: 'LONG'|'SHORT'|'EXIT', ... }",
      });
    }

    const result = await processEngineSignal({
      symbol: String(signal.symbol).toUpperCase(),
      side: signal.side,
      price: signal.price != null ? Number(signal.price) : undefined,
      timeframe: signal.timeframe,
      strategy: signal.strategy,
      quantity: signal.quantity != null ? Number(signal.quantity) : undefined,
      riskPct: signal.riskPct != null ? Number(signal.riskPct) : undefined,
      leverage: signal.leverage != null ? Number(signal.leverage) : undefined,
      stopLoss: signal.stopLoss != null ? Number(signal.stopLoss) : undefined,
      takeProfit: signal.takeProfit != null ? Number(signal.takeProfit) : undefined,
      mode: signal.mode,
      source: signal.source || "webhook",
    });

    if (result.ok) {
      res.json({ ok: true, trade: result.trade });
    } else {
      res.status(409).json({ ok: false, error: result.error });
    }
  });

  // Alias para testes manuais pela UI
  app.post("/api/engine/signal", async (req, res) => {
    const { symbol, side, price, quantity, riskPct, stopLoss, takeProfit, strategy, mode, leverage } = req.body || {};
    if (!symbol || !side) {
      return res.status(400).json({ ok: false, error: "symbol e side são obrigatórios" });
    }
    const result = await processEngineSignal({
      symbol: String(symbol).toUpperCase(),
      side,
      price: price != null ? Number(price) : undefined,
      quantity: quantity != null ? Number(quantity) : undefined,
      riskPct: riskPct != null ? Number(riskPct) : undefined,
      stopLoss: stopLoss != null ? Number(stopLoss) : undefined,
      takeProfit: takeProfit != null ? Number(takeProfit) : undefined,
      strategy,
      mode,
      leverage: leverage != null ? Number(leverage) : undefined,
      source: "ui-manual",
    });
    if (result.ok) {
      res.json({ ok: true, trade: result.trade });
    } else {
      res.status(409).json({ ok: false, error: result.error });
    }
  });

  // Estado do Trade Engine + Report Engine (trades, PnL, saldo, cooldowns, erros)
  app.get("/api/engine/status", async (_req, res) => {
    const snapshot = getEngineSnapshot();
    res.json(snapshot);
  });

  // Fechar posição aberta por id ou todas de um símbolo
  app.post("/api/engine/close", async (req, res) => {
    const { id, symbol } = req.body || {};
    const engine = getEngine().tradeEngine;
    let closed = 0;
    if (id) {
      const ok = await engine.closeById(String(id));
      res.json({ ok, closed: ok ? 1 : 0 });
      return;
    }
    if (symbol) {
      closed = await engine.closeAllForSymbol(String(symbol).toUpperCase(), "MANUAL");
    }
    res.json({ ok: closed > 0, closed });
  });

  // ── Telegram Notifier ──
  app.get("/api/engine/telegram/config", (_req, res) => {
    const tg = getEngine().telegram;
    res.json({
      configured: tg.isConfigured(),
      config: tg.getConfig(),
    });
  });

  app.post("/api/engine/telegram/config", (req, res) => {
    const { token, chatId, enabled } = req.body || {};
    if (!token || !chatId) {
      return res.status(400).json({ ok: false, error: "token e chatId são obrigatórios" });
    }
    const tg = getEngine().telegram;
    tg.setConfig({ token: String(token), chatId: String(chatId) });
    if (typeof enabled === "boolean") tg.setEnabled(enabled);
    res.json({ ok: true, configured: tg.isConfigured() });
  });

  app.post("/api/engine/telegram/test", async (_req, res) => {
    const tg = getEngine().telegram;
    const result = await tg.send("✅ <b>OpenCharts Trade Engine</b>\nConexão com o Telegram funcionando.");
    if (result.ok) {
      res.json({ ok: true });
    } else {
      res.status(400).json({ ok: false, error: result.error });
    }
  });

  // ── Vite Middleware for development vs Static dist for production ──
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OpenCharts & Binance Multi-Product Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
